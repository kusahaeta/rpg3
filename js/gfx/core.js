'use strict';
// ============================================================
//  3D描画コア：レンダラー／ポストエフェクト／トゥイーン／パーティクル／VFX
// ============================================================
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const lerp = (a, b, t) => a + (b - a) * t;
const Ease = {
  linear: t => t,
  inOut: t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  out: t => 1 - Math.pow(1 - t, 3),
  in: t => t * t * t,
  back: t => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
};
// sRGB の16進色を HDR 強度付きのリニアカラーへ
const hdr = (hex, k = 1) => new THREE.Color(hex).multiplyScalar(k);

// 光のにじみの前に、壊れた値（NaN・無限大）を 0 にし、明るすぎる値を 64 までに収める。
// 1 画素でも NaN があると、光のにじみのぼかしで画面全体に広がり、真っ黒（透明）になる（iPhone で起きた）。
// iPhone の GPU では min / max で NaN を消せないので、数値のビットを見て判定する（指数部がすべて 1 なら NaN か無限大）
const SanitizeShader = {
  uniforms: { tDiffuse: { value: null } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; varying vec2 vUv;
    void main(){
      highp vec4 c = texture2D(tDiffuse, vUv);
      bvec4 bad = equal(floatBitsToUint(c) & uvec4(0x7f800000u), uvec4(0x7f800000u));
      if (bad.x) c.x = 0.0; if (bad.y) c.y = 0.0; if (bad.z) c.z = 0.0; if (bad.w) c.w = 1.0;
      gl_FragColor = clamp(c, 0.0, 64.0);
    }`,
};

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null }, vignette: { value: 1.15 }, flash: { value: 0 }, flashColor: { value: new THREE.Color(1, 1, 1) },
    desat: { value: 0 }, tint: { value: new THREE.Color(1, 1, 1) }, time: { value: 0 }, aberr: { value: 0 },
  },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float vignette, flash, desat, time, aberr; uniform vec3 flashColor, tint; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
    void main(){
      vec2 d = vUv - 0.5;
      vec4 c = texture2D(tDiffuse, vUv);
      if (aberr > 0.0) { c.r = texture2D(tDiffuse, vUv + d * aberr).r; c.b = texture2D(tDiffuse, vUv - d * aberr).b; }
      float v = 1.0 - dot(d, d) * vignette;
      c.rgb *= clamp(v, 0.0, 1.0) * tint;
      float l = dot(c.rgb, vec3(0.299, 0.587, 0.114));
      c.rgb = mix(c.rgb, vec3(l), desat);
      c.rgb = mix(c.rgb, flashColor, flash);
      c.rgb += (hash(vUv * 900.0 + time) - 0.5) * 0.012;
      gl_FragColor = c;
    }`,
};

const GFX = {
  ok: false, renderer: null, composer: null, view: null, tweens: [], time: 0, timeScale: 1, pixelRatio: 1,
  // 省エネ：30fps・画面の細かさ 1 まで・SMAA なし・影を小さく（スマホは最初から省エネ）
  eco: false, appScale: 1, lastFrame: 0,
  // 診断（?debug のとき画面に出す）：3D 描画が止められた・戻った・作り直した回数、描いたコマ数
  diag: { lost: 0, restored: 0, rebuilt: 0, rebuildFail: '', frames: 0 },
  shakeAmt: 0,

  init(app) {
    try {
      this.app = app;
      this.createRenderer();
      this.clock = new THREE.Clock();
      this.ok = true;
      this.setEco(Save.data.eco ?? matchMedia('(pointer: coarse)').matches);
      this.buildPortraits();
      const tick = now => {
        requestAnimationFrame(tick);
        // 省エネは 30fps（60Hz でも 120Hz の画面でも、約 33ms ごとに描く）
        if (this.eco && now - this.lastFrame < 1000 / 30 - 8) return;
        this.lastFrame = now; this.diag.frames++; this.frame();
      };
      requestAnimationFrame(tick);
    } catch (e) {
      console.warn('WebGL を初期化できませんでした。2D表示で動作します。', e);
      this.ok = false;
    }
  },

  // 描画の土台（canvas・renderer・仕上げの処理）を作る
  createRenderer() {
    const canvas = document.createElement('canvas');
    canvas.id = 'gl';
    this.app.prepend(canvas);
    const r = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false });
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.0;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer = r; this.canvas = canvas;
    const X = THREEX;
    this.composer = new X.EffectComposer(r);
    this.renderPass = new X.RenderPass(new THREE.Scene(), new THREE.PerspectiveCamera());
    this.sanitize = new X.ShaderPass(SanitizeShader);
    this.bloom = new X.UnrealBloomPass(new THREE.Vector2(1280, 720), 0.85, 0.6, 0.82);
    this.grade = new X.ShaderPass(GradeShader);
    this.output = new X.OutputPass();
    this.smaa = new X.SMAAPass();
    [this.renderPass, this.sanitize, this.bloom, this.grade, this.output, this.smaa].forEach(p => this.composer.addPass(p));
    // スマホなどでメモリが足りなくなると、ブラウザが 3D 描画を止める（画面が消える）。
    // ブラウザが戻すのを少し待ち、戻らなければ作り直す
    canvas.addEventListener('webglcontextlost', () => { this.diag.lost++; clearTimeout(this.lostTimer); this.lostTimer = setTimeout(() => this.rebuild(), 2500); });
    canvas.addEventListener('webglcontextrestored', () => { this.diag.restored++; clearTimeout(this.lostTimer); });
  },
  rebuild() {
    console.warn('3D 描画が止まったので作り直します');
    const old = this.canvas, clip = this.renderer.localClippingEnabled;
    try { this.composer.dispose(); this.renderer.dispose(); } catch (e) { /* 止まった描画の後片付けは失敗してもよい */ }
    old.remove();
    try { this.createRenderer(); } catch (e) { this.diag.rebuildFail = String(e && e.message || e); console.warn('3D 描画を作り直せませんでした', e); return; }
    this.diag.rebuilt++;
    this.renderer.localClippingEnabled = clip;
    this.setEco(this.eco);
    if (this.view) {
      // 環境光の画像は前の描画で作ったものなので使えない（次の場面で作り直される）
      this.view.scene.environment = null;
      this.applyView(this.view);
    }
    this.canvas.style.opacity = this.view ? 1 : 0;
  },

  setEco(on) {
    this.eco = !!on;
    if (!this.ok) return;
    this.smaa.enabled = !this.eco;
    this.resize(this.appScale);
  },
  shadowSize() { return this.eco ? 1024 : 2048; },

  resize(appScale) {
    this.appScale = appScale;
    if (!this.ok) return;
    const pr = Math.min(this.eco ? 1 : 2, Math.max(0.75, (window.devicePixelRatio || 1) * appScale));
    this.pixelRatio = pr;
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(1280, 720, false);
    this.composer.setPixelRatio(pr);
    this.composer.setSize(1280, 720);
  },

  setView(view) {
    if (!this.ok) return;
    if (this.view && this.view !== view && this.view.dispose && !this.view.persist) this.view.dispose();
    this.view = view;
    this.tweens = [];
    this.timeScale = 1;
    this.grade.uniforms.flash.value = 0;
    this.grade.uniforms.desat.value = 0;
    this.grade.uniforms.aberr.value = 0;
    this.grade.uniforms.tint.value.setRGB(1, 1, 1);
    if (view) this.applyView(view);
    this.canvas.style.opacity = view ? 1 : 0;
  },
  applyView(view) {
    this.renderPass.scene = view.scene;
    this.renderPass.camera = view.camera;
    this.bloom.strength = view.bloomStrength ?? 0.4;
    this.bloom.threshold = view.bloomThreshold ?? 1.6;
    this.renderer.toneMappingExposure = view.exposure ?? 1.0;
  },

  // 同じキーのビューなら再利用する
  show(key, factory) {
    if (!this.ok) return null;
    if (this.view && this.view.key === key) return this.view;
    const v = factory(); v.key = key; this.setView(v); return v;
  },

  frame() {
    const rdt = Math.min(0.05, this.clock.getDelta());
    const speed = (typeof Game !== 'undefined' ? Game.speed : 1);
    const dt = rdt * speed * this.timeScale;
    this.time += dt;
    this.grade.uniforms.time.value = this.time;
    // トゥイーン
    for (let i = 0; i < this.tweens.length; i++) {
      const tw = this.tweens[i];
      tw.t += tw.real ? rdt : dt;
      const p = Math.min(1, tw.t / tw.dur);
      tw.fn(tw.ease(p), p);
      if (p >= 1) { this.tweens.splice(i--, 1); tw.res(); }
    }
    if (!this.view) return;
    this.view.update(dt, this.time, rdt);
    // カメラシェイク
    const cam = this.view.camera;
    if (this.shakeAmt > 0.001) {
      const s = this.shakeAmt;
      cam.position.x += (Math.random() - 0.5) * s; cam.position.y += (Math.random() - 0.5) * s;
      this.shakeAmt *= Math.pow(0.02, rdt);
    }
    this.composer.render(rdt);
  },

  tween(dur, fn, ease = Ease.inOut, real = false) {
    return new Promise(res => {
      if (!this.ok || dur <= 0) { fn(1, 1); res(); return; }
      this.tweens.push({ t: 0, dur, fn, ease, res, real });
    });
  },
  delay(sec) { return this.tween(sec, () => {}); },
  shake(amt) { this.shakeAmt = Math.max(this.shakeAmt, amt); },
  flash(color, amt = 0.6, dur = 0.35) {
    const u = this.grade.uniforms;
    u.flashColor.value.set(color);
    this.tween(dur, t => { u.flash.value = amt * (1 - t); }, Ease.out, true);
  },
  slowmo(scale, realDur) {
    this.timeScale = scale;
    this.tween(realDur, t => { this.timeScale = lerp(scale, 1, t * t); }, Ease.linear, true);
  },

  // ---------- キャラクター肖像（3Dモデルから描画） ----------
  // portraitsWide：戦闘の味方カードの横長の枠（150×52）用。耳の先からあごまで入るように引いて、
  // 右上の必殺技ボタンにかからないよう顔を少し左に寄せる
  portraits: {}, portraitsWide: {},
  buildPortraits() {
    const size = 256, WW = 300, WH = 104;
    const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
    for (const key of Object.keys(CHARS)) {
      const scene = new THREE.Scene();
      const col = ELEMENTS[CHARS[key].elem].color;
      addStudioLights(scene, '#fff0dc');
      const m = buildCharacter(key);
      m.group.rotation.y = -0.3;
      m.setPose(POSES.idle); m.face.set('smile'); m.update(0, 0.8);
      scene.add(m.group);
      const cam = catPortraitCam(m);
      const bg = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.MeshBasicMaterial({ map: radialTex(col, '#fff6ea'), toneMapped: false }));
      bg.position.copy(cam.position).add(cam.getWorldDirection(V3()).multiplyScalar(3)); bg.lookAt(cam.position);
      scene.add(bg);
      r.setSize(size, size);
      r.render(scene, cam);
      this.portraits[key] = r.domElement.toDataURL('image/png');
      // 横長：正方形の肖像の上 84% の高さを切り出し、横は枠の比率まで広げる（背景の板も広げる）
      const vh = 0.84 * size, vw = vh * WW / WH;
      cam.setViewOffset(size, size, size * 0.5 - vw * 0.4, -0.04 * size, vw, vh);
      bg.scale.setScalar(2.2);
      r.setSize(WW, WH);
      r.render(scene, cam);
      this.portraitsWide[key] = r.domElement.toDataURL('image/png');
      disposeTree(scene);
    }
    r.dispose(); r.forceContextLoss();
  },
};

