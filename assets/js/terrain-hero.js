(() => {
  const canvas = document.querySelector('[data-terrain-hero]');
  const contourCanvas = document.querySelector('[data-contour-field]');
  if (!canvas) return;

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
      float core = 1.0 - smoothstep(0.02, 0.18, radius);
      vec3 colour = mix(vec3(0.0, 0.72, 0.9), vec3(0.78, 1.0, 1.0), core);
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
    // Fill enclosed lows once, then add a tiny gradient across the resulting flats.
    // This is a drainage surface, not a stored particle path.
    const buildDrainage = () => {
      const count = cells * cells;
      const filled = new Float32Array(count);
      const distance = new Uint16Array(count);
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
            distance[neighbor] = distance[index] + 1;
            parent[neighbor] = index;
            push(neighbor, filled[neighbor]);
          }
        }
      }
      const valueAt = (array, x, z) => array[Math.max(0, Math.min(cells - 1, z)) * cells + Math.max(0, Math.min(cells - 1, x))];
      const sample = (array, x, z) => {
        const x0 = Math.floor(x), z0 = Math.floor(z);
        const fx = x - x0, fz = z - z0;
        return (valueAt(array, x0, z0) * (1 - fx) + valueAt(array, x0 + 1, z0) * fx) * (1 - fz)
          + (valueAt(array, x0, z0 + 1) * (1 - fx) + valueAt(array, x0 + 1, z0 + 1) * fx) * fz;
      };
      return {
        filledAt: (x, z) => sample(filled, x, z),
        potentialAt: (x, z) => sample(filled, x, z) + sample(distance, x, z) * 0.000001,
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
    const maxParticles = 120;
    const trailLength = 24;
    const particles = [];
    const particleData = new Float32Array(maxParticles * trailLength * 5);
    const particleBuffer = gl.createBuffer();
    const particlePosition = gl.getAttribLocation(particleProgram, 'aPosition');
    const particleOpacity = gl.getAttribLocation(particleProgram, 'aOpacity');
    const particleSize = gl.getAttribLocation(particleProgram, 'aSize');
    const particleMvp = gl.getUniformLocation(particleProgram, 'uMvp');
    const particlePixelRatio = gl.getUniformLocation(particleProgram, 'uPixelRatio');
    const spawnParticle = () => {
      for (let attempt = 0; attempt < 24; attempt += 1) {
        const x = 18 + Math.random() * (cells - 37);
        const z = 18 + Math.random() * (cells - 37);
        const height = sampleHeight(x, z);
        const slope = Math.hypot(sampleHeight(x + 1, z) - sampleHeight(x - 1, z), sampleHeight(x, z + 1) - sampleHeight(x, z - 1));
        if (height > 0.55 && slope > 0.003) {
          return { x, z, dx: 0, dz: 0, level: height, age: 0, escape: null, history: [] };
        }
      }
      return null;
    };
    const updateParticles = (delta) => {
      for (let i = particles.length - 1; i >= 0; i -= 1) {
        const particle = particles[i];
        particle.age += delta;
        if (particle.x < 3 || particle.z < 3 || particle.x > cells - 4 || particle.z > cells - 4) {
          particles.splice(i, 1);
          continue;
        }
        for (let substep = 0; substep < 2; substep += 1) {
          const spill = drainage.filledAt(particle.x, particle.z);
          if (particle.level < spill - 0.0001) {
            particle.level = Math.min(spill, particle.level + 0.45 * delta);
            continue;
          }
          const current = drainage.potentialAt(particle.x, particle.z);
          const step = Math.min(0.65, 25 * delta);
          let bestDrop = 0;
          let bestX = 0, bestZ = 0;
          // Re-sample the local drainage surface on every step. Small random
          // variations separate particles without sending them over ridges.
          for (let direction = 0; direction < 16; direction += 1) {
            const angle = direction * Math.PI / 8;
            const dx = Math.cos(angle), dz = Math.sin(angle);
            const drop = current - drainage.potentialAt(particle.x + dx * step, particle.z + dz * step);
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
            // A continuous slope can flatten at a cell corner. Cross only to
            // the next drainage cell, raising the particle above any small lip.
            particle.escape ||= drainage.nextCell(particle.x, particle.z);
            if (particle.escape) {
              const [targetX, targetZ] = particle.escape;
              const remaining = Math.hypot(targetX - particle.x, targetZ - particle.z);
              const fraction = Math.min(1, step / remaining);
              const nextX = particle.x + (targetX - particle.x) * fraction;
              const nextZ = particle.z + (targetZ - particle.z) * fraction;
              particle.level = Math.max(particle.level, sampleHeight(nextX, nextZ) + 0.0002);
              particle.dx = (targetX - particle.x) / remaining;
              particle.dz = (targetZ - particle.z) / remaining;
              particle.x = nextX;
              particle.z = nextZ;
              if (fraction === 1) particle.escape = null;
            }
          }
          if (!particle.escape) particle.level = Math.max(sampleHeight(particle.x, particle.z), drainage.filledAt(particle.x, particle.z));
        }
        particle.history.push([particle.x, particle.level, particle.z]);
        if (particle.history.length > trailLength) particle.history.shift();
      }
    };
    if (particlesReady) {
      for (let i = 0; i < 55; i += 1) {
        const particle = spawnParticle();
        if (particle) { particle.age = Math.random() * 0.8; particles.push(particle); }
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
        lookAt(view, [2.25 * Math.cos(theta), 2.15, 2.25 * Math.sin(theta)], [0, -0.12, 0]); multiply(mvp, projection, view);
        gl.useProgram(program); gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer); gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 3, gl.FLOAT, false, 24, 0); gl.enableVertexAttribArray(normal); gl.vertexAttribPointer(normal, 3, gl.FLOAT, false, 24, 12); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer); gl.uniformMatrix4fv(mvpLocation, false, mvp); gl.uniform3f(lightLocation, -0.65, 0.82, 0.48); gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
        if (!reducedMotion && particlesReady) {
          updateParticles(delta);
          nextSpawn -= delta;
          while (nextSpawn <= 0 && particles.length < maxParticles) {
            const particle = spawnParticle();
            if (particle) particles.push(particle);
            nextSpawn += 0.025 + Math.random() * 0.045;
          }
          if (particles.length === maxParticles) nextSpawn = Math.max(0, nextSpawn);
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
              particleData[offset + 3] = fadeIn * Math.pow(tail, 1.25) * 0.48;
              particleData[offset + 4] = 1.0 + tail * 1.8;
              count += 1;
            }
          }
          if (count) {
            gl.depthMask(false);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
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
