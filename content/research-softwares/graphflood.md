+++
title = "GraphFlood"
date = 2025-02-07
summary = "Graph-based 2D flood approximator I co-developed for fast, large-scale compatible hydrodynamics."
tags = ["flood", "modeling"]
weight = 40
[[panels]]
title = "Reference paper"
summary = "CPU implementation published (GPU in prep) with formulations and benchmarks."
link = "https://esurf.copernicus.org/articles/12/1295/2024/"

[[panels]]
title = "CPU tutorial"
summary = "pytopotoolbox walkthrough of the stationary solver for basin-scale runs."
link = "/research-softwares/graphflood/cpu-tutorial/"

[[panels]]
title = "GPU tutorial"
summary = "pyfastflow version for larger grids, with examples on staging and profiling."
link = "/research-softwares/graphflood/gpu-tutorial/"

[[panels]]
title = "Legacy implementation"
summary = "Original code used in the paper; kept for provenance only."
link = "https://github.com/bgailleton/scabbard/tree/main"
+++

`graphflood` is not a research software in itself, but an efficient numerical scheme + algorithm to approximate the stationary shallow water equations based on 2D Manning-Strickler.

## Ressources to use/understand graphflood