// 省エネのときは画像を縦横半分にする（GPU のメモリが 4 分の 1）。
// 元の canvas はすぐ大きさを 0 にして手放す（iPhone は canvas のメモリの合計に上限がある）
function ecoShrink(c) {
  if (!GFX.eco) return c;
  const s = document.createElement('canvas'); s.width = c.width >> 1; s.height = c.height >> 1;
  s.getContext('2d').drawImage(c, 0, 0, s.width, s.height);
  c.width = c.height = 0;
  return s;
}

// GPU に載せたものを手放す。画像は模様（map）だけでなく、光る模様・凹凸なども全部。
// 使い回している画像を手放しても、次に使うときにまた GPU に載る
function disposeTree(obj) {
  const texs = new Set();
  obj.traverse(o => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => {
      for (const k in m) if (m[k] && m[k].isTexture) texs.add(m[k]);
      if (m.uniforms) for (const k in m.uniforms) { const v = m.uniforms[k].value; if (v && v.isTexture && !v.isRenderTargetTexture) texs.add(v); }
      m.dispose();
    });
    // 影の画像（ライトごとに 1024〜2048 四方）
    if (o.isLight && o.shadow && o.shadow.map) o.shadow.dispose();
  });
  texs.forEach(t => { if (!t.isRenderTargetTexture) t.dispose(); });
}

