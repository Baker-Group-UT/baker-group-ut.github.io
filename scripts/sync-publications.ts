#!/usr/bin/env tsx
/**
 * sync-publications.ts
 *
 * Pulls publications from OpenAlex for every group member whose markdown
 * frontmatter includes an `openalex_id`, filters by affiliation (and
 * optionally topic), deduplicates across co-authors, and writes one
 * `synced-<workId>.md` file per paper into `src/content/publications/`.
 *
 * Manually authored publication files (anything without `synced: true` in
 * the frontmatter) are NEVER touched. Previously-synced files whose paper
 * is no longer in the filtered set are deleted.
 *
 * Meant to run from the repo root, e.g.:
 *   npm run sync-publications
 *   tsx scripts/sync-publications.ts
 *
 * Monthly automation lives in .github/workflows/sync-publications.yml.
 */

import { readdir, readFile, writeFile, unlink, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

// -------- Paths --------------------------------------------------------

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PEOPLE_DIR = path.join(ROOT, "src/content/people");
const PUBS_DIR = path.join(ROOT, "src/content/publications");
const DATA_DIR = path.join(ROOT, "src/data");

// -------- Config -------------------------------------------------------

const DEFAULT_AFFILIATIONS = ["University of Texas at Austin"];
const MAILTO = process.env.OPENALEX_MAILTO || "jonathan.baker@austin.utexas.edu";
const USER_AGENT = `BakerGroupSite/0.1 (mailto:${MAILTO})`;
// Cap per-author fetch so a misconfigured ID (e.g. a very common name that
// resolves to an ambiguous OpenAlex profile) can't blow up the run time.
const MAX_PAGES_PER_AUTHOR = 10;
const PER_PAGE = 200;

// -------- Types --------------------------------------------------------

interface PersonFrontmatter {
  name: string;
  openalex_id?: string;
  affiliations?: string[];
  topic_allowlist?: string[];
  excluded_works?: string[];
  extra_works?: string[];
  // Date this person left the group (YAML date or "YYYY-MM-DD" string).
  // Papers published after it no longer qualify via *this person's* own
  // authorship — only via a current member's (see the alumni cutoff in
  // main()). Their pre-departure papers are unaffected.
  alumni_since?: string | Date;
}

interface OpenAlexAuthorship {
  author: { id: string; display_name: string };
  institutions: Array<{
    id?: string;
    display_name: string;
    country_code?: string;
    ror?: string;
  }>;
  // The name as it appeared on the actual paper. OpenAlex sometimes merges
  // several name variants under one author ID (e.g. Sayam Sethi shows up
  // as "S. Prakash Sethi" on his author profile on OpenAlex). Preferring
  // raw_author_name keeps author lists looking like the paper.
  raw_author_name?: string;
  raw_affiliation_strings?: string[];
}

interface OpenAlexTopic {
  id: string;
  display_name: string;
  score: number;
  subfield?: { display_name: string };
  field?: { display_name: string };
  domain?: { display_name: string };
}

interface OpenAlexLocation {
  landing_page_url?: string | null;
  pdf_url?: string | null;
  source?: { display_name?: string } | null;
}

interface OpenAlexWork {
  id: string;
  doi: string | null;
  title: string | null;
  display_name?: string | null;
  publication_year: number | null;
  publication_date?: string | null;
  authorships: OpenAlexAuthorship[];
  primary_location?: { source?: { display_name?: string } | null } | null;
  type?: string;
  topics?: OpenAlexTopic[];
  open_access?: { oa_url?: string; is_oa?: boolean };
  best_oa_location?: { pdf_url?: string; landing_page_url?: string } | null;
  // All hosting locations. Published records usually list their arXiv
  // preprint here even when best_oa_location points elsewhere — this is
  // what lets us merge the two records by arXiv id.
  locations?: OpenAlexLocation[] | null;
  updated_date?: string;
}

interface PersonEntry {
  slug: string;
  data: PersonFrontmatter;
}

interface PersonReport {
  name: string;
  authorId: string | null;
  kept: number;
  filteredExcluded: number;
  filteredAffiliation: number;
  filteredPostAlumni: number;
  extraAdded: number;
  // Works this person co-authored that someone *else* in the group kept
  // (so the affiliation filter rejected their own authorship entry, but a
  // group co-author's entry passed). These are pulled back in as credits.
  coauthorRescued: number;
  total: number;
  skipped: boolean;
  error?: string;
}

// -------- Utilities ----------------------------------------------------

function stripOpenAlexPrefix(id: string | null | undefined): string {
  // OpenAlex occasionally returns authorships whose author has no id (e.g.
  // "Anonymous" or un-disambiguated contributors). Guard so one such entry
  // on one paper doesn't kill the whole run.
  if (!id) return "";
  return id.replace(/^https?:\/\/openalex\.org\//, "");
}

function stripLatex(s: string): string {
  // OpenAlex titles occasionally carry $...$ and \textit{...}-style markup.
  return s
    .replace(/\\[a-zA-Z]+\{([^}]*)\}/g, "$1")
    .replace(/\$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Pick the best author-name string for a single authorship.
 *
 *  Priorities:
 *    1. `raw_author_name` when present — this is what the paper itself said,
 *       so it reflects authors of merged OpenAlex profiles (e.g. Sayam's
 *       profile display_name is "S. Prakash Sethi" but a specific paper's
 *       raw_author_name is "Sayam Sethi").
 *    2. If the raw string looks like `"Last, First [Middle...]"` (exactly
 *       one comma, non-empty halves), flip it to `"First [Middle] Last"`.
 *       OpenAlex ingests BibTeX-style records occasionally and stores the
 *       reversed form verbatim — un-mangling it here keeps author lists
 *       reading naturally. Multi-comma names (e.g. "Smith, John, Jr.")
 *       are left alone; too ambiguous to auto-flip.
 *    3. Fall back to `author.display_name` if raw is missing entirely.
 */
function pickAuthorName(a: OpenAlexAuthorship): string | undefined {
  const raw = a?.raw_author_name?.trim();
  const display = a?.author?.display_name?.trim();
  if (!raw) return display || undefined;
  const commaCount = (raw.match(/,/g) ?? []).length;
  if (commaCount === 1) {
    const [last, first] = raw.split(",").map((s) => s.trim());
    if (last && first) return `${first} ${last}`;
  }
  return raw;
}

function splitFrontmatter(raw: string): { data: any; body: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: raw };
  return { data: YAML.parse(match[1]) ?? {}, body: match[2] };
}

function renderFrontmatter(data: Record<string, unknown>, body = ""): string {
  // Force date-shaped strings to emit with quotes so downstream YAML parsers
  // (e.g. Astro's gray-matter) don't coerce "2018-11-01" into a JS Date.
  const doc = new YAML.Document(data);
  YAML.visit(doc, {
    Scalar(_, node) {
      if (
        typeof node.value === "string" &&
        /^\d{4}-\d{2}-\d{2}(T.*)?$/.test(node.value)
      ) {
        node.type = "QUOTE_DOUBLE";
      }
    },
  });
  const yaml = String(doc).trimEnd();
  const spacer = body.startsWith("\n") ? "" : "\n";
  return `---\n${yaml}\n---\n${spacer}${body}`;
}

async function readPersonFiles(): Promise<PersonEntry[]> {
  // Skip underscore-prefixed files (e.g. _template.md) — Astro's content
  // collections ignore them, so the sync should too.
  const files = (await readdir(PEOPLE_DIR)).filter(
    (f) => f.endsWith(".md") && !f.startsWith("_"),
  );
  const out: PersonEntry[] = [];
  for (const file of files) {
    const raw = await readFile(path.join(PEOPLE_DIR, file), "utf8");
    const { data } = splitFrontmatter(raw);
    out.push({ slug: file.replace(/\.md$/, ""), data: data as PersonFrontmatter });
  }
  return out;
}

// -------- OpenAlex -----------------------------------------------------

// Keep this in sync with OpenAlex's valid /works select fields. `host_venue`
// was deprecated in favour of `primary_location`; including it now returns
// HTTP 400. Venue names are read from primary_location.source.display_name.
const WORK_SELECT = [
  "id",
  "doi",
  "title",
  "display_name",
  "publication_year",
  "publication_date",
  "authorships",
  "primary_location",
  "type",
  "topics",
  "open_access",
  "best_oa_location",
  "locations",
  "updated_date",
].join(",");

async function openalexGet(url: string): Promise<any> {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`OpenAlex ${res.status} on ${url}: ${body.slice(0, 300)}`);
  }
  return res.json();
}

