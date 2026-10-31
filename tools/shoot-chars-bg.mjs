// なかま画面の背景（子ごとの一枚絵）を、ヘッドレス Chrome で区画を組み立てて撮る（Node 22 以降：WebSocket が組みこみ）。
//   node tools/shoot-chars-bg.mjs                      … 全員を css/chars-bg/<子>.jpg に書き出す（場所は js/gfx/views.js の SHOWCASE_BG の spot）
//   node tools/shoot-chars-bg.mjs mike kuro            … その子だけ
//   node tools/shoot-chars-bg.mjs team                 … へんせい画面の背景（js/gfx/views.js の TEAM_BG）を css/team-bg.jpg に
//   node tools/shoot-chars-bg.mjs mike pokapoka 0 16 0 [night] [out.jpg]   … 場所を試す（区画 x z 向き [空] [出力]）
//   空を 'stars' にすると、夜にして空だけをぜいたくな星空に（区画の景色はそのまま）。
//   区画を '@stars' にすると、ゲームにはない、星空を映す水面（この絵だけのぜいたくな星空）
//   区画を '@camp' にすると、ゲームにはない、旅の一行の野営地（へんせい画面だけの景色。teamCamp）
// 先に `PORT=8937 node .claude/serve.js` を動かしておく（ほかのポートのサーバーを使うときは SERVE_PORT=ポート番号）。
//
// カメラは、なかま画面（ShowcaseView）と同じ SHOWCASE_CAM：子が立つ点の 4.4m うしろ・高さ 0.6m から、水平に子の 0.6m の高さを見る。
// fov 32、子は画面の 360px（左よせ）。だから、ゲームでは子がその景色の地面にそのまま立って見え、影も景色の地面に落ちる。
// 撮るときはトーンマッピングと周辺減光を切る（ゲームで背景に貼ったあと、子といっしょにもう一度かかるので、二重にしない）。
// 右は一覧の板でほぼかくれるので、左の 704px（55%。SHOWCASE_BG_W）だけを 1.5 倍で書き出す
// へんせい（team）は TEAM_CAM（画面のまん中から少し見下ろす）で、画面いっぱい（1280px）を書き出す
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const H = 720, SCALE = 1.5;

const args = process.argv.slice(2);
const tryJob = args.length >= 5 ? (([key, zone, x, z, yaw, ...rest]) => {
  const out = rest.find(a => a.endsWith('.jpg')), bg = rest.find(a => !a.endsWith('.jpg'));
  return { key, spot: [zone, +x, +z, +yaw, ...(bg ? [bg] : [])], out: out || `${key}-try.jpg` };
})(args) : null;
mkdirSync('css/chars-bg', { recursive: true });

