---
title: "scabbard"
description: "An intro about scabbard"
aliases:
  - "/softwares/scabbard/"
hidden: true
---


## `scabbard`: Hydrodynamics, Topographic Analysis, and Landscape Evolution Modeling
---

`scabbard` is a powerful software tool for manipulating topographic data, designed for geomorphological and large-scale hydraulic applications. [View Source on GitHub](https://github.com/bgailleton/scabbard)

It integrates tools and methodologies from `libtopotoolbox`, `fastscapelib`, and `LSDTopoTools` (either directly or reimplemented) while providing its own high-performance processing engines using:
- **C++** for core computational tasks,
- **Numba** (a Just-In-Time compiler for Python targeting CPUs),
- **Taichi Lang** (a JIT compiler targeting GPUs).

---

## Installation
Installing `scabbard` is quick and straightforward, thanks to GitHub CI automation. In your Python environment, simply run:

```bash
pip install pyscabbard
```

This will automatically install the main dependencies, including:
- `pytopotoolbox`,
- `numpy`,
- `matplotlib`,
- `fastscapelib`,
- `taichi`,
- and a precompiled version of `DAGGER`, the core C++ engine.

---

## Getting Started
As of November 2024, `scabbard` is under active development, with continuous updates to its documentation, tutorials, examples, and API references. The software has become my primary tool in 2024, and significant efforts have been made to unify and streamline its interface to simplify development for both myself and others.

### Key Resources:
- **`graphflood`:** Documentation is available [here](/softwares/graphflood/).
- **API Reference:** Currently a work-in-progress; likely to be generated using `sphinx`.
- **Example Scripts:** Check out [this repository](#) for example scripts. More are being added regularly.

---

## Why `scabbard`?
The ultimate goal of `scabbard` is to address scientific questions to understand the complex multi-scale interactions between rivers, landscapes and climatic and tectonic forcings by providing an efficient and cohesive suite of tools for researchers, and for myself also, to be honest. 

## Roadmap

What am I developping next? It really depends on my ongoing research projects and collaborations. Feel free to reach out to express a need and we shall see what we can do.

Ongoing work on:

- Keep on unifying a `graphflood` interface
- Adding visualisations routines
- Refactoring the river network extraction
- Link/implement CHONK


## Contact

<div>
    <p>Any question? Want to collaborate or even develop `scabbard`?<br>Boris Gailleton:  <a href="mailto:boris.gailleton@univ-rennes.fr">boris.gailleton@univ-rennes.fr</a></p>
</div>