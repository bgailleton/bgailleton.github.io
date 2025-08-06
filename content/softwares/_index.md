---
title: "💻 Research Softwares"
description: "My research softwares"
# If you want to exclude from the menu, set the following to false
menu: 
  main:
    weight: 2
    identifier: "Softwares"
    url: "/softwares/"
---


<div class="main-paragraph" style="background-color: gray;">
    <p>I worked on multiple research softwares, either as lead developer or as collaborator.</p>
    <p>My `python` package, `scabbard` (+ its `c++` backend `DAGGER`), is a sandbox merging all my personal codes. Consider it my own personal playground - that include ongoing experiment or standalone code from my publications. </p>
    <p>`pyfastflow` is a geomorphologically-oriented (flow, flood, LEM, you name it) set of routine for cross-platform GPU processing. I am the main dev.</p>
    <p>Worked a lot on LSDTopotools and libtopotoolbox (WIP links and descriptions)</p>
</div>

<div class="cadre-paragraph" style="background-color: rgba(21, 255, 180, 0.4);">
  <h2 class="medium-header-monospace">pyfastflow</h2>
    <p style="display: inline; line-height: 1.6;">
      <span class="reg-monospace">pyfastflow</span> is the first GPU-oriented package for geomorphological analysis. Publications and doc incoming. Updates incoming in September 2025.
    </p>
</div>


<div class="cadre-paragraph" style="background-color: rgba(255, 180, 180, 0.4);">
  <h2 class="medium-header-monospace">scabbard</h2>
    <p style="display: inline; line-height: 1.6;">
      <span class="reg-monospace">scabbard</span> is my main <span class="reg-monospace">python</span> package. It contains most of geomorphology-oriented codes:
    </p>
    <ul class="custom-list">
      <li><span class="reg-monospace">graphflood</span>, efficient 2D hydrodynamic oriented for large scale studies (+ ongoing portage to GPUs)</li>
      <li>DEM loading and processing</li>
      <li>Topographic analysis routines</li>
      <li>Fluvial analysis routines</li>
      <li>Visualisations routines</li>
      <li>Landscape Evolution Models (CHONK and related)</li>
      <li>Backends in <span class="reg-monospace">numba, c++, taichi lang (GPU)</span> with standardised APIs to create new tools seamlessly</li>
    </ul>
    <p style="display: inline; line-height: 1.6;">
      <span class="reg-monospace">scabbard</span> documentation is available  <a href="/softwares/scabbard/">HERE</a>
    </p>
    <p>Consider it my personal playground for my experiment or for providing standalone implementation of my published algorithm. Production ready but poorly documented/evolving APIs. See `pyfastflow` for the well maintained library.</p>
    <p>Contact:  <a href="mailto:boris.gailleton@univ-rennes.fr">boris.gailleton@univ-rennes.fr</a> if any questions, or leave an issue on github.</p>
</div>


<div class="cadre-paragraph" style="background-color: rgba(150, 150, 255, 0.4);">
  <h2 class="medium-header-monospace">graphflood</h2>
    <p style="display: inline; line-height: 1.6;">
      <span class="reg-monospace">graphflood</span> is a novel method combining graph theory and Manning's equation to solve for the stationary Shallow Water Equation. The approximation is tailored for large scale analysis. Its CPU and GPU versions are part of <span class="reg-monospace">scabbard</span> package.
    </p><br>
    <p style="display: inline; line-height: 1.6;">
      <span class="reg-monospace">graphflood</span> documentation is available  <a href="/softwares/graphflood/">HERE</a>
    </p>
</div>


I am currently building that website, here you will find soon information about `LSDTopoTools`, `lsdtopytools`, `fastscape-litho`, `TVD_Condat`, ...  