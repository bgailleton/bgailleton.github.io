const tridag = (a, b, c, r, n) => {
  const u = new Float32Array(n);
  const gam = new Float32Array(n);
  let bet = b[0];
  if (bet === 0) return u;

  u[0] = r[0] / bet;
  for (let j = 1; j < n; j += 1) {
    gam[j] = c[j - 1] / bet;
    bet = b[j] - a[j] * gam[j];
    if (bet === 0) return u;
    u[j] = (r[j] - a[j] * u[j - 1]) / bet;
  }

  for (let j = n - 2; j >= 0; j -= 1) {
    u[j] -= gam[j + 1] * u[j + 1];
  }
  return u;
};

const diffusionStepADI = ({ z, kd, dx, dy, dt, nx, ny, neighbourer }) => {
  const rows = nx;
  const cols = ny;
  const dt2 = dt / 2;
  const dx2 = dx * dx;
  const dy2 = dy * dy;
  const zHalf = new Float32Array(z);
  const zNew = new Float32Array(z);

  const idx = (row, col) => row * cols + col;

  for (let row = 1; row < rows - 1; row += 1) {
    const a = new Float32Array(cols);
    const b = new Float32Array(cols);
    const c = new Float32Array(cols);
    const r = new Float32Array(cols);

    for (let col = 1; col < cols - 1; col += 1) {
      const i = idx(row, col);
      if (neighbourer.isNoData(i) || neighbourer.isCanOut(i)) {
        b[col] = 1;
        r[col] = z[i];
        continue;
      }

      const ip = idx(row, col + 1);
      const im = idx(row, col - 1);
      const jp = idx(row + 1, col);
      const jm = idx(row - 1, col);

      if (
        neighbourer.isNoData(ip) || neighbourer.isNoData(im) ||
        neighbourer.isNoData(jp) || neighbourer.isNoData(jm) ||
        neighbourer.isCanOut(ip) || neighbourer.isCanOut(im) ||
        neighbourer.isCanOut(jp) || neighbourer.isCanOut(jm)
      ) {
        b[col] = 1;
        r[col] = z[i];
        continue;
      }

      const fxp = (kd[ip] + kd[i]) * 0.5 * dt2 / dx2;
      const fxm = (kd[im] + kd[i]) * 0.5 * dt2 / dx2;
      const fyp = (kd[jp] + kd[i]) * 0.5 * dt2 / dy2;
      const fym = (kd[jm] + kd[i]) * 0.5 * dt2 / dy2;

      b[col] = 1 + fxp + fxm;
      c[col] = -fxp;
      a[col] = -fxm;

      r[col] = z[i] + fyp * z[jp] - (fyp + fym) * z[i] + fym * z[jm];
    }

    b[0] = 1;
    b[cols - 1] = 1;
    r[0] = z[idx(row, 0)];
    r[cols - 1] = z[idx(row, cols - 1)];

    const solved = tridag(a, b, c, r, cols);
    for (let col = 0; col < cols; col += 1) {
      zHalf[idx(row, col)] = solved[col];
    }
  }

  for (let col = 1; col < cols - 1; col += 1) {
    const a = new Float32Array(rows);
    const b = new Float32Array(rows);
    const c = new Float32Array(rows);
    const r = new Float32Array(rows);

    for (let row = 1; row < rows - 1; row += 1) {
      const i = idx(row, col);
      if (neighbourer.isNoData(i) || neighbourer.isCanOut(i)) {
        b[row] = 1;
        r[row] = zHalf[i];
        continue;
      }

      const ip = idx(row, col + 1);
      const im = idx(row, col - 1);
      const jp = idx(row + 1, col);
      const jm = idx(row - 1, col);

      if (
        neighbourer.isNoData(ip) || neighbourer.isNoData(im) ||
        neighbourer.isNoData(jp) || neighbourer.isNoData(jm) ||
        neighbourer.isCanOut(ip) || neighbourer.isCanOut(im) ||
        neighbourer.isCanOut(jp) || neighbourer.isCanOut(jm)
      ) {
        b[row] = 1;
        r[row] = zHalf[i];
        continue;
      }

      const fxp = (kd[ip] + kd[i]) * 0.5 * dt2 / dx2;
      const fxm = (kd[im] + kd[i]) * 0.5 * dt2 / dx2;
      const fyp = (kd[jp] + kd[i]) * 0.5 * dt2 / dy2;
      const fym = (kd[jm] + kd[i]) * 0.5 * dt2 / dy2;

      b[row] = 1 + fyp + fym;
      c[row] = -fyp;
      a[row] = -fym;

      r[row] = zHalf[i] + fxp * zHalf[ip] - (fxp + fxm) * zHalf[i] + fxm * zHalf[im];
    }

    b[0] = 1;
    b[rows - 1] = 1;
    r[0] = zHalf[idx(0, col)];
    r[rows - 1] = zHalf[idx(rows - 1, col)];

    const solved = tridag(a, b, c, r, rows);
    for (let row = 0; row < rows; row += 1) {
      zNew[idx(row, col)] = solved[row];
    }
  }

  return zNew;
};

export { diffusionStepADI };
