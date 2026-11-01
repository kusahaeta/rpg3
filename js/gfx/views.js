'use strict';
// ============================================================
//  3Dビュー：ショーケース（キャラ）／ワープ／バトル
// ============================================================
// 深度を書かない半透明（シールド・足もとの印など）の描く順。戦闘の背景は区画の地形なので、
// 土の道や水たまりの塗り（renderOrder 1〜2）、滝の幕（〜5）より後に描かないと塗りで上書きされる
const OVER_PAINT = 6;
class BaseView {
  constructor(theme, fov = 38, envOpts = {}) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(fov, 1280 / 720, 0.1, 800);
    this.env = buildEnvironment(this.scene, theme, GFX.renderer, envOpts);
    this.p = this.env.particles;
    this.fx = new FX(this.scene, this.p);
    this.camPos = V3(0, 2, 8); this.camLook = V3(0, 1, 0); this.curLook = V3(0, 1, 0);
    this.camSpeed = 3;
  }
  setCam(pos, look, { snap = false, speed = 3 } = {}) {
    this.camPos.copy(pos); this.camLook.copy(look); this.camSpeed = speed;
    if (snap) { this.camera.position.copy(pos); this.curLook.copy(look); }
  }
  update(dt, t) {
    this.env.update(dt, t);
    const k = 1 - Math.exp(-this.camSpeed * dt);
    this.camera.position.lerp(this.camPos, k);
    this.curLook.lerp(this.camLook, k);
    this.camera.lookAt(this.curLook);
    this.fx.update(dt, this.camera);
    this.p.update(dt);
  }
  dispose() {
    if (this.scene.userData.envRT) this.scene.userData.envRT.dispose();
    else if (this.scene.environment) this.scene.environment.dispose();
    disposeTree(this.scene);
    if (this.onDispose) this.onDispose();
  }
}

// なかまの画面：その子に合う場所（仲間になった所など）の景色を背景に、にゃんこが立つ。ドラッグで回せる
//   区画をその場で組み立てると重いので、景色は tools/shoot-chars-bg.mjs で一枚絵（css/chars-bg/<子>.jpg）に書き出しておき、
//   画面いっぱいの板に貼る。一枚絵はこの画面と同じカメラ（SHOWCASE_CAM）で撮るので、子はその景色の地面にそのまま立ち、
//   影も景色の地面に落ちる。子の光（空・地面・日の色）も、その区画の光にそろえる。子を替えると景色がなめらかに入れかわる
//   spot：[区画, x, z, カメラの向き（度。0 で北 -Z）, 空（省くと区画のまま。'night' で夜に、'stars' で夜のぜいたくな星空に）]（x, z は会話シーンの stage.at と同じ座標）。
//   区画を '@stars' にすると、ゲームにはない、星空を映す水面の景色（tools/shoot-chars-bg.mjs が一枚絵のためだけに組む）
//   pane：右の一覧の板と名札の色のもと（景色に合う暗めの色）
// 目の高さ eye を見る高さ look と同じにして水平に見る（地平線が画面のまん中に来て、上半分が空になる）
const SHOWCASE_CAM = { screenX: 360, dist: 4.4, eye: 0.6, look: 0.6, fov: 32 };
const SHOWCASE_BG = {
  mike:  { spot: ['pokapoka', -17, 1, -40],    pane: '#4a3626' },   // ぽかぽか村・ミケの家の前
  kuro:  { spot: ['road1_hill', -2, -10, 150, 'stars'], pane: '#20263e' },   // 星空の下の、ミャオ街道・丘の上（木の少ない南東向き）
  shiro: { spot: ['castle_archive', -12, 0, -90], pane: '#3e2c22' },   // ニャハハ城・王家の書庫の、光る魔法陣の石板の前
  tama:  { spot: ['woods_deep', 1, -19, 0],    pane: '#2e4430' },   // まどろみの林・大樹のうろ
  maou:  { spot: ['demon_throne', 0, -12, 0],  pane: '#2c1a3e' },   // 魔王城・玉座の間
};
const SHOWCASE_BG_W = 0.55;   // 一枚絵は画面の左 55%（右は一覧の板でかくれる）
const showcaseBgUrl = key => `css/chars-bg/${key}.jpg`;
// その子の場所の光（StageView と同じ：区画の bg の空の色と、明るさ）
function showcaseLight(key) {
  const [zone, , , , sky] = SHOWCASE_BG[key].spot, Z = FIELD_ZONES[zone] || {}, bg = (sky === 'stars' ? 'night' : sky) || Z.bg || CHAPTERS[Z.ci].bg;
  return { th: { ...(THEMES[bg] || THEMES.meadow), ...(Z.th || {}) }, exposure: { meadow: 0.95, road: 0.95, dream: 0.9 }[bg] || 1 };
}
const ShowcaseBgShader = {
  vertexShader: 'varying vec2 vUv; void main(){ vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }',
  fragmentShader: `uniform sampler2D tA, tB; uniform float mixv, w; varying vec2 vUv;
    void main(){
      vec2 uv = vec2(min(vUv.x / w, 1.0), vUv.y);
      gl_FragColor = vec4(mix(texture2D(tA, uv).rgb, texture2D(tB, uv).rgb, mixv), 1.0);
    }`,
};
class ShowcaseView extends BaseView {
  constructor(key) {
    const C = SHOWCASE_CAM;
    super('studio', C.fov, { skyTree: false });
    this.bloomStrength = 0.3; this.exposure = 1.0;
    this.rotY = -0.35; this.targetRot = -0.35; this.spin = 0;
    this.scene.fog = null;
    this.env.floor.visible = false;
    const dirs = [];
    this.env.root.traverse(o => { if (o.userData.sky) o.visible = false; if (o.isHemisphereLight) this.hemi = o; if (o.isDirectionalLight && o !== this.env.key) dirs.push(o); });
    [this.rim, this.fill] = dirs;
    // 景色の一枚絵：読みこんだものから使う。入れかえは tA（いま）→ tB（次）へ混ぜてから、tB を tA へ
    this.tex = {};
    const blank = new THREE.DataTexture(new Uint8Array([40, 32, 30, 255]), 1, 1); blank.needsUpdate = true;
    const bg = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
      uniforms: { tA: { value: blank }, tB: { value: blank }, mixv: { value: 0 }, w: { value: SHOWCASE_BG_W } },
      ...ShowcaseBgShader, depthTest: false, depthWrite: false }));
    bg.renderOrder = -100; bg.frustumCulled = false; this.scene.add(bg); this.bg = bg;
    this.onDispose = () => { this.disposed = true; for (const t of Object.values(this.tex)) t.dispose(); blank.dispose(); };
    // 地面：見えない板に、子の影だけを落とす（一枚絵の地面と同じ高さ）
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.ShadowMaterial({ opacity: 0.28 }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; this.scene.add(ground);
    this.camera.setViewOffset(1280, 720, 640 - C.screenX, 0, 1280, 720);
    this.setCam(V3(0, C.eye, C.dist), V3(0, C.look, 0), { snap: true });
    if (key) this.setChar(key, false);
  }
  // 景色の一枚絵を読む（読み終えたら cb）。読めなかったら何もしない（板の色のまま）
  loadBg(key, cb) {
    if (this.tex[key]) return cb(this.tex[key]);
    new THREE.TextureLoader().load(showcaseBgUrl(key), t => {
      t.colorSpace = THREE.SRGBColorSpace; t.minFilter = THREE.LinearFilter; t.generateMipmaps = false;
      if (this.disposed) return t.dispose();
      this.tex[key] = t; cb(t);
    });
  }
  setBg(key) {
    this.bgKey = key;
    this.loadBg(key, t => {
      if (this.bgKey !== key) return;
      const U = this.bg.material.uniforms;
      if (U.mixv.value > 0) { U.tA.value = U.tB.value; }
      U.tB.value = t; U.mixv.value = U.tA.value === t ? 1 : 0.001;
    });
    // 子の光を、その場所の光にそろえる
    const { th, exposure } = showcaseLight(key), k = th.light || 1;
    this.hemi.color.set(th.sky); this.hemi.groundColor.set(th.ground); this.hemi.intensity = 0.85 * k;
    this.env.key.color.set(th.key); this.env.key.intensity = 1.8 * Math.min(k, 1.2);
    if (this.rim) this.rim.color.set(th.rim); if (this.fill) this.fill.color.set(th.rim);
    this.exposure = exposure; if (GFX.view === this) GFX.renderer.toneMappingExposure = exposure;
  }
  setChar(key, burst = true) {
    if (this.model) { this.scene.remove(this.model.group); disposeTree(this.model.group); }
    this.model = null;
    if (!key) return;
    if (SHOWCASE_BG[key]) this.setBg(key);
    const m = buildCharacter(key); this.model = m; this.scene.add(m.group);
    m.setPose(POSES.idle); m.group.rotation.y = this.rotY; m.face.set('smile');
    if (burst) {
      const col = CHARS[key].color;
      this.fx.ring(V3(0, 0.02, 0), col, { r: 1.8, life: 0.7 });
      this.p.burst(V3(0, 0.7, 0), col, 50, { speed: 3, life: 1, size: 0.07, up: 0.6 });
      m.flash('#ffffff', 1.2);
      Sfx.meow && Sfx.meow(key);
    }
  }
  bindDrag(el) {
    let down = false, lx = 0;
    el.addEventListener('pointerdown', e => { down = true; lx = e.clientX; el.setPointerCapture(e.pointerId); });
    el.addEventListener('pointermove', e => { if (down) { this.targetRot += (e.clientX - lx) * 0.012; lx = e.clientX; } });
    el.addEventListener('pointerup', () => { down = false; });
  }
  update(dt, t, rdt) {
    super.update(rdt, t);
    // 景色の入れかえ（0.4 秒ほど）。混ぜ終えたら次の絵を「いま」にする
    const U = this.bg.material.uniforms;
    if (U.mixv.value > 0) { U.mixv.value = Math.min(1, U.mixv.value + rdt * 2.5); if (U.mixv.value >= 1) { U.tA.value = U.tB.value; U.mixv.value = 0; } }
    this.rotY += (this.targetRot - this.rotY) * (1 - Math.exp(-6 * rdt));
    if (this.model) {
      this.model.group.rotation.y = this.rotY + this.spin;
      this.model.update(rdt, t);
      // ときどき身振り（手を振る・のびをする）。手を振るのは何も持っていないほうの手（持ち物が顔に刺さらないように）
      //   腕が短く頭が大きいので、高く上げると手がほっぺに埋まる。腕は肩の高さで斜め前・外へのばし、手を上下に小さく振る
      const ph = Math.floor(t / 5) % 4, m = this.model, freeL = m.armL && m.armL.grip && !m.armL.grip.children.length;
      const s = freeL ? 1 : -1, A = freeL ? 'L' : 'R', wave = { ...POSES.idle, ['arm' + A + 'x']: -1.55 + Math.sin(t * 10) * 0.25, ['arm' + A + 'z']: s * 1.15, ['elbow' + A]: -0.6 };
      const pose = ph === 1 ? wave : ph === 3 ? POSES.ready : POSES.idle;
      for (const k of POSE_KEYS) this.model.pose[k] += ((pose[k] || 0) - this.model.pose[k]) * (1 - Math.exp(-5 * rdt));
      if (ph === 1 && this.model.face) this.model.face.set('joy'); else if (this.model.face && this.model.face.expr === 'joy') this.model.face.set('smile');
    }
    this.camera.position.x += Math.sin(t * 0.25) * 0.001;
  }
}

