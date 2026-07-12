---
title: Logical compilation
tagline: Code-aware compilation for logical qubits.
summary: >-
    Compilation and mapping methods for fault-tolerant programs, including
    qLDPC instructions, Pauli-based computation, and
    hardware-aware logical layouts.
order: 20
maps_topics: []
maps_keywords:
    # Title keywords are the main driver here — OpenAlex buckets ~every paper
    # under a generic architecture topic, so we match on compiler-specific
    # verbs instead.
    - compil
    - decompos
    - synthes
    - circuit partition
    - breaking abstractions
    - basis gates
    - subroutine
    - qubit mapping
    - logical mapping
---

Logical compilation is where an algorithm meets the constraints of an
error-correcting code. The compilation target is no longer a set of physical
gates but a collection of logical instructions with their own geometry,
timing, resource requirements, and failure modes.

Recent work in the group studies mappings for quantum LDPC codes, including
how Pauli-based computation can be optimized for the Bicycle ISA, and how
multi-qubit Iceberg patches change the structure of logical compilation. We
care about software choices that have measurable architectural consequences:
program failure rate, logical memory layout, communication overhead, and the
amount of parallelism a machine can expose.

This work is often closest to classical compiler research, but the cost model
is set by quantum error correction. A good mapping is one that respects the
code, the hardware, and the schedule at the same time.
