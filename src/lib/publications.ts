// Shared helpers for ranking and matching publications.
//
// Sort order: publication_date descending, falling back to year then the
// hand-set `order` field so manual tweaks still resolve ties predictably.
// OpenAlex omits publication_date for some entries (notably forthcoming or
// misparsed ones); year alone covers those.

import type { CollectionEntry } from "astro:content";

export type Pub = CollectionEntry<"publications">;

/** Parse a YYYY-MM-DD (or full ISO) string to a comparable epoch ms.
 *  Returns null for anything unparseable so callers can apply a fallback. */
function dateMs(s: string | undefined | null): number | null {
  if (!s) return null;
  const ms = Date.parse(s);
  return Number.isFinite(ms) ? ms : null;
}

export function comparePublications(a: Pub, b: Pub): number {
  const aMs = dateMs(a.data.publication_date);
  const bMs = dateMs(b.data.publication_date);

  // Both have dates → sort strictly by date descending.
  if (aMs !== null && bMs !== null && aMs !== bMs) return bMs - aMs;

  // One has a date, one doesn't → put the dated one first *within the same
  // year*. Across years, year wins so a 2026 undated paper still beats a
  // 2024 dated one.
  if (b.data.year !== a.data.year) return b.data.year - a.data.year;

  if (aMs !== null && bMs === null) return -1;
  if (aMs === null && bMs !== null) return 1;
  if (aMs !== null && bMs !== null) return bMs - aMs;

  return b.data.order - a.data.order;
}

/** Normalize a name for comparison. Trims, lowercases, collapses whitespace,
 *  and strips common honorifics so "Prof. Jonathan M. Baker" matches
 *  OpenAlex's "Jonathan M. Baker". */
export function normalizeName(n: string): string {
  return n
    .replace(/^(Prof\.|Dr\.|Mr\.|Ms\.|Mrs\.)\s+/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** Extract a normalized arXiv id from any of the given strings (DOIs like
 *  "10.48550/arxiv.2606.19593" or URLs like "arxiv.org/abs/2606.19593v2").
 *  Version suffixes are stripped so v1/v2 of the same paper match. */
export function arxivIdFromStrings(
  ...candidates: Array<string | undefined | null>
): string | null {
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

/** Is this the arXiv/preprint version of a paper (vs. a published venue)? */
export function isPreprintVenue(venue: string | undefined): boolean {
  return /arxiv|preprint/i.test(venue ?? "");
}

/** Canonical identity key for a publication. arXiv id first — OpenAlex often
 *  carries the same preprint twice (a DataCite record keyed by the
 *  10.48550/arxiv DOI and an arXiv-native record with only a landing URL),
 *  and the published version usually lists the preprint as its OA location,
 *  so the arXiv id is the strongest cross-version identity. */
export function pubDedupKey(p: Pub): string {
  const ax = arxivIdFromStrings(p.data.arxiv, p.data.doi, p.data.pdf);
  if (ax) return `arxiv:${ax}`;
  if (p.data.doi) return `doi:${p.data.doi.toLowerCase()}`;
  if (p.data.openalex_id) return `oa:${p.data.openalex_id}`;
  return `title:${p.data.title.toLowerCase().replace(/[^a-z0-9]+/g, "")}`;
}

/** Dedupe a sequence of publications by pubDedupKey. When the same paper
 *  appears as both a preprint and a published version, the published one
 *  wins; otherwise the first occurrence in input order is kept. */
export function dedupePublications(pubs: Pub[]): Pub[] {
  const seen = new Map<string, Pub>();
  for (const p of pubs) {
    const key = pubDedupKey(p);
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, p);
    } else if (
      isPreprintVenue(existing.data.venue) &&
      !isPreprintVenue(p.data.venue)
    ) {
      seen.set(key, p);
    }
  }
  return Array.from(seen.values());
}

/** Does this publication list any of the given author-name variants? */
export function pubHasAuthor(p: Pub, names: string[]): boolean {
  if (names.length === 0) return false;
  const wanted = new Set(names.map(normalizeName));
  return (p.data.authors ?? []).some((a) => wanted.has(normalizeName(a)));
}

/** Does a publication fall under a research theme?
 *
 *  A theme describes itself with two lists: `maps_topics` (OpenAlex topic
 *  strings) and `maps_keywords` (substrings to look for in the paper title).
 *  We match on EITHER — OpenAlex topics are coarse and several themes share
 *  topic strings, so keyword matching on the title carries most of the
 *  disambiguation. All comparisons are case-insensitive.
 *
 *  Topic matches are bidirectional-substring ("Quantum Error Correction" in
 *  the theme catches "Quantum Error Correction Codes" on a paper, and vice
 *  versa). Keyword matches are one-way substring: the keyword must appear
 *  as a substring of the title. */
export function pubMatchesTheme(
  p: Pub,
  theme: { maps_topics?: string[]; maps_keywords?: string[] },
): boolean {
  const topics = theme.maps_topics ?? [];
  const keywords = theme.maps_keywords ?? [];
  if (topics.length === 0 && keywords.length === 0) return false;

  const paperTopics = (p.data.topics ?? []).map((t) => t.toLowerCase());
  const topicHit = topics.some((t) => {
    const needle = t.toLowerCase().trim();
    if (!needle) return false;
    return paperTopics.some((pt) => pt.includes(needle) || needle.includes(pt));
  });
  if (topicHit) return true;

  const title = (p.data.title ?? "").toLowerCase();
  return keywords.some((k) => {
    const needle = k.toLowerCase().trim();
    return needle.length > 0 && title.includes(needle);
  });
}
