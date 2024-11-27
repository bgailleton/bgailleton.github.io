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
    <p>As of 2024, I am merging my geomorphology-related ones into a single main `python` package, `scabbard`, streamlining the installation process and homogeneising the use.</p>
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