// タイトルのにゃんだーの樹：遠景の樹（worldTree）と同じ大きさ・形の輪郭のまま、タイトルだけ細かく作る。
//   幹は、よじれた 6 本の太い筋がより合わさって一本になり、根もとで地面へ広がり、上で大枝に分かれて樹冠の下へ入っていく。
//   樹冠は、でこぼこの茂みを丸屋根の形に重ね、下のふちはひさしのように垂れる。茂みの色は、下と奥ほど暗い青緑、上ほど明るい黄緑。
//   夕日は樹のうしろ右手にあるので、夕日がわの輪郭が金色に光る（rim）。遠くのものらしく、下ほど夕焼けの色にかすむ（haze）。
//   形は決まった乱数で作り、毎回同じ。座標は worldTree と同じ（根もとが 0、樹冠のてっぺんが 77 ほど）
// 葉の房の絵（白黒。色は板の頂点の色をかける）：小さな丸い葉を、まるい房の形に二十いくつ重ねる。奥の葉ほど暗く、ふちはぎざぎざ
function leafTuftTex() {
  if (TexCache.leafTuft) return TexCache.leafTuft;
  const S = 128, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d'); g.translate(S / 2, S / 2);
  let sd = 5; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  const N = 26;
  for (let i = 0; i < N; i++) {
    const k = i / N, rr = 44 * Math.sqrt(1 - k) * (0.6 + 0.4 * rnd()), a = rnd() * 6.28, x = Math.cos(a) * rr, y = Math.sin(a) * rr;
    const L = 20 + rnd() * 10, W = L * 0.5, v = Math.round(190 + k * 65 * (0.8 + 0.2 * rnd()));
    g.save(); g.translate(x, y); g.rotate(Math.atan2(y, x) + (rnd() - 0.5) * 1.6);
    g.fillStyle = `rgb(${v},${v},${v})`;
    g.beginPath(); g.moveTo(-L * 0.35, 0); g.quadraticCurveTo(0, -W, L * 0.65, 0); g.quadraticCurveTo(0, W, -L * 0.35, 0); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-L * 0.3, 0); g.lineTo(L * 0.5, 0); g.stroke();
    g.restore();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return (TexCache.leafTuft = t);
}
// 葉のもよう（つなぎ目なしにくり返せる）：暗い地に、小さな明るい葉をすきまなく。茂みの面に三方向から貼る
function leafTileTex() {
  if (TexCache.leafTile) return TexCache.leafTile;
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d'); g.fillStyle = 'rgb(70,70,70)'; g.fillRect(0, 0, S, S);
  let sd = 9; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 170; i++) {
    const x = rnd() * S, y = rnd() * S, a = rnd() * 6.28, L = 22 + rnd() * 12, W = L * 0.48, v = Math.round(150 + rnd() * 105);
    for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) {
      if (x + ox < -L || x + ox > S + L || y + oy < -L || y + oy > S + L) continue;
      g.save(); g.translate(x + ox, y + oy); g.rotate(a); g.fillStyle = `rgb(${v},${v},${v})`;
      g.beginPath(); g.moveTo(-L * 0.4, 0); g.quadraticCurveTo(0, -W, L * 0.6, 0); g.quadraticCurveTo(0, W, -L * 0.4, 0); g.fill();
      g.strokeStyle = 'rgba(0,0,0,.2)'; g.lineWidth = 1.3; g.beginPath(); g.moveTo(-L * 0.35, 0); g.lineTo(L * 0.45, 0); g.stroke();
      g.restore();
    }
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  return (TexCache.leafTile = t);
}
// 樹皮のもよう（つなぎ目なしにくり返せる）：縦にのびる、うねった筋と割れ目
function barkTileTex() {
  if (TexCache.barkTile) return TexCache.barkTile;
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d'); g.fillStyle = 'rgb(175,175,175)'; g.fillRect(0, 0, S, S);
  let sd = 3; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  g.lineCap = 'round';
  for (let i = 0; i < 60; i++) {
    const x0 = rnd() * S, w = 2 + rnd() * 7, v = rnd() < 0.55 ? Math.round(60 + rnd() * 50) : Math.round(210 + rnd() * 45), ph = rnd() * 6.28, amp = 3 + rnd() * 6;
    const y0 = rnd() * S, len = 60 + rnd() * 200;
    for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) {
      g.strokeStyle = `rgb(${v},${v},${v})`; g.lineWidth = w; g.beginPath();
      for (let y = 0; y <= len; y += 8) g.lineTo(x0 + ox + Math.sin((y0 + y) / S * Math.PI * 2 * 2 + ph) * amp, y0 + oy + y);
      g.stroke();
    }
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  return (TexCache.barkTile = t);
}
// eye：実を置くための、いつもの画のカメラ（樹の中の座標での位置 pos と、画面のどこに写るか screen(x, y, z) → [横, 縦]（-1〜1））
function titleTree(health = 0.95, fruit = 0, eye = null) {
  const g = new THREE.Group(), BU = THREEX.BufferGeometryUtils, lo = GFX.low;
  let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  // 値ノイズ（0〜1）：茂みのでこぼこと、樹皮のうねり
  const hash = (x, y, z) => { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); };
  const noise = (x, y, z) => {
    const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z), u = x - ix, v = y - iy, w = z - iz;
    const su = u * u * (3 - 2 * u), sv = v * v * (3 - 2 * v), sw = w * w * (3 - 2 * w), L = (a, b, t) => a + (b - a) * t;
    const c = (dx, dy, dz) => hash(ix + dx, iy + dy, iz + dz);
    return L(L(L(c(0, 0, 0), c(1, 0, 0), su), L(c(0, 1, 0), c(1, 1, 0), su), sv), L(L(c(0, 0, 1), c(1, 0, 1), su), L(c(0, 1, 1), c(1, 1, 1), su), sv), sw);
  };
  const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const prof = pts => t => { for (let i = 1; i < pts.length; i++) if (t <= pts[i][0]) { const [t0, a] = pts[i - 1], [t1, b] = pts[i]; return a + (b - a) * (t - t0) / (t1 - t0); } return pts[pts.length - 1][1]; };
  // 夕日の向き・輪郭の光・かすみ：樹皮と葉で同じ。樹の大きさ（1.4 倍）と位置（下に 8）で、かすみは世界の高さで決める
  const sun = V3(0.55, 0.07, -0.83).normalize();
  //   card：葉の房の板。いつもカメラのほうを向き（aCorner の向きに aSize だけ広げ、aRot だけ回す）、光の当たり方は茂みの面の向き（normal）で決める
  //   tri：[もようの絵, くり返しの細かさ, 暗いところの明るさ, 明るいところの足し分]（面の向きに合わせて三方向から貼る）
  const treeMat = (opts, rim, glow, card = false, tri = null) => {
    const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, fog: false, ...opts });
    m.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, { uSun: { value: sun }, uRim: { value: new THREE.Color(rim) }, uHazeLo: { value: new THREE.Color('#e8a088') }, uHazeHi: { value: new THREE.Color('#8a86c0') } });
      if (tri) sh.uniforms.uTile = { value: tri[0] };
      sh.vertexShader = (card ? 'attribute vec2 aCorner; attribute float aSize, aRot;\n' : '') + (tri ? 'varying vec3 vOP, vON;\n' : '') + 'varying float vWY;\n' + sh.vertexShader.replace('#include <project_vertex>', (tri ? 'vOP = position; vON = normal;\n' : '') + (card ? `
  vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
  float cr = cos(aRot), sr = sin(aRot);
  // カメラに背を向けた面（樹の奥がわ）の板は、小さくして消す（茂みのうしろから手前へ突き出して、夕日の光で光ってしまう）
  float face = smoothstep(-0.3, 0.05, dot(normalize(normalMatrix * objectNormal), normalize(-mvPosition.xyz)));
  mvPosition.xy += mat2(cr, sr, -sr, cr) * aCorner * aSize * face * length(modelMatrix[0].xyz);
  gl_Position = projectionMatrix * mvPosition;` : '#include <project_vertex>') + '\n  vWY = (modelMatrix * vec4(transformed, 1.0)).y;');
      sh.fragmentShader = 'uniform vec3 uSun, uRim, uHazeLo, uHazeHi; varying float vWY;\n' + (tri ? 'uniform sampler2D uTile; varying vec3 vOP, vON;\n' : '') + sh.fragmentShader
        .replace('#include <color_fragment>', '#include <color_fragment>' + (tri ? `
          vec3 bw = pow(abs(vON), vec3(4.0)); bw /= bw.x + bw.y + bw.z;
          float lf = texture2D(uTile, vOP.zy * ${tri[1].toFixed(3)}).r * bw.x + texture2D(uTile, vOP.xz * ${tri[1].toFixed(3)}).r * bw.y + texture2D(uTile, vOP.xy * ${tri[1].toFixed(3)}).r * bw.z;
          diffuseColor.rgb *= ${tri[2].toFixed(2)} + lf * ${tri[3].toFixed(2)};` : ''))
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          vec3 sv = normalize((viewMatrix * vec4(uSun, 0.0)).xyz);
          float fr = 1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0);
          float side = clamp(dot(normal, sv) * 0.7 + 0.3, 0.0, 1.0);
          totalEmissiveRadiance += uRim * 1.5 * pow(fr, 2.0) * side * side + diffuseColor.rgb * ${glow.toFixed(2)};`)
        .replace('#include <fog_fragment>', `float hz = clamp(0.3 - vWY * 0.0022, 0.08, 0.32);
          gl_FragColor.rgb = mix(gl_FragColor.rgb, mix(uHazeLo, uHazeHi, smoothstep(0.0, 90.0, vWY)), hz);`);
    };
    m.customProgramCacheKey = () => 'titleTree' + rim + glow + card + (tri ? tri.slice(1).join() : '');
    return m;
  };

  // ---------- 幹・枝・根 ----------
  // 太さの変わる管：曲線に沿って、r(t) の太さで。樹皮の縦の溝（まわりに 7 本の波と、ノイズのうねり）で表面をでこぼこに。溝の底ほど暗い色
  const bark = [], barkCol = new THREE.Color('#9c7a5c'), barkDark = new THREE.Color('#34241a'), tmp = new THREE.Color();
  const tube = (pts, r, seg, rs) => {
    const curve = new THREE.CatmullRomCurve3(pts), fr = curve.computeFrenetFrames(seg, false), pos = [], col = [], idx = [];
    for (let i = 0; i <= seg; i++) {
      const t = i / seg, p = curve.getPointAt(t), N = fr.normals[i], B = fr.binormals[i], R = r(t);
      for (let j = 0; j <= rs; j++) {
        const a = j / rs * Math.PI * 2, d = N.clone().multiplyScalar(Math.cos(a)).addScaledVector(B, Math.sin(a));
        const o = p.clone().addScaledVector(d, R), gr = 0.5 + 0.5 * Math.sin(a * (rs > 12 ? 6 : 3) + t * 9 + noise(o.x * 0.3, o.y * 0.08, o.z * 0.3) * 4);
        const k = 1 + (gr - 0.5) * 0.2 + (noise(o.x * 0.5, o.y * 0.5, o.z * 0.5) - 0.5) * 0.12;
        o.copy(p).addScaledVector(d, R * k); pos.push(o.x, o.y, o.z);
        tmp.copy(barkDark).lerp(barkCol, 0.35 + 0.65 * gr * ss(-4, 14, o.y)); col.push(tmp.r, tmp.g, tmp.b);
      }
    }
    for (let i = 0; i < seg; i++) for (let j = 0; j < rs; j++) { const a = i * (rs + 1) + j, b = a + rs + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    const q = new THREE.BufferGeometry(); q.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); q.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    q.setIndex(idx); q.computeVertexNormals(); bark.push(q);
    return curve;
  };
  const K = 6, S1 = lo ? 28 : 64, R1 = lo ? 10 : 22;
  for (let k = 0; k < K; k++) {
    const a0 = k / K * Math.PI * 2 + 0.25, at = (R, y, da) => V3(Math.cos(a0 + da) * R, y, Math.sin(a0 + da) * R), reach = 20 + rnd() * 5;
    // 根もと（地面へ広がる）→ よじれて一本の幹に → 大枝になって樹冠の下へ
    const limb = tube([at(16, -4, -0.3), at(9.5, 1, -0.05), at(5.6, 7, 0.35), at(4.6, 16, 1.2), at(4.4, 26, 2.1), at(5.4, 33, 2.6), at(10.5, 40, 2.85), at(reach, 47 + rnd() * 3, 2.95)],
      prof([[0, 1.6], [0.12, 3.6], [0.3, 2.8], [0.6, 2.6], [0.78, 2.2], [1, 0.7]]), S1, R1);
    // 大枝から分かれる枝：樹冠の下のふちのほうへ。さらに先で細い枝を二本
    for (const [t0, da, R2, y2] of [[0.8, 0.55, 22, 45], [0.86, -0.35, 27, 43]]) {
      const p0 = limb.getPointAt(t0), p2 = at(R2 + rnd() * 4, y2 + rnd() * 2, 2.95 + da), p1 = p0.clone().lerp(p2, 0.5).add(V3(0, -1.5, 0));
      const br = tube([p0, p1, p2], prof([[0, 1.5], [1, 0.35]]), lo ? 10 : 18, lo ? 5 : 7);
      for (const [t1, s] of [[0.55, 1], [0.75, -1]]) {
        const q0 = br.getPointAt(t1), q2 = q0.clone().add(V3(Math.cos(a0 + 2.95 + da + s * 0.6) * 6, 2 + rnd() * 2, Math.sin(a0 + 2.95 + da + s * 0.6) * 6));
        tube([q0, q0.clone().lerp(q2, 0.5).add(V3(0, -0.6, 0)), q2], prof([[0, 0.6], [1, 0.15]]), lo ? 6 : 10, 5);
      }
    }
    // 筋と筋のあいだの根：地面をはって遠くへ
    const b = a0 + Math.PI / K;
    tube([V3(Math.cos(b) * 5, 4, Math.sin(b) * 5), V3(Math.cos(b) * 11, 0.5, Math.sin(b) * 11), V3(Math.cos(b + 0.1) * 19, -1.5, Math.sin(b + 0.1) * 19), V3(Math.cos(b + 0.15) * 26, -4, Math.sin(b + 0.15) * 26)],
      prof([[0, 2.6], [0.4, 1.8], [1, 0.4]]), lo ? 10 : 16, lo ? 6 : 8);
  }
  // 筋のあいだを埋める芯
  const core = new THREE.LatheGeometry([[7, -2], [5.4, 4], [3.8, 12], [3.6, 24], [3.9, 32], [2.4, 38], [0.2, 40]].map(([r, y]) => new THREE.Vector2(r, y)), R1 + 4);
  const coreC = barkDark.clone().lerp(barkCol, 0.35);
  core.deleteAttribute('uv'); core.setAttribute('color', new THREE.Float32BufferAttribute(new Array(core.attributes.position.count).fill(0).flatMap(() => [coreC.r, coreC.g, coreC.b]), 3));
  bark.push(core.index ? core.toNonIndexed() : core);
  for (let i = 0; i < bark.length; i++) if (bark[i].index) bark[i] = bark[i].toNonIndexed();
  g.add(new THREE.Mesh(BU.mergeGeometries(bark), treeMat({}, '#ff9a5a', 0.05, false, [barkTileTex(), 0.09, 0.3, 0.95])));

  // ---------- 樹冠 ----------
  // [x, y, z, 半径]：上の丸屋根（つぶれた楕円の面に、フィボナッチの並びで）、下のふち（ひさし）、内がわの底、芯
  const clumps = [];
  const ND = lo ? 26 : 34;
  for (let i = 0; i < ND; i++) {
    const v = (i + 0.5) / ND, ph = Math.acos(1 - v * 1.12), th = i * 2.39996 + 0.4, sx = Math.sin(ph);
    clumps.push([Math.cos(th) * sx * 27, 53 + Math.cos(ph) * 14, Math.sin(th) * sx * 27, 9.5 + rnd() * 3.5 - sx * 1.5]);
  }
  const NR = lo ? 14 : 18;
  for (let i = 0; i < NR; i++) {
    const th = (i + rnd() * 0.4) / NR * Math.PI * 2, R = 25 + rnd() * 5, droop = i % 3 === 1 ? 3 : 0;
    const c = [Math.cos(th) * R, 44 - droop + rnd() * 2, Math.sin(th) * R, 6.5 + rnd() * 2.5]; clumps.push(c);
  }
  for (let i = 0; i < 6; i++) { const th = (i + 0.5) / 6 * Math.PI * 2; clumps.push([Math.cos(th) * 14, 46, Math.sin(th) * 14, 9.5]); }
  clumps.push([0, 54, 0, 22]);
  // 色：下と奥ほど暗い青緑、上ほど明るい黄緑。元気がないほど灰色に（タイトルではいつも元気）。茂みごとに少し色をずらす
  const gray = new THREE.Color('#8a8a7a'), fade = c => new THREE.Color(c).lerp(gray, Math.max(0, 1 - health) * 0.9);
  const Csh = fade('#2e7464'), Cmid = fade('#5cc066'), Clit = fade('#e4f89a'), tints = [fade('#80d874'), fade('#4cbc98'), fade('#b8e070')];
  const leaves = [], cards = [], spots = [], P0 = V3();
  // 茂みの形の元（細かい球）。一度だけ作って、茂みごとに写す
  const base = BU.mergeVertices((() => { const q = new THREE.IcosahedronGeometry(1, lo ? 4 : 7); q.deleteAttribute('normal'); q.deleteAttribute('uv'); return q; })());
  // ほかの茂みとの近さ（y は 0.8 倍につぶした形）。d < k のとき、その茂みの中（k：半径の何倍か）
  const dist = (x, y, z, C) => { const dx = x - C[0], dy = (y - C[1]) / 0.8, dz = z - C[2]; return Math.sqrt(dx * dx + dy * dy + dz * dz) / C[3]; };
  clumps.forEach(([cx, cy, cz, r], ci) => {
    // 重なりを調べるのは、とどきうる茂みだけ（near：まわり、over：上にかぶさる）
    const near = clumps.filter((C, j) => j !== ci && Math.sqrt((C[0] - cx) ** 2 + ((C[1] - cy) / 0.8) ** 2 + (C[2] - cz) ** 2) < r * 1.4 + C[3] * 1.35);
    const over = clumps.filter((C, j) => j !== ci && C[1] > cy - r && Math.sqrt((C[0] - cx) ** 2 + (C[2] - cz) ** 2) < r * 1.4 + C[3] * 1.05);
    const buried = (x, y, z) => near.some(C => dist(x, y, z, C) < 1.1);
    const q = base.clone(), P = q.attributes.position, n = P.count, bump = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      P0.fromBufferAttribute(P, i); const wx = cx + P0.x * r, wy = cy + P0.y * r, wz = cz + P0.z * r;
      // 大きなふくらみ（茂みの中の小さな茂み）と、葉のかたまりの細かいでこぼこ
      const b = (noise(wx * 0.11, wy * 0.11, wz * 0.11) - 0.5) * 0.55 + (noise(wx * 0.32 + 7, wy * 0.32, wz * 0.32) - 0.5) * 0.2;
      bump[i] = b; const rr = r * (1 + b);
      P.setXYZ(i, cx + P0.x * rr, cy + P0.y * rr * 0.8, cz + P0.z * rr);
    }
    q.computeVertexNormals();
    const aboveA = new Float32Array(n), N = q.attributes.normal, col = new Float32Array(n * 3), tint = tints[ci % 3], c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const x = P.getX(i), y = P.getY(i), z = P.getZ(i), up = N.getY(i);
      // ほかの茂みに近い（くぼみ・重なりのきわ）ほど暗く
      let occ = 0;
      for (const C of near) { const d = dist(x, y, z, C); if (d < 1.35) occ += (1.35 - d) * 0.9; }
      // 上の茂みの陰：真上にほかの茂みがかぶさっているほど暗く
      let above = 0;
      for (const C of over) if (C[1] > y + 1 && (x - C[0]) ** 2 + (z - C[2]) ** 2 < (C[3] * 1.05) ** 2) above += 0.35;
      occ += Math.min(0.5, above); aboveA[i] = above;
      const h = ss(36, 76, y), out = ss(10, 36, Math.sqrt(x * x + z * z));
      c.copy(Csh).lerp(Cmid, ss(-0.9, 0.3, up) * 0.65 + h * 0.35).lerp(tint, 0.25);
      c.lerp(Clit, ss(0.15, 1, up) * (0.35 + h * 0.65) * 0.85);
      const lit = (0.74 + 0.26 * ss(-0.15, 0.2, bump[i])) * (1 - Math.min(0.5, occ)) * (0.85 + 0.15 * out) * (0.9 + 0.2 * noise(x * 0.9, y * 0.9, z * 0.9));
      c.multiplyScalar(lit); col.set([c.r, c.g, c.b], i * 3);
    }
    q.setAttribute('color', new THREE.BufferAttribute(col, 3));
    leaves.push(q);
    // 葉の房の板：ほかの茂みにうもれていない頂点から、いくつかを選んで、少し外へ浮かせて置く（大きい茂みほど多く）
    const want = r * r * (lo ? 0.7 : 1.8) / n;
    for (let i = 0; i < n; i++) {
      const x = P.getX(i), y = P.getY(i), z = P.getZ(i), nx = N.getX(i), ny = N.getY(i), nz = N.getZ(i);
      // 実をつけられるところ：カメラのほうを向いた、うもれていない面
      if (fruit && eye && i % 3 === 0) {
        P0.set(eye.pos.x - x, eye.pos.y - y, eye.pos.z - z).normalize();
        if (nx * P0.x + ny * P0.y + nz * P0.z > 0.35 && !buried(x, y, z)) spots.push([x, y, z, nx, ny, nz, ...eye.screen(x, y, z)]);
      }
      if (rnd() > want || (aboveA[i] > 0 && ny > -0.25)) continue;   // 上の茂みの陰の、上向きの面には置かない（上の茂みを突きぬけて光る）
      if (buried(x, y, z)) continue;
      const lift = 0.2 + rnd() * 0.5;
      cards.push([x + nx * lift, y + ny * lift, z + nz * lift, nx, ny, nz, col[i * 3], col[i * 3 + 1], col[i * 3 + 2], 1.2 + rnd() * 0.7, rnd() * 6.28]);
    }
  });
  base.dispose();
  g.add(new THREE.Mesh(BU.mergeGeometries(leaves), treeMat({}, '#ffc27a', 0.55, false, [leafTileTex(), 0.14, 0.5, 0.7])));
  {
    const n = cards.length, pos = new Float32Array(n * 12), nor = new Float32Array(n * 12), col = new Float32Array(n * 12), uv = new Float32Array(n * 8), cor = new Float32Array(n * 8), size = new Float32Array(n * 4), rot = new Float32Array(n * 4), idx = [];
    const C4 = [-1, -1, 1, -1, 1, 1, -1, 1];
    cards.forEach(([x, y, z, nx, ny, nz, r, gg, b, s, a], i) => {
      for (let k = 0; k < 4; k++) {
        const v = i * 4 + k, l = 0.85 + 0.3 * ((i * 7 + k) % 5) / 4;
        pos.set([x, y, z], v * 3); nor.set([nx, ny, nz], v * 3); col.set([r * l, gg * l, b * l], v * 3);
        cor.set([C4[k * 2], C4[k * 2 + 1]], v * 2); uv.set([(C4[k * 2] + 1) / 2, (C4[k * 2 + 1] + 1) / 2], v * 2); size[v] = s; rot[v] = a;
      }
      idx.push(i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3);
    });
    const q = new THREE.BufferGeometry();
    q.setAttribute('position', new THREE.BufferAttribute(pos, 3)); q.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); q.setAttribute('color', new THREE.BufferAttribute(col, 3));
    q.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); q.setAttribute('aCorner', new THREE.BufferAttribute(cor, 2)); q.setAttribute('aSize', new THREE.BufferAttribute(size, 1)); q.setAttribute('aRot', new THREE.BufferAttribute(rot, 1));
    q.setIndex(idx);
    const cm = new THREE.Mesh(q, treeMat({ map: leafTuftTex(), alphaTest: 0.5 }, '#e0a870', 0.55, true)); cm.frustumCulled = false; g.add(cm);
  }

  // 感情の実（光る）：樹冠の手前の面に、ばらばらに散らす。
  //   いつもの画で見えるのは樹冠の下のふちだけなので、まずそこに NF 個、つづけて画面の外の上のほう（はじめに樹を見上げたときに見える）に NU 個。
  //   置くところは乱数の順に試し、もう置いた実と近すぎるところはとばす。近さの下限は一つずつちがう長さにして、
  //   間がつまったところ・あいたところが混ざるように（きっちり同じ間隔だと、作りものっぽい）。近さは画面の上で測る（下から見上げる面もあるので）。
  //   手前の茂みのかげになるところもとばす
  const fruitCols = ['#ffd24a', '#ff4f9a', '#5ac8ff', '#9aff6a'], fruits = [], LIFT = 1.3;
  const NF = fruit && spots.length ? Math.round(health * 16) : 0, NU = NF ? Math.round(health * 12) : 0;
  const Q = V3(), D = V3(), AS = 16 / 9, placed = [];
  const hidden = (x, y, z) => {
    D.set(eye.pos.x - x, eye.pos.y - y, eye.pos.z - z).normalize();
    for (let t = 2; t < 40; t += 1.5) { Q.set(x + D.x * t, y + D.y * t, z + D.z * t); if (clumps.some(C => dist(Q.x, Q.y, Q.z, C) < 0.85)) return true; }
    return false;
  };
  const inBand = s => Math.abs(s[6]) < 0.9 && s[7] < 0.88;
  for (const [band, want] of [[true, NF], [false, NU]]) {
    const pool = spots.filter(s => inBand(s) === band);
    if (!want || !pool.length) continue;
    for (let k = pool.length - 1; k > 0; k--) { const m = Math.floor(rnd() * (k + 1)); [pool[k], pool[m]] = [pool[m], pool[k]]; }
    // 同じ間隔で敷きつめたときの間隔（樹冠の画面での広さから）。下限はその 0.35〜1.05 倍
    let x0 = 9, x1 = -9, y0 = 9, y1 = -9;
    for (const s of pool) { x0 = Math.min(x0, s[6]); x1 = Math.max(x1, s[6]); y0 = Math.min(y0, s[7]); y1 = Math.max(y1, s[7]); }
    const gap = Math.sqrt((x1 - x0) * AS * (y1 - y0) * 0.7 / want);
    let n = 0;
    for (const s of pool) {
      if (n >= want) break;
      const [x, y, z, nx, ny, nz, sx, sy] = s, dmin = gap * (0.35 + 0.7 * rnd());
      if (placed.some(([px, py]) => Math.hypot((px - sx) * AS, py - sy) < dmin)) continue;
      if (hidden(x + nx * LIFT, y + ny * LIFT, z + nz * LIFT)) continue;
      placed.push([sx, sy]);
      const i = fruits.length, c = fruitCols[i % 4], r = 1.1 * fruit * (0.8 + 0.4 * rnd());   // 大きさも少しずつちがう
      const f = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), glowMat(c, 4 * lumaBoost(c), { fog: false }));
      // 葉の房（面から 0.7 ほど浮く）にうもれないよう、面から少し前へ
      f.position.set(x + nx * LIFT, y + ny * LIFT, z + nz * LIFT); g.add(f); fruits.push(f); n++;
    }
  }
  // 樹のうしろの、ほのかな光
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: hdr('#fff0c8', 0.3 * health + 0.08), blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  halo.scale.setScalar(120); halo.position.y = 52; g.add(halo);
  return { g, fruits };
}

// タイトル：夕暮れの丘から、遠くのにゃんだーの樹を見上げる5匹。樹冠は画面の上に広がり、ロゴのうしろに幹が立つ。
//   夕日は右手の地平線に沈みかけ、空の上のほうから星が出はじめる。はじめは樹を見上げ、ゆっくり5匹の後ろの高さへ下りてくる
class TitleView extends BaseView {
  constructor() {
    super('dusk', 42, { skyTree: false });
    this.bloomStrength = 0.42; this.exposure = 1.1;
    // 夕日（右手の奥）から照らす。5匹は逆光になり、影が手前へのびる。手前からは、空の色の青むらさきの光で、黒い子の背中も見えるように
    const E = this.env, key = E.key, lights = E.root.children.filter(o => o.isDirectionalLight && o !== key), hemi = E.root.children.find(o => o.isHemisphereLight);
    key.position.set(9, 6.5, -14); key.color.set('#ffb478'); key.intensity = 2.3;
    if (lights[1]) { lights[1].color.set('#b8b8ff'); lights[1].intensity = 1.2; }
    if (hemi) { hemi.color.set('#d0c0f0'); hemi.groundColor.set('#7a5a40'); hemi.intensity = 1.25; }
    // 感情の実は、第八章で樹がよみがえってから（ほかの場所の樹と同じ。それまで実は実らない）
    // 実は、カメラが下りきったあとの画（update の camPos・camLook）で見えるところに散らす
    const TS = 1.4, TP = V3(8, -8, -150), cam = this.camera.clone();
    cam.position.set(0, 1.3, 8.1); cam.lookAt(0.6, 3.5, -40); cam.updateMatrixWorld();
    const eye = { pos: cam.position.clone().sub(TP).divideScalar(TS), screen: (x, y, z) => { const p = V3(x, y, z).multiplyScalar(TS).add(TP).project(cam); return [p.x, p.y]; } };
    const { g, fruits } = titleTree(0.95, treeHealth() >= 1 ? 0.6 : 0, eye); g.scale.setScalar(TS); g.position.copy(TP); this.scene.add(g); this.fruits = fruits;
    this.cats = ['mike', 'kuro', 'shiro', 'tama', 'maou'].map((k, i) => {
      const m = buildCharacter(k); m.group.position.set((i - 2) * 0.95, 0, 2.5 + Math.abs(i - 2) * 0.35); m.group.rotation.y = Math.PI + (i - 2) * 0.08; m.setPose(POSES.idle); this.scene.add(m.group);
      m.look = { t: 2 + i * 1.7, y: 0, tw: 0 };   // ときどき、となりの子や樹のてっぺんのほうへ顔を向ける
      return m;
    });
    titleMeadow(this.scene, this.cats.map(m => m.group.position));
    this.setCam(V3(0.2, 0.5, 9.4), V3(0.6, 13, -40), { snap: true, speed: 0.5 });
  }
  update(dt, t, rdt) {
    this.camPos.set(Math.sin(t * 0.07) * 0.3, 1.3 + Math.sin(t * 0.1) * 0.1, 8.1);
    this.camLook.set(0.6, 3.5, -40);
    super.update(rdt, t);
    this.cats.forEach((m, i) => {
      m.update(rdt, t + i);
      const wave = Math.sin(t * 0.5 + i * 1.3) > 0.93, k = 1 - Math.exp(-4 * rdt), L = m.look;
      m.pose.armRx += ((wave ? -2.5 : -0.1) - m.pose.armRx) * k;
      // 顔の向き：いつもは樹のほう。ときどき、となりの子のほうや空を見上げる。ミケは、ときどきふり返ってこちらを見る
      if ((L.t -= rdt) <= 0) {
        const back = i === 0 && Math.random() < 0.45;
        L.y = back ? 1.0 : Math.random() < 0.4 ? 0 : (Math.random() - 0.5) * 1.0; L.tw = back ? 0.35 : 0; L.up = !back && Math.random() < 0.3 ? -0.25 : 0;
        L.t = back ? 2.4 : 3 + Math.random() * 4;
        if (back) m.face.set('joy'); else if (m.face.expr === 'joy') m.face.set('smile');
      }
      const k2 = 1 - Math.exp(-2.5 * rdt);
      m.pose.headY += (L.y - m.pose.headY) * k2; m.pose.twist += (L.tw - m.pose.twist) * k2; m.pose.headX += ((L.up || 0) - m.pose.headX) * k2;
    });
    this.fruits.forEach((f, i) => f.scale.setScalar(1 + Math.sin(t * 2 + i) * 0.2));
  }
}
// タイトルの丘の草花：5匹のまわりに、風にゆれる草（三角の葉を一つの InstancedMesh で）と小さな花。
//   足もとの草は少なめに（体に刺さらないよう）、手前のカメラの近くと、遠くのふちは、だんだんまばらに
function titleMeadow(scene, feet) {
  const N = GFX.low ? 2200 : 5200, rnd = Math.random;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, 0, 0, 0.5, 0, 0, 0.08, 1, 0], 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute([0, 1, 0.3, 0, 1, 0.3, 0, 1, 0.3], 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute([0.32, 0.5, 0.22, 0.32, 0.5, 0.22, 1.0, 0.92, 0.55], 3));
  const time = { value: 0 }, mat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, emissive: '#3a2a12' });
  mat.onBeforeCompile = sh => {
    sh.uniforms.uTime = time;
    sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      vec2 ip = vec2(instanceMatrix[3][0], instanceMatrix[3][2]);
      float ph = dot(ip, vec2(0.9, 0.6)), k = transformed.y * transformed.y;
      transformed.x += (sin(uTime * 1.7 + ph) * 0.18 + sin(uTime * 3.1 + ph * 1.9) * 0.05) * k;
      transformed.z += sin(uTime * 1.2 + ph * 1.3) * 0.08 * k;`);
  };
  mat.customProgramCacheKey = () => 'titleGrass';
  const pts = [];
  for (let tries = 0; pts.length < N && tries < N * 4; tries++) {
    const x = (rnd() - 0.5) * 20, z = -7 + rnd() * 13;
    // ふち（左右・奥）と、カメラのすぐ前はまばらに
    const edge = Math.min(1, (10 - Math.abs(x)) / 3) * Math.min(1, (z + 7) / 4) * Math.min(1, (6 - z) / 1.2);
    if (rnd() > edge) continue;
    if (feet.some(f => Math.hypot(x - f.x, z - f.z) < 0.3)) continue;
    pts.push([x, z]);
  }
  const im = new THREE.InstancedMesh(geo, mat, pts.length), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color();
  pts.forEach(([x, z], i) => {
    const h = 0.12 + rnd() * 0.22, w = 0.035 + rnd() * 0.025;
    m4.compose(V3(x, 0, z), q.setFromEuler(new THREE.Euler((rnd() - 0.5) * 0.5, rnd() * Math.PI * 2, (rnd() - 0.5) * 0.5)), V3(w, h, w));
    im.setMatrixAt(i, m4); im.setColorAt(i, c.setHSL(0.22 + rnd() * 0.08, 0.45 + rnd() * 0.2, 0.6 + rnd() * 0.16));
  });
  im.receiveShadow = true; im.frustumCulled = false; scene.add(im);
  // 小さな花（白・黄・桃・うす紫）
  const NF = GFX.low ? 120 : 260, fm = new THREE.MeshLambertMaterial({ emissive: '#ffffff', emissiveIntensity: 0.12 });
  const fl = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.032, 0), fm, NF), cols = ['#ffffff', '#ffe27a', '#ffb0cc', '#d8c0ff'];
  for (let i = 0; i < NF; i++) {
    let x, z; do { x = (rnd() - 0.5) * 18; z = -6 + rnd() * 11.5; } while (feet.some(f => Math.hypot(x - f.x, z - f.z) < 0.35));
    m4.compose(V3(x, 0.1 + rnd() * 0.16, z), q.identity(), V3(1, 0.7, 1).multiplyScalar(0.8 + rnd() * 0.6)); fl.setMatrixAt(i, m4); fl.setColorAt(i, c.set(cols[i % 4]));
  }
  scene.add(fl);
  im.onBeforeRender = () => { time.value = GFX.time; };
}

