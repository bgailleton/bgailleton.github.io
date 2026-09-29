(() => {
  const canvas = document.querySelector('[data-terrain-hero]');
  const contourCanvas = document.querySelector('[data-contour-field]');
  if (!canvas) return;
  const depthScale = canvas.parentElement.querySelector('[data-depth-scale]');
  const depthTrack = depthScale?.querySelector('[data-depth-track]');
  const depthMarker = depthScale?.querySelector('[data-depth-marker]');
  const depthMaximum = depthScale?.querySelector('[data-depth-maximum]');

  const gl = canvas.getContext('webgl', { alpha: true, antialias: true });
  if (!gl) return;

  const vertexSource = `
    attribute vec3 aPosition;
    attribute vec3 aNormal;
    uniform mat4 uMvp;
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying float vEdge;
    void main() {
      vNormal = aNormal;
      vPosition = aPosition;
      vEdge = 1.0 - max(abs(aPosition.x), abs(aPosition.z)) / 1.125;
      gl_Position = uMvp * vec4(aPosition, 1.0);
    }
  `;
  const fragmentSource = `
    precision mediump float;
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying float vEdge;
    uniform vec3 uLight;
    void main() {
      vec3 normal = normalize(vNormal);
      vec3 light = normalize(uLight);
      float diffuse = max(dot(normal, light), 0.0);
      vec3 view = normalize(vec3(0.0, 1.4, 2.8) - vPosition);
      vec3 reflected = reflect(-light, normal);
      float specular = pow(max(dot(view, reflected), 0.0), 24.0);
      float rawHeight = clamp(vPosition.y / 1.05 + 0.48, 0.0, 1.0);
      float height = smoothstep(0.18, 0.83, rawHeight);
      vec3 deepWater = vec3(0.19, 0.20, 0.58);
      vec3 cyan = vec3(0.00, 0.62, 0.75);
      vec3 green = vec3(0.12, 0.55, 0.24);
      vec3 grass = vec3(0.67, 0.70, 0.23);
      vec3 rock = vec3(0.52, 0.37, 0.24);
      vec3 snow = vec3(0.90, 0.93, 0.88);
      vec3 terrain = mix(deepWater, cyan, smoothstep(0.03, 0.20, height));
      terrain = mix(terrain, green, smoothstep(0.16, 0.38, height));
      terrain = mix(terrain, grass, smoothstep(0.34, 0.60, height));
      terrain = mix(terrain, rock, smoothstep(0.57, 0.80, height));
      terrain = mix(terrain, snow, smoothstep(0.78, 1.0, height));
      vec3 colour = terrain * (0.16 + diffuse * 0.84);
      colour += vec3(0.38, 0.75, 0.9) * specular * 0.3;
      float edgeFade = smoothstep(0.0, 0.16, vEdge);
      gl_FragColor = vec4(colour, 0.96 * edgeFade);
    }
  `;
  const waterVertexSource = `
    attribute vec3 aPosition;
    attribute vec3 aNormal;
    attribute float aDepth;
    uniform mat4 uMvp;
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying float vDepth;
    void main() {
      vNormal = aNormal;
      vPosition = aPosition;
      vDepth = aDepth;
      gl_Position = uMvp * vec4(aPosition, 1.0);
    }
  `;
  const waterFragmentSource = `
    precision mediump float;
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying float vDepth;
    uniform vec3 uLight;
    void main() {
      if (vDepth < 0.08) discard;
      vec3 normal = normalize(vNormal);
      vec3 light = normalize(uLight);
      float diffuse = max(dot(normal, light), 0.0);
      vec3 view = normalize(vec3(0.0, 1.4, 2.8) - vPosition);
      float glint = pow(max(dot(view, reflect(-light, normal)), 0.0), 28.0);
      float t = pow(clamp(vDepth / 3.0, 0.0, 1.0), 0.7);
      // Matplotlib Blues over 0-3 m; the power stretch reveals shallow flow.
      vec3 colour = mix(vec3(0.969, 0.984, 1.0), vec3(0.776, 0.859, 0.937), smoothstep(0.0, 0.25, t));
      colour = mix(colour, vec3(0.420, 0.682, 0.839), smoothstep(0.25, 0.50, t));
      colour = mix(colour, vec3(0.129, 0.443, 0.710), smoothstep(0.50, 0.75, t));
      colour = mix(colour, vec3(0.031, 0.188, 0.420), smoothstep(0.75, 1.0, t));
      colour *= 0.82 + 0.18 * diffuse;
      colour += vec3(0.72, 0.88, 1.0) * glint * 0.09;
      float alpha = smoothstep(0.10, 0.85, vDepth) * mix(0.68, 0.94, t);
      gl_FragColor = vec4(colour, alpha);
    }
  `;
  const particleVertexSource = `
    attribute vec3 aPosition;
    attribute float aOpacity;
    attribute float aSize;
    uniform mat4 uMvp;
    uniform float uPixelRatio;
    varying float vOpacity;
    void main() {
      gl_Position = uMvp * vec4(aPosition, 1.0);
      gl_PointSize = aSize * uPixelRatio;
      vOpacity = aOpacity;
    }
  `;
  const particleFragmentSource = `
    precision mediump float;
    varying float vOpacity;
    void main() {
      float radius = length(gl_PointCoord - vec2(0.5));
      float halo = 1.0 - smoothstep(0.15, 0.5, radius);
      float core = 1.0 - smoothstep(0.08, 0.38, radius);
      vec3 colour = mix(vec3(0.04, 0.36, 0.76), vec3(0.32, 0.70, 0.98), core);
      gl_FragColor = vec4(colour, halo * vOpacity);
    }
  `;
  const compile = (type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return shader;
  };
  const program = gl.createProgram();
  gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexSource));
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentSource));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
  const waterProgram = gl.createProgram();
  gl.attachShader(waterProgram, compile(gl.VERTEX_SHADER, waterVertexSource));
  gl.attachShader(waterProgram, compile(gl.FRAGMENT_SHADER, waterFragmentSource));
  gl.linkProgram(waterProgram);
  const waterReady = gl.getProgramParameter(waterProgram, gl.LINK_STATUS);
  const particleProgram = gl.createProgram();
  gl.attachShader(particleProgram, compile(gl.VERTEX_SHADER, particleVertexSource));
  gl.attachShader(particleProgram, compile(gl.FRAGMENT_SHADER, particleFragmentSource));
  gl.linkProgram(particleProgram);
  const particlesReady = gl.getProgramParameter(particleProgram, gl.LINK_STATUS);
  const multiply = (out, a, b) => {
    for (let row = 0; row < 4; row += 1) {
      for (let col = 0; col < 4; col += 1) {
        out[col * 4 + row] = a[row] * b[col * 4] + a[4 + row] * b[col * 4 + 1] + a[8 + row] * b[col * 4 + 2] + a[12 + row] * b[col * 4 + 3];
      }
    }
  };
  const perspective = (out, fov, aspect, near, far) => {
    const f = 1 / Math.tan(fov / 2);
    out.fill(0);
    out[0] = f / aspect; out[5] = f; out[10] = (far + near) / (near - far);
    out[11] = -1; out[14] = (2 * far * near) / (near - far);
  };
  const lookAt = (out, eye, target) => {
    let zx = eye[0] - target[0], zy = eye[1] - target[1], zz = eye[2] - target[2];
    let inv = 1 / Math.hypot(zx, zy, zz); zx *= inv; zy *= inv; zz *= inv;
    let xx = zz, xy = 0, xz = -zx; inv = 1 / Math.hypot(xx, xy, xz); xx *= inv; xy *= inv; xz *= inv;
    const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
    out.set([xx, yx, zx, 0, xy, yy, zy, 0, xz, yz, zz, 0, -(xx * eye[0] + xy * eye[1] + xz * eye[2]), -(yx * eye[0] + yy * eye[1] + yz * eye[2]), -(zx * eye[0] + zy * eye[1] + zz * eye[2]), 1]);
  };

  const image = new Image();
  image.src = canvas.dataset.height;
  image.onload = () => {
    const source = document.createElement('canvas');
    const cells = image.width;
    source.width = cells;
    source.height = cells;
    const context = source.getContext('2d', { willReadFrequently: true });
    context.drawImage(image, 0, 0, cells, cells);
    const pixels = context.getImageData(0, 0, cells, cells).data;
    const heightAt = (x, z) => {
      const index = (Math.max(0, Math.min(cells - 1, z)) * cells + Math.max(0, Math.min(cells - 1, x))) * 4;
      return (pixels[index] * 256 + pixels[index + 1]) / 65535;
    };
    const sampleHeight = (x, z) => {
      const x0 = Math.floor(x), z0 = Math.floor(z);
      const fx = x - x0, fz = z - z0;
      const top = heightAt(x0, z0) * (1 - fx) + heightAt(x0 + 1, z0) * fx;
      const bottom = heightAt(x0, z0 + 1) * (1 - fx) + heightAt(x0 + 1, z0 + 1) * fx;
      return top * (1 - fz) + bottom * fz;
    };
    // The packed DEM is normalized for display; these values restore the
    // source TIFF's metres for the small Floodos-inspired water calculation.
    const elevationRange = 832.97056;
    const cellMetres = 10;
    const cellArea = cellMetres * cellMetres;
    const manningN = 0.045;
    const precipitonVolume = 60;
    const waterDepth = new Float32Array(cells * cells);
    const lastWaterUpdate = new Float32Array(cells * cells);
    const wetFlag = new Uint8Array(cells * cells);
    const wetCells = [];
    let simulationTime = 0;
    const waterAt = (x, z) => waterDepth[Math.max(0, Math.min(cells - 1, z)) * cells + Math.max(0, Math.min(cells - 1, x))];
    const sampleWater = (x, z) => {
      const x0 = Math.floor(x), z0 = Math.floor(z);
      const fx = x - x0, fz = z - z0;
      const top = waterAt(x0, z0) * (1 - fx) + waterAt(x0 + 1, z0) * fx;
      const bottom = waterAt(x0, z0 + 1) * (1 - fx) + waterAt(x0 + 1, z0 + 1) * fx;
      return top * (1 - fz) + bottom * fz;
    };
    const surfaceAt = (x, z) => sampleHeight(x, z) + sampleWater(x, z) / elevationRange;
    const edgeCell = (x, z) => x < 3 || z < 3 || x > cells - 4 || z > cells - 4;
    const drainCell = (index, x, z) => {
      const elapsed = simulationTime - lastWaterUpdate[index];
      lastWaterUpdate[index] = simulationTime;
      const depth = waterDepth[index];
      if (depth <= 0 || elapsed <= 0) return;
      const level = heightAt(x, z) * elevationRange + depth;
      let slope = 0;
      for (let dz = -1; dz <= 1; dz += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (!dx && !dz) continue;
          const nextLevel = heightAt(x + dx, z + dz) * elevationRange + waterAt(x + dx, z + dz);
          slope = Math.max(slope, (level - nextLevel) / (cellMetres * Math.hypot(dx, dz)));
        }
      }
      if (slope > 0) {
        const decay = 1 + (2 / 3) * Math.sqrt(slope) / (manningN * cellMetres)
          * Math.pow(depth, 2 / 3) * elapsed;
        waterDepth[index] = depth / Math.pow(decay, 1.5);
      }
    };
    const depositCell = (x, z, volume = precipitonVolume) => {
      if (edgeCell(x, z)) return;
      const index = z * cells + x;
      drainCell(index, x, z);
      waterDepth[index] += volume / cellArea;
      if (!wetFlag[index]) { wetFlag[index] = 1; wetCells.push(index); }
    };
    const visitCell = (particle) => {
      const x = Math.round(particle.x), z = Math.round(particle.z);
      const index = z * cells + x;
      if (particle.lastCell === index) return;
      particle.lastCell = index;
      depositCell(x, z);
    };
    // Fill enclosed lows once, then add a tiny gradient across the resulting flats.
    // This is a drainage surface, not a stored particle path.
    const buildDrainage = () => {
      const count = cells * cells;
      const filled = new Float32Array(count);
      const parent = new Int32Array(count);
      parent.fill(-1);
      const visited = new Uint8Array(count);
      const heap = [];
      const push = (index, elevation) => {
        let child = heap.length;
        heap.push({ index, elevation });
        while (child > 0) {
          const parent = (child - 1) >> 1;
          if (heap[parent].elevation <= elevation) break;
          heap[child] = heap[parent];
          child = parent;
        }
        heap[child] = { index, elevation };
      };
      const pop = () => {
        const first = heap[0];
        const last = heap.pop();
        if (heap.length) {
          let parent = 0;
          while (parent * 2 + 1 < heap.length) {
            let child = parent * 2 + 1;
            if (child + 1 < heap.length && heap[child + 1].elevation < heap[child].elevation) child += 1;
            if (last.elevation <= heap[child].elevation) break;
            heap[parent] = heap[child];
            parent = child;
          }
          heap[parent] = last;
        }
        return first;
      };
      const addEdge = (x, z) => {
        const index = z * cells + x;
        if (visited[index]) return;
        visited[index] = 1;
        filled[index] = heightAt(x, z);
        push(index, filled[index]);
      };
      for (let x = 0; x < cells; x += 1) { addEdge(x, 0); addEdge(x, cells - 1); }
      for (let z = 1; z < cells - 1; z += 1) { addEdge(0, z); addEdge(cells - 1, z); }
      while (heap.length) {
        const { index, elevation } = pop();
        const x = index % cells, z = (index / cells) | 0;
        for (let dz = -1; dz <= 1; dz += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            if (Math.abs(dx) + Math.abs(dz) !== 1) continue;
            const nx = x + dx, nz = z + dz;
            if (nx < 0 || nz < 0 || nx >= cells || nz >= cells) continue;
            const neighbor = nz * cells + nx;
            if (visited[neighbor]) continue;
            visited[neighbor] = 1;
            filled[neighbor] = Math.max(elevation, heightAt(nx, nz));
            parent[neighbor] = index;
            push(neighbor, filled[neighbor]);
          }
        }
      }
      return {
        nextCell: (x, z) => {
          const index = Math.round(z) * cells + Math.round(x);
          const next = parent[index];
          return next < 0 ? null : [next % cells, (next / cells) | 0];
        },
      };
    };
    const drainage = buildDrainage();
    const drawContours = () => {
      if (!contourCanvas) return;
      const bounds = contourCanvas.getBoundingClientRect();
      const scale = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.round(bounds.width * scale), height = Math.round(bounds.height * scale);
      if (!width || !height) return;
      contourCanvas.width = width;
      contourCanvas.height = height;
      const drawing = contourCanvas.getContext('2d');
      drawing.setTransform(scale, 0, 0, scale, 0, 0);
      drawing.clearRect(0, 0, bounds.width, bounds.height);
      drawing.strokeStyle = 'rgba(113, 182, 202, 0.18)';
      drawing.lineWidth = 0.75;
      const step = Math.max(1, Math.round(cells / 128));
      const point = (x, z, edge, level) => {
        const values = [heightAt(x, z), heightAt(x + step, z), heightAt(x + step, z + step), heightAt(x, z + step)];
        const pairs = [[0, 1], [1, 2], [2, 3], [3, 0]][edge];
        const positions = [[x, z], [x + step, z], [x + step, z + step], [x, z + step]];
        const amount = (level - values[pairs[0]]) / (values[pairs[1]] - values[pairs[0]] || 1);
        const a = positions[pairs[0]], b = positions[pairs[1]];
        return [(a[0] + (b[0] - a[0]) * amount) / (cells - 1) * bounds.width, (a[1] + (b[1] - a[1]) * amount) / (cells - 1) * bounds.height];
      };
      const segments = [[], [[3, 0]], [[0, 1]], [[3, 1]], [[1, 2]], [[3, 2], [0, 1]], [[0, 2]], [[3, 2]], [[2, 3]], [[0, 2]], [[0, 3], [1, 2]], [[1, 2]], [[1, 3]], [[0, 1]], [[0, 3]], []];
      for (let level = 0.20; level <= 0.84; level += 0.055) {
        drawing.beginPath();
        for (let z = 0; z < cells - step; z += step) {
          for (let x = 0; x < cells - step; x += step) {
            const state = (heightAt(x, z) > level ? 1 : 0) | (heightAt(x + step, z) > level ? 2 : 0) | (heightAt(x + step, z + step) > level ? 4 : 0) | (heightAt(x, z + step) > level ? 8 : 0);
            for (const segment of segments[state]) {
              const start = point(x, z, segment[0], level), end = point(x, z, segment[1], level);
              drawing.moveTo(start[0], start[1]); drawing.lineTo(end[0], end[1]);
            }
          }
        }
        drawing.stroke();
      }
    };
    drawContours();
    new ResizeObserver(drawContours).observe(contourCanvas);
    const vertices = new Float32Array(cells * cells * 6);
    const indices = new Uint16Array((cells - 1) * (cells - 1) * 6);
    let vertex = 0;
    for (let z = 0; z < cells; z += 1) {
      for (let x = 0; x < cells; x += 1) {
        const h = heightAt(x, z);
        const left = heightAt(x - 2, z), right = heightAt(x + 2, z);
        const down = heightAt(x, z - 2), up = heightAt(x, z + 2);
        let nx = (left - right) * 1.05, ny = 4 * 2.25 / (cells - 1), nz = (down - up) * 1.05;
        const length = 1 / Math.hypot(nx, ny, nz); nx *= length; ny *= length; nz *= length;
        vertices.set([(x / (cells - 1) - 0.5) * 2.25, (h - 0.48) * 1.05, (z / (cells - 1) - 0.5) * 2.25, nx, ny, nz], vertex);
        vertex += 6;
      }
    }
    let index = 0;
    for (let z = 0; z < cells - 1; z += 1) {
      for (let x = 0; x < cells - 1; x += 1) {
        const a = z * cells + x, b = a + 1, c = a + cells, d = c + 1;
        indices.set([a, c, b, b, c, d], index); index += 6;
      }
    }
    const vertexBuffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer); gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    const indexBuffer = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'aPosition');
    const normal = gl.getAttribLocation(program, 'aNormal');
    const mvpLocation = gl.getUniformLocation(program, 'uMvp');
    const lightLocation = gl.getUniformLocation(program, 'uLight');
    const waterVertices = new Float32Array(cells * cells * 7);
    const displayDepth = new Float32Array(cells * cells);
    const waterBuffer = gl.createBuffer();
    const waterPosition = gl.getAttribLocation(waterProgram, 'aPosition');
    const waterNormal = gl.getAttribLocation(waterProgram, 'aNormal');
    const waterDepthAttribute = gl.getAttribLocation(waterProgram, 'aDepth');
    const waterMvp = gl.getUniformLocation(waterProgram, 'uMvp');
    const waterLight = gl.getUniformLocation(waterProgram, 'uLight');
    const smoothStep = (lo, hi, value) => {
      const t = Math.max(0, Math.min(1, (value - lo) / (hi - lo)));
      return t * t * (3 - 2 * t);
    };
    const mixColour = (a, b, t) => a.map((value, channel) => value * (1 - t) + b[channel] * t);
    const depthColour = (depth) => {
      const t = Math.pow(Math.min(1, depth / 3), 0.7);
      let colour = mixColour([0.969, 0.984, 1], [0.776, 0.859, 0.937], smoothStep(0, 0.25, t));
      colour = mixColour(colour, [0.420, 0.682, 0.839], smoothStep(0.25, 0.50, t));
      colour = mixColour(colour, [0.129, 0.443, 0.710], smoothStep(0.50, 0.75, t));
      return mixColour(colour, [0.031, 0.188, 0.420], smoothStep(0.75, 1, t));
    };
    if (depthTrack) {
      const stops = Array.from({ length: 49 }, (_, index) => {
        const rgb = depthColour(3 * index / 48).map((channel) => Math.round(channel * 255));
        return `rgb(${rgb.join(' ')}) ${index * 100 / 48}%`;
      });
      depthTrack.style.background = `linear-gradient(to right, ${stops.join(', ')})`;
    }
    let lastWaterUpload = -Infinity;
    const updateWaterMesh = () => {
      for (let i = wetCells.length - 1; i >= 0; i -= 1) {
        const index = wetCells[i];
        drainCell(index, index % cells, (index / cells) | 0);
        if (waterDepth[index] < 0.005) {
          waterDepth[index] = 0;
          wetFlag[index] = 0;
          wetCells[i] = wetCells[wetCells.length - 1];
          wetCells.pop();
        }
      }
      // Small spatial and temporal smoothing removes discrete packet flicker
      // from the visual mesh. The routing and Manning update use raw h.
      for (let z = 0; z < cells; z += 1) {
        for (let x = 0; x < cells; x += 1) {
          const index = z * cells + x;
          if (edgeCell(x, z)) { displayDepth[index] = 0; continue; }
          let weighted = 0;
          for (let dz = -1; dz <= 1; dz += 1) {
            for (let dx = -1; dx <= 1; dx += 1) {
              const weight = dx === 0 && dz === 0 ? 4 : dx === 0 || dz === 0 ? 2 : 1;
              weighted += Math.min(3, waterAt(x + dx, z + dz)) * weight;
            }
          }
          displayDepth[index] += (weighted / 16 - displayDepth[index]) * 0.22;
        }
      }
      let maximumDepth = 0;
      for (let index = 0; index < displayDepth.length; index += 1) {
        const depth = displayDepth[index];
        maximumDepth = Math.max(maximumDepth, depth);
        const terrainOffset = index * 6, offset = index * 7;
        waterVertices[offset] = vertices[terrainOffset];
        waterVertices[offset + 1] = vertices[terrainOffset + 1]
          + Math.min(depth, 3) * 10.5 / elevationRange + 0.005;
        waterVertices[offset + 2] = vertices[terrainOffset + 2];
        waterVertices[offset + 3] = vertices[terrainOffset + 3];
        waterVertices[offset + 4] = vertices[terrainOffset + 4];
        waterVertices[offset + 5] = vertices[terrainOffset + 5];
        waterVertices[offset + 6] = depth;
      }
      if (depthScale) {
        depthScale.classList.toggle('is-visible', maximumDepth >= 0.08);
        depthMaximum.textContent = `MAX ${maximumDepth.toFixed(1)}`;
        depthMarker.style.left = `${Math.min(100, maximumDepth / 3 * 100)}%`;
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, waterBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, waterVertices, gl.DYNAMIC_DRAW);
    };
    const maxParticles = 150;
    const trailLength = 24;
    const particles = [];
    const particleData = new Float32Array(maxParticles * trailLength * 5);
    const particleBuffer = gl.createBuffer();
    const particlePosition = gl.getAttribLocation(particleProgram, 'aPosition');
    const particleOpacity = gl.getAttribLocation(particleProgram, 'aOpacity');
    const particleSize = gl.getAttribLocation(particleProgram, 'aSize');
    const particleMvp = gl.getUniformLocation(particleProgram, 'uMvp');
    const particlePixelRatio = gl.getUniformLocation(particleProgram, 'uPixelRatio');
    const makeParticle = (x, z) => ({ x, z, dx: 0, dz: 0, level: surfaceAt(x, z), age: 0, lastCell: -1, escape: null, history: [] });
    const spawnParticle = () => {
      for (let attempt = 0; attempt < 24; attempt += 1) {
        const x = 18 + Math.random() * (cells - 37);
        const z = 18 + Math.random() * (cells - 37);
        const height = sampleHeight(x, z);
        const slope = Math.hypot(sampleHeight(x + 1, z) - sampleHeight(x - 1, z), sampleHeight(x, z + 1) - sampleHeight(x, z - 1));
        if (height > 0.55 && slope > 0.003) {
          return makeParticle(x, z);
        }
      }
      return null;
    };
    // Source positions in the 256-cell DEM: the main river enters at the left,
    // while two shorter channels enter from the top edge.
    const riverEntries = [
      { x: 10, z: 181, spreadX: 2, spreadZ: 3 },
      { x: 68, z: 10, spreadX: 2, spreadZ: 1.5 },
      { x: 211, z: 10, spreadX: 2, spreadZ: 1.5 },
    ];
    const riverEntryOrder = [0, 1, 0, 2];
    let nextRiverEntry = 0;
    const spawnRiverParticle = () => {
      const entry = riverEntries[riverEntryOrder[nextRiverEntry]];
      nextRiverEntry = (nextRiverEntry + 1) % riverEntryOrder.length;
      const x = (entry.x + (Math.random() - 0.5) * 2 * entry.spreadX) * (cells - 1) / 255;
      const z = (entry.z + (Math.random() - 0.5) * 2 * entry.spreadZ) * (cells - 1) / 255;
      return makeParticle(x, z);
    };
    const updateParticles = (delta) => {
      simulationTime += delta;
      for (let i = particles.length - 1; i >= 0; i -= 1) {
        const particle = particles[i];
        particle.age += delta;
        if (edgeCell(particle.x, particle.z)) {
          particles.splice(i, 1);
          continue;
        }
        for (let substep = 0; substep < 3; substep += 1) {
          if (edgeCell(particle.x, particle.z)) break;
          visitCell(particle);
          const current = surfaceAt(particle.x, particle.z);
          const step = Math.min(0.65, 25 * delta);
          let bestDrop = 0;
          let bestX = 0, bestZ = 0;
          // Every direction is sampled against the changing water surface.
          for (let direction = 0; direction < 16; direction += 1) {
            const angle = direction * Math.PI / 8;
            const dx = Math.cos(angle), dz = Math.sin(angle);
            const drop = current - surfaceAt(particle.x + dx * step, particle.z + dz * step);
            const alignment = dx * particle.dx + dz * particle.dz;
            const score = drop * (0.9 + Math.random() * 0.1 + Math.max(0, alignment) * 0.05);
            if (score > bestDrop) { bestDrop = score; bestX = dx; bestZ = dz; }
          }
          if (bestDrop > 0 && !particle.escape) {
            particle.x += bestX * step;
            particle.z += bestZ * step;
            particle.dx = bestX;
            particle.dz = bestZ;
          } else {
            // The priority-flood parent supplies the nearby spill direction,
            // never a precomputed particle path. Fill to that spill level in
            // one deposit so Manning drainage cannot keep the particle trapped.
            particle.escape ||= drainage.nextCell(particle.x, particle.z);
            if (particle.escape) {
              const [targetX, targetZ] = particle.escape;
              if (surfaceAt(targetX, targetZ) >= current) {
                const x = Math.round(particle.x), z = Math.round(particle.z);
                const index = z * cells + x;
                drainCell(index, x, z);
                const gapMetres = (surfaceAt(targetX, targetZ) - surfaceAt(particle.x, particle.z)) * elevationRange;
                // Bilinear sampling sees only part of the water added to this cell.
                const weight = (1 - Math.abs(particle.x - x)) * (1 - Math.abs(particle.z - z));
                const fillMetres = Math.max(precipitonVolume / cellArea, (gapMetres + 0.15) / weight);
                depositCell(x, z, fillMetres * cellArea);
              }
              if (surfaceAt(targetX, targetZ) >= surfaceAt(particle.x, particle.z)) break;
              const remaining = Math.hypot(targetX - particle.x, targetZ - particle.z);
              const fraction = Math.min(1, step / remaining);
              particle.dx = (targetX - particle.x) / remaining;
              particle.dz = (targetZ - particle.z) / remaining;
              particle.x += (targetX - particle.x) * fraction;
              particle.z += (targetZ - particle.z) * fraction;
              if (fraction === 1) particle.escape = null;
            }
          }
          particle.level = surfaceAt(particle.x, particle.z);
        }
        if (edgeCell(particle.x, particle.z)) {
          particles.splice(i, 1);
          continue;
        }
        particle.history.push([particle.x, particle.level, particle.z]);
        if (particle.history.length > trailLength) particle.history.shift();
      }
    };
    if (particlesReady) {
      for (let i = 0; i < 35; i += 1) {
        const particle = spawnParticle();
        if (particle) { particle.age = Math.random() * 0.8; particles.push(particle); }
      }
      for (let i = 0; i < 44; i += 1) {
        const particle = spawnRiverParticle();
        particle.age = Math.random() * 0.8;
        particles.push(particle);
      }
    }
    let nextSpawn = 0.15;
    const projection = new Float32Array(16), view = new Float32Array(16), mvp = new Float32Array(16);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let visible = true;
    let lastFrame = -Infinity;
    new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }).observe(canvas);
    const render = (time) => {
      if (!reducedMotion && time - lastFrame < 32) {
        requestAnimationFrame(render);
        return;
      }
      const delta = Math.min(0.05, (time - lastFrame) / 1000);
      lastFrame = time;
      const bounds = canvas.getBoundingClientRect();
      const scale = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.round(bounds.width * scale), height = Math.round(bounds.height * scale);
      if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
      if (visible) {
        gl.viewport(0, 0, width, height); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); gl.enable(gl.DEPTH_TEST); gl.enable(gl.CULL_FACE); gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        const theta = 0.55 + (reducedMotion ? 0 : time * 0.000055);
        perspective(projection, 0.72, width / height, 0.1, 10);
        const eyeX = 2.25 * Math.cos(theta), eyeZ = 2.25 * Math.sin(theta);
        lookAt(view, [eyeX, 2.15, eyeZ], [0, -0.12, 0]); multiply(mvp, projection, view);
        gl.useProgram(program); gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer); gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 3, gl.FLOAT, false, 24, 0); gl.enableVertexAttribArray(normal); gl.vertexAttribPointer(normal, 3, gl.FLOAT, false, 24, 12); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer); gl.uniformMatrix4fv(mvpLocation, false, mvp); gl.uniform3f(lightLocation, -0.65, 0.82, 0.48); gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
        if (!reducedMotion && particlesReady) {
          updateParticles(delta);
          nextSpawn -= delta;
          while (nextSpawn <= 0 && particles.length < maxParticles) {
            const particle = Math.random() < 0.75 ? spawnRiverParticle() : spawnParticle();
            if (particle) particles.push(particle);
            nextSpawn += 0.025 + Math.random() * 0.045;
          }
          if (particles.length === maxParticles) nextSpawn = Math.max(0, nextSpawn);
          if (waterReady && wetCells.length) {
            if (time - lastWaterUpload > 120) {
              updateWaterMesh();
              lastWaterUpload = time;
            }
            gl.depthMask(false);
            gl.useProgram(waterProgram);
            gl.bindBuffer(gl.ARRAY_BUFFER, waterBuffer);
            gl.enableVertexAttribArray(waterPosition);
            gl.vertexAttribPointer(waterPosition, 3, gl.FLOAT, false, 28, 0);
            gl.enableVertexAttribArray(waterNormal);
            gl.vertexAttribPointer(waterNormal, 3, gl.FLOAT, false, 28, 12);
            gl.enableVertexAttribArray(waterDepthAttribute);
            gl.vertexAttribPointer(waterDepthAttribute, 1, gl.FLOAT, false, 28, 24);
            gl.uniformMatrix4fv(waterMvp, false, mvp);
            gl.uniform3f(waterLight, -0.65, 0.82, 0.48);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
            gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
            gl.depthMask(true);
          }
          let count = 0;
          for (const particle of particles) {
            const fadeIn = Math.min(1, particle.age / 0.3);
            for (let i = 0; i < particle.history.length; i += 1) {
              const point = particle.history[i];
              const tail = (i + 1) / particle.history.length;
              const offset = count * 5;
              particleData[offset] = (point[0] / (cells - 1) - 0.5) * 2.25;
              particleData[offset + 1] = (point[1] - 0.48) * 1.05 + 0.015;
              particleData[offset + 2] = (point[2] / (cells - 1) - 0.5) * 2.25;
              particleData[offset + 3] = fadeIn * Math.pow(tail, 1.25) * 0.58;
              particleData[offset + 4] = 1.0 + tail * 1.8;
              count += 1;
            }
          }
          if (count) {
            gl.depthMask(false);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            gl.useProgram(particleProgram);
            gl.bindBuffer(gl.ARRAY_BUFFER, particleBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, particleData.subarray(0, count * 5), gl.DYNAMIC_DRAW);
            gl.enableVertexAttribArray(particlePosition);
            gl.vertexAttribPointer(particlePosition, 3, gl.FLOAT, false, 20, 0);
            gl.enableVertexAttribArray(particleOpacity);
            gl.vertexAttribPointer(particleOpacity, 1, gl.FLOAT, false, 20, 12);
            gl.enableVertexAttribArray(particleSize);
            gl.vertexAttribPointer(particleSize, 1, gl.FLOAT, false, 20, 16);
            gl.uniformMatrix4fv(particleMvp, false, mvp);
            gl.uniform1f(particlePixelRatio, scale);
            gl.drawArrays(gl.POINTS, 0, count);
            gl.depthMask(true);
          }
        }
      }
      if (!reducedMotion) requestAnimationFrame(render);
    };
    requestAnimationFrame(render);
  };
})();
