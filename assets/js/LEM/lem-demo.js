import { RegularGrid } from './grid.js';
import { Neighbourer } from './neighbourer.js';
import { SPLModel } from './spl.js';

const VIEW_2D = '2d';
const VIEW_3D = '3d';
const PERLIN_SCALE_MIN = 1;
const PERLIN_SCALE_MAX = 50000;
const PERLIN_LOG_MIN = Math.log10(PERLIN_SCALE_MIN);
const PERLIN_LOG_MAX = Math.log10(PERLIN_SCALE_MAX);
const DEFAULT_Z_EXAGGERATION = 3;
const PLOT_Z = 'z';
const PLOT_A = 'a';
const K_LOG_MIN = -6;
const K_LOG_MAX = -1;
const KD_LOG_MIN = -5;
const KD_LOG_MAX = 0;

const perlinScaleFromSlider = (sliderValue) => {
  const t = clamp(Number(sliderValue), 0, 100) / 100;
  const exponent = PERLIN_LOG_MIN + (PERLIN_LOG_MAX - PERLIN_LOG_MIN) * t;
  return Math.pow(10, exponent);
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const createMat4 = () => new Float32Array(16);

const mat4Identity = (out) => {
  out[0] = 1; out[1] = 0; out[2] = 0; out[3] = 0;
  out[4] = 0; out[5] = 1; out[6] = 0; out[7] = 0;
  out[8] = 0; out[9] = 0; out[10] = 1; out[11] = 0;
  out[12] = 0; out[13] = 0; out[14] = 0; out[15] = 1;
  return out;
};

const mat4Multiply = (out, a, b) => {
  const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
  const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
  const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
  const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

  const b00 = b[0], b01 = b[1], b02 = b[2], b03 = b[3];
  const b10 = b[4], b11 = b[5], b12 = b[6], b13 = b[7];
  const b20 = b[8], b21 = b[9], b22 = b[10], b23 = b[11];
  const b30 = b[12], b31 = b[13], b32 = b[14], b33 = b[15];

  out[0] = b00 * a00 + b01 * a10 + b02 * a20 + b03 * a30;
  out[1] = b00 * a01 + b01 * a11 + b02 * a21 + b03 * a31;
  out[2] = b00 * a02 + b01 * a12 + b02 * a22 + b03 * a32;
  out[3] = b00 * a03 + b01 * a13 + b02 * a23 + b03 * a33;
  out[4] = b10 * a00 + b11 * a10 + b12 * a20 + b13 * a30;
  out[5] = b10 * a01 + b11 * a11 + b12 * a21 + b13 * a31;
  out[6] = b10 * a02 + b11 * a12 + b12 * a22 + b13 * a32;
  out[7] = b10 * a03 + b11 * a13 + b12 * a23 + b13 * a33;
  out[8] = b20 * a00 + b21 * a10 + b22 * a20 + b23 * a30;
  out[9] = b20 * a01 + b21 * a11 + b22 * a21 + b23 * a31;
  out[10] = b20 * a02 + b21 * a12 + b22 * a22 + b23 * a32;
  out[11] = b20 * a03 + b21 * a13 + b22 * a23 + b23 * a33;
  out[12] = b30 * a00 + b31 * a10 + b32 * a20 + b33 * a30;
  out[13] = b30 * a01 + b31 * a11 + b32 * a21 + b33 * a31;
  out[14] = b30 * a02 + b31 * a12 + b32 * a22 + b33 * a32;
  out[15] = b30 * a03 + b31 * a13 + b32 * a23 + b33 * a33;
  return out;
};

const mat4LookAt = (out, eye, center, up) => {
  let x0, x1, x2, y0, y1, y2, z0, z1, z2, len;
  const eyex = eye[0];
  const eyey = eye[1];
  const eyez = eye[2];
  const upx = up[0];
  const upy = up[1];
  const upz = up[2];
  const centerx = center[0];
  const centery = center[1];
  const centerz = center[2];

  if (
    Math.abs(eyex - centerx) < 1e-6 &&
    Math.abs(eyey - centery) < 1e-6 &&
    Math.abs(eyez - centerz) < 1e-6
  ) {
    return mat4Identity(out);
  }

  z0 = eyex - centerx;
  z1 = eyey - centery;
  z2 = eyez - centerz;
  len = 1 / Math.hypot(z0, z1, z2);
  z0 *= len;
  z1 *= len;
  z2 *= len;

  x0 = upy * z2 - upz * z1;
  x1 = upz * z0 - upx * z2;
  x2 = upx * z1 - upy * z0;
  len = Math.hypot(x0, x1, x2);
  if (!len) {
    x0 = 0;
    x1 = 0;
    x2 = 0;
  } else {
    len = 1 / len;
    x0 *= len;
    x1 *= len;
    x2 *= len;
  }

  y0 = z1 * x2 - z2 * x1;
  y1 = z2 * x0 - z0 * x2;
  y2 = z0 * x1 - z1 * x0;

  out[0] = x0;
  out[1] = x1;
  out[2] = x2;
  out[3] = 0;
  out[4] = y0;
  out[5] = y1;
  out[6] = y2;
  out[7] = 0;
  out[8] = z0;
  out[9] = z1;
  out[10] = z2;
  out[11] = 0;
  out[12] = -(x0 * eyex + x1 * eyey + x2 * eyez);
  out[13] = -(y0 * eyex + y1 * eyey + y2 * eyez);
  out[14] = -(z0 * eyex + z1 * eyey + z2 * eyez);
  out[15] = 1;
  return out;
};

const mat4Perspective = (out, fovy, aspect, near, far) => {
  const f = 1.0 / Math.tan(fovy / 2);
  out[0] = f / aspect;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = f;
  out[6] = 0;
  out[7] = 0;
  out[8] = 0;
  out[9] = 0;
  out[10] = (far + near) / (near - far);
  out[11] = -1;
  out[12] = 0;
  out[13] = 0;
  out[14] = (2 * far * near) / (near - far);
  out[15] = 0;
  return out;
};

class LEMDemo {
  constructor(root) {
    this.root = root;
    this.canvasWrapper = root.querySelector('.hydro-canvas');
    this.canvas = root.querySelector('canvas');

    this.nxSlider = root.querySelector('[data-role="nx-slider"]');
    this.nySlider = root.querySelector('[data-role="ny-slider"]');
    this.dxSlider = root.querySelector('[data-role="dx-slider"]');
    this.boundarySelect = root.querySelector('[data-role="boundary-select"]');
    this.noiseSelect = root.querySelector('[data-role="noise-select"]');
    this.magnitudeSlider = root.querySelector('[data-role="magnitude-slider"]');
    this.perlinScaleSlider = root.querySelector('[data-role="perlin-scale-slider"]');
    this.perlinOctaveSlider = root.querySelector('[data-role="perlin-octave-slider"]');
    this.perlinPersistenceSlider = root.querySelector('[data-role="perlin-persistence-slider"]');
    this.perlinLacunaritySlider = root.querySelector('[data-role="perlin-lacunarity-slider"]');
    this.perlinSeedInput = root.querySelector('[data-role="perlin-seed-input"]');
    this.initButton = root.querySelector('[data-role="init-grid"]');

    this.nxOutput = root.querySelector('[data-role="nx-output"]');
    this.nyOutput = root.querySelector('[data-role="ny-output"]');
    this.dxOutput = root.querySelector('[data-role="dx-output"]');
    this.magnitudeOutput = root.querySelector('[data-role="magnitude-output"]');
    this.perlinScaleOutput = root.querySelector('[data-role="perlin-scale-output"]');
    this.perlinOctaveOutput = root.querySelector('[data-role="perlin-octave-output"]');
    this.perlinPersistenceOutput = root.querySelector('[data-role="perlin-persistence-output"]');
    this.perlinLacunarityOutput = root.querySelector('[data-role="perlin-lacunarity-output"]');

    this.noiseParamsPerlin = root.querySelector('[data-role="perlin-params"]');
    this.noiseParamsWhite = root.querySelector('[data-role="white-params"]');

    this.viewModeButtons = Array.from(root.querySelectorAll('[data-role="view-toggle-button"]') || []);
    this.minmaxOutput = root.querySelector('[data-role="grid-minmax"]');
    this.plotSelect = root.querySelector('[data-role="plot-select"]');
    this.zExagSlider = root.querySelector('[data-role="zexag-slider"]');
    this.zExagOutput = root.querySelector('[data-role="zexag-output"]');
    this.cameraDebug = root.querySelector('[data-role="camera-debug"]');

    this.dtSlider = root.querySelector('[data-role="dt-slider"]');
    this.dtOutput = root.querySelector('[data-role="dt-output"]');
    this.iterationsSlider = root.querySelector('[data-role="iterations-slider"]');
    this.iterationsOutput = root.querySelector('[data-role="iterations-output"]');
    this.precipSlider = root.querySelector('[data-role="precip-slider"]');
    this.precipOutput = root.querySelector('[data-role="precip-output"]');
    this.nSlider = root.querySelector('[data-role="n-slider"]');
    this.nOutput = root.querySelector('[data-role="n-output"]');
    this.mRatioSlider = root.querySelector('[data-role="mratio-slider"]');
    this.mRatioOutput = root.querySelector('[data-role="mratio-output"]');
    this.mOutput = root.querySelector('[data-role="m-output"]');
    this.upliftSlider = root.querySelector('[data-role="uplift-slider"]');
    this.upliftOutput = root.querySelector('[data-role="uplift-output"]');
    this.kSlider = root.querySelector('[data-role="k-slider"]');
    this.kOutput = root.querySelector('[data-role="k-output"]');
    this.kdSlider = root.querySelector('[data-role="kd-slider"]');
    this.kdOutput = root.querySelector('[data-role="kd-output"]');
    this.runSplButton = root.querySelector('[data-role="run-spl"]');
    this.splStatus = root.querySelector('[data-role="spl-status"]');
    this.meshResSlider = root.querySelector('[data-role="mesh-res-slider"]');
    this.meshResOutput = root.querySelector('[data-role="mesh-res-output"]');
    this.meshRebuildButton = root.querySelector('[data-role="mesh-rebuild"]');

    this.viewMode = VIEW_3D;
    this.grid = null;
    this.neighbourer = null;
    this.zExaggeration = DEFAULT_Z_EXAGGERATION;
    this.spl = null;
    this.isSplRunning = false;
    this.updateZExagOutput();
    this.plotMode = PLOT_Z;
    this.meshTarget = 256;
    this.updateCameraDebug();

    this.gl = null;
    this.heightTexture = null;
    this.quadBuffer = null;
    this.mesh = null;

    this.cameraTheta = 1.58;
    this.cameraPhi = 0.86;
    this.cameraRadius = 1;
    this.cameraBaseRadius = 1;
    this.cameraTarget = [0, 0, 0];
    this.cameraEye = [0, 0, 0];
    this.cameraUp = [0, 1, 0];
    this.cameraDragging = false;
    this.cameraPointerId = null;
    this.cameraLast = { x: 0, y: 0 };

    this.viewMatrix = createMat4();
    this.projMatrix = createMat4();
    this.viewProjMatrix = createMat4();

    this.heightRange = 1;
    this.heightMin = 0;
    this.heightMax = 1;

    this.resizeCanvas = this.resizeCanvas.bind(this);
    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);
    this.handleWheel = this.handleWheel.bind(this);

    this.setupControls();
    this.resizeCanvas();
    window.addEventListener('resize', this.resizeCanvas);
    this.initGL();
    this.initializeGrid();
  }

  setupControls() {
    const seed = Math.floor(Math.random() * 1e9);
    if (this.perlinSeedInput && !this.perlinSeedInput.value) {
      this.perlinSeedInput.value = String(seed);
    }

    const updateSlider = (slider, output, format) => {
      if (!slider || !output) return;
      const update = () => {
        const value = Number(slider.value);
        this.setOutputValue(output, format(value));
      };
      slider.addEventListener('input', update);
      update();
    };

    updateSlider(this.nxSlider, this.nxOutput, (value) => `${Math.round(value)} rows`);
    updateSlider(this.nySlider, this.nyOutput, (value) => `${Math.round(value)} cols`);
    updateSlider(this.dxSlider, this.dxOutput, (value) => `${Math.round(value)} m`);
    updateSlider(this.magnitudeSlider, this.magnitudeOutput, (value) => `${Math.round(value)} m`);
    updateSlider(this.perlinOctaveSlider, this.perlinOctaveOutput, (value) => `${Math.round(value)}`);
    updateSlider(this.perlinPersistenceSlider, this.perlinPersistenceOutput, (value) => value.toFixed(2));
    updateSlider(this.perlinLacunaritySlider, this.perlinLacunarityOutput, (value) => value.toFixed(2));

    if (this.perlinScaleSlider && this.perlinScaleOutput) {
      const updateScale = () => {
        const value = perlinScaleFromSlider(this.perlinScaleSlider.value);
        this.perlinScaleOutput.textContent = value >= 1000 ? value.toFixed(0) : value.toFixed(1);
      };
      this.perlinScaleSlider.addEventListener('input', updateScale);
      updateScale();
    }

    if (this.noiseSelect) {
      this.noiseSelect.addEventListener('change', () => this.updateNoiseParams());
      this.updateNoiseParams();
    }

    if (this.plotSelect) {
      this.plotSelect.addEventListener('change', () => {
        this.plotMode = this.plotSelect.value === PLOT_A ? PLOT_A : PLOT_Z;
        this.updateHeightResources();
        this.render();
      });
    }

    if (this.zExagSlider) {
      const updateZ = () => {
        const value = Number(this.zExagSlider.value);
        this.zExaggeration = clamp(value, 0.1, 50);
        this.updateZExagOutput();
        this.updateMesh();
        if (this.viewMode === VIEW_3D) {
          this.render();
        }
      };
      this.zExagSlider.addEventListener('input', updateZ);
      updateZ();
    }

    const updateSPLParams = () => {
      if (this.mOutput) {
        const n = Number(this.nSlider?.value || 1.1);
        const ratio = Number(this.mRatioSlider?.value || 0.45);
        this.setOutputValue(this.mOutput, (n * ratio).toFixed(3));
      }
      this.syncSplParams();
    };

    updateSlider(this.dtSlider, this.dtOutput, (value) => `${Math.round(value)}`);
    updateSlider(this.iterationsSlider, this.iterationsOutput, (value) => `${Math.round(value)}`);
    updateSlider(this.precipSlider, this.precipOutput, (value) => value.toFixed(2));
    updateSlider(this.nSlider, this.nOutput, (value) => value.toFixed(2));
    updateSlider(this.mRatioSlider, this.mRatioOutput, (value) => value.toFixed(2));
    updateSlider(this.upliftSlider, this.upliftOutput, (value) => value.toFixed(4));
    updateSlider(this.kdSlider, this.kdOutput, (value) => value.toExponential(2));
    updateSlider(this.meshResSlider, this.meshResOutput, (value) => `${Math.round(value)}`);

    if (this.nSlider) this.nSlider.addEventListener('input', updateSPLParams);
    if (this.mRatioSlider) this.mRatioSlider.addEventListener('input', updateSPLParams);
    updateSPLParams();

    const syncOnInput = (node, handler) => {
      if (!node) return;
      node.addEventListener('input', handler);
    };

    syncOnInput(this.dtSlider, () => this.syncSplParams());
    syncOnInput(this.precipSlider, () => this.syncSplParams());
    syncOnInput(this.upliftSlider, () => this.syncSplParams());
    syncOnInput(this.kSlider, () => this.syncSplParams());

    if (this.kSlider && this.kOutput) {
      const updateK = () => {
        const t = Number(this.kSlider.value) / 100;
        const exponent = K_LOG_MIN + (K_LOG_MAX - K_LOG_MIN) * t;
        const value = Math.pow(10, exponent);
        this.setOutputValue(this.kOutput, value.toExponential(2));
        this.syncSplParams();
      };
      this.kSlider.addEventListener('input', updateK);
      updateK();
    }
    if (this.kdSlider && this.kdOutput) {
      const updateKd = () => {
        const t = Number(this.kdSlider.value) / 100;
        const exponent = KD_LOG_MIN + (KD_LOG_MAX - KD_LOG_MIN) * t;
        const value = Math.pow(10, exponent);
        this.setOutputValue(this.kdOutput, value.toExponential(2));
        this.syncSplParams();
      };
      this.kdSlider.addEventListener('input', updateKd);
      updateKd();
    }

    if (this.meshResSlider) {
      this.meshResSlider.addEventListener('input', () => {
        this.meshTarget = Math.round(Number(this.meshResSlider.value));
      });
      this.meshTarget = Math.round(Number(this.meshResSlider.value || this.meshTarget));
    }
    if (this.meshRebuildButton) {
      this.meshRebuildButton.addEventListener('click', () => {
        if (!this.grid) return;
        this.updateMesh();
        if (this.viewMode === VIEW_3D) {
          this.updateCameraDebug();
          this.render();
        }
      });
    }

    if (this.viewModeButtons.length) {
      this.viewModeButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
          this.viewMode = btn.dataset.view;
          this.updateViewButtons();
          this.updateZExagControls();
          if (this.viewMode === VIEW_3D) {
            this.resetCamera();
          }
          this.updateCameraDebug();
          this.render();
        });
      });
      this.updateViewButtons();
    }

    if (this.initButton) {
      this.initButton.addEventListener('click', () => {
        this.initializeGrid();
      });
    }

    if (this.runSplButton) {
      this.runSplButton.addEventListener('click', () => {
        this.runSplAsync();
      });
    }
  }

  async runSplAsync() {
    if (!this.spl || !this.grid || !this.neighbourer) return;
    const iterations = Math.round(Number(this.iterationsSlider?.value || 1));
    this.isSplRunning = true;
    this.syncSplParams();
    if (this.runSplButton) this.runSplButton.disabled = true;
    for (let i = 0; i < iterations; i += 1) {
      this.setOutputValue(this.splStatus, `Running ${i + 1}/${iterations}`);
      this.syncSplParams();
      this.spl.run({ iterations: 1 });
      this.updateHeightResources();
      this.render();
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    this.setOutputValue(this.splStatus, 'Done');
    if (this.runSplButton) this.runSplButton.disabled = false;
    this.isSplRunning = false;
  }

  syncSplParams() {
    if (!this.spl) return;
    const dt = Number(this.dtSlider?.value || 1000);
    const precip = Number(this.precipSlider?.value || 1);
    const n = Number(this.nSlider?.value || 1.1);
    const ratio = Number(this.mRatioSlider?.value || 0.45);
    const m = n * ratio;
    const uplift = Number(this.upliftSlider?.value || 0);
    const t = Number(this.kSlider?.value || 0) / 100;
    const exponent = K_LOG_MIN + (K_LOG_MAX - K_LOG_MIN) * t;
    const kValue = Math.pow(10, exponent);
    const td = Number(this.kdSlider?.value || 0) / 100;
    const exponentKd = KD_LOG_MIN + (KD_LOG_MAX - KD_LOG_MIN) * td;
    const kdValue = Math.pow(10, exponentKd);

    this.spl.setParams({ m, n, dt });
    this.spl.setPrecip(precip);
    this.spl.setUplift(uplift);
    this.spl.setK(kValue);
    this.spl.setKd(kdValue);
  }

  updateNoiseParams() {
    const isPerlin = this.noiseSelect?.value === 'perlin';
    if (this.noiseParamsPerlin) this.noiseParamsPerlin.hidden = !isPerlin;
    if (this.noiseParamsWhite) this.noiseParamsWhite.hidden = isPerlin;
  }

  getPlotField() {
    if (this.plotMode === PLOT_A && this.spl?.A?.Z) {
      return this.spl.A.Z;
    }
    return this.grid.Z;
  }

  getPlotFieldValue(row, col) {
    const field = this.getPlotField();
    const ny = this.grid.ny;
    const idx = row * ny + col;
    const raw = field[idx];
    if (this.plotMode === PLOT_A) {
      const min = this.plotMin ?? 0;
      const max = this.plotMax ?? 1;
      const value = this.safeLog10(raw);
      return this.normalizeValue(value, min, max);
    }
    return this.normalizeValue(raw, this.heightMin, this.heightMax);
  }

  normalizeValue(value, min, max) {
    const range = Math.max(max - min, 1e-6);
    return clamp((value - min) / range, 0, 1);
  }

  safeLog10(value) {
    return Math.log10(Math.max(value, 1e-12));
  }

  setOutputValue(node, text) {
    if (!node) return;
    if ('value' in node) {
      node.value = text;
    }
    node.textContent = text;
  }

  initializeGrid() {
    const nx = Math.round(Number(this.nxSlider?.value || 256));
    const ny = Math.round(Number(this.nySlider?.value || 256));
    const dx = Number(this.dxSlider?.value || 50);
    const dy = dx;
    const magnitude = Number(this.magnitudeSlider?.value || 100);

    this.grid = new RegularGrid({
      xmin: 0,
      ymin: 0,
      nx,
      ny,
      dx,
      dy
    });

    const noiseType = this.noiseSelect?.value || 'perlin';
    if (noiseType === 'perlin') {
      const scale = perlinScaleFromSlider(this.perlinScaleSlider?.value || 0);
      const octaves = Math.round(Number(this.perlinOctaveSlider?.value || 4));
      const persistence = Number(this.perlinPersistenceSlider?.value || 0.5);
      const seed = parseInt(this.perlinSeedInput?.value || '0', 10) || 0;
      const lacunarity = Number(this.perlinLacunaritySlider?.value || 2);
      this.grid.fillPerlin({
        scale,
        octaves,
        persistence,
        lacunarity,
        seed
      });
    } else {
      this.grid.fillRandom({ min: 0, max: 1 });
    }

    this.logGridStats(`Noise ${noiseType} (pre-rescale)`);
    this.rescaleGrid(magnitude);
    this.logGridStats('Initialized grid');

    const nodeStatus = new Uint8Array(nx * ny);
    nodeStatus.fill(1);
    const boundaryType = Number(this.boundarySelect?.value || 0);
    if (boundaryType === 0) {
      this.markAllBorders(nodeStatus, nx, ny);
    } else if (boundaryType === 1) {
      this.markTopBottom(nodeStatus, nx, ny);
    } else if (boundaryType === 2) {
      this.markLeftRight(nodeStatus, nx, ny);
    }

    this.neighbourer = new Neighbourer({
      nx,
      ny,
      dx,
      dy,
      boundary_type: boundaryType,
      node_status: nodeStatus
    });

    this.zeroBaselevels(nodeStatus, this.grid.Z);

    this.spl = new SPLModel({
      grid: this.grid,
      neighbourer: this.neighbourer
    });

    this.updateHeightResources();
    this.updateZExagControls();
    this.resetCamera();
    this.updateCameraDebug();
    this.render();
  }

  zeroBaselevels(nodeStatus, z) {
    for (let i = 0; i < nodeStatus.length; i += 1) {
      if (nodeStatus[i] === 3) {
        z[i] = 0;
      }
    }
  }

  logGridStats(label) {
    if (!this.grid) return;
    const z = this.grid.Z;
    let min = Infinity;
    let max = -Infinity;
    let sum = 0;
    for (let i = 0; i < z.length; i += 1) {
      const value = z[i];
      if (value < min) min = value;
      if (value > max) max = value;
      sum += value;
    }
    const mean = sum / Math.max(z.length, 1);
    console.info(`[LEM] ${label}: min=${min}, max=${max}, mean=${mean}`);
  }

  rescaleGrid(magnitude) {
    const z = this.grid.Z;
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < z.length; i += 1) {
      const value = z[i];
      if (value < min) min = value;
      if (value > max) max = value;
    }
    if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) {
      z.fill(0);
      this.heightMin = 0;
      this.heightMax = 0;
      this.heightRange = 1;
      this.updateMinMaxOutput(0, 0);
      return;
    }
    const range = max - min;
    for (let i = 0; i < z.length; i += 1) {
      z[i] = ((z[i] - min) / range) * magnitude;
    }
    this.heightMin = 0;
    this.heightMax = magnitude;
    this.heightRange = Math.max(magnitude, 1e-6);
    this.updateMinMaxOutput(0, magnitude);
  }

  updateMinMaxOutput(min, max) {
    if (!this.minmaxOutput) return;
    this.setOutputValue(this.minmaxOutput, `${min.toFixed(2)} – ${max.toFixed(2)}`);
  }

  markAllBorders(nodeStatus, nx, ny) {
    for (let col = 0; col < ny; col += 1) {
      nodeStatus[col] = 3;
      nodeStatus[(nx - 1) * ny + col] = 3;
    }
    for (let row = 1; row < nx - 1; row += 1) {
      nodeStatus[row * ny] = 3;
      nodeStatus[row * ny + (ny - 1)] = 3;
    }
  }

  markTopBottom(nodeStatus, nx, ny) {
    for (let col = 0; col < ny; col += 1) {
      nodeStatus[col] = 3;
      nodeStatus[(nx - 1) * ny + col] = 3;
    }
  }

  markLeftRight(nodeStatus, nx, ny) {
    for (let row = 0; row < nx; row += 1) {
      nodeStatus[row * ny] = 3;
      nodeStatus[row * ny + (ny - 1)] = 3;
    }
  }

  updateHeightResources() {
    if (!this.gl || !this.grid) return;
    this.updateHeightTexture();
    this.updateMesh();
  }

  updateHeightTexture() {
    const gl = this.gl;
    if (!gl || !this.grid) return;

    const nx = this.grid.nx;
    const ny = this.grid.ny;
    const data = new Uint8Array(nx * ny);
    const field = this.getPlotField();
    const logMode = this.plotMode === PLOT_A;
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < field.length; i += 1) {
      const raw = field[i];
      const value = logMode ? this.safeLog10(raw) : raw;
      if (value < min) min = value;
      if (value > max) max = value;
    }
    if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) {
      min = 0;
      max = 1;
    }
    if (logMode) {
      this.plotMin = min;
      this.plotMax = max;
    } else {
      this.plotMin = null;
      this.plotMax = null;
    }
    this.heightMin = min;
    this.heightMax = max;
    this.heightRange = Math.max(max - min, 1e-6);
    this.updateMinMaxOutput(min, max);

    for (let i = 0; i < field.length; i += 1) {
      const raw = field[i];
      const value = logMode ? this.safeLog10(raw) : raw;
      const t = (value - min) / this.heightRange;
      data[i] = Math.round(clamp(t, 0, 1) * 255);
    }

    if (!this.heightTexture) {
      this.heightTexture = gl.createTexture();
    }

    gl.bindTexture(gl.TEXTURE_2D, this.heightTexture);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (this.isWebGL2) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, ny, nx, 0, gl.RED, gl.UNSIGNED_BYTE, data);
    } else {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, ny, nx, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, data);
    }
  }

  updateMesh() {
    if (!this.gl || !this.grid) return;
    const nx = this.grid.nx;
    const ny = this.grid.ny;
    const target = Math.max(2, Math.min(this.meshTarget || 256, Math.max(nx, ny)));
    const step = Math.max(1, Math.ceil((Math.max(nx, ny) - 1) / (target - 1)));
    const meshRows = Math.floor((nx - 1) / step) + 1;
    const meshCols = Math.floor((ny - 1) / step) + 1;
    const vertexCount = meshRows * meshCols;

    const positions = new Float32Array(vertexCount * 3);
    const normals = new Float32Array(vertexCount * 3);
    const values = new Float32Array(vertexCount);

    const extentX = (ny - 1) * this.grid.dx;
    const extentY = (nx - 1) * this.grid.dy;
    const zScale = this.zExaggeration;
    let zMin = Infinity;
    let zMax = -Infinity;
    const originX = -extentX / 2;
    const originY = extentY / 2;

    const getHeight = (row, col) => {
      const r = clamp(row, 0, nx - 1);
      const c = clamp(col, 0, ny - 1);
      return this.grid.Z[r * ny + c];
    };

    let ptr = 0;
    for (let row = 0; row < meshRows; row += 1) {
      const srcRow = row * step;
      for (let col = 0; col < meshCols; col += 1) {
        const srcCol = col * step;
        const rawZ = getHeight(srcRow, srcCol);
        if (rawZ < zMin) zMin = rawZ;
        if (rawZ > zMax) zMax = rawZ;
        const z = rawZ * zScale;
        const x = originX + srcCol * this.grid.dx;
        const y = originY - srcRow * this.grid.dy;

        const plotValue = this.getPlotFieldValue(srcRow, srcCol);

        const zL = getHeight(srcRow, srcCol - step) * zScale;
        const zR = getHeight(srcRow, srcCol + step) * zScale;
        const zD = getHeight(srcRow - step, srcCol) * zScale;
        const zU = getHeight(srcRow + step, srcCol) * zScale;
        const dx = this.grid.dx * step;
        const dy = this.grid.dy * step;
        const nxv = -(zR - zL) / (2 * dx);
        const nyv = -(zU - zD) / (2 * dy);
        const nzv = 1;
        const invLen = 1 / Math.hypot(nxv, nyv, nzv);

        positions[ptr] = x;
        positions[ptr + 1] = y;
        positions[ptr + 2] = z;
        normals[ptr] = nxv * invLen;
        normals[ptr + 1] = nyv * invLen;
        normals[ptr + 2] = nzv * invLen;
        values[ptr / 3] = plotValue;
        ptr += 3;
      }
    }

    const indexCount = (meshRows - 1) * (meshCols - 1) * 6;
    const indices = new Uint16Array(indexCount);
    let iptr = 0;
    for (let row = 0; row < meshRows - 1; row += 1) {
      for (let col = 0; col < meshCols - 1; col += 1) {
        const i0 = row * meshCols + col;
        const i1 = i0 + 1;
        const i2 = i0 + meshCols;
        const i3 = i2 + 1;
        indices[iptr++] = i0;
        indices[iptr++] = i2;
        indices[iptr++] = i1;
        indices[iptr++] = i1;
        indices[iptr++] = i2;
        indices[iptr++] = i3;
      }
    }

    const gl = this.gl;
    if (!this.mesh) {
      this.mesh = {
        step,
        rows: meshRows,
        cols: meshCols,
        indexCount,
        positionBuffer: gl.createBuffer(),
        normalBuffer: gl.createBuffer(),
        indexBuffer: gl.createBuffer(),
        valueBuffer: gl.createBuffer()
      };
    }

    this.mesh.step = step;
    this.mesh.rows = meshRows;
    this.mesh.cols = meshCols;
    this.mesh.indexCount = indexCount;

    gl.bindBuffer(gl.ARRAY_BUFFER, this.mesh.positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.mesh.normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.mesh.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.mesh.valueBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, values, gl.STATIC_DRAW);

    if (!Number.isFinite(zMin) || !Number.isFinite(zMax)) {
      zMin = 0;
      zMax = 0;
    }
    const extent = Math.max(extentX, extentY, (zMax - zMin) * zScale);
    this.cameraRadius = extent * 1.8 || 1;
    this.cameraBaseRadius = this.cameraRadius;
    this.cameraTarget = [0, 0, (zMin + zMax) * 0.5 * zScale];
  }

  initGL() {
    if (!this.canvas) return;
    const gl = this.canvas.getContext('webgl') || this.canvas.getContext('experimental-webgl');
    if (!gl) {
      console.warn('[LEM] WebGL unavailable.');
      return;
    }
    this.gl = gl;
    this.isWebGL2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;

    this.quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1, 0, 0,
      1, -1, 1, 0,
      -1, 1, 0, 1,
      1, 1, 1, 1
    ]), gl.STATIC_DRAW);

    this.program2d = this.createProgram(
      `attribute vec2 aPos;
       attribute vec2 aUV;
       varying vec2 vUV;
       void main() {
         vUV = aUV;
         gl_Position = vec4(aPos, 0.0, 1.0);
       }`,
      `precision highp float;
       varying vec2 vUV;
       uniform sampler2D uHeight;
       uniform vec2 uTexel;
       uniform float uHeightRange;
       uniform float uDX;
       uniform float uDY;
       uniform vec3 uLightDir;
       uniform float uPlotMode;
       vec3 terrainColor(float t) {
       vec3 low = vec3(0.06, 0.16, 0.1);
       vec3 mid = vec3(0.18, 0.32, 0.16);
       vec3 high = vec3(0.4, 0.34, 0.23);
       vec3 ridge = vec3(0.62, 0.56, 0.44);
       vec3 snow = vec3(0.92, 0.92, 0.9);
       if (t < 0.2) {
         return mix(low, mid, t / 0.2);
       }
       if (t < 0.55) {
         return mix(mid, high, (t - 0.2) / 0.35);
       }
       if (t < 0.85) {
         return mix(high, ridge, (t - 0.55) / 0.3);
       }
       return mix(ridge, snow, (t - 0.85) / 0.15);
       }
       vec3 blueColor(float t) {
         vec3 deep = vec3(0.02, 0.08, 0.18);
         vec3 mid = vec3(0.08, 0.35, 0.72);
         vec3 high = vec3(0.7, 0.9, 1.0);
         if (t < 0.5) {
           return mix(deep, mid, t / 0.5);
         }
         return mix(mid, high, (t - 0.5) / 0.5);
       }
       void main() {
         float h = texture2D(uHeight, vUV).r;
         float hR = texture2D(uHeight, vUV + vec2(uTexel.x, 0.0)).r;
         float hU = texture2D(uHeight, vUV + vec2(0.0, uTexel.y)).r;
         float dzdx = (hR - h) * uHeightRange / max(uDX, 1.0);
         float dzdy = (hU - h) * uHeightRange / max(uDY, 1.0);
         vec3 normal = normalize(vec3(-dzdx, -dzdy, 1.0));
         float light = clamp(dot(normal, normalize(uLightDir)), 0.0, 1.0);
         float t = clamp(h, 0.0, 1.0);
         vec3 base = (uPlotMode > 0.5) ? blueColor(t) : terrainColor(t);
         vec3 shaded = base * (0.55 + 0.55 * light);
         gl_FragColor = vec4(shaded, 1.0);
       }`
    );

    this.program3d = this.createProgram(
      `attribute vec3 aPos;
       attribute vec3 aNormal;
       uniform mat4 uViewProj;
       uniform float uMinZ;
       uniform float uRangeZ;
       attribute float aValue;
       varying float vHeight;
       varying float vValue;
       varying vec3 vNormal;
       void main() {
         vHeight = (aPos.z - uMinZ) / max(uRangeZ, 1e-6);
         vValue = aValue;
         vNormal = aNormal;
         gl_Position = uViewProj * vec4(aPos, 1.0);
       }`,
      `precision highp float;
       varying float vHeight;
       varying float vValue;
       varying vec3 vNormal;
       uniform vec3 uLightDir;
       uniform float uPlotMode;
       vec3 terrainColor(float t) {
       vec3 low = vec3(0.06, 0.16, 0.1);
       vec3 mid = vec3(0.18, 0.32, 0.16);
       vec3 high = vec3(0.4, 0.34, 0.23);
       vec3 ridge = vec3(0.62, 0.56, 0.44);
       vec3 snow = vec3(0.92, 0.92, 0.9);
       if (t < 0.2) {
         return mix(low, mid, t / 0.2);
       }
       if (t < 0.55) {
         return mix(mid, high, (t - 0.2) / 0.35);
       }
       if (t < 0.85) {
         return mix(high, ridge, (t - 0.55) / 0.3);
       }
       return mix(ridge, snow, (t - 0.85) / 0.15);
       }
       vec3 blueColor(float t) {
         vec3 deep = vec3(0.02, 0.08, 0.18);
         vec3 mid = vec3(0.08, 0.35, 0.72);
         vec3 high = vec3(0.7, 0.9, 1.0);
         if (t < 0.5) {
           return mix(deep, mid, t / 0.5);
         }
         return mix(mid, high, (t - 0.5) / 0.5);
       }
       void main() {
        float light = clamp(dot(normalize(vNormal), normalize(uLightDir)), 0.0, 1.0);
        float t = clamp(vHeight, 0.0, 1.0);
        if (uPlotMode > 0.5) {
          t = clamp(vValue, 0.0, 1.0);
        }
        vec3 base = (uPlotMode > 0.5) ? blueColor(t) : terrainColor(t);
        vec3 shaded = base * (0.5 + 0.6 * light);
        gl_FragColor = vec4(shaded, 1.0);
      }`
    );

    this.setupCameraControls();
  }

  createProgram(vertexSrc, fragmentSrc) {
    const gl = this.gl;
    const vertex = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertex, vertexSrc);
    gl.compileShader(vertex);
    if (!gl.getShaderParameter(vertex, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(vertex));
    }

    const fragment = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragment, fragmentSrc);
    gl.compileShader(fragment);
    if (!gl.getShaderParameter(fragment, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(fragment));
    }

    const program = gl.createProgram();
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(program));
    }
    return program;
  }

  resizeCanvas() {
    if (!this.canvas) return;
    const rect = this.canvasWrapper?.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect?.width || this.canvas.clientWidth || this.canvas.width));
    const height = Math.max(1, Math.floor(rect?.height || this.canvas.clientHeight || this.canvas.height));
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
      this.render();
    }
  }

  setupCameraControls() {
    if (!this.canvas) return;
    this.canvas.addEventListener('pointerdown', this.handlePointerDown);
    this.canvas.addEventListener('pointermove', this.handlePointerMove);
    window.addEventListener('pointerup', this.handlePointerUp);
    window.addEventListener('pointercancel', this.handlePointerUp);
    this.canvas.addEventListener('wheel', this.handleWheel, { passive: false });
  }

  handlePointerDown(event) {
    if (this.viewMode !== VIEW_3D) return;
    this.cameraDragging = true;
    this.cameraPointerId = event.pointerId;
    this.cameraLast.x = event.clientX;
    this.cameraLast.y = event.clientY;
    if (this.canvas.setPointerCapture) {
      this.canvas.setPointerCapture(event.pointerId);
    }
  }

  handlePointerMove(event) {
    if (!this.cameraDragging || this.viewMode !== VIEW_3D || event.pointerId !== this.cameraPointerId) return;
    const dx = event.clientX - this.cameraLast.x;
    const dy = event.clientY - this.cameraLast.y;
    this.cameraLast.x = event.clientX;
    this.cameraLast.y = event.clientY;
    this.cameraTheta -= dx * 0.004;
    this.cameraPhi = clamp(this.cameraPhi - dy * 0.004, 0.05, Math.PI - 0.05);
    this.render();
  }

  handlePointerUp(event) {
    if (event.pointerId !== this.cameraPointerId) return;
    this.cameraDragging = false;
    if (this.canvas.releasePointerCapture) {
      this.canvas.releasePointerCapture(event.pointerId);
    }
    this.cameraPointerId = null;
  }

  handleWheel(event) {
    if (this.viewMode !== VIEW_3D) return;
    event.preventDefault();
    const zoom = event.deltaY * 0.002 * this.cameraRadius;
    this.cameraRadius = clamp(
      this.cameraRadius + zoom,
      this.cameraBaseRadius * 0.25,
      this.cameraBaseRadius * 6
    );
    this.render();
  }

  updateViewButtons() {
    this.viewModeButtons.forEach((btn) => {
      const active = btn.dataset.view === this.viewMode;
      btn.classList.toggle('is-active', active);
    });
  }

  updateZExagControls() {
    if (!this.zExagSlider) return;
    const is3d = this.viewMode === VIEW_3D;
    this.zExagSlider.disabled = !is3d;
    this.updateZExagOutput();
  }

  updateZExagOutput() {
    if (!this.zExagOutput) return;
    this.setOutputValue(this.zExagOutput, `${this.zExaggeration.toFixed(1)}x`);
  }


  render() {
    if (!this.gl) return;
    if (this.viewMode === VIEW_3D) {
      this.render3D();
    } else {
      this.render2D();
    }
  }

  render2D() {
    const gl = this.gl;
    if (!gl || !this.program2d || !this.heightTexture) {
      gl?.clearColor(0.05, 0.05, 0.08, 1);
      gl?.clear(gl.COLOR_BUFFER_BIT);
      return;
    }

    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.disable(gl.DEPTH_TEST);
    gl.clearColor(0.03, 0.04, 0.06, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(this.program2d);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);

    const posLoc = gl.getAttribLocation(this.program2d, 'aPos');
    const uvLoc = gl.getAttribLocation(this.program2d, 'aUV');
    gl.enableVertexAttribArray(posLoc);
    gl.enableVertexAttribArray(uvLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 16, 0);
    gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 16, 8);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.heightTexture);
    gl.uniform1i(gl.getUniformLocation(this.program2d, 'uHeight'), 0);
    if (this.grid) {
      gl.uniform2f(gl.getUniformLocation(this.program2d, 'uTexel'), 1 / this.grid.ny, 1 / this.grid.nx);
      gl.uniform1f(gl.getUniformLocation(this.program2d, 'uHeightRange'), this.heightRange);
      gl.uniform1f(gl.getUniformLocation(this.program2d, 'uDX'), this.grid.dx);
      gl.uniform1f(gl.getUniformLocation(this.program2d, 'uDY'), this.grid.dy);
    }

    gl.uniform3f(gl.getUniformLocation(this.program2d, 'uLightDir'), 0.4, 0.3, 0.85);
    gl.uniform1f(gl.getUniformLocation(this.program2d, 'uPlotMode'), this.plotMode === PLOT_A ? 1 : 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  render3D() {
    const gl = this.gl;
    if (!gl || !this.program3d || !this.mesh) {
      this.render2D();
      return;
    }

    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(0.03, 0.04, 0.06, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const aspect = this.canvas.width / Math.max(this.canvas.height, 1);
    const near = Math.max(this.cameraRadius / 1000, 0.1);
    const far = Math.max(this.cameraRadius * 4, 1000);
    mat4Perspective(this.projMatrix, Math.PI / 4, aspect, near, far);
    this.updateCamera();
    mat4Multiply(this.viewProjMatrix, this.projMatrix, this.viewMatrix);

    gl.useProgram(this.program3d);
    const posLoc = gl.getAttribLocation(this.program3d, 'aPos');
    const normalLoc = gl.getAttribLocation(this.program3d, 'aNormal');
    const valueLoc = gl.getAttribLocation(this.program3d, 'aValue');

    gl.bindBuffer(gl.ARRAY_BUFFER, this.mesh.positionBuffer);
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.mesh.normalBuffer);
    gl.enableVertexAttribArray(normalLoc);
    gl.vertexAttribPointer(normalLoc, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.mesh.valueBuffer);
    gl.enableVertexAttribArray(valueLoc);
    gl.vertexAttribPointer(valueLoc, 1, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.mesh.indexBuffer);

    gl.uniformMatrix4fv(gl.getUniformLocation(this.program3d, 'uViewProj'), false, this.viewProjMatrix);
    gl.uniform1f(gl.getUniformLocation(this.program3d, 'uMinZ'), this.heightMin * this.zExaggeration);
    gl.uniform1f(gl.getUniformLocation(this.program3d, 'uRangeZ'), this.heightRange * this.zExaggeration);
    gl.uniform3f(gl.getUniformLocation(this.program3d, 'uLightDir'), 0.4, 0.3, 0.85);
    gl.uniform1f(gl.getUniformLocation(this.program3d, 'uPlotMode'), this.plotMode === PLOT_A ? 1 : 0);

    gl.drawElements(gl.TRIANGLES, this.mesh.indexCount, gl.UNSIGNED_SHORT, 0);
  }

  updateCamera() {
    const r = this.cameraRadius;
    const theta = this.cameraTheta;
    const phi = this.cameraPhi;

    this.cameraEye[0] = this.cameraTarget[0] + r * Math.cos(theta) * Math.sin(phi);
    this.cameraEye[1] = this.cameraTarget[1] + r * Math.sin(theta) * Math.sin(phi);
    this.cameraEye[2] = this.cameraTarget[2] + r * Math.cos(phi);

    mat4LookAt(this.viewMatrix, this.cameraEye, this.cameraTarget, this.cameraUp);
    this.updateCameraDebug();
  }

  resetCamera() {
    this.cameraTheta = 1.58;
    this.cameraPhi = 0.86;
    this.cameraRadius = Math.max(this.cameraBaseRadius, 1);
    this.updateCameraDebug();
  }

  updateCameraDebug() {
    if (!this.cameraDebug) return;
    const theta = this.cameraTheta ?? 0;
    const phi = this.cameraPhi ?? 0;
    const radius = this.cameraRadius ?? 0;
    this.setOutputValue(
      this.cameraDebug,
      `θ ${theta.toFixed(2)} • φ ${phi.toFixed(2)} • r ${radius.toFixed(1)}`
    );
  }
}

const initLEM = () => {
  document.querySelectorAll('[data-lem-demo]').forEach((node) => {
    if (!node.__lem) {
      node.__lem = new LEMDemo(node);
    }
  });
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLEM);
} else {
  initLEM();
}