// ============================================================
//  バトルビュー（演出ディレクター）
// ============================================================
// 魔法陣のテクスチャ（加算合成用、白地に黒は透過扱い）
function runeTex() {
  if (TexCache.rune) return TexCache.rune;
  const S = 1024, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d'); g.translate(S / 2, S / 2); g.strokeStyle = '#fff'; g.fillStyle = '#fff'; g.lineCap = 'round';
  const circ = (r, w) => { g.lineWidth = w; g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.stroke(); };
  circ(500, 8); circ(470, 3); circ(330, 5); circ(300, 2); circ(150, 6);
  for (const rot of [0, Math.PI]) { g.lineWidth = 4; g.beginPath(); for (let i = 0; i <= 3; i++) { const a = rot + i * Math.PI * 2 / 3 - Math.PI / 2; g.lineTo(Math.cos(a) * 470, Math.sin(a) * 470); } g.stroke(); }
  for (let i = 0; i < 48; i++) {   // 外周の文字のような刻み
    const a = i / 48 * Math.PI * 2; g.save(); g.rotate(a); g.translate(0, -400);
    g.lineWidth = 3; g.beginPath(); const k = i * 7 % 5;
    g.moveTo(-12, -20); g.lineTo(k * 5 - 10, 0); g.lineTo(12, 20 - k * 6); if (k % 2) { g.moveTo(-10, 18); g.lineTo(10, 18); } g.stroke(); g.restore();
  }
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.lineWidth = 3; g.beginPath(); g.moveTo(Math.cos(a) * 150, Math.sin(a) * 150); g.lineTo(Math.cos(a) * 300, Math.sin(a) * 300); g.stroke(); g.beginPath(); g.arc(Math.cos(a) * 225, Math.sin(a) * 225, 14, 0, Math.PI * 2); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.anisotropy = 4;
  return (TexCache.rune = t);
}

// 第二形態の演出の型：星核の番人は赤黒い雷、氷刃の女帝は吹雪と氷の棘
// 第二形態の演出の型（ボスごと）：足もとの魔法陣・周りを巡る結晶・渦・稲妻や棘
const P2_STYLES = {
  guardian: { sub: '#fff8d8', dark: '#e8b830', crown: { color: '#e8d8a8', emissive: '#ffd24a', ei: 0.9 }, pulse: '#ffd24a', fog: '#8a8a60', swirl: ['#ffffff', '#8affe0', '#ffd24a'], tint: [0.15, 0.2, 0.5], desat: 0.2, charge: '#fff8d8', glow: 0.4, tone: [140, 110, 100] },
  kodoku: { sub: '#e8e0ff', dark: '#1a0a4a', crown: { color: '#05020c', emissive: '#8a5aff', ei: 1.4 }, pulse: '#2a1070', fog: '#0c0620', swirl: ['#ffffff', '#ff8ab8', '#2a1070'], tint: [0.55, 0.6, 0.35], desat: 0.65, charge: '#020108', bolts: true, tone: [56, 44, 40] },
  nekogami: { sub: '#fffff0', dark: '#ffd24a', crown: { color: '#fff4c8', emissive: '#ffe08a', ei: 1.0 }, pulse: '#ffe08a', fog: '#f8e8f0', swirl: ['#ffffff', '#ff9ad8', '#ffe08a'], tint: [0.05, 0.15, 0.4], desat: 0.1, charge: '#fffff0', tone: [220, 180, 160] },
};

class BattleView extends BaseView {
  constructor(battle, theme) {
    // 物語の場所で戦う（第一章）：探索フィールドの区画を背景に組み立てる
    const loc = battle.opts.loc && typeof resolveBattleSet === 'function' ? resolveBattleSet(battle.opts.loc) : null;
    //   戦闘用の背景（zone.battleSet）は戦場のまわりだけなので、遠景は区画の広さをよけない（にゃんだーの樹の方角だけ区画から）
    const Z = loc && FIELD_ZONES[loc.zone], envZone = Z && Z.battleSet ? { map2d: zoneMap2d(Z), skyTree: Z.skyTree } : Z;
    super(loc ? battleTheme(loc, theme) : theme, 38, loc ? { field: true, bare: true, zone: envZone, turn: loc.face * Math.PI / 180 } : {});
    this.b = battle;
    if (loc) { buildBattleSet(this, loc); this.initCutaway(); }
    this.bloomStrength = 0.55;
    this.ents = new Map();
    this.hitGlow = 1;   // 敵が受ける命中の光の強さ（技のあいだだけ変える。attackEnd で 1 に戻る）
    this.partners = new Set();   // 技を撃つ子のほかに、持ち場をはなれている子（友情技の相方）
    this.markGeo = new THREE.RingGeometry(0.75, 0.9, 64);
    this.sway = 0.4; this.swayOff = V3(); this.roll = 0;
    this.scene.add(this.camera);   // カメラ子のスプラッシュ背景を描くため
    this.wide();
    this.setCam(V3(0, 9, 16), V3(0, 1, -3), { snap: true });
    battle.allies.forEach((u, i) => this.addAlly(u, i, battle.allies.length));
  }

