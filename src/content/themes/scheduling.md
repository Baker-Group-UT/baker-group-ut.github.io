---
title: Scheduling
tagline: Optimizing logical operations with the clock.
summary: >-
    Scheduling across error correction, logical memory, ion shuttling, atom
    movement, and classical control, with attention to latency and parallelism.
order: 30
maps_topics: []
maps_keywords:
    - schedul
    - timestitch
    - slack
    - time-sliced
    - time-efficient
    - runtime overhead
    - pipelin
    - migration
---

Fault-tolerant machines do not just need low-error operations. They need those
operations to arrive at the right time. Syndrome extraction, logical memory,
movement, feed-forward, and classical control all impose deadlines, and the
schedule determines how much of the machine is doing useful work.

Our recent papers approach scheduling from several hardware directions:
realtime scheduling for continuous-angle error-correction architectures,
movement-efficient execution for QCCD systems, and logical-memory schedules
for atom-array implementations of qLDPC codes. Across these settings, the
same question recurs: which operations must be serialized, which can be
parallelized, and what architectural overhead is introduced by the schedule
itself?

We treat scheduling as part of the architecture, not as a final clean-up pass.
The right schedule can reduce latency, expose parallelism, and make a code or
platform practical at a smaller scale.
