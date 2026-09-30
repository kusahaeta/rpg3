'use strict';
// 起動・画面スケーリング・背景（ふわふわ舞う光の粒）

function fitStage() {
  const app = document.getElementById('app');
  const s = Math.min(window.innerWidth / 1280, window.innerHeight / 720);
  app.style.transform = `translate(-50%, -50%) scale(${s})`;
  if (typeof GFX !== 'undefined') GFX.resize(s);
}

// スマホ・タブレット：タッチで操作していれば body.touch を付ける（キーを押したらPC表示に戻す）
const Touch = {
  on: false,
  set(on) { if (on === this.on) return; this.on = on; document.body.classList.toggle('touch', on); },
  // 最初のタップで全画面＋横向き固定を試す（対応していないブラウザでは何もしない）
  fullscreen() {
    const el = document.documentElement, req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (!req || document.fullscreenElement || document.webkitFullscreenElement) return;
    try {
      const p = req.call(el, { navigationUI: 'hide' });
      if (p && p.then) p.then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {})).catch(() => {});
    } catch (e) { /* 全画面にできなくても遊べる */ }
  },
  init() {
    this.set(matchMedia('(pointer: coarse)').matches);
    document.addEventListener('pointerdown', e => { if (e.pointerType === 'touch') this.set(true); }, true);
    document.addEventListener('keydown', () => this.set(false), true);
    const fs = e => { if (e.pointerType !== 'touch') return; document.removeEventListener('pointerup', fs); this.fullscreen(); };
    document.addEventListener('pointerup', fs);
    // ピンチでページが拡大されないようにする（iOS Safari は viewport の指定を無視する）
    document.addEventListener('gesturestart', e => e.preventDefault());
    document.addEventListener('contextmenu', e => { if (this.on) e.preventDefault(); });
  },
};

// 診断表示（?debug のときだけ）：スマホで 3D 表示が消えたときに、何が起きているかをスクリーンショットで分かるように
function diagHud() {
  const el = document.createElement('div'); el.id = 'diag'; document.body.appendChild(el);
  const errs = [];
  const note = m => { errs.push(m); if (errs.length > 3) errs.shift(); };
  window.addEventListener('error', e => note(`${e.message} @${(e.filename || '').split('/').pop()}:${e.lineno}`));
  window.addEventListener('unhandledrejection', e => note(String(e.reason && e.reason.message || e.reason)));
  let last = 0, lastT = performance.now();
  setInterval(() => {
    const D = GFX.diag, now = performance.now(), fps = (D.frames - last) * 1000 / (now - lastT); last = D.frames; lastT = now;
    const R = GFX.renderer, c = GFX.canvas, f = Game.activeField, cam = GFX.view && GFX.view.camera && GFX.view.camera.position;
    let lost = '?'; try { lost = R.getContext().isContextLost() ? 'LOST' : 'ok'; } catch (e) { lost = 'err'; }
    const mem = performance.memory ? ` heap ${Math.round(performance.memory.usedJSHeapSize / 1048576)}MB` : '';
    el.textContent = [
      `3D ${lost}  止まった ${D.lost} / 戻った ${D.restored} / 作り直し ${D.rebuilt}${D.rebuildFail ? ' 失敗:' + D.rebuildFail : ''}`,
      `fps ${fps.toFixed(0)}  省エネ ${GFX.eco ? 'ON' : 'OFF'}  pr ${GFX.pixelRatio.toFixed(2)}  canvas ${c ? `${c.width}x${c.height} ${c.isConnected ? '' : '外れ'} 不透明度${c.style.opacity}` : 'なし'}`,
      R ? `画像 ${R.info.memory.textures}  形 ${R.info.memory.geometries}  シェーダー ${R.info.programs ? R.info.programs.length : '?'}  描画 ${R.info.render.calls}回${mem}` : '',
      `場所 ${f ? f.zoneId : '-'}  カメラ ${cam ? [cam.x, cam.y, cam.z].map(v => v.toFixed(1)).join(',') : '-'}  距離 ${f && f.curDist != null ? f.curDist.toFixed(1) : '-'}`,
      ...errs.map(m => 'エラー: ' + m),
    ].filter(Boolean).join('\n');
  }, 500);
}

function floaties() {
  const cv = document.getElementById('sky'), ctx = cv.getContext('2d');
  let w, h, dots;
  const resize = () => {
    w = cv.width = window.innerWidth; h = cv.height = window.innerHeight;
    dots = Array.from({ length: Math.floor(w * h / 9000) }, () => ({
      x: Math.random() * w, y: Math.random() * h, r: Math.random() * 2.2 + 0.6,
      p: Math.random() * Math.PI * 2, s: Math.random() * 0.02 + 0.005, v: Math.random() * 0.3 + 0.1, c: ['#fff4c8', '#ffd8e8', '#d8f0ff'][Math.floor(Math.random() * 3)],
    }));
  };
  resize(); window.addEventListener('resize', resize);
  const tick = () => {
    requestAnimationFrame(tick);
    // 省エネのときは、3D を出している間は止めておく（ほとんど隠れている）
    if (GFX.eco && GFX.view) return;
    ctx.clearRect(0, 0, w, h);
    for (const d of dots) {
      d.p += d.s; d.y -= d.v; d.x += Math.sin(d.p) * 0.3; if (d.y < -5) { d.y = h + 5; d.x = Math.random() * w; }
      ctx.globalAlpha = 0.35 + Math.sin(d.p) * 0.3;
      ctx.fillStyle = d.c;
      ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); ctx.fill();
    }
  };
  tick();
}

window.addEventListener('DOMContentLoaded', () => {
  App.el = document.getElementById('app');
  Save.load();
  GFX.init(App.el);
  Touch.init();
  fitStage(); window.addEventListener('resize', fitStage);
  // スマホを回したとき、アドレスバーが出入りしたときも合わせ直す
  window.addEventListener('orientationchange', () => setTimeout(fitStage, 200));
  if (window.visualViewport) visualViewport.addEventListener('resize', fitStage);
  floaties();
  if (Debug.on && GFX.ok) diagHud();
  document.addEventListener('pointerdown', () => Sfx.init(), { once: true });
  App.go(TitleScreen);
});