  // ---------- 配置 ----------
  ent(u) { return this.ents.get(u.uid); }
  addAlly(u, i, n) {
    const m = buildCharacter(u.key);
    const home = V3((i - (n - 1) / 2) * 1.25, 0, 2.6);
    m.group.position.copy(home); m.group.rotation.y = Math.PI;
    m.setPose(POSES.ready);
    this.scene.add(m.group);
    const e = { u, model: m, home, ally: true };
    e.mark = this.makeMark(); this.ents.set(u.uid, e);
    if (!u.alive) this.allyDown(u, true);
  }
  makeMark() {
    const mat = new THREE.MeshBasicMaterial({ color: hdr('#e8c77a', 3), transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
    const m = new THREE.Mesh(this.markGeo, mat); m.rotation.x = -Math.PI / 2; m.position.y = 0.03; m.renderOrder = OVER_PAINT; this.scene.add(m);
    return m;
  }
  layoutEnemies(list) {
    const alive = list;
    const gap = 0.9;
    const widths = alive.map(u => (this.ent(u) ? this.ent(u).model.radius : 0.7) * 2 + gap);
    const total = widths.reduce((a, b) => a + b, 0);
    let x = -total / 2;
    alive.forEach((u, i) => {
      const e = this.ent(u); if (!e) return;
      const w = widths[i];
      const d = u.def;
      e.home = this.clearOfProps(V3(x + w / 2, 0, d.boss ? -5.6 : d.elite ? -3.4 : -2.9), (e.model.radius || 0.6) * 0.8);
      x += w;
    });
  }
  // 戦場の小物（机・柱など）に埋まらないよう、手前へずらす
  clearOfProps(p, r) {
    const cols = this.set && this.toSet && this.set.pv.colliders; if (!cols || !cols.length) return p;
    const l = V3();
    while (p.z < -1.5) {
      l.copy(p).applyMatrix4(this.toSet);
      if (!cols.some(c => this.hitsCol(c, l.x, l.z, r, null))) break;
      p.z += 0.25;
    }
    return p;
  }
  syncEnemies(list) {
    const ids = new Set(list.map(u => u.uid));
    for (const [id, e] of this.ents) {
      if (!e.ally && !ids.has(id)) {
        this.scene.remove(e.model.group); disposeTree(e.model.group); this.scene.remove(e.mark); if (e.ice) this.scene.remove(e.ice);
        if (e.p2 && e.p2.g) { this.scene.remove(e.p2.g); disposeTree(e.p2.g); if (e.p2.fog0 && this.scene.fog) this.scene.fog.color.copy(e.p2.fog0); }
        this.ents.delete(id);
      }
    }
    const fresh = [];
    for (const u of list) {
      if (this.ents.has(u.uid)) continue;
      const m = buildEnemy(u.key);
      m.group.rotation.y = 0;
      this.scene.add(m.group);
      const e = { u, model: m, ally: false, home: V3() };
      e.mark = this.makeMark();
      this.ents.set(u.uid, e); fresh.push(e);
    }
    this.layoutEnemies(list);
    for (const u of list) {
      const e = this.ent(u);
      if (fresh.includes(e)) {
        e.model.group.position.copy(e.home).add(V3(0, -e.model.height, 0));
        const col = e.model.color;
        this.fx.ring(e.home.clone().add(V3(0, 0.05, 0)), col, { r: e.model.radius * 2.2, life: 0.9 });
        this.p.burst(e.home.clone().add(V3(0, 0.5, 0)), col, 40, { speed: 3, up: 1.5, life: 1 });
        GFX.tween(0.7, t => { e.model.group.position.y = -e.model.height * (1 - t); }, Ease.out);
      } else {
        const from = e.model.group.position.clone();
        GFX.tween(0.4, t => e.model.group.position.lerpVectors(from, e.home, t));
      }
    }
  }

  // ---------- カメラ ----------
  enemyCenter() {
    const es = this.b.aliveEnemies().map(u => this.ent(u)).filter(Boolean);
    if (!es.length) return V3(0, 0, -3);
    return es.reduce((a, e) => a.add(e.home), V3()).multiplyScalar(1 / es.length);
  }
  // 敵の背が、ふつうのカメラに収まる高さ（3.4）をどれだけ超えているか
  //   コドク・ねこ神は第二形態で 5.6 ほどになり、ふつうのカメラでは頭が名前と HP のバーの裏や画面の外へ出る
  enemyTall() {
    let top = 0;
    for (const u of this.b.aliveEnemies()) {
      const e = this.ent(u); if (!e) continue;
      const g = e.model.group;
      if (e.top0 == null) { g.updateMatrixWorld(true); e.top0 = (new THREE.Box3().setFromObject(e.model.inner).max.y - g.position.y) / g.scale.y; }
      top = Math.max(top, e.top0 * g.scale.y);
    }
    return Math.max(0, top - 3.4);
  }
  wide() {
    const hasBoss = this.b.enemies.some(e => e.def.boss), tall = this.enemyTall();
    this.unfocus(); this.setFov(38); this.roll = 0; this.sway = 0.4;
    this.setCam(V3(0, hasBoss ? 2.8 : 2.1, (hasBoss ? 10.2 : 8.2) + tall), V3(0, hasBoss ? 2.1 : 1.0, -2.5), { speed: 2.5 });
  }
  // 本家風の肩越し視点：手前左に行動キャラ、奥の中央に敵
  //   背の高い敵は、うしろへ引いて視野を広げ、少し上を見る（頭を HP のバーの下に、足もとを仲間のカードの上に）
  shoulder(e, { snap = false, speed = 2.6 } = {}) {
    const h = e.home, c = this.enemyCenter(), boss = this.b.enemies.some(x => x.def.boss), tall = this.enemyTall();
    const f = V3(c.x - h.x, 0, c.z - h.z).normalize(), r = V3(-f.z, 0, f.x);
    const pos = h.clone().addScaledVector(f, -3.5 - tall * 1.5).addScaledVector(r, 2.0); pos.y = 1.4;
    const look = h.clone().addScaledVector(f, 6).addScaledVector(r, 1.0); look.y = (boss ? 1.6 : 0.8) + tall * 0.15;
    this.setFov(38 + tall * 1.8); this.roll = 0; this.sway = 1;
    this.setCam(pos, look, { snap, speed });
  }
  // 行動キャラ以外の味方を隠す（肩越し視点で敵が隠れないように）
  focus(e) { for (const x of this.ents.values()) if (x.ally) x.model.group.visible = x === e; }
  unfocus() { for (const x of this.ents.values()) if (x.ally) x.model.group.visible = true; }
  setFov(f) { if (this.camera.fov !== f) { this.camera.fov = f; this.camera.updateProjectionMatrix(); } }
  cut(pos, look, { fov = 38, roll = 0 } = {}) { this.setCam(pos, look, { snap: true }); this.setFov(fov); this.roll = roll; }
  // カメラのレール移動（毎フレーム位置を直接指定）
  rail(dur, p0, p1, l0, l1, { ease = Ease.inOut, fov0 = 38, fov1 = fov0, roll0 = 0, roll1 = roll0 } = {}) {
    const P = V3(), L = V3();
    return GFX.tween(dur, t => {
      this.setCam(P.lerpVectors(p0, p1, t), L.lerpVectors(l0, l1, t), { snap: true });
      this.setFov(lerp(fov0, fov1, t)); this.roll = lerp(roll0, roll1, t);
    }, ease);
  }
  // ---------- 壁の切り取り ----------
  // 戦場の区画の壁・柱・天井は、カメラと味方・敵のあいだに入ると、視線に垂直な面で手前を切り落とす
  // （床・水面は切らない。切らないときは面をカメラの位置に置く）
  //   材質には、探索フィールドと使い回すもの（魔王城の重い扉の HEAVY_DOOR_M など）がある。
  //   付けた切り取り面は、戦闘のあと dispose で元に戻す（戻さないと、フィールドの扉が切り落とされて消える）
  initCutaway() {
    const S = this.set, outl = new Set(Object.values(OutlineCache)), nm = new THREE.Matrix3(), n = V3();
    GFX.renderer.localClippingEnabled = true;
    this.cutPlane = new THREE.Plane(V3(0, 0, -1), 0); this.cutDepth = 0;
    this.clipped = new Map();   // 切り取り面を付けた材質 → もとの clippingPlanes
    S.root.updateMatrixWorld(true);
    this.toSet = S.root.matrixWorld.clone().invert();
    S.root.traverse(o => {
      if (!o.isMesh || !o.material) return;
      const na = o.geometry.getAttribute('normal');
      if (na) {
        nm.getNormalMatrix(o.matrixWorld);
        let flat = true;
        for (let i = 0; i < na.count && flat; i++) if (n.fromBufferAttribute(na, i).applyMatrix3(nm).normalize().y < 0.9) flat = false;
        if (flat) return;
      }
      for (const m of [].concat(o.material)) if (!outl.has(m)) {
        if (!this.clipped.has(m)) this.clipped.set(m, m.clippingPlanes);
        m.clippingPlanes = [this.cutPlane]; m.needsUpdate = true;
      }
    });
  }
  dispose() {
    if (this.clipped) { this.clipped.forEach((was, m) => { m.clippingPlanes = was; m.needsUpdate = true; }); this.clipped = null; }
    super.dispose();
  }
  // カメラから点 p までの視線をさえぎる地形・大きな小物のうち、いちばん奥のものの深さ（なければ 0）
  //   戦闘のあいだ自動扉は閉じたままなので、扉のマス（D）は床から上の壁まで、まるごと視線をさえぎる
  blockDepth(cam, p, fwd) {
    const T = this.set.pv.T, cols = this.set.pv.colliders || [], d = V3().subVectors(p, cam), len = d.length();
    const q = V3(), l = V3(); let deep = 0;
    const shut = (x, z) => { const i = T.at(x, z); return i >= 0 && T.kind[i] === TK.DOOR; };
    for (let s = 0.25; s < len - 0.3; s += 0.3) {
      q.copy(cam).addScaledVector(d, s / len); l.copy(q).applyMatrix4(this.toSet);
      const hit = (T && (T.blocksView(l.x, l.y, l.z) || shut(l.x, l.z))) || cols.some(c => (c.box || c.r > 0.5) && (c.top == null || l.y - (c.y || 0) < c.top + 0.2) && this.hitsCol(c, l.x, l.z, 0.1, null));
      if (hit) deep = V3().subVectors(q, cam).dot(fwd);
    }
    return deep;
  }
  updateCutaway(dt) {
    if (!this.cutPlane) return;
    const cam = this.camera.position, fwd = this.camera.getWorldDirection(V3());
    let need = 0, cap = Infinity;
    const see = (p, r) => {
      const depth = V3().subVectors(p, cam).dot(fwd); if (depth < 0.3) return;
      cap = Math.min(cap, depth - r - 0.25);
      need = Math.max(need, this.blockDepth(cam, p, fwd));
    };
    for (const e of this.ents.values()) {
      const g = e.model.group; if (!g.visible) continue;
      const r = e.ally ? 0.4 : e.model.radius || 0.6, h = e.model.height || 1;
      see(V3(g.position.x, g.position.y + h * 0.9, g.position.z), r);
      see(V3(g.position.x, g.position.y + 0.3, g.position.z), r);
    }
    const target = need > 0 ? Math.max(0, Math.min(need + 0.5, cap)) : 0;
    // 切るときはすぐ、戻すときはゆっくり（壁がちらつかないように）
    this.cutDepth = target > this.cutDepth ? target : lerp(this.cutDepth, target, 1 - Math.exp(-2 * dt));
    this.cutPlane.normal.copy(fwd);
    this.cutPlane.constant = -(fwd.dot(cam) + this.cutDepth);
  }
  onTurn(u) {
    const e = this.ent(u); if (!e) return;
    if (e.ally) {
      this.focus(e);
      this.face(e, this.enemyCenter());
      this.shoulder(e);
      e.model.flash(e.model.charCol, 0.5);
    } else {
      this.unfocus(); this.sway = 0.4;
      this.setCam(V3(e.home.x * 0.4 - 1.2, 2.3, 8.6), V3(e.home.x * 0.5, 1.2, e.home.z * 0.5), { speed: 2.5 });
    }
  }
  intro() {
    const hasBoss = this.b.enemies.some(e => e.def.boss);
    this.setCam(V3(-6, 4, hasBoss ? -12 : -9), V3(0, hasBoss ? 3 : 1.4, -3), { snap: true });
    this.setCam(V3(0, hasBoss ? 2.8 : 2.1, hasBoss ? 10.2 : 8.2), V3(0, hasBoss ? 2.1 : 1.0, -2.5), { speed: 1.1 });
  }

  // ---------- 位置ヘルパー ----------
  hitPoint(u) {
    const e = this.ent(u); if (!e) return V3();
    const g = e.model.group.position;
    return V3(g.x, g.y + e.model.height * (e.ally ? 0.62 : 0.55), g.z);
  }
  face(e, p) { const g = e.model.group; g.rotation.y = Math.atan2(p.x - g.position.x, p.z - g.position.z); }
  tweenPose(m, pose, dur) {
    const from = { ...m.pose };
    return GFX.tween(dur, t => { for (const k of POSE_KEYS) m.pose[k] = lerp(from[k], pose[k] || 0, t); });
  }

  // ---------- 味方の攻撃 ----------
  async attack(src, targets, kind, opt = {}) {
    const e = this.ent(src); if (!e || !targets.length) return;
    const m = e.model, col = ELEMENTS[this.b.elemOf(src, kind, opt)].color;
    const tEnts = targets.map(t => this.ent(t)).filter(Boolean);
    const main = tEnts[0]; if (!main) return;
    const ult = kind === 'ult';
    // 技ごとのモーション（js/gfx/moves.js）。keep の技は、持ち場をはなれた相方をそのまま残す
    const mv = MOVES[this.animOf(opt)];
    const away = mv && mv.keep ? this.park(src) : this.recall(src);
    this.lastAttack = { src, moved: away };
    this.unfocus(); this.sway = 0;
    if (mv && mv.attack) { await mv.attack.call(this, e, tEnts, { col, ult, kind, opt }); if (ult) GFX.shake(0.3); return; }
    if (m.style === 'melee' && !opt.ranged) {
      const multi = tEnts.length > 2;
      const c = this.enemyCenter();
      const dest = multi ? V3(c.x, 0, Math.max(...tEnts.map(t => t.home.z)) + 2.2)
        : main.home.clone().add(V3(0, 0, main.model.radius + 0.7));
      if (multi || main.u.def.boss) dest.z = Math.min(dest.z, 1.0);
      this.setCam(V3(dest.x + 3.3, 1.5, dest.z + 2.8), V3(dest.x - 0.4, 0.9, dest.z - 1.4), { speed: 5 });
      this.face(e, dest);
      const from = e.model.group.position.clone();
      this.tweenPose(m, multi ? POSES.jump : POSES.windup, 0.22);
      await GFX.tween(0.3, t => {
        m.group.position.lerpVectors(from, dest, t);
        m.group.position.y = Math.sin(t * Math.PI) * (multi ? 1.6 : 0.35);
        for (let i = 0; i < 3; i++) this.p.emit(this.hitPoint(src), V3((Math.random() - 0.5), (Math.random() - 0.5), (Math.random() - 0.5)), hdr(col, 2.5), { life: 0.4, size: 0.12 });
      }, Ease.inOut);
      this.face(e, main.home);
      this.lastAttack.moved = true;
      await this.tweenPose(m, multi ? POSES.slam : POSES.strike, 0.09);
      if (multi) { this.fx.ring(dest.clone().add(V3(0, 0.05, 0)), col, { r: 6, life: 0.6 }); GFX.shake(0.25); }
      for (const t of tEnts) this.fx.slash(this.hitPoint(t.u), col, { cam: this.camera, size: ult ? 3.6 : 2.4 });
      if (ult) for (const t of tEnts) { this.fx.pillar(t.home, col, { h: 10, r: 1.0 }); this.fx.slash(this.hitPoint(t.u), '#ffffff', { cam: this.camera, size: 3.0, angle: Math.random() * 3 }); }
    } else {
      this.setCam(V3(e.home.x + 1.3, 1.6, e.home.z + 2.8), V3(main.home.x * 0.7, 1.0, main.home.z), { speed: 5 });
      this.face(e, main.home);
      await this.tweenPose(m, tEnts.length > 1 ? POSES.cast2 : POSES.cast, 0.2);
      const tip = m.tipPos();
      this.fx.sprite(tip, col, 0.9, 0.35);
      if (ult) {
        this.setCam(V3(0, 4.5, 8.5), V3(this.enemyCenter().x, 1.2, -3), { speed: 5 });
        this.fx.sprite(this.enemyCenter().add(V3(0, 9, 0)), col, 9, 0.9, { k: 2, grow: 1.3 });
        await GFX.delay(0.25);
        await Promise.all(tEnts.map((t, i) => GFX.delay(i * 0.08).then(() =>
          this.fx.projectile(t.home.clone().add(V3(2.5, 14, 4)), this.hitPoint(t.u), col, { dur: 0.32, size: 2.6, arc: 0 }))));
        for (const t of tEnts) {
          this.fx.pillar(t.home, col, { h: 14, r: 1.4, k: 2 });
          this.fx.ring(t.home.clone().add(V3(0, 0.05, 0)), col, { r: 5, life: 0.8, width: 0.3 });
          this.fx.sprite(this.hitPoint(t.u), col, 6, 0.5, { k: 3 });
          this.fx.shards(this.hitPoint(t.u), col, 10, 7);
        }
        GFX.flash(col, 0.3, 0.3);
      } else {
        await Promise.all(tEnts.map(t => this.fx.projectile(tip, this.hitPoint(t.u), col, { dur: 0.26, size: 0.6 })));
      }
    }
    if (ult) GFX.shake(0.3);
  }
  // 連続攻撃（bounce）の 2 発目から：近接は次の敵へ跳んで斬り、遠距離は弾を撃つ
  async quickShot(src, t, kind, opt = {}) {
    const e = this.ent(src), te = this.ent(t); if (!e || !te) return;
    const col = ELEMENTS[this.b.elemOf(src, kind, opt)].color, mv = MOVES[this.animOf(opt)];
    if (mv && mv.hop) return mv.hop.call(this, e, te, { col, ult: kind === 'ult', kind, opt });
    if (this.lastAttack && this.lastAttack.src === src && this.lastAttack.moved) {
      const dest = this.meleeSpot(te, 0.7);
      this.closeCam(dest);
      await this.dashTo(e, dest, { pose: POSES.windup, dur: 0.18, hop: 0.45 });
      this.face(e, te.home);
      await this.tweenPose(e.model, POSES.strike, 0.07);
      this.fx.slash(this.hitPoint(t), col, { cam: this.camera, size: 2.2 });
      return;
    }
    await this.fx.projectile(e.model.tipPos(), this.hitPoint(t), col, { dur: 0.16, size: 0.5, arc: 0.3 });
  }
  // 同じ敵へ続けて斬る（二連・三連影）：2 太刀目からは、返す刀と振りかぶり直しをくり返す
  async restrike(src, t, i, kind, opt = {}) {
    const e = this.ent(src), te = this.ent(t); if (!e || !te) return;
    const m = e.model, col = ELEMENTS[this.b.elemOf(src, kind, opt)].color, mv = MOVES[this.animOf(opt)];
    if (mv && mv.restrike) return mv.restrike.call(this, e, te, i, { col, ult: kind === 'ult', kind, opt });
    if (!this.lastAttack || this.lastAttack.src !== src || !this.lastAttack.moved) { await this.fx.projectile(m.tipPos(), this.hitPoint(t), col, { dur: 0.2, size: 0.5, arc: 0.3 }); return; }
    this.face(e, te.home);
    if (i % 2) await this.tweenPose(m, POSES.strike2, 0.1);
    else { await this.tweenPose(m, POSES.windup, 0.08); await this.tweenPose(m, POSES.strike, 0.08); }
    this.fx.slash(this.hitPoint(t), col, { cam: this.camera, size: kind === 'ult' ? 3 : 2.4, angle: (i % 2 ? -0.6 : 0.5) + (Math.random() - 0.5) * 0.4 });
  }
  // ダメージのない技の動き（技の run から B.motion で呼ぶ）
  async motion(src, anim, targets) {
    const e = this.ent(src), mv = MOVES[anim]; if (!e || !mv) return;
    const ts = targets.map(t => this.ent(t)).filter(Boolean), col = this.b.abColor(src);
    this.unfocus(); this.sway = 0;
    if (mv.attack) { this.lastAttack = { src, moved: this.recall(src) }; await mv.attack.call(this, e, ts, { col, ult: false, kind: 'skill', opt: {} }); }
    else if (mv.support) await mv.support.call(this, e, targets, { col });
  }
  // しるしをつけた連撃の決め（battle の markHits）：land(j) で j 発目のダメージが入る。技に finish がなければ、そのまま順に当てる
  async finishMarks(n, land, opt) {
    const mv = MOVES[this.animOf(opt)];
    if (mv && mv.finish) return mv.finish.call(this, n, land);
    for (let j = 0; j < n; j++) await land(j);
  }
  // 友情技で先に飛びこんだ相方を、もとの位置へ戻す。src 自身が持ち場をはなれていたら true（戻すのは attackEnd）
  recall(src) {
    const away = this.park(src), list = [...this.partners];
    this.partners.clear();
    for (const e of list) this.goHome(e);
    return away;
  }
  // 持ち場をはなれている子を相方として覚えておく（src 自身ははずして、はなれていたかを返す）
  park(src) {
    const la = this.lastAttack;
    if (la && la.src !== src && la.moved) { const e = this.ent(la.src); if (e) this.partners.add(e); }
    this.lastAttack = null;
    const e = this.ent(src), away = !!e && this.partners.has(e);
    if (e) this.partners.delete(e);
    return away;
  }
  goHome(e) {
    const m = e.model, from = m.group.position.clone();
    this.tweenPose(m, e.u.alive ? POSES.ready : POSES.down, 0.3);
    GFX.tween(0.3, t => { m.group.position.lerpVectors(from, e.home, t); m.group.position.y = Math.sin(t * Math.PI) * 0.5; }).then(() => { m.group.rotation.y = Math.PI; });
  }
  async attackEnd(src) {
    const e = this.ent(src); if (!e) return;
    const m = e.model, la = this.lastAttack, moved = !!la && la.src === src && la.moved;
    // 相方を戻す。src 自身が相方として跳びこんだまま（友情技で、先の一撃で敵が倒れた）なら、src も戻す
    const away = this.recall(src);
    if ((moved || away) && src.alive) {
      await GFX.delay(0.12);
      const from = m.group.position.clone();
      this.tweenPose(m, POSES.ready, 0.3);
      await GFX.tween(0.3, t => { m.group.position.lerpVectors(from, e.home, t); m.group.position.y = Math.sin(t * Math.PI) * 0.5; });
    } else if (src.alive) this.tweenPose(m, POSES.ready, 0.3);
    m.group.rotation.y = Math.PI;
    if (this.kkb) { for (const x of this.kkb.marks) x.ctl.fade(); this.kkb = null; }   // 黒白連撃のしるし（決めまで行かなかったとき）
    this.lastAttack = null; this.hitGlow = 1; this.breakX = null;
    this.wide();
  }

  // 味方対象のスキル（回復・シールド・バフ）
  async support(src, targets) {
    const e = this.ent(src); if (!e) return;
    const col = this.b.abColor(src);
    this.unfocus(); this.sway = 0;
    this.recall(src);
    const mv = MOVES[this.animOf()];
    if (mv && mv.support) return mv.support.call(this, e, targets.filter(Boolean), { col });
    this.setCam(V3(e.home.x + 2.0, 1.3, e.home.z - 1.6), V3(e.home.x - 0.2, 0.8, e.home.z + 0.3), { speed: 4 });
    e.model.group.rotation.y = 0.9;
    await this.tweenPose(e.model, POSES.cast2, 0.22);
    const tip = e.model.tipPos();
    this.fx.sprite(tip, col, 1.2, 0.4);
    this.fx.ring(e.home.clone().add(V3(0, 0.05, 0)), col, { r: 2, life: 0.6 });
    for (const t of targets) {
      const te = this.ent(t); if (!te || t === src) continue;
      const to = this.hitPoint(t);
      for (let i = 0; i < 20; i++) this.p.emit(tip.clone().lerp(to, i / 20), V3(0, 0.5, 0), hdr(col, 2.5), { life: 0.5 + i * 0.02, size: 0.12 });
    }
    await GFX.delay(0.25);
    this.tweenPose(e.model, POSES.ready, 0.3).then(() => { e.model.group.rotation.y = Math.PI; });
  }

  // ---------- 被弾・撃破 ----------
  hit(t, elem, big, crit) {
    const e = this.ent(t); if (!e) return;
    const col = ELEMENTS[elem].color, p = this.hitPoint(t);
    // 味方が受けるときは、光をひかえめに（敵の技の動きが見えるように）。hitGlow：技の線や光を見せたい技が、そのあいだだけ弱める
    const k = e.ally ? 0.45 : this.hitGlow, sz = e.ally ? 0.6 : 0.4 + 0.6 * k;
    this.fx.sprite(p, col, (big ? 2.6 : 1.5) * sz, 0.3, { k: 4 * k });
    this.fx.sprite(p, '#ffffff', (big ? 1.2 : 0.7) * sz, 0.15, { k: 4 * k });
    if (!e.ally) this.fx.ring(p, col, { r: big ? 1.6 : 1.0, life: 0.35, face: this.camera.position, width: 0.1, k: 3 * k });
    this.p.burst(p, col, big ? 50 : 24, { speed: big ? 7 : 4.5, life: 0.5, size: 0.09, drag: 4 });
    if (crit) this.p.burst(p, '#ffe066', 30, { speed: 8, life: 0.6, size: 0.07, drag: 4 });
    e.model.flash(e.ally ? '#ff3040' : '#ffffff', e.ally ? 1.2 : 1.6 * Math.max(0.4, k));
    const g = e.model.group, home = e.home.clone();
    const dir = e.ally ? 1 : -1;
    if (!this.lastAttack || this.lastAttack.src !== t) {
      GFX.tween(0.22, k => { g.position.z = home.z + dir * Math.sin(k * Math.PI) * (big ? 0.35 : 0.18); });
    }
    if (e.ally && !t.frozen) { const m = e.model; this.tweenPose(m, POSES.hurt, 0.08).then(() => GFX.delay(0.15)).then(() => t.alive && this.tweenPose(m, POSES.ready, 0.3)); }
    GFX.shake(big ? 0.12 : 0.05);
  }
  breakFx(t, elem) {
    const e = this.ent(t); if (!e) return;
    const col = ELEMENTS[elem].color, p = this.hitPoint(t);
    GFX.slowmo(0.25, 0.55);
    GFX.flash('#ffffff', 0.45, 0.35);
    GFX.shake(0.35);
    this.fx.shards(p, col, 22, 6);
    this.fx.ring(e.home.clone().add(V3(0, 0.05, 0)), col, { r: e.model.radius * 4, life: 0.8, width: 0.25 });
    this.fx.ring(p, '#ffffff', { r: 3, life: 0.5, face: this.camera.position, width: 0.05 });
    this.fx.sprite(p, col, 5, 0.6, { k: 3 });
    this.p.burst(p, col, 90, { speed: 10, life: 0.9, size: 0.1, drag: 3 });
  }
  dotFx(t, elem) {
    const e = this.ent(t); if (!e) return;
    const p = this.hitPoint(t);
    this.p.burst(p, ELEMENTS[elem].color, 26, { speed: 2, up: 2, life: 0.8, size: 0.12 });
    e.model.flash(ELEMENTS[elem].color, 0.8);
  }
  healFx(t) {
    const e = this.ent(t); if (!e) return;
    const h = e.model.group.position;
    this.fx.ring(h.clone().add(V3(0, 0.05, 0)), '#6dff9e', { r: 1.4, life: 0.8 });
    for (let i = 0; i < 40; i++) this.p.emit(V3(h.x + (Math.random() - 0.5) * 1.1, h.y + Math.random() * 0.4, h.z + (Math.random() - 0.5) * 1.1), V3(0, 1.5 + Math.random() * 1.5, 0), hdr('#6dff9e', 2.5), { life: 1.0, size: 0.1, drag: 1 });
    e.model.flash('#6dff9e', 0.8);
  }
  shieldFx(t) {
    const e = this.ent(t); if (!e) return;
    this.fx.ring(e.home.clone().add(V3(0, 0.05, 0)), '#8fe0ff', { r: 1.6, life: 0.7 });
    this.fx.sprite(this.hitPoint(t), '#8fe0ff', 2.4, 0.5, { k: 1.5 });
  }
  buffFx(t, good = true) {
    const e = this.ent(t); if (!e) return;
    const h = e.model.group.position, col = good ? '#ffd66b' : '#b36bff';
    for (let i = 0; i < 24; i++) this.p.emit(V3(h.x + (Math.random() - 0.5) * 1.2, h.y + (good ? 0.2 : e.model.height), h.z + (Math.random() - 0.5) * 1.2), V3(0, good ? 2 : -1.5, 0), hdr(col, 2.5), { life: 0.8, size: 0.09, drag: 1 });
  }
  deathFx(t) {
    const e = this.ent(t); if (!e) return;
    e.dying = true;
    const g = e.model.group, col = e.model.color;
    g.traverse(o => { if (o.userData.outline) o.visible = false; if (o.material && !o.userData.outline) { o.material = o.material.clone(); o.material.transparent = true; } });
    for (let i = 0; i < 80; i++) {
      const p = V3(g.position.x + (Math.random() - 0.5) * e.model.radius * 2, Math.random() * e.model.height, g.position.z + (Math.random() - 0.5) * e.model.radius);
      this.p.emit(p, V3((Math.random() - 0.5) * 0.5, 1 + Math.random() * 2.5, (Math.random() - 0.5) * 0.5), hdr(col, 3), { life: 1.2, size: 0.1, drag: 0.8 });
    }
    this.fx.ring(e.home.clone().add(V3(0, 0.05, 0)), col, { r: e.model.radius * 2.5, life: 0.6 });
    GFX.tween(0.5, k => {
      g.scale.setScalar((e.model.group.userData.s0 || 1) * (1 - k * 0.3));
      g.position.y = -k * 0.3;
      g.traverse(o => { if (o.material && o.material.transparent !== undefined && !o.userData.outline) o.material.opacity = 1 - k; });
    });
  }
  allyDown(u, instant) {
    const e = this.ent(u); if (!e) return;
    const m = e.model;
    this.tweenPose(m, POSES.down, instant ? 0 : 0.5);
    this.p.burst(this.hitPoint(u), '#ff4d6d', instant ? 0 : 30, { speed: 2, life: 0.8 });
  }
  // 戦闘不能から起きあがる（ねこ缶）
  allyUp(u) {
    const e = this.ent(u); if (!e) return;
    this.tweenPose(e.model, POSES.ready, 0.4);
    this.healFx(u);
  }
  // ボスの山場（形態変化ではない）：閃光と衝撃波だけの短い演出
  async turnFx(t) {
    const e = this.ent(t); if (!e) return;
    const col = e.model.color, h = e.home, core = this.hitPoint(t);
    GFX.flash(col, 0.6, 0.8); GFX.shake(0.4);
    this.fx.ring(h.clone().add(V3(0, 0.05, 0)), col, { r: 10, life: 1.2, width: 0.4 });
    this.fx.pillar(h, col, { h: 20, r: 2.2, life: 1.2 });
    this.p.burst(core, col, 150, { speed: 12, life: 1.4, size: 0.14 });
    e.model.flash('#ffffff', 2);
    await GFX.delay(0.9);
  }
  // 形態変化：番人に寄り、力を吸い込んでから解放する
  async phaseFx(t) {
    const e = this.ent(t); if (!e) return;
    const col = e.model.color, h = e.home, U = GFX.grade.uniforms, core = this.hitPoint(t), S = P2_STYLES[t.key];
    if (!S) return this.turnFx(t);
    this.sway = 0;
    for (const x of this.ents.values()) if (x.ally) x.model.group.visible = false;   // 寄りの画面に味方が入らないように
    // ① 画面が沈み、周囲の光が番人の核へ吸い込まれる
    this.cut(V3(h.x + 3.4, 0.8, h.z + 11.5), V3(h.x, core.y + 0.2, h.z), { fov: 34 });
    this.setCam(V3(h.x + 2.4, 1.0, h.z + 9.2), V3(h.x, core.y + 0.4, h.z), { speed: 1.2 });
    GFX.tween(0.35, k => { U.tint.value.setRGB(1 - S.tint[0] * k, 1 - S.tint[1] * k, 1 - S.tint[2] * k); U.desat.value = S.desat * k; }, Ease.out, true);
    Sfx.tone(S.tone[0], 1.2, 'sawtooth', 0.08, 40); Sfx.noise(1.1, 0.1, S.snow ? 1800 : 300);
    let pull = true;
    const suck = () => { if (!pull) return; for (let i = 0; i < 10; i++) { const a = Math.random() * Math.PI * 2, r = 4 + Math.random() * 4, p = core.clone().add(V3(Math.cos(a) * r, (Math.random() - 0.3) * 4, Math.sin(a) * r)); this.p.emit(p, core.clone().sub(p).multiplyScalar(2.2), hdr(Math.random() < 0.3 ? '#ffffff' : col, 3), { life: 0.45, size: 0.1, drag: 0 }); } requestAnimationFrame(suck); };
    suck();
    e.model.flash(S.charge, 1.5);
    if (S.bolts) for (let i = 0; i < 4; i++) GFX.delay(0.15 + i * 0.18).then(() => this.fx.bolt(core, core.clone().add(V3((Math.random() - 0.5) * 7, Math.random() * 3 - 2.5, (Math.random() - 0.5) * 5)), col, { life: 0.25, r: 0.03 }));
    await GFX.delay(1.0);
    pull = false;
    // ② 解放：閃光・幾重もの衝撃波・天を突く光柱・破片・稲妻
    U.tint.value.setRGB(1, 1, 1); U.desat.value = 0;
    this.unfocus();
    GFX.flash('#ffffff', 0.9, 0.5); GFX.flash(col, 0.5, 1.2); GFX.shake(0.8); GFX.slowmo(0.3, 0.9);
    e.p2go = true;
    Sfx.brk(); Sfx.slam(); Sfx.tone(S.tone[1], 1.4, 'sawtooth', 0.12, -30);
    this.cut(V3(h.x - 3.5, 2.2, h.z + 11), V3(h.x, core.y, h.z), { fov: 42, roll: 0.04 });
    this.setCam(V3(h.x - 2.2, 3.2, h.z + 13.5), V3(h.x, core.y + 0.5, h.z), { speed: 0.8 });
    for (let i = 0; i < 3; i++) GFX.delay(i * 0.12).then(() => this.fx.ring(h.clone().add(V3(0, 0.06, 0)), i === 1 ? '#ffffff' : col, { r: 11 + i * 3, life: 1.1, width: 0.5 - i * 0.1 }));
    this.fx.ring(core, col, { r: 6, life: 0.9, width: 0.35, face: this.camera.position });
    this.fx.pillar(h, col, { h: 36, r: 3, life: 1.6, k: 3 });
    this.fx.pillar(h, '#ffffff', { h: 36, r: 1.2, life: 0.9, k: 4 });
    this.fx.sprite(core, col, 14, 0.9, { k: 3, grow: 1.6 });
    this.fx.shards(core, col, 26, 11);
    this.p.burst(core, col, 220, { speed: 14, life: 1.6, size: 0.16 });
    if (S.bolts) for (let i = 0; i < 10; i++) this.fx.bolt(core, h.clone().add(V3((Math.random() - 0.5) * 16, Math.random() * 6, (Math.random() - 0.5) * 10)), i % 3 ? col : '#ffffff', { life: 0.35, r: 0.04 });
    e.model.flash('#ffffff', 2.4);
    if (this.set && this.set.hooks[S.hook]) this.set.hooks[S.hook]();
    await GFX.delay(1.2);
    this.roll = 0;
    this.wide();
  }
  // 第二形態のあいだ続く威圧感：足もとの魔法陣、赤黒い渦、稲妻、鼓動のような衝撃波、灼けた空気
  updatePhase2(e, dt, t) {
    const u = e.u, m = e.model, col = m.color, S = P2_STYLES[u.key];
    if (!e.p2 && !e.p2go) return;   // 形態変化の演出で「解放」されてから
    if (!e.p2) {
      const root = new THREE.Group(); this.scene.add(root);
      const g = new THREE.Group(); g.position.set(e.home.x, 0, e.home.z); g.renderOrder = OVER_PAINT; root.add(g);
      const addMat = (c, k, o) => new THREE.MeshBasicMaterial({ color: hdr(c, k), map: runeTex(), transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
      const big = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), addMat(col, 1.6, 0.85)); big.rotation.x = -Math.PI / 2; big.position.y = 0.05; g.add(big);
      const small = new THREE.Mesh(new THREE.PlaneGeometry(6.5, 6.5), addMat(S.sub, 1.4, 0.7)); small.rotation.x = -Math.PI / 2; small.position.y = 0.07; g.add(small);
      const halo = new THREE.Mesh(new THREE.PlaneGeometry(7.5, 7.5), addMat(col, 1.2, 0.35)); halo.position.y = m.height * 0.64 + 0.2; halo.position.z = -1.2; g.add(halo);
      const veil = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.6, 16, 32, 1, true), new THREE.MeshBasicMaterial({ color: hdr(col, 0.8), transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      veil.position.y = 8; g.add(veil);
      const dark = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: hdr(S.dark, 0.7 * (S.glow || 1)), blending: THREE.AdditiveBlending, depthWrite: false })); dark.scale.setScalar(9); dark.position.y = m.height * 0.64; g.add(dark);
      const crowns = [];
      const cm = new THREE.MeshStandardMaterial({ color: S.crown.color, emissive: S.crown.emissive || col, emissiveIntensity: S.crown.ei, metalness: 0.4, roughness: 0.2, flatShading: true, transparent: !!S.crown.opacity, opacity: S.crown.opacity || 1 });
      for (let i = 0; i < 9; i++) { const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.35, 0), cm); c.scale.y = 2.4; g.add(c); crowns.push({ c, a: i / 9 * Math.PI * 2, y: 1.2 + (i % 3) * 1.6 }); }
      const light = new THREE.PointLight(col, 26, 22, 1.4); light.position.y = m.height * 0.6; g.add(light);
      e.p2 = { g: root, body: g, big, small, halo, veil, dark, crowns, light, beat: 0, bolt: 0, scale0: m.group.userData.s0 || 1, fog0: this.scene.fog ? this.scene.fog.color.clone() : null, k: 0 };
      if (u.key === 'boss_core' && this.set && this.set.hooks.coreSurge) this.set.hooks.coreSurge();
    }
    const P = e.p2;
    if (!u.alive || e.dying) {
      P.k = Math.max(0, P.k - dt * 1.5);
      if (P.k <= 0) { this.scene.remove(P.g); disposeTree(P.g); if (P.fog0) this.scene.fog.color.copy(P.fog0); e.p2 = { dead: true }; return; }
    } else P.k = Math.min(1, P.k + dt * 1.2);
    const k = P.k, core = V3(e.home.x, m.group.position.y + m.height * 0.64, e.home.z);
    P.body.position.set(m.group.position.x, 0, m.group.position.z);
    P.big.rotation.z = t * 0.25; P.small.rotation.z = -t * 0.6; P.halo.rotation.z = t * 0.4;
    P.big.material.opacity = (0.65 + Math.sin(t * 3) * 0.2) * k; P.small.material.opacity = 0.7 * k; P.halo.material.opacity = (0.22 + Math.sin(t * 2.4) * 0.08) * k;
    const gl = S.glow || 1;   // 光の強さ（金の守護神は明るい色なので、白く飛ばないように弱める）
    P.veil.material.opacity = (0.08 + Math.sin(t * 5) * 0.03) * k * gl; P.veil.rotation.y = t * 0.5;
    P.dark.scale.setScalar((8 + Math.sin(t * 4.8) * 1.4) * k); P.dark.position.y = core.y;
    P.light.intensity = (22 + Math.sin(t * 13) * 5 + (Math.random() < 0.05 ? 20 : 0)) * k * gl;
    P.crowns.forEach((c, i) => { const a = c.a + t * 0.9; c.c.position.set(Math.cos(a) * 4.2, c.y + Math.sin(t * 2 + i) * 0.4, Math.sin(a) * 4.2); c.c.rotation.y = -a; c.c.scale.setScalar(k); c.c.scale.y = 2.4 * k; });
    m.group.scale.setScalar(P.scale0 * (1 + 0.12 * k));
    // 装甲の継ぎ目が赤黒く脈打つ
    if (u.alive && !u.charging) m.flash(S.pulse, (0.08 + Math.max(0, Math.sin(t * 4.8)) * 0.22) * gl);
    if (this.scene.fog && P.fog0) this.scene.fog.color.lerpColors(P.fog0, new THREE.Color(S.fog), 0.7 * k);
    if (!u.alive) return;
    // 赤黒い渦（らせんに昇る）
    for (let i = 0; i < 6; i++) {
      const a = Math.random() * Math.PI * 2, r = 2.6 + Math.random() * 1.4, y = Math.random() * 1.2;
      const sc = S.swirl, pc = Math.random() < 0.25 ? sc[0] : Math.random() < 0.5 ? (sc[1] || col) : sc[2];
      this.p.emit(V3(core.x + Math.cos(a) * r, y, core.z + Math.sin(a) * r), V3(-Math.sin(a) * (S.snow ? 6 : 3), 2.5 + Math.random() * 2.5, Math.cos(a) * (S.snow ? 6 : 3)), hdr(pc, 2.4), { life: 1.1, size: S.snow ? 0.13 : 0.09, drag: 0.6 });
    }
    if (S.snow) {
      // 吹雪：戦場全体を横なぐりの雪が吹き抜ける
      for (let i = 0; i < dt * 160; i++) this.p.emit(V3(-12 + Math.random() * 4, 0.3 + Math.random() * 6, (Math.random() - 0.5) * 16 - 1), V3(9 + Math.random() * 5, -1 - Math.random(), (Math.random() - 0.5) * 2), hdr(Math.random() < 0.5 ? '#ffffff' : '#bfeaff', 1.8), { life: 2.2, size: 0.1, drag: 0 });
    } else if (Math.random() < dt * 40) {
      // 灼けた空気：戦場全体に舞う火の粉
      this.p.emit(V3((Math.random() - 0.5) * 16, 0.1, (Math.random() - 0.5) * 12 - 1), V3((Math.random() - 0.5) * 0.4, 0.8 + Math.random(), 0), hdr(col, 1.8), { life: 2.6, size: 0.06, drag: 0 });
    }
    // 稲妻
    if (S.bolts && (P.bolt -= dt) <= 0) {
      P.bolt = 0.12 + Math.random() * 0.3;
      const to = Math.random() < 0.6 ? V3(core.x + (Math.random() - 0.5) * 9, 0.05, core.z + (Math.random() - 0.5) * 6) : core.clone().add(V3((Math.random() - 0.5) * 6, 2 + Math.random() * 3, (Math.random() - 0.5) * 4));
      this.fx.bolt(core, to, Math.random() < 0.3 ? '#ffffff' : col, { life: 0.18, r: 0.025 });
    }
    // 鼓動：一定の間隔で床を走る衝撃波
    if ((P.beat -= dt) <= 0) {
      P.beat = 2.4;
      this.fx.ring(V3(core.x, 0.06, core.z), col, { r: 13, life: 1.3, width: 0.22 });
      GFX.delay(0.22).then(() => this.fx.ring(V3(core.x, 0.06, core.z), S.sub, { r: 9, life: 1.0, width: 0.12 }));
      GFX.shake(0.07);
      Sfx.tone(S.tone[2], 0.4, 'sine', 0.14, -12); Sfx.tone(S.tone[2] - 4, 0.35, 'sine', 0.1, -10, 0.22);
    }
  }
  // 力をためる：ためる敵へ寄り、まわりの光が吸いこまれる（つぎの手番でカメラはもどる）
  chargeFx(t) {
    const e = this.ent(t); if (!e) return;
    const h = e.home, core = this.hitPoint(t), col = e.model.color, big = Math.max(e.model.height, 1.2);
    this.unfocus(); this.sway = 0.2;
    this.setCam(V3(h.x + 1.6, 1.0 + big * 0.35, h.z + 3.4 + big * 1.6), V3(h.x, core.y, h.z), { speed: 2.2 });
    e.model.flash('#ff3040', 1.5);
    if (e.model.critter) this.tweenPose(e.model.critter, POSES.cast, 0.25).then(() => GFX.delay(0.45)).then(() => { if (t.alive) this.tweenPose(e.model.critter, POSES.ready, 0.3); });
    this.every(0.7, 24, i => {
      const a = Math.random() * Math.PI * 2, r = 2 + Math.random() * 2, p = core.clone().add(V3(Math.cos(a) * r, (Math.random() - 0.4) * 2.4, Math.sin(a) * r * 0.6));
      this.p.emit(p, core.clone().sub(p).multiplyScalar(2.8), hdr(i % 3 ? col : '#ff3040', 3), { life: 0.35, size: 0.1, drag: 0 });
    });
    // 輪は、寄っている途中のカメラではなく、行き先へ向ける
    GFX.delay(0.55).then(() => { this.fx.ring(core, '#ff3040', { r: 2.2 + big * 0.5, life: 0.5, face: this.camPos.clone() }); this.fx.sprite(core, col, 2 + big, 0.4, { k: 2 }); });
  }

  // ---------- 必殺技の導入 ----------
  // 決めポーズ（キャラごとの ULT_POSES）：正面から寄って、光の柱・輪・渦巻く光
  async ultPose(u) {
    const e = this.ent(u); if (!e) return;
    const m = e.model, col = this.b.abColor(u, u.def.ult), h = e.home, up = ULT_POSES[u.key];
    GFX.grade.uniforms.desat.value = 0.3;
    m.group.rotation.y = 0;
    // 他の味方は一時的に隠す（カメラの邪魔になるため）
    this.focus(e);
    this.setCam(V3(h.x + 0.25, 0.95, h.z + 1.15), V3(h.x, 0.88, h.z), { snap: true });
    this.setCam(V3(h.x + 0.9, 0.75, h.z + 2.5), V3(h.x, 0.75, h.z), { speed: 1.8 });
    if (up && up.move) e.ultSway = { from: { ...m.pose }, to: up.pose, move: up.move, t: 0 };   // update で毎フレーム動かす
    else this.tweenPose(m, up ? up.pose : POSES.ult, 0.45);
    if (m.face && up) { e.ultFace = m.face.expr; m.face.set(up.face); }
    this.fx.pillar(h.clone().add(V3(0, 0, -1.2)), col, { h: 14, r: 0.7, life: 1.3, k: 1.2 });
    this.fx.ring(h.clone().add(V3(0, 0.05, 0)), col, { r: 3, life: 1.0 });
    m.flash(col, 0.45);
    await GFX.tween(1.15, t => {
      for (let i = 0; i < 4; i++) {
        const a = t * 20 + i * Math.PI / 2, r = 0.75 - t * 0.3;
        this.p.emit(V3(h.x + Math.cos(a) * r * 0.7, 0.15 + t * 1.2, h.z - 0.2 + Math.sin(a) * r * 0.5), V3(0, 0.9, 0), hdr(col, 2), { life: 0.45, size: 0.04 });
      }
    }, Ease.linear);
  }
  // 放つ：画面を光らせて、いつもの構えと引きのカメラへ
  ultRelease(u) {
    const e = this.ent(u); this.ultHold = null;
    GFX.grade.uniforms.desat.value = 0;
    if (!e) return;
    const col = this.b.abColor(u, u.def.ult);
    GFX.flash(col, 0.4, 0.3);
    this.p.burst(this.hitPoint(u), col, 30, { speed: 3, up: 1, life: 0.8 });
    this.unfocus();
    this.ultEnd(e);
    this.tweenPose(e.model, POSES.ready, 0.2);
    this.wide();
    return GFX.delay(0.3);
  }
  // 決めポーズの後片付け：敵のほうへ向きなおし、表情を戻す
  ultEnd(e) {
    e.ultSway = null; e.model.pose.headZ = 0;
    e.model.group.rotation.y = Math.PI;
    if (e.model.face && e.ultFace) { e.model.face.set(e.ultFace); e.ultFace = null; }
  }
  // 動きのある決めポーズ：0.45 秒でポーズへ寄せながら、ULT_MOVES の揺れを足しつづける
  ultSwayStep(e, dt) {
    const s = e.ultSway, m = e.model; s.t += dt;
    const w = Ease.inOut(Math.min(1, s.t / 0.45)), off = ULT_MOVES[s.move](s.t, w);
    for (const k of POSE_KEYS) m.pose[k] = lerp(s.from[k] || 0, s.to[k] || 0, w) + (off[k] || 0);
    m.pose.headZ = off.headZ || 0;
    if (off.sparkle && m.group.visible && m.tipPos) this.p.emit(m.tipPos(), V3(0, 0.15, 0), hdr(this.b.abColor(e.u, e.u.def.ult), 2.8), { life: 0.45, size: 0.05 });
  }
  // オート：ポーズしてそのまま放つ
  async ultIntro(u) { await this.ultPose(u); this.ultRelease(u); }
  // 発動を選ぶまで：決めポーズのあと、ふだんの技選択と同じ肩越し視点へ。まわりにオーラを出しつづける（update）
  async ultReady(u) {
    const e = this.ent(u); if (!e) return;
    await this.ultPose(u);
    this.ultHold = u;
    GFX.grade.uniforms.desat.value = 0;
    this.face(e, this.enemyCenter()); this.shoulder(e);
  }

  // ============================================================
  //  必殺技の対象選択（肩越し視点）
  // ============================================================
  // dur 秒のあいだに n 回、等間隔で fn を呼ぶ（フレームレートに依存しない）
  every(dur, n, fn) {
    let i = 0;
    return GFX.tween(dur, (_, p) => { const k = Math.floor(p * n); while (i < k) fn(i++); }, Ease.linear);
  }
  ui(kind, u) { if (this.b.ultUi) this.b.ultUi(kind, u); }
  headPos(e) { e.model.group.updateMatrixWorld(true); return e.model.headPivot.getWorldPosition(V3()); }
  ultCancel(u) {
    const e = this.ent(u); this.ultHold = null;
    GFX.grade.uniforms.desat.value = 0;
    if (!e) return;
    this.ultEnd(e);
    this.tweenPose(e.model, POSES.ready, 0.3);
    this.wide();
  }

  // ---------- にゃんこファンタジーの演出 ----------
  // 味方にどうぐを使う：前から映し、どうぐを頭の上にかかげて見せてから、相手へぽーんと投げる。
  //   全体（かつおぶし）は、かかげたどうぐがはじけて、みんなへ一つずつ飛んでいく。届いたところで効果（回復など）が出る
  async itemFx(u, it, targets) {
    const e = this.ent(u); if (!e) return;
    const m = e.model, h = e.home, col = it.col || '#ffe9a8';
    const ts = targets.map(t => this.ent(t)).filter(Boolean);
    this.unfocus(); this.sway = 0; this.recall(u);
    // カメラ：使う子と相手がおさまるように、敵がわから（とちゅうで仲間の体を通らないよう snap）
    const xs = [h.x, ...ts.map(x => x.home.x)], lo = Math.min(...xs), hi = Math.max(...xs), cx = (lo + hi) / 2;
    this.setFov(38); this.roll = 0;
    this.setCam(V3(cx + 0.3, 1.35, h.z - Math.max(3.4, (hi - lo) * 0.85 + 2.4)), V3(cx, 0.95, h.z), { snap: true });
    m.group.rotation.y = Math.PI;
    const was = m.face && m.face.expr;
    if (m.face) m.face.set('joy');
    // かかげる
    const top = () => V3(m.group.position.x, m.group.position.y + m.height + 0.38, m.group.position.z);
    const icon = this.itemSprite(it.icon, 0.72);
    this.fx.add(icon, 0.75, (k, o) => { o.position.copy(top()); o.position.y += Math.sin(k * Math.PI * 2) * 0.03; o.scale.setScalar(0.72 * (k < 0.2 ? Ease.out(k / 0.2) * 1.15 : 1.15 - Math.min(1, (k - 0.2) / 0.15) * 0.15)); });
    this.tweenPose(m, POSES.hurrah, 0.18);
    Sfx.item();
    await GFX.delay(0.12);
    this.fx.ring(top(), '#ffffff', { r: 0.42, life: 0.35, face: this.camera.position, width: 0.06, k: 1.5 });
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; this.p.emit(top(), V3(Math.cos(a) * 1.6, Math.sin(a) * 1.6, 0.4), hdr(col, 2.2), { life: 0.5, size: 0.09, drag: 3 }); }
    await GFX.delay(0.6);
    // 投げる（自分に使うときは、そのまま胸へ下ろす）
    Sfx.toss();
    this.tweenPose(m, ts.length === 1 && ts[0] === e ? POSES.hugPillow : { ...POSES.cheer, armLz: 0.9, armRz: -0.9 }, 0.15);
    const from = top();
    await Promise.all(ts.map((te, i) => {
      const to = this.hitPoint(te.u), self = te === e, dur = self ? 0.3 : 0.42 + Math.abs(te.home.x - h.x) * 0.04;
      const s = this.itemSprite(it.icon, ts.length > 1 ? 0.45 : 0.72);
      const s0 = s.scale.x, peak = self ? 0 : 0.5;
      return new Promise(res => this.fx.add(s, dur + 0.15, (k, o) => {
        const t = Math.min(1, k * (dur + 0.15) / dur);
        o.position.lerpVectors(from, to, t); o.position.y += Math.sin(t * Math.PI) * peak;
        o.material.rotation = self ? 0 : -Math.sign(te.home.x - h.x || 1) * t * Math.PI * 2;
        o.scale.setScalar(s0 * (t < 1 ? 1 : 1 - (k * (dur + 0.15) - dur) / 0.15));
        if (t >= 1 && !o.userData.hit) { o.userData.hit = true; this.itemLand(te, col); res(); }
        if (k >= 1 && !o.userData.hit) res();
      }));
    }));
    await GFX.delay(0.1);
    this.tweenPose(m, POSES.ready, 0.3);
    if (m.face) GFX.delay(0.5).then(() => m.face.set(was || 'neutral'));
  }
  // どうぐが相手に届いた：その色の粒がはじけて、相手がぴかっと光る
  itemLand(te, col) {
    const p = this.hitPoint(te.u);
    this.p.burst(p, col, 26, { speed: 3, up: 1, life: 0.6, size: 0.1 });
    this.fx.ring(p, col, { r: 0.8, life: 0.4, face: this.camera.position, width: 0.1, k: 2 });
    te.model.flash(col, 0.4);
  }
  // どうぐの絵文字を、地面や体にかくれない板にする（光らせない。明るい草原でも見えるように白いふちどり）
  itemSprite(icon, size) {
    const key = 'item' + icon;
    if (!TexCache[key]) {
      const c = document.createElement('canvas'); c.width = c.height = 128;
      const g = c.getContext('2d'); g.font = '84px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.shadowColor = 'rgba(255,255,255,1)'; g.shadowBlur = 10;
      for (let i = 0; i < 3; i++) g.fillText(icon, 64, 70);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; TexCache[key] = t;
    }
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: TexCache[key], transparent: true, depthTest: false, depthWrite: false, toneMapped: false }));
    sp.scale.setScalar(size); sp.renderOrder = 12; return sp;
  }
  // またたびの実：相手のまわりを、ピンクの粒がくるくるのぼる（必殺技ゲージがたまる）
  energyFx(t) {
    const e = this.ent(t); if (!e) return;
    const g = e.model.group.position, r = (e.model.radius || 0.5) + 0.25;
    for (let i = 0; i < 30; i++) GFX.delay(i * 0.02).then(() => { const a = i * 0.7; this.p.emit(V3(g.x + Math.cos(a) * r, g.y + 0.1 + i * 0.035, g.z + Math.sin(a) * r), V3(-Math.sin(a) * 0.8, 1.2, Math.cos(a) * 0.8), hdr('#ff8ad8', 2.4), { life: 0.8, size: 0.11, drag: 1 }); });
    this.fx.ring(e.home.clone().add(V3(0, 0.05, 0)), '#ff8ad8', { r: 1.3, life: 0.7 });
    e.model.flash('#ffb8e8', 0.8);
    if (e.model.face) { const was = e.model.face.expr; e.model.face.set('joy'); GFX.delay(0.9).then(() => e.model.face.set(was || 'neutral')); }
  }
  // 猫じゃらし（棒の先にふさふさ）。o の原点が持ち手
  jarashiModel() {
    const g = new THREE.Group();
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.8, 6), toon('#c8a060')); stick.position.y = 0.4; g.add(stick);
    const tuft = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), toon('#fff0a8')); tuft.scale.set(0.6, 1.4, 0.6); tuft.position.y = 0.85; g.add(tuft);
    return g;
  }
  // 敵にどうぐを使う（猫じゃらし）：敵のほうを向いて、手に持った猫じゃらしを振る
  async teaseFx(u, t) {
    const e = this.ent(u), te = this.ent(t); if (!e || !te) return;
    // 肩越しの攻撃と同じく、ほかの味方はかくして切りかえる（仲間の体ごしに映すと、敵が帽子などでかくれる）
    this.focus(e); this.sway = 0.2;
    const m = e.model;
    this.face(e, te.home);
    if (m.face) m.face.set('smile');
    this.setCam(V3(e.home.x + 1.6, 1.3, e.home.z + 2.2), V3((e.home.x + te.home.x) / 2, 0.9, (e.home.z + te.home.z) / 2), { snap: true });
    const wave = { ...POSES.idle, armRx: -2.4, armRz: -0.75, elbowR: -0.9 };
    // 手に持たせる（ふだんの武器はしまう）。振りおわるまで手について、左右にゆれる
    const hold = m.extras && m.extras.hold, wasVis = hold && hold.visible;
    if (hold) hold.visible = false;
    const j = this.jarashiModel();
    const dir = V3(te.home.x - e.home.x, 0, te.home.z - e.home.z).normalize();
    this.fx.add(j, 1.3, (k, o) => {
      o.position.copy(m.handPos());
      o.rotation.set(0, Math.atan2(dir.x, dir.z), 0);
      o.rotateX(0.35 + Math.sin(k * 26) * 0.5);
      if (k >= 1 && hold) hold.visible = wasVis;
    });
    await this.tweenPose(m, wave, 0.2);
    Sfx.toss();
    for (let i = 0; i < 3; i++) this.fx.sprite(this.hitPoint(u).add(V3(0.2 + i * 0.25, 0.5 + i * 0.15, -0.3 - i * 0.4)), '#fff4c8', 0.3 + i * 0.1, 0.8, { k: 2 });
    await GFX.delay(0.35);
    te.model.flash('#ffe8f0', 0.8);
    this.fx.ring(this.hitPoint(t), '#ffb8d8', { r: 1.2, life: 0.6, face: this.camera.position });
  }
  // 猫じゃらしに夢中（マオウ）
  lureFx(t) {
    const te = this.ent(t); if (!te) return;
    const p = this.hitPoint(t).add(V3(0.6, -0.2, 0.8));
    const g = this.jarashiModel(); g.position.copy(p);
    this.fx.add(g, 2.2, (k, o) => { o.rotation.z = Math.sin(k * 30) * 0.6; o.position.x = p.x + Math.sin(k * 20) * 0.3; });
    for (let i = 0; i < 12; i++) GFX.delay(i * 0.12).then(() => this.p.emit(this.hitPoint(t).add(V3(0, 0.8, 0)), V3((Math.random() - 0.5), 1.2, 0), hdr('#ff8ab8', 2.4), { life: 0.9, size: 0.14 }));
  }
  // おひるね（タマ）：丸くなって Zzz
  napFx(u) {
    const e = this.ent(u); if (!e) return;
    const m = e.model.critter || e.model;   // 敵（四天王など）は、骨組みの猫のモデルを動かす
    if (m.face) m.face.set('sleepy');
    this.tweenPose(m, POSES.sleep, 0.4);
    const h = this.hitPoint(u);
    for (let i = 0; i < 3; i++) GFX.delay(i * 0.3).then(() => { const z = this.zSprite(); z.position.copy(h).add(V3(0.2, 0.4, 0)); this.fx.add(z, 1.4, (k, o) => { o.position.y += 0.012; o.position.x += Math.sin(k * 8) * 0.004; o.material.opacity = 1 - k; }); });
    GFX.delay(1.2).then(() => { if (u.alive) { this.tweenPose(m, POSES.ready, 0.3); if (m.face) m.face.set('neutral'); } });
  }
  zSprite() {
    if (!TexCache.zzz) { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); g.font = '800 48px sans-serif'; g.fillStyle = '#ffffff'; g.strokeStyle = '#6a8aff'; g.lineWidth = 6; g.textAlign = 'center'; g.textBaseline = 'middle'; g.strokeText('Z', 32, 34); g.fillText('Z', 32, 34); TexCache.zzz = new THREE.CanvasTexture(c); }
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: TexCache.zzz, transparent: true, depthWrite: false })); sp.scale.setScalar(0.3); sp.renderOrder = OVER_PAINT; return sp;
  }
  // コンボ：ふたり（みんな）が並んで光る
  async comboIntro(mem, c) {
    const es = mem.map(u => this.ent(u)).filter(Boolean); if (!es.length) return;
    this.unfocus(); this.sway = 0;
    const cx = es.reduce((a, e) => a + e.home.x, 0) / es.length;
    this.setCam(V3(cx + 0.4, 1.0, 5.4), V3(cx, 0.7, 2.6), { snap: true });
    this.setCam(V3(cx + 0.9, 0.9, 4.6), V3(cx, 0.75, 2.6), { speed: 1.5 });
    es.forEach((e, i) => { e.model.group.rotation.y = 0; if (e.model.face) e.model.face.set('joy'); GFX.delay(i * 0.08).then(() => this.tweenPose(e.model, POSES.ult, 0.35)); e.model.flash(e.u.color, 0.5); this.fx.pillar(e.home, e.u.color, { h: 6, r: 0.55, life: 1.1, k: 0.45 }); });
    if (es.length > 1) for (let i = 0; i < es.length - 1; i++) this.fx.beam(this.hitPoint(es[i].u), this.hitPoint(es[i + 1].u), '#ffcf4a', { life: 1.0, r: 0.03 });
    this.p.burst(V3(cx, 0.8, 2.6), '#ffcf4a', 80, { speed: 4, life: 1.2, size: 0.08, up: 0.8 });
    GFX.flash('#fff4c8', 0.2, 0.4);
    await GFX.delay(1.2);
    es.forEach(e => { e.model.group.rotation.y = Math.PI; this.tweenPose(e.model, POSES.ready, 0.2); });
    this.wide();
  }
  // にゃんこオールスターズ：台詞のあいだ、みんなで顔を見合わせ（allStarsLine）、
  // 「ずっと仲間だ！」で手をあげる。世界中の猫の光がみんなの手もとへ集まり、虹の光になって敵を貫く
  allStarsLine(mem, i) {
    const es = mem.map(u => this.ent(u)).filter(e => e && e.u.alive); if (!es.length) return;
    const cx = es.reduce((a, e) => a + e.home.x, 0) / es.length, z = es[0].home.z;
    this.unfocus(); this.sway = 0.2;
    if (i === 0) {
      // 敵とのあいだは狭いので、引かずに画角を広げて、みんなを入れる
      this.setFov(52);
      this.setCam(V3(cx + 0.3, 1.0, z - 3.6), V3(cx, 0.75, z), { snap: true });
      this.setCam(V3(cx + 0.5, 1.1, z - 3.2), V3(cx, 0.75, z), { speed: 0.6 });
      // となりの子のほうを向いて、うなずきあう
      es.forEach(e => { e.model.group.rotation.y = Math.PI + (e.home.x < cx ? -0.5 : e.home.x > cx ? 0.5 : 0); if (e.model.face) e.model.face.set('gentle'); this.tweenPose(e.model, POSES.ready, 0.3); });
    } else {
      es.forEach((e, j) => { e.model.group.rotation.y = Math.PI; if (e.model.face) e.model.face.set('joy'); GFX.delay(j * 0.07).then(() => { this.tweenPose(e.model, POSES.hurrah, 0.18); GFX.tween(0.3, k => { e.model.group.position.y = Math.sin(k * Math.PI) * 0.22; }); }); });
      this.p.burst(V3(cx, 1.4, z), '#fff4c8', 50, { speed: 3, up: 1, life: 1.0, size: 0.08 });
    }
  }
  async allStarsFx(mem) {
    const c = this.enemyCenter(), es = mem.map(u => this.ent(u)).filter(e => e && e.u.alive);
    const cx = es.length ? es.reduce((a, e) => a + e.home.x, 0) / es.length : 0, z = es.length ? es[0].home.z : 2.6;
    const gather = V3(cx, 2.0, z - 0.3);   // みんなの手の上
    this.unfocus(); this.setFov(38);
    this.setCam(V3(cx + 1.0, 1.4, z + 5.0), V3(cx, 1.6, z - 1.5), { snap: true });
    this.setCam(V3(cx + 0.8, 1.7, z + 5.6), V3((cx + c.x) / 2, 1.6, (z + c.z) / 2), { speed: 0.8 });
    const cols = ['#ff6a8a', '#ffb84a', '#ffe84a', '#6aff8a', '#6ad8ff', '#8a6aff', '#ff8ad8'];
    const orb = this.fx.sprite(gather, '#ffffff', 0.4, 1.6, { k: 3, grow: 1 });
    await this.every(1.4, 40, i => {
      const a = Math.random() * Math.PI * 2, r = 14 + Math.random() * 8, from = V3(Math.cos(a) * r, 6 + Math.random() * 6, Math.sin(a) * r - 3);
      this.fx.projectile(from, gather, cols[i % 7], { dur: 0.6, size: 0.6, arc: 1.5 });
      orb.scale.setScalar(0.4 + i * 0.05);
      for (const e of es) { const p = this.hitPoint(e.u).add(V3(0, 0.3, 0)); this.p.emit(p, gather.clone().sub(p).multiplyScalar(1.6), hdr(cols[i % 7], 2.5), { life: 0.55, size: 0.1, drag: 0 }); }
    });
    // 虹の光が敵へ
    const to = c.clone().add(V3(0, 1.5, 0));
    cols.forEach((col, i) => GFX.delay(i * 0.03).then(() => this.fx.beam(gather, to, col, { life: 0.8, r: 0.5 - i * 0.05 })));
    await GFX.delay(0.15);
    GFX.flash('#ffffff', 0.9, 0.8); GFX.shake(0.6); GFX.slowmo(0.35, 0.8);
    cols.forEach((col, i) => GFX.delay(i * 0.05).then(() => this.fx.pillar(c, col, { h: 30, r: 1.2 + i * 0.25, life: 1.4, k: 2 })));
    this.fx.ring(c.clone().add(V3(0, 0.1, 0)), '#ffffff', { r: 16, life: 1.2, width: 0.4 });
    this.p.burst(c.clone().add(V3(0, 2, 0)), '#ffffff', 220, { speed: 14, life: 1.8, size: 0.14 });
    Sfx.slam(); Sfx.win();
    await GFX.delay(0.9);
    es.forEach(e => { e.model.group.rotation.y = Math.PI; this.tweenPose(e.model, POSES.ready, 0.3); if (e.model.face) e.model.face.set('neutral'); });
  }
  // 世界中の猫の声が届く（光の粒が空から降りてくる）。tip：声が伝ってくる根（世界の果ての hooks.rootVoice）、strong：村で重ねた声
  voiceFx(tip, strong) {
    if (tip && this.set && this.set.hooks.rootVoice) this.set.hooks.rootVoice(tip, strong);
    const cols = ['#ffe08a', '#ff9ab8', '#8ad8ff', '#b8ff8a'];
    for (let i = 0; i < 30; i++) this.p.emit(V3((Math.random() - 0.5) * 16, 8 + Math.random() * 4, (Math.random() - 0.5) * 8 + 1), V3(0, -3 - Math.random() * 2, 0), hdr(pick(cols), 2.4), { life: 2.2, size: 0.14, drag: 0.4 });
    for (const e of this.ents.values()) if (e.ally && e.u.alive) e.model.flash('#fff4c8', 0.6);
  }

  // ---------- 敵の攻撃 ----------
  async enemyAttack(src, targets, mv) {
    const e = this.ent(src); if (!e) return;
    const col = e.model.color, tEnts = targets.map(t => this.ent(t)).filter(Boolean);
    if (!tEnts.length) return;
    this.unfocus(); this.sway = 0.2;
    const ranged = ['drone', 'spirit', 'boss', 'empress', 'dragon', 'deity', 'wraith'].includes(src.def.shape);
    const aoe = mv.type === 'aoe';
    const camPos = V3(e.home.x * 0.3 + 3.2, 2.4, 7.2), camLook = V3(e.home.x * 0.5, 1.5, (e.home.z + 3) / 2);
    this.setCam(camPos, camLook, { speed: 4 });
    // 技ごとのモーション（js/gfx/foe-moves.js）
    const fm = FOE_MOVES[mv.anim];
    if (fm) {
      const c = { col: mv.elem ? ELEMENTS[mv.elem].color : col, mv };
      if (BIG_FOE_MOVES.has(mv)) { await this.bigWindup(e, c.col); this.setCam(camPos, camLook, { snap: true }); }   // ためて撃つ大技
      this.attackerCam(e, tEnts, mv.anim);
      await fm.call(this, e, tEnts, c); return;
    }
    e.model.flash(col, 1.2);
    this.fx.sprite(this.hitPoint(src), col, 2.5, 0.5, { k: 2 });
    await GFX.delay(0.25);
    if (aoe) {
      const p = this.hitPoint(src);
      this.fx.ring(e.home.clone().add(V3(0, 0.1, 0)), col, { r: 11, life: 0.7, width: 0.5 });
      this.p.burst(p, col, 100, { speed: 12, life: 0.7, size: 0.14 });
      GFX.flash(col, 0.25, 0.3);
      await GFX.delay(0.3);
    } else if (ranged) {
      await Promise.all(tEnts.map(t => this.fx.projectile(this.hitPoint(src), this.hitPoint(t.u), col, { dur: 0.3, size: 0.9, arc: 0.4 })));
    } else {
      const main = tEnts[0], g = e.model.group;
      this.lastEnemy = { src, from: g.position.clone() };
      const dest = main.home.clone().add(V3(0, 0, -(e.model.radius + 0.9)));
      await GFX.tween(0.28, t => { g.position.lerpVectors(this.lastEnemy.from, dest, Ease.in(t)); g.position.y = Math.sin(t * Math.PI) * 0.3; });
      for (const t of tEnts) this.fx.slash(this.hitPoint(t.u), col, { cam: this.camera, size: 2.2 });
    }
  }
  async enemyAttackEnd(src) {
    const e = this.ent(src);
    if (e && this.lastEnemy && this.lastEnemy.src === src) {
      const g = e.model.group, from = g.position.clone(), r0 = g.rotation.y;
      await GFX.tween(0.3, t => { g.position.lerpVectors(from, e.home, t); g.rotation.y = lerp(r0, 0, t); });
    }
    if (e) {
      const g = e.model.group; g.rotation.set(0, 0, 0); if (!this.lastEnemy || this.lastEnemy.src !== src) g.position.y = 0;
      if (e.model.critter && src.alive) this.tweenPose(e.model.critter, POSES.ready, 0.25);
    }
    this.lastEnemy = null;
    this.unfocus();
    this.wide();
  }

  victory() {
    this.unfocus();
    const al = [...this.ents.values()].filter(e => e.ally && e.u.alive);
    // 敵のいた側から、こちらを向いた一行を撮る（勝利画面の上下の帯にかからないよう、少し引いて）
    al.forEach((e, i) => { e.model.group.rotation.y = Math.PI; if (e.model.face) e.model.face.set('joy'); GFX.delay(i * 0.1).then(() => this.tweenPose(e.model, i % 2 ? POSES.victory : POSES.ult, 0.5)); });
    this.setCam(V3(0.5, 1.15, -2.2), V3(0, 0.75, 2.6), { speed: 1.6 });
    for (const e of al) this.p.burst(this.hitPoint(e.u), '#ffd66b', 40, { speed: 3, up: 1, life: 1.5 });
  }

  // ---------- 毎フレーム ----------
  update(dt, t, rdt) {
    // 手持ちカメラのような揺れ（肩越し視点で強め）とロール
    this.camera.position.sub(this.swayOff);
    super.update(dt, t);
    this.swayOff.set(Math.sin(t * 0.53) * 0.06, Math.sin(t * 0.41 + 1.3) * 0.035, Math.sin(t * 0.31) * 0.04).multiplyScalar(this.sway);
    this.camera.position.add(this.swayOff);
    if (this.roll) this.camera.rotateZ(this.roll);
    this.updateCutaway(rdt || dt);
    const cam = this.camera, v = V3();
    const b = this.b;
    if (this.set) this.set.update(dt, t);
    for (const e of this.ents.values()) {
      const u = e.u, m = e.model;
      if (e.ultSway) this.ultSwayStep(e, dt);
      // 凍結中は、そのキャラの時計を止める（息づかい・しっぽ・耳・ゆらゆらが止まって、氷づけに見える）
      m.still = !!(u.frozen && u.alive);
      if (m.still) e.tStop = (e.tStop || 0) + dt;
      m.update(dt, t - (e.tStop || 0));
      if (!e.ally && P2_STYLES[u.key] && u.phase >= 1 && !(e.p2 && e.p2.dead)) this.updatePhase2(e, dt, t);
      // 状態の可視化
      if (!e.ally) {
        m.brokenAmt += ((u.broken ? 1 : 0) - m.brokenAmt) * Math.min(1, dt * 6);
        if (m.emit && !e.dying) m.emit(this.p, m.group.position);
        if (u.charging && Math.random() < dt * 40) this.p.emit(V3(m.group.position.x + (Math.random() - 0.5) * m.radius * 2, Math.random() * m.height, m.group.position.z + (Math.random() - 0.5) * m.radius), V3(0, 2, 0), hdr('#ff3040', 3), { life: 0.6, size: 0.14 });
        if (u.charging) m.flash('#ff2030', 0.3 + Math.sin(t * 10) * 0.2);
      }
      if (u.dots && u.dots.length && Math.random() < dt * 8 && u.alive) {
        const d = u.dots[Math.floor(Math.random() * u.dots.length)];
        const hp = m.group.position;
        this.p.emit(V3(hp.x + (Math.random() - 0.5) * m.radius, Math.random() * m.height, hp.z + (Math.random() - 0.5) * m.radius * 0.6), V3(0, 1.2, 0), hdr(ELEMENTS[d.elem].color, 2.5), { life: 0.7, size: 0.1 });
      }
      // 凍結
      if (u.frozen && u.alive && !e.ice) {
        e.ice = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: '#bfefff', emissive: '#4ab8ff', emissiveIntensity: 0.6, transparent: true, opacity: 0.45, roughness: 0.05, metalness: 0.2, flatShading: true, depthWrite: false }));
        e.ice.scale.set(m.radius * 1.2, m.height * 0.6, m.radius * 1.0); e.ice.renderOrder = OVER_PAINT; this.scene.add(e.ice);
        this.fx.shards(this.hitPoint(u), '#9fe6ff', 10, 3);
      }
      if (e.ice) {
        e.ice.position.set(m.group.position.x, m.height * 0.5, m.group.position.z);
        e.ice.visible = m.group.visible;   // キャラを隠したカットでは氷も隠す
        if (!u.frozen || !u.alive) { this.fx.shards(e.ice.position, '#9fe6ff', 16, 4); this.scene.remove(e.ice); disposeTree(e.ice); e.ice = null; }
      }
      // 必殺技の発動待ち：足もとから立ちのぼる光と、広がる輪
      if (this.ultHold === u && m.group.visible) {
        const col = this.b.abColor(u, u.def.ult), g = m.group.position;
        for (let n = Math.floor(dt * 70 + Math.random()); n > 0; n--) {
          const a = Math.random() * Math.PI * 2, r = 0.4 + Math.random() * 0.3;
          this.p.emit(V3(g.x + Math.cos(a) * r, 0.05 + Math.random() * 0.3, g.z + Math.sin(a) * r), V3(-Math.sin(a) * 0.4, 1.2 + Math.random() * 0.8, Math.cos(a) * 0.4), hdr(col, 2.6), { life: 0.9, size: 0.08 });
        }
        if ((e.auraT = (e.auraT || 0) - dt) <= 0) { e.auraT = 0.7; this.fx.ring(V3(g.x, 0.05, g.z), col, { r: 1.4, life: 0.7, width: 0.08 }); }
        m.flash(col, 0.15 + Math.sin(t * 6) * 0.1);
      }
      // シールド
      if (e.ally) {
        if (u.shield > 0 && u.alive && !e.bubble) {
          e.bubble = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), new THREE.ShaderMaterial({
            uniforms: { c: { value: hdr('#8fe0ff', 1.6) }, time: { value: 0 } },
            vertexShader: 'varying vec3 vN; varying vec3 vV; varying vec3 vP; void main(){ vN = normalize(normalMatrix*normal); vP = position; vec4 mv = modelViewMatrix*vec4(position,1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }',
            fragmentShader: 'uniform vec3 c; uniform float time; varying vec3 vN; varying vec3 vV; varying vec3 vP; void main(){ float f = pow(1.0 - abs(dot(vN, vV)), 2.5); float hex = step(0.92, fract(vP.y * 10.0 + time * 0.5)) * 0.3; gl_FragColor = vec4(c * (f + hex * f), 1.0); }',
            blending: THREE.AdditiveBlending, transparent: true, depthWrite: false,
          }));
          e.bubble.scale.set(0.62, 0.72, 0.62); e.bubble.renderOrder = OVER_PAINT; this.scene.add(e.bubble);
        }
        if (e.bubble) {
          e.bubble.position.set(m.group.position.x, 0.6, m.group.position.z);
          e.bubble.material.uniforms.time.value = t;
          e.bubble.visible = m.group.visible;   // キャラを隠したカットではシールドも隠す
          if (!(u.shield > 0) || !u.alive) { this.scene.remove(e.bubble); disposeTree(e.bubble); e.bubble = null; }
        }
      }
      // 対象マーカー
      const el = u.el;
      const tgt = el && el.classList.contains('tgt'), tgt2 = el && el.classList.contains('tgt2');
      const active = b.current === u && e.ally;
      const mk = e.mark;
      const want = !m.group.visible ? 0 : tgt ? 0.9 : tgt2 ? 0.45 : active ? 0.7 : 0;
      mk.material.opacity += (want - mk.material.opacity) * Math.min(1, dt * 10);
      mk.material.color.copy(hdr(e.ally && tgt ? '#6dff9e' : '#e8c77a', 3));
      mk.position.set(m.group.position.x, 0.03, m.group.position.z);
      mk.scale.setScalar(m.radius * 1.4 * (1 + Math.sin(t * 5) * 0.04));
      mk.rotation.z = t;
      // DOM オーバーレイの追従
      if (!e.ally && el && !e.dying) {
        v.copy(m.group.position); v.y = m.height * m.group.scale.y / (m.group.userData.s0 || 1) + 0.25; v.project(cam);
        const x = (v.x + 1) * 640, yTop = (1 - v.y) * 360;
        v.copy(m.group.position); v.y = 0; v.project(cam);
        const yBot = (1 - v.y) * 360;
        v.copy(m.group.position); v.x += m.radius; v.project(cam);
        const w = Math.abs((v.x + 1) * 640 - x) * 2;
        el.style.transform = `translate(${clamp(x, 90, 1190).toFixed(1)}px, ${clamp(yTop, 150, 640).toFixed(1)}px)`;
        // 当たりの枠のずれは .e-hit の top に直に書く（毎フレーム変わる値を el のカスタムプロパティにすると、
        //   transition のある HP の帯などのぶん Safari がメモリを手放さない）
        const hit = el.querySelector('.e-hit');
        if (hit) { hit.style.top = (yTop - clamp(yTop, 150, 640)).toFixed(1) + 'px'; hit.style.height = Math.max(40, yBot - yTop) + 'px'; hit.style.width = Math.max(60, w) + 'px'; }
      }
      if (e.ally && u.anchor) {
        v.copy(this.hitPoint(u)); v.y += 0.4; v.project(cam);
        u.anchor.style.transform = `translate(${((v.x + 1) * 640).toFixed(1)}px, ${((1 - v.y) * 360).toFixed(1)}px)`;
      }
    }
  }
}

