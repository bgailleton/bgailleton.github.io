class Neighbourer {
  constructor({ nx, ny, dx = 1, dy = 1, boundary_type = 0, node_status } = {}) {
    this.nx = Number.isFinite(nx) ? nx : 0;
    this.ny = Number.isFinite(ny) ? ny : 0;
    this.dx = dx;
    this.dy = dy;
    this.boundary_type = boundary_type;
    this.node_status = node_status instanceof Uint8Array ? node_status : new Uint8Array(this.nx * this.ny);
  }

  indexToRowCol(index) {
    const row = Math.floor(index / this.ny);
    const col = index - row * this.ny;
    return { row, col };
  }

  rowColToIndex(row, col) {
    return row * this.ny + col;
  }

  isNoData(index) {
    return this.node_status[index] === 0;
  }

  isCanOut(index) {
    return this.node_status[index] === 3;
  }

  _wrapCol(col) {
    if (this.boundary_type === 1) {
      if (col < 0) return this.ny - 1;
      if (col >= this.ny) return 0;
    }
    return col;
  }

  _wrapRow(row) {
    if (this.boundary_type === 2) {
      if (row < 0) return this.nx - 1;
      if (row >= this.nx) return 0;
    }
    return row;
  }

  _neighbor(row, col) {
    const r = this._wrapRow(row);
    const c = this._wrapCol(col);
    if (r < 0 || r >= this.nx || c < 0 || c >= this.ny) return -1;
    return this.rowColToIndex(r, c);
  }

  topLeft(index) {
    const { row, col } = this.indexToRowCol(index);
    return this._neighbor(row - 1, col - 1);
  }

  top(index) {
    const { row, col } = this.indexToRowCol(index);
    return this._neighbor(row - 1, col);
  }

  topRight(index) {
    const { row, col } = this.indexToRowCol(index);
    return this._neighbor(row - 1, col + 1);
  }

  left(index) {
    const { row, col } = this.indexToRowCol(index);
    return this._neighbor(row, col - 1);
  }

  right(index) {
    const { row, col } = this.indexToRowCol(index);
    return this._neighbor(row, col + 1);
  }

  bottomLeft(index) {
    const { row, col } = this.indexToRowCol(index);
    return this._neighbor(row + 1, col - 1);
  }

  bottom(index) {
    const { row, col } = this.indexToRowCol(index);
    return this._neighbor(row + 1, col);
  }

  bottomRight(index) {
    const { row, col } = this.indexToRowCol(index);
    return this._neighbor(row + 1, col + 1);
  }

  neighbours(index) {
    const out = new Int32Array(8);
    out[0] = this.topLeft(index);
    out[1] = this.top(index);
    out[2] = this.topRight(index);
    out[3] = this.left(index);
    out[4] = this.right(index);
    out[5] = this.bottomLeft(index);
    out[6] = this.bottom(index);
    out[7] = this.bottomRight(index);
    return out;
  }

  neighbours_D4(index) {
    const out = new Int32Array(4);
    out[0] = this.top(index);
    out[1] = this.right(index);
    out[2] = this.bottom(index);
    out[3] = this.left(index);
    return out;
  }

  distance_to_neighbour(i, j) {
    if (j < 0 || j >= this.nx * this.ny) return null;
    const a = this.indexToRowCol(i);
    const b = this.indexToRowCol(j);

    let dr = b.row - a.row;
    let dc = b.col - a.col;

    if (this.boundary_type === 1) {
      if (dc === this.ny - 1) dc = -1;
      if (dc === -(this.ny - 1)) dc = 1;
    }
    if (this.boundary_type === 2) {
      if (dr === this.nx - 1) dr = -1;
      if (dr === -(this.nx - 1)) dr = 1;
    }

    if (Math.abs(dr) > 1 || Math.abs(dc) > 1) return null;
    if (dr === 0 && dc === 0) return null;
    if (dr === 0) return this.dx;
    if (dc === 0) return this.dy;
    return Math.hypot(this.dx, this.dy);
  }
}

export { Neighbourer };
