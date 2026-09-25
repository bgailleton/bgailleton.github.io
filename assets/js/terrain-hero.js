(() => {
  const canvas = document.querySelector('[data-terrain-hero]');
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
    const cells = 128;
    source.width = cells;
    source.height = cells;
    const context = source.getContext('2d', { willReadFrequently: true });
    context.drawImage(image, 0, 0, cells, cells);
    const pixels = context.getImageData(0, 0, cells, cells).data;
    const heightAt = (x, z) => pixels[(Math.max(0, Math.min(cells - 1, z)) * cells + Math.max(0, Math.min(cells - 1, x))) * 4] / 255;
    const vertices = new Float32Array(cells * cells * 6);
    const indices = new Uint16Array((cells - 1) * (cells - 1) * 6);
    let vertex = 0;
    for (let z = 0; z < cells; z += 1) {
      for (let x = 0; x < cells; x += 1) {
        const h = heightAt(x, z);
        const left = heightAt(x - 1, z), right = heightAt(x + 1, z);
        const down = heightAt(x, z - 1), up = heightAt(x, z + 1);
        let nx = (left - right) * 2.8, ny = 2 / cells, nz = (down - up) * 2.8;
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
    const projection = new Float32Array(16), view = new Float32Array(16), mvp = new Float32Array(16);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let visible = true;
    new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }).observe(canvas);
    const render = (time) => {
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
      }
      if (!reducedMotion) requestAnimationFrame(render);
    };
    requestAnimationFrame(render);
  };
})();
