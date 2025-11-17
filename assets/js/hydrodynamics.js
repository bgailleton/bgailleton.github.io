const NX = 256;
const NY = 256;
const DT = 5e-1;
const DX = 10.0;
const GRAVITY = 9.81;
const MANNING = 0.035;
const HFLOW_THRESHOLD = 1e-4;
const FROUDE_LIMIT = 0.85;
const HILLSHADE_THRESHOLD = 0.1;
const DEFAULT_DEPTH_COLOR_SCALE = 2.5; // meters
const SUN_ZENITH_RAD = (34.0 * Math.PI) / 180.0; // slightly lower sun
const SUN_AZIMUTH_RAD = (90.0 * Math.PI) / 180.0; // ~25% slider position
const DEFAULT_HILL_EXAGGERATION = 1.5;
const DISPLAY_UPDATE_STEPS = 30;
const GRAPHFLOOD_DT = 2e-2;
const GRAPHFLOOD_ITERATIONS = 20;
const GRAPHFLOOD_WARMUP_ITERATIONS = 20;
const GRAPHFLOOD_MANNING = 0.033;
const GRAPHFLOOD_FILL_STEP = 1e-4;
const BC_DEFAULT = 0;
const BC_OUTFLOW = 1;
const SECONDS_PER_YEAR = 365 * 24 * 3600;
const PRECIP_DEFAULT_MM_PER_HR = 5;
const MAX_BOUNDARY_ENTRIES = 4;
const BOUNDARY_ENTRY_WINDOW = 10;
const MODE_TRANSIENT = 'transient';
const MODE_STATIONARY = 'stationary';
const DISPLAY_MODE_DEPTH = 'depth';
const DISPLAY_MODE_DISCHARGE = 'discharge';
const QW_SCALE_MIN = 0.1;
const QW_SCALE_MAX = 500;
const DEFAULT_QW_SCALE = 100;
const DEFAULT_QW_OPACITY = 0.65;

const vertexShaderSrc = `
attribute vec2 aPos;
attribute vec2 aUV;
varying vec2 vUV;
void main() {
  vUV = aUV;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

const flowRouteFragSrc = `
precision highp float;
varying vec2 vUV;

uniform sampler2D uH;
uniform sampler2D uZ;
uniform sampler2D uQ;

uniform vec2  uGridSize;

uniform float uDX;
uniform float uDT;
uniform float uGravity;
uniform float uManning;
uniform float uHFLOW_THRESHOLD;
uniform float uFroudeLimit;

uniform float uZMin;
uniform float uZScale;
uniform float uTemporalBlend;

void main() {
  vec2 fragCoord = vUV * uGridSize;
  float col = floor(fragCoord.x);
  float row = floor(fragCoord.y);

  vec2 uv = (vec2(col, row) + 0.5) / uGridSize;

  float rowN = row - 1.0;
  float rowS = row + 1.0;
  float colW = col - 1.0;
  float colE = col + 1.0;

  bool hasN = row >= 1.0;
  bool hasS = rowS <= (uGridSize.y - 1.0);
  bool hasW = col >= 1.0;
  bool hasE = colE <= (uGridSize.x - 1.0);

  vec2 uvN = vec2(col, rowN);
  vec2 uvS = vec2(col, rowS);
  vec2 uvW = vec2(colW, row);
  vec2 uvE = vec2(colE, row);

  vec2 uvNn = (uvN + 0.5) / uGridSize;
  vec2 uvSn = (uvS + 0.5) / uGridSize;
  vec2 uvWn = (uvW + 0.5) / uGridSize;
  vec2 uvEn = (uvE + 0.5) / uGridSize;

  float h  = texture2D(uH, uv).r;
  float hN = hasN ? texture2D(uH, uvNn).r : h;
  float hS = hasS ? texture2D(uH, uvSn).r : h;
  float hW = hasW ? texture2D(uH, uvWn).r : h;
  float hE = hasE ? texture2D(uH, uvEn).r : h;

  float z  = uZMin + uZScale * texture2D(uZ, uv).r;
  float zN = hasN ? uZMin + uZScale * texture2D(uZ, uvNn).r : z;
  float zS = hasS ? uZMin + uZScale * texture2D(uZ, uvSn).r : z;
  float zW = hasW ? uZMin + uZScale * texture2D(uZ, uvWn).r : z;
  float zE = hasE ? uZMin + uZScale * texture2D(uZ, uvEn).r : z;

  vec2 Q = texture2D(uQ, uv).rg;
  float qx = Q.r;
  float qy = Q.g;

  float hflowY = hasN ? (max(z + h, zN + hN) - max(z, zN)) : 0.0;
  if (hasN && (h > 0.0 || hN > 0.0) && (hflowY > uHFLOW_THRESHOLD)) {
    float surf   = z + h;
    float surfN  = zN + hN;
    float slopeY = (surfN - surf) / uDX;

    float denomY = 1.0 + uGravity * hflowY * uDT * (uManning * uManning)
                         * abs(qy) / pow(hflowY, 10.0 / 3.0);
    qy = (qy - (uGravity * hflowY * uDT * slopeY)) / denomY;

    float froudeVel = sqrt(uGravity * hflowY) * uFroudeLimit;
    float velY = qy / (hflowY + 1e-6);
    float FrY = abs(velY) / sqrt(uGravity * hflowY + 1e-6);
    if (FrY > uFroudeLimit) {
      qy = sign(qy) * hflowY * froudeVel;
    }

    float max_transfer_i   = (h * uDX) / 5.0;
    float max_transfer_n   = (hN * uDX) / 5.0;
    if (qy > 0.0) {
      if ((qy * uDT / uDX) > (h / 4.0))
        qy = max_transfer_i / uDT;
    } else if (qy < 0.0) {
      if (abs(qy * uDT / uDX) > (hN / 4.0))
        qy = -max_transfer_n / uDT;
    }
  } else {
    qy = 0.0;
  }

  float hflowX = hasW ? (max(z + h, zW + hW) - max(z, zW)) : 0.0;
  if (hasW && (h > 0.0 || hW > 0.0) && (hflowX > uHFLOW_THRESHOLD)) {
    float surf  = z + h;
    float surfW = zW + hW;
    float slopeX = (surfW - surf) / uDX;

    float denomX = 1.0 + uGravity * hflowX * uDT * (uManning * uManning)
                         * abs(qx) / pow(hflowX, 10.0 / 3.0);
    qx = (qx - (uGravity * hflowX * uDT * slopeX)) / denomX;

    float froudeVelX = sqrt(uGravity * hflowX) * uFroudeLimit;
    float velX = qx / (hflowX + 1e-6);
    float FrX = abs(velX) / sqrt(uGravity * hflowX + 1e-6);
    if (FrX > uFroudeLimit) {
      qx = sign(qx) * hflowX * froudeVelX;
    }

    float max_transfer_i    = (h * uDX) / 5.0;
    float max_transfer_west = (hW * uDX) / 5.0;
    if (qx > 0.0) {
      if ((qx * uDT / uDX) > (h / 4.0))
        qx = max_transfer_i / uDT;
    } else if (qx < 0.0) {
      if (abs(qx * uDT / uDX) > (hW / 4.0))
        qx = -max_transfer_west / uDT;
    }
  } else {
    qx = 0.0;
  }

  bool atRightEdge = col >= (uGridSize.x - 1.5);
  if (row <= 0.5 || row >= (uGridSize.y - 1.5)) {
    qy = 0.0;
  }
  if (atRightEdge) {
    qx = 0.0;
    qy = 0.0;
  }

  float finalQx = mix(Q.r, qx, uTemporalBlend);
  float finalQy = mix(Q.g, qy, uTemporalBlend);
  gl_FragColor = vec4(finalQx, finalQy, 0.0, 1.0);
}
`;

const depthUpdateFragSrc = `
precision highp float;
varying vec2 vUV;

