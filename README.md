# The Baker Group — Website
---

## Run it locally

```bash
# 1. Install dependencies (Node 18+ recommended)
npm install

# 2. Start the dev server with hot reload
npm run dev
# → http://localhost:4321

# 3. Production build
npm run build      # outputs to ./dist
npm run preview    # preview the production build locally
```

---

## What's inside

```
.
├─ astro.config.mjs        # Astro config — site URL lives here
├─ tailwind.config.mjs     # Palette, typography, shadows
├─ tsconfig.json
├─ public/                 # static files (favicon, robots.txt, images)
└─ src/
   ├─ styles/global.css        # design tokens + component classes
   ├─ layouts/BaseLayout.astro # <html>, head, header/footer, page header
   ├─ components/              # Header, Footer, Hero, cards...
   ├─ pages/                   # each file here becomes a route
   │   ├─ index.astro          # /
   │   ├─ research.astro       # /research
   │   ├─ people.astro         # /people
   │   ├─ publications.astro   # /publications
   │   ├─ teaching.astro       # /teaching
   │   ├─ join.astro           # /join
   │   ├─ news/
   │   │   ├─ index.astro      # /news
   │   │   └─ [slug].astro     # /news/<post-slug>
   │   └─ rss.xml.ts           # /rss.xml
   └─ content/
       ├─ config.ts            # typed schemas for the collections below
       ├─ news/                # one .md per post
       ├─ publications/        # one .md per paper
       └─ people/              # one .md per person
```

---

## Add a news post

Create `src/content/news/YYYY-MM-DD-slug.md`:

```markdown
---
title: "New paper out in Nature Quantum Information"
date: 2026-04-22
tag: "Publications"
summary: "Short one-line teaser shown on the News page."
---

Full post body in Markdown. Links, images, everything.
```

The filename becomes the URL slug. Posts are sorted by `date` automatically.
Set `draft: true` in the frontmatter to hide a post from production.

## Add a publication

Create `src/content/publications/YYYY-short-title.md`:

```markdown
---
title: "Empirical thresholds are not free lunches"
authors:
    - "Jonathan M. Baker"
    - "Sayam Sethi"
venue: "ISCA 2025"
year: 2025
arxiv: "https://arxiv.org/abs/..."
code: "https://github.com/..."
highlight: "Optional one-liner displayed as a highlight box."
---
```

The publication list groups by year. Use `order` (higher = shown higher) to
break ties within a year.

## Add / edit a person

Create `src/content/people/firstname-lastname.md`:

```markdown
---
name: "Priya Ramanathan"
role: "PhD Student" # PI | Postdoc | PhD Student | Masters Student | Undergraduate | Staff | Visiting Researcher | Alumni
bio: "One sentence, shown under the name."
email: "priya@utexas.edu"
website: "https://example.com"
github: "https://github.com/..."
scholar: "https://scholar.google.com/..."
image: "/people/priya.jpg" # optional; leave off for a warm-palette initials avatar
order: 10 # sort within a role (lower = earlier)
---

Longer free-form bio, rendered on the person's profile page at
/people/<slug>.
```

Add an optional `blurb: "..."` for a short one-liner on the `/people` grid
card (falls back to `bio` if unset). Keep it to **~110 characters or fewer
(2-3 lines)** — the card photo is a fixed square sized off its own width, so
a longer blurb makes the text column grow past the photo and leaves a gap
underneath it. `npm run build` will fail with a clear error if a blurb goes
over the limit, and the card also clamps to 3 lines as a visual backstop.

The filename (without `.md`) becomes the person's slug and the URL of their
profile page. The profile page shows the bio body plus any publications that
list the slug in their `people:` frontmatter array.

Roles are enforced by the schema in `src/content/config.ts`; TypeScript will
complain if you use an unknown value.

---

## Pulling publications automatically from OpenAlex

Every group member with an `openalex_id` in their frontmatter gets their
publications pulled on a monthly cron, deduplicated across co-authors, and
committed back to the repo as markdown files under `src/content/publications/`.
On the site, `/publications` shows the aggregated list (with a topic filter
chip bar); each person's page at `/people/<slug>` shows just their papers.

Why OpenAlex instead of Google Scholar: Scholar has no public API, and
scraping it gets blocked by CAPTCHA in automation. OpenAlex is free, stable,
covers ~95% of Scholar's academic papers, and gives us structured metadata
(DOI, venue, topics, per-paper affiliations) we can filter on.

### Turning it on for a person

Each person's markdown file has a commented-out block under their regular
frontmatter. Uncomment and fill in the values:

```yaml
openalex_id: "A5023888391"
affiliations:
    - "University of Texas at Austin"
```

