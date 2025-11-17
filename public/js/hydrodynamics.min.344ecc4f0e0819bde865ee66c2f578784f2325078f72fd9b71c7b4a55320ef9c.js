const NX=256,NY=256,DT=.5,DX=10,GRAVITY=9.81,MANNING=.035,HFLOW_THRESHOLD=1e-4,FROUDE_LIMIT=.85,HILLSHADE_THRESHOLD=.1,DEFAULT_DEPTH_COLOR_SCALE=2.5,SUN_ZENITH_RAD=40*Math.PI/180,SUN_AZIMUTH_RAD=315*Math.PI/180,vertexShaderSrc=`
attribute vec2 aPos;
attribute vec2 aUV;
varying vec2 vUV;
void main() {
  vUV = aUV;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`,flowRouteFragSrc=`
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

  gl_FragColor = vec4(qx, qy, 0.0, 1.0);
}
`,depthUpdateFragSrc=`
precision highp float;
varying vec2 vUV;

uniform sampler2D uH;
uniform sampler2D uQ;

uniform vec2 uGridSize;

uniform float uDX;
uniform float uDT;
uniform vec2 uInjectionCoord;
uniform float uInjectionRate;

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

  if (!hasE) {
    h = 0.0;
  }

  gl_FragColor = vec4(h, 0.0, 0.0, 1.0);
}
`,displayFragSrc=`
precision highp float;
varying vec2 vUV;

uniform sampler2D uH;
uniform sampler2D uZ;
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

vec3 depthToColor(float h) {
  float t = clamp(h / uDepthScale, 0.0, 1.0);
  vec3 shallow = vec3(0.95, 0.95, 1.0);
  vec3 deep = vec3(0.0, 0.1, 0.7);
  return mix(shallow, deep, pow(t, 0.7));
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

void main() {
  vec2 texUV = vUV;
  float h = texture2D(uH, texUV).r;
  vec3 base = hillshade(texUV);
  if (h < uHillshadeThreshold) {
    gl_FragColor = vec4(base, 1.0);
    return;
  }
  vec3 water = depthToColor(h);
  gl_FragColor = vec4(mix(base, water, 0.85), 1.0);
}
`;class HydrodynamicsDemo{constructor(e){this.root=e,this.canvas=e.querySelector("canvas"),this.dischargeSlider=e.querySelector('[data-role="discharge-slider"]'),this.depthSlider=e.querySelector('[data-role="depth-slider"]'),this.hillSlider=e.querySelector('[data-role="hill-slider"]'),this.dischargeOutput=e.querySelector('[data-role="discharge-output"]'),this.depthOutput=e.querySelector('[data-role="depth-output"]'),this.hillOutput=e.querySelector('[data-role="hill-output"]'),this.discharge=Number(this.dischargeSlider?.value||0),this.depthScale=Number(this.depthSlider?.value||DEFAULT_DEPTH_COLOR_SCALE),this.hillExaggeration=Number(this.hillSlider?.value||1.5),this.dischargeRate=this.convertDischargeToRate(this.discharge),this.zMin=0,this.zScale=1,this.injectionCol=0,this.injectionRow=NY-1-183,this.sunZenith=SUN_ZENITH_RAD,this.sunAzimuth=SUN_AZIMUTH_RAD,this.animationFrame=null,this.stepCount=0,this.canvas.width=512,this.canvas.height=512,this.setupControls(),this.initGL(),this.gl&&this.loadDEM()}setupControls(){const e=(e,t)=>{if(!e)return;e.value=t,e.textContent=t};if(this.dischargeSlider&&this.dischargeOutput){const t=()=>{this.discharge=Number(this.dischargeSlider.value),this.dischargeRate=this.convertDischargeToRate(this.discharge),e(this.dischargeOutput,`${this.discharge.toFixed(0)} m^3/s`)};this.dischargeSlider.addEventListener("input",t),t()}if(this.depthSlider&&this.depthOutput){const t=()=>{this.depthScale=Number(this.depthSlider.value),e(this.depthOutput,`${this.depthScale.toFixed(1)} m`)};this.depthSlider.addEventListener("input",t),t()}if(this.hillSlider&&this.hillOutput){const t=()=>{this.hillExaggeration=Number(this.hillSlider.value),e(this.hillOutput,`${this.hillExaggeration.toFixed(1)}×`)};this.hillSlider.addEventListener("input",t),t()}}convertDischargeToRate(e){return e/(DX*DX)}initGL(){if(this.gl=this.canvas.getContext("webgl")||this.canvas.getContext("experimental-webgl"),!this.gl){this.root.classList.add("hydro-panel--unsupported");return}const e=this.gl;if(!e.getExtension("OES_texture_float")||!e.getExtension("WEBGL_color_buffer_float")&&!e.getExtension("EXT_color_buffer_float")){this.root.classList.add("hydro-panel--unsupported"),this.gl=null;return}this.quadBuffer=e.createBuffer(),e.bindBuffer(e.ARRAY_BUFFER,this.quadBuffer),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,0,0,1,-1,1,0,-1,1,0,1,1,1,1,1]),e.STATIC_DRAW)}waitForGeoTIFF(){return window.GeoTIFF?Promise.resolve(window.GeoTIFF):new Promise((e,t)=>{const s=setTimeout(()=>t(new Error("GeoTIFF library failed to load")),8e3),n=()=>{window.GeoTIFF?(clearTimeout(s),e(window.GeoTIFF)):requestAnimationFrame(n)};n()})}async loadDEM(){try{const a=await this.waitForGeoTIFF(),r=this.root.dataset.dem,c=await a.fromUrl(r),e=await c.getImage(),t=e.getWidth(),n=e.getHeight();(t!==NX||n!==NY)&&console.warn("[Hydrodynamics] DEM dimensions differ from shader grid:",t,n);const l=e.getGDALNoData(),s=await e.readRasters({interleave:!0,samples:[0]}),d=s instanceof Float32Array?s:new Float32Array(s),{texture:u,min:o,max:i}=this.createDEMTexture(d,t,n,l);this.texZ=u,this.zMin=o,this.zScale=Math.max(i-o,1e-5),this._demLogged||(console.info("[Hydrodynamics] DEM elevations:",o.toFixed(2),"→",i.toFixed(2),"m"),this._demLogged=!0),this.initSimulation()}catch(e){console.error("[Hydrodynamics] Failed to load DEM GeoTIFF:",e),this.root.classList.add("hydro-panel--unsupported")}}createFloatTexture(e,t,n=null){const s=this.gl,o=s.createTexture();return s.bindTexture(s.TEXTURE_2D,o),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_MIN_FILTER,s.NEAREST),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_MAG_FILTER,s.NEAREST),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_WRAP_S,s.CLAMP_TO_EDGE),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_WRAP_T,s.CLAMP_TO_EDGE),s.texImage2D(s.TEXTURE_2D,0,s.RGBA,e,t,0,s.RGBA,s.FLOAT,n),o}createDEMTexture(e,t,n,s=null){if(!e||e.length!==t*n)throw new Error("DEM raster size mismatch");let o=1/0,i=-(1/0);for(let n=0;n<e.length;n+=1){let t=e[n];(!Number.isFinite(t)||s!=null&&t===s)&&(t=0),e[n]=t,t<o&&(o=t),t>i&&(i=t)}(!Number.isFinite(o)||!Number.isFinite(i))&&(o=0,i=1);const r=Math.max(i-o,1e-5),c=1/r,a=new Float32Array(t*n*4);for(let s=0;s<n;s+=1){const i=n-1-s;for(let n=0;n<t;n+=1){const d=i*t+n,u=s*t+n,h=e[d],l=Math.min(Math.max((h-o)*c,0),1),r=u*4;a[r]=l,a[r+1]=l,a[r+2]=l,a[r+3]=1}}const l=this.createFloatTexture(t,n,a);return{texture:l,min:o,max:i}}compileShader(e,t){const n=this.gl,s=n.createShader(t);if(n.shaderSource(s,e),n.compileShader(s),!n.getShaderParameter(s,n.COMPILE_STATUS))throw console.error(n.getShaderInfoLog(s)),new Error("Shader compile error");return s}createProgram(e,t){const n=this.gl,s=n.createProgram(),o=this.compileShader(e,n.VERTEX_SHADER),i=this.compileShader(t,n.FRAGMENT_SHADER);if(n.attachShader(s,o),n.attachShader(s,i),n.linkProgram(s),!n.getProgramParameter(s,n.LINK_STATUS))throw console.error(n.getProgramInfoLog(s)),new Error("Program link error");return s}bindQuad(e){const t=this.gl,n=t.getAttribLocation(e,"aPos"),s=t.getAttribLocation(e,"aUV");t.bindBuffer(t.ARRAY_BUFFER,this.quadBuffer),t.enableVertexAttribArray(n),t.vertexAttribPointer(n,2,t.FLOAT,!1,16,0),t.enableVertexAttribArray(s),t.vertexAttribPointer(s,2,t.FLOAT,!1,16,8)}initSimulation(){const e=this.gl;try{if(!this.texZ)throw new Error("DEM texture not initialized");const t=new Float32Array(NX*NY*4);this.texH=[this.createFloatTexture(NX,NY,t),this.createFloatTexture(NX,NY,t)],this.texQ=[this.createFloatTexture(NX,NY,t),this.createFloatTexture(NX,NY,t)],this.fb=e.createFramebuffer(),this.progFlow=this.createProgram(vertexShaderSrc,flowRouteFragSrc),this.progDepth=this.createProgram(vertexShaderSrc,depthUpdateFragSrc),this.progDisplay=this.createProgram(vertexShaderSrc,displayFragSrc),this.hRead=0,this.hWrite=1,this.qRead=0,this.qWrite=1,this.seedInitialWater(.001),this.step()}catch(e){console.error(e),this.root.classList.add("hydro-panel--unsupported")}}seedInitialWater(e){const t=new Float32Array(NX*NY*4);for(let n=0;n<NX*NY;n+=1)t[4*n]=e;this.gl.bindTexture(this.gl.TEXTURE_2D,this.texH[this.hRead]),this.gl.texImage2D(this.gl.TEXTURE_2D,0,this.gl.RGBA,NX,NY,0,this.gl.RGBA,this.gl.FLOAT,t)}step=()=>{const e=this.gl;if(!e)return;e.bindFramebuffer(e.FRAMEBUFFER,this.fb),e.useProgram(this.progFlow),this.bindQuad(this.progFlow),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,this.texQ[this.qWrite],0),e.viewport(0,0,NX,NY),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,this.texH[this.hRead]),e.uniform1i(e.getUniformLocation(this.progFlow,"uH"),0),e.activeTexture(e.TEXTURE1),e.bindTexture(e.TEXTURE_2D,this.texZ),e.uniform1i(e.getUniformLocation(this.progFlow,"uZ"),1),e.activeTexture(e.TEXTURE2),e.bindTexture(e.TEXTURE_2D,this.texQ[this.qRead]),e.uniform1i(e.getUniformLocation(this.progFlow,"uQ"),2),e.uniform2f(e.getUniformLocation(this.progFlow,"uGridSize"),NX,NY),e.uniform2f(e.getUniformLocation(this.progFlow,"uTexelSize"),1/NX,1/NY),e.uniform1f(e.getUniformLocation(this.progFlow,"uDX"),DX),e.uniform1f(e.getUniformLocation(this.progFlow,"uDT"),DT),e.uniform1f(e.getUniformLocation(this.progFlow,"uGravity"),GRAVITY),e.uniform1f(e.getUniformLocation(this.progFlow,"uManning"),MANNING),e.uniform1f(e.getUniformLocation(this.progFlow,"uHFLOW_THRESHOLD"),HFLOW_THRESHOLD),e.uniform1f(e.getUniformLocation(this.progFlow,"uFroudeLimit"),FROUDE_LIMIT),e.uniform1f(e.getUniformLocation(this.progFlow,"uZMin"),this.zMin),e.uniform1f(e.getUniformLocation(this.progFlow,"uZScale"),this.zScale),e.drawArrays(e.TRIANGLE_STRIP,0,4),e.useProgram(this.progDepth),this.bindQuad(this.progDepth),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,this.texH[this.hWrite],0),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,this.texH[this.hRead]),e.uniform1i(e.getUniformLocation(this.progDepth,"uH"),0),e.activeTexture(e.TEXTURE1),e.bindTexture(e.TEXTURE_2D,this.texQ[this.qWrite]),e.uniform1i(e.getUniformLocation(this.progDepth,"uQ"),1),e.uniform2f(e.getUniformLocation(this.progDepth,"uGridSize"),NX,NY),e.uniform2f(e.getUniformLocation(this.progDepth,"uTexelSize"),1/NX,1/NY),e.uniform1f(e.getUniformLocation(this.progDepth,"uDX"),DX),e.uniform1f(e.getUniformLocation(this.progDepth,"uDT"),DT),e.uniform1f(e.getUniformLocation(this.progDepth,"uInjectionRate"),Math.max(this.dischargeRate,0)),e.uniform2f(e.getUniformLocation(this.progDepth,"uInjectionCoord"),this.injectionCol,this.injectionRow),e.drawArrays(e.TRIANGLE_STRIP,0,4),[this.hRead,this.hWrite]=[this.hWrite,this.hRead],[this.qRead,this.qWrite]=[this.qWrite,this.qRead],this.stepCount+=1,this.stepCount%30===0&&(e.bindFramebuffer(e.FRAMEBUFFER,null),e.viewport(0,0,this.canvas.width,this.canvas.height),e.useProgram(this.progDisplay),this.bindQuad(this.progDisplay),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,this.texH[this.hRead]),e.uniform1i(e.getUniformLocation(this.progDisplay,"uH"),0),e.activeTexture(e.TEXTURE1),e.bindTexture(e.TEXTURE_2D,this.texZ),e.uniform1i(e.getUniformLocation(this.progDisplay,"uZ"),1),e.uniform1f(e.getUniformLocation(this.progDisplay,"uZMin"),this.zMin),e.uniform1f(e.getUniformLocation(this.progDisplay,"uZScale"),this.zScale),e.uniform2f(e.getUniformLocation(this.progDisplay,"uTexelSize"),1/NX,1/NY),e.uniform1f(e.getUniformLocation(this.progDisplay,"uCellSize"),DX),e.uniform1f(e.getUniformLocation(this.progDisplay,"uHillshadeThreshold"),HILLSHADE_THRESHOLD),e.uniform1f(e.getUniformLocation(this.progDisplay,"uDepthScale"),Math.max(this.depthScale,.1)),e.uniform1f(e.getUniformLocation(this.progDisplay,"uZExaggeration"),Math.max(this.hillExaggeration,.1)),e.uniform2f(e.getUniformLocation(this.progDisplay,"uGridSize"),NX,NY),e.uniform1f(e.getUniformLocation(this.progDisplay,"uZenith"),this.sunZenith),e.uniform1f(e.getUniformLocation(this.progDisplay,"uAzimuth"),this.sunAzimuth),e.drawArrays(e.TRIANGLE_STRIP,0,4)),this.animationFrame=requestAnimationFrame(this.step)}}const initHydroPanels=()=>{document.querySelectorAll("[data-hydro-demo]").forEach(e=>{e.__hydro||(e.__hydro=new HydrodynamicsDemo(e))})};document.readyState==="loading"?document.addEventListener("DOMContentLoaded",initHydroPanels):initHydroPanels()