"""Pack the hydrodynamics DEM into a browser-readable 16-bit height PNG.

The red and green channels hold the high and low bytes of each height sample.
Run from the repository root with: python3 scripts/build_hero_height.py
"""

from pathlib import Path

import numpy as np
import rasterio
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets/images/hydrodynamics-dem.tif"
OUTPUT = ROOT / "assets/images/hero-terrain-height.png"

with rasterio.open(SOURCE) as dataset:
    elevations = dataset.read(1)

minimum = float(np.nanmin(elevations))
maximum = float(np.nanmax(elevations))
heights = np.rint((elevations - minimum) / (maximum - minimum) * 65535).astype(np.uint16)

packed = np.zeros((*heights.shape, 3), dtype=np.uint8)
packed[:, :, 0] = heights >> 8
packed[:, :, 1] = heights & 255
Image.fromarray(packed, mode="RGB").save(OUTPUT, optimize=True)

print(f"{OUTPUT}: {heights.shape[1]}×{heights.shape[0]}, {OUTPUT.stat().st_size} bytes")
