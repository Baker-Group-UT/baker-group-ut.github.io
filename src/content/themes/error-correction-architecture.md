---
title: Code and hardware co-design
tagline: Codes, hardware, and control constraints considered together.
summary: >-
  Matching codes to platforms, including neutral atoms, QCCDs, surface-code
  variants, and qLDPC codes evaluated against realistic hardware constraints.
order: 10
maps_topics: []
maps_keywords:
  - error correct
  - error-correct
  - fault-toleran
  - fault toleran
  - qldpc
  - low-density parity
  - bicycle code
  - surface code
  - logical qubit
  - iceberg
  - atom loss
  - qccd
---

An error-correcting code is also an architectural commitment. It determines
the connectivity a platform must provide, the measurements that must be
scheduled, the movement or routing overheads that appear, and the kind of
compiler that can target the machine effectively.

The group studies these commitments quantitatively. Recent work examines
neutral-atom systems in the early fault-tolerant regime, generalized-bicycle
codes and qLDPC memory in atom arrays, QCCD architectural codesigns for
fault-tolerant memory, and logical-qubit layouts that trade locality,
parallelism, and overhead. We are interested in which of a code's asymptotic
advantages hold up under realistic hardware constraints.

This line of work sits between theory and implementation. We take code
properties seriously, but the final question is architectural: what machine
would have to be built, and what programs would it run well?
