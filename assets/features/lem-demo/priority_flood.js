const UINT32_MAX = 0xFFFFFFFF;

class MinHeap {
  constructor() {
    this.items = [];
  }

  size() {
    return this.items.length;
  }

  push(item) {
    this.items.push(item);
    this._siftUp(this.items.length - 1);
  }

  pop() {
    if (this.items.length === 0) return null;
    const root = this.items[0];
    const last = this.items.pop();
    if (this.items.length > 0) {
      this.items[0] = last;
      this._siftDown(0);
    }
    return root;
  }

  peek() {
    return this.items.length > 0 ? this.items[0] : null;
  }

  _siftUp(index) {
    let i = index;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.items[parent].z <= this.items[i].z) break;
      [this.items[parent], this.items[i]] = [this.items[i], this.items[parent]];
      i = parent;
    }
  }

  _siftDown(index) {
    let i = index;
    while (true) {
      const left = 2 * i + 1;
      const right = left + 1;
      let smallest = i;
      if (left < this.items.length && this.items[left].z < this.items[smallest].z) smallest = left;
      if (right < this.items.length && this.items[right].z < this.items[smallest].z) smallest = right;
      if (smallest === i) break;
      [this.items[i], this.items[smallest]] = [this.items[smallest], this.items[i]];
      i = smallest;
    }
  }
}

const nextUpFloat32 = (value) => {
  if (Number.isNaN(value)) return value;
  if (value === Infinity) return Infinity;
  if (value === 0) return 1.401298464324817e-45;

  const buffer = new ArrayBuffer(4);
  const view = new DataView(buffer);
  view.setFloat32(0, value, true);
  let bits = view.getUint32(0, true);
  if (value > 0) {
    bits += 1;
  } else {
    bits -= 1;
  }
  view.setUint32(0, bits, true);
  return view.getFloat32(0, true);
};

const isNoData = (value, noData) => {
  if (Number.isNaN(noData)) return Number.isNaN(value);
  return value === noData;
};

const updateSteepestReceiver = (index, grid, neighbourer, receivers, receiverDistance) => {
  const z = grid.Z[index];
  let bestSlope = -Infinity;
  let bestIndex = UINT32_MAX;
  let bestDist = 0;

  const neighbors = neighbourer.neighbours(index);
  for (let n = 0; n < neighbors.length; n += 1) {
    const j = neighbors[n];
    if (j < 0) continue;
    if (neighbourer.isNoData(j)) continue;
    const dist = neighbourer.distance_to_neighbour(index, j);
    if (!dist) continue;
    const dz = z - grid.Z[j];
    const slope = dz / dist;
    if (slope > bestSlope) {
      bestSlope = slope;
      bestIndex = j;
      bestDist = dist;
    }
  }

  receivers[index] = bestIndex;
  receiverDistance[index] = bestIndex === UINT32_MAX ? 0 : bestDist;
};

const priorityFloodEpsilonBarnes2014 = (
  grid,
  neighbourer,
  { topology = 'D8', epsilon = 0 } = {}
) => {
  const total = grid.nx * grid.ny;
  const closed = new Uint8Array(total);
  const stack = new Uint32Array(total);
  const receivers = new Uint32Array(total);
  const receiverDistance = new Float32Array(total);

  let stackPos = 0;
  for (let i = 0; i < total; i += 1) {
    if (neighbourer.isNoData(i) || isNoData(grid.Z[i], grid.noData)) {
      closed[i] = 1;
      stack[stackPos++] = i;
      receivers[i] = UINT32_MAX;
      receiverDistance[i] = 0;
    }
  }

  const open = new MinHeap();
  let canOutCount = 0;
  for (let i = 0; i < total; i += 1) {
    if (neighbourer.isCanOut(i)) {
      open.push({ i, z: grid.Z[i] });
      closed[i] = 1;
      canOutCount += 1;
    }
  }

  if (canOutCount === 0) {
    throw new Error('Priority flood requires at least one can_out node.');
  }

  const pit = [];
  let pitHead = 0;
  let pitTop = null;

  const getNeighbors = (index) => {
    if (topology === 'D4') return neighbourer.neighbours_D4(index);
    return neighbourer.neighbours(index);
  };

  while (open.size() > 0 || pitHead < pit.length) {
    let c = null;
    if (pitHead < pit.length && open.size() > 0 && open.peek().z === pit[pitHead].z) {
      c = open.pop();
      pitTop = null;
    } else if (pitHead < pit.length) {
      c = pit[pitHead++];
      if (pitTop === null) pitTop = c.z;
    } else {
      c = open.pop();
      pitTop = null;
    }

    if (c === null) break;
    stack[stackPos++] = c.i;

    const neighbors = getNeighbors(c.i);
    for (let n = 0; n < neighbors.length; n += 1) {
      const ni = neighbors[n];
      if (ni < 0) continue;
      if (closed[ni]) continue;
      closed[ni] = 1;

      if (neighbourer.isNoData(ni) || isNoData(grid.Z[ni], grid.noData)) {
        pit.push({ i: ni, z: grid.noData });
        continue;
      }

      const nextZ = Math.max(nextUpFloat32(c.z), c.z + epsilon);
      if (grid.Z[ni] <= nextZ) {
        if (pitTop !== null && pitTop < grid.Z[ni] && nextZ >= grid.Z[ni]) {
          // false pit counter omitted
        }
        grid.Z[ni] = nextZ;
        pit.push({ i: ni, z: grid.Z[ni] });
      } else {
        open.push({ i: ni, z: grid.Z[ni] });
      }
    }

    updateSteepestReceiver(c.i, grid, neighbourer, receivers, receiverDistance);
  }

  return { stack, stackLength: stackPos, receivers, receiverDistance };
};

export { priorityFloodEpsilonBarnes2014, UINT32_MAX };
