+++
title = "CNES JC2 Poster"
subtitle = "Anticipating flood-induced morphological damage from high-resolution topography"
url = "/cnes-jc2-poster/"
aliases = ["/cnes-jc2-poster"]
math = false
layout = "cnes-poster"
+++

{{< download src="/files/cnes-jc2-poster.pdf" label="Download poster" detail="PDF · 4 MB" >}}

{{< cnes-block kind="intro" >}}
Anticipating **where floods erode and deposit sediment** is essential for assessing hazards and understanding landscape evolution.

Conventional flood models hit a **computational wall**: a simulation covering just **3 km² at metre resolution can take tens of hours**.

Our new method computes **400 km of the Waiau Toa / Clarence river valley in less than 5 hours**, across **12.52 billion terrain cells**, by combining out of core (OOC) terrain processing with GPU simulations of simplified flood dynamics at peak discharge.
{{< /cnes-block >}}

{{< video src="/videos/cnes-flood-simulation.mp4" poster="/videos/cnes-flood-simulation.jpg" label="Full flood simulation — three-minute terrain flyover" >}}

{{< cnes-block kind="methods" >}}
## Method references

- **Terrain processing:** [Barnes (2016)](https://doi.org/10.1016/j.cageo.2016.07.001 "Parallel Priority-Flood depression filling for trillion cell digital elevation models on desktops or clusters"), [Barnes, Lehman & Mulla (2014)](https://doi.org/10.1016/j.cageo.2013.01.009 "An efficient assignment of drainage direction over flat surfaces in raster digital elevation models") and [Barnes (2017)](https://doi.org/10.1016/j.envsoft.2017.02.022 "Parallel non-divergent flow accumulation for trillion cell digital elevation models on desktops or clusters") underpin tiled depression filling, flow directions and global flow accumulation for terrain too large to fit in memory.
- **Inertial flow:** [Bates, Horritt & Fewtrell (2010)](https://doi.org/10.1016/j.jhydrol.2010.03.027 "A simple inertial formulation of the shallow water equations for efficient two-dimensional flood inundation modelling"), [de Almeida et al. (2012)](https://doi.org/10.1029/2011WR011570 "Improving the stability of a simple formulation of the shallow water equations for 2-D flood modeling") and [Sridharan et al. (2020)](https://doi.org/10.1029/2020WR027357 "Explicit Expression of Weighting Factor for Improved Estimation of Numerical Flux in Local Inertial Models") provide the local inertial formulation and numerical refinements used here for efficient GPU simulations of peak-flow depth and shear stress.

{{< /cnes-block >}}

{{< cnes-block kind="code" >}}
**Code availability.** The code will be released as open source once stable. The current implementation builds on [pyfastflow](/research-softwares/pyfastflow/), [pytopotoolbox](/research-softwares/topotoolbox/) and [LSDTopoTools](/research-softwares/lsdtopotools/), combining GPU flow processing inspired by [FastFlow (Jain et al., 2024)](https://www-sop.inria.fr/reves/Basilic/2024/JKGFC24/ "FastFlow: GPU Acceleration of Flow and Depression Routing for Landscape Simulation — Inria GraphDeco") with [GraphFlood methods (Gailleton et al., 2024)](https://doi.org/10.5194/esurf-12-1295-2024) to accelerate convergence to a stationary solution in a hybrid local inertial solver.
{{< /cnes-block >}}

{{< cnes-block kind="next" >}}
## Next steps

I will use DEM time series derived from **Pléiades, Pléiades Neo and CO3D** to simulate floods for each observation date and track changes in channel width and shear stress. Integrating sediment fluxes will then allow me to test whether these patterns can explain the observed erosion and deposition—and whether the **initial topography alone** can anticipate their location and magnitude.
{{< /cnes-block >}}

{{< cnes-block kind="data" >}}
## Base data

The base DEM uses open LiDAR elevation data made available by [Toitū Te Whenua — Land Information New Zealand (LINZ)](https://www.linz.govt.nz/); thanks to LINZ and the contributing data providers for making these datasets accessible.

Browse and download the data through the [LINZ Data Service](https://data.linz.govt.nz/), or access the elevation catalogue and cloud data via the [LINZ elevation repository](https://github.com/linz/elevation).
{{< /cnes-block >}}
