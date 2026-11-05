const applyUplift = ({ z, upliftRate, neighbourer, dt, addToBaselevels = false }) => {
  const total = z.length;
  for (let i = 0; i < total; i += 1) {
    if (neighbourer.isNoData(i)) continue;
    if (!addToBaselevels && neighbourer.isCanOut(i)) continue;
    z[i] += upliftRate[i] * dt;
  }
};

export { applyUplift };
