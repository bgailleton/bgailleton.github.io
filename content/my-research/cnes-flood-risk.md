+++
title = "CNES-Funded Flood Risk at Scale"
date = 2025-03-06
summary = "Continental pilot that fuses satellite SAR passes with reduced-order hydrodynamics to map risk bands within hours of acquisition."
tags = ["flood", "hydrology", "radar"]
weight = 5
+++

## Mission Brief

CNES asked us to prove that sparse satellite passes can still drive actionable flood forecasts. The prototype ingest stream stitches Sentinel-1, SWOT, and airborne SAR passes, harmonizes observation cadence, and injects the results into a custom GPU solver that estimates flood stages for 3,200 river reaches.

- **Acquisition cadence**: downlinks aggregated every 6 hours via the Toulouse ground segment.
- **Assimilation**: low-order ROM calibrated against LISFLOOD-FP and validated on the 2023 Loire event archive.
- **Delivery**: alert-ready depth rasters and basin risk curves pushed to a shared API endpoint.

## Toolchain

1. Orbit-aware scheduler that infers the next viable pass per tile.
2. Floodplain mesher that adapts cell size to vegetation masks.
3. CUDA kernel that keeps the model predictive under 30 minutes on an A100.
4. Post-processing scripts that publish NetCDF and vector cutlines for partners.

## Current Deliverables

| Status | Work Package | Owner |
| --- | --- | --- |
| ✅ | V1 ingestion/playback stack | Radar ops team |
| 🔄 | Multi-basin calibration sweep | Hydro modeling pod |
| ⏳ | Public download portal | Product + CNES legal |

Get in touch if you want to plug custom gage networks or if you maintain open flood archives we can benchmark against.