function addStudioLights(scene, rimColor) {
  scene.add(new THREE.HemisphereLight(0xfff4e8, 0x8a7a6a, 1.1));
  const key = new THREE.DirectionalLight(0xfff4e6, 1.8); key.position.set(2, 4, 3); scene.add(key);
  const rim = new THREE.DirectionalLight(rimColor || 0x9fb4ff, 2.2); rim.position.set(-3, 2, -3); scene.add(rim);
}

// ---------- 共通テクスチャ ----------
const TexCache = {};
function radialTex(inner, outer) {
  const k = 'rad' + inner + outer; if (TexCache[k]) return TexCache[k];
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'), gr = g.createRadialGradient(128, 110, 10, 128, 128, 180);
  gr.addColorStop(0, inner); gr.addColorStop(1, outer);
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return (TexCache[k] = t);
}
function glowTex() {
  if (TexCache.glow) return TexCache.glow;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.2, 'rgba(255,255,255,.7)');
  gr.addColorStop(0.5, 'rgba(255,255,255,.18)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  return (TexCache.glow = new THREE.CanvasTexture(c));
}
function streakTex() {
  if (TexCache.streak) return TexCache.streak;
  const c = document.createElement('canvas'); c.width = 256; c.height = 64;
  const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 256, 0);
  gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.7, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 64);
  const v = g.createLinearGradient(0, 0, 0, 64);
  v.addColorStop(0, 'rgba(0,0,0,1)'); v.addColorStop(0.5, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,1)');
  g.globalCompositeOperation = 'destination-out'; g.fillStyle = v; g.fillRect(0, 0, 256, 64);
  return (TexCache.streak = new THREE.CanvasTexture(c));
}

