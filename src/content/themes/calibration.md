---
title: Calibration and decoding
tagline: Keeping error correction running on a drifting machine.
summary: >-
  Drift detection, in-situ recalibration, and decoder co-design for machines
  that must keep error correction running while device behavior changes.
order: 40
maps_topics: []
maps_keywords:
  - calibra
  - recalibra
  - drift
  - optimal control
  - pulse
  - noise landscape
  - noise-adaptive
  - decod
  - syndrome
---

Calibration becomes a systems problem once error correction is running
continuously. Device parameters drift, errors become nonuniform, and stopping
the machine to retune everything is not a realistic operating model for a
large fault-tolerant computer.

Our work studies how a machine can detect transient drift and recalibrate
in place while preserving the structure of the error-correction cycle. This
includes deciding when a local change is large enough to act on, how to route
around or repair affected regions, and how much architectural slack is needed
to make recalibration compatible with logical operation.

Decoding faces the same runtime pressure. A decoder turns syndrome
measurements into recovery decisions, and that loop competes with the timing
constraints of the rest of the control system. We study decoder behavior
under realistic assumptions: structured noise, drift, limited classical
latency, and the hardware costs of running the decoder close to the device.
Earlier work in this area includes decoding that does better than worst-case
assumptions; current questions connect decoding to scheduling, recalibration,
and code choice.

Rather than treating calibration and decoding as maintenance layers that
assume the computer is idle, we design them as parts of the fault-tolerant
architecture that can be reasoned about together.
