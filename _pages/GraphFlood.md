---
layout: archive
title: "GraphFlood"
permalink: /Softwares/graphflood/
author_profile: true
redirect_from:
  - /graphflood/
---


# GraphFlood

My current research includes the development of `graphflood`, a set of numerical methods and tools to explore the relationship between landscape evolution and hydrodynamics. Large scale topographic analysis and long-term landscape evolution models approximate hydraulic fluxes with drainage area, neglecting the dynamic nature of rivers which vary their discharge, flow depth, width and extents along the floods. On the other hands, more sophisticated hydrodynamic models are designed and calibrated for engineering applications, requiring tedious meshing and long computation time not compatible with the temporal and spatial scale of landscape evolution studies. `graphfloods` aims to fill this gap by providing methods to efficiently calculate 2D hydrodynamics, a framework to include hydrodynamics into large-scale topographic analysis and ready the ground for long term coupling between hydrodynamics and morphodynamics.

## Roadmap

`graphflood` is still work in progress, but already shows up to two order of magnitude speed up compared to other shallow water approximations. I am still working on building that page, but long story short:

- Paper describing the hydrodynamics approximation currently being submitted
- Python/c++ code open-source (doc and tuto in progress)
- Binding with TopoToolBox (MATLAB) in progress
- Currently working on GPU-compatible algorithm and other optimisations (see my EGU 2024 poster)
- TEsting morphodynamics coupling

![alt text](/images/GF1.png)
*Example of Graphflood output*. 