// 雪の結晶の魔法陣（白、アルファ付き）
function snowTex() {
  if (TexCache.snow) return TexCache.snow;
  const S = 512, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d'); g.translate(S / 2, S / 2);
  g.strokeStyle = '#fff'; g.fillStyle = '#fff'; g.lineCap = 'round';
  const circ = (r, w) => { g.lineWidth = w; g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.stroke(); };
  const hex = (r, w, rot = 0) => { g.lineWidth = w; g.beginPath(); for (let i = 0; i <= 6; i++) { const a = rot + i * Math.PI / 3; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.stroke(); };
  circ(246, 5); circ(232, 2); circ(150, 3);
  hex(226, 3, Math.PI / 6); hex(150, 2); hex(70, 4, Math.PI / 6);
  for (let i = 0; i < 72; i++) { const a = i / 72 * Math.PI * 2; g.lineWidth = i % 6 ? 1.5 : 4; g.beginPath(); g.moveTo(Math.cos(a) * 234, Math.sin(a) * 234); g.lineTo(Math.cos(a) * (i % 6 ? 244 : 248), Math.sin(a) * (i % 6 ? 244 : 248)); g.stroke(); }
  for (let k = 0; k < 6; k++) {   // 結晶の枝
    g.save(); g.rotate(k * Math.PI / 3);
    g.lineWidth = 6; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -210); g.stroke();
    for (const [y, l] of [[-70, 44], [-120, 56], [-170, 36]]) {
      g.lineWidth = 4; g.beginPath(); g.moveTo(0, y); g.lineTo(-l, y - l * 0.8); g.moveTo(0, y); g.lineTo(l, y - l * 0.8); g.stroke();
    }
    g.beginPath(); g.moveTo(0, -224); g.lineTo(-10, -206); g.lineTo(0, -196); g.lineTo(10, -206); g.closePath(); g.fill();
    g.restore();
  }
  const t = new THREE.CanvasTexture(c); t.anisotropy = 4;
  return (TexCache.snow = t);
}

