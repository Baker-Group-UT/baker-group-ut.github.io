---
title: Benchmarks and evaluation
tagline: Making architectural claims checkable.
summary: >-
  Evaluation methods, workloads, and artifacts for comparing quantum
  architectures under clear assumptions.
order: 50
maps_topics: []
maps_keywords:
  - fingerprinting
  - benchmark
  - evaluat
  - measurement error
  - error mitigation
  - canary
  - bootstrap
  - fidelity
---

Quantum-architecture papers often depend on many modeling choices: workload,
noise assumptions, movement costs, decoder latency, calibration policy, and
the level of abstraction at which the machine is evaluated. Those choices
need to be visible before results can be compared.

Our work uses evaluation as a research tool. We build models and benchmarks
that make architectural trade-offs explicit, whether the question is neutral-
atom movement, QCCD shuttling, qLDPC memory, logical mapping, or drift-aware
operation. The goal is to make it clear which conclusions follow from a
platform constraint and which follow from an assumption in the model.

We aim to publish evaluations, workloads, and artifacts complete enough that
other groups can reproduce our results, challenge our assumptions, and build
on both.
