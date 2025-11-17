
// Minimal WebGL1 LisFlood-like shallow water demo.

const NX = 256, NY = 256;

const canvas = document.getElementById('simCanvas');
const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

if (!gl) {
  alert("WebGL not available.");
  throw new Error("WebGL not available");
}

// Extensions needed for float textures and rendering to them
const extFloat = gl.getExtension('OES_texture_float');
const extColorFloat = gl.getExtension('WEBGL_color_buffer_float') ||
                      gl.getExtension('EXT_color_buffer_float');

if (!extFloat || !extColorFloat) {
  alert("Required float texture extensions not supported on this device.");
  throw new Error("Float texture extensions not supported");
}

function createFloatTexture(width, height, data = null) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(
    gl.TEXTURE_2D, 0, gl.RGBA,
    width, height, 0,
    gl.RGBA, gl.FLOAT, data
  );
  return tex;
}

function createDEMTextureFromImage(img) {
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = NX;
  tempCanvas.height = NY;
  const ctx = tempCanvas.getContext('2d');
  ctx.drawImage(img, 0, 0, NX, NY);
  const imgData = ctx.getImageData(0, 0, NX, NY);

  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(
    gl.TEXTURE_2D, 0, gl.RGBA,
    NX, NY, 0,
    gl.RGBA, gl.UNSIGNED_BYTE, imgData.data
  );
  return tex;
}

function compileShader(src, type) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(sh));
    throw new Error("Shader compile error");
  }
  return sh;
}

function createProgram(vsSrc, fsSrc) {
  const vs = compileShader(vsSrc, gl.VERTEX_SHADER);
  const fs = compileShader(fsSrc, gl.FRAGMENT_SHADER);
  const p = gl.createProgram();
  gl.attachShader(p, vs);
  gl.attachShader(p, fs);
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(p));
    throw new Error("Program link error");
  }
  return p;
}

// Full-screen quad
const quadBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
gl.bufferData(
  gl.ARRAY_BUFFER,
  new Float32Array([
    -1, -1,  0, 0,
     1, -1,  1, 0,
    -1,  1,  0, 1,
     1,  1,  1, 1
  ]),
  gl.STATIC_DRAW
);

const vertexShaderSrc = `
attribute vec2 aPos;
attribute vec2 aUV;
varying vec2 vUV;
void main() {
    vUV = aUV;
    gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

// Flow routing shader
const flowRouteFragSrc = `
precision highp float;
varying vec2 vUV;

uniform sampler2D uH;
uniform sampler2D uZ;
uniform sampler2D uQ;

uniform vec2  uGridSize;
uniform vec2  uTexelSize;

uniform float uDX;
uniform float uDT;
uniform float uGravity;
uniform float uManning;
uniform float uHFLOW_THRESHOLD;
uniform float uFroudeLimit;

uniform float uZMin;
uniform float uZScale;

