+++
title = "TopoToolbox"
date = 2025-02-07
summary = "EU-wide consortium for topographic analysis, morphometry, and landscape evolution in C/Python/R/QGIS/MATLAB."
tags = ["dem", "morphometry", "python"]
weight = 20
+++

TopoToolbox is one of the most used geomorphology toolboxes in academia. Since 2024, Wolfgang Schwanghart has been consolidating the ecosystem into the [TopoToolbox organization](https://github.com/TopoToolbox), moving from a MATLAB-centric stack toward a shared core engine: [`libtopotoolbox`](https://github.com/TopoToolbox/libtopotoolbox), with frontends in [`pytopotoolbox`](https://github.com/TopoToolbox/pytopotoolbox), R, QGIS, and MATLAB.

I contribute numerical methods and workflows to `lib/pytopotoolbox`, with emphasis on practical terrain-analysis workflows.

## Install

Python install is straightforward:

`pip install topotoolbox`

Then:

`import topotoolbox as ttb`


## Quickstarts

Quickstarts are compact, heavily-commented scripts designed for fast onboarding.

- [Swath Tools Quickstart](/research-softwares/topotoolbox/quickstart/swath-tools/)


## Resources

- Full swath tutorial (notebook-style): [Generalised Swath Profile Tutorial](/blog/2026/generalised-swath-profile-tutorial/)

