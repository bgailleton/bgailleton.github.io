+++
title = "Hydrodynamics"
date = 2025-02-11
summary = "WebGL Lisflood sandbox for testing shallow-water responses straight in the browser."
tags = ["hydrology", "gpu", "prototype"]
weight = 10
aliases = ["/research-softwares/hydrodynamics/"]
+++

Solving the shallow water equations: stationary _vs_ transient modes. Exploring hydraulics at large scale require fast solvers... but not only, migrating from transient to stationary bypasses the physical time require to propagate hydrological changes, making it much more scalable (as long as temporal information is not important). Transient solver is from [Bates et al., 2010](https://www.sciencedirect.com/science/article/abs/pii/S0022169410001538) and the tranient from [graphflood](https://esurf.copernicus.org/articles/12/1295/2024/).

All the computation in happening on your device. Coded in WebGL1 (using simple version of your GPU from web browser) for lisflood, and vanilla javascript for graphflood. DEM is LiDAR-derived recasted to 5m res. 

{{< hydrodynamics-demo >}}