void main() {
    vec2 fragCoord = vUV * uGridSize;
    float col = floor(fragCoord.x);
    float row = floor(fragCoord.y);

    vec2 uv = (floor(fragCoord) + 0.5) / uGridSize;

    vec2 uvL = uv - vec2(uTexelSize.x, 0.0);
    vec2 uvR = uv + vec2(uTexelSize.x, 0.0);
    vec2 uvT = uv + vec2(0.0, uTexelSize.y);
    vec2 uvB = uv - vec2(0.0, uTexelSize.y);

    uvL.x = max(uvL.x, 0.5 * uTexelSize.x);
    uvR.x = min(uvR.x, 1.0 - 0.5 * uTexelSize.x);
    uvB.y = max(uvB.y, 0.5 * uTexelSize.y);
    uvT.y = min(uvT.y, 1.0 - 0.5 * uTexelSize.y);

    float h   = texture2D(uH, uv).r;
    float hL  = texture2D(uH, uvL).r;
    float hR  = texture2D(uH, uvR).r;
    float hT  = texture2D(uH, uvT).r;
    float hB  = texture2D(uH, uvB).r;

    float z    = uZMin + uZScale * texture2D(uZ, uv).r;
    float zL   = uZMin + uZScale * texture2D(uZ, uvL).r;
    float zR   = uZMin + uZScale * texture2D(uZ, uvR).r;
    float zT   = uZMin + uZScale * texture2D(uZ, uvT).r;
    float zB   = uZMin + uZScale * texture2D(uZ, uvB).r;

    vec2 Q = texture2D(uQ, uv).rg;
    float qx = Q.r;
    float qy = Q.g;

    // Y-direction (bottom-top)
    float hflowY = max(z + h, zB + hB) - max(z, zB);
    if ((h > 0.0 || hB > 0.0) && (hflowY > uHFLOW_THRESHOLD)) {
        float surf   = z + h;
        float surfB  = zB + hB;
        float tempslopeY = (surfB - surf) / uDX;

        float denomY = 1.0 + uGravity * hflowY * uDT * (uManning * uManning)
                             * abs(qy) / pow(hflowY, 10.0 / 3.0);
        qy = (qy - (uGravity * hflowY * uDT * tempslopeY)) / denomY;

        float froudeVel = sqrt(uGravity * hflowY) * uFroudeLimit;
        float velY = qy / hflowY;
        float FrY = abs(velY) / sqrt(uGravity * hflowY);
        if (FrY > uFroudeLimit) {
            qy = sign(qy) * hflowY * froudeVel;
        }

        float max_transfer_i   = (h * uDX) / 5.0;
        float max_transfer_bot = (hB * uDX) / 5.0;
        if (qy > 0.0) {
            if ((qy * uDT / uDX) > (h / 4.0))
                qy = max_transfer_i / uDT;
        } else if (qy < 0.0) {
            if (abs(qy * uDT / uDX) > (hB / 4.0))
                qy = -max_transfer_bot / uDT;
        }
    } else {
        qy = 0.0;
    }

    // X-direction (left-right)
    float hflowX = max(z + h, zL + hL) - max(z, zL);
    if ((h > 0.0 || hL > 0.0) && (hflowX > uHFLOW_THRESHOLD)) {
        float surf  = z + h;
        float surfL = zL + hL;
        float tempslopeX = (surfL - surf) / uDX;

        float denomX = 1.0 + uGravity * hflowX * uDT * (uManning * uManning)
                             * abs(qx) / pow(hflowX, 10.0 / 3.0);
        qx = (qx - (uGravity * hflowX * uDT * tempslopeX)) / denomX;

        float froudeVelX = sqrt(uGravity * hflowX) * uFroudeLimit;
        float velX = qx / hflowX;
        float FrX = abs(velX) / sqrt(uGravity * hflowX);
        if (FrX > uFroudeLimit) {
            qx = sign(qx) * hflowX * froudeVelX;
        }

        float max_transfer_i    = (h * uDX) / 5.0;
        float max_transfer_left = (hL * uDX) / 5.0;
        if (qx > 0.0) {
            if ((qx * uDT / uDX) > (h / 4.0))
                qx = max_transfer_i / uDT;
        } else if (qx < 0.0) {
            if (abs(qx * uDT / uDX) > (hL / 4.0))
                qx = -max_transfer_left / uDT;
        }
    } else {
        qx = 0.0;
    }

    // Boundary conditions
    if (row <= 0.5 || row >= (uGridSize.y - 1.5)) {
        qy = 0.0; // top/bottom: no normal flow
    }
    if (col <= 0.5) {
        qx = 0.0; // left: no normal flow
    }
    // right: open (no inflow enforced via depth update)

    gl_FragColor = vec4(qx, qy, 0.0, 1.0);
}
`;

const depthUpdateFragSrc = `
precision highp float;
varying vec2 vUV;

uniform sampler2D uH;
uniform sampler2D uQ;

uniform vec2 uGridSize;
uniform vec2 uTexelSize;

uniform float uDX;
uniform float uDT;

void main() {
    vec2 fragCoord = vUV * uGridSize;
    float col = floor(fragCoord.x);
    float row = floor(fragCoord.y);

    vec2 uv = (floor(fragCoord) + 0.5) / uGridSize;

    vec2 uvR = uv + vec2(uTexelSize.x, 0.0);
    vec2 uvB = uv - vec2(0.0, uTexelSize.y);

    uvR.x = min(uvR.x, 1.0 - 0.5 * uTexelSize.x);
    uvB.y = max(uvB.y, 0.5 * uTexelSize.y);

    float h = texture2D(uH, uv).r;
    vec2 Q  = texture2D(uQ, uv).rg;
    float qx = Q.r;
    float qy = Q.g;

    float qxR = texture2D(uQ, uvR).r;
    float qyB = texture2D(uQ, uvB).g;

    float tqy = -qy;
    if (row > 0.5) {
        tqy += qyB;
    }
    float tqx = -qx;
    if (col < (uGridSize.x - 1.5)) {
        tqx += qxR;
    }

    float dh = uDT * (tqx + tqy) / uDX;
    h += dh;
    h = max(h, 0.0);
    gl_FragColor = vec4(h, 0.0, 0.0, 1.0);
}
`;

const displayFragSrc = `
precision highp float;
varying vec2 vUV;

uniform sampler2D uH;
uniform sampler2D uZ;
uniform float uZMin;
uniform float uZScale;