async function fetchAuthorWorks(authorId: string): Promise<OpenAlexWork[]> {
  const all: OpenAlexWork[] = [];
  let cursor: string | null = "*";
  let pages = 0;
  while (cursor && pages < MAX_PAGES_PER_AUTHOR) {
    const url =
      `https://api.openalex.org/works` +
      `?filter=author.id:${encodeURIComponent(authorId)}` +
      `&per-page=${PER_PAGE}` +
      `&cursor=${encodeURIComponent(cursor)}` +
      `&select=${WORK_SELECT}` +
      `&mailto=${encodeURIComponent(MAILTO)}`;
    const data = await openalexGet(url);
    all.push(...(data.results as OpenAlexWork[]));
    cursor = data.meta?.next_cursor ?? null;
    pages++;
  }
  return all;
}

async function fetchWorkById(workId: string): Promise<OpenAlexWork | null> {
  const url = `https://api.openalex.org/works/${encodeURIComponent(workId)}?select=${WORK_SELECT}&mailto=${encodeURIComponent(MAILTO)}`;
  try {
    return (await openalexGet(url)) as OpenAlexWork;
  } catch (e) {
    if (String(e).includes(" 404 ")) return null;
    throw e;
  }
}

// -------- Filters ------------------------------------------------------

function affiliationMatches(
  work: OpenAlexWork,
  authorId: string,
  affiliations: string[],
): boolean {
  const authorship = work.authorships.find(
    (a) => a.author?.id && stripOpenAlexPrefix(a.author.id) === authorId,
  );
  if (!authorship) return false;
  const institutionNames = (authorship.institutions || [])
    .map((i) => i?.display_name)
    .filter((n): n is string => typeof n === "string")
    .map((n) => n.toLowerCase());
  const rawStrings = (authorship.raw_affiliation_strings || [])
    .filter((s): s is string => typeof s === "string")
    .map((s) => s.toLowerCase());
  const candidates = [...institutionNames, ...rawStrings];
  const needles = affiliations.map((a) => a.toLowerCase());
  return needles.some((n) => candidates.some((c) => c.includes(n)));
}

