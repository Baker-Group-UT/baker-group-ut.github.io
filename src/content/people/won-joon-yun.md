---
name: "Won Joon Yun"

role: "PhD Student"

year: "3rd year"

blurb: "Works on Clifford deformations and logical compilation for quantum architectures."

bio: ""

image: "/images/people/wonjoon.jpg"
image_zoom: 1
image_y_shift: 0

website: "https://www.wonjoonyun.com/"
scholar: "https://scholar.google.com/citations?hl=en&user=ECo3iAkAAAAJ"

# Sits with the other 3rd-year PhD students (Aditi is 20); the /people page
# sorts PhD students by seniority first, so this only breaks ties within
# the same year.
order: 21

# He worked with Prof. Das through summer 2026, so this is his start date
# with the Baker group, not the start of his PhD.
joined: 2026-08-15

# --- Publication syncing ---------------------------------------------
openalex_id: "A5081315657"
# NOTE: affiliations defaults to UT Austin only, so the sync will pull his
# UT papers and skip his pre-UT quantum-machine-learning work. If you want
# that earlier work listed too, add the institution string here, e.g.
# affiliations:
#     - "University of Texas at Austin"
#     - "<his previous institution>"

# Kept off the publications page on purpose. W7204620458 is the "IRIS
# Dataset" Zenodo deposit (doi 10.5281/zenodo.22152933) — a data artefact
# rather than a paper, so it doesn't belong in the publication list.
# OpenAlex indexes Zenodo records as works, so without this the sync would
# re-add it on every run.
excluded_works:
    - "W7204620458"
---

Won Joon is broadly interested in various topics in quantum computing.
Before joining UT, he worked on quantum machine learning. From summer 2024
to summer 2026, he worked on NISQ compilation for distributed quantum
computing with Prof. Poulami Das. His current research focuses on logical
compilation for fault-tolerant neutral-atom systems.
