const UINT32_MAX = 0xFFFFFFFF;

const flowAccumulation = ({ stack, stackLength, receivers, neighbourer, dx, dy }) => {
  const total = stack.length;
  const area = new Float32Array(total);
  const cellArea = dx * dy;

  for (let i = 0; i < total; i += 1) {
    if (neighbourer.isNoData(i)) {
      area[i] = 0;
    } else {
      area[i] = cellArea;
    }
  }

  const limit = stackLength > 0 ? stackLength : stack.length;
  for (let s = limit - 1; s >= 0; s -= 1) {
    const i = stack[s];
    if (neighbourer.isNoData(i)) continue;
    if (neighbourer.isCanOut(i)) continue;
    const r = receivers[i];
    if (r === UINT32_MAX || r === i || neighbourer.isNoData(r)) continue;
    area[r] += area[i];
  }

  return area;
};

const flowAccumulationWeighted = ({ stack, stackLength, receivers, neighbourer, dx, dy, weights }) => {
  const total = stack.length;
  const area = new Float32Array(total);
  const cellArea = dx * dy;

  for (let i = 0; i < total; i += 1) {
    if (neighbourer.isNoData(i)) {
      area[i] = 0;
    } else {
      const w = weights ? weights[i] : 1;
      area[i] = cellArea * w;
    }
  }

  const limit = stackLength > 0 ? stackLength : stack.length;
  for (let s = limit - 1; s >= 0; s -= 1) {
    const i = stack[s];
    if (neighbourer.isNoData(i)) continue;
    if (neighbourer.isCanOut(i)) continue;
    const r = receivers[i];
    if (r === UINT32_MAX || r === i || neighbourer.isNoData(r)) continue;
    area[r] += area[i];
  }

  return area;
};

export { flowAccumulation, flowAccumulationWeighted, UINT32_MAX };
