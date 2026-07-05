// Copyright (c) 2026 George Zhang. All rights reserved.
// Unauthorized copying, modification, or distribution of this file is prohibited.

// Shared WebGL renderer for the site's glass water drop — used fullscreen by IntroCinematic and
// small by HeroOrb. One raymarched SDF (a round-cone: sphere when `point` is 0, sharp teardrop at 1)
// shaded as clean stylized glass: warm procedural studio environment (bright top, amber mid, walnut
// low, two softbox strips + a top card), single-bounce fake refraction at water IOR, fresnel rim,
// slight per-channel dispersion, faint honey tint. Everything warm — never cold/blue (brand rule).
//
// Deliberately NOT photoreal: a clean "Apple-ad glass" stylization that reads premium at any size,
// costs a few KB, and runs at trivial GPU cost (bounding-circle early-out; the drop covers a small
// fraction of the canvas).

export interface GlassDropParams {
  /** 0 = side view (teardrop silhouette) … 1 = top-down (round bottom faces the camera). */
  tilt: number;
  /** 0 = round orb … 1 = fully formed pointy teardrop. */
  point: number;
  /** Drop radius as a fraction of the canvas' short side (0..~0.5). */
  scale: number;
  /** Drop centre in canvas UV (0,0 = bottom-left; y up — GL orientation). */
  x: number;
  y: number;
  /** Small sideways light/lean shift, -1..1 (HeroOrb leans toward the pointer). */
  lean: number;
  /** Seconds — drives a very subtle env shimmer so the glass never looks frozen. */
  time: number;
}

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTilt, uPoint, uScale, uLean, uTime;
uniform vec2 uCenter;

// Round cone: sphere r1 at origin blended to sphere r2 at height h — sphere when h≈0,
// a clean pointy teardrop when r2 is tiny and h is tall. (iq's sdRoundCone.)
float sdDrop(vec3 p, float r1, float r2, float h) {
  float b = (r1 - r2) / h;
  float a = sqrt(max(1.0 - b * b, 1e-4));
  vec2 q = vec2(length(p.xz), p.y);
  float k = dot(q, vec2(-b, a));
  if (k < 0.0) return length(q) - r1;
  if (k > a * h) return length(q - vec2(0.0, h)) - r2;
  return dot(q, vec2(a, b)) - r1;
}

float map(vec3 p) {
  // tilt: rotate the drop about X so the point tips away from the camera (side -> top-down view)
  float c = cos(uTilt), s = sin(uTilt);
  p = vec3(p.x, c * p.y - s * p.z, s * p.y + c * p.z);
  p.y += mix(0.0, 0.55, uPoint);                    // keep the visual centre steady as the point grows
  float r2 = mix(1.0, 0.045, uPoint);
  float h  = mix(0.001, 1.55, uPoint);
  return sdDrop(p, 1.0, r2, h);
}

vec3 normalAt(vec3 p) {
  vec2 e = vec2(0.0015, 0.0);
  return normalize(vec3(
    map(p + e.xyy) - map(p - e.xyy),
    map(p + e.yxy) - map(p - e.yxy),
    map(p + e.yyx) - map(p - e.yyx)));
}