To find the OpenAlex ID, go to [openalex.org](https://openalex.org), search
for the person's name, open their author page, and copy the `A...` string
from the URL. You can sanity-check the profile at
`https://api.openalex.org/authors/A<id>` — if the affiliation history and
paper list look right, you're set.

### How filtering works

Every pulled paper runs through, in order:

1. **`excluded_works`** — any OpenAlex work ID in this list is always dropped.
   The escape hatch for the last few same-name stragglers.
2. **`affiliations`** — the paper is kept only if at least one authorship
   for this author on this paper carries an affiliation whose display name
   contains one of these strings (case-insensitive substring match). This
   is the primary defense against OpenAlex bleeding same-name researchers
   into a profile. Defaults to `["University of Texas at Austin"]` when empty.
3. **`topic_allowlist`** — optional. A paper that fails the affiliation
   check is rescued if its OpenAlex topic list includes any of these topic
   names. Leave empty for affiliation-only.
4. **`extra_works`** — OpenAlex work IDs to force-include even if the
   filters above would drop them. Use for workshop papers OpenAlex mis-filed.

### Running a sync

```bash
# Locally
npm run sync-publications

# Optional: use a specific contact email for OpenAlex's "polite pool"
OPENALEX_MAILTO="you@utexas.edu" npm run sync-publications
```

The script prints a per-person summary (`kept`, `excluded`, `filtered`,
`extra`) and writes any new/changed files. Review the diff, commit the
changes you want, and the next deploy will show them.

### Automation

`.github/workflows/sync-publications.yml` runs the script at 06:00 UTC on
the 1st of each month and commits any changes. You can also trigger it
manually:

```bash
gh workflow run sync-publications.yml
```

…or from the GitHub UI: Actions → "Sync publications from OpenAlex" →
"Run workflow".

Set the optional `OPENALEX_MAILTO` repo secret to override the contact
email sent to OpenAlex. Grant the workflow's `GITHUB_TOKEN` write access
(Settings → Actions → Workflow permissions) so it can push the commit.

### Which files are auto-managed

Any file in `src/content/publications/` whose filename starts with
`synced-` AND whose frontmatter contains `synced: true` is overwritten on
every sync. Files that don't match both conditions are never touched by the
script — add manual entries with any filename you like. If a synced paper
stops matching (affiliation change, added to `excluded_works`, etc.), the
corresponding file is deleted on the next sync.

### Where the "Last synced" timestamp comes from

After each sync the script writes `src/data/sync-status.json` with the
timestamp and a per-person summary. The publications page reads this at
build time and renders a subtle "Auto-sync last ran <date>" line at the
bottom.

---

## Dark mode

- Toggle lives in the header (sun/moon icon).
- Default is the visitor's system preference (`prefers-color-scheme`); once a
  visitor flips the toggle, their choice is persisted to `localStorage` and
  wins over the system setting.
- The theme is applied in an inline `<script is:inline>` in `<head>` before
  first paint — no flash of the wrong theme on load.
- Palette, cards, buttons, dividers, and the flour-grain body pattern all
  swap automatically via CSS variables defined in `src/styles/global.css`
  (`:root` and `.dark`). Page-specific colors use Tailwind's `dark:` variants.

## Design system (at a glance)

- **Palette** — `crust` (browns), `butter` (yellows), `burnt` (UT Austin burnt
  orange, which conveniently doubles as the caramel/crust accent), and a quiet
  `sage` for optional accents. All defined in `tailwind.config.mjs`.
- **Typography** — [Fraunces](https://fonts.google.com/specimen/Fraunces)
  variable for headings (warm, slightly old-style serif), Inter variable for
  body, JetBrains Mono for code and years. All self-hosted via Fontsource
  (no Google Fonts CDN).
- **Component classes** — defined in `src/styles/global.css` under the
  `@layer components` block. The most useful: `.card`, `.chip`, `.btn-primary`,
  `.btn-ghost`, `.eyebrow`, `.section-title`, `.link-burnt`, `.container-page`,
  `.container-narrow`.
- **Texture** — a subtle "flour grain" radial dot pattern on `body`.

---

## Change the PI name / branding

Several strings currently hardcode `"Jonathan M. Baker"` / `"The Baker Group"`:

- `src/components/Header.astro` — site title chip in the header.
- `src/components/Footer.astro` — site name in the footer.
- `src/layouts/BaseLayout.astro` — default `<title>` and meta description.
- `src/pages/publications.astro` — the `piName` passed to each
  `<PublicationItem>` (used to bold the PI in the authors list).
- `astro.config.mjs` — the canonical `site` URL.

A future refactor could pull these into a single `src/config/site.ts`; for now
they're deliberately explicit so the scaffold is easy to read.

---

## Deploy

Any static host works. The built site is plain HTML/CSS/JS in `./dist`.

- **Netlify / Vercel / Cloudflare Pages** — point at the repo, set build
  command `npm run build` and output dir `dist`.
- **UT web hosting / rsync** — `npm run build && rsync -av ./dist/ user@host:/path/`.
- **GitHub Pages** — use the Astro GitHub Pages guide; set `base` in
  `astro.config.mjs` if serving from a subpath.

Set the canonical `site` URL in `astro.config.mjs` before deploying.

---

## Conventions

- Every page uses `BaseLayout` and sets `title` + `description`.
- Content pages that want the stock page header block pass `showPageHeader`,
  `eyebrow`, `pageTitle`, and `pageSubtitle`.
- Tailwind classes preferred for layout; reach for `global.css` component
  classes when a pattern repeats (`.card`, `.chip`, etc.).
- Markdown bodies are rendered with the Tailwind Typography defaults
  configured in `tailwind.config.mjs`.
