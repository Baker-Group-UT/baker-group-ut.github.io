---
# ============================================================================
# MEMBER TEMPLATE — this file never appears on the site (files starting
# with "_" are ignored by Astro's content collections).
#
# To add a member:
#   1. Copy this file and rename it to their slug, e.g. jane-doe.md
#      (the filename becomes the URL: /people/jane-doe)
#   2. Fill in the fields, delete any optional ones you don't need.
#   3. Drop their photo into public/images/people/ and point `image` at it.
# ============================================================================

name: "Full Name"

# One of: PI, Postdoc, PhD Student, Masters Student, Undergraduate, Staff,
# Visiting Researcher, External Member, Alumni
role: "PhD Student"

# Student year/standing shown next to the role, e.g. "1st year", "Senior".
# Optional — delete for non-students.
year: "1st year"

# Short one-liner for the /people grid card. Keep under ~110 characters or
# the card grows taller than its photo. Optional.
blurb: "Works on <topic> for <area>."

# Longer intro shown on the profile page header and the PI feature card.
# Inside these quotes, \n\n makes a paragraph break and inline HTML like
# <u>underline</u> works. Optional — the markdown body below is the main
# long-form bio.
bio: ""

# Portrait. Square-ish photos work best.
image: "/images/people/REPLACE-ME.jpg"
# Zoom multiplier (1 = as-is, >1 zooms in) and vertical shift in pixels
# (negative raises the crop, positive lowers it). Tune against the card
# on /people; the profile-page avatar scales these automatically.
image_zoom: 1
image_y_shift: 0

# Contact / profile links. All optional — delete unused lines.
# email: "name@utexas.edu"
# website: "https://example.com"
# github: "https://github.com/username"
# scholar: "https://scholar.google.com/citations?user=XXXXXXX"

# Sort position within their role section (lower = earlier). PhD students
# additionally sort by year (more senior first) before this applies.
order: 50

# When they joined the group (YYYY-MM-DD). Optional.
joined: 2026-01-01

# --- Alumni (set both when someone leaves the group) -------------------
# Where they went, shown on their card, e.g. "Now at IBM Quantum".
# alumniDestination: ""
# Departure date. The publication sync stops pulling papers they publish
# after this date unless a current group member is a co-author; everything
# they published while in the group stays. (Also change `role` to Alumni.)
# alumni_since: 2026-05-15

# --- Publication syncing (all optional) -------------------------------
# OpenAlex author ID (find it by searching the person at openalex.org —
# it looks like "A5012345678"). When set, the monthly sync pulls their
# papers automatically.
# openalex_id: "A5012345678"

# Affiliation strings that must appear on a paper's authorship for it to
# be kept. Defaults to UT Austin when empty; add previous institutions to
# also pull in earlier work.
# affiliations:
#     - "University of Texas at Austin"

# OpenAlex work IDs ("W...") to always drop or always include, for the
# stragglers the filters get wrong.
# excluded_works: []
# extra_works: []

# Alternate published-name spellings, so per-person paper lists and name
# bolding catch every variant.
# aliases:
#     - "F. Name"
---

Write the long-form bio here in markdown — this renders on the person's
profile page at /people/their-slug. Blank lines make paragraph breaks.
