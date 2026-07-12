---
title: "Moveless: Minimizing Overhead on QCCDs via Versatile Execution and Low Excess Shuttling"
authors:
  - Sahil Khan
  - S. Vittal
  - Kenneth R. Brown
  - Jonathan M. Baker
venue: arXiv (Cornell University)
year: 2025
publication_date: "2025-08-05"
arxiv: https://arxiv.org/abs/2508.03914
doi: https://doi.org/10.48550/arXiv.2508.03914
order: 0
tags:
  - qccd
  - error-correction-architecture
# Manually authored entry (no `synced: true`) so the sync script never
# touches it. Needed because OpenAlex hasn't linked this preprint to
# Sahil Khan's author profile (A5128128161) — likely because it's closed-
# access on the published version. When OpenAlex eventually attaches the
# authorships, the sync will produce a synced-W*.md alongside this file
# and the publications page will dedupe them by DOI.
people:
  - sahil-khan
  - baker
topics:
  - Quantum Computing Algorithms and Architecture
  - Quantum Information and Cryptography
---

Studies execution overhead on QCCD (quantum charge-coupled device) architectures and
proposes scheduling techniques that minimize ion shuttling cost by reusing in-place
operations wherever possible. The "moveless" core insight is that many routine
operations don't actually require an ion move — versatile execution can absorb them —
and that careful reasoning about which operations truly need shuttling reduces
overall program latency on near-term trapped-ion hardware.
