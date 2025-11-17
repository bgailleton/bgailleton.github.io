+++
title = "Landscape Evolution Models"
date = 2025-01-12
summary = "Long-horizon experiments that keep FastScape, pyFastFlow, and their companions honest against observed reorganizations."
tags = ["landscape", "models", "calibration"]
weight = 35
+++

## Motivation

Landscape evolution codes have matured, but they rarely get calibrated with dense observations. This strand builds shared datasets, parametric studies, and reproducible workflows that close the loop between simulations and monitored basins.

## Work Packages

1. **Calibration vault**: curated DEMs, uplift histories, and precipitation fields for 18 basins (Alps, Andes, NZ Alps, etc.).
2. **Control experiments**: nightly GitHub Actions suite that exercises FastScape/pyFastFlow against the vault.
3. **Diagnostics**: consistent metrics—chi slope residuals, knickpoint migration rates, channel-hillslope coupling indices.
4. **Visualization**: Observable notebooks that render synthetic profiles next to observed ones for quick QA.

## Collaboration Notes

- Creating optional bindings so tectonicists can feed slip histories directly from PyGIMLi models.
- Planning a community sprint to build a "model zoo" where people can drop calibrated parameter sets.
- Need reviewers for the uncertainty quantification chapter before we submit to *ESSD*.
