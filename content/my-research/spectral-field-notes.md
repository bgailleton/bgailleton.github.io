+++
title = "Spectral Field Notes"
date = 2025-02-15
summary = "An evolving wiki of experiments that test multi-spectral classifiers in noisy outdoor environments."
tags = ["field-notes", "sensing"]
weight = 10
+++

## Objectives

1. Stress-test lightweight classifiers on commodity hardware.
2. Record calibration pitfalls that appear in fast-deployed rigs.
3. Publish quick wins and regressions as data stories, not just plots.

## Snapshot

- Latest dataset: `spectral_walk_45` (_48GB, 6 modalities_).
- Leading metric: **82.4% macro F1** on the shaded canopy benchmark.
- Blocking issue: label drift between dusk/dawn segments.

## Next Steps

- Prototype an inline annotator for segment disagreements.
- Compare the current heuristic filter with a transformer-based denoiser.
- Share an open notebook for collaborators to leave inline comments.
