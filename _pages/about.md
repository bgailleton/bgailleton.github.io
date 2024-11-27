---
permalink: /
title: "About me"
excerpt: "About me"
author_profile: true
redirect_from: 
  - /about/
  - /about.html
---

<!-- **Coming from my [EGU Presentation](https://meetingorganizer.copernicus.org/EGU22/EGU22-3594.html)? [Click here](https://bgailleton.github.io/chonk/) for details about CHONK LEM** -->


I am a postdoctoral researcher at the [Géosciences Rennes](https://geosciences.univ-rennes.fr/demode-defis-de-modelisation) (Université de Rennes). I am a geomorphologist working on numerical analysis of landscapes in order to understand the relationship between landforms, surface processes and the different climatic and tectonic forcings controlling them. 

![alt text](/images/ksn_carp.jpg)
*Statistical representation of channel steepness, long story short, brighter colours can be linked to either higher erosion (and surface uplift) or higher rock strength. See Gailleton et al., 2021*. 

Focusing mainly on fluvial geomorphology, I developed and applied numerical methods (within the [LSDTopoTools framework](https://lsdtopotools.github.io/)) to extract fluvial network and its characteristics and link them to tectonic forcing in heterogeneous landscapes (e.g. Himalayas, Carpathians). I am also interested in simulating the evolution of such landscapes where multiple processes coexist and I developed a number of numerical method designed to embrace these heterogeneities. `CHONK` (_Gailleton et al., 2024_) for example is designed to simulate and monitor the evolution of water and sediment fluxes affected by multiple processes (e.g. different rock types, erosion laws) and traversing different domains (e.g. lake, multiple flow, single flow).

![alt text](/files/CHONK_figure_tracking.jpg)
*Detailed tracking of the provenance of sediments coming the granitoids, including recycled* 

My PhD at the University of Edinburgh and my first postdoc at the GFZ Potsdam targetted long-term processes ($>10^5 yrs$) at every scales (reach to mountain ranges). I am now working on bridging the gap between these long term change in forcings (e.g. change of surface uplift, base level fall following global temperature cooling) and short-term more extreme events (e.g. series of landslides following an earthquake, high flood) often overlooked. From the fluvial point of view, it starts with the development of `graphflood` to depart from the representation of river as 1D flow path tightly toward a more realistic representation including fields of discharge and flow depth. The challenges lie in numerical efficiency, as existing models (e.g. Delft 3D, Telemac, Floodos, Lisflood) are too complex to target and project the impact of short-term processes into large time and spatial scales.


![alt text](/images/GF1.png)
*Example of Graphflood output*. 

<!-- Feel free to have a look on my [Research Projects]https://bgailleton.github.io/Research/) for details! -->

<!-- # Research Softwares

Here is a very brief summary of my ongoing, mature and/or side software projects. Feel free to contact me if any of those is interesting for you, the amount of work I put in each is dependent on my ongoing projects!


## Numerical Modelling

- `CHONK`: a directed cellular-automata frameworks for landscapes evolution. Mixing existing methods with cellular automata brings a whole new world of technical possibilities from solving lakes to tracking or exploring dynamic feedbacks while remining quite instinctive. This frameworks intends to be flexible, modular and fast. A first publication explaining the principle and demonstrating its advantages is getting ready while a full-fledged `c++/python` framework is WIP.

- Other more minor contributions to `fastscape` or `MuddPILE`.

## Topographic Analysis

- [LSDTopoTools](https://lsdtopotools.github.io): I actively worked on the core development of LSDTopoTools, a c++ framework to process topographic analysis for which I developped a lot of tools around the use of Chi coordinate, channel steepness, concavity index, watershed identification or other general-purpose geomorphic algorithm.

- `lsdtopytools`: a python binding of LSDTopoTools bringing a number of its algorithms to interactive python using `xtensor`. I distribute it via a cross-platform `conda` package, hosted by `conda-forge`, to make it easy to use. I will write a small tutorial with explanations on this website in a bit. In the meantime, please check [this repo](https://github.com/LSDtopotools/lsdtt_notebooks/tree/master/lsdtopytools) for instructions and examples.

- A lightweight `python` and web portage of some of these tools via the compilation of a common `c++` core with `pybind11` and `webassembly`. Contact me if interested: I have already a core of function ready to be used, but this is a side project. See [this example page (might be buggy with small screens)](https://bgailleton.github.io/three_test/) for a sneak pic of what it can do.
 -->


**Feel free to contact me: boris.gailleton@univ-rennes.fr**