+++
title = "Large-Scale Hydro-Morphodynamics"
date = 2025-01-28
summary = "GPU-native solvers for water routing, sediment feedbacks, and floodplain reorganization from reach to orogen scale."
tags = ["hydrodynamics", "gpu", "modeling"]
weight = 25
+++

## Scope

The project rewrites legacy solvers so we can experiment across 10,000+ square kilometer domains without waiting a week. The codebase leans on PyTorch tensors for automatic differentiation, FastScape kernels for detachment-limited terms, and a custom multi-GPU domain decomposition layer for routing.

- **Resolution**: dynamic mesh refinement at bends and hydraulic controls.
- **Physics**: handles bank erosion, lateral accretion, and suspended load budgets.
- **Outputs**: delta progradation metrics, levee overtopping flags, and channel migration heatmaps.

## Benchmarks

| Scenario | Runtime (4×A100) | Notes |
| --- | --- | --- |
| Idealized braidplain | 32 min | Validated against Delft3D reference run |
| Magdalena River floodplain | 1 h 14 min | Coupled with remote-sensed scar mapping |
| Himalayan orogen test | 2 h 05 min | Stress test for orographic precipitation inputs |

## Integration Hooks

- NetCDF + Zarr exports for assimilation with LIS and Deltares pipelines.
- Optional Rust bindings for embedding into command-line decision tools.
- In-progress coupling with a carbon flux module contributed by the ecohydrology group.
