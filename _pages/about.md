---
permalink: /
title: "About me"
excerpt: "About me"
author_profile: true
redirect_from: 
  - /about/
  - /about.html
---

I am a postdoctoral researcher at the GFZ institute, in the [Earth Surface Process Modelling section](https://www.gfz-potsdam.de/en/staff/boris-gailleton/). My main research focus is on developing methods, algorithms and research software packages to deal with digital topography, _i.e._ either to process existing analysis with topographic analysis, or to simulate topography with landscape evolution models. 

<!-- Feel free to have a look on my [Research Projects]https://bgailleton.github.io/Research/) for details! -->

# Research Softwares

Here is a very brief summary of my ongoing, mature and/or side software projects. Feel free to contact me if any of those is interesting for you, the amount of work I put in each is dependent on my ongoing projects!

## Topographic Analysis

- [LSDTopoTools](https://lsdtopotools.github.io): I actively worked on the core development of LSDTopoTools, a c++ framework to process topographic analysis for which I developped a lot of tools around the use of Chi coordinate, channel steepness, concavity index, watershed identification or other general-purpose geomorphic algorithm.

- `lsdtopytools`: a python binding of LSDTopoTools bringing a number of its algorithms to interactive python using `xtensor`. I distribute it via a cross-platform `conda` package, hosted by `conda-forge`, to make it easy to use. I will write a small tutorial with explanations on this website in a bit. In the meantime, please check [this repo](https://github.com/LSDtopotools/lsdtt_notebooks/tree/master/lsdtopytools) for instructions and examples.

- A lightweight `python` and web portage of some of these tools via the compilation of a common `c++` core with `pybind11` and `webassembly`. Contact me if interested: I have already a core of function ready to be used, but this is a side project. See [this example page](https://bgailleton.github.io/three_test/) for a sneak pic of what it can do.

## Numerical Modelling

- `CHONK`: a directed cellular-automata frameworks for landscapes evolution. Mixing existing methods with cellular automata brings a whole new world of technical possibilities from solving lakes to tracking or exploring dynamic feedbacks while remining quite instinctive. This frameworks intends to be flexible, modular and fast. A first publication explaining the principle and demonstrating its advantages is getting ready while a full-fledged `c++/python` framework is WIP.

- Other more minor contributions to `fastscape` or `MuddPILE`.

**Feel free to contact me: boris.gailleton@gfz-potsdam.de**