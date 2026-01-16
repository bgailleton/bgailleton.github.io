const UINT32_MAX = 0xFFFFFFFF;

const erodeStreamPowerImplicit = ({
  erosion,
  z,
  stack,
  stackLength,
  receivers,
  receiverDistance,
  A,
  K,
  neighbourer,
  dt,
  m,
  n,
  tolerance = 1e-6,
  maxIterations = 50
}) => {
  const limit = stackLength > 0 ? stackLength : stack.length;
  for (let s = 0; s < limit; s += 1) {
    // console.info(`[SPL Doing node] ${s}`);
    const i = stack[s];
    if (neighbourer.isNoData(i)) {
      erosion[i] = 0;
      continue;
    }
    const r = receivers[i];
    if (r === i || r === UINT32_MAX || neighbourer.isNoData(r) || neighbourer.isCanOut(i)) {
      erosion[i] = 0;
      continue;
    }

    const d = receiverDistance[i];
    if (!d || d <= 0) {
      erosion[i] = 0;
      continue;
    }

    const area = A[i];
    const k = K[i];
    if (!Number.isFinite(area) || !Number.isFinite(k) || area <= 0 || k <= 0 || dt <= 0) {
      erosion[i] = 0;
      continue;
    }

    const factor = k * dt * Math.pow(area, m) / Math.pow(d, n);
    if (!Number.isFinite(factor) || factor <= 0) {
      erosion[i] = 0;
      continue;
    }
    const ielevation = z[i];
    const receiverElevation = z[r];
    if (!Number.isFinite(ielevation) || !Number.isFinite(receiverElevation)) {
      erosion[i] = 0;
      continue;
    }

    let elevationK = Math.max(ielevation, receiverElevation + 1e-3);
    let elevationPrev = ielevation + 50*tolerance;
    for (let it = 0; it < maxIterations; it += 1) {
      if (Math.abs(elevationK - elevationPrev) <= tolerance) break;
      elevationPrev = elevationK;
      const slope = elevationK - receiverElevation;
      if (slope <= 0) {
        elevationK = ielevation;
        break;
      }
      const diff = (elevationK - ielevation + factor * Math.pow(slope, n)) /
        (1 + factor * n * Math.pow(slope, n - 1));
      if (!Number.isFinite(diff)) {
        elevationK = ielevation;
        break;
      }
      elevationK -= diff;
    }
    if (!Number.isFinite(elevationK)) {
      elevationK = ielevation;
    }
    erosion[i] = ielevation - elevationK;
    z[i] = elevationK;
  }
};

export { erodeStreamPowerImplicit, UINT32_MAX };
