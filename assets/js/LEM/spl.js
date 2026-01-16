import { priorityFloodEpsilonBarnes2014 } from './priority_flood.js';
import { flowAccumulation, flowAccumulationWeighted } from './flowacc.js';
import { applyUplift } from './tectonic.js';
import { erodeStreamPowerImplicit } from './erosion.js';
import { RegularGrid } from './grid.js';

class SPLModel {
  constructor({ grid, neighbourer, m = 0.45, n = 1.1, dt = 1000, epsilon = 0 } = {}) {
    if (!grid || !neighbourer) {
      throw new Error('SPLModel requires a grid and neighbourer.');
    }
    this.grid = grid;
    this.neighbourer = neighbourer;
    this.m = m;
    this.n = n;
    this.dt = dt;
    this.epsilon = epsilon;

    this.K = new RegularGrid({
      xmin: grid.xmin,
      xmax: grid.xmax,
      ymin: grid.ymin,
      ymax: grid.ymax,
      nx: grid.nx,
      ny: grid.ny,
      dx: grid.dx,
      dy: grid.dy
    });
    this.U = new RegularGrid({
      xmin: grid.xmin,
      xmax: grid.xmax,
      ymin: grid.ymin,
      ymax: grid.ymax,
      nx: grid.nx,
      ny: grid.ny,
      dx: grid.dx,
      dy: grid.dy
    });
    this.A = new RegularGrid({
      xmin: grid.xmin,
      xmax: grid.xmax,
      ymin: grid.ymin,
      ymax: grid.ymax,
      nx: grid.nx,
      ny: grid.ny,
      dx: grid.dx,
      dy: grid.dy
    });

    this.precip = 1;
    this.erosion = new Float32Array(grid.Z.length);
  }

  setParams({ m, n, dt } = {}) {
    if (Number.isFinite(m)) this.m = m;
    if (Number.isFinite(n)) this.n = n;
    if (Number.isFinite(dt)) this.dt = dt;
  }

  setK(value) {
    this.K.Z.fill(value);
  }

  setUplift(value) {
    this.U.Z.fill(value);
  }

  setPrecip(value) {
    this.precip = value;
  }

  run({ iterations = 1, addToBaselevels = false } = {}) {
    for (let iter = 0; iter < iterations; iter += 1) {
      this.erosion.fill(0);
      const pf = priorityFloodEpsilonBarnes2014(this.grid, this.neighbourer, {
        topology: 'D8',
        epsilon: this.epsilon
      });

      if (this.precip !== 1) {
        const weights = new Float32Array(this.grid.Z.length);
        weights.fill(this.precip);
        const acc = flowAccumulationWeighted({
          stack: pf.stack,
          stackLength: pf.stackLength,
          receivers: pf.receivers,
          neighbourer: this.neighbourer,
          dx: this.grid.dx,
          dy: this.grid.dy,
          weights
        });
        this.A.Z.set(acc);
      } else {
        const acc = flowAccumulation({
          stack: pf.stack,
          stackLength: pf.stackLength,
          receivers: pf.receivers,
          neighbourer: this.neighbourer,
          dx: this.grid.dx,
          dy: this.grid.dy
        });
        this.A.Z.set(acc);
      }

      applyUplift({
        z: this.grid.Z,
        upliftRate: this.U.Z,
        neighbourer: this.neighbourer,
        dt: this.dt,
        addToBaselevels
      });

      erodeStreamPowerImplicit({
        erosion: this.erosion,
        z: this.grid.Z,
        stack: pf.stack,
        stackLength: pf.stackLength,
        A: this.A.Z,
        K: this.K.Z,
        receivers: pf.receivers,
        receiverDistance: pf.receiverDistance,
        neighbourer: this.neighbourer,
        dt: this.dt,
        m: this.m,
        n: this.n
      });
    }
  }
}

export { SPLModel };
