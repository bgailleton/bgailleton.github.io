+++
title = "Swath Tools Quickstart"
date = 2026-02-20
summary = "Three compact scripts for transverse/longitudinal swaths in Taiwan, river longitudinal swaths, and windowed longitudinal swaths."
tags = ["topotoolbox", "swath-profile", "python", "quickstart"]
weight = 10
+++

Use this page when you want swath results fast and do not need the full notebook narrative.

Install once:

`pip install topotoolbox matplotlib numpy`

---

## Quickstart 1: Taiwan transverse + longitudinal swath

```python
import topotoolbox as ttb
import matplotlib.pyplot as plt
import numpy as np

# 1) DEM + a simple baseline from two reference points (coordinates).
dem = ttb.load_dem("taiwan")
ref_x = [300000, 220000]
ref_y = [2770000, 2630000]
sampled_x, sampled_y = ttb.sample_points_between_refs(
    dem, ref_x, ref_y, input_mode="coordinates"
)

# 2) Signed swath-distance map (core object for standard swaths).
half_width = 20_000  # m
distance_map = ttb.compute_swath_distance_map(
    dem, sampled_x, sampled_y, half_width=half_width, input_mode="coordinates"
)

# 3) Transverse swath: bins by distance from baseline.
t_swath = ttb.transverse_swath(
    dem, distance_map, half_width, bin_resolution=500,
    percentiles=[5, 10, 20, 80, 90, 95]
)

# 4) Longitudinal swath: bins by along-track distance.
l_swath = ttb.longitudinal_swath(
    dem, sampled_x, sampled_y, distance_map, half_width,
    binning_distance=1000, n_points_regression=10,
    percentiles=[5, 10, 20, 80, 90, 95], input_mode="coordinates"
)

# 5) Minimal plots.
fig, ax = plt.subplots(1, 2, figsize=(11, 4))
ax[0].fill_between(t_swath.distances, t_swath.q1, t_swath.q3, alpha=0.35, lw=0)
ax[0].plot(t_swath.distances, t_swath.medians, lw=2)
ax[0].set_title("Transverse swath")
ax[0].set_xlabel("Distance from profile (m)")
ax[0].set_ylabel("Elevation (m)")
ax[0].grid(ls="--", alpha=0.4)

ax[1].fill_between(
    l_swath.along_track_distances, l_swath.q1, l_swath.q3, alpha=0.35, lw=0
)
ax[1].plot(l_swath.along_track_distances, l_swath.medians, lw=2)
ax[1].set_title("Longitudinal swath")
ax[1].set_xlabel("Distance along profile (m)")
ax[1].set_ylabel("Elevation (m)")
ax[1].grid(ls="--", alpha=0.4)
plt.tight_layout()
plt.show()
```

---

## Quickstart 2: Longitudinal river swath

```python
import topotoolbox as ttb
import matplotlib.pyplot as plt

# 1) Build a trunk river baseline from flow/stream objects.
dem = ttb.load_dem("bigtujunga")
flow = ttb.FlowObject(dem)
stream = ttb.StreamObject(flow, units="pixels", threshold=100)
stream = stream.klargestconncomps().trunk()
xriv, yriv = ttb.transform_coords(
    dem, stream.source_indices[0], stream.source_indices[1],
    input_mode="indices2D", output_mode="coordinates"
)

# 2) Distance map around river baseline + longitudinal swath.
half_width = 2500  # m
distance_map = ttb.compute_swath_distance_map(
    dem, xriv, yriv, half_width=half_width, input_mode="coordinates"
)
l_swath = ttb.longitudinal_swath(
    dem, xriv, yriv, distance_map, half_width,
    binning_distance=1000, n_points_regression=20,
    percentiles=[5, 10, 20, 80, 90, 95], input_mode="coordinates"
)

# 3) Plot.
fig, ax = plt.subplots(figsize=(7, 4))
ax.fill_between(
    l_swath.along_track_distances, l_swath.percentiles[10], l_swath.percentiles[90],
    alpha=0.25, lw=0
)
ax.plot(l_swath.along_track_distances, l_swath.medians, lw=2, color="k")
ax.set_xlabel("Distance along profile (m)")
ax.set_ylabel("Elevation (m)")
ax.set_title("River longitudinal swath")
ax.grid(ls="--", alpha=0.4)
plt.tight_layout()
plt.show()
```

---

## Quickstart 3: Longitudinal window swath (robust when bends are undersampled)

```python
import topotoolbox as ttb
import matplotlib.pyplot as plt

# 1) Same river baseline setup as quickstart 2.
dem = ttb.load_dem("bigtujunga")
flow = ttb.FlowObject(dem)
stream = ttb.StreamObject(flow, units="pixels", threshold=100)
stream = stream.klargestconncomps().trunk()
xriv, yriv = ttb.transform_coords(
    dem, stream.source_indices[0], stream.source_indices[1],
    input_mode="indices2D", output_mode="coordinates"
)

# 2) Optional center-line cleanup (recommended for very sinuous tracks).
Dmap = ttb.compute_swath_distance_map(
    dem, xriv, yriv, half_width=2500, input_mode="coordinates",
    return_centre_line=True
)
cx, cy = Dmap.centre_line_x, Dmap.centre_line_y

# 3) Windowed longitudinal swath: no distance_map argument needed.
half_width = 2500
binning_distance = 1000
l_swath_w = ttb.longitudinal_swath_windowed(
    dem, cx, cy, half_width,
    binning_distance=binning_distance, n_points_regression=10,
    percentiles=[5, 10, 20, 80, 90, 95], input_mode="coordinates"
)

# 4) Plot.
fig, ax = plt.subplots(figsize=(7, 4))
ax.fill_between(
    l_swath_w.along_track_distances, l_swath_w.q1, l_swath_w.q3, alpha=0.35, lw=0
)
ax.plot(l_swath_w.along_track_distances, l_swath_w.medians, lw=2, color="k")
ax.set_xlabel("Distance along profile (m)")
ax.set_ylabel("Elevation (m)")
ax.set_title("Windowed longitudinal swath")
ax.grid(ls="--", alpha=0.4)
plt.tight_layout()
plt.show()
```

---

Need the full explanation, caveats, and diagnostic plots? See:

- [Generalised Swath Profile Tutorial](/blog/2026/generalised-swath-profile-tutorial/)