/** How many distinct group members (by OpenAlex author ID) appear on a work.
 *
 *  Recent arXiv preprints reach OpenAlex via DataCite with NO affiliation
 *  data at all (empty institutions and raw_affiliation_strings), so the
 *  affiliation filter alone silently drops them. A work carrying 2+ group
 *  author IDs is a group paper regardless — author IDs are disambiguated,
 *  so this bypass doesn't reopen the same-name-author hole. */
function countGroupAuthors(
  work: OpenAlexWork,
  groupAuthorIds: Set<string>,
): number {
  const found = new Set<string>();
  for (const a of work.authorships || []) {
    const id = stripOpenAlexPrefix(a.author?.id);
    if (id && groupAuthorIds.has(id)) found.add(id);
  }
  return found.size;
}

/** Parse a person's alumni_since into a Date, or null when unset/invalid. */
function parseAlumniSince(v: string | Date | undefined): Date | null {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** True when a work was published after the person's alumni date.
 *
 *  Prefers the full publication_date; falls back to publication_year, which
 *  is compared against the alumni *year* so a paper is only cut when its
 *  year is strictly after the departure year (same-year papers with no
 *  exact date get the benefit of the doubt — excluded_works is the escape
 *  hatch for stragglers). */
function isPostAlumni(work: OpenAlexWork, alumniSince: Date): boolean {
  if (work.publication_date) {
    const d = new Date(work.publication_date);
    if (!Number.isNaN(d.getTime())) return d > alumniSince;
  }
  if (work.publication_year != null) {
    return work.publication_year > alumniSince.getUTCFullYear();
  }
  return false;
}

function topicMatches(work: OpenAlexWork, allowlist: string[]): boolean {
  if (allowlist.length === 0) return false;
  const names = (work.topics || [])
    .map((t) => t?.display_name)
    .filter((n): n is string => typeof n === "string")
    .map((n) => n.toLowerCase());
  const needles = allowlist.map((t) => t.toLowerCase());
  return needles.some((n) => names.includes(n));
}

// -------- Rendering ----------------------------------------------------

interface AccWork {
  work: OpenAlexWork;
  peopleSlugs: Set<string>;
  /** arXiv link recovered from a merged-away duplicate record. */
  arxivUrl?: string;
  /** OA pdf recovered from a merged-away duplicate record. */
  fallbackPdf?: string;
}

// -------- Duplicate-record merging --------------------------------------
// OpenAlex frequently carries the same paper as multiple work records: a
// DataCite record for the arXiv preprint (DOI 10.48550/arxiv.*), an
// arXiv-native record (no DOI, just a landing URL), and eventually the
// published version. Group them by normalized title and keep the "best"
// record — published venue over preprint — while preserving the arXiv link
// and people credits from the others.

function workArxivId(w: OpenAlexWork): string | null {
  const candidates = [
    w.doi,
    w.best_oa_location?.landing_page_url,
    w.best_oa_location?.pdf_url,
    ...(w.locations ?? []).flatMap((l) => [l?.landing_page_url, l?.pdf_url]),
  ];
  for (const c of candidates) {
    if (!c) continue;
    const s = c.toLowerCase();
    let m = s.match(/10\.48550\/arxiv\.([a-z0-9./-]+)/);
    if (m) return m[1].replace(/v\d+$/, "");
    m = s.match(/arxiv\.org\/(?:abs|pdf)\/([a-z0-9./-]+?)(?:\.pdf)?(?:[?#].*)?$/);
    if (m) return m[1].replace(/v\d+$/, "");
  }
  return null;
}

/** Do two works share enough authors (by disambiguated OpenAlex author ID)
 *  to plausibly be the same paper? Guards title-based merging against two
 *  genuinely different papers that happen to share a normalized title.
 *  When either side has no author IDs there's no signal, so allow. */
function authorsOverlap(a: OpenAlexWork, b: OpenAlexWork): boolean {
  const ids = (w: OpenAlexWork) =>
    new Set(
      (w.authorships || [])
        .map((x) => stripOpenAlexPrefix(x.author?.id))
        .filter(Boolean),
    );
  const ia = ids(a);
  const ib = ids(b);
  if (ia.size === 0 || ib.size === 0) return true;
  let shared = 0;
  for (const id of ia) if (ib.has(id)) shared++;
  return shared >= Math.max(1, Math.ceil(Math.min(ia.size, ib.size) / 2));
}

function isPreprintWork(w: OpenAlexWork): boolean {
  if (w.type === "preprint") return true;
  return /arxiv/i.test(w.primary_location?.source?.display_name ?? "");
}

/** Higher score = better candidate for the canonical record. */
function workScore(w: OpenAlexWork): number {
  let score = 0;
  if (!isPreprintWork(w)) score += 2;
  if (w.doi && !/10\.48550\/arxiv\./i.test(w.doi)) score += 1;
  return score;
}

function titleKey(w: OpenAlexWork): string {
  const t = (w.title || w.display_name || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
  return t || stripOpenAlexPrefix(w.id);
}

function mergeDuplicateWorks(
  byWorkId: Map<string, AccWork>,
  // Every work fetched during the run, including ones the filters dropped.
  // Filtered records can still DONATE links (arXiv/pdf) to a matching kept
  // paper — e.g. a DataCite preprint with no affiliation data that was
  // filtered for everyone — but they never create entries themselves.
  allFetched: Map<string, OpenAlexWork> = new Map(),
): Map<string, AccWork> {
  // Two-signal grouping:
  //   1. arXiv id — strong identity. Published records list their preprint
  //      in `locations`, so this merges preprint + published even when the
  //      title changed for camera-ready.
  //   2. Normalized title — fallback for records with no arXiv trace, but
  //      only when the author lists overlap, so two different papers that
  //      happen to share a title never merge.
  const groups: AccWork[][] = [];
  const groupByArxiv = new Map<string, number>();
  const groupByTitle = new Map<string, number>();

  for (const acc of byWorkId.values()) {
    const ax = workArxivId(acc.work);
    const tk = titleKey(acc.work);

    let gi = ax != null ? groupByArxiv.get(ax) : undefined;
    if (gi === undefined) {
      const ti = groupByTitle.get(tk);
      if (ti !== undefined && authorsOverlap(acc.work, groups[ti][0].work)) {
        gi = ti;
      }
    }
    if (gi === undefined) {
      gi = groups.length;
      groups.push([acc]);
    } else {
      groups[gi].push(acc);
    }
    if (ax != null) groupByArxiv.set(ax, gi);
    if (!groupByTitle.has(tk)) groupByTitle.set(tk, gi);
  }

  // Match filtered-out records to existing groups (never creating new ones)
  // so their links can be mined below.
  const donorsByGroup = new Map<number, OpenAlexWork[]>();
  for (const [id, w] of allFetched) {
    if (byWorkId.has(id)) continue; // already a kept record
    const ax = workArxivId(w);
    let gi = ax != null ? groupByArxiv.get(ax) : undefined;
    if (gi === undefined) {
      const ti = groupByTitle.get(titleKey(w));
      if (ti !== undefined && authorsOverlap(w, groups[ti][0].work)) gi = ti;
    }
    if (gi === undefined) continue;
    const list = donorsByGroup.get(gi);
    if (list) list.push(w);
    else donorsByGroup.set(gi, [w]);
  }

  const merged = new Map<string, AccWork>();
  for (const [gi, group] of groups.entries()) {
    group.sort((a, b) => workScore(b.work) - workScore(a.work));
    const primary = group[0];
    for (const other of group.slice(1)) {
      for (const slug of other.peopleSlugs) primary.peopleSlugs.add(slug);
    }
    // Recover the arXiv link / a real OA pdf from whichever record has one
    // — kept group members first, then filtered-out donor records.
    const linkSources = [
      ...group.map((m) => m.work),
      ...(donorsByGroup.get(gi) ?? []),
    ];
    for (const source of linkSources) {
      const ax = workArxivId(source);
      if (ax && !primary.arxivUrl) primary.arxivUrl = `https://arxiv.org/abs/${ax}`;
      const pdf =
        source.best_oa_location?.pdf_url ||
        (source.locations ?? []).find((l) => l?.pdf_url)?.pdf_url ||
        source.open_access?.oa_url;
      if (pdf && !primary.fallbackPdf) primary.fallbackPdf = pdf;
    }
    merged.set(stripOpenAlexPrefix(primary.work.id), primary);
  }
  return merged;
}

// -------- Venue badges ---------------------------------------------------
// Short label shown on the publication card. Matched as a case-insensitive
// substring of the venue name; first hit wins. Extend as new venues appear.
const VENUE_BADGES: Array<[pattern: string, badge: string]> = [
  ["architectural support for programming languages", "ASPLOS"],
  ["international symposium on computer architecture", "ISCA"],
  ["microarchitecture", "MICRO"],
  ["high-performance computer architecture", "HPCA"],
  ["high performance computer architecture", "HPCA"],
  ["quantum computing and engineering", "QCE"],
  ["parallel architectures and compilation", "PACT"],
  ["multiple-valued logic", "ISMVL"],
  ["computing frontiers", "CF"],
  ["hardware oriented security", "HOST"],
  ["physical review a", "PRA"],
  ["ieee micro", "IEEE Micro"],
  ["transactions on quantum computing", "ACM TQC"],
  ["proceedings of the ieee", "Proc. IEEE"],
  ["arxiv", "arXiv"],
];

function venueBadge(venue: string): string | undefined {
  const v = venue.toLowerCase();
  for (const [pattern, badge] of VENUE_BADGES) {
    if (v.includes(pattern)) return badge;
  }
  return undefined;
}

function buildPublicationData(
  w: OpenAlexWork,
  people: Set<string>,
  extras?: { arxivUrl?: string; fallbackPdf?: string },
): Record<string, unknown> {
  const title = stripLatex(w.title || w.display_name || "(untitled)");
  const authors = (w.authorships || [])
    .map((a) => pickAuthorName(a))
    .filter((n): n is string => typeof n === "string" && n.length > 0);
  const rawVenue =
    w.primary_location?.source?.display_name ||
    (w.type ? w.type.replace(/^./, (c) => c.toUpperCase()) : "Unknown venue");
  // OpenAlex labels arXiv as "arXiv (Cornell University)" — stale phrasing;
  // normalize to plain "arXiv".
  let venue = /arxiv/i.test(rawVenue) ? "arXiv" : rawVenue;
  // Some freshly-published records have no source at all, leaving the venue
  // as a generic "Article". IEEE DOIs embed the venue acronym (e.g.
  // 10.1109/hpca68181.2026...), so recover it from there when we can.
  const doiAcronym = w.doi
    ?.toLowerCase()
    .match(/10\.1109\/([a-z]+)/)?.[1]
    ?.toUpperCase();
  if (/^(Article|Unknown venue)$/i.test(venue) && doiAcronym) {
    venue = `${doiAcronym} (IEEE)`;
  }
  const year = w.publication_year ?? 0;

  const rawDoi = w.doi || undefined;
  const doi = rawDoi
    ? rawDoi.startsWith("http")
      ? rawDoi
      : `https://doi.org/${rawDoi.replace(/^doi:/, "")}`
    : undefined;

  // OpenAlex sometimes tucks arXiv landing pages in best_oa_location; a
  // merged-away duplicate record may also have carried the link.
  const landing = w.best_oa_location?.landing_page_url || undefined;
  const arxiv =
    (landing && /arxiv\.org/.test(landing)
      ? landing.replace(/^http:\/\//, "https://")
      : undefined) ?? extras?.arxivUrl;

  // PDF: only accept URLs that actually serve a PDF. DataCite-sourced
  // records put a doi.org landing page in oa_url, which is NOT a pdf —
  // for arXiv papers, construct the canonical arxiv.org/pdf/ URL instead.
  const looksLikePdf = (u: string | undefined | null): u is string =>
    !!u && (/\.pdf([?#]|$)/i.test(u) || /arxiv\.org\/pdf\//i.test(u));
  const arxivId =
    workArxivId(w) ??
    (arxiv ? arxiv.match(/arxiv\.org\/abs\/(.+)$/)?.[1] : undefined);
  const pdf =
    w.best_oa_location?.pdf_url ||
    (looksLikePdf(w.open_access?.oa_url) ? w.open_access?.oa_url : undefined) ||
    (arxivId ? `https://arxiv.org/pdf/${arxivId}` : undefined) ||
    (looksLikePdf(extras?.fallbackPdf) ? extras?.fallbackPdf : undefined) ||
    undefined;

  const topics = Array.from(
    new Set(
      (w.topics || [])
        .slice(0, 5)
        .map((t) => t?.display_name)
        .filter((n): n is string => typeof n === "string" && n.length > 0),
    ),
  );

  const data: Record<string, unknown> = {
    title,
    authors,
    venue,
    year,
    order: 0,
    tags: [],
    // Kept for backward compatibility and for the publications page's PI
    // bolding; per-person pages filter by name match, not by this list.
    people: [...people].sort(),
    topics,
    synced: true,
    openalex_id: stripOpenAlexPrefix(w.id),
    // NOTE: deliberately no per-file timestamp. Stamping one here would make
    // every sync run rewrite every file, producing noisy no-op git commits.
    // The run timestamp lives in src/data/sync-status.json instead.
  };
  // ISO YYYY-MM-DD from OpenAlex. Used for primary sort order; year alone
  // is the fallback when the date is missing (e.g. forthcoming papers).
  if (w.publication_date) data.publication_date = w.publication_date;
  if (pdf) data.pdf = pdf;
  if (arxiv) data.arxiv = arxiv;
  if (doi) data.doi = doi;
  const badge = venueBadge(venue) ?? doiAcronym;
  if (badge) data.badge = badge;
  return data;
}

async function writeSyncedFiles(
  byWorkId: Map<string, AccWork>,
): Promise<{ removedStale: number }> {
  await mkdir(PUBS_DIR, { recursive: true });
  const existing = (await readdir(PUBS_DIR)).filter((f) => f.endsWith(".md"));
  const currentFilenames = new Set<string>();

  for (const [workId, acc] of byWorkId) {
    const filename = `synced-${workId}.md`;
    currentFilenames.add(filename);
    const data = buildPublicationData(acc.work, acc.peopleSlugs, {
      arxivUrl: acc.arxivUrl,
      fallbackPdf: acc.fallbackPdf,
    });
    await writeFile(path.join(PUBS_DIR, filename), renderFrontmatter(data, "\n"));
  }

  let removedStale = 0;
  for (const file of existing) {
    if (!file.startsWith("synced-")) continue;
    if (currentFilenames.has(file)) continue;
    const raw = await readFile(path.join(PUBS_DIR, file), "utf8");
    const { data } = splitFrontmatter(raw);
    if (data && data.synced === true) {
      await unlink(path.join(PUBS_DIR, file));
      removedStale++;
    }
  }
  return { removedStale };
}

async function writeSyncStatus(
  byWorkId: Map<string, AccWork>,
  report: Record<string, PersonReport>,
  removedStale: number,
): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  const payload = {
    lastSynced: new Date().toISOString(),
    totalSyncedPublications: byWorkId.size,
    removedStale,
    perPerson: report,
  };
  await writeFile(
    path.join(DATA_DIR, "sync-status.json"),
    JSON.stringify(payload, null, 2) + "\n",
  );
}

// -------- Main ---------------------------------------------------------

async function main(): Promise<void> {
  const people = await readPersonFiles();
  // Every group member's OpenAlex author ID, for the group-coauthor check.
  const groupAuthorIds = new Set(
    people
      .map((p) => p.data.openalex_id?.trim())
      .filter((id): id is string => Boolean(id)),
  );
  const byWorkId = new Map<string, AccWork>();
  // Every work returned by OpenAlex this run, kept or not — filtered
  // records can still donate links during duplicate merging.
  const allFetchedWorks = new Map<string, OpenAlexWork>();
  const report: Record<string, PersonReport> = {};
  // Every work ID OpenAlex returned for each person, regardless of whether
  // that person's own affiliation check passed. Used in the co-authorship
  // rescue pass below so a paper by Baker + Sethi ends up on both their
  // pages even if Sethi's authorship entry on that paper didn't list UT.
  const fetchedByPerson = new Map<string, Set<string>>();

  for (const person of people) {
    const rep: PersonReport = {
      name: person.data.name,
      authorId: person.data.openalex_id ?? null,
      kept: 0,
      filteredExcluded: 0,
      filteredAffiliation: 0,
      filteredPostAlumni: 0,
      extraAdded: 0,
      coauthorRescued: 0,
      total: 0,
      skipped: false,
    };
    report[person.slug] = rep;

    const authorId = person.data.openalex_id?.trim();
    if (!authorId) {
      rep.skipped = true;
      console.log(`[${person.slug}] no openalex_id — skipping.`);
      continue;
    }

    const affiliations =
      person.data.affiliations && person.data.affiliations.length > 0
        ? person.data.affiliations
        : DEFAULT_AFFILIATIONS;
    const topicAllowlist = person.data.topic_allowlist ?? [];
    const alumniSince = parseAlumniSince(person.data.alumni_since);
    const excluded = new Set(
      (person.data.excluded_works ?? []).map(stripOpenAlexPrefix),
    );
    const extraIds = (person.data.extra_works ?? []).map(stripOpenAlexPrefix);

    console.log(`\n[${person.slug}] fetching works for ${authorId}…`);
    let works: OpenAlexWork[] = [];
    try {
      works = await fetchAuthorWorks(authorId);
    } catch (e) {
      rep.error = String(e instanceof Error ? e.message : e);
      console.error(`[${person.slug}] fetch failed:`, rep.error);
      continue;
    }
    rep.total = works.length;
    console.log(`[${person.slug}] ${works.length} total from OpenAlex`);

    const theirFetched = new Set<string>();
    for (const work of works) {
      const workId = stripOpenAlexPrefix(work.id);
      theirFetched.add(workId);
      allFetchedWorks.set(workId, work);
      if (excluded.has(workId)) {
        rep.filteredExcluded++;
        continue;
      }
      // Alumni cutoff: after someone leaves the group, their own authorship
      // no longer pulls papers in. Papers they write *with current members*
      // still make it — the current member's filter keeps the paper, and
      // the co-authorship rescue pass below credits the alum on it. Their
      // pre-departure back catalog is untouched.
      if (alumniSince && isPostAlumni(work, alumniSince)) {
        rep.filteredPostAlumni++;
        continue;
      }
      const affOk = affiliationMatches(work, authorId, affiliations);
      const topicOk = topicMatches(work, topicAllowlist);
      // Group-coauthor bypass: affiliation data is often missing entirely
      // (e.g. DataCite-sourced arXiv preprints), but a paper with 2+ group
      // author IDs on it is a group paper.
      const coauthorOk = countGroupAuthors(work, groupAuthorIds) >= 2;
      if (!affOk && !topicOk && !coauthorOk) {
        rep.filteredAffiliation++;
        continue;
      }
      addWork(byWorkId, work, person.slug);
      rep.kept++;
    }
    fetchedByPerson.set(person.slug, theirFetched);

    for (const extraId of extraIds) {
      // Already synced via another group member — just credit this person.
      const already = byWorkId.get(extraId);
      if (already) {
        if (!already.peopleSlugs.has(person.slug)) {
          already.peopleSlugs.add(person.slug);
          rep.extraAdded++;
        }
        continue;
      }
      try {
        const w = await fetchWorkById(extraId);
        if (w) {
          addWork(byWorkId, w, person.slug);
          rep.extraAdded++;
        } else {
          console.warn(`[${person.slug}] extra_works: ${extraId} not found on OpenAlex.`);
        }
      } catch (e) {
        console.error(
          `[${person.slug}] extra_works fetch failed for ${extraId}:`,
          e,
        );
      }
    }
  }

  // --- Co-authorship rescue pass ---------------------------------------
  // If Baker's authorship on paper P lists UT Austin, P is in byWorkId with
  // {baker} in its peopleSlugs. If Sethi is also on P but his authorship
  // entry didn't list UT, his own filter dropped P. We catch that here: any
  // paper OpenAlex returned for a person that was kept by *someone* in the
  // group gets that person credited too (unless they explicitly excluded
  // it via excluded_works).
  for (const person of people) {
    const fetched = fetchedByPerson.get(person.slug);
    if (!fetched) continue;
    const excluded = new Set(
      (person.data.excluded_works ?? []).map(stripOpenAlexPrefix),
    );
    const rep = report[person.slug];
    for (const workId of fetched) {
      if (excluded.has(workId)) continue;
      const acc = byWorkId.get(workId);
      if (!acc) continue;
      if (acc.peopleSlugs.has(person.slug)) continue;
      acc.peopleSlugs.add(person.slug);
      if (rep) rep.coauthorRescued++;
    }
  }

  // Collapse duplicate OpenAlex records (preprint + published + DataCite
  // copies of the same paper) into one file each, preferring the published
  // version and carrying the arXiv link along.
  const mergedWorks = mergeDuplicateWorks(byWorkId, allFetchedWorks);
  const duplicatesMerged = byWorkId.size - mergedWorks.size;
  if (duplicatesMerged > 0) {
    console.log(`\nMerged ${duplicatesMerged} duplicate record(s).`);
  }

  const { removedStale } = await writeSyncedFiles(mergedWorks);
  await writeSyncStatus(mergedWorks, report, removedStale);

  // --- Summary ---
  console.log("\n=== Summary ===");
  for (const [slug, r] of Object.entries(report)) {
    if (r.skipped) {
      console.log(`  ${slug}: skipped (no openalex_id)`);
      continue;
    }
    if (r.error) {
      console.log(`  ${slug}: ERROR — ${r.error}`);
      continue;
    }
    console.log(
      `  ${slug}: kept ${r.kept} / ${r.total}  ` +
        `(excluded ${r.filteredExcluded}, filtered ${r.filteredAffiliation}, ` +
        `post-alumni ${r.filteredPostAlumni}, ` +
        `extra +${r.extraAdded}, co-author rescued +${r.coauthorRescued})`,
    );
  }
  console.log(`\nWrote ${byWorkId.size} synced publications.`);
  if (removedStale > 0) console.log(`Removed ${removedStale} stale file(s).`);
}

function addWork(
  map: Map<string, AccWork>,
  work: OpenAlexWork,
  personSlug: string,
): void {
  const id = stripOpenAlexPrefix(work.id);
  const existing = map.get(id);
  if (existing) {
    existing.peopleSlugs.add(personSlug);
  } else {
    map.set(id, { work, peopleSlugs: new Set([personSlug]) });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