uniform sampler2D uH;
uniform sampler2D uQ;

uniform vec2 uGridSize;

uniform float uDX;
uniform float uDT;
uniform vec2 uInjectionCoord;
uniform float uInjectionRate;
uniform float uResetOutflow;
uniform float uOutflowRow;
uniform float uPrecipRate;
uniform float uNorthOutflow;
uniform float uWestEntryRows[${MAX_BOUNDARY_ENTRIES}];
uniform float uEastEntryRows[${MAX_BOUNDARY_ENTRIES}];
uniform float uNorthEntryCols[${MAX_BOUNDARY_ENTRIES}];
uniform float uSouthEntryCols[${MAX_BOUNDARY_ENTRIES}];
uniform float uEntrySpan;
const int ENTRY_COUNT = ${MAX_BOUNDARY_ENTRIES};

void main() {
  vec2 fragCoord = vUV * uGridSize;
  float col = floor(fragCoord.x);
  float row = floor(fragCoord.y);

  vec2 uv = (vec2(col, row) + 0.5) / uGridSize;

  float colE = col + 1.0;
  float rowS = row + 1.0;
  bool hasE = colE <= (uGridSize.x - 1.0);
  bool hasS = rowS <= (uGridSize.y - 1.0);

  vec2 uvE = (vec2(colE, row) + 0.5) / uGridSize;
  vec2 uvS = (vec2(col, rowS) + 0.5) / uGridSize;

  float h = texture2D(uH, uv).r;
  vec2 Q  = texture2D(uQ, uv).rg;
  float qx = Q.r;
  float qy = Q.g;

  float qxE = hasE ? texture2D(uQ, uvE).r : 0.0;
  float qyS = hasS ? texture2D(uQ, uvS).g : 0.0;

  float tqy = -qy;
  if (hasS) {
    tqy += qyS;
  }
  float tqx = -qx;
  if (hasE) {
    tqx += qxE;
  }

  float dh = uDT * (tqx + tqy) / uDX;
  h = max(h + dh, 0.0);

  if (abs(col - uInjectionCoord.x) < 0.5 && abs(row - uInjectionCoord.y) < 0.5) {
    h += uInjectionRate * uDT;
  }

  bool allowWest = false;
  bool allowEast = false;
  bool allowNorth = false;
  bool allowSouth = false;
  for (int i = 0; i < ENTRY_COUNT; i++) {
    if (uWestEntryRows[i] >= 0.0 && abs(row - uWestEntryRows[i]) <= uEntrySpan) {
      allowWest = true;
    }
    if (uEastEntryRows[i] >= 0.0 && abs(row - uEastEntryRows[i]) <= uEntrySpan) {
      allowEast = true;
    }
    if (uNorthEntryCols[i] >= 0.0 && abs(col - uNorthEntryCols[i]) <= uEntrySpan) {
      allowNorth = true;
    }
    if (uSouthEntryCols[i] >= 0.0 && abs(col - uSouthEntryCols[i]) <= uEntrySpan) {
      allowSouth = true;
    }
  }

  bool isOutflowCell = false;
  if (col < 0.5 && !allowWest) {
    isOutflowCell = true;
  }
  if (col > (uGridSize.x - 1.5) && !allowEast) {
    isOutflowCell = true;
  }
  if (uNorthOutflow > 0.5) {
    float northRow = uGridSize.y - 1.0;
    if ((northRow - row) < 0.5 && !allowNorth) {
      isOutflowCell = true;
    }
  }
  if (row < 0.5 && !allowSouth) {
    isOutflowCell = true;
  }
  if (uResetOutflow > 0.5) {
    float outCol = uGridSize.x - 1.0;
    if (abs(col - outCol) < 0.5) {
      float targetRow = clamp(uOutflowRow, 0.0, uGridSize.y - 1.0);
      if (abs(row - targetRow) < 0.5) {
        isOutflowCell = true;
      }
    }
  }

  if (!isOutflowCell) {
    h += uPrecipRate * uDT;
  } else {
    h = 0.0;
  }

  gl_FragColor = vec4(h, 0.0, 0.0, 1.0);
}
`;

const displayFragSrc = `
precision highp float;
varying vec2 vUV;

uniform sampler2D uH;
uniform sampler2D uZ;
uniform sampler2D uQ;
uniform float uZMin;
uniform float uZScale;
uniform float uDepthScale;
uniform vec2 uTexelSize;
uniform float uCellSize;
uniform float uHillshadeThreshold;
uniform float uZExaggeration;
uniform vec2 uGridSize;
uniform float uZenith;
uniform float uAzimuth;
uniform int uDisplayMode;
uniform float uQMinLog;
uniform float uQMaxLog;
uniform float uQOpacity;
uniform float uIsStationary;

vec3 depthToColor(float h) {
  float t = clamp(h / uDepthScale, 0.0, 1.0);
  vec3 shallow = vec3(0.95, 0.95, 1.0);
  vec3 deep = vec3(0.0, 0.1, 0.7);
  return mix(shallow, deep, pow(t, 0.7));
}

vec3 dischargeColor(float t) {
  vec3 light = vec3(0.96, 0.90, 0.99);
  vec3 dark = vec3(0.3, 0.0, 0.35);
  return mix(light, dark, pow(t, 0.85));
}

float sampleDEM(float col, float row) {
  vec2 uv = (vec2(col, row) + 0.5) / uGridSize;
  return uZMin + uZScale * texture2D(uZ, uv).r;
}

