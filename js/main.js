'use strict';
// 起動・画面スケーリング・背景の星空

function fitStage() {
  const app = document.getElementById('app');
  const s = Math.min(window.innerWidth / 1280, window.innerHeight / 720);
  app.style.transform = `translate(-50%, -50%) scale(${s})`;
  if (typeof GFX !== 'undefined') GFX.resize(s);
}

function starfield() {
  const cv = document.getElementById('sky'), ctx = cv.getContext('2d');
  let w, h, stars;
  const resize = () => {
    w = cv.width = window.innerWidth; h = cv.height = window.innerHeight;
    stars = Array.from({ length: Math.floor(w * h / 5000) }, () => ({
      x: Math.random() * w, y: Math.random() * h, r: Math.random() * 1.4 + 0.2,
      p: Math.random() * Math.PI * 2, s: Math.random() * 0.02 + 0.005, v: Math.random() * 0.08 + 0.02,
    }));
  };
  resize(); window.addEventListener('resize', resize);
  const tick = () => {
    ctx.clearRect(0, 0, w, h);
    for (const st of stars) {
      st.p += st.s; st.x -= st.v; if (st.x < 0) st.x = w;
      ctx.globalAlpha = 0.35 + Math.sin(st.p) * 0.35;
      ctx.fillStyle = '#dfe6ff';
      ctx.beginPath(); ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2); ctx.fill();
    }
    requestAnimationFrame(tick);
  };
  tick();
}

window.addEventListener('DOMContentLoaded', async () => {
  App.el = document.getElementById('app');
  Save.load();
  // Blender製モデル（GLB）の読み込み。肖像の描画より先に済ませる
  await preloadCharModels().catch(e => console.warn(e));
  GFX.init(App.el);
  fitStage(); window.addEventListener('resize', fitStage);
  starfield();
  document.addEventListener('pointerdown', () => Sfx.init(), { once: true });
  App.go(TitleScreen);
});