// Warm procedural studio: vertical gradient + two softbox strips + a broad top card.
// The strips are what make the glass read as glass — crisp bright shapes to refract.
vec3 env(vec3 d) {
  float up = d.y * 0.5 + 0.5;
  vec3 col = mix(vec3(0.14, 0.10, 0.055),           // walnut low
             mix(vec3(0.62, 0.46, 0.26),            // amber mid
                 vec3(1.08, 1.00, 0.86), smoothstep(0.45, 1.0, up)),  // warm-white high
                 smoothstep(0.0, 0.55, up));
  float shim = 0.02 * sin(uTime * 0.4 + d.x * 3.0); // barely-there life
  vec3 L1 = normalize(vec3(-0.62 + uLean * 0.2, 0.25, 0.75));
  vec3 L2 = normalize(vec3(0.70 + uLean * 0.2, 0.10, 0.68));
  vec3 LT = normalize(vec3(0.05, 0.95, 0.28));
  float sb1 = smoothstep(0.965, 0.995, dot(d, L1)); // left strip — crisp
  float sb2 = smoothstep(0.975, 0.998, dot(d, L2)); // right strip — crisper, dimmer
  float sbt = smoothstep(0.86, 0.99, dot(d, LT));   // broad warm top card
  col += sb1 * vec3(1.25, 1.18, 1.02) + sb2 * vec3(0.9, 0.86, 0.78) + sbt * vec3(0.55, 0.47, 0.30);
  return col + shim;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float short_ = min(uRes.x, uRes.y);
  // pixel position in drop-space: origin at drop centre, drop radius == 1
  vec2 p2 = (gl_FragCoord.xy - uCenter * uRes) / (uScale * short_);
  if (dot(p2, p2) > 3.6) { gl_FragColor = vec4(0.0); return; }   // bounding early-out

  vec3 ro = vec3(p2, 2.6);
  vec3 rd = vec3(0.0, 0.0, -1.0);                    // orthographic — clean, product-shot compression
  float t = 0.0, d = 0.0;
  float minD = 1e9;                                  // closest approach → smooth silhouette AA
  vec3 pos = ro;
  vec3 best = ro;
  for (int i = 0; i < 48; i++) {
    pos = ro + rd * t;
    d = map(pos);
    if (d < minD) { minD = d; best = pos; }
    if (d < 0.0008) break;
    t += d;
    if (t > 5.5) break;
  }
  // one CSS pixel expressed in drop-space units — the AA ramp width
  float px = 1.6 / max(uScale * short_, 1.0);
  float alpha = 1.0 - smoothstep(0.0, px, minD);
  if (alpha < 0.004) { gl_FragColor = vec4(0.0); return; }

  vec3 n = normalAt(best);
  pos = best;
  float fres = pow(1.0 - max(dot(n, -rd), 0.0), 3.0);

  // fake refraction with slight per-channel dispersion (real water splits light a touch)
  vec3 rr = refract(rd, n, 0.752);                   // 1/1.33
  vec3 rg = refract(rd, n, 0.746);
  vec3 rb = refract(rd, n, 0.740);
  vec3 refr = vec3(env(rr).r, env(rg).g, env(rb).b);
  vec3 refl = env(reflect(rd, n));

  vec3 col = mix(refr, refl, clamp(fres, 0.0, 0.85));
  col = mix(col, col * vec3(1.04, 0.94, 0.78), 0.18 * (1.0 - fres));  // faint honey body tint
  col += fres * fres * vec3(0.30, 0.27, 0.20);       // warm rim light

  gl_FragColor = vec4(col * alpha, alpha);           // premultiplied (blend is ONE, ONE_MINUS_SRC_ALPHA)
}
`;

export interface GlassDropRenderer {
  set(params: Partial<GlassDropParams>): void;
  /** Draw one frame now (uses the latest params). */
  render(): void;
  /** Resize the drawing buffer to the canvas' CSS size × dpr (call on layout changes). */
  resize(): void;
  destroy(): void;
  /** False when WebGL isn't available — callers fall back to skipping the effect. */
  readonly ok: boolean;
}

export function createGlassDrop(canvas: HTMLCanvasElement): GlassDropRenderer {
  const gl = (canvas.getContext("webgl", { alpha: true, antialias: true, premultipliedAlpha: true }) ??
    null) as WebGLRenderingContext | null;
  const params: GlassDropParams = { tilt: 0, point: 0, scale: 0.2, x: 0.5, y: 0.5, lean: 0, time: 0 };
  if (!gl) {
    return { set() {}, render() {}, resize() {}, destroy() {}, ok: false };
  }

  const compile = (type: number, src: string) => {
    const sh = gl.createShader(type)!;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    return sh;
  };
  const prog = gl.createProgram()!;
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    return { set() {}, render() {}, resize() {}, destroy() {}, ok: false };
  }
  gl.useProgram(prog);

  // one fullscreen triangle
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, "aPos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const U = (name: string) => gl.getUniformLocation(prog, name);
  const uRes = U("uRes"), uTilt = U("uTilt"), uPoint = U("uPoint"), uScale = U("uScale"),
    uLean = U("uLean"), uTime = U("uTime"), uCenter = U("uCenter");

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); // premultiplied

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    gl.viewport(0, 0, w, h);
  };
  resize();

  return {
    ok: true,
    set(p) { Object.assign(params, p); },
    resize,
    render() {
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTilt, params.tilt * Math.PI * 0.5);
      gl.uniform1f(uPoint, params.point);
      gl.uniform1f(uScale, params.scale);
      gl.uniform1f(uLean, params.lean);
      gl.uniform1f(uTime, params.time);
      gl.uniform2f(uCenter, params.x, params.y);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    destroy() {
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}
