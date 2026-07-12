import { defineCollection, z } from "astro:content";

// News / blog posts.
const news = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    summary: z.string().optional(),
    tag: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

// Publications — one markdown file per paper so you can add optional long-form
// notes (blog-style commentary, supplementary details) in the body.
//
// Files beginning with "synced-" and containing `synced: true` in the
// frontmatter are managed by `scripts/sync-publications.ts` and will be
// overwritten on each sync. Manually authored files (anything without
// `synced: true`) are never touched by the sync script.
const publications = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    authors: z.array(z.string()),
    venue: z.string(),
    year: z.number().int(),
    pdf: z.string().url().optional(),
    arxiv: z.string().url().optional(),
    doi: z.string().url().optional(),
    code: z.string().url().optional(),
    highlight: z.string().optional(),
    // Short venue label ("ASPLOS", "arXiv", ...) shown as a chip on the
    // publication card. The sync sets it automatically for known venues;
    // set it by hand on manual entries.
    badge: z.string().optional(),
    // Used to sort ties consistently within a year (higher = higher up).
    order: z.number().default(0),
    tags: z.array(z.string()).default([]),
    // Slugs of group members who co-authored this paper. Drives the
    // per-person publication list at /people/<slug>. The sync script
    // populates this automatically; you can also set it by hand on
    // manually-authored entries.
    people: z.array(z.string()).default([]),
    // OpenAlex topic names (e.g. "Quantum Error Correction"). Powers the
    // topic filter on the /publications page.
    topics: z.array(z.string()).default([]),
    // Marker for sync-managed files. Never edit by hand — the sync script
    // will overwrite files where this is true.
    synced: z.boolean().default(false),
    // OpenAlex work ID (like "W1234567890"). Only set on synced entries.
    openalex_id: z.string().optional(),
    last_synced: z.coerce.date().optional(),
    // ISO "YYYY-MM-DD" from OpenAlex. Preferred sort key; `year` is the
    // fallback. YAML without quotes interprets "2018-11-01" as a Date, so
    // accept either form and normalize to a string for downstream sort.
    publication_date: z
      .union([z.string(), z.date()])
      .transform((v) =>
        v instanceof Date ? v.toISOString().slice(0, 10) : v,
      )
      .optional(),
  }),
});

// People — one markdown file per person, long-form bio in the body.
const people = defineCollection({
  type: "content",
  schema: z.object({
    name: z.string(),
    role: z.enum([
      "PI",
      "Postdoc",
      "PhD Student",
      "Masters Student",
      "Undergraduate",
      "Staff",
      "Visiting Researcher",
      "External Member",
      "Alumni",
    ]),
    // Student year or standing, such as "1st year" or "Senior".
    year: z.string().optional(),
    bio: z.string().optional(),
    // Short one-liner shown on the /people grid card. If unset, the card
    // falls back to `bio`. Keep `bio` for the long-form version that
    // renders on the individual profile page.
    //
    // Cap at ~110 characters (roughly 2-3 lines). The card photo is a
    // fixed square sized off its own width, not the text column — a
    // longer blurb makes the card grow past the photo and leaves a gap
    // underneath it. The card also visually clamps to 3 lines as a
    // backstop, but keep it under the limit so nothing gets cut off.
    blurb: z
      .string()
      .max(
        110,
        "blurb should be ~110 characters or fewer (2-3 lines) — longer text makes the card taller than its photo and leaves a gap underneath",
      )
      .optional(),
    image: z.string().optional(),
    // Scale multiplier applied to the card / feature photo via a CSS
    // transform. `1` renders the source as-is; values >1 zoom in (useful
    // when the subject sits small in the frame). Applies to both the
    // small grid card and the PI feature card.
    image_zoom: z.number().positive().default(1),
    // Vertical image offset in pixels. Negative values raise the portrait;
    // positive values lower it.
    image_y_shift: z.number().default(0),
    email: z.string().email().optional(),
    website: z.string().url().optional(),
    github: z.string().url().optional(),
    scholar: z.string().url().optional(),
    order: z.number().default(0),
    // Hide the Publications section on this person's profile page entirely
    // (e.g. for non-researcher entries like the group dog).
    hide_publications: z.boolean().default(false),
    joined: z.coerce.date().optional(),
    alumniDestination: z.string().optional(),
    // Date this person left the group (YYYY-MM-DD). Used by the publication
    // sync: papers published after this date are only kept if a *current*
    // member co-authored them; the person's earlier papers are unaffected.
    // Set this when moving someone to the Alumni role.
    alumni_since: z.coerce.date().optional(),
    // --- Publication syncing (optional) ---------------------------------
    // OpenAlex author ID, e.g. "A5023888391". When set, the monthly sync
    // script pulls this person's papers from OpenAlex and merges them
    // into the publications collection.
    openalex_id: z.string().optional(),
    // Institutional affiliation strings to keep. A paper is kept only if
    // at least one authorship (for this author) has an affiliation whose
    // display name contains one of these strings (case-insensitive).
    // Defaults to ["University of Texas at Austin"] when empty. This is
    // the primary defense against same-name author bleed in OpenAlex.
    affiliations: z.array(z.string()).default([]),
    // Optional OpenAlex topic names. If non-empty, a paper whose topics
    // include any of these is kept even if it fails the affiliation
    // filter. Use sparingly — most groups only need affiliation.
    topic_allowlist: z.array(z.string()).default([]),
    // OpenAlex work IDs to always drop, even if they pass other filters.
    // The escape hatch for the last few same-name stragglers.
    excluded_works: z.array(z.string()).default([]),
    // OpenAlex work IDs to always include, even if the filters drop them.
    // Useful for e.g. workshop papers OpenAlex misclassified.
    extra_works: z.array(z.string()).default([]),
    // Alternate author-name spellings this person publishes under (e.g.
    // "S. Prakash Sethi" alongside "Sayam Sethi"). Each person's profile
    // page shows any paper whose author list contains `name` *or* any
    // alias, and each alias is bolded in the author list. Use this when
    // OpenAlex hasn't linked every authorship to the canonical author ID.
    aliases: z.array(z.string()).default([]),
  }),
});

// Research themes — short editorial descriptions of the lines of work the
// group pursues. One markdown file per theme, with long-form body copy. A
// theme opts in to showing a filtered publication list by declaring
// `maps_topics`: any paper whose OpenAlex topics intersect this list (case-
// insensitive) is shown on the theme page. This keeps theme curation
// decoupled from the sync pipeline — add a theme, list a few topic strings,
// and publications flow in on the next build.
const themes = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    // Short one-liner shown under the title on the index and detail pages.
    tagline: z.string().optional(),
    // Longer blurb used on the /research index card. Body copy on the
    // detail page lives in the markdown body (MDX-style).
    summary: z.string().optional(),
    // Lower = earlier on the index grid.
    order: z.number().default(0),
    // OpenAlex topic strings this theme encompasses. Matching is case-
    // insensitive and substring-based, so "Quantum Error Correction" will
    // also pull in "Quantum Error Correction Codes". OpenAlex topics are
    // coarse, so in practice `maps_keywords` does most of the work.
    maps_topics: z.array(z.string()).default([]),
    // Substrings matched against the publication title (case-insensitive).
    // Much sharper signal than OpenAlex topics — use these to keep themes
    // distinct. A paper matches the theme if ANY topic or ANY keyword hits.
    maps_keywords: z.array(z.string()).default([]),
    // Optional hero image or illustration path (e.g. "/images/themes/foo.svg").
    image: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { news, publications, people, themes };
