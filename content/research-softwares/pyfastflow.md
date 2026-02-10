+++
title = "pyfastflow"
date = 2025-02-07
summary = "First GPU-powered geomorphology toolbox"
tags = ["python", "hydrology"]
weight = 30
+++

## `pyfastflow` in brief

[`pyfastflow`](https://github.com/TopoToolbox/pyfastflow) is a GPU toolbox for hydrodynamics and geomorphological applications.

Currently in _alpha_ I am preparing a JOSS paper with all the details (coming soon?). Long story short:

- Provides GPU flow accumulation via tree contraction methods
- Reroute local minimas following Jain et al. (2024) [paper](https://www-sop.inria.fr/reves/Basilic/2024/JKGFC24/FastFlowPG2024_Author_Version.pdf)
- Some LEM routines, general filtering or resampling
- periodic, normal, or nodata boundary condition management and helpers for stencil operations (i.e. can be used as a toolbox to create your own GPU geomorphic routines)
- flood modelling: GPU version of Bates et al., 2010 (Lisflood) and GraphFlood [(Gailleton et al., 2024)](https://esurf.copernicus.org/articles/12/1295/2024/)


## Documentations, Example, ...

Proper documentation will come with the publications associated with the software, so far, see examples (may evolved until stable version) [here](https://github.com/TopoToolbox/pyfastflow/tree/main/examples)