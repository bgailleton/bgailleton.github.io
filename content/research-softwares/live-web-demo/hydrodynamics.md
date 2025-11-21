+++
title = "Hydrodynamics"
date = 2025-02-11
summary = "WebGL Lisflood sandbox for testing shallow-water responses straight in the browser."
tags = ["hydrology", "gpu", "prototype"]
weight = 10
aliases = ["/research-softwares/hydrodynamics/"]
+++

Hydrodynamics is the WebGL1 port of my Lisflood-style solver. It keeps the stencil math honest inside a shader while I experiment with boundary conditions and timesteps before promoting changes to heavier codes. This panel now sits inside the Live Web Demo hub so future WebGL experiments can live alongside it.

{{< hydrodynamics-demo >}}

The current setup loads the `dem.png` surface (10 m cells), integrates with `dt = 1e-2 s`, and exposes the inflow curtain along rows 180-186 so I can pulse floods directly in the browser. Cranking up the slider is a quick gut-check on how much head the basin can take before rolling a bore downstream.