vec3 hillshade(vec2 texUV) {
  vec2 gridCoord = vec2(texUV.x * uGridSize.x, texUV.y * uGridSize.y);
  float col = floor(gridCoord.x);
  float row = floor(gridCoord.y);

  float colL = max(col - 1.0, 0.0);
  float colR = min(col + 1.0, uGridSize.x - 1.0);
  float rowN = max(row - 1.0, 0.0);
  float rowS = min(row + 1.0, uGridSize.y - 1.0);

  float center = sampleDEM(col, row);
  float left  = sampleDEM(colL, row);
  float right = sampleDEM(colR, row);
  float north = sampleDEM(col, rowN);
  float south = sampleDEM(col, rowS);

  float dzdx;
  if (col > 0.0 && col < (uGridSize.x - 1.0)) {
    dzdx = (right - left) / (2.0 * uCellSize);
  } else if (col > 0.0) {
    dzdx = (center - left) / uCellSize;
  } else if (col < (uGridSize.x - 1.0)) {
    dzdx = (right - center) / uCellSize;
  } else {
    dzdx = 0.0;
  }

  float dzdy;
  if (row > 0.0 && row < (uGridSize.y - 1.0)) {
    dzdy = (south - north) / (2.0 * uCellSize);
  } else if (row > 0.0) {
    dzdy = (center - north) / uCellSize;
  } else if (row < (uGridSize.y - 1.0)) {
    dzdy = (south - center) / uCellSize;
  } else {
    dzdy = 0.0;
  }

  dzdx *= uZExaggeration;
  dzdy *= uZExaggeration;

  float slopeRad = atan(sqrt(dzdx * dzdx + dzdy * dzdy));

  float aspectRad = 0.0;
  if (abs(dzdx) > 1e-6 || abs(dzdy) > 1e-6) {
    aspectRad = 0.5 * 3.141592653589793 - atan(dzdy, dzdx);
    if (aspectRad < 0.0) {
      aspectRad += 2.0 * 3.141592653589793;
    }
  }

  float cosSlope = cos(slopeRad);
  float sinSlope = sin(slopeRad);
  float cosZenith = cos(uZenith);
  float sinZenith = sin(uZenith);
  float cosAzAspect = cos(uAzimuth - aspectRad);

  float hill = cosZenith * cosSlope + sinZenith * sinSlope * cosAzAspect;
  hill = clamp(hill, 0.0, 1.0);
  return mix(vec3(0.1, 0.12, 0.16), vec3(0.92, 0.94, 0.97), hill);
}

float sampleDischarge(vec2 texUV) {
  vec4 qSample = texture2D(uQ, texUV);
  if (uIsStationary > 0.5) {
    return max(qSample.r, 0.0);
  }
  float qx = qSample.r;
  float qy = qSample.g;
  return sqrt(qx * qx + qy * qy);
}