void main() {
    float h = texture2D(uH, vUV).r;
    float z = uZMin + uZScale * texture2D(uZ, vUV).r;
    float eta = z + h;

    float terrain = (eta - uZMin) / (uZScale + 1e-6);
    terrain = clamp(terrain, 0.0, 1.0);

    vec3 col = vec3(terrain);
    col = mix(col, vec3(0.0, 0.3, 1.0), clamp(h * 10.0, 0.0, 1.0));

    gl_FragColor = vec4(col, 1.0);
}
`;

let texZ;
let texH = [];
let texQ = [];
let fb;

let progFlow, progDepth, progDisplay;
let hRead = 0, hWrite = 1;
let qRead = 0, qWrite = 1;

function bindQuadAttribs(program) {
  const locPos = gl.getAttribLocation(program, 'aPos');
  const locUV  = gl.getAttribLocation(program, 'aUV');
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
  gl.enableVertexAttribArray(locPos);
  gl.vertexAttribPointer(locPos, 2, gl.FLOAT, false, 16, 0);
  gl.enableVertexAttribArray(locUV);
  gl.vertexAttribPointer(locUV, 2, gl.FLOAT, false, 16, 8);
}

function addInitialWater() {
  const data = new Float32Array(NX * NY * 4);
  const h0 = 0.01;
  for (let i = 0; i < NX * NY; ++i) {
    data[4*i + 0] = h0;
  }
  gl.bindTexture(gl.TEXTURE_2D, texH[hRead]);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, NX, NY, 0, gl.RGBA, gl.FLOAT, data);
}

function initSimulation(img) {
  texZ = createDEMTextureFromImage(img);

  const zeros = new Float32Array(NX * NY * 4);
  texH[0] = createFloatTexture(NX, NY, zeros);
  texH[1] = createFloatTexture(NX, NY, zeros);
  texQ[0] = createFloatTexture(NX, NY, zeros);
  texQ[1] = createFloatTexture(NX, NY, zeros);

  fb = gl.createFramebuffer();

  progFlow    = createProgram(vertexShaderSrc, flowRouteFragSrc);
  progDepth   = createProgram(vertexShaderSrc, depthUpdateFragSrc);
  progDisplay = createProgram(vertexShaderSrc, displayFragSrc);

  addInitialWater();
  requestAnimationFrame(step);
}

function step() {
  const DT  = 0.5;
  const DX  = 1.0;
  const g   = 9.81;
  const n   = 0.03;
  const hflowThresh = 1e-4;
  const froudeLim   = 0.9;

  const zMin = 0.0;
  const zMax = 100.0;
  const zScale = zMax - zMin;

  // Flow routing
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.useProgram(progFlow);
  bindQuadAttribs(progFlow);

  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texQ[qWrite], 0);
  gl.viewport(0, 0, NX, NY);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texH[hRead]);
  gl.uniform1i(gl.getUniformLocation(progFlow, "uH"), 0);

  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, texZ);
  gl.uniform1i(gl.getUniformLocation(progFlow, "uZ"), 1);

  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_2D, texQ[qRead]);
  gl.uniform1i(gl.getUniformLocation(progFlow, "uQ"), 2);

  gl.uniform2f(gl.getUniformLocation(progFlow, "uGridSize"), NX, NY);
  gl.uniform2f(gl.getUniformLocation(progFlow, "uTexelSize"), 1.0 / NX, 1.0 / NY);
  gl.uniform1f(gl.getUniformLocation(progFlow, "uDX"), DX);
  gl.uniform1f(gl.getUniformLocation(progFlow, "uDT"), DT);
  gl.uniform1f(gl.getUniformLocation(progFlow, "uGravity"), g);
  gl.uniform1f(gl.getUniformLocation(progFlow, "uManning"), n);
  gl.uniform1f(gl.getUniformLocation(progFlow, "uHFLOW_THRESHOLD"), hflowThresh);
  gl.uniform1f(gl.getUniformLocation(progFlow, "uFroudeLimit"), froudeLim);
  gl.uniform1f(gl.getUniformLocation(progFlow, "uZMin"), zMin);
  gl.uniform1f(gl.getUniformLocation(progFlow, "uZScale"), zScale);

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  // Depth update
  gl.useProgram(progDepth);
  bindQuadAttribs(progDepth);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texH[hWrite], 0);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texH[hRead]);
  gl.uniform1i(gl.getUniformLocation(progDepth, "uH"), 0);

  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, texQ[qWrite]);
  gl.uniform1i(gl.getUniformLocation(progDepth, "uQ"), 1);

  gl.uniform2f(gl.getUniformLocation(progDepth, "uGridSize"), NX, NY);
  gl.uniform2f(gl.getUniformLocation(progDepth, "uTexelSize"), 1.0 / NX, 1.0 / NY);
  gl.uniform1f(gl.getUniformLocation(progDepth, "uDX"), DX);
  gl.uniform1f(gl.getUniformLocation(progDepth, "uDT"), DT);

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  // Ping-pong swap
  [hRead, hWrite] = [hWrite, hRead];
  [qRead, qWrite] = [qWrite, qRead];

  // Display pass
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.useProgram(progDisplay);
  bindQuadAttribs(progDisplay);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texH[hRead]);
  gl.uniform1i(gl.getUniformLocation(progDisplay, "uH"), 0);

  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, texZ);
  gl.uniform1i(gl.getUniformLocation(progDisplay, "uZ"), 1);

  gl.uniform1f(gl.getUniformLocation(progDisplay, "uZMin"), zMin);
  gl.uniform1f(gl.getUniformLocation(progDisplay, "uZScale"), zScale);

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  requestAnimationFrame(step);
}

const img = document.getElementById('demImg');
img.onload = () => initSimulation(img);
