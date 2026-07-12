---
title: "Optimizing Logical Mappings for Quantum Low-Density Parity Check Codes"
authors:
  - Sayam Sethi
  - Sahil Khan
  - Maxwell Poster
  - Abhinav Anand
  - Jonathan M. Baker
venue: arXiv (Cornell University)
year: 2026
publication_date: "2026-03-17"
arxiv: https://arxiv.org/abs/2603.17167
doi: https://doi.org/10.48550/arXiv.2603.17167
openalex_id: W7138947233
order: 0
tags:
  - qldpc
  - logical-compilation
# Manually authored entry (no `synced: true`) so the sync script never
# touches it. Added because OpenAlex hadn't linked this preprint to any of
# the UT authors as of the April 2026 sync; once it does, the sync might
# produce a second copy under a synced-W*.md filename — that's fine, the
# publication-list pages dedupe by DOI.
people:
  - sayam-sethi
  - maxwell-poster
  - baker
topics:
  - Quantum Error Correction
  - Quantum Computing Algorithms and Architecture
  - Quantum Information and Cryptography
---

Studies the Gross code — a promising candidate for low-overhead fault-tolerant
architectures — and shows how the mapping from logical program to the Bicycle
ISA materially affects program failure rate. By compiling to Pauli-based
computation and optimizing the resulting Bicycle instruction sequence, the
paper reports an average ~4% reduction in program failure rate purely through
software, with the gap widening as hardware improves.