void main() {
  vec2 texUV = vUV;
  vec3 base = hillshade(texUV);
  if (uDisplayMode == 0) {
    float h = texture2D(uH, texUV).r;
    if (h < uHillshadeThreshold) {
      gl_FragColor = vec4(base, 1.0);
      return;
    }
    vec3 water = depthToColor(h);
    gl_FragColor = vec4(mix(base, water, 0.85), 1.0);
    return;
  }
float discharge = sampleDischarge(texUV);
  float logVal = log(max(discharge, 1e-5)) / log(10.0);
  float denom = max(uQMaxLog - uQMinLog, 1e-6);
  float norm = clamp((logVal - uQMinLog) / denom, 0.0, 1.0);
  vec3 color = dischargeColor(norm);
  float opacity = clamp(uQOpacity, 0.0, 1.0);
  gl_FragColor = vec4(mix(base, color, opacity), 1.0);
}
`;

class MinHeap {
  constructor(capacity) {
    this.size = 0;
    this.nodes = new Uint32Array(capacity);
    this.keys = new Float32Array(capacity);
  }

  isEmpty() {
    return this.size === 0;
  }

  push(node, key) {
    let i = this.size;
    this.nodes[i] = node;
    this.keys[i] = key;
    this.size += 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.keys[parent] <= this.keys[i]) break;
      this.swap(i, parent);
      i = parent;
    }
  }

  pop() {
    if (this.size === 0) return null;
    const node = this.nodes[0];
    this.size -= 1;
    if (this.size > 0) {
      this.nodes[0] = this.nodes[this.size];
      this.keys[0] = this.keys[this.size];
      this.heapify(0);
    }
    return node;
  }

  swap(a, b) {
    const nodeTmp = this.nodes[a];
    const keyTmp = this.keys[a];
    this.nodes[a] = this.nodes[b];
    this.keys[a] = this.keys[b];
    this.nodes[b] = nodeTmp;
    this.keys[b] = keyTmp;
  }

  heapify(i) {
    while (true) {
      let smallest = i;
      const left = 2 * i + 1;
      const right = 2 * i + 2;
      if (left < this.size && this.keys[left] < this.keys[smallest]) {
        smallest = left;
      }
      if (right < this.size && this.keys[right] < this.keys[smallest]) {
        smallest = right;
      }
      if (smallest === i) break;
      this.swap(i, smallest);
      i = smallest;
    }
  }

  reset() {
    this.size = 0;
  }
}

class HydrodynamicsDemo {
  constructor(root) {
    this.root = root;
    this.canvas = root.querySelector('canvas');
    this.dischargeSlider = root.querySelector('[data-role="discharge-slider"]');
    this.depthSlider = root.querySelector('[data-role="depth-slider"]');
    this.metricLabel = root.querySelector('[data-role="metric-label"]');
    this.displayModeSelect = root.querySelector('[data-role="display-mode"]');
    this.sunDirSlider = root.querySelector('[data-role="sun-dir-slider"]');
    this.sunZenithSlider = root.querySelector('[data-role="sun-zenith-slider"]');
    this.hillContrastSlider = root.querySelector('[data-role="hill-contrast-slider"]');
    this.precipSlider = root.querySelector('[data-role="precip-slider"]');
    this.scaleBar = root.querySelector('[data-role="hydro-scale-bar"]');
    this.modeRadios = Array.from(root.querySelectorAll('[data-role="mode-input"]') || []);
    this.timeReadout = root.querySelector('[data-role="hydro-time"]');
    this.dischargeOutput = root.querySelector('[data-role="discharge-output"]');
    this.depthOutput = root.querySelector('[data-role="depth-output"]');
    this.precipOutput = root.querySelector('[data-role="precip-output"]');
    this.qOpacitySlider = root.querySelector('[data-role="qw-opacity-slider"]');
    this.qOpacityOutput = root.querySelector('[data-role="qw-opacity-output"]');
    this.qOpacityGroup = root.querySelector('[data-role="qw-opacity-group"]');
    this.discharge = Number(this.dischargeSlider?.value || 0);
    this.depthScale = Number(this.depthSlider?.value || DEFAULT_DEPTH_COLOR_SCALE);
    this.qDischargeScale = DEFAULT_QW_SCALE;
    this.hillExaggeration = Number(this.hillContrastSlider?.value || DEFAULT_HILL_EXAGGERATION);
    this.dischargeRate = this.convertDischargeToRate(this.discharge);
    this.mode = MODE_TRANSIENT;
    this.displayMode = DISPLAY_MODE_DEPTH;
    this.zMin = 0;
    this.zScale = 1;
    this.injectionCol = 0.0;
    this.injectionRow = (NY - 1) - 183.0;
    this.boundaryEntryWindow = BOUNDARY_ENTRY_WINDOW;
    this.entryWestRows = [this.injectionRow];
    this.entryEastRows = [];
    this.entryNorthCols = [];
    this.entrySouthCols = [];
    this.refreshBoundaryUniforms();
    this.precipRate = this.mmPerHourToMs(Number(this.precipSlider?.value || PRECIP_DEFAULT_MM_PER_HR));
    this.qOverlayOpacity = Number(this.qOpacitySlider?.value || DEFAULT_QW_OPACITY);
    this.qMinLog = -1.0;
    this.sunZenith = this.degToRad(Number(this.sunZenithSlider?.value || (SUN_ZENITH_RAD * 180 / Math.PI)));
    this.sunAzimuth = this.degToRad(Number(this.sunDirSlider?.value || (SUN_AZIMUTH_RAD * 180 / Math.PI)));
    this.animationFrame = null;
    this.simSteps = 0;
    this.iterationsSinceDisplay = 0;
    this.simTime = 0;
    this.pendingModeReset = null;
    this.iterationsSinceDisplay = 0;
    this.stationaryWarmupDone = false;
    this.graphFloodInitialized = false;
    this.graphFloodBusy = false;
    this.gfZ = null;
    this.gfH = null;
    this.gfTexBuffer = null;
    this.canvas.width = 512;
    this.canvas.height = 512;
    this.updateScaleBar = this.updateScaleBar.bind(this);

    this.setupControls();
    this.updateScaleBar();
    this.updateTimeReadout();
    window.addEventListener('resize', this.updateScaleBar);
    this.initGL();
    if (this.gl) {
      this.loadDEM();
    }
  }

  setupControls() {
    const setOutput = (node, text) => {
      if (!node) return;
      node.value = text;
      node.textContent = text;
    };

    if (this.modeRadios.length) {
      this.modeRadios.forEach((radio) => {
        if (radio.checked) {
          this.mode = radio.value;
        }
        radio.addEventListener('change', () => {
          if (!radio.checked || radio.value === this.mode) return;
          this.mode = radio.value;
          this.handleModeSwitch();
        });
      });
    }
    if (this.dischargeSlider && this.dischargeOutput) {
      const updateDischarge = () => {
        this.discharge = Number(this.dischargeSlider.value);
        this.dischargeRate = this.convertDischargeToRate(this.discharge);
        setOutput(this.dischargeOutput, `${this.discharge.toFixed(0)} m^3/s`);
      };
      this.dischargeSlider.addEventListener('input', updateDischarge);
      updateDischarge();
    }
    const syncMetricSliderView = () => {
      if (!this.depthSlider || !this.depthOutput) return;
      if (this.displayMode === DISPLAY_MODE_DISCHARGE) {
        this.depthSlider.min = `${QW_SCALE_MIN}`;
        this.depthSlider.max = `${QW_SCALE_MAX}`;
        this.depthSlider.step = '0.1';
        this.depthSlider.value = `${this.qDischargeScale}`;
        if (this.metricLabel) {
          this.metricLabel.textContent = 'Max discharge (m^3/s)';
        }
        if (this.qOpacityGroup) {
          this.qOpacityGroup.hidden = false;
        }
        setOutput(this.depthOutput, `${this.qDischargeScale.toFixed(1)} m^3/s`);
      } else {
        this.depthSlider.min = '0.5';
        this.depthSlider.max = '3';
        this.depthSlider.step = '0.1';
        this.depthSlider.value = `${this.depthScale}`;
        if (this.metricLabel) {
          this.metricLabel.textContent = 'Depth scale for blue (m)';
        }
        if (this.qOpacityGroup) {
          this.qOpacityGroup.hidden = true;
        }
        setOutput(this.depthOutput, `${this.depthScale.toFixed(1)} m`);
      }
    };
    if (this.depthSlider && this.depthOutput) {
      const handleMetricInput = () => {
        const value = Number(this.depthSlider.value);
        if (this.displayMode === DISPLAY_MODE_DISCHARGE) {
          this.qDischargeScale = Math.min(Math.max(value, QW_SCALE_MIN), QW_SCALE_MAX);
          setOutput(this.depthOutput, `${this.qDischargeScale.toFixed(1)} m^3/s`);
        } else {
          this.depthScale = Math.max(value, 0.1);
          setOutput(this.depthOutput, `${this.depthScale.toFixed(1)} m`);
        }
        if (this.gl) {
          this.renderDisplay();
        }
      };
      this.depthSlider.addEventListener('input', handleMetricInput);
    }
    if (this.displayModeSelect) {
      const updateDisplayMode = () => {
        this.displayMode = this.displayModeSelect.value || DISPLAY_MODE_DEPTH;
        syncMetricSliderView();
        if (this.gl) {
          this.renderDisplay();
        }
      };
      this.displayModeSelect.addEventListener('change', updateDisplayMode);
      updateDisplayMode();
    } else {
      syncMetricSliderView();
    }
    if (this.qOpacitySlider && this.qOpacityOutput) {
      const updateOpacity = () => {
        this.qOverlayOpacity = Math.min(Math.max(Number(this.qOpacitySlider.value), 0), 1);
        setOutput(this.qOpacityOutput, `${Math.round(this.qOverlayOpacity * 100)}%`);
        if (this.displayMode === DISPLAY_MODE_DISCHARGE && this.gl) {
          this.renderDisplay();
        }
      };
      this.qOpacitySlider.addEventListener('input', updateOpacity);
      updateOpacity();
    }
    if (this.sunDirSlider) {
      const updateDir = () => {
        const deg = Number(this.sunDirSlider.value);
        this.sunAzimuth = this.degToRad(deg);
      };
      this.sunDirSlider.addEventListener('input', updateDir);
      updateDir();
    }
    if (this.sunZenithSlider) {
      const updateZenith = () => {
        const deg = Number(this.sunZenithSlider.value);
        this.sunZenith = this.degToRad(deg);
      };
      this.sunZenithSlider.addEventListener('input', updateZenith);
      updateZenith();
    }
    if (this.hillContrastSlider) {
      const updateContrast = () => {
        this.hillExaggeration = Number(this.hillContrastSlider.value);
      };
      this.hillContrastSlider.addEventListener('input', updateContrast);
      updateContrast();
    }
    if (this.precipSlider && this.precipOutput) {
      const updatePrecip = () => {
        const mm = Number(this.precipSlider.value);
        this.precipRate = this.mmPerHourToMs(mm);
        setOutput(this.precipOutput, `${mm.toFixed(0)} mm/hr`);
      };
      this.precipSlider.addEventListener('input', updatePrecip);
      updatePrecip();
    } else {
      this.precipRate = this.mmPerHourToMs(PRECIP_DEFAULT_MM_PER_HR);
      if (this.precipOutput) {
        setOutput(this.precipOutput, `${PRECIP_DEFAULT_MM_PER_HR} mm/hr`);
      }
    }
  }

  convertDischargeToRate(discharge) {
    return discharge / (DX * DX);
  }

  degToRad(deg) {
    return (deg * Math.PI) / 180.0;
  }

  mmPerHourToMs(mmPerHour) {
    if (!Number.isFinite(mmPerHour)) return 0;
    return (mmPerHour / 1000) / 3600.0;
  }

  getCurrentQMaxLog() {
    const maxVal = Math.max(QW_SCALE_MIN, Math.min(QW_SCALE_MAX, this.qDischargeScale || QW_SCALE_MIN));
    return Math.log10(maxVal);
  }

  isValueWithinEntries(value, entries) {
    if (!entries || entries.length === 0) return false;
    for (let i = 0; i < entries.length; i += 1) {
      const entry = entries[i];
      if (entry == null || entry < 0) continue;
      if (Math.abs(value - entry) <= this.boundaryEntryWindow) {
        return true;
      }
    }
    return false;
  }

  isBoundaryEntryCell(row, col) {
    if (col === 0 && this.isValueWithinEntries(row, this.entryWestRows)) return true;
    if (col === (NX - 1) && this.isValueWithinEntries(row, this.entryEastRows)) return true;
    if (row === 0 && this.isValueWithinEntries(col, this.entrySouthCols)) return true;
    if (row === (NY - 1) && this.isValueWithinEntries(col, this.entryNorthCols)) return true;
    return false;
  }

  updateScaleBar() {
    if (!this.scaleBar || !this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const widthPx = rect.width || this.canvas.clientWidth || this.canvas.width || 0;
    const domainMeters = NX * DX;
    if (domainMeters <= 0) return;
    const pxPerMeter = widthPx / domainMeters;
    const barPx = Math.max(pxPerMeter * 100, 6);
    this.scaleBar.style.width = `${barPx}px`;
  }

  refreshBoundaryUniforms() {
    const fillEntries = (entries) => {
      const arr = new Float32Array(MAX_BOUNDARY_ENTRIES);
      for (let i = 0; i < MAX_BOUNDARY_ENTRIES; i += 1) {
        arr[i] = i < entries.length ? entries[i] : -1;
      }
      return arr;
    };
    this.boundaryUniforms = {
      west: fillEntries(this.entryWestRows),
      east: fillEntries(this.entryEastRows),
      north: fillEntries(this.entryNorthCols),
      south: fillEntries(this.entrySouthCols)
    };
  }

  updateTimeReadout() {
    if (!this.timeReadout) return;
    if (this.mode === MODE_STATIONARY) {
      this.timeReadout.textContent = '--';
      return;
    }
    const seconds = Math.max(this.simTime, 0);
    let text;
    if (seconds >= 600) {
      text = `${(seconds / 60).toFixed(1)} min`;
    } else {
      text = `${seconds.toFixed(1)} s`;
    }
    this.timeReadout.textContent = text;
  }

  handleModeSwitch() {
    const needsSeed = this.mode === MODE_TRANSIENT;
    if (!this.texH || !this.texQ) {
      this.pendingModeReset = needsSeed;
      return;
    }
    this.resetSimulation({ seed: needsSeed });
    this.pendingModeReset = null;
    this.stationaryWarmupDone = this.mode !== MODE_STATIONARY;
  }

  resetSimulation({ seed = true } = {}) {
    if (!this.gl || !this.texH || !this.texQ) return;
    const zeros = new Float32Array(NX * NY * 4);
    const gl = this.gl;
    [this.hRead, this.hWrite].forEach((idx) => {
      gl.bindTexture(gl.TEXTURE_2D, this.texH[idx]);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, NX, NY, 0, gl.RGBA, gl.FLOAT, zeros);
    });
    [this.qRead, this.qWrite].forEach((idx) => {
      gl.bindTexture(gl.TEXTURE_2D, this.texQ[idx]);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, NX, NY, 0, gl.RGBA, gl.FLOAT, zeros);
    });
    if (seed) {
      this.seedInitialWater(1e-3);
    }
    this.simSteps = 0;
    this.iterationsSinceDisplay = 0;
    this.simTime = 0;
    this.updateTimeReadout();
    this.stationaryWarmupDone = this.mode !== MODE_STATIONARY;
    this.graphFloodBusy = false;
    if (this.mode === MODE_STATIONARY) {
      this.ensureGraphFloodFields();
      this.resetGraphFloodState();
    }
  }

  initGL() {
    this.gl = this.canvas.getContext('webgl') || this.canvas.getContext('experimental-webgl');
    if (!this.gl) {
      this.root.classList.add('hydro-panel--unsupported');
      return;
    }
    const gl = this.gl;
    if (!gl.getExtension('OES_texture_float') ||
        !(gl.getExtension('WEBGL_color_buffer_float') || gl.getExtension('EXT_color_buffer_float'))) {
      this.root.classList.add('hydro-panel--unsupported');
      this.gl = null;
      return;
    }
    this.quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
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
  }

  waitForGeoTIFF() {
    if (window.GeoTIFF) {
      return Promise.resolve(window.GeoTIFF);
    }
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('GeoTIFF library failed to load')), 8000);
      const check = () => {
        if (window.GeoTIFF) {
          clearTimeout(timeout);
          resolve(window.GeoTIFF);
        } else {
          requestAnimationFrame(check);
        }
      };
      check();
    });
  }

  async loadDEM() {
    try {
      const GeoTIFFLib = await this.waitForGeoTIFF();
      const url = this.root.dataset.dem;
      const tiff = await GeoTIFFLib.fromUrl(url);
      const image = await tiff.getImage();
      const width = image.getWidth();
      const height = image.getHeight();
      if (width !== NX || height !== NY) {
        console.warn('[Hydrodynamics] DEM dimensions differ from shader grid:', width, height);
      }
      const noDataValue = image.getGDALNoData();
      const raster = await image.readRasters({ interleave: true, samples: [0] });
      const floatData = raster instanceof Float32Array ? raster : new Float32Array(raster);
      const { texture, min, max, demArray } = this.createDEMTexture(floatData, width, height, noDataValue);
      this.texZ = texture;
      this.zMin = min;
      this.zScale = Math.max(max - min, 1e-5);
      this.demElevation = demArray;
      if (this.graphFloodInitialized && this.gfZ && demArray) {
        this.gfZ.set(demArray);
      }
      if (!this._demLogged) {
        console.info(
          '[Hydrodynamics] DEM elevations:',
          min.toFixed(2),
          '→',
          max.toFixed(2),
          'm'
        );
        this._demLogged = true;
      }
      this.initSimulation();
    } catch (err) {
      console.error('[Hydrodynamics] Failed to load DEM GeoTIFF:', err);
      this.root.classList.add('hydro-panel--unsupported');
    }
  }

  createFloatTexture(width, height, data = null) {
    const gl = this.gl;
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.FLOAT, data);
    return tex;
  }

  createDEMTexture(data, width, height, noDataValue = null) {
    if (!data || data.length !== width * height) {
      throw new Error('DEM raster size mismatch');
    }
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < data.length; i += 1) {
      let value = data[i];
      if (!Number.isFinite(value) || (noDataValue != null && value === noDataValue)) {
        value = 0;
      }
      data[i] = value;
      if (value < min) min = value;
      if (value > max) max = value;
    }
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      min = 0;
      max = 1;
    }
    const range = Math.max(max - min, 1e-5);
    const invRange = 1 / range;
    const texels = new Float32Array(width * height * 4);
    const demArray = new Float32Array(width * height);
    for (let row = 0; row < height; row += 1) {
      const srcRow = height - 1 - row;
      for (let col = 0; col < width; col += 1) {
        const srcIndex = srcRow * width + col;
        const dstIndex = row * width + col;
        const value = data[srcIndex];
        const norm = Math.min(Math.max((value - min) * invRange, 0), 1);
        const base = dstIndex * 4;
        texels[base] = norm;
        texels[base + 1] = norm;
        texels[base + 2] = norm;
        texels[base + 3] = 1.0;
        demArray[dstIndex] = value;
      }
    }
    const texture = this.createFloatTexture(width, height, texels);
    return { texture, min, max, demArray };
  }

  compileShader(source, type) {
    const gl = this.gl;
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(shader));
      throw new Error('Shader compile error');
    }
    return shader;
  }

  createProgram(vsSrc, fsSrc) {
    const gl = this.gl;
    const program = gl.createProgram();
    const vs = this.compileShader(vsSrc, gl.VERTEX_SHADER);
    const fs = this.compileShader(fsSrc, gl.FRAGMENT_SHADER);
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(program));
      throw new Error('Program link error');
    }
    return program;
  }

  bindQuad(program) {
    const gl = this.gl;
    const locPos = gl.getAttribLocation(program, 'aPos');
    const locUV = gl.getAttribLocation(program, 'aUV');
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.enableVertexAttribArray(locPos);
    gl.vertexAttribPointer(locPos, 2, gl.FLOAT, false, 16, 0);
    gl.enableVertexAttribArray(locUV);
    gl.vertexAttribPointer(locUV, 2, gl.FLOAT, false, 16, 8);
  }

  initSimulation() {
    const gl = this.gl;
    try {
      if (!this.texZ) {
        throw new Error('DEM texture not initialized');
      }
      const zeros = new Float32Array(NX * NY * 4);
      this.texH = [this.createFloatTexture(NX, NY, zeros), this.createFloatTexture(NX, NY, zeros)];
      this.texQ = [this.createFloatTexture(NX, NY, zeros), this.createFloatTexture(NX, NY, zeros)];
      this.fb = gl.createFramebuffer();
      this.progFlow = this.createProgram(vertexShaderSrc, flowRouteFragSrc);
      this.progDepth = this.createProgram(vertexShaderSrc, depthUpdateFragSrc);
      this.progDisplay = this.createProgram(vertexShaderSrc, displayFragSrc);
      this.hRead = 0;
      this.hWrite = 1;
      this.qRead = 0;
      this.qWrite = 1;
      this.seedInitialWater(1e-3);
      if (this.pendingModeReset != null) {
        this.resetSimulation({ seed: this.pendingModeReset });
        this.pendingModeReset = null;
      } else if (this.mode === MODE_STATIONARY) {
        this.resetSimulation({ seed: false });
      }
      this.step();
    } catch (err) {
      console.error(err);
      this.root.classList.add('hydro-panel--unsupported');
    }
  }

  seedInitialWater(depth) {
    const water = new Float32Array(NX * NY * 4);
    for (let i = 0; i < NX * NY; i += 1) {
      water[4 * i] = depth;
    }
    [this.hRead, this.hWrite].forEach((idx) => {
      this.gl.bindTexture(this.gl.TEXTURE_2D, this.texH[idx]);
      this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, NX, NY, 0, this.gl.RGBA, this.gl.FLOAT, water);
    });
  }

  ensureGraphFloodFields() {
    if (this.graphFloodInitialized && this.gfH) {
      return;
    }
    const cells = NX * NY;
    this.gfH = new Float32Array(cells);
    this.gfTexBuffer = new Float32Array(cells * 4);
    this.gfQTexBuffer = new Float32Array(cells * 4);
    this.gfZ = this.demElevation ? new Float32Array(this.demElevation) : new Float32Array(cells);
    this.gfZw = new Float32Array(cells);
    this.gfQwin = new Float32Array(cells);
    this.gfQwout = new Float32Array(cells);
    this.gfStack = new Uint32Array(cells);
    this.gfStackLength = 0;
    this.gfVisited = new Uint8Array(cells);
    this.gfBC = new Uint8Array(cells);
    for (let row = 0; row < NY; row += 1) {
      for (let col = 0; col < NX; col += 1) {
        const idx = row * NX + col;
        const atWest = col === 0;
        const atEast = col === NX - 1;
        const atSouth = row === 0;
        const atNorth = row === NY - 1;
        let isOutflow = false;
        if (atWest && !this.isValueWithinEntries(row, this.entryWestRows)) isOutflow = true;
        if (atEast && !this.isValueWithinEntries(row, this.entryEastRows)) isOutflow = true;
        if (atSouth && !this.isValueWithinEntries(col, this.entrySouthCols)) isOutflow = true;
        if (atNorth && !this.isValueWithinEntries(col, this.entryNorthCols)) isOutflow = true;
        this.gfBC[idx] = isOutflow ? BC_OUTFLOW : BC_DEFAULT;
      }
    }
    this.gfHeap = new MinHeap(cells);
    this.graphFloodInitialized = true;
    this.resetGraphFloodState();
  }

  resetGraphFloodState() {
    if (!this.gfH) return;
    this.gfH.fill(1e-3);
    if (this.gfQwin) this.gfQwin.fill(0);
    if (this.gfQwout) this.gfQwout.fill(0);
    this.syncGraphFloodTextures();
  }

  syncGraphFloodTextures() {
    if (!this.gl || !this.gfH || !this.gfTexBuffer || !this.texH || !this.gfQwin) return;
    const gl = this.gl;
    for (let i = 0; i < this.gfH.length; i += 1) {
      const base = i * 4;
      const h = this.gfH[i];
      this.gfTexBuffer[base] = h;
      this.gfTexBuffer[base + 1] = 0;
      this.gfTexBuffer[base + 2] = 0;
      this.gfTexBuffer[base + 3] = 1;
      if (this.gfQTexBuffer) {
        const q = this.gfQwin[i];
        this.gfQTexBuffer[base] = q;
        this.gfQTexBuffer[base + 1] = 0;
        this.gfQTexBuffer[base + 2] = 0;
        this.gfQTexBuffer[base + 3] = 1;
      }
    }
    [this.hRead, this.hWrite].forEach((idx) => {
      gl.bindTexture(gl.TEXTURE_2D, this.texH[idx]);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, NX, NY, 0, gl.RGBA, gl.FLOAT, this.gfTexBuffer);
    });
    if (this.texQ && this.gfQTexBuffer) {
      [this.qRead, this.qWrite].forEach((idx) => {
        gl.bindTexture(gl.TEXTURE_2D, this.texQ[idx]);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, NX, NY, 0, gl.RGBA, gl.FLOAT, this.gfQTexBuffer);
      });
    }
  }

  runGraphFloodIterationsCPU(iterations, { updateDepth = true } = {}) {
    if (!this.gfH || !this.gfZ || !this.gfZw || !this.gfQwin || !this.gfQwout || !this.gfStack) return;
    const cells = NX * NY;
    const cellArea = DX * DX;
    const precipVolume = this.precipRate * cellArea;
    const injIndex = Math.max(
      0,
      Math.min(cells - 1, Math.round(this.injectionRow) * NX + Math.round(this.injectionCol))
    );
    for (let iter = 0; iter < iterations; iter += 1) {
      for (let i = 0; i < cells; i += 1) {
        this.gfZw[i] = this.gfZ[i] + this.gfH[i];
      }
      this.computeGraphFloodOrdering();
      for (let i = 0; i < cells; i += 1) {
        this.gfQwin[i] = this.gfBC[i] === BC_OUTFLOW ? 0 : precipVolume;
      }
      this.gfQwout.fill(0);
      if (this.discharge > 0) {
        this.gfQwin[injIndex] += this.discharge;
      }
      const weights = [0, 0, 0, 0];
      for (let s = this.gfStackLength - 1; s >= 0; s -= 1) {
        const node = this.gfStack[s];
        if (this.gfBC[node] === BC_OUTFLOW) continue;
        const baseQ = this.gfQwin[node];
        let sumSlope = 0;
        let maxSlope = 0;
        const row = Math.floor(node / NX);
        const col = node - row * NX;
        // Gradients
        // 0: north
        if (row > 0) {
          const nIdx = node - NX;
          const slope = Math.max((this.gfZw[node] - this.gfZw[nIdx]) / DX, 0);
          weights[0] = slope > 0 ? slope * DX : 0;
          sumSlope += weights[0];
          if (slope > maxSlope) maxSlope = slope;
        } else {
          weights[0] = 0;
        }
        // 1: east
        if (col < NX - 1) {
          const eIdx = node + 1;
          const slope = Math.max((this.gfZw[node] - this.gfZw[eIdx]) / DX, 0);
          weights[1] = slope > 0 ? slope * DX : 0;
          sumSlope += weights[1];
          if (slope > maxSlope) maxSlope = slope;
        } else {
          weights[1] = 0;
        }
        // 2: west
        if (col > 0) {
          const wIdx = node - 1;
          const slope = Math.max((this.gfZw[node] - this.gfZw[wIdx]) / DX, 0);
          weights[2] = slope > 0 ? slope * DX : 0;
          sumSlope += weights[2];
          if (slope > maxSlope) maxSlope = slope;
        } else {
          weights[2] = 0;
        }
        // 3: south
        if (row < NY - 1) {
          const sIdx = node + NX;
          const slope = Math.max((this.gfZw[node] - this.gfZw[sIdx]) / DX, 0);
          weights[3] = slope > 0 ? slope * DX : 0;
          sumSlope += weights[3];
          if (slope > maxSlope) maxSlope = slope;
        } else {
          weights[3] = 0;
        }
        if (sumSlope > 0 && baseQ > 0) {
          const inv = 1 / sumSlope;
          if (weights[0] > 0 && row > 0) this.gfQwin[node - NX] += weights[0] * inv * baseQ;
          if (weights[1] > 0 && col < NX - 1) this.gfQwin[node + 1] += weights[1] * inv * baseQ;
          if (weights[2] > 0 && col > 0) this.gfQwin[node - 1] += weights[2] * inv * baseQ;
          if (weights[3] > 0 && row < NY - 1) this.gfQwin[node + NX] += weights[3] * inv * baseQ;
        }
        if (this.gfZw[node] > this.gfZ[node]) {
          const depth = this.gfZw[node] - this.gfZ[node];
          this.gfQwout[node] =
            (DX / GRAPHFLOOD_MANNING) *
            Math.pow(Math.max(depth, 0), 5 / 3) *
            Math.sqrt(Math.max(maxSlope, 1e-8));
        } else {
          this.gfQwout[node] = 0;
        }
      }
      if (updateDepth) {
        for (let i = 0; i < cells; i += 1) {
          const net = this.gfQwin[i] - this.gfQwout[i];
          const updated = Math.max(this.gfZ[i], this.gfZw[i] + GRAPHFLOOD_DT * net / cellArea);
          const row = Math.floor(i / NX);
          const col = i - row * NX;
          if (this.gfBC[i] === BC_OUTFLOW) {
            this.gfH[i] = 0;
            this.gfZw[i] = this.gfZ[i];
          } else {
            this.gfZw[i] = updated;
            this.gfH[i] = Math.max(0, updated - this.gfZ[i]);
          }
        }
      }
    }
  }

  computeGraphFloodOrdering() {
    if (!this.gfZw || !this.gfStack || !this.gfVisited || !this.gfHeap) return;
    const cells = NX * NY;
    this.gfVisited.fill(0);
    this.gfHeap.reset();
    this.gfStackLength = 0;
    for (let i = 0; i < cells; i += 1) {
      if (this.gfBC[i] === BC_OUTFLOW) {
        this.gfHeap.push(i, this.gfZw[i]);
        this.gfVisited[i] = 1;
      }
    }
    const dirs = [
      { dr: -1, dc: 0 },
      { dr: 0, dc: 1 },
      { dr: 0, dc: -1 },
      { dr: 1, dc: 0 }
    ];
    while (!this.gfHeap.isEmpty()) {
      const node = this.gfHeap.pop();
      this.gfStack[this.gfStackLength++] = node;
      const row = Math.floor(node / NX);
      const col = node - row * NX;
      for (let k = 0; k < dirs.length; k += 1) {
        const nr = row + dirs[k].dr;
        const nc = col + dirs[k].dc;
        if (nr < 0 || nr >= NY || nc < 0 || nc >= NX) continue;
        const idx = nr * NX + nc;
        if (this.gfVisited[idx]) continue;
        this.gfVisited[idx] = 1;
        let elev = this.gfZw[idx];
        const minElev = this.gfZw[node] + GRAPHFLOOD_FILL_STEP;
        if (elev <= minElev) {
          elev = minElev;
          this.gfZw[idx] = elev;
        }
        this.gfHeap.push(idx, elev);
      }
    }
    if (this.gfStackLength < cells) {
      for (let i = 0; i < cells; i += 1) {
        if (!this.gfVisited[i]) {
          this.gfStack[this.gfStackLength++] = i;
        }
      }
    }
  }

  getLisFloodConfig() {
    return {
      dt: DT,
      manning: MANNING,
      iterations: 1,
      displayInterval: DISPLAY_UPDATE_STEPS,
      resetOutflow: false,
      temporalBlend: 1
    };
  }

  step = () => {
    if (this.mode === MODE_STATIONARY) {
      this.stepGraphFlood();
    } else {
      this.stepLisFlood();
    }
    this.animationFrame = requestAnimationFrame(this.step);
  };

  stepLisFlood() {
    const gl = this.gl;
    if (!gl) return;
    const config = this.getLisFloodConfig();
    const shouldRender = this.runLisFloodIterations(config.iterations, config);
    if (shouldRender) {
      this.renderDisplay();
    }
  }

  stepGraphFlood() {
    if (this.graphFloodBusy) return;
    this.graphFloodBusy = true;
    setTimeout(() => {
      this.ensureGraphFloodFields();
      if (!this.stationaryWarmupDone) {
        this.runGraphFloodIterationsCPU(GRAPHFLOOD_WARMUP_ITERATIONS, { updateDepth: false });
        this.stationaryWarmupDone = true;
        this.simSteps = 0;
        this.simTime = 0;
        this.iterationsSinceDisplay = 0;
        this.graphFloodBusy = false;
        return;
      }
      this.runGraphFloodIterationsCPU(GRAPHFLOOD_ITERATIONS, { updateDepth: true });
      this.syncGraphFloodTextures();
      this.renderDisplay();
      this.graphFloodBusy = false;
    }, 0);
  }

  runLisFloodIterations(iterations, config, options = {}) {
    const gl = this.gl;
    if (!gl || iterations <= 0) return false;
    const {
      accumulateTime = true,
      temporalBlendOverride = null
    } = options;
    let shouldRender = false;
    const temporalBlend = temporalBlendOverride ?? config.temporalBlend ?? 1;

    for (let iter = 0; iter < iterations; iter += 1) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fb);

      gl.useProgram(this.progFlow);
      this.bindQuad(this.progFlow);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texQ[this.qWrite], 0);
      gl.viewport(0, 0, NX, NY);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.texH[this.hRead]);
      gl.uniform1i(gl.getUniformLocation(this.progFlow, 'uH'), 0);

      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.texZ);
      gl.uniform1i(gl.getUniformLocation(this.progFlow, 'uZ'), 1);

      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, this.texQ[this.qRead]);
      gl.uniform1i(gl.getUniformLocation(this.progFlow, 'uQ'), 2);

      gl.uniform2f(gl.getUniformLocation(this.progFlow, 'uGridSize'), NX, NY);
      gl.uniform2f(gl.getUniformLocation(this.progFlow, 'uTexelSize'), 1 / NX, 1 / NY);
      gl.uniform1f(gl.getUniformLocation(this.progFlow, 'uDX'), DX);
      gl.uniform1f(gl.getUniformLocation(this.progFlow, 'uDT'), config.dt);
      gl.uniform1f(gl.getUniformLocation(this.progFlow, 'uGravity'), GRAVITY);
      gl.uniform1f(gl.getUniformLocation(this.progFlow, 'uManning'), config.manning);
      gl.uniform1f(gl.getUniformLocation(this.progFlow, 'uHFLOW_THRESHOLD'), HFLOW_THRESHOLD);
      gl.uniform1f(gl.getUniformLocation(this.progFlow, 'uFroudeLimit'), FROUDE_LIMIT);
      gl.uniform1f(gl.getUniformLocation(this.progFlow, 'uZMin'), this.zMin);
      gl.uniform1f(gl.getUniformLocation(this.progFlow, 'uZScale'), this.zScale);
      gl.uniform1f(gl.getUniformLocation(this.progFlow, 'uTemporalBlend'), temporalBlend);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      gl.useProgram(this.progDepth);
      this.bindQuad(this.progDepth);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texH[this.hWrite], 0);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.texH[this.hRead]);
      gl.uniform1i(gl.getUniformLocation(this.progDepth, 'uH'), 0);

      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.texQ[this.qWrite]);
      gl.uniform1i(gl.getUniformLocation(this.progDepth, 'uQ'), 1);

      gl.uniform2f(gl.getUniformLocation(this.progDepth, 'uGridSize'), NX, NY);
      gl.uniform2f(gl.getUniformLocation(this.progDepth, 'uTexelSize'), 1 / NX, 1 / NY);
      gl.uniform1f(gl.getUniformLocation(this.progDepth, 'uDX'), DX);
      gl.uniform1f(gl.getUniformLocation(this.progDepth, 'uDT'), config.dt);
      gl.uniform1f(gl.getUniformLocation(this.progDepth, 'uInjectionRate'), Math.max(this.dischargeRate, 0));
      gl.uniform2f(gl.getUniformLocation(this.progDepth, 'uInjectionCoord'), this.injectionCol, this.injectionRow);
      gl.uniform1f(
        gl.getUniformLocation(this.progDepth, 'uResetOutflow'),
        config.resetOutflow ? 1.0 : 0.0
      );
      gl.uniform1f(gl.getUniformLocation(this.progDepth, 'uOutflowRow'), this.injectionRow);
      gl.uniform1f(gl.getUniformLocation(this.progDepth, 'uPrecipRate'), this.precipRate);
      gl.uniform1f(gl.getUniformLocation(this.progDepth, 'uNorthOutflow'), 1.0);
      const entryUniforms = this.boundaryUniforms;
      if (entryUniforms) {
        gl.uniform1fv(gl.getUniformLocation(this.progDepth, 'uWestEntryRows'), entryUniforms.west);
        gl.uniform1fv(gl.getUniformLocation(this.progDepth, 'uEastEntryRows'), entryUniforms.east);
        gl.uniform1fv(gl.getUniformLocation(this.progDepth, 'uNorthEntryCols'), entryUniforms.north);
        gl.uniform1fv(gl.getUniformLocation(this.progDepth, 'uSouthEntryCols'), entryUniforms.south);
      }
      gl.uniform1f(gl.getUniformLocation(this.progDepth, 'uEntrySpan'), this.boundaryEntryWindow);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      [this.hRead, this.hWrite] = [this.hWrite, this.hRead];
      [this.qRead, this.qWrite] = [this.qWrite, this.qRead];

      if (accumulateTime) {
        this.simTime += config.dt;
        this.simSteps += 1;
        this.iterationsSinceDisplay += 1;
        if (this.iterationsSinceDisplay >= config.displayInterval) {
          shouldRender = true;
          this.iterationsSinceDisplay %= config.displayInterval;
        }
      }
    }

    return shouldRender;
  }

  renderDisplay() {
    const gl = this.gl;
    if (!gl) return;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.useProgram(this.progDisplay);
    this.bindQuad(this.progDisplay);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texH[this.hRead]);
    gl.uniform1i(gl.getUniformLocation(this.progDisplay, 'uH'), 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.texZ);
    gl.uniform1i(gl.getUniformLocation(this.progDisplay, 'uZ'), 1);

    if (this.texQ) {
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, this.texQ[this.qRead]);
      gl.uniform1i(gl.getUniformLocation(this.progDisplay, 'uQ'), 2);
    }

    gl.uniform1f(gl.getUniformLocation(this.progDisplay, 'uZMin'), this.zMin);
    gl.uniform1f(gl.getUniformLocation(this.progDisplay, 'uZScale'), this.zScale);
    gl.uniform2f(gl.getUniformLocation(this.progDisplay, 'uTexelSize'), 1 / NX, 1 / NY);
    gl.uniform1f(gl.getUniformLocation(this.progDisplay, 'uCellSize'), DX);
    gl.uniform1f(gl.getUniformLocation(this.progDisplay, 'uHillshadeThreshold'), HILLSHADE_THRESHOLD);
    gl.uniform1f(gl.getUniformLocation(this.progDisplay, 'uDepthScale'), Math.max(this.depthScale, 0.1));
    gl.uniform1f(gl.getUniformLocation(this.progDisplay, 'uZExaggeration'), Math.max(this.hillExaggeration, 0.1));
    gl.uniform2f(gl.getUniformLocation(this.progDisplay, 'uGridSize'), NX, NY);
    gl.uniform1f(gl.getUniformLocation(this.progDisplay, 'uZenith'), this.sunZenith);
    gl.uniform1f(gl.getUniformLocation(this.progDisplay, 'uAzimuth'), this.sunAzimuth);
    gl.uniform1i(
      gl.getUniformLocation(this.progDisplay, 'uDisplayMode'),
      this.displayMode === DISPLAY_MODE_DISCHARGE ? 1 : 0
    );
    gl.uniform1f(gl.getUniformLocation(this.progDisplay, 'uQMinLog'), this.qMinLog);
    gl.uniform1f(gl.getUniformLocation(this.progDisplay, 'uQMaxLog'), this.getCurrentQMaxLog());
    const overlay = this.displayMode === DISPLAY_MODE_DISCHARGE ? this.qOverlayOpacity : 0.0;
    gl.uniform1f(gl.getUniformLocation(this.progDisplay, 'uQOpacity'), overlay);
    gl.uniform1f(gl.getUniformLocation(this.progDisplay, 'uIsStationary'), this.mode === MODE_STATIONARY ? 1.0 : 0.0);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    this.updateTimeReadout();
  }
}

const initHydroPanels = () => {
  document.querySelectorAll('[data-hydro-demo]').forEach((node) => {
    if (!node.__hydro) {
      node.__hydro = new HydrodynamicsDemo(node);
    }
  });
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initHydroPanels);
} else {
  initHydroPanels();
}