// ---------- トゥーンマテリアル／アウトライン ----------
const TOON_GRAD = (() => {
  const t = new THREE.DataTexture(new Uint8Array([105, 200, 255]), 3, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true;
  return t;
})();
// トゥーン＋リムライト（輪郭光）
const RIM_CHUNK = `#include <emissivemap_fragment>
  float rimF = pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 3.0);
  totalEmissiveRadiance += vec3(0.55, 0.6, 0.9) * rimF * 0.45;`;
function toon(color, extra = {}, faceBoost = 0) {
  const m = new THREE.MeshToonMaterial({ color, gradientMap: TOON_GRAD, ...extra });
  m.onBeforeCompile = sh => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>',
      RIM_CHUNK + (faceBoost ? `\n totalEmissiveRadiance += diffuseColor.rgb * ${faceBoost.toFixed(2)};` : ''));
  };
  m.customProgramCacheKey = () => 'toonrim' + faceBoost;
  return m;
}
// 色の明るさをそろえる倍率：ピンクや青のように暗い色ほど強く光らせて、黄や緑と同じくらいにじませる（最大 2.4 倍）
function lumaBoost(color, ref = 0.75) { const c = new THREE.Color(color); return Math.min(2.4, Math.max(1, ref / (0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b))); }
function glowMat(color, k = 3, extra = {}) {
  return new THREE.MeshBasicMaterial({ color: hdr(color, k), toneMapped: true, ...extra });
}
const OutlineCache = {};
function outlineMat(color = '#10101a', thick = 0.0022) {
  const k = color + thick; if (OutlineCache[k]) return OutlineCache[k];
  return (OutlineCache[k] = new THREE.ShaderMaterial({
    uniforms: { color: { value: new THREE.Color(color) }, thickness: { value: thick } },
    vertexShader: `uniform float thickness;
      void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vec3 n = normalize(normalMatrix * normal);
        mv.xyz += n * thickness * max(1.0, -mv.z); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: 'uniform vec3 color; void main(){ gl_FragColor = vec4(color,1.0); }',
    side: THREE.BackSide,
  }));
}
function outlined(geo, mat, opts = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = opts.shadow !== false; m.receiveShadow = !!opts.receive;
  if (opts.outline !== false) {
    const col = opts.oc || '#' + new THREE.Color(mat.color || '#000').multiplyScalar(0.22).getHexString();
    const o = new THREE.Mesh(geo, outlineMat(col, opts.thick || 0.0022));
    o.castShadow = false; o.userData.outline = true;
    m.add(o);
  }
  return m;
}

// ---------- パーティクル ----------
class Particles {
  constructor(scene, max = 3000) {
    this.max = max; this.n = 0;
    this.pos = new Float32Array(max * 3); this.col = new Float32Array(max * 3); this.size = new Float32Array(max); this.alpha = new Float32Array(max);
    this.vel = new Float32Array(max * 3); this.life = new Float32Array(max); this.age = new Float32Array(max);
    this.grav = new Float32Array(max); this.drag = new Float32Array(max); this.s0 = new Float32Array(max);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('size', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('alpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    this.geo = g;
    const mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: glowTex() }, scale: { value: 380 } },
      vertexShader: `attribute float size; attribute float alpha; attribute vec3 color; varying vec3 vC; varying float vA; uniform float scale;
        void main(){ vC = color; vA = alpha; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = size * scale / max(0.1, -mv.z); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform sampler2D map; varying vec3 vC; varying float vA;
        void main(){ vec4 t = texture2D(map, gl_PointCoord); gl_FragColor = vec4(vC * t.a * vA, 1.0); }`,
      blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
    });
    this.points = new THREE.Points(g, mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 10;
    scene.add(this.points);
  }
  emit(p, v, color, { life = 0.8, size = 0.12, grav = 0, drag = 1.5 } = {}) {
    if (this.n >= this.max) return;
    const i = this.n++, i3 = i * 3;
    this.pos[i3] = p.x; this.pos[i3 + 1] = p.y; this.pos[i3 + 2] = p.z;
    this.vel[i3] = v.x; this.vel[i3 + 1] = v.y; this.vel[i3 + 2] = v.z;
    this.col[i3] = color.r; this.col[i3 + 1] = color.g; this.col[i3 + 2] = color.b;
    this.life[i] = life * (0.7 + Math.random() * 0.6); this.age[i] = 0; this.s0[i] = size * (0.6 + Math.random() * 0.8);
    this.grav[i] = grav; this.drag[i] = drag;
  }
  burst(p, color, n = 30, { speed = 3, life = 0.7, size = 0.12, grav = 0, drag = 2.5, up = 0, spread = 1 } = {}) {
    const c = color.isColor ? color : hdr(color, 3);
    for (let i = 0; i < n; i++) {
      const d = V3(Math.random() - 0.5, (Math.random() - 0.5) * spread + up, Math.random() - 0.5).normalize().multiplyScalar(speed * (0.3 + Math.random()));
      this.emit(p, d, c, { life, size, grav, drag });
    }
  }
  update(dt) {
    let j = 0;
    for (let i = 0; i < this.n; i++) {
      const i3 = i * 3;
      this.age[i] += dt;
      if (this.age[i] >= this.life[i]) continue;
      const k = Math.exp(-this.drag[i] * dt);
      this.vel[i3] *= k; this.vel[i3 + 1] = this.vel[i3 + 1] * k - this.grav[i] * dt; this.vel[i3 + 2] *= k;
      const j3 = j * 3;
      this.pos[j3] = this.pos[i3] + this.vel[i3] * dt; this.pos[j3 + 1] = this.pos[i3 + 1] + this.vel[i3 + 1] * dt; this.pos[j3 + 2] = this.pos[i3 + 2] + this.vel[i3 + 2] * dt;
      this.vel[j3] = this.vel[i3]; this.vel[j3 + 1] = this.vel[i3 + 1]; this.vel[j3 + 2] = this.vel[i3 + 2];
      this.col[j3] = this.col[i3]; this.col[j3 + 1] = this.col[i3 + 1]; this.col[j3 + 2] = this.col[i3 + 2];
      this.age[j] = this.age[i]; this.life[j] = this.life[i]; this.s0[j] = this.s0[i]; this.grav[j] = this.grav[i]; this.drag[j] = this.drag[i];
      const t = this.age[j] / this.life[j];
      this.alpha[j] = t < 0.1 ? t * 10 : 1 - (t - 0.1) / 0.9;
      this.size[j] = this.s0[j] * (1 - t * 0.5);
      j++;
    }
    this.n = j;
    this.geo.setDrawRange(0, j);
    for (const a of ['position', 'color', 'size', 'alpha']) this.geo.attributes[a].needsUpdate = true;
  }
}

// ---------- VFX（使い捨てメッシュ） ----------
class FX {
  constructor(scene, particles) { this.scene = scene; this.p = particles; this.items = []; }
  add(obj, life, fn) { this.scene.add(obj); this.items.push({ obj, life, age: 0, fn }); return obj; }
  update(dt, cam) {
    for (let i = 0; i < this.items.length; i++) {
      const it = this.items[i]; it.age += dt;
      const t = Math.min(1, it.age / it.life);
      it.fn && it.fn(t, it.obj, dt, cam);
      if (t >= 1) { this.scene.remove(it.obj); disposeTree(it.obj); this.items.splice(i--, 1); }
    }
  }
  sprite(pos, color, size, life, { k = 3, grow = 1.5 } = {}) {
    const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: hdr(color, k), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    m.position.copy(pos); m.scale.setScalar(size); m.renderOrder = 11;
    return this.add(m, life, t => { m.material.opacity = 1 - t; m.scale.setScalar(size * (1 + (grow - 1) * Ease.out(t))); });
  }
  ring(pos, color, { r = 1.5, life = 0.6, k = 3, width = 0.12, vertical = false, face = null } = {}) {
    const mat = new THREE.MeshBasicMaterial({ color: hdr(color, k), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    const m = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 64), mat);
    m.position.copy(pos);
    if (face) m.lookAt(face); else if (!vertical) m.rotation.x = -Math.PI / 2;
    m.renderOrder = 11;
    return this.add(m, life, t => {
      const s = r * Ease.out(t) + 0.05;
      m.scale.setScalar(s);
      m.geometry.dispose(); m.geometry = new THREE.RingGeometry(Math.max(0, 1 - width / s), 1, 64);
      mat.opacity = 1 - t;
    });
  }
  slash(pos, color, { size = 2.2, angle = Math.random() * Math.PI, life = 0.32, cam } = {}) {
    const mat = new THREE.MeshBasicMaterial({ map: streakTex(), color: hdr(color, 4), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size * 0.14), mat);
    m.position.copy(pos);
    if (cam) m.quaternion.copy(cam.quaternion);
    m.rotateZ(angle);
    m.renderOrder = 12;
    return this.add(m, life, t => { mat.opacity = 1 - t * t; m.scale.set(0.3 + Ease.out(t) * 1.2, 1 - t * 0.6, 1); });
  }
  pillar(pos, color, { h = 8, r = 0.6, life = 0.7, k = 3 } = {}) {
    const mat = new THREE.MeshBasicMaterial({ color: hdr(color, k), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.2, h, 24, 1, true), mat);
    m.position.set(pos.x, pos.y + h / 2, pos.z);
    return this.add(m, life, t => { mat.opacity = (1 - t) * 0.8; m.scale.set(1 - t * 0.8, 1, 1 - t * 0.8); });
  }
  shards(pos, color, n = 14, speed = 5) {
    for (let i = 0; i < n; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: hdr(color, 2.5), transparent: true });
      const m = new THREE.Mesh(new THREE.TetrahedronGeometry(0.08 + Math.random() * 0.1), mat);
      m.position.copy(pos);
      const v = V3(Math.random() - 0.5, Math.random() * 0.9, Math.random() - 0.5).normalize().multiplyScalar(speed * (0.5 + Math.random()));
      const spin = V3(Math.random() * 10, Math.random() * 10, Math.random() * 10);
      this.add(m, 1.0 + Math.random() * 0.4, (t, o, dt) => {
        v.y -= 9 * dt; o.position.addScaledVector(v, dt);
        o.rotation.x += spin.x * dt; o.rotation.y += spin.y * dt;
        mat.opacity = 1 - t * t;
      });
    }
  }
  beam(from, to, color, { life = 0.35, r = 0.12 } = {}) {
    const len = from.distanceTo(to);
    const mat = new THREE.MeshBasicMaterial({ color: hdr(color, 4), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false });
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 12, 1, true), mat);
    m.position.copy(from).lerp(to, 0.5);
    m.quaternion.setFromUnitVectors(V3(0, 1, 0), to.clone().sub(from).normalize());
    return this.add(m, life, t => { mat.opacity = 1 - t; m.scale.set(1 - t, 1, 1 - t); });
  }
  // 稲妻：a→b をギザギザの管で結ぶ（a・b は関数でもよい＝動く武器に沿わせる）
  bolt(a, b, color, { life = 0.2, segs = 9, jag = 0.08, r = 0.012, k = 5, refresh = 0.045 } = {}) {
    const A = typeof a === 'function' ? a : () => a, B = typeof b === 'function' ? b : () => b;
    const mat = new THREE.MeshBasicMaterial({ color: hdr(color, k), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false });
    const make = () => {
      const p0 = A(), p1 = B(), pts = [];
      for (let i = 0; i <= segs; i++) {
        const p = p0.clone().lerp(p1, i / segs);
        if (i && i < segs) p.add(V3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(jag * 2));
        pts.push(p);
      }
      return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'centripetal'), segs * 3, r, 4, false);
    };
    const m = new THREE.Mesh(make(), mat); m.renderOrder = 12; m.frustumCulled = false;
    let acc = 0;
    return this.add(m, life, (t, o, dt) => {
      acc += dt;
      if (acc > refresh) { acc = 0; o.geometry.dispose(); o.geometry = make(); }
      mat.opacity = t < 0.8 ? 1 : (1 - t) * 5;
    });
  }
  // 渦：中心のまわりを回る光の帯
  swirl(center, color, { r = 0.8, life = 0.8, tilt = 0.3, speed = 9, arc = 2.2, width = 0.035, k = 4, y0 = 0, y1 = 0 } = {}) {
    const mat = new THREE.MeshBasicMaterial({ color: hdr(color, k), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false });
    const m = new THREE.Mesh(new THREE.TorusGeometry(r, width, 6, 48, arc), mat);
    const g = new THREE.Group(); g.add(m); g.position.copy(center); g.rotation.x = Math.PI / 2 + tilt; g.rotation.y = (Math.random() - 0.5) * 0.6;
    m.rotation.z = Math.random() * Math.PI * 2; m.renderOrder = 12;
    return this.add(g, life, (t, o, dt) => {
      m.rotation.z += speed * dt;
      o.position.y = center.y + lerp(y0, y1, t);
      o.scale.setScalar(0.7 + Ease.out(t) * 0.5);
      mat.opacity = Math.sin(t * Math.PI);
    });
  }
  // 雪の結晶の魔法陣（face なしなら床に水平）
  sigil(pos, color, { r = 1.5, life = 1.0, face = null, spin = 1, k = 2.5 } = {}) {
    const mat = new THREE.MeshBasicMaterial({ map: snowTex(), color: hdr(color, k), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    const g = new THREE.Group(); g.add(m); g.position.copy(pos);
    if (face) g.lookAt(face); else g.rotation.x = -Math.PI / 2;
    m.renderOrder = 11;
    return this.add(g, life, (t, o, dt) => {
      m.rotation.z += spin * dt;
      m.scale.setScalar(r * (0.3 + 0.7 * Ease.back(Math.min(1, t * 4))));
      mat.opacity = Math.min(1, t * 8) * (t > 0.7 ? (1 - t) / 0.3 : 1);
    });
  }
  // 地面から突き出す氷柱。最後に砕けて破片になる
  iceSpike(base, { h = 2, r = 0.3, life = 1.6, tilt = 0.25, dir = Math.random() * Math.PI * 2, color = '#6fd6f5', grow = 0.12 } = {}) {
    const geo = new THREE.ConeGeometry(r, h, 5, 1); geo.translate(0, h / 2, 0);
    const mat = new THREE.MeshStandardMaterial({ color: '#dff7ff', emissive: color, emissiveIntensity: 0.8, roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.9, flatShading: true });
    const m = new THREE.Mesh(geo, mat); m.position.copy(base); m.position.y = Math.max(0, base.y);
    m.rotation.set(Math.cos(dir) * tilt, Math.random() * Math.PI, Math.sin(dir) * tilt);
    m.scale.set(1, 0.001, 1);
    let broke = false;
    return this.add(m, life, (t, o) => {
      const gt = Math.min(1, (t * life) / grow), br = t > 0.85 ? (t - 0.85) / 0.15 : 0;
      o.scale.set(1 - br, Math.max(0.001, Ease.back(gt) * (1 - br)), 1 - br);
      mat.opacity = 0.9 * (1 - br);
      if (br > 0 && !broke) { broke = true; this.shards(o.position.clone().add(V3(0, h * 0.4, 0)), color, 6 + Math.round(h * 3), 3 + h); }
    });
  }
  // 弾：命中時に resolve
  projectile(from, to, color, { dur = 0.28, size = 0.35, arc = 0.6, trail = true } = {}) {
    return new Promise(res => {
      const c = hdr(color, 4);
      const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: c, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
      m.scale.setScalar(size); m.position.copy(from); m.renderOrder = 12;
      const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: hdr('#ffffff', 5), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
      core.scale.setScalar(0.4); m.add(core);
      let done = false;
      this.add(m, dur, (t, o) => {
        o.position.lerpVectors(from, to, t);
        o.position.y += Math.sin(t * Math.PI) * arc;
        if (trail) for (let i = 0; i < 3; i++) this.p.emit(o.position, V3((Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.6), c, { life: 0.35, size: size * 0.5 });
        if (t >= 1 && !done) { done = true; res(); }
      });
    });
  }
}
