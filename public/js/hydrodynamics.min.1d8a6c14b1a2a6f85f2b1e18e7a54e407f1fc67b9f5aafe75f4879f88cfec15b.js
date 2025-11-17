const NX=256,NY=256,DT=.5,DX=10,GRAVITY=9.81,MANNING=.035,HFLOW_THRESHOLD=1e-4,FROUDE_LIMIT=.85,HILLSHADE_THRESHOLD=.1,DEFAULT_DEPTH_COLOR_SCALE=2.5,SUN_ZENITH_RAD=34*Math.PI/180,SUN_AZIMUTH_RAD=90*Math.PI/180,DEFAULT_HILL_EXAGGERATION=1.5,DISPLAY_UPDATE_STEPS=30,GRAPHFLOOD_DT=.02,GRAPHFLOOD_ITERATIONS=20,GRAPHFLOOD_WARMUP_ITERATIONS=20,GRAPHFLOOD_MANNING=.033,GRAPHFLOOD_FILL_STEP=1e-4,BC_DEFAULT=0,BC_OUTFLOW=1,SECONDS_PER_YEAR=365*24*3600,PRECIP_DEFAULT_MM_PER_HR=5,MAX_BOUNDARY_ENTRIES=4,BOUNDARY_ENTRY_WINDOW=10,MODE_TRANSIENT="transient",MODE_STATIONARY="stationary",DISPLAY_MODE_DEPTH="depth",DISPLAY_MODE_DISCHARGE="discharge",QW_SCALE_MIN=.1,QW_SCALE_MAX=500,DEFAULT_QW_SCALE=100,DEFAULT_QW_OPACITY=.65,VIEW_MODE_2D="2d",VIEW_MODE_3D="3d",TERRAIN_EXTENT=Math.max(NX,NY)*DX,DEFAULT_CAMERA_RADIUS=TERRAIN_EXTENT*1.35,CAMERA_MIN_RADIUS=TERRAIN_EXTENT*.25,CAMERA_MAX_RADIUS=TERRAIN_EXTENT*4,CAMERA_PHI_MIN=.2,CAMERA_PHI_MAX=Math.PI/2-.1,CAMERA_ROTATION_SPEED=.005,CAMERA_PHI_SPEED=.003,CAMERA_ZOOM_SPEED=.0015,CAMERA_FOV=45*Math.PI/180,CAMERA_THETA_DEFAULT=225*Math.PI/180,CAMERA_PHI_DEFAULT=35*Math.PI/180,TERRAIN_VERTICAL_RELATIVE_SCALE=.15,clamp=(e,t,n)=>Math.min(Math.max(e,t),n),createMat4=()=>new Float32Array(16);function mat4Multiply(e,t,n){const m=t[0],w=t[1],_=t[2],y=t[3],j=t[4],f=t[5],l=t[6],d=t[7],u=t[8],h=t[9],r=t[10],c=t[11],p=t[12],g=t[13],v=t[14],b=t[15];let s=n[0],a=n[1],i=n[2],o=n[3];return e[0]=s*m+a*j+i*u+o*p,e[1]=s*w+a*f+i*h+o*g,e[2]=s*_+a*l+i*r+o*v,e[3]=s*y+a*d+i*c+o*b,s=n[4],a=n[5],i=n[6],o=n[7],e[4]=s*m+a*j+i*u+o*p,e[5]=s*w+a*f+i*h+o*g,e[6]=s*_+a*l+i*r+o*v,e[7]=s*y+a*d+i*c+o*b,s=n[8],a=n[9],i=n[10],o=n[11],e[8]=s*m+a*j+i*u+o*p,e[9]=s*w+a*f+i*h+o*g,e[10]=s*_+a*l+i*r+o*v,e[11]=s*y+a*d+i*c+o*b,s=n[12],a=n[13],i=n[14],o=n[15],e[12]=s*m+a*j+i*u+o*p,e[13]=s*w+a*f+i*h+o*g,e[14]=s*_+a*l+i*r+o*v,e[15]=s*y+a*d+i*c+o*b,e}function mat4LookAt(e,t,n,s){let d,c,l,g,p,f,r,i,a,o;const h=t[0],m=t[1],u=t[2],v=s[0],b=s[1],j=s[2],y=n[0],_=n[1],w=n[2];return Math.abs(h-y)<1e-6&&Math.abs(m-_)<1e-6&&Math.abs(u-w)<1e-6?mat4Identity(e):(r=h-y,i=m-_,a=u-w,o=1/Math.hypot(r,i,a),r*=o,i*=o,a*=o,d=b*a-j*i,c=j*r-v*a,l=v*i-b*r,o=Math.hypot(d,c,l),o?(o=1/o,d*=o,c*=o,l*=o):(d=0,c=0,l=0),g=i*l-a*c,p=a*d-r*l,f=r*c-i*d,e[0]=d,e[1]=c,e[2]=l,e[3]=0,e[4]=g,e[5]=p,e[6]=f,e[7]=0,e[8]=r,e[9]=i,e[10]=a,e[11]=0,e[12]=-(d*h+c*m+l*u),e[13]=-(g*h+p*m+f*u),e[14]=-(r*h+i*m+a*u),e[15]=1,e)}function mat4Identity(e){return e[0]=1,e[1]=0,e[2]=0,e[3]=0,e[4]=0,e[5]=1,e[6]=0,e[7]=0,e[8]=0,e[9]=0,e[10]=1,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,e}function mat4Perspective(e,t,n,s,o){const i=1/Math.tan(t/2);return e[0]=i/n,e[1]=0,e[2]=0,e[3]=0,e[4]=0,e[5]=i,e[6]=0,e[7]=0,e[8]=0,e[9]=0,e[10]=(o+s)/(s-o),e[11]=-1,e[12]=0,e[13]=0,e[14]=2*o*s/(s-o),e[15]=0,e}const vertexShaderSrc=`
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
`,displayFragSrc=`
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
`,terrainVertexShaderSrc=`
precision highp float;

attribute vec2 aGridCoord;

uniform mat4 uViewProj;
uniform vec2 uGridSize;
uniform float uCellSize;
uniform sampler2D uZ;
uniform sampler2D uH;
uniform float uZMin;
uniform float uZScale;
uniform float uHeightScale;
uniform float uWaterScale;
uniform float uHeightOffset;

varying vec2 vUV;

void main() {
  vec2 uv = (aGridCoord + 0.5) / uGridSize;
  float terrainHeight = uZMin + uZScale * texture2D(uZ, uv).r;
  float depth = texture2D(uH, uv).r;
  float worldHeight = terrainHeight * uHeightScale + depth * uWaterScale + uHeightOffset;
  float spanX = (uGridSize.x - 1.0) * uCellSize;
  float spanY = (uGridSize.y - 1.0) * uCellSize;
  float worldX = (aGridCoord.x * uCellSize) - spanX * 0.5;
  float flippedRow = (uGridSize.y - 1.0) - aGridCoord.y;
  float worldZ = (flippedRow * uCellSize) - spanY * 0.5;
  vUV = uv;
  gl_Position = uViewProj * vec4(worldX, worldHeight, worldZ, 1.0);
}
`,terrainFragmentShaderSrc=`
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
`;class MinHeap{constructor(e){this.size=0,this.nodes=new Uint32Array(e),this.keys=new Float32Array(e)}isEmpty(){return this.size===0}push(e,t){let n=this.size;for(this.nodes[n]=e,this.keys[n]=t,this.size+=1;n>0;){const e=n-1>>1;if(this.keys[e]<=this.keys[n])break;this.swap(n,e),n=e}}pop(){if(this.size===0)return null;const e=this.nodes[0];return this.size-=1,this.size>0&&(this.nodes[0]=this.nodes[this.size],this.keys[0]=this.keys[this.size],this.heapify(0)),e}swap(e,t){const n=this.nodes[e],s=this.keys[e];this.nodes[e]=this.nodes[t],this.keys[e]=this.keys[t],this.nodes[t]=n,this.keys[t]=s}heapify(e){for(;!0;){let t=e;const n=2*e+1,s=2*e+2;if(n<this.size&&this.keys[n]<this.keys[t]&&(t=n),s<this.size&&this.keys[s]<this.keys[t]&&(t=s),t===e)break;this.swap(e,t),e=t}}reset(){this.size=0}}class HydrodynamicsDemo{constructor(e){this.root=e,this.canvasWrapper=e.querySelector(".hydro-canvas"),this.canvas=e.querySelector("canvas"),this.dischargeSlider=e.querySelector('[data-role="discharge-slider"]'),this.depthSlider=e.querySelector('[data-role="depth-slider"]'),this.metricLabel=e.querySelector('[data-role="metric-label"]'),this.displayModeSelect=e.querySelector('[data-role="display-mode"]'),this.displayModeButtons=Array.from(e.querySelectorAll('[data-role="display-mode-button"]')||[]),this.viewModeButtons=Array.from(e.querySelectorAll('[data-role="view-toggle-button"]')||[]),this.sunDirSlider=e.querySelector('[data-role="sun-dir-slider"]'),this.sunZenithSlider=e.querySelector('[data-role="sun-zenith-slider"]'),this.hillContrastSlider=e.querySelector('[data-role="hill-contrast-slider"]'),this.precipSlider=e.querySelector('[data-role="precip-slider"]'),this.scaleBar=e.querySelector('[data-role="hydro-scale-bar"]'),this.modeRadios=Array.from(e.querySelectorAll('[data-role="mode-input"]')||[]),this.timeReadout=e.querySelector('[data-role="hydro-time"]'),this.dischargeOutput=e.querySelector('[data-role="discharge-output"]'),this.depthOutput=e.querySelector('[data-role="depth-output"]'),this.precipOutput=e.querySelector('[data-role="precip-output"]'),this.qOpacitySlider=e.querySelector('[data-role="qw-opacity-slider"]'),this.qOpacityOutput=e.querySelector('[data-role="qw-opacity-output"]'),this.qOpacityGroup=e.querySelector('[data-role="qw-opacity-group"]'),this.discharge=Number(this.dischargeSlider?.value||0),this.depthScale=Number(this.depthSlider?.value||DEFAULT_DEPTH_COLOR_SCALE),this.qDischargeScale=DEFAULT_QW_SCALE,this.hillExaggeration=Number(this.hillContrastSlider?.value||DEFAULT_HILL_EXAGGERATION),this.dischargeRate=this.convertDischargeToRate(this.discharge),this.mode=MODE_TRANSIENT,this.displayMode=DISPLAY_MODE_DEPTH,this.viewMode=VIEW_MODE_2D,this.zMin=0,this.zScale=1,this.injectionCol=0,this.injectionRow=NY-1-183,this.boundaryEntryWindow=BOUNDARY_ENTRY_WINDOW,this.entryWestRows=[this.injectionRow],this.entryEastRows=[],this.entryNorthCols=[],this.entrySouthCols=[],this.refreshBoundaryUniforms(),this.precipRate=this.mmPerHourToMs(Number(this.precipSlider?.value||PRECIP_DEFAULT_MM_PER_HR)),this.qOverlayOpacity=Number(this.qOpacitySlider?.value||DEFAULT_QW_OPACITY),this.qMinLog=-1,this.sunZenith=this.degToRad(Number(this.sunZenithSlider?.value||SUN_ZENITH_RAD*180/Math.PI)),this.sunAzimuth=this.degToRad(Number(this.sunDirSlider?.value||SUN_AZIMUTH_RAD*180/Math.PI)),this.animationFrame=null,this.simSteps=0,this.iterationsSinceDisplay=0,this.simTime=0,this.pendingModeReset=null,this.iterationsSinceDisplay=0,this.stationaryWarmupDone=!1,this.graphFloodInitialized=!1,this.graphFloodBusy=!1,this.gfZ=null,this.gfH=null,this.gfTexBuffer=null,this.terrainVertexBuffer=null,this.terrainIndexBuffer=null,this.terrainIndexCount=0,this.terrainIndexType=null,this.terrainAttribLocation=null,this.terrainVAO=null,this.vaoExt=null,this.viewMatrix=createMat4(),this.projMatrix=createMat4(),this.viewProjMatrix=createMat4(),this.cameraTarget=[0,0,0],this.cameraEye=[0,0,0],this.cameraUp=[0,1,0],this.cameraRadius=DEFAULT_CAMERA_RADIUS,this.cameraTheta=CAMERA_THETA_DEFAULT,this.cameraPhi=CAMERA_PHI_DEFAULT,this.cameraDragging=!1,this.cameraPointerId=null,this.cameraLast={x:0,y:0},this.cameraControlsAttached=!1,this.canvas.width=512,this.canvas.height=512,this.updateScaleBar=this.updateScaleBar.bind(this),this.handlePointerDown=this.handlePointerDown.bind(this),this.handlePointerMove=this.handlePointerMove.bind(this),this.handlePointerUp=this.handlePointerUp.bind(this),this.handleWheel=this.handleWheel.bind(this),this.handleResize=()=>{this.updateScaleBar(),this.resizeCanvas(),this.gl&&this.renderDisplay()},this.resizeCanvas(),this.setupControls(),this.updateScaleBar(),this.updateTimeReadout(),this.setupCameraControls(),window.addEventListener("resize",this.handleResize),this.initGL(),this.gl&&this.loadDEM()}setupControls(){if(this.modeRadios.length&&this.modeRadios.forEach(e=>{e.checked&&(this.mode=e.value),e.addEventListener("change",()=>{if(!e.checked||e.value===this.mode)return;this.mode=e.value,this.handleModeSwitch()})}),this.dischargeSlider&&this.dischargeOutput){const e=()=>{this.discharge=Number(this.dischargeSlider.value),this.dischargeRate=this.convertDischargeToRate(this.discharge),this.setOutputValue(this.dischargeOutput,`${this.discharge.toFixed(0)} m^3/s`)};this.dischargeSlider.addEventListener("input",e),e()}if(this.depthSlider&&this.depthOutput){const e=()=>{const e=Number(this.depthSlider.value);this.displayMode===DISPLAY_MODE_DISCHARGE?(this.qDischargeScale=Math.min(Math.max(e,QW_SCALE_MIN),QW_SCALE_MAX),this.setOutputValue(this.depthOutput,`${this.qDischargeScale.toFixed(1)} m^3/s`)):(this.depthScale=Math.max(e,.1),this.setOutputValue(this.depthOutput,`${this.depthScale.toFixed(1)} m`)),this.gl&&this.renderDisplay()};this.depthSlider.addEventListener("input",e)}if(this.displayModeSelect?(this.displayModeSelect.addEventListener("change",()=>{this.setDisplayMode(this.displayModeSelect.value)}),this.setDisplayMode(this.displayModeSelect.value||DISPLAY_MODE_DEPTH)):this.syncMetricSliderView(),this.qOpacitySlider&&this.qOpacityOutput){const e=()=>{this.qOverlayOpacity=Math.min(Math.max(Number(this.qOpacitySlider.value),0),1),this.setOutputValue(this.qOpacityOutput,`${Math.round(this.qOverlayOpacity*100)}%`),this.displayMode===DISPLAY_MODE_DISCHARGE&&this.gl&&this.renderDisplay()};this.qOpacitySlider.addEventListener("input",e),e()}if(this.sunDirSlider){const e=()=>{const e=Number(this.sunDirSlider.value);this.sunAzimuth=this.degToRad(e)};this.sunDirSlider.addEventListener("input",e),e()}if(this.sunZenithSlider){const e=()=>{const e=Number(this.sunZenithSlider.value);this.sunZenith=this.degToRad(e)};this.sunZenithSlider.addEventListener("input",e),e()}if(this.hillContrastSlider){const e=()=>{this.hillExaggeration=Number(this.hillContrastSlider.value)};this.hillContrastSlider.addEventListener("input",e),e()}if(this.precipSlider&&this.precipOutput){const e=()=>{const e=Number(this.precipSlider.value);this.precipRate=this.mmPerHourToMs(e),this.setOutputValue(this.precipOutput,`${e.toFixed(0)} mm/hr`)};this.precipSlider.addEventListener("input",e),e()}else this.precipRate=this.mmPerHourToMs(PRECIP_DEFAULT_MM_PER_HR),this.precipOutput&&this.setOutputValue(this.precipOutput,`${PRECIP_DEFAULT_MM_PER_HR} mm/hr`);this.displayModeButtons.length&&this.displayModeButtons.forEach(e=>{e.addEventListener("click",()=>{this.setDisplayMode(e.dataset.mode)})}),this.viewModeButtons.length&&this.viewModeButtons.forEach(e=>{e.addEventListener("click",()=>{this.setViewMode(e.dataset.view)})}),this.updateDisplayModeButtons(),this.updateViewButtons()}resizeCanvas(){if(!this.canvas)return;const e=this.canvasWrapper?.getBoundingClientRect(),t=Math.max(1,Math.floor(e?.width||this.canvas.clientWidth||this.canvas.width||0)),n=Math.max(1,Math.floor(e?.height||this.canvas.clientHeight||this.canvas.height||0));(this.canvas.width!==t||this.canvas.height!==n)&&(this.canvas.width=t,this.canvas.height=n)}setupCameraControls(){if(!this.canvas||this.cameraControlsAttached)return;this.canvas.addEventListener("pointerdown",this.handlePointerDown),this.canvas.addEventListener("pointermove",this.handlePointerMove),this.canvas.addEventListener("wheel",this.handleWheel,{passive:!1}),window.addEventListener("pointerup",this.handlePointerUp),window.addEventListener("pointercancel",this.handlePointerUp),this.cameraControlsAttached=!0}handlePointerDown(e){if(this.viewMode!==VIEW_MODE_3D)return;e.preventDefault(),this.cameraDragging=!0,this.cameraPointerId=e.pointerId,this.cameraLast.x=e.clientX,this.cameraLast.y=e.clientY,this.canvas.setPointerCapture&&this.canvas.setPointerCapture(e.pointerId)}handlePointerMove(e){if(!this.cameraDragging||this.viewMode!==VIEW_MODE_3D||e.pointerId!==this.cameraPointerId)return;const t=e.clientX-this.cameraLast.x,n=e.clientY-this.cameraLast.y;this.cameraLast.x=e.clientX,this.cameraLast.y=e.clientY,this.cameraTheta-=t*CAMERA_ROTATION_SPEED,this.cameraPhi=clamp(this.cameraPhi-n*CAMERA_PHI_SPEED,CAMERA_PHI_MIN,CAMERA_PHI_MAX),this.renderDisplay()}handlePointerUp(e){if(e.pointerId!==this.cameraPointerId)return;this.cameraDragging=!1,this.canvas.releasePointerCapture&&this.canvas.releasePointerCapture(e.pointerId),this.cameraPointerId=null}handleWheel(e){if(this.viewMode!==VIEW_MODE_3D)return;e.preventDefault();const t=e.deltaY*CAMERA_ZOOM_SPEED*this.cameraRadius;this.cameraRadius=clamp(this.cameraRadius+t,CAMERA_MIN_RADIUS,CAMERA_MAX_RADIUS),this.renderDisplay()}convertDischargeToRate(e){return e/(DX*DX)}degToRad(e){return e*Math.PI/180}mmPerHourToMs(e){return Number.isFinite(e)?e/1e3/3600:0}setOutputValue(e,t){if(!e)return;"value"in e&&(e.value=t),e.textContent=t}syncMetricSliderView(){if(!this.depthSlider||!this.depthOutput)return;this.displayMode===DISPLAY_MODE_DISCHARGE?(this.depthSlider.min=`${QW_SCALE_MIN}`,this.depthSlider.max=`${QW_SCALE_MAX}`,this.depthSlider.step="0.1",this.depthSlider.value=`${this.qDischargeScale}`,this.metricLabel&&(this.metricLabel.textContent="Max discharge (m^3/s)"),this.qOpacityGroup&&(this.qOpacityGroup.hidden=!1),this.setOutputValue(this.depthOutput,`${this.qDischargeScale.toFixed(1)} m^3/s`)):(this.depthSlider.min="0.5",this.depthSlider.max="3",this.depthSlider.step="0.1",this.depthSlider.value=`${this.depthScale}`,this.metricLabel&&(this.metricLabel.textContent="Depth scale for blue (m)"),this.qOpacityGroup&&(this.qOpacityGroup.hidden=!0),this.setOutputValue(this.depthOutput,`${this.depthScale.toFixed(1)} m`)),this.updateDisplayModeButtons()}setDisplayMode(e){const t=e===DISPLAY_MODE_DISCHARGE?DISPLAY_MODE_DISCHARGE:DISPLAY_MODE_DEPTH;if(t===this.displayMode)return;this.displayMode=t,this.displayModeSelect&&this.displayModeSelect.value!==t&&(this.displayModeSelect.value=t),this.syncMetricSliderView(),this.updateDisplayModeButtons(),this.gl&&this.renderDisplay()}updateDisplayModeButtons(){if(!this.displayModeButtons||this.displayModeButtons.length===0)return;this.displayModeButtons.forEach(e=>{const n=e.dataset.mode===DISPLAY_MODE_DISCHARGE?DISPLAY_MODE_DISCHARGE:DISPLAY_MODE_DEPTH,t=n===this.displayMode;e.classList.toggle("is-active",t),e.setAttribute("aria-pressed",t?"true":"false")})}setViewMode(e){const t=e===VIEW_MODE_3D?VIEW_MODE_3D:VIEW_MODE_2D;if(t===this.viewMode)return;this.viewMode=t,this.updateViewButtons(),this.gl&&this.renderDisplay()}updateViewButtons(){if(!this.viewModeButtons||this.viewModeButtons.length===0)return;this.viewModeButtons.forEach(e=>{const n=e.dataset.view===VIEW_MODE_3D?VIEW_MODE_3D:VIEW_MODE_2D,t=n===this.viewMode;e.classList.toggle("is-active",t),e.setAttribute("aria-pressed",t?"true":"false")})}getTerrainScaleFactors(){const n=Math.max(NX-1,NY-1)*DX,t=Math.max(this.zScale||1,.001),s=TERRAIN_VERTICAL_RELATIVE_SCALE*n/t,o=Math.max(this.hillExaggeration,.1),e=s*o,i=this.zMin+.5*t,a=-(i*e);return{heightScale:e,waterScale:e,heightOffset:a}}getCurrentQMaxLog(){const e=Math.max(QW_SCALE_MIN,Math.min(QW_SCALE_MAX,this.qDischargeScale||QW_SCALE_MIN));return Math.log10(e)}isValueWithinEntries(e,t){if(!t||t.length===0)return!1;for(let n=0;n<t.length;n+=1){const s=t[n];if(s==null||s<0)continue;if(Math.abs(e-s)<=this.boundaryEntryWindow)return!0}return!1}isBoundaryEntryCell(e,t){return!!(t===0&&this.isValueWithinEntries(e,this.entryWestRows))||!!(t===NX-1&&this.isValueWithinEntries(e,this.entryEastRows))||!!(e===0&&this.isValueWithinEntries(t,this.entrySouthCols))||!!(e===NY-1&&this.isValueWithinEntries(t,this.entryNorthCols))}updateScaleBar(){if(!this.scaleBar||!this.canvas)return;const t=this.canvas.getBoundingClientRect(),n=t.width||this.canvas.clientWidth||this.canvas.width||0,e=NX*DX;if(e<=0)return;const s=n/e,o=Math.max(s*100,6);this.scaleBar.style.width=`${o}px`}refreshBoundaryUniforms(){const e=e=>{const t=new Float32Array(MAX_BOUNDARY_ENTRIES);for(let n=0;n<MAX_BOUNDARY_ENTRIES;n+=1)t[n]=n<e.length?e[n]:-1;return t};this.boundaryUniforms={west:e(this.entryWestRows),east:e(this.entryEastRows),north:e(this.entryNorthCols),south:e(this.entrySouthCols)}}updateTimeReadout(){if(!this.timeReadout)return;if(this.mode===MODE_STATIONARY){this.timeReadout.textContent="--";return}const e=Math.max(this.simTime,0);let t;e>=600?t=`${(e/60).toFixed(1)} min`:t=`${e.toFixed(1)} s`,this.timeReadout.textContent=t}handleModeSwitch(){const e=this.mode===MODE_TRANSIENT;if(!this.texH||!this.texQ){this.pendingModeReset=e;return}this.resetSimulation({seed:e}),this.pendingModeReset=null,this.stationaryWarmupDone=this.mode!==MODE_STATIONARY}resetSimulation({seed:e=!0}={}){if(!this.gl||!this.texH||!this.texQ)return;const n=new Float32Array(NX*NY*4),t=this.gl;[this.hRead,this.hWrite].forEach(e=>{t.bindTexture(t.TEXTURE_2D,this.texH[e]),t.texImage2D(t.TEXTURE_2D,0,t.RGBA,NX,NY,0,t.RGBA,t.FLOAT,n)}),[this.qRead,this.qWrite].forEach(e=>{t.bindTexture(t.TEXTURE_2D,this.texQ[e]),t.texImage2D(t.TEXTURE_2D,0,t.RGBA,NX,NY,0,t.RGBA,t.FLOAT,n)}),e&&this.seedInitialWater(.001),this.simSteps=0,this.iterationsSinceDisplay=0,this.simTime=0,this.updateTimeReadout(),this.stationaryWarmupDone=this.mode!==MODE_STATIONARY,this.graphFloodBusy=!1,this.mode===MODE_STATIONARY&&(this.ensureGraphFloodFields(),this.resetGraphFloodState())}initGL(){if(this.gl=this.canvas.getContext("webgl")||this.canvas.getContext("experimental-webgl"),!this.gl){this.root.classList.add("hydro-panel--unsupported");return}const e=this.gl;if(!e.getExtension("OES_texture_float")||!e.getExtension("WEBGL_color_buffer_float")&&!e.getExtension("EXT_color_buffer_float")){this.root.classList.add("hydro-panel--unsupported"),this.gl=null;return}this.vaoExt=e.getExtension("OES_vertex_array_object")||null,e.clearColor(0,0,0,1),this.quadBuffer=e.createBuffer(),e.bindBuffer(e.ARRAY_BUFFER,this.quadBuffer),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,0,0,1,-1,1,0,-1,1,0,1,1,1,1,1]),e.STATIC_DRAW),this.ensureTerrainGeometry()}ensureTerrainGeometry(){if(!this.gl||this.terrainVertexBuffer)return;const e=this.gl,r=NX*NY,s=new Float32Array(r*2);let o=0;for(let e=0;e<NY;e+=1)for(let t=0;t<NX;t+=1)s[o++]=t,s[o++]=e;const i=NX-1,a=NY-1,t=new Uint16Array(i*a*6);let n=0;for(let e=0;e<a;e+=1)for(let s=0;s<i;s+=1){const o=e*NX+s,r=o+1,a=o+NX,c=a+1;t[n++]=o,t[n++]=a,t[n++]=r,t[n++]=r,t[n++]=a,t[n++]=c}this.terrainVertexBuffer=e.createBuffer(),e.bindBuffer(e.ARRAY_BUFFER,this.terrainVertexBuffer),e.bufferData(e.ARRAY_BUFFER,s,e.STATIC_DRAW),this.terrainIndexBuffer=e.createBuffer(),e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,this.terrainIndexBuffer),e.bufferData(e.ELEMENT_ARRAY_BUFFER,t,e.STATIC_DRAW),this.terrainIndexCount=t.length,this.terrainIndexType=e.UNSIGNED_SHORT}setupTerrainAttributes(){if(!this.gl||!this.progTerrain||!this.terrainVertexBuffer||!this.terrainIndexBuffer)return;const e=this.gl;this.terrainAttribLocation=e.getAttribLocation(this.progTerrain,"aGridCoord"),this.vaoExt&&(this.terrainVAO&&this.vaoExt.deleteVertexArrayOES(this.terrainVAO),this.terrainVAO=this.vaoExt.createVertexArrayOES(),this.vaoExt.bindVertexArrayOES(this.terrainVAO),e.bindBuffer(e.ARRAY_BUFFER,this.terrainVertexBuffer),e.enableVertexAttribArray(this.terrainAttribLocation),e.vertexAttribPointer(this.terrainAttribLocation,2,e.FLOAT,!1,8,0),e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,this.terrainIndexBuffer),this.vaoExt.bindVertexArrayOES(null))}waitForGeoTIFF(){return window.GeoTIFF?Promise.resolve(window.GeoTIFF):new Promise((e,t)=>{const s=setTimeout(()=>t(new Error("GeoTIFF library failed to load")),8e3),n=()=>{window.GeoTIFF?(clearTimeout(s),e(window.GeoTIFF)):requestAnimationFrame(n)};n()})}async loadDEM(){try{const d=await this.waitForGeoTIFF(),h=this.root.dataset.dem,u=await d.fromUrl(h),e=await u.getImage(),s=e.getWidth(),o=e.getHeight();(s!==NX||o!==NY)&&console.warn("[Hydrodynamics] DEM dimensions differ from shader grid:",s,o);const r=e.getGDALNoData(),t=await e.readRasters({interleave:!0,samples:[0]}),c=t instanceof Float32Array?t:new Float32Array(t),{texture:l,min:i,max:a,demArray:n}=this.createDEMTexture(c,s,o,r);this.texZ=l,this.zMin=i,this.zScale=Math.max(a-i,1e-5),this.demElevation=n,this.graphFloodInitialized&&this.gfZ&&n&&this.gfZ.set(n),this._demLogged||(console.info("[Hydrodynamics] DEM elevations:",i.toFixed(2),"→",a.toFixed(2),"m"),this._demLogged=!0),this.initSimulation()}catch(e){console.error("[Hydrodynamics] Failed to load DEM GeoTIFF:",e),this.root.classList.add("hydro-panel--unsupported")}}createFloatTexture(e,t,n=null){const s=this.gl,o=s.createTexture();return s.bindTexture(s.TEXTURE_2D,o),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_MIN_FILTER,s.NEAREST),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_MAG_FILTER,s.NEAREST),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_WRAP_S,s.CLAMP_TO_EDGE),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_WRAP_T,s.CLAMP_TO_EDGE),s.texImage2D(s.TEXTURE_2D,0,s.RGBA,e,t,0,s.RGBA,s.FLOAT,n),o}createDEMTexture(e,t,n,s=null){if(!e||e.length!==t*n)throw new Error("DEM raster size mismatch");let o=1/0,i=-(1/0);for(let n=0;n<e.length;n+=1){let t=e[n];(!Number.isFinite(t)||s!=null&&t===s)&&(t=0),e[n]=t,t<o&&(o=t),t>i&&(i=t)}(!Number.isFinite(o)||!Number.isFinite(i))&&(o=0,i=1);const c=Math.max(i-o,1e-5),l=1/c,a=new Float32Array(t*n*4),r=new Float32Array(t*n);for(let s=0;s<n;s+=1){const i=n-1-s;for(let n=0;n<t;n+=1){const m=i*t+n,u=s*t+n,h=e[m],d=Math.min(Math.max((h-o)*l,0),1),c=u*4;a[c]=d,a[c+1]=d,a[c+2]=d,a[c+3]=1,r[u]=h}}const d=this.createFloatTexture(t,n,a);return{texture:d,min:o,max:i,demArray:r}}compileShader(e,t){const n=this.gl,s=n.createShader(t);if(n.shaderSource(s,e),n.compileShader(s),!n.getShaderParameter(s,n.COMPILE_STATUS))throw console.error(n.getShaderInfoLog(s)),new Error("Shader compile error");return s}createProgram(e,t){const n=this.gl,s=n.createProgram(),o=this.compileShader(e,n.VERTEX_SHADER),i=this.compileShader(t,n.FRAGMENT_SHADER);if(n.attachShader(s,o),n.attachShader(s,i),n.linkProgram(s),!n.getProgramParameter(s,n.LINK_STATUS))throw console.error(n.getProgramInfoLog(s)),new Error("Program link error");return s}bindQuad(e){const t=this.gl,n=t.getAttribLocation(e,"aPos"),s=t.getAttribLocation(e,"aUV");t.bindBuffer(t.ARRAY_BUFFER,this.quadBuffer),t.enableVertexAttribArray(n),t.vertexAttribPointer(n,2,t.FLOAT,!1,16,0),t.enableVertexAttribArray(s),t.vertexAttribPointer(s,2,t.FLOAT,!1,16,8)}initSimulation(){const e=this.gl;try{if(!this.texZ)throw new Error("DEM texture not initialized");const t=new Float32Array(NX*NY*4);this.texH=[this.createFloatTexture(NX,NY,t),this.createFloatTexture(NX,NY,t)],this.texQ=[this.createFloatTexture(NX,NY,t),this.createFloatTexture(NX,NY,t)],this.fb=e.createFramebuffer(),this.progFlow=this.createProgram(vertexShaderSrc,flowRouteFragSrc),this.progDepth=this.createProgram(vertexShaderSrc,depthUpdateFragSrc),this.progDisplay=this.createProgram(vertexShaderSrc,displayFragSrc),this.ensureTerrainGeometry(),this.progTerrain=this.createProgram(terrainVertexShaderSrc,terrainFragmentShaderSrc),this.setupTerrainAttributes(),this.hRead=0,this.hWrite=1,this.qRead=0,this.qWrite=1,this.seedInitialWater(.001),this.pendingModeReset!=null?(this.resetSimulation({seed:this.pendingModeReset}),this.pendingModeReset=null):this.mode===MODE_STATIONARY&&this.resetSimulation({seed:!1}),this.step()}catch(e){console.error(e),this.root.classList.add("hydro-panel--unsupported")}}seedInitialWater(e){const t=new Float32Array(NX*NY*4);for(let n=0;n<NX*NY;n+=1)t[4*n]=e;[this.hRead,this.hWrite].forEach(e=>{this.gl.bindTexture(this.gl.TEXTURE_2D,this.texH[e]),this.gl.texImage2D(this.gl.TEXTURE_2D,0,this.gl.RGBA,NX,NY,0,this.gl.RGBA,this.gl.FLOAT,t)})}ensureGraphFloodFields(){if(this.graphFloodInitialized&&this.gfH)return;const e=NX*NY;this.gfH=new Float32Array(e),this.gfTexBuffer=new Float32Array(e*4),this.gfQTexBuffer=new Float32Array(e*4),this.gfZ=this.demElevation?new Float32Array(this.demElevation):new Float32Array(e),this.gfZw=new Float32Array(e),this.gfQwin=new Float32Array(e),this.gfQwout=new Float32Array(e),this.gfStack=new Uint32Array(e),this.gfStackLength=0,this.gfVisited=new Uint8Array(e),this.gfBC=new Uint8Array(e);for(let e=0;e<NY;e+=1)for(let t=0;t<NX;t+=1){const s=e*NX+t,o=t===0,i=t===NX-1,a=e===0,r=e===NY-1;let n=!1;o&&!this.isValueWithinEntries(e,this.entryWestRows)&&(n=!0),i&&!this.isValueWithinEntries(e,this.entryEastRows)&&(n=!0),a&&!this.isValueWithinEntries(t,this.entrySouthCols)&&(n=!0),r&&!this.isValueWithinEntries(t,this.entryNorthCols)&&(n=!0),this.gfBC[s]=n?BC_OUTFLOW:BC_DEFAULT}this.gfHeap=new MinHeap(e),this.graphFloodInitialized=!0,this.resetGraphFloodState()}resetGraphFloodState(){if(!this.gfH)return;this.gfH.fill(.001),this.gfQwin&&this.gfQwin.fill(0),this.gfQwout&&this.gfQwout.fill(0),this.syncGraphFloodTextures()}syncGraphFloodTextures(){if(!this.gl||!this.gfH||!this.gfTexBuffer||!this.texH||!this.gfQwin)return;const e=this.gl;for(let t=0;t<this.gfH.length;t+=1){const e=t*4,n=this.gfH[t];if(this.gfTexBuffer[e]=n,this.gfTexBuffer[e+1]=0,this.gfTexBuffer[e+2]=0,this.gfTexBuffer[e+3]=1,this.gfQTexBuffer){const n=this.gfQwin[t];this.gfQTexBuffer[e]=n,this.gfQTexBuffer[e+1]=0,this.gfQTexBuffer[e+2]=0,this.gfQTexBuffer[e+3]=1}}[this.hRead,this.hWrite].forEach(t=>{e.bindTexture(e.TEXTURE_2D,this.texH[t]),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,NX,NY,0,e.RGBA,e.FLOAT,this.gfTexBuffer)}),this.texQ&&this.gfQTexBuffer&&[this.qRead,this.qWrite].forEach(t=>{e.bindTexture(e.TEXTURE_2D,this.texQ[t]),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,NX,NY,0,e.RGBA,e.FLOAT,this.gfQTexBuffer)})}runGraphFloodIterationsCPU(e,{updateDepth:t=!0}={}){if(!this.gfH||!this.gfZ||!this.gfZw||!this.gfQwin||!this.gfQwout||!this.gfStack)return;const n=NX*NY,s=DX*DX,o=this.precipRate*s,i=Math.max(0,Math.min(n-1,Math.round(this.injectionRow)*NX+Math.round(this.injectionCol)));for(let r=0;r<e;r+=1){for(let e=0;e<n;e+=1)this.gfZw[e]=this.gfZ[e]+this.gfH[e];this.computeGraphFloodOrdering();for(let e=0;e<n;e+=1)this.gfQwin[e]=this.gfBC[e]===BC_OUTFLOW?0:o;this.gfQwout.fill(0),this.discharge>0&&(this.gfQwin[i]+=this.discharge);const a=[0,0,0,0];for(let r=this.gfStackLength-1;r>=0;r-=1){const e=this.gfStack[r];if(this.gfBC[e]===BC_OUTFLOW)continue;const s=this.gfQwin[e];let n=0,t=0;const o=Math.floor(e/NX),i=e-o*NX;if(o>0){const o=e-NX,s=Math.max((this.gfZw[e]-this.gfZw[o])/DX,0);a[0]=s>0?s*DX:0,n+=a[0],s>t&&(t=s)}else a[0]=0;if(i<NX-1){const o=e+1,s=Math.max((this.gfZw[e]-this.gfZw[o])/DX,0);a[1]=s>0?s*DX:0,n+=a[1],s>t&&(t=s)}else a[1]=0;if(i>0){const o=e-1,s=Math.max((this.gfZw[e]-this.gfZw[o])/DX,0);a[2]=s>0?s*DX:0,n+=a[2],s>t&&(t=s)}else a[2]=0;if(o<NY-1){const o=e+NX,s=Math.max((this.gfZw[e]-this.gfZw[o])/DX,0);a[3]=s>0?s*DX:0,n+=a[3],s>t&&(t=s)}else a[3]=0;if(n>0&&s>0){const t=1/n;a[0]>0&&o>0&&(this.gfQwin[e-NX]+=a[0]*t*s),a[1]>0&&i<NX-1&&(this.gfQwin[e+1]+=a[1]*t*s),a[2]>0&&i>0&&(this.gfQwin[e-1]+=a[2]*t*s),a[3]>0&&o<NY-1&&(this.gfQwin[e+NX]+=a[3]*t*s)}if(this.gfZw[e]>this.gfZ[e]){const n=this.gfZw[e]-this.gfZ[e];this.gfQwout[e]=DX/GRAPHFLOOD_MANNING*Math.max(n,0)**(5/3)*Math.max(t,1e-8)**.5}else this.gfQwout[e]=0}if(t)for(let e=0;e<n;e+=1){const o=this.gfQwin[e]-this.gfQwout[e],t=Math.max(this.gfZ[e],this.gfZw[e]+GRAPHFLOOD_DT*o/s),i=Math.floor(e/NX),a=e-i*NX;this.gfBC[e]===BC_OUTFLOW?(this.gfH[e]=0,this.gfZw[e]=this.gfZ[e]):(this.gfZw[e]=t,this.gfH[e]=Math.max(0,t-this.gfZ[e]))}}}computeGraphFloodOrdering(){if(!this.gfZw||!this.gfStack||!this.gfVisited||!this.gfHeap)return;const e=NX*NY;this.gfVisited.fill(0),this.gfHeap.reset(),this.gfStackLength=0;for(let t=0;t<e;t+=1)this.gfBC[t]===BC_OUTFLOW&&(this.gfHeap.push(t,this.gfZw[t]),this.gfVisited[t]=1);const t=[{dr:-1,dc:0},{dr:0,dc:1},{dr:0,dc:-1},{dr:1,dc:0}];for(;!this.gfHeap.isEmpty();){const e=this.gfHeap.pop();this.gfStack[this.gfStackLength++]=e;const n=Math.floor(e/NX),s=e-n*NX;for(let i=0;i<t.length;i+=1){const r=n+t[i].dr,c=s+t[i].dc;if(r<0||r>=NY||c<0||c>=NX)continue;const o=r*NX+c;if(this.gfVisited[o])continue;this.gfVisited[o]=1;let a=this.gfZw[o];const l=this.gfZw[e]+GRAPHFLOOD_FILL_STEP;a<=l&&(a=l,this.gfZw[o]=a),this.gfHeap.push(o,a)}}if(this.gfStackLength<e)for(let t=0;t<e;t+=1)this.gfVisited[t]||(this.gfStack[this.gfStackLength++]=t)}getLisFloodConfig(){return{dt:DT,manning:MANNING,iterations:1,displayInterval:DISPLAY_UPDATE_STEPS,resetOutflow:!1,temporalBlend:1}}step=()=>{this.mode===MODE_STATIONARY?this.stepGraphFlood():this.stepLisFlood(),this.animationFrame=requestAnimationFrame(this.step)};stepLisFlood(){const t=this.gl;if(!t)return;const e=this.getLisFloodConfig(),n=this.runLisFloodIterations(e.iterations,e);n&&this.renderDisplay()}stepGraphFlood(){if(this.graphFloodBusy)return;this.graphFloodBusy=!0,setTimeout(()=>{if(this.ensureGraphFloodFields(),!this.stationaryWarmupDone){this.runGraphFloodIterationsCPU(GRAPHFLOOD_WARMUP_ITERATIONS,{updateDepth:!1}),this.stationaryWarmupDone=!0,this.simSteps=0,this.simTime=0,this.iterationsSinceDisplay=0,this.graphFloodBusy=!1;return}this.runGraphFloodIterationsCPU(GRAPHFLOOD_ITERATIONS,{updateDepth:!0}),this.syncGraphFloodTextures(),this.renderDisplay(),this.graphFloodBusy=!1},0)}runLisFloodIterations(e,t,n={}){const s=this.gl;if(!s||e<=0)return!1;const{accumulateTime:i=!0,temporalBlendOverride:a=null}=n;let o=!1;const r=a??t.temporalBlend??1;for(let a=0;a<e;a+=1){s.bindFramebuffer(s.FRAMEBUFFER,this.fb),s.useProgram(this.progFlow),this.bindQuad(this.progFlow),s.framebufferTexture2D(s.FRAMEBUFFER,s.COLOR_ATTACHMENT0,s.TEXTURE_2D,this.texQ[this.qWrite],0),s.viewport(0,0,NX,NY),s.activeTexture(s.TEXTURE0),s.bindTexture(s.TEXTURE_2D,this.texH[this.hRead]),s.uniform1i(s.getUniformLocation(this.progFlow,"uH"),0),s.activeTexture(s.TEXTURE1),s.bindTexture(s.TEXTURE_2D,this.texZ),s.uniform1i(s.getUniformLocation(this.progFlow,"uZ"),1),s.activeTexture(s.TEXTURE2),s.bindTexture(s.TEXTURE_2D,this.texQ[this.qRead]),s.uniform1i(s.getUniformLocation(this.progFlow,"uQ"),2),s.uniform2f(s.getUniformLocation(this.progFlow,"uGridSize"),NX,NY),s.uniform2f(s.getUniformLocation(this.progFlow,"uTexelSize"),1/NX,1/NY),s.uniform1f(s.getUniformLocation(this.progFlow,"uDX"),DX),s.uniform1f(s.getUniformLocation(this.progFlow,"uDT"),t.dt),s.uniform1f(s.getUniformLocation(this.progFlow,"uGravity"),GRAVITY),s.uniform1f(s.getUniformLocation(this.progFlow,"uManning"),t.manning),s.uniform1f(s.getUniformLocation(this.progFlow,"uHFLOW_THRESHOLD"),HFLOW_THRESHOLD),s.uniform1f(s.getUniformLocation(this.progFlow,"uFroudeLimit"),FROUDE_LIMIT),s.uniform1f(s.getUniformLocation(this.progFlow,"uZMin"),this.zMin),s.uniform1f(s.getUniformLocation(this.progFlow,"uZScale"),this.zScale),s.uniform1f(s.getUniformLocation(this.progFlow,"uTemporalBlend"),r),s.drawArrays(s.TRIANGLE_STRIP,0,4),s.useProgram(this.progDepth),this.bindQuad(this.progDepth),s.framebufferTexture2D(s.FRAMEBUFFER,s.COLOR_ATTACHMENT0,s.TEXTURE_2D,this.texH[this.hWrite],0),s.activeTexture(s.TEXTURE0),s.bindTexture(s.TEXTURE_2D,this.texH[this.hRead]),s.uniform1i(s.getUniformLocation(this.progDepth,"uH"),0),s.activeTexture(s.TEXTURE1),s.bindTexture(s.TEXTURE_2D,this.texQ[this.qWrite]),s.uniform1i(s.getUniformLocation(this.progDepth,"uQ"),1),s.uniform2f(s.getUniformLocation(this.progDepth,"uGridSize"),NX,NY),s.uniform2f(s.getUniformLocation(this.progDepth,"uTexelSize"),1/NX,1/NY),s.uniform1f(s.getUniformLocation(this.progDepth,"uDX"),DX),s.uniform1f(s.getUniformLocation(this.progDepth,"uDT"),t.dt),s.uniform1f(s.getUniformLocation(this.progDepth,"uInjectionRate"),Math.max(this.dischargeRate,0)),s.uniform2f(s.getUniformLocation(this.progDepth,"uInjectionCoord"),this.injectionCol,this.injectionRow),s.uniform1f(s.getUniformLocation(this.progDepth,"uResetOutflow"),t.resetOutflow?1:0),s.uniform1f(s.getUniformLocation(this.progDepth,"uOutflowRow"),this.injectionRow),s.uniform1f(s.getUniformLocation(this.progDepth,"uPrecipRate"),this.precipRate),s.uniform1f(s.getUniformLocation(this.progDepth,"uNorthOutflow"),1);const n=this.boundaryUniforms;n&&(s.uniform1fv(s.getUniformLocation(this.progDepth,"uWestEntryRows"),n.west),s.uniform1fv(s.getUniformLocation(this.progDepth,"uEastEntryRows"),n.east),s.uniform1fv(s.getUniformLocation(this.progDepth,"uNorthEntryCols"),n.north),s.uniform1fv(s.getUniformLocation(this.progDepth,"uSouthEntryCols"),n.south)),s.uniform1f(s.getUniformLocation(this.progDepth,"uEntrySpan"),this.boundaryEntryWindow),s.drawArrays(s.TRIANGLE_STRIP,0,4),[this.hRead,this.hWrite]=[this.hWrite,this.hRead],[this.qRead,this.qWrite]=[this.qWrite,this.qRead],i&&(this.simTime+=t.dt,this.simSteps+=1,this.iterationsSinceDisplay+=1,this.iterationsSinceDisplay>=t.displayInterval&&(o=!0,this.iterationsSinceDisplay%=t.displayInterval))}return o}getViewProjectionMatrix(){if(!this.canvas)return this.viewProjMatrix;const t=Math.max(this.canvas.width||1,1),n=Math.max(this.canvas.height||1,1),s=t/n,o=1,i=Math.max(this.cameraRadius*5,2e4);mat4Perspective(this.projMatrix,CAMERA_FOV,s,o,i);const l=this.getTerrainScaleFactors();this.cameraPhi=clamp(this.cameraPhi,CAMERA_PHI_MIN,CAMERA_PHI_MAX),this.cameraTarget[0]=0,this.cameraTarget[1]=0,this.cameraTarget[2]=0;const e=Math.sin(this.cameraPhi),a=Math.cos(this.cameraPhi),r=Math.cos(this.cameraTheta),c=Math.sin(this.cameraTheta);return this.cameraEye[0]=this.cameraTarget[0]+this.cameraRadius*e*r,this.cameraEye[1]=this.cameraTarget[1]+this.cameraRadius*a,this.cameraEye[2]=this.cameraTarget[2]+this.cameraRadius*e*c,mat4LookAt(this.viewMatrix,this.cameraEye,this.cameraTarget,this.cameraUp),mat4Multiply(this.viewProjMatrix,this.projMatrix,this.viewMatrix),this.viewProjMatrix}renderDisplay(){const e=this.gl;if(!e)return;this.resizeCanvas(),e.bindFramebuffer(e.FRAMEBUFFER,null),e.viewport(0,0,this.canvas.width,this.canvas.height);const t=this.viewMode===VIEW_MODE_3D&&this.progTerrain&&this.terrainIndexCount>0&&this.texH&&this.texZ;t?this.renderTerrainView():this.renderPlanView(),this.updateTimeReadout()}renderPlanView(){const e=this.gl;if(!e||!this.progDisplay||!this.texH||!this.texZ)return;e.disable(e.DEPTH_TEST),e.useProgram(this.progDisplay),this.bindQuad(this.progDisplay),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,this.texH[this.hRead]),e.uniform1i(e.getUniformLocation(this.progDisplay,"uH"),0),e.activeTexture(e.TEXTURE1),e.bindTexture(e.TEXTURE_2D,this.texZ),e.uniform1i(e.getUniformLocation(this.progDisplay,"uZ"),1),this.texQ&&(e.activeTexture(e.TEXTURE2),e.bindTexture(e.TEXTURE_2D,this.texQ[this.qRead]),e.uniform1i(e.getUniformLocation(this.progDisplay,"uQ"),2)),e.uniform1f(e.getUniformLocation(this.progDisplay,"uZMin"),this.zMin),e.uniform1f(e.getUniformLocation(this.progDisplay,"uZScale"),this.zScale),e.uniform2f(e.getUniformLocation(this.progDisplay,"uTexelSize"),1/NX,1/NY),e.uniform1f(e.getUniformLocation(this.progDisplay,"uCellSize"),DX),e.uniform1f(e.getUniformLocation(this.progDisplay,"uHillshadeThreshold"),HILLSHADE_THRESHOLD),e.uniform1f(e.getUniformLocation(this.progDisplay,"uDepthScale"),Math.max(this.depthScale,.1)),e.uniform1f(e.getUniformLocation(this.progDisplay,"uZExaggeration"),Math.max(this.hillExaggeration,.1)),e.uniform2f(e.getUniformLocation(this.progDisplay,"uGridSize"),NX,NY),e.uniform1f(e.getUniformLocation(this.progDisplay,"uZenith"),this.sunZenith),e.uniform1f(e.getUniformLocation(this.progDisplay,"uAzimuth"),this.sunAzimuth),e.uniform1i(e.getUniformLocation(this.progDisplay,"uDisplayMode"),this.displayMode===DISPLAY_MODE_DISCHARGE?1:0),e.uniform1f(e.getUniformLocation(this.progDisplay,"uQMinLog"),this.qMinLog),e.uniform1f(e.getUniformLocation(this.progDisplay,"uQMaxLog"),this.getCurrentQMaxLog());const t=this.displayMode===DISPLAY_MODE_DISCHARGE?this.qOverlayOpacity:0;e.uniform1f(e.getUniformLocation(this.progDisplay,"uQOpacity"),t),e.uniform1f(e.getUniformLocation(this.progDisplay,"uIsStationary"),this.mode===MODE_STATIONARY?1:0),e.drawArrays(e.TRIANGLE_STRIP,0,4)}renderTerrainView(){const e=this.gl;if(!e||!this.progTerrain||!this.terrainIndexBuffer||!this.terrainVertexBuffer||!this.texH||!this.texZ)return;e.enable(e.DEPTH_TEST),e.disable(e.BLEND),e.clear(e.COLOR_BUFFER_BIT|e.DEPTH_BUFFER_BIT),e.useProgram(this.progTerrain),this.vaoExt&&this.terrainVAO?this.vaoExt.bindVertexArrayOES(this.terrainVAO):(e.bindBuffer(e.ARRAY_BUFFER,this.terrainVertexBuffer),e.enableVertexAttribArray(this.terrainAttribLocation),e.vertexAttribPointer(this.terrainAttribLocation,2,e.FLOAT,!1,8,0),e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,this.terrainIndexBuffer));const n=this.getViewProjectionMatrix();e.uniformMatrix4fv(e.getUniformLocation(this.progTerrain,"uViewProj"),!1,n),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,this.texH[this.hRead]),e.uniform1i(e.getUniformLocation(this.progTerrain,"uH"),0),e.activeTexture(e.TEXTURE1),e.bindTexture(e.TEXTURE_2D,this.texZ),e.uniform1i(e.getUniformLocation(this.progTerrain,"uZ"),1),this.texQ&&(e.activeTexture(e.TEXTURE2),e.bindTexture(e.TEXTURE_2D,this.texQ[this.qRead]),e.uniform1i(e.getUniformLocation(this.progTerrain,"uQ"),2)),e.uniform1f(e.getUniformLocation(this.progTerrain,"uZMin"),this.zMin),e.uniform1f(e.getUniformLocation(this.progTerrain,"uZScale"),this.zScale),e.uniform2f(e.getUniformLocation(this.progTerrain,"uTexelSize"),1/NX,1/NY),e.uniform1f(e.getUniformLocation(this.progTerrain,"uCellSize"),DX),e.uniform2f(e.getUniformLocation(this.progTerrain,"uGridSize"),NX,NY);const t=this.getTerrainScaleFactors(),s=Math.max(this.hillExaggeration,.1);e.uniform1f(e.getUniformLocation(this.progTerrain,"uHeightScale"),t.heightScale),e.uniform1f(e.getUniformLocation(this.progTerrain,"uWaterScale"),t.waterScale),e.uniform1f(e.getUniformLocation(this.progTerrain,"uHeightOffset"),t.heightOffset),e.uniform1f(e.getUniformLocation(this.progTerrain,"uDepthScale"),Math.max(this.depthScale,.1)),e.uniform1f(e.getUniformLocation(this.progTerrain,"uHillshadeThreshold"),HILLSHADE_THRESHOLD),e.uniform1f(e.getUniformLocation(this.progTerrain,"uZExaggeration"),s),e.uniform1f(e.getUniformLocation(this.progTerrain,"uZenith"),this.sunZenith),e.uniform1f(e.getUniformLocation(this.progTerrain,"uAzimuth"),this.sunAzimuth),e.uniform1i(e.getUniformLocation(this.progTerrain,"uDisplayMode"),this.displayMode===DISPLAY_MODE_DISCHARGE?1:0),e.uniform1f(e.getUniformLocation(this.progTerrain,"uQMinLog"),this.qMinLog),e.uniform1f(e.getUniformLocation(this.progTerrain,"uQMaxLog"),this.getCurrentQMaxLog());const o=this.displayMode===DISPLAY_MODE_DISCHARGE?this.qOverlayOpacity:0;e.uniform1f(e.getUniformLocation(this.progTerrain,"uQOpacity"),o),e.uniform1f(e.getUniformLocation(this.progTerrain,"uIsStationary"),this.mode===MODE_STATIONARY?1:0),e.drawElements(e.TRIANGLES,this.terrainIndexCount,this.terrainIndexType,0),this.vaoExt&&this.terrainVAO?this.vaoExt.bindVertexArrayOES(null):(e.disableVertexAttribArray(this.terrainAttribLocation),e.bindBuffer(e.ARRAY_BUFFER,null),e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,null)),e.disable(e.DEPTH_TEST)}}const initHydroPanels=()=>{document.querySelectorAll("[data-hydro-demo]").forEach(e=>{e.__hydro||(e.__hydro=new HydrodynamicsDemo(e))})};document.readyState==="loading"?document.addEventListener("DOMContentLoaded",initHydroPanels):initHydroPanels()