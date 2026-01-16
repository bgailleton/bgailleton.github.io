class RegularGrid {
  constructor({ xmin, xmax, ymin, ymax, extent, nx, ny, dx, dy, z, noData = NaN } = {}) {
    if (Array.isArray(extent) && extent.length === 4) {
      [xmin, xmax, ymin, ymax] = extent;
    }
    this.xmin = Number.isFinite(xmin) ? xmin : 0;
    this.xmax = Number.isFinite(xmax) ? xmax : this.xmin + (Number.isFinite(dx) ? dx * (nx ?? 0) : 0);
    this.ymin = Number.isFinite(ymin) ? ymin : 0;
    this.ymax = Number.isFinite(ymax) ? ymax : this.ymin + (Number.isFinite(dy) ? dy * (ny ?? 0) : 0);

    this.nx = Number.isFinite(nx) ? nx : 0; // nrows
    this.ny = Number.isFinite(ny) ? ny : 0; // ncols
    this.nrows = this.nx;
    this.ncols = this.ny;

    this.dx = Number.isFinite(dx) ? dx : (this.nx > 1 ? (this.xmax - this.xmin) / (this.nx - 1) : 1);
    this.dy = Number.isFinite(dy) ? dy : (this.ny > 1 ? (this.ymax - this.ymin) / (this.ny - 1) : 1);

    this.noData = noData;

    if (z instanceof Float32Array && z.length === this.nx * this.ny) {
      this.Z = z;
    } else if (Array.isArray(z) && z.length === this.nx * this.ny) {
      this.Z = Float32Array.from(z);
    } else {
      this.Z = new Float32Array(this.nx * this.ny);
    }
  }

  static create({ xmin, xmax, ymin, ymax, extent, nx, ny, dx, dy, noData = NaN } = {}) {
    return new RegularGrid({ xmin, xmax, ymin, ymax, extent, nx, ny, dx, dy, noData });
  }

  index(row, col) {
    return row * this.ny + col;
  }

  fillConstant(value = 0) {
    this.Z.fill(value);
    return this;
  }

  fillRandom({ min = 0, max = 1, seed = null } = {}) {
    const rng = seed === null ? Math.random : this._mulberry32(seed);
    const range = max - min;
    for (let i = 0; i < this.Z.length; i += 1) {
      this.Z[i] = min + range * rng();
    }
    return this;
  }

  fillPerlin({
    scale = 1,
    octaves = 4,
    persistence = 0.5,
    lacunarity = 2,
    seed = 0,
    offsetX = 0,
    offsetY = 0
  } = {}) {
    const perlin = this._createPerlin(seed);
    const invScale = scale > 0 ? 1 / scale : 1;
    let i = 0;

    for (let row = 0; row < this.nx; row += 1) {
      for (let col = 0; col < this.ny; col += 1) {
        let amplitude = 1;
        let frequency = 1;
        let noiseHeight = 0;
        let maxAmplitude = 0;

        for (let o = 0; o < octaves; o += 1) {
          const sampleX = ((col + 0.5) * this.dx + offsetX) * invScale * frequency;
          const sampleY = ((row + 0.5) * this.dy + offsetY) * invScale * frequency;
          const value = perlin(sampleX, sampleY) * 2 - 1;
          noiseHeight += value * amplitude;
          maxAmplitude += amplitude;
          amplitude *= persistence;
          frequency *= lacunarity;
        }

        this.Z[i] = maxAmplitude > 0 ? noiseHeight / maxAmplitude : noiseHeight;
        i += 1;
      }
    }
    return this;
  }

  _mulberry32(seed) {
    let t = seed >>> 0;
    return () => {
      t += 0x6D2B79F5;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  _createPerlin(seed) {
    const rng = this._mulberry32(seed);
    const perm = new Uint8Array(512);
    for (let i = 0; i < 256; i += 1) perm[i] = i;
    for (let i = 255; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = perm[i];
      perm[i] = perm[j];
      perm[j] = tmp;
    }
    for (let i = 0; i < 256; i += 1) perm[256 + i] = perm[i];

    const grad = (hash, x, y) => {
      switch (hash & 3) {
        case 0: return x + y;
        case 1: return -x + y;
        case 2: return x - y;
        default: return -x - y;
      }
    };

    const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);

    return (x, y) => {
      const xi = Math.floor(x) & 255;
      const yi = Math.floor(y) & 255;
      const xf = x - Math.floor(x);
      const yf = y - Math.floor(y);
      const u = fade(xf);
      const v = fade(yf);

      const aa = perm[xi + perm[yi]];
      const ab = perm[xi + perm[yi + 1]];
      const ba = perm[xi + 1 + perm[yi]];
      const bb = perm[xi + 1 + perm[yi + 1]];

      const x1 = this._lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u);
      const x2 = this._lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u);
      return this._lerp(x1, x2, v) * 0.5 + 0.5;
    };
  }

  _lerp(a, b, t) {
    return a + (b - a) * t;
  }
}

export { RegularGrid };
