'use strict';
// ============================================================
//  武器ごとの3Dモデル（js/weapons.js の WEAPONS の id ごと）
//  ここにない武器（はじめの武器）は、その子の種類の形のまま（js/gfx/cats.js の buildCatWeapon）
//  K：hold（右手。+y が先、刃は ±x、腹は ±z）・armL（左手）・P（輪郭線つき）・T（トゥーン）・ex（extras）・tipAt・tc／tg（武器の色）
//  持ち方は buildCatWeapon と同じ：腕を下ろすと先が前下を向く。まくらは左手で抱える
//  ex.tip：技の光が出るところ（まくらは振るときにふくらむ本体）。ex.offhand：左手にも持つ武器（会話の舞台でいっしょに隠す）
// ============================================================

// 板の刃：右の縁 right(y)・左の縁 left(y) を y0〜y1 でなぞり、先 tip で閉じて厚み depth に押し出す
function wpBlade(y0, y1, tip, left, right, depth, n = 16) {
  const s = new THREE.Shape();
  for (let i = 0; i <= n; i++) { const y = lerp(y0, y1, i / n); if (i) s.lineTo(right(y), y); else s.moveTo(right(y), y); }
  s.lineTo(tip[0], tip[1]);
  for (let i = n; i >= 0; i--) { const y = lerp(y0, y1, i / n); s.lineTo(left(y), y); }
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false });
  g.translate(0, 0, -depth / 2);
  return g;
}
// まくらは、はじめのまくらと同じところ・向きで左手に抱える
function wpPillow(K) {
  const g = new THREE.Group(); g.position.set(0.03, -0.02, 0.05); g.rotation.set(0.1, 0.2, 1.25); K.armL.grip.add(g);
  K.ex.tip = g;
  return g;
}
// 光の粒（導火線の火花など）
function wpSpark(col, size) {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: hdr(col, 2.6), blending: THREE.AdditiveBlending, depthWrite: false }));
  sp.scale.setScalar(size);
  return sp;
}