// メニュー背景：ステージの風景をゆっくり周回（敵を並べることも可能）
// loc：{ zone, at, face }。区画を組み立てて、その場所を背景にする（戦闘の背景と同じ。at に立ち、face の向きを見る）。なければ章の景色（theme）だけ。
//   cam：{ pos: [右, 高さ, 前], look: [右, 高さ, 前], fov }（会話の舞台の shots と同じ向き）。カメラをそこに置いて、ゆっくりゆらす（なければ、まわりをゆっくり回る）。
//   loc.full：軽い戦闘用の背景ではなく、区画をまるごと組み立てる。loc.fog：もやの濃さの倍率。loc.bloom：光のにじみの強さ。loc.flags：区画の組み立ての印
class SceneryView extends BaseView {
  constructor(theme = 'meadow', { screenX = 640, screenY = 360, radius = 13, height = 3.2, close = false, loc = null, lookY = null, cam = null } = {}) {
    const L = loc && typeof resolveBattleSet === 'function' ? resolveBattleSet(loc) : null;
    super(L ? battleTheme(L, theme) : theme, 40, L ? { field: true, bare: true, zone: FIELD_ZONES[L.zone], turn: L.face * Math.PI / 180 } : {});
    if (L) buildBattleSet(this, L);
    if (L && L.fog != null && this.scene.fog) this.scene.fog.density *= L.fog;   // fog：もやの濃さの倍率（遠くの景色を見せるときにうすく）
    if (L && L.bloom != null) this.bloomStrength = L.bloom;                       // bloom：光のにじみ（光る物の多い景色で、白くとばないように）
    this.bloomStrength = 0.8;
    this.radius = radius; this.h = height; this.models = []; this.enemyKeys = ''; this.close = close; if (lookY != null) this.lookY = lookY;
    this.camera.setViewOffset(1280, 720, 640 - screenX, 360 - screenY, 1280, 720);
    if (cam) {
      const V = p => V3(p[0], p[1], -p[2]);
      this.fixedCam = { pos: V(cam.pos), look: V(cam.look) };
      if (cam.fov) { this.camera.fov = cam.fov; this.camera.updateProjectionMatrix(); }
      this.setCam(this.fixedCam.pos, this.fixedCam.look, { snap: true, speed: 2 }); return;
    }
    this.setCam(V3(0, height, radius), V3(0, 1.4, 0), { snap: true, speed: 2 });
  }
  setEnemies(keys) {
    const sig = keys.join();
    if (sig === this.enemyKeys) return;
    this.enemyKeys = sig;
    for (const m of this.models) { this.scene.remove(m.group); disposeTree(m.group); }
    this.models = keys.map(k => buildEnemy(k));
    const total = this.models.reduce((a, m) => a + m.radius * 2 + 1, 0);
    let x = -total / 2;
    for (const m of this.models) {
      x += m.radius + 0.5;
      m.group.position.set(x, 0, m.isBoss ? -2 : 0); x += m.radius + 0.5;
      this.scene.add(m.group);
      this.fx.ring(m.group.position.clone().add(V3(0, 0.05, 0)), m.color, { r: m.radius * 2, life: 0.8 });
    }
    const big = this.models.some(m => m.isBoss);
    const H = Math.max(1.5, ...this.models.map(m => m.height));
    this.lookY = big ? 2.6 : H * 0.5;
    if (this.close) { this.radius = Math.max(6, 4.6 * H, 1.8 * total); this.h = this.lookY + 0.8; }
    else this.radius = big ? 15 : 11;
  }
  update(dt, t, rdt) {
    const a = t * 0.06;
    const sw = this.close ? 0.15 : 0.5;
    if (this.fixedCam) { const F = this.fixedCam; this.camPos.set(F.pos.x + Math.sin(t * 0.15) * 0.4, F.pos.y + Math.sin(t * 0.2) * 0.12, F.pos.z); this.camLook.copy(F.look); }
    else { this.camPos.set(Math.sin(a) * this.radius * sw, this.h + Math.sin(t * 0.2) * 0.3, Math.cos(a * 0.7) * (this.close ? 0.5 : 2) + this.radius); this.camLook.set(0, this.lookY || 1.4, 0); }
    super.update(rdt, t);
    if (this.set) this.set.update(rdt, t);
    for (const m of this.models) { m.update(rdt, t); if (m.emit) m.emit(this.p, m.group.position); }
  }
}