// '@stars'：ゲームにはない、星空を映す水面（クロの「星空の下にひとり」）。一枚絵のためだけの景色。
//   このカメラは地平線から上 11° ほどしか写らないので、まわりを鏡のような水にして、空を下半分にも映す（空の球の下半分に、上下を返した空を描く）。
//   子は小さな草の島に立つ。星は大きさ・明るさ・色のちがう三段、天の川は写る範囲を斜めに横切るように、カメラの向きから決める
const STARRY = `window.starrySky = (v, P, F, water = true) => {
  // 水面のとき：遠景の丘・木・床をかくし、光と粒だけ残して、子の足もとに草の島
  if (water) v.env.root.traverse(o => { if (o.isMesh && !o.userData.sky) o.visible = false; });
  const isle = new THREE.Group(); isle.position.copy(P); if (water) v.scene.add(isle);
  const top = new THREE.Mesh(new THREE.CircleGeometry(1.3, 40), v.env.floor.material); top.rotation.x = -Math.PI / 2; top.receiveShadow = true; isle.add(top);
  const side = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.5, 0.35, 40, 1, true), new THREE.MeshStandardMaterial({ color: '#1e2a26', roughness: 1 })); side.position.y = -0.17; isle.add(side);
  // 天の川の帯の向き：カメラの向き F をふくみ、真上から右へ 40° 傾けた面
  const R = new THREE.Vector3(-F.z, 0, F.x), up = new THREE.Vector3(0, 1, 0).multiplyScalar(Math.cos(0.7)).addScaledVector(R, Math.sin(0.7));
  const n = new THREE.Vector3().crossVectors(F, up).normalize();
  const sky = []; v.scene.traverse(o => { if (o.userData.sky) sky.push(o); });
  for (const m of sky) m.material = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false,
    // time：環境が毎コマ書きこむので、使わなくても置く
    uniforms: { time: { value: 0 }, water: { value: water ? 1 : 0 }, top: { value: new THREE.Color('#050822') }, horizon: { value: new THREE.Color('#2a3470') }, glow: { value: new THREE.Color('#5a5a9a') }, n: { value: n } },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }',
    fragmentShader: \`uniform vec3 top, horizon, glow, n; uniform float water; varying vec3 vDir;
      float hash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
      float noise(vec3 x){ vec3 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f);
        return mix(mix(mix(hash(i), hash(i+vec3(1,0,0)), f.x), mix(hash(i+vec3(0,1,0)), hash(i+vec3(1,1,0)), f.x), f.y),
                   mix(mix(hash(i+vec3(0,0,1)), hash(i+vec3(1,0,1)), f.x), mix(hash(i+vec3(0,1,1)), hash(i+vec3(1,1,1)), f.x), f.y), f.z); }
      float fbm(vec3 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 6; i++){ v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }
      vec3 starCol(float t){ return mix(vec3(0.7, 0.8, 1.0), vec3(1.0, 0.85, 0.65), t); }
      vec3 stars(vec3 d, float S, float dens, float rad, float k){
        vec3 p = d * S, id = floor(p); float r = hash(id);
        if (r < 1.0 - dens) return vec3(0.0);
        vec3 o = vec3(hash(id + 1.7), hash(id + 3.1), hash(id + 5.3)) * 0.6 + 0.2;
        float dist = length(fract(p) - o), b = pow(hash(id + 9.1), 2.0) * 0.8 + 0.2;
        return starCol(hash(id + 4.4)) * b * k * (smoothstep(rad, 0.0, dist) + exp(-dist * 7.0 / rad) * 0.2);
      }
      vec3 sky(vec3 d){
        float h = max(d.y, 0.0);
        vec3 col = mix(horizon, top, smoothstep(0.0, 0.18, h));
        col += glow * exp(-h * 40.0) * 0.6;   // 地平線のほのかな明るみ
        float b = dot(d, n), band = exp(-b * b / 0.004);
        float cl = fbm(d * 14.0), dust = smoothstep(0.42, 0.68, fbm(d * 26.0 + 3.0));
        vec3 mw = mix(vec3(0.3, 0.38, 0.85), vec3(0.75, 0.5, 0.8), fbm(d * 6.0 + 7.0));
        col += mw * band * (0.15 + 0.7 * cl * cl) * (1.0 - 0.8 * dust) * 0.4;
        col += stars(d, 600.0, 0.08 + 0.3 * band, 0.36, 1.3) + stars(d, 300.0, 0.06 + 0.12 * band, 0.26, 2.0) + stars(d, 120.0, 0.05, 0.13, 4.0);
        return col * smoothstep(-0.003, 0.004, d.y) + horizon * (1.0 - smoothstep(-0.003, 0.004, d.y));
      }
      void main(){
        vec3 d = normalize(vDir);
        if (d.y >= 0.0 || water < 0.5) { gl_FragColor = vec4(sky(d), 1.0); return; }
        // 水面：上下を返した空。地平線に近いほどよく映り、足もとへいくほど暗い。ごく小さなさざなみ
        vec3 r = normalize(vec3(d.x + (noise(d * 300.0) - 0.5) * 0.0015, -d.y, d.z));
        float k = mix(0.85, 0.35, smoothstep(0.0, 0.35, -d.y));
        gl_FragColor = vec4(sky(r) * k + vec3(0.01, 0.015, 0.03), 1.0);
      }\` });
};`;

// '@camp'：へんせい画面だけの景色。夕暮れの原っぱの野営地（ゲームの区画にはない、この絵のためだけの景色）。
//   一行は原点に横一列に立つ（TEAM_CAM で撮る）。子のあいだのすきまから、まん中のたき火が見える。
//   左にテントと荷物、右に大きな木とランタン。奥の森はまん中をあけて、夕焼けと丘を見せる。小物は ZoneKit の部品
const CAMP = `window.teamCamp = v => {
  let sd = 7; const rand = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  const pv = Object.assign(Object.create(v), { zone: {}, rand, T: null, colliders: [], emitters: [], zoneTicks: [], reserved: [] });
  const K = new ZoneKit(pv);
  K.tent(-6.4, -6.6, 0.6, 'clothYellow');
  K.pack(-4.4, -5.2, 0.4);
  K.campfire(0, -5.6);
  K.lantern(6.4, -6.4);
  K.roundTree(9.5, -10, 1.5, 'leaf', { lush: true }); K.roundTree(-11, -9, 1.3);
  for (let i = 0; i < 30; i++) {
    const x = -34 + i * 2.35 + (rand() - 0.5) * 1.4; if (Math.abs(x) < 7 + rand() * 3) continue;
    const z = -24 - rand() * 6, s = 1 + rand() * 0.5 + Math.min(Math.abs(x), 30) * 0.015;
    if (rand() < 0.5) K.pine(x, z, s * 1.1); else K.roundTree(x, z, s, rand() < 0.5 ? 'leaf' : 'leaf2');
  }
  K.bush(-8.5, -4.5, 1.1); K.bush(8.2, -5.5, 1, 'leaf2', '#ffb8d8'); K.bush(4, -12, 1.2); K.bush(-3.5, -13, 1.1);
  K.flowers(-5.2, 0.6, 12, 1.6, ['#ffe07a', '#ffb8d8']); K.flowers(5.4, 0.8, 12, 1.6, ['#ffe07a', '#ffb8d8']);
  K.flush();
  // たき火の火の粉（emitters）を、毎コマ動かす
  const up = v.update.bind(v); v.update = (dt, t, rdt) => { up(dt, t, rdt); for (const f of pv.emitters) f(rdt); };
};`;

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9335, URL = `http://127.0.0.1:${process.env.SERVE_PORT || 8937}/index.html`;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const profile = mkdtempSync(join(tmpdir(), 'nyanko-bg-'));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--use-angle=metal', `--user-data-dir=${profile}`, '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });

try {
  let target;
  for (let i = 0; i < 50 && !target; i++) { await sleep(200); try { target = (await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()).find(t => t.type === 'page'); } catch {} }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r, { once: true }));
  let id = 0; const wait = new Map();
  ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (wait.has(m.id)) { wait.get(m.id)(m); wait.delete(m.id); } });
  const send = (method, params = {}) => new Promise(r => { const i = ++id; wait.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async expr => {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || expr);
    return r.result?.result?.value;
  };
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: SCALE, mobile: false });
  await send('Page.enable');
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('nyanko_lang', 'ja')` });
  await send('Page.navigate', { url: URL });
  for (let i = 0; i < 100; i++) { await sleep(300); if (await ev(`typeof GFX !== 'undefined' && !!(GFX.view && document.querySelector('.screen.title'))`)) break; }
  await ev(`GFX.watchFps = () => {}; GFX.setTier(0); GFX.Q.prMax = ${SCALE}; GFX.resize(GFX.appScale); true`);
  await ev(STARRY); await ev(CAMP);
  const jobs = tryJob ? [tryJob] : (await ev(`JSON.stringify([...Object.entries(SHOWCASE_BG).map(([k, b]) => [k, b.spot]), ['team', TEAM_BG.spot]])`).then(JSON.parse))
    .filter(([k]) => args.length ? args.includes(k) : k !== 'team').map(([key, spot]) => ({ key, spot, out: key === 'team' ? 'css/team-bg.jpg' : `css/chars-bg/${key}.jpg` }));

  for (const j of jobs) {
    // 人のいない会話の舞台として区画をまるごと組み立て、カメラをなかま画面と同じ位置に固定する
    await ev(`(() => {
      App.mount(document.createElement('div'));
      let [zone, x, z, yaw, bg] = ${JSON.stringify(j.spot)}, K = ${j.key === 'team' ? 'TEAM_CAM' : 'SHOWCASE_CAM'};
      let v, P, F;
      if (zone[0] === '@') {
        // 区画のない景色。子は (x, z) に立つ。'@stars'：星空を映す水面
        v = new SceneryView(bg || 'night'); v.update = BaseView.prototype.update;
        P = V3(x, 0, z); const th = yaw * Math.PI / 180; F = V3(Math.sin(th), 0, -Math.cos(th));
        if (zone === '@stars') starrySky(v, P, F);
        if (zone === '@camp') teamCamp(v);
      } else {
        const bg0 = bg; if (bg === 'stars') bg = 'night';   // 'stars'：夜にして、空だけぜいたくな星空に
        SCENE_STAGES.__bg = { zone, at: [x, z], face: yaw, party: [], cast: {}, ...(bg ? { bg } : {}) };
        SCENES.__bg = { title: '', lines: [] };
        v = new StageView(SCENES.__bg, '__bg'); P = v.O.clone(); F = v.F.clone();
        if (bg0 === 'stars') starrySky(v, P, F, false);
      }
      v.key = 'bgshot:' + Math.random();
      GFX.setView(v);
      const C = P.clone().addScaledVector(F, -K.dist); C.y = P.y + K.eye;
      const L = P.clone(); L.y = P.y + K.look;
      const up = v.update.bind(v);
      v.update = (dt, t, rdt) => { up(dt, t, rdt); const c = v.camera; c.fov = K.fov; if (K.screenX != null) c.setViewOffset(1280, 720, 640 - K.screenX, 0, 1280, 720); else c.clearViewOffset(); c.position.copy(C); c.lookAt(L); c.updateProjectionMatrix(); };
      GFX.renderer.toneMapping = THREE.NoToneMapping; GFX.grade.uniforms.vignette.value = 0;
      return true;
    })()`);
    await sleep(3000);
    const shot = await send('Page.captureScreenshot', { format: 'jpeg', quality: 86, clip: { x: 0, y: 0, width: j.key === 'team' ? 1280 : 704, height: H, scale: 1 } });
    writeFileSync(j.out, Buffer.from(shot.result.data, 'base64'));
    console.log(`${j.key}: ${j.spot.join(' ')} → ${j.out}（${Math.round(Buffer.from(shot.result.data, 'base64').length / 1024)}KB）`);
  }
  ws.close();
} finally {
  chrome.kill();
  await sleep(500);
  rmSync(profile, { recursive: true, force: true });
}