const WEAPON_MODELS = {
  // ---------------- ミケ（剣） ----------------
  // かつおぶしソード：舟形のかつおぶしの刃に、すじと、削りぶしがくるりと一枚。柄は魚屋の青い布巻き
  mike_katsuo({ hold, P, T, tipAt, tc, tg }) {
    const sh = y => 0.6 + 0.4 * Math.sin(Math.PI * (y - 0.06) / 0.41);
    const bl = P(wpBlade(0.06, 0.43, [0.004, 0.47], y => -0.026 * sh(y), y => 0.03 * sh(y), 0.034), T(tc)); hold.add(bl);
    for (const x of [-0.011, 0.002, 0.014]) { const gr = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.26 - Math.abs(x) * 4, 0.036), T('#8a5428')); gr.position.set(x, 0.23, 0); hold.add(gr); }
    const cu = P(new THREE.TorusGeometry(0.02, 0.006, 4, 12, Math.PI * 1.6), T(tg)); cu.position.set(0.03, 0.4, 0); cu.rotation.y = Math.PI / 2; hold.add(cu);
    const gd = P(new THREE.BoxGeometry(0.11, 0.022, 0.036), T('#d8b060')); gd.position.y = 0.055; hold.add(gd);
    const hi = P(new THREE.CylinderGeometry(0.015, 0.015, 0.09, 8), T('#3a5a8a')); hi.position.y = -0.002; hold.add(hi);
    for (const y of [-0.03, 0.0, 0.03]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.006, 8), T('#f4f0e8')); w.position.y = y; hold.add(w); }
    const pm = P(new THREE.SphereGeometry(0.02, 8, 6), T('#d8b060')); pm.position.y = -0.05; hold.add(pm);
    tipAt(0.47);
  },
  // ほのおのつるぎ：波打つ刃の芯が赤く光り、刃にそって炎がゆらめく
  mike_flame({ hold, P, T, ex, tipAt, tc, tg }) {
    const wav = y => Math.sin((y - 0.065) * 48) * 0.006, hw = y => 0.026 * (1 - Math.max(0, (y - 0.36) / 0.12) * 0.6);
    const bl = P(wpBlade(0.065, 0.44, [0, 0.5], y => -hw(y) + wav(y), y => hw(y) + wav(y), 0.012), T(tc)); hold.add(bl);
    const co = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.36, 0.016), glowMat(tg, 2)); co.position.y = 0.26; hold.add(co);
    const flames = [0, 1, 2, 3].map(i => {
      const s = i % 2 ? 1 : -1, f = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.09, 6), glowMat(i % 2 ? '#ffb03a' : tg, 1.8, { transparent: true, opacity: 0.9 }));
      f.geometry.translate(0, 0.045, 0); f.position.set(s * 0.022, 0.12 + i * 0.08, 0); f.rotation.z = -s * 0.5; hold.add(f); return f;
    });
    for (const s of [-1, 1]) { const w = P(new THREE.BoxGeometry(0.07, 0.022, 0.034), T('#5a2a1a')); w.position.set(s * 0.032, 0.06, 0); w.rotation.z = s * 0.35; hold.add(w); }
    const gem = new THREE.Mesh(new THREE.SphereGeometry(0.016, 10, 8), glowMat(tg, 2.4)); gem.position.set(0, 0.058, 0.018); hold.add(gem);
    const hi = P(new THREE.CylinderGeometry(0.014, 0.014, 0.09, 8), T('#3a1a14')); hi.position.y = -0.002; hold.add(hi);
    tipAt(0.5);
    ex.update = (dt, t) => flames.forEach((f, i) => { const k = Math.sin(t * 13 + i * 2.1) * 0.5 + Math.sin(t * 21 + i) * 0.25; f.scale.set(1 - k * 0.25, 1 + k * 0.5, 1 - k * 0.25); });
  },
  // ねこじゃらしの大剣：幅広の大剣。切っ先に結んだねこじゃらしの穂が、ふさふさゆれる
  mike_big({ hold, P, T, ex, tc, tg }) {
    const bl = P(wpBlade(0.08, 0.5, [0, 0.58], () => -0.042, () => 0.042, 0.016), T(tc)); hold.add(bl);
    const fu = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.36, 0.018), T('#c8b878')); fu.position.y = 0.28; hold.add(fu);
    const gd = P(new THREE.BoxGeometry(0.2, 0.03, 0.042), T('#c8a040')); gd.position.y = 0.065; hold.add(gd);
    for (const s of [-1, 1]) { const b = P(new THREE.SphereGeometry(0.022, 10, 8), T('#c8a040')); b.position.set(s * 0.1, 0.065, 0); hold.add(b); }
    const hi = P(new THREE.CylinderGeometry(0.016, 0.016, 0.14, 8), T('#5a7a3a')); hi.position.y = -0.01; hold.add(hi);
    const pm = P(new THREE.SphereGeometry(0.022, 8, 6), T('#c8a040')); pm.position.y = -0.085; hold.add(pm);
    // 穂：切っ先から細い茎がのび、そこから先がゆれる
    const pv = new THREE.Group(); pv.position.y = 0.57; hold.add(pv);
    const stem = P(new THREE.CylinderGeometry(0.004, 0.005, 0.06, 5), T('#7aa84a')); stem.position.y = 0.03; pv.add(stem);
    const ho = new THREE.Group(); ho.position.y = 0.06; ho.rotation.z = 0.5; pv.add(ho);   // 穂は重みで少しおじぎする
    const pl = new THREE.Mesh(new THREE.SphereGeometry(0.026, 12, 10), T(tg)); pl.scale.set(0.8, 3, 0.8); pl.position.y = 0.075; ho.add(pl);
    const hair = T('#' + new THREE.Color(tg).lerp(new THREE.Color('#ffffff'), 0.5).getHexString());
    for (let i = 0; i < 48; i++) {
      const k = i / 47, a = i * 2.4, y = 0.008 + k * 0.14, r = 0.02 * Math.sin(Math.PI * (0.12 + k * 0.82)), f = new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0012, 0.045, 3), hair);
      f.position.set(Math.cos(a) * r, y, Math.sin(a) * r); f.rotation.set(Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9 + 0.25); ho.add(f);
    }
    ex.tip = ho;
    ex.update = (dt, t) => { pv.rotation.z = Math.sin(t * 3.1) * 0.3; pv.rotation.x = Math.sin(t * 2.3 + 1) * 0.2; };
  },

  // ---------------- クロ（刀） ----------------
  // まもりの木刀：少し反った、先の丸い木刀。黒いつばと、柄じりの房
  kuro_bokuto({ hold, P, T, tipAt, tc, tg }) {
    const x = y => 0.022 * ((y - 0.06) / 0.5) ** 2;
    const bl = P(wpBlade(0.06, 0.55, [x(0.55) - 0.002, 0.578], y => x(y) - 0.018, y => x(y) + 0.018, 0.022), T(tc)); hold.add(bl);
    for (const y of [0.2, 0.36]) { const k = new THREE.Mesh(new THREE.SphereGeometry(0.008, 6, 5), T('#7a5a32')); k.scale.set(1, 2.2, 0.4); k.position.set(x(y) - 0.004, y, 0.011); hold.add(k); }
    const gd = P(new THREE.CylinderGeometry(0.042, 0.042, 0.014, 14), T('#2a2422')); gd.position.y = 0.05; hold.add(gd);
    const hi = P(new THREE.CylinderGeometry(0.017, 0.017, 0.12, 8), T(tc)); hi.position.y = -0.015; hold.add(hi);
    const fs = P(new THREE.SphereGeometry(0.014, 8, 6), T(tg)); fs.scale.y = 1.6; fs.position.y = -0.09; hold.add(fs);
    tipAt(0.578);
  },
  // 双子の小太刀：右手と左手に一本ずつ
  kuro_twin({ hold, armL, P, T, ex, tipAt, tc, tg }) {
    const make = h => {
      const bl = P(wpBlade(0.045, 0.28, [0.006, 0.33], () => -0.016, () => 0.014, 0.01), T(tc)); h.add(bl);
      const ed = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.22, 0.012), glowMat(tg, 2.2)); ed.position.set(0.011, 0.16, 0); h.add(ed);
      const gd = P(new THREE.BoxGeometry(0.06, 0.016, 0.03), T('#3a3a4a')); gd.position.y = 0.04; h.add(gd);
      const hi = P(new THREE.CylinderGeometry(0.013, 0.013, 0.08, 8), T('#2a3458')); hi.position.y = -0.005; h.add(hi);
    };
    make(hold);
    const h2 = new THREE.Group(); h2.rotation.x = Math.PI - 0.55; armL.grip.add(h2); make(h2);
    ex.offhand = h2;
    tipAt(0.33);
  },
  // 月影の刀：大きく反った黒い刀身に、月の光の刃文。つばは三日月
  kuro_moon({ hold, P, T, tipAt, tc, tg }) {
    const x = y => 0.04 * ((y - 0.06) / 0.52) ** 2, tip = [x(0.6) + 0.012, 0.615];
    const bl = P(wpBlade(0.06, 0.56, tip, y => x(y) - 0.017, y => x(y) + 0.017, 0.012), T(tc)); hold.add(bl);
    const ed = new THREE.Mesh(wpBlade(0.08, 0.56, [tip[0] - 0.004, tip[1] - 0.006], y => x(y) - 0.019, y => x(y) - 0.011, 0.014), glowMat(tg, 2.4)); hold.add(ed);
    const hb = P(new THREE.BoxGeometry(0.04, 0.02, 0.018), T('#c8b070')); hb.position.y = 0.06; hold.add(hb);
    const gd = P(new THREE.CylinderGeometry(0.036, 0.036, 0.01, 14), T('#1a1828')); gd.position.y = 0.046; hold.add(gd);
    const moon = new THREE.Mesh(new THREE.TorusGeometry(0.042, 0.008, 6, 18, Math.PI * 1.3), glowMat(tg, 2.2)); moon.position.y = 0.046; moon.rotation.set(Math.PI / 2, 0, 0.6); hold.add(moon);
    const hi = P(new THREE.CylinderGeometry(0.014, 0.014, 0.1, 8), T('#3a3450')); hi.position.y = -0.01; hold.add(hi);
    for (const y of [-0.04, -0.01, 0.02]) { const d = new THREE.Mesh(new THREE.OctahedronGeometry(0.008, 0), T('#e8e4f4')); d.scale.z = 0.5; d.position.set(0, y, 0.014); hold.add(d); }
    tipAt(tip[1]);
  },

  // ---------------- シロ（杖） ----------------
  // まじめな杖：目もりのついたまっすぐな杖。先の四角い枠のなかで、四角い結晶がきちんと回る
  shiro_majime({ hold, P, T, ex, tc, tg }) {
    const st = P(new THREE.CylinderGeometry(0.012, 0.012, 0.42, 8), T(tc)); st.position.y = 0.18; hold.add(st);
    for (let i = 0; i < 7; i++) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.0135, 0.0135, 0.006, 8), T('#e8eef8')); r.position.y = 0.06 + i * 0.045; hold.add(r); }
    const cl = P(new THREE.CylinderGeometry(0.024, 0.016, 0.03, 8), T('#e8eef8')); cl.position.y = 0.39; hold.add(cl);
    const fr = new THREE.Group(); fr.position.y = 0.45; hold.add(fr);
    for (const s of [-1, 1]) {
      const v = P(new THREE.BoxGeometry(0.008, 0.098, 0.008), T('#e8eef8')); v.position.x = s * 0.045; fr.add(v);
      const h = P(new THREE.BoxGeometry(0.098, 0.008, 0.008), T('#e8eef8')); h.position.y = s * 0.045; fr.add(h);
    }
    const cr = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.042, 0.042), glowMat(tg, 2.6)); cr.position.y = 0.45; cr.rotation.set(0.6155, 0, Math.PI / 4); hold.add(cr);
    const pm = P(new THREE.BoxGeometry(0.026, 0.026, 0.026), T('#e8eef8')); pm.position.y = -0.04; hold.add(pm);
    ex.tip = cr;
    ex.update = (dt, t) => { fr.rotation.y = t * 0.8; cr.rotation.y = -t * 1.2; };
  },
  // こおりの杖：先に雪の結晶がくるくる回り、根もとにはつららの結晶
  shiro_ice({ hold, P, T, ex, tc, tg }) {
    const st = P(new THREE.CylinderGeometry(0.012, 0.016, 0.42, 8), T(tc)); st.position.y = 0.18; hold.add(st);
    const fl = new THREE.Group(); fl.position.y = 0.46; hold.add(fl);
    const gm = glowMat(tg, 2.4);
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2, arm = new THREE.Group(); arm.rotation.z = a; fl.add(arm);
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.075, 0.008), gm); b.position.y = 0.0375; arm.add(b);
      for (const s of [-1, 1]) { const tw = new THREE.Mesh(new THREE.BoxGeometry(0.007, 0.026, 0.006), gm); tw.position.set(s * 0.009, 0.052, 0); tw.rotation.z = -s * 0.8; arm.add(tw); }
    }
    const co = new THREE.Mesh(new THREE.OctahedronGeometry(0.02, 0), glowMat('#ffffff', 2.2)); fl.add(co);
    const iceM = T('#bfeeff', { transparent: true, opacity: 0.88 });
    for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2, c = P(new THREE.OctahedronGeometry(0.02, 0), iceM); c.scale.set(0.6, 1.9, 0.6); c.position.set(Math.cos(a) * 0.02, 0.37, Math.sin(a) * 0.02); c.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5); hold.add(c); }
    ex.tip = co;
    ex.update = (dt, t) => { fl.rotation.y = t * 1.5; };
  },
  // 大ばくはつの杖：ねじれた杖の先に、導火線に火のついた爆弾
  shiro_boom({ hold, P, T, ex, tc, tg }) {
    const st = P(new THREE.CylinderGeometry(0.013, 0.018, 0.4, 8), T(tc)); st.position.y = 0.17; hold.add(st);
    for (const [y, x] of [[0.12, 0.012], [0.27, -0.012]]) { const k = P(new THREE.SphereGeometry(0.018, 8, 6), T(tc)); k.position.set(x, y, 0); hold.add(k); }
    for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2, c = P(new THREE.ConeGeometry(0.011, 0.07, 5), T(tc)); c.position.set(Math.cos(a) * 0.04, 0.41, Math.sin(a) * 0.04); c.rotation.set(-Math.sin(a) * 0.5, 0, Math.cos(a) * 0.5); hold.add(c); }
    const bomb = P(new THREE.SphereGeometry(0.058, 14, 10), T('#2a2430')); bomb.position.y = 0.45; hold.add(bomb);
    const hl = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), T('#8a8098')); hl.position.set(-0.025, 0.475, 0.042); hold.add(hl);
    const cap = P(new THREE.CylinderGeometry(0.02, 0.022, 0.024, 10), T('#8a8a96')); cap.position.y = 0.51; hold.add(cap);
    const fu = P(new THREE.TorusGeometry(0.03, 0.005, 4, 10, Math.PI * 0.8), T('#c8a870')); fu.position.set(-0.03, 0.522, 0); hold.add(fu);
    const sp = wpSpark(tg, 0.09); sp.position.set(-0.03 + Math.cos(Math.PI * 0.8) * 0.03, 0.522 + Math.sin(Math.PI * 0.8) * 0.03, 0); hold.add(sp);
    ex.tip = bomb;
    ex.update = (dt, t) => { sp.scale.setScalar(0.07 + (Math.sin(t * 31) * 0.5 + 0.5) * 0.05 + Math.random() * 0.02); };
  },

  // ---------------- タマ（まくら） ----------------
  // そばがらまくら：両はしをひもでしばった、筒形のかためのまくら
  tama_soba(K) {
    const { P, T, tc, tg } = K, g = wpPillow(K);
    const b = P(new THREE.CapsuleGeometry(0.068, 0.18, 6, 14), T(tc)); b.rotation.z = Math.PI / 2; g.add(b);
    for (const s of [-1, 1]) {
      const r = new THREE.Mesh(new THREE.TorusGeometry(0.052, 0.011, 6, 16), T(tg)); r.position.x = s * 0.12; r.rotation.y = Math.PI / 2; g.add(r);
      const tf = P(new THREE.ConeGeometry(0.032, 0.045, 8), T(tc)); tf.position.x = s * 0.17; tf.rotation.z = s * Math.PI / 2; g.add(tf);
    }
    const ln = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.012, 0.004), T(tg)); ln.position.z = 0.067; g.add(ln);
  },
  // ねこ型クッション：耳としっぽのついた、ねこの顔のクッション
  tama_cushion(K) {
    const { P, T, tc, tg } = K, g = wpPillow(K);
    const c = new THREE.Group(); c.rotation.z = -Math.PI / 2; g.add(c);   // 耳を、腕のほうではなく外へ向ける
    const dk = '#' + new THREE.Color(tc).multiplyScalar(0.72).getHexString();
    const b = P(new THREEX.RoundedBoxGeometry(0.25, 0.22, 0.11, 4, 0.05), T(tc)); c.add(b);
    for (const s of [-1, 1]) {
      const e = P(new THREE.ConeGeometry(0.045, 0.07, 4), T(tc)); e.position.set(s * 0.075, 0.13, 0); e.rotation.set(0, Math.PI / 4, -s * 0.25); e.scale.z = 0.55; c.add(e);
      const ey = new THREE.Mesh(new THREE.TorusGeometry(0.016, 0.004, 4, 10, Math.PI), T('#3a2a2a')); ey.position.set(s * 0.05, 0.02, 0.056); c.add(ey);
      const bl = new THREE.Mesh(new THREE.CircleGeometry(0.016, 10), T(tg)); bl.position.set(s * 0.08, -0.02, 0.0562); c.add(bl);
      for (const w of [-1, 1]) { const wh = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.003, 0.002), T('#3a2a2a')); wh.position.set(s * 0.11, -0.01 + w * 0.012, 0.056); wh.rotation.z = s * w * 0.2; c.add(wh); }
    }
    const no = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.012, 3), T(tg)); no.position.set(0, -0.005, 0.057); no.rotation.z = Math.PI; c.add(no);
    for (const x of [-0.03, 0, 0.03]) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.04, 0.112), T(dk)); st.position.set(x, 0.085, 0); c.add(st); }
    const tl = P(new THREE.CapsuleGeometry(0.018, 0.08, 4, 8), T(tc)); tl.position.set(0.14, -0.06, -0.02); tl.rotation.z = -0.9; c.add(tl);
  },
  // 夢見まくら：三日月のまくら。くぼみに星がひとつ、またたく
  tama_dream(K) {
    const { P, T, ex, tc, tg } = K, g = wpPillow(K);
    const c = new THREE.Group(); c.rotation.z = -Math.PI / 2; g.add(c);
    const mo = P(new THREE.TorusGeometry(0.1, 0.048, 10, 22, Math.PI * 1.25), T(tc)); mo.rotation.z = Math.PI * 0.875; mo.scale.z = 0.75; c.add(mo);
    for (let i = 0; i < 3; i++) { const a = Math.PI * (1.15 + i * 0.35), d = new THREE.Mesh(new THREE.SphereGeometry(0.008, 6, 5), T(tg)); d.position.set(Math.cos(a) * 0.1, Math.sin(a) * 0.1, 0.036); c.add(d); }
    const ss = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 0.016 : 0.04; if (i) ss.lineTo(Math.cos(a) * r, Math.sin(a) * r); else ss.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
    const sg = new THREE.ExtrudeGeometry(ss, { depth: 0.014, bevelEnabled: false }); sg.translate(0, 0, -0.007);
    const star = P(sg, T(tg, { emissive: new THREE.Color(tg), emissiveIntensity: 0.6 })); star.position.set(0, 0.03, 0.04); c.add(star);
    ex.update = (dt, t) => { star.rotation.z = Math.sin(t * 1.5) * 0.3; star.scale.setScalar(0.88 + Math.sin(t * 3) * 0.12); };
  },

  // ---------------- マオウ（笏） ----------------
  // おもちゃの笏：ピコピコハンマー
  maou_toy({ hold, P, T, ex, tc, tg }) {
    const st = P(new THREE.CylinderGeometry(0.014, 0.014, 0.42, 8), T(tc)); st.position.y = 0.17; hold.add(st);
    const hd = new THREE.Group(); hd.position.y = 0.41; hd.rotation.x = Math.PI / 2; hold.add(hd);
    const lt = '#' + new THREE.Color(tc).lerp(new THREE.Color('#ffffff'), 0.35).getHexString();
    const bo = P(new THREE.CylinderGeometry(0.052, 0.052, 0.14, 16), T(lt)); hd.add(bo);
    for (const y of [-0.03, 0, 0.03]) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.053, 0.005, 4, 16), T(tc)); r.position.y = y; r.rotation.x = Math.PI / 2; hd.add(r); }
    for (const s of [-1, 1]) { const cp = P(new THREE.CylinderGeometry(0.058, 0.058, 0.035, 16), T(tg)); cp.position.y = s * 0.085; hd.add(cp); }
    const pm = P(new THREE.SphereGeometry(0.022, 10, 8), T(tg)); pm.position.y = -0.045; hold.add(pm);
    ex.tip = hd;
  },
  // のろいの笏：つるが巻きついた杖。三本の爪が緑の玉をつかみ、「さわるな」のお札がはってある
  maou_curse({ hold, P, T, ex, tc, tg }) {
    const st = P(new THREE.CylinderGeometry(0.014, 0.018, 0.46, 8), T(tc)); st.position.y = 0.19; hold.add(st);
    const pts = []; for (let i = 0; i <= 40; i++) { const k = i / 40, a = k * Math.PI * 6; pts.push(V3(Math.cos(a) * 0.019, -0.02 + k * 0.42, Math.sin(a) * 0.019)); }
    const vi = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.006, 5), T('#1e2a16')); hold.add(vi);
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.046, 14, 10), glowMat(tg, 1.6)); orb.position.y = 0.48; hold.add(orb);
    for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2, c = P(new THREE.ConeGeometry(0.01, 0.09, 5), T('#1e2a16')); c.position.set(Math.cos(a) * 0.04, 0.47, Math.sin(a) * 0.04); c.rotation.set(Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35); hold.add(c); }
    const pv = new THREE.Group(); pv.position.set(0, 0.34, 0.02); hold.add(pv);
    const pa = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.09, 0.002), T('#f4ecd0')); pa.position.y = -0.045; pv.add(pa);
    for (const y of [-0.025, -0.05, -0.07]) { const ch = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.006, 0.003), T('#c83a3a')); ch.position.set(0, y, 0.001); pv.add(ch); }
    ex.tip = orb;
    ex.update = (dt, t) => { orb.scale.setScalar(1 + Math.sin(t * 2.6) * 0.08); pv.rotation.x = 0.15 + Math.sin(t * 4.3) * 0.08; pv.rotation.z = Math.sin(t * 3.1) * 0.06; };
  },
  // 漆黒の大笏：金の帯の入った長い黒い笏。赤い大玉をコウモリの羽と金のとげが囲む
  maou_dark({ hold, P, T, ex, tc, tg }) {
    const st = P(new THREE.CylinderGeometry(0.016, 0.02, 0.56, 8), T(tc)); st.position.y = 0.22; hold.add(st);
    for (const y of [0.06, 0.3, 0.46]) { const b = P(new THREE.CylinderGeometry(0.023, 0.023, 0.018, 10), T('#c8a040')); b.position.y = y; hold.add(b); }
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.062, 16, 12), glowMat(tg, 1.6)); orb.position.y = 0.57; hold.add(orb);
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2, c = P(new THREE.ConeGeometry(0.011, 0.06, 5), T('#c8a040')); c.position.set(Math.cos(a) * 0.05, 0.53, Math.sin(a) * 0.05); c.rotation.set(Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6); hold.add(c); }
    const ws = new THREE.Shape(); [[0, 0], [0.06, 0.07], [0.13, 0.1], [0.115, 0.045], [0.095, 0.055], [0.08, 0.005], [0.055, 0.025], [0.035, -0.03]].forEach(([x, y], i) => i ? ws.lineTo(x, y) : ws.moveTo(x, y));
    const wm = T('#2a2034', { side: THREE.DoubleSide });
    const wings = [-1, 1].map(s => { const w = new THREE.Mesh(new THREE.ShapeGeometry(ws), wm); w.position.set(s * 0.045, 0.54, 0); w.scale.x = s; hold.add(w); return w; });
    ex.tip = orb;
    ex.update = (dt, t) => { orb.scale.setScalar(1 + Math.sin(t * 2) * 0.06); wings.forEach((w, i) => { w.rotation.y = (i ? 1 : -1) * Math.sin(t * 2.4) * 0.25; }); };
  },
};
