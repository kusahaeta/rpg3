'use strict';
// 起動・画面スケーリング・背景（ふわふわ舞う光の粒）

function fitStage() {
  const app = document.getElementById('app');
  const s = Math.min(window.innerWidth / 1280, window.innerHeight / 720);
  app.style.transform = `translate(-50%, -50%) scale(${s})`;
  if (typeof GFX !== 'undefined') GFX.resize(s);
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
    ctx.clearRect(0, 0, w, h);
    for (const d of dots) {
      d.p += d.s; d.y -= d.v; d.x += Math.sin(d.p) * 0.3; if (d.y < -5) { d.y = h + 5; d.x = Math.random() * w; }
      ctx.globalAlpha = 0.35 + Math.sin(d.p) * 0.3;
      ctx.fillStyle = d.c;
      ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); ctx.fill();
    }
    requestAnimationFrame(tick);
  };
  tick();
}

window.addEventListener('DOMContentLoaded', () => {
  App.el = document.getElementById('app');
  Save.load();
  GFX.init(App.el);
  fitStage(); window.addEventListener('resize', fitStage);
  floaties();
  document.addEventListener('pointerdown', () => Sfx.init(), { once: true });
  App.go(TitleScreen);
});
