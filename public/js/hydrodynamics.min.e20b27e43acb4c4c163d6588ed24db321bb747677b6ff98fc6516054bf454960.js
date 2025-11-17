const NX=256,NY=256,DT=.01,DX=10,GRAVITY=9.81,MANNING=.035,HFLOW_THRESHOLD=1e-4,FROUDE_LIMIT=.85,HILLSHADE_THRESHOLD=.1,DEFAULT_DEPTH_COLOR_SCALE=2.5,DEM_MIN=0,DEM_MAX=516,vertexShaderSrc=`
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
uniform vec2  uTexelSize;

uniform float uDX;
uniform float uDT;
uniform float uGravity;
uniform float uManning;
uniform float uHFLOW_THRESHOLD;
uniform float uFroudeLimit;

uniform float uZMin;
uniform float uZScale;
uniform float uInflow;
uniform vec2  uInflowRows;

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

  float hflowY = max(z + h, zB + hB) - max(z, zB);
  if ((h > 0.0 || hB > 0.0) && (hflowY > uHFLOW_THRESHOLD)) {
    float surf   = z + h;
    float surfB  = zB + hB;
    float slopeY = (surfB - surf) / uDX;

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

  float hflowX = max(z + h, zL + hL) - max(z, zL);
  if ((h > 0.0 || hL > 0.0) && (hflowX > uHFLOW_THRESHOLD)) {
    float surf  = z + h;
    float surfL = zL + hL;
    float slopeX = (surfL - surf) / uDX;

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

  bool rowInInflow = (row >= uInflowRows.x && row <= uInflowRows.y);
  if (col <= 0.5) {
    qx = rowInInflow ? -uInflow : 0.0;
  }
  if (row <= 0.5 || row >= (uGridSize.y - 1.5)) {
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
  h = max(h + dh, 0.0);
  gl_FragColor = vec4(h, 0.0, 0.0, 1.0);
}
`,displayFragSrc=`
precision highp float;
varying vec2 vUV;

uniform sampler2D uH;
uniform sampler2D uZ;
uniform float uZMin;
uniform float uZScale;
uniform vec2 uTexelSize;
uniform float uCellSize;
uniform float uHillshadeThreshold;
uniform float uDepthScale;

vec3 hillshade(vec2 uv) {
  float center = uZMin + uZScale * texture2D(uZ, uv).r;
  vec2 dx = vec2(uTexelSize.x, 0.0);
  vec2 dy = vec2(0.0, uTexelSize.y);
  float left  = uZMin + uZScale * texture2D(uZ, uv - dx).r;
  float right = uZMin + uZScale * texture2D(uZ, uv + dx).r;
  float down  = uZMin + uZScale * texture2D(uZ, uv + dy).r;
  float up    = uZMin + uZScale * texture2D(uZ, uv - dy).r;

  float dzdx = (right - left) / (2.0 * uCellSize);
  float dzdy = (up - down) / (2.0 * uCellSize);
  vec3 normal = normalize(vec3(-dzdx, -dzdy, 1.0));
  vec3 light = normalize(vec3(-0.4, 0.6, 1.0));
  float shade = clamp(dot(normal, light), 0.0, 1.0);
  return mix(vec3(0.12, 0.14, 0.18), vec3(0.9, 0.92, 0.95), pow(shade, 1.1));
}

void main() {
  vec2 texUV = vec2(vUV.x, 1.0 - vUV.y);
  float h = texture2D(uH, texUV).r;
  vec3 terrain = hillshade(texUV);
  if (h < uHillshadeThreshold) {
    gl_FragColor = vec4(terrain, 1.0);
    return;
  }
  float t = clamp((h - uHillshadeThreshold) / uDepthScale, 0.0, 1.0);
  vec3 water = mix(vec3(1.0), vec3(0.0, 0.1, 0.7), pow(t, 0.8));
  gl_FragColor = vec4(mix(terrain, water, 0.85), 1.0);
}
`;class HydrodynamicsDemo{constructor(e){this.root=e,this.canvas=e.querySelector("canvas"),this.inflowSlider=e.querySelector('[data-role="inflow-slider"]'),this.depthSlider=e.querySelector('[data-role="depth-slider"]'),this.inflowOutput=e.querySelector('[data-role="inflow-output"]'),this.depthOutput=e.querySelector('[data-role="depth-output"]'),this.inflow=Number(this.inflowSlider?.value||0),this.depthScale=Number(this.depthSlider?.value||DEFAULT_DEPTH_COLOR_SCALE),this.zMin=0,this.zScale=1,this.animationFrame=null,this.canvas.width=512,this.canvas.height=512,this.setupControls(),this.initGL(),this.gl&&this.loadDEM()}setupControls(){if(this.inflowSlider&&this.inflowOutput){const e=()=>{this.inflow=Number(this.inflowSlider.value),this.inflowOutput.value=`${this.inflow.toFixed(1)} m^2/s`};this.inflowSlider.addEventListener("input",e),e()}if(this.depthSlider&&this.depthOutput){const e=()=>{this.depthScale=Number(this.depthSlider.value),this.depthOutput.value=`${this.depthScale.toFixed(1)} m`};this.depthSlider.addEventListener("input",e),e()}}initGL(){if(this.gl=this.canvas.getContext("webgl")||this.canvas.getContext("experimental-webgl"),!this.gl){this.root.classList.add("hydro-panel--unsupported");return}const e=this.gl;if(!e.getExtension("OES_texture_float")||!e.getExtension("WEBGL_color_buffer_float")&&!e.getExtension("EXT_color_buffer_float")){this.root.classList.add("hydro-panel--unsupported"),this.gl=null;return}this.quadBuffer=e.createBuffer(),e.bindBuffer(e.ARRAY_BUFFER,this.quadBuffer),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,0,0,1,-1,1,0,-1,1,0,1,1,1,1,1]),e.STATIC_DRAW)}loadDEM(){const e=new Image;e.crossOrigin="Anonymous",e.src=this.root.dataset.dem,e.onload=()=>this.initSimulation(e),e.onerror=()=>this.root.classList.add("hydro-panel--unsupported")}createFloatTexture(e,t,n=null){const s=this.gl,o=s.createTexture();return s.bindTexture(s.TEXTURE_2D,o),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_MIN_FILTER,s.NEAREST),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_MAG_FILTER,s.NEAREST),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_WRAP_S,s.CLAMP_TO_EDGE),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_WRAP_T,s.CLAMP_TO_EDGE),s.texImage2D(s.TEXTURE_2D,0,s.RGBA,e,t,0,s.RGBA,s.FLOAT,n),o}createDEMTexture(e){const s=document.createElement("canvas");s.width=NX,s.height=NY;const n=s.getContext("2d");n.save(),n.translate(0,NY),n.scale(1,-1),n.drawImage(e,0,0,NX,NY),n.restore();const i=n.getImageData(0,0,NX,NY),t=this.gl,o=t.createTexture();return t.bindTexture(t.TEXTURE_2D,o),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.NEAREST),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.NEAREST),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE),t.texImage2D(t.TEXTURE_2D,0,t.RGBA,NX,NY,0,t.RGBA,t.UNSIGNED_BYTE,i.data),this.zMin=DEM_MIN,this.zScale=Math.max(DEM_MAX-DEM_MIN,1e-5),o}compileShader(e,t){const n=this.gl,s=n.createShader(t);if(n.shaderSource(s,e),n.compileShader(s),!n.getShaderParameter(s,n.COMPILE_STATUS))throw console.error(n.getShaderInfoLog(s)),new Error("Shader compile error");return s}createProgram(e,t){const n=this.gl,s=n.createProgram(),o=this.compileShader(e,n.VERTEX_SHADER),i=this.compileShader(t,n.FRAGMENT_SHADER);if(n.attachShader(s,o),n.attachShader(s,i),n.linkProgram(s),!n.getProgramParameter(s,n.LINK_STATUS))throw console.error(n.getProgramInfoLog(s)),new Error("Program link error");return s}bindQuad(e){const t=this.gl,n=t.getAttribLocation(e,"aPos"),s=t.getAttribLocation(e,"aUV");t.bindBuffer(t.ARRAY_BUFFER,this.quadBuffer),t.enableVertexAttribArray(n),t.vertexAttribPointer(n,2,t.FLOAT,!1,16,0),t.enableVertexAttribArray(s),t.vertexAttribPointer(s,2,t.FLOAT,!1,16,8)}initSimulation(e){const t=this.gl;try{this.texZ=this.createDEMTexture(e);const n=new Float32Array(NX*NY*4);this.texH=[this.createFloatTexture(NX,NY,n),this.createFloatTexture(NX,NY,n)],this.texQ=[this.createFloatTexture(NX,NY,n),this.createFloatTexture(NX,NY,n)],this.fb=t.createFramebuffer(),this.progFlow=this.createProgram(vertexShaderSrc,flowRouteFragSrc),this.progDepth=this.createProgram(vertexShaderSrc,depthUpdateFragSrc),this.progDisplay=this.createProgram(vertexShaderSrc,displayFragSrc),this.hRead=0,this.hWrite=1,this.qRead=0,this.qWrite=1,this.seedInitialWater(.001),this.step()}catch(e){console.error(e),this.root.classList.add("hydro-panel--unsupported")}}seedInitialWater(e){const t=new Float32Array(NX*NY*4);for(let n=0;n<NX*NY;n+=1)t[4*n]=e;this.gl.bindTexture(this.gl.TEXTURE_2D,this.texH[this.hRead]),this.gl.texImage2D(this.gl.TEXTURE_2D,0,this.gl.RGBA,NX,NY,0,this.gl.RGBA,this.gl.FLOAT,t)}step=()=>{const e=this.gl;if(!e)return;e.bindFramebuffer(e.FRAMEBUFFER,this.fb),e.useProgram(this.progFlow),this.bindQuad(this.progFlow),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,this.texQ[this.qWrite],0),e.viewport(0,0,NX,NY),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,this.texH[this.hRead]),e.uniform1i(e.getUniformLocation(this.progFlow,"uH"),0),e.activeTexture(e.TEXTURE1),e.bindTexture(e.TEXTURE_2D,this.texZ),e.uniform1i(e.getUniformLocation(this.progFlow,"uZ"),1),e.activeTexture(e.TEXTURE2),e.bindTexture(e.TEXTURE_2D,this.texQ[this.qRead]),e.uniform1i(e.getUniformLocation(this.progFlow,"uQ"),2),e.uniform2f(e.getUniformLocation(this.progFlow,"uGridSize"),NX,NY),e.uniform2f(e.getUniformLocation(this.progFlow,"uTexelSize"),1/NX,1/NY),e.uniform1f(e.getUniformLocation(this.progFlow,"uDX"),DX),e.uniform1f(e.getUniformLocation(this.progFlow,"uDT"),DT),e.uniform1f(e.getUniformLocation(this.progFlow,"uGravity"),GRAVITY),e.uniform1f(e.getUniformLocation(this.progFlow,"uManning"),MANNING),e.uniform1f(e.getUniformLocation(this.progFlow,"uHFLOW_THRESHOLD"),HFLOW_THRESHOLD),e.uniform1f(e.getUniformLocation(this.progFlow,"uFroudeLimit"),FROUDE_LIMIT),e.uniform1f(e.getUniformLocation(this.progFlow,"uZMin"),this.zMin),e.uniform1f(e.getUniformLocation(this.progFlow,"uZScale"),this.zScale),e.uniform1f(e.getUniformLocation(this.progFlow,"uInflow"),this.inflow);const t=Number(this.root.dataset.rowStart||180),n=Number(this.root.dataset.rowEnd||186);e.uniform2f(e.getUniformLocation(this.progFlow,"uInflowRows"),t,n),e.drawArrays(e.TRIANGLE_STRIP,0,4),e.useProgram(this.progDepth),this.bindQuad(this.progDepth),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,this.texH[this.hWrite],0),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,this.texH[this.hRead]),e.uniform1i(e.getUniformLocation(this.progDepth,"uH"),0),e.activeTexture(e.TEXTURE1),e.bindTexture(e.TEXTURE_2D,this.texQ[this.qWrite]),e.uniform1i(e.getUniformLocation(this.progDepth,"uQ"),1),e.uniform2f(e.getUniformLocation(this.progDepth,"uGridSize"),NX,NY),e.uniform2f(e.getUniformLocation(this.progDepth,"uTexelSize"),1/NX,1/NY),e.uniform1f(e.getUniformLocation(this.progDepth,"uDX"),DX),e.uniform1f(e.getUniformLocation(this.progDepth,"uDT"),DT),e.drawArrays(e.TRIANGLE_STRIP,0,4),[this.hRead,this.hWrite]=[this.hWrite,this.hRead],[this.qRead,this.qWrite]=[this.qWrite,this.qRead],e.bindFramebuffer(e.FRAMEBUFFER,null),e.viewport(0,0,this.canvas.width,this.canvas.height),e.useProgram(this.progDisplay),this.bindQuad(this.progDisplay),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,this.texH[this.hRead]),e.uniform1i(e.getUniformLocation(this.progDisplay,"uH"),0),e.activeTexture(e.TEXTURE1),e.bindTexture(e.TEXTURE_2D,this.texZ),e.uniform1i(e.getUniformLocation(this.progDisplay,"uZ"),1),e.uniform1f(e.getUniformLocation(this.progDisplay,"uZMin"),this.zMin),e.uniform1f(e.getUniformLocation(this.progDisplay,"uZScale"),this.zScale),e.uniform2f(e.getUniformLocation(this.progDisplay,"uTexelSize"),1/NX,1/NY),e.uniform1f(e.getUniformLocation(this.progDisplay,"uCellSize"),DX),e.uniform1f(e.getUniformLocation(this.progDisplay,"uHillshadeThreshold"),HILLSHADE_THRESHOLD),e.uniform1f(e.getUniformLocation(this.progDisplay,"uDepthScale"),Math.max(this.depthScale,.1)),e.drawArrays(e.TRIANGLE_STRIP,0,4),this.animationFrame=requestAnimationFrame(this.step)}}const initHydroPanels=()=>{document.querySelectorAll("[data-hydro-demo]").forEach(e=>{e.__hydro||(e.__hydro=new HydrodynamicsDemo(e))})};document.readyState==="loading"?document.addEventListener("DOMContentLoaded",initHydroPanels):initHydroPanels()