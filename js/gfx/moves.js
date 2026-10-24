'use strict';
// ============================================================
//  技ごとのモーション（BattleView に足す）
//  技の定義（CHARS・WEAPONS）の anim で選ぶ。anim のない技は views.js の共通の動き
//  （近接：飛びこんで斬る／遠距離：弾を撃つ／味方へ：杖を掲げる）
//  MOVES[anim] の中身：
//    attack(e, ts, c)  敵への技（ts：対象の ent、c：{ col, ult, kind, opt }）
//    hop(e, te, c)     連続攻撃（bounce）の 2 発目から
//    restrike(e, te, i, c)  同じ敵へ続けて斬る技（二連・三連影）の i 太刀目（1 から）
//    support(e, ts, c) 味方への技（技の効果より先に動く）
//  ダメージのない技は、技の run から B.motion(s, anim) で動きだけを出す（attack か support を使う）
//    keep：友情技で、先に持ち場をはなれた相方を戻さずに残す（最後の attackEnd でみんな戻る）
// ============================================================
const DASHI = '#d8943c';   // だしの色（だしの大波）
const KURO_SHADOW = '#6a58c8';   // クロの影の色（残像・黒い気）
const MOON = '#c8b8ff';   // 月の光（月影の刀・居合）
const TWIN = '#d8e4ff';   // 双子の小太刀の刃の光
// つぶれる演出の元の形：つぶれているあいだに次が当たっても、最初につぶれる前の形を返す
// （つぶれた途中の形を覚えて戻すと、連続で当たるたびに背が縮んで横に広がっていく）
// 演出が終わったら squashEnd。最後のひとつが終わったときだけ元の形に戻す
function squashStart(g) {
  const ud = g.userData;
  if (!ud.sqN) ud.sq0 = g.scale.clone();
  ud.sqN = (ud.sqN || 0) + 1;
  return ud.sq0;
}
function squashEnd(g, restore = true) {
  const ud = g.userData;
  if (--ud.sqN <= 0) { ud.sqN = 0; if (restore) g.scale.copy(ud.sq0); }
}
// 霜の模様（白、アルファ付き）：まんなかから外へうすれる円に、霜の結晶の細い筋を散らす
function frostTex() {
  if (TexCache.frost) return TexCache.frost;
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d'), gr = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  gr.addColorStop(0, 'rgba(255,255,255,0.75)'); gr.addColorStop(0.65, 'rgba(255,255,255,0.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, S, S);
  g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineCap = 'round';
  for (let i = 0; i < 70; i++) {   // 小さな雪の結晶の形（六本の枝）
    const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * S * 0.42, x = S / 2 + Math.cos(a) * d, y = S / 2 + Math.sin(a) * d, l = 3 + Math.random() * 7, r0 = Math.random();
    g.lineWidth = 1 + Math.random();
    g.beginPath();
    for (let k = 0; k < 6; k++) { const b = r0 + k * Math.PI / 3; g.moveTo(x, y); g.lineTo(x + Math.cos(b) * l, y + Math.sin(b) * l); }
    g.stroke();
  }
  return (TexCache.frost = new THREE.CanvasTexture(c));
}
const MOVES = {
  // ねこパンチ：剣を持たない左の手で、ぽかっと
  punch: {
    async attack(e, ts, c) {
      const t = ts[0], m = e.model, dest = this.meleeSpot(t, 0.5);
      this.sideCam(dest, t);
      await this.dashTo(e, dest, { pose: POSES.punchUp, dur: 0.28, hop: 0.3 });
      this.face(e, t.home);
      await this.tweenPose(m, POSES.punch, 0.07);
      const p = this.hitPoint(t.u);
      this.fx.sprite(p, c.col, 1.3, 0.25, { k: 3 });
      this.fx.ring(p, '#ffffff', { r: 0.8, life: 0.3, face: this.camera.position, width: 0.08 });
      this.squash(t, 0.15);
    },
  },
  // まくら：横から振りまわして、ぽふっ（振るあいだ、まくらがふくらむ）。おもちゃの笏：両手で振りかぶって、ピコッ
  bonk: {
    async attack(e, ts, c) {
      const t = ts[0], m = e.model, dest = this.meleeSpot(t, 0.45);
      const pillow = CHARS[e.u.key].gear.weapon === 'pillow', pl = pillow && m.extras.tip;
      this.sideCam(dest, t);
      if (pl) GFX.tween(0.3, k => pl.scale.setScalar(1 + Ease.back(k) * 0.7));
      await this.dashTo(e, dest, { pose: pillow ? POSES.swingUp : POSES.bonkUp, dur: 0.34, hop: 0.55 });
      this.face(e, t.home);
      await this.tweenPose(m, pillow ? POSES.swing : POSES.bonk, 0.09);
      if (pl) GFX.delay(0.25).then(() => GFX.tween(0.3, k => pl.scale.setScalar(1.7 - k * 0.7)));
      const p = this.hitPoint(t.u).add(V3(0, t.model.height * 0.3, 0));
      this.squash(t, 0.3);
      if (pillow) {
        Sfx.puff();
        this.p.burst(p, '#ffffff', 26, { speed: 2.6, up: 1.2, life: 1.0, size: 0.1, grav: 1.5, drag: 3 });
      } else {
        Sfx.boing();
        for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; this.fx.sprite(p.clone().add(V3(Math.cos(a) * 0.5, Math.sin(a) * 0.35 + 0.2, 0.2)), '#ffe066', 0.35, 0.45, { k: 3, grow: 0.6 }); }
        this.fx.ring(p, '#ffe066', { r: 1.0, life: 0.35, face: this.camera.position, width: 0.08 });
      }
    },
  },
  // 魔王のしっぽ・のろいのしっぽ：えらそうに歩みよって「ふん」と背を向け、ぴんと立てたしっぽで、ぺしっとはたく
  //   のろいの笏：しっぽが緑に光り、はたいたところに小さな稲妻（感電）
  tail: {
    async attack(e, ts, c) {
      const t = ts[0], m = e.model, dest = this.meleeSpot(t, 0.55), was = m.face && m.face.expr;
      const curse = equippedWeapon(e.u.key) === 'maou_curse', glow = curse ? '#8aff6a' : '#a07bff';
      this.sideCam(dest, t);
      if (m.face) m.face.set('smug');
      await this.dashTo(e, dest, { pose: POSES.ready, dur: 0.34, hop: 0.12, trail: false });
      const y0 = Math.atan2(t.home.x - dest.x, t.home.z - dest.z), tip = () => m.tail[m.tail.length - 1].localToWorld(V3(0, 0.09, 0));
      // ふん：背を向けて、しっぽをぴんと立てる。先が光る
      this.huff(e);
      Sfx.tone(240, 0.12, 'triangle', 0.05, -60);
      const shine = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: hdr(glow, 2.6), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
      shine.renderOrder = 12;
      this.fx.add(shine, 1.0, k => { shine.position.copy(tip()); shine.scale.setScalar(0.3 + Math.sin(k * 30) * 0.05); shine.material.opacity = k > 0.8 ? (1 - k) / 0.2 : 1; });
      await GFX.tween(0.2, k => { m.tailOut = k; m.group.rotation.y = y0 + (Math.PI - 0.9) * Ease.out(k); });
      await GFX.delay(0.18);
      // ぺしっ：しっぽを横へ振りぬく（しっぽの先の通り道に光の帯）
      Sfx.noise(0.12, 0.12, 3200);
      let hit = false;
      await GFX.tween(0.16, (k, p) => {
        m.group.rotation.y = y0 + Math.PI - 0.9 + 2.0 * k;
        const q = tip();
        for (let i = 0; i < 4; i++) this.p.emit(q, V3((Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3), hdr(glow, 2.4), { life: 0.3, size: 0.16, drag: 6 });
        if (!hit && p > 0.45) {
          hit = true;
          const hp = this.hitPoint(t.u).add(V3(0, -0.1, 0));
          this.fx.slash(hp, glow, { cam: this.camera, size: 2.4, angle: 0.12 });
          this.starFx(hp, glow);
          this.squash(t, 0.25);
          Sfx.tone(900, 0.06, 'square', 0.05, -500); Sfx.noise(0.08, 0.2, 2000);
          if (curse) for (let i = 0; i < 3; i++) GFX.delay(i * 0.06).then(() => { const a = Math.random() * Math.PI * 2; this.fx.bolt(hp.clone().add(V3(Math.cos(a) * 0.5, 0.4, 0.2)), hp.clone().add(V3(-Math.cos(a) * 0.3, -0.3, 0.2)), glow, { life: 0.18, segs: 7, jag: 0.1, r: 0.02, k: 3 }); });
        }
      }, Ease.in);
      // 向きなおって、すまし顔
      const r1 = m.group.rotation.y;
      GFX.tween(0.25, k => { m.tailOut = 1 - k; });
      await GFX.tween(0.22, k => { m.group.rotation.y = lerp(r1, y0 + Math.PI * 2, Ease.out(k)); });
      m.group.rotation.y = y0;
      if (m.face) GFX.delay(0.5).then(() => { if (m.face.expr === 'smug') m.face.set(was || 'neutral'); });
    },
  },
  // ---------------- ミケ（剣）：技ごとに、剣のふるい方を変える ----------------
  // 勇者のつるぎ：敵の前へ駆けこみ、剣を横へ引いて構えた切っ先がきらり。横一文字に、となりの敵ごとなぎ払う
  hero: {
    async attack(e, ts, c) {
      const t = ts[0], m = e.model, dest = this.meleeSpot(t, 0.8);
      const cx = ts.reduce((a, x) => a + x.home.x, 0) / ts.length;
      // 横一文字を引く高さ（ねらう敵の列の、斬りつけるところ）
      const ps = ts.map(x => this.hitPoint(x.u)), mid = ps.reduce((a, p) => a.add(p), V3()).multiplyScalar(1 / ps.length);
      this.setCam(V3(cx + 2.4, 2.3, dest.z + 3.4), V3(cx - 0.2, 0.7, t.home.z), { speed: 5 });
      await this.dashTo(e, dest, { pose: POSES.dash, dur: 0.26, hop: 0.15 });
      this.face(e, t.home);
      // 返す刀の構えで、切っ先を斬りつける高さまで上げる（POSES.raise だと 2頭身では切っ先が地面まで下がる）
      await this.tweenPose(m, { ...POSES.strike2, armRx: -1.8, elbowR: -0.4 }, 0.14);
      // きらりは横一文字と同じ高さに（大きな敵では、切っ先の真上の斬りつけるところに出る）
      const tip = m.tipPos();
      this.glint(V3(tip.x, mid.y, tip.z), '#fff4c8', 1.1);
      await GFX.delay(0.18);
      await this.tweenPose(m, POSES.strike2, 0.08);
      await this.sweep(m, POSES.strike, 0.16, c.col, { twist: -0.9 });
      // 横一文字：剣をふった向き（右から左）へ、細い光が敵の列をなぞっていく
      const span = Math.max(...ps.map(p => Math.abs(p.x - mid.x))) * 2, n = Math.max(2, Math.round(span / 1.1) + 2);
      for (let i = 0; i < n; i++) GFX.delay(i * 0.025).then(() => this.fx.slash(V3(mid.x + span / 2 + 0.6 - i * (span + 1.2) / (n - 1), mid.y, mid.z + 0.3), c.col, { cam: this.camera, size: 2.0, angle: 0.04, life: 0.36 }));
      for (const x of ts) this.squash(x, 0.15);
      // 勇者の光：金の星が散る
      for (let i = 0; i < 5; i++) GFX.delay(0.06 + i * 0.05).then(() => this.glint(mid.clone().add(V3((Math.random() - 0.5) * (span + 1.6), (Math.random() - 0.3) * 0.9, 0.3)), '#ffd76a', 0.5));
    },
  },
  // 流星ねこぎり：空高く跳びあがり、炎をまとって流れ星のように斬りおろす
  meteor: {
    async attack(e, ts, c) {
      const t = ts[0], m = e.model, h = e.home;
      this.focus(e); this.face(e, t.home);
      const cam = V3(h.x + 1.5, 0.45, h.z + 2.3), look = V3(h.x, 0.9, h.z - 0.4);
      this.setCam(cam, look, { snap: true });
      await this.tweenPose(m, POSES.slam, 0.16);
      Sfx.fire();
      this.fx.ring(h.clone().add(V3(0, 0.05, 0)), c.col, { r: 1.8, life: 0.45, width: 0.2 });
      this.p.burst(h.clone().add(V3(0, 0.1, 0)), '#d8c8a8', 24, { speed: 3.5, up: 0.8, life: 0.6, size: 0.12, drag: 4 });
      // 地面をけって、画面の上へ消える（カメラは見上げて追う）
      this.tweenPose(m, POSES.jump, 0.1);
      await GFX.tween(0.42, k => {
        m.group.position.y = k * 13;
        this.setCam(cam, V3(look.x, look.y + k * 9, look.z), { snap: true });
        for (let i = 0; i < 3; i++) this.p.emit(this.hitPoint(e.u), V3((Math.random() - 0.5) * 0.6, -1.5, (Math.random() - 0.5) * 0.6), hdr(c.col, 3), { life: 0.45, size: 0.14 });
      }, Ease.in);
      this.lastAttack.moved = true;
      // 敵のほうへ切りかえ。右上の空から、炎をまとって落ちてくる（落ちる道すじが画面に入るよう、左手前から引いて映す）
      const dest = this.meleeSpot(t, 0.55), top = dest.clone().add(V3(3.6, 6.5, 1.0));
      this.setCam(V3(t.home.x - 4.5, 1.4, dest.z + 5.5), V3(t.home.x + 0.6, 2.2, t.home.z), { snap: true });
      m.group.position.copy(top);
      m.group.rotation.y = Math.atan2(dest.x - top.x, dest.z - top.z);
      this.tweenPose(m, POSES.charge, 0.08);
      const glow = this.fx.sprite(this.hitPoint(e.u), c.col, 1.8, 0.6, { k: 3, grow: 1 });
      await GFX.tween(0.42, k => {
        m.group.position.lerpVectors(top, dest, k);
        glow.position.copy(this.hitPoint(e.u));
        for (let i = 0; i < 6; i++) this.p.emit(this.hitPoint(e.u).add(V3((Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.4)), V3(0, 1.2, 0), hdr(i % 2 ? '#ffd76a' : c.col, 3), { life: 0.5, size: 0.18, drag: 2 });
      }, Ease.in);
      this.face(e, t.home);
      this.tweenPose(m, POSES.cleave, 0.06);
      Sfx.slam(); GFX.shake(0.45); GFX.flash(c.col, 0.15, 0.2);
      // 着地：地面に炎の輪がひろがり、火の粉が舞いあがる（カメラが近いので、光の柱は立てない）
      const g = t.home.clone().add(V3(0, 0.05, 0)), p = this.hitPoint(t.u);
      this.fx.slash(p, c.col, { cam: this.camera, size: 3.6, angle: Math.PI / 2 - 0.5 });
      this.fx.ring(g, c.col, { r: 4.5, life: 0.7, width: 0.35 });
      this.fx.ring(g, '#ffd76a', { r: 2.6, life: 0.5, width: 0.2 });
      this.fx.shards(p, '#ffb03a', 14, 6);
      this.p.burst(g, c.col, 60, { speed: 6, up: 3, life: 0.8, size: 0.13, grav: 4 });
      await GFX.delay(0.12);
    },
  },
  // ひとけずり：敵の横から、かんなをかけるように二度すべらせる。削りぶしがひらひら舞う
  shave: {
    async attack(e, ts, c) {
      const t = ts[0], m = e.model, dest = this.meleeSpot(t, 0.55);
      this.sideCam(dest, t, 1);
      await this.dashTo(e, dest, { pose: POSES.ready, dur: 0.24, hop: 0.25 });
      this.face(e, t.home);
      const p = this.hitPoint(t.u);
      for (let i = 0; i < 2; i++) {
        await this.tweenPose(m, POSES.windup, 0.09);
        await this.tweenPose(m, POSES.cleave, 0.07);
        if (i) Sfx.swing();
        this.fx.slash(p.clone().add(V3(i ? 0.15 : -0.15, 0, 0.1)), c.col, { cam: this.camera, size: 1.5, angle: Math.PI / 2 + (i ? -0.25 : 0.25), life: 0.25 });
        this.katsuoFlakes(p, 10, { size: 0.2 });
        this.squash(t, 0.08);
      }
    },
  },
  // けずり節：その場で剣をふるうたび、削りぶしが手裏剣のようにくるくる飛んでいく
  flakes: {
    async attack(e, ts, c) {
      const t = ts[0], m = e.model, h = e.home;
      this.focus(e);   // 肩ごしに敵の列を映す（となりの仲間で隠れないように）
      this.setCam(V3(h.x - 1.6, 1.8, h.z + 2.8), V3(t.home.x * 0.6 + 0.3, 0.7, t.home.z), { speed: 5 });
      this.face(e, t.home);
      await this.tweenPose(m, POSES.windup, 0.15);
      this.katsuoFlakes(m.tipPos(), 6, { speed: 1.2 });
      await this.flakeShot(e, t, c.col);
    },
    async hop(e, te, c) { await this.flakeShot(e, te, c.col); },
  },
  // 火の粉：間合いの手前で、切っ先を地面すれすれから跳ねあげ、火の粉を浴びせる
  ember: {
    async attack(e, ts, c) {
      const t = ts[0], m = e.model, dest = e.home.clone().lerp(this.meleeSpot(t, 0.6), 0.5), mid = dest.clone().lerp(t.home, 0.5);
      this.setCam(V3(mid.x + 3.4, 1.4, mid.z + 2.0), V3(mid.x - 0.3, 0.8, mid.z - 0.1), { speed: 6 });
      await this.dashTo(e, dest, { pose: POSES.dash, dur: 0.22, hop: 0.12 });
      this.face(e, t.home);
      await this.tweenPose(m, POSES.cleave, 0.1);
      this.p.burst(m.tipPos(), hdr(c.col, 3), 10, { speed: 1.5, up: 1, life: 0.4, size: 0.1 });
      Sfx.fire();
      await this.sweep(m, POSES.windup, 0.12, c.col, { n: 4 });
      const tip = m.tipPos(), to = this.hitPoint(t.u), d = to.clone().sub(tip);
      for (let i = 0; i < 40; i++) this.p.emit(tip, d.clone().multiplyScalar(1.6 + Math.random() * 0.8).add(V3((Math.random() - 0.5) * 2, 1.5 + Math.random() * 2, (Math.random() - 0.5) * 2)), hdr(i % 3 ? c.col : '#ffd76a', 3), { life: 0.6, size: 0.1, grav: 6, drag: 0.5 });
      await Promise.all([0, 1, 2, 3].map(i => GFX.delay(i * 0.04).then(() => this.fx.projectile(tip, to.clone().add(V3((Math.random() - 0.5) * 0.7, (Math.random() - 0.5) * 0.5, 0)), c.col, { dur: 0.3, size: 0.3, arc: 0.6 + Math.random() * 0.6 }))));
      this.p.burst(to, hdr(c.col, 3), 26, { speed: 3, up: 1.5, life: 0.6, size: 0.1 });
      this.fx.sprite(to, '#ffb03a', 1.3, 0.3, { k: 3 });
    },
  },
  // 燃えうつり：斬った敵が燃えあがり、その炎がとなりの敵へ跳びうつる
  spread: {
    async attack(e, ts, c) {
      const t = ts[0], m = e.model, dest = this.meleeSpot(t, 0.7);
      this.closeCam(dest);
      await this.dashTo(e, dest, { pose: POSES.windup, dur: 0.28, hop: 0.35 });
      this.face(e, t.home);
      await this.tweenPose(m, POSES.strike, 0.08);
      const p = this.hitPoint(t.u);
      this.fx.slash(p, c.col, { cam: this.camera, size: 2.6, angle: 0.6 });
      Sfx.fire();
      this.flameUp(t, c.col);
      const adj = ts.slice(1);
      if (!adj.length) { await GFX.delay(0.2); return; }
      const cx = ts.reduce((a, x) => a + x.home.x, 0) / ts.length;
      this.setCam(V3(cx + 1.2, 3.0, t.home.z + 6.2), V3(cx, 0.9, t.home.z - 0.3), { speed: 4 });
      await GFX.delay(0.25);
      await Promise.all(adj.map((a, i) => GFX.delay(i * 0.08)
        .then(() => this.fx.projectile(p, this.hitPoint(a.u), c.col, { dur: 0.36, size: 0.8, arc: 1.5 }))
        .then(() => this.flameUp(a, c.col, 0.75))));
    },
  },
  // ぶんまわし：大剣をぐんと大きくして、体ごとひねって横になぎ払う。ねこじゃらしの穂のわた毛が散る
  bigSwing: {
    async attack(e, ts, c) {
      const t = ts[0], m = e.model, dest = this.meleeSpot(t, 1.0);
      // 右前から低く：のびた大剣と、横なぎの弧が見えるように
      this.setCam(V3(dest.x + 2.8, 1.1, dest.z + 1.6), V3(dest.x - 0.6, 0.8, dest.z - 0.9), { speed: 5 });
      await this.dashTo(e, dest, { pose: POSES.ready, dur: 0.3, hop: 0.3 });
      this.face(e, t.home);
      await Promise.all([this.tweenPose(m, POSES.strike2, 0.25), this.weaponGrow(m, 2.8, 0.25)]);
      Sfx.swing();
      this.fx.swirl(dest.clone().add(V3(0, 0.6, 0)), c.col, { r: 1.7, life: 0.4, tilt: 0, speed: 12, arc: 2.6, width: 0.08 });
      await this.sweep(m, POSES.strike, 0.22, c.col, { twist: -1.2, n: 5, size: 0.16 });
      GFX.shake(0.15);
      for (const x of ts) this.squash(x, 0.2);
      this.fluff(this.hitPoint(t.u), 24);
      GFX.delay(0.2).then(() => this.weaponGrow(m, 1, 0.25));
    },
  },
  // にゃんだー斬り：その場で大剣を高くかかげると、天までとどく光の剣になる。振りおろすと光の筋が地面を走り、敵をまっぷたつ
  nyander: {
    async attack(e, ts, c) {
      const t = ts[0], m = e.model, h = e.home;
      this.focus(e); this.face(e, t.home);
      // うしろから少し見上げて：両手で立てた剣が、空へ向かってのびていく
      this.setCam(V3(h.x + 1.5, 0.8, h.z + 4.4), V3(h.x, 2.0, h.z - 1.0), { snap: true });
      await this.tweenPose(m, POSES.swordUp, 0.25);
      m.flash(c.col, 1);
      const grow = this.weaponGrow(m, 5, 0.7);
      await this.every(0.7, 21, i => {
        const tp = m.tipPos();
        for (let j = 0; j < 2; j++) {
          const a = Math.random() * Math.PI * 2, from = tp.clone().add(V3(Math.cos(a) * 1.5, (Math.random() - 0.5) * 1.5, Math.sin(a) * 1.5));
          this.p.emit(from, tp.clone().sub(from).multiplyScalar(2.4), hdr(c.col, 3), { life: 0.4, size: 0.14, drag: 0 });
        }
        if (i % 7 === 0) this.fx.ring(h.clone().add(V3(0, 0.05, 0)), c.col, { r: 2.2, life: 0.5, width: 0.15 });
      });
      await grow;
      this.fx.sprite(m.tipPos(), c.col, 3, 0.4, { k: 3 });
      GFX.flash(c.col, 0.2, 0.25);
      await GFX.delay(0.2);
      // 斜めうしろ上から：振りおろす弧と、光の筋が地面を走って敵へとどくのが見えるように
      this.setCam(V3(h.x + 2.6, 2.2, h.z + 3.6), V3(t.home.x * 0.6 + h.x * 0.4, 0.5, t.home.z * 0.6 + h.z * 0.4), { snap: true });
      // 切りかわってすぐ振らず、光の剣をかかげたまま少しそって、ためる
      await this.tweenPose(m, { ...POSES.swordUp, lean: -0.3, hipsY: -0.12 }, 0.4);
      await GFX.delay(0.12);
      Sfx.swing();
      await this.sweep(m, POSES.cleave, 0.38, c.col, { n: 8, size: 0.2, ease: Ease.inOut });
      Sfx.slam(); GFX.shake(0.4);
      const g0 = h.clone().add(V3(0, 0.06, 0)), g1 = t.home.clone().add(V3(0, 0.06, 0));
      this.fx.beam(g0, g1, c.col, { life: 0.6, r: 0.08 });
      await this.every(0.15, 8, i => this.p.burst(g0.clone().lerp(g1, (i + 1) / 8), hdr(c.col, 3), 8, { speed: 2, up: 2, life: 0.5, size: 0.12 }));
      const p = this.hitPoint(t.u);
      // 天から地まで、細い光の線で敵をまっぷたつ
      this.fx.beam(V3(p.x, 10, p.z), V3(p.x, 0, p.z), c.col, { life: 0.45, r: 0.1 });
      this.fx.beam(V3(p.x, 10, p.z), V3(p.x, 0, p.z), '#ffffff', { life: 0.3, r: 0.035 });
      this.fx.ring(g1, c.col, { r: 4.5, life: 0.7, width: 0.3 });
      this.fx.shards(p, c.col, 16, 7);
      GFX.flash('#ffffff', 0.2, 0.25);
      GFX.delay(0.25).then(() => this.weaponGrow(m, 1, 0.3));
    },
  },
  // ---------------- クロ（刀）：影と月。ひとりで戦ってきた、静かで速い太刀すじ ----------------
  // 黒爪：低く地をすべるように踏みこみ（通った道に残像）、ひとふりで三本の爪あと
  claw: {
    async attack(e, ts, c) {
      const t = ts[0], m = e.model, dest = this.meleeSpot(t, 0.6), from = m.group.position.clone();
      this.sideCam(dest, t, 1);
      this.face(e, dest);
      this.tweenPose(m, POSES.dash, 0.1);
      let n = 0;
      await GFX.tween(0.2, (k, p) => {
        m.group.position.lerpVectors(from, dest, k);
        if (n < 3 && p >= n * 0.3) { n++; this.afterimage(e, { life: 0.35, op: 0.5 }); }
      }, Ease.inOut);
      this.lastAttack.moved = true;
      this.face(e, t.home);
      await this.tweenPose(m, POSES.windup, 0.07);
      await this.sweep(m, POSES.strike, 0.08, KURO_SHADOW, { twist: -0.8 });
      const p = this.hitPoint(t.u);
      this.clawMarks(p, c.col, { angle: 1.0, size: 2.3, gap: 0.4, life: 0.42 });
      this.p.burst(p, hdr(KURO_SHADOW, 2.5), 14, { speed: 3, life: 0.4, size: 0.1, drag: 4 });
      this.squash(t, 0.12);
    },
  },
  // 孤高の剣：敵をにらむと金の目がきらり、黒い気がたちのぼる。ひと息に踏みこんで袈裟に斬り、刀をはらう
  lone: {
    async attack(e, ts, c) {
      const t = ts[0], m = e.model, h = e.home;
      this.focus(e); this.face(e, t.home);
      // 敵がわから、ななめに顔へ寄る（前から映すカメラは snap）
      this.setCam(V3(h.x + 0.9, 0.95, h.z - 2.2), V3(h.x, 0.75, h.z), { snap: true });
      await this.tweenPose(m, { ...POSES.ready, headX: 0.18, lean: 0.12 }, 0.2);
      Sfx.tone(70, 0.6, 'sawtooth', 0.05, 30);
      this.fx.ring(h.clone().add(V3(0, 0.05, 0)), KURO_SHADOW, { r: 1.2, life: 0.6, width: 0.12 });
      await this.every(0.45, 12, () => {
        const a = Math.random() * Math.PI * 2;
        this.p.emit(V3(h.x + Math.cos(a) * 0.4, 0.1, h.z + Math.sin(a) * 0.3), V3(0, 1.6 + Math.random(), 0), hdr(KURO_SHADOW, 2), { life: 0.6, size: 0.12 });
      });
      this.glare(e);
      await GFX.delay(0.3);
      // 横から：ひと息に踏みこみ、袈裟がけの大きな一太刀
      this.unfocus();
      const dest = this.meleeSpot(t, 0.7), mid = dest.clone().add(t.home).multiplyScalar(0.5);
      this.setCam(V3(mid.x + 2.6, 1.15, mid.z + 1.1), V3(mid.x, 0.75, mid.z), { snap: true });
      await this.dashTo(e, dest, { pose: POSES.windup, dur: 0.16, hop: 0.1 });
      this.face(e, t.home);
      await this.sweep(m, POSES.strike, 0.1, c.col, { twist: -0.9, n: 5 });
      const p = this.hitPoint(t.u);
      this.fx.slash(p, c.col, { cam: this.camera, size: 3.4, angle: -0.85 });
      this.fx.slash(p, KURO_SHADOW, { cam: this.camera, size: 2.8, angle: -0.85, life: 0.45 });
      GFX.shake(0.18);
      this.squash(t, 0.2);
      await GFX.delay(0.15);
      // 血ぶり：刀を横へはらって、しずくを切る
      await this.tweenPose(m, POSES.chiburi, 0.12);
      const tp = m.tipPos();
      for (let i = 0; i < 6; i++) this.p.emit(tp, V3(0.8 + Math.random(), 0.3 + Math.random() * 0.6, (Math.random() - 0.5) * 0.6), hdr(c.col, 1.5), { life: 0.4, size: 0.05, grav: 6, drag: 0.5 });
    },
  },
  // 月影一閃：画面が夜に沈み、月が出る。居合の構えから、敵の列の手前を一瞬で駆けぬけ、刀をおさめた音のあとに、みんなが斬れる
  issen: {
    async attack(e, ts, c) {
      const m = e.model, h = e.home, cen = this.enemyCenter();
      const xs = ts.map(t => t.home.x), x0 = Math.min(...xs) - 1.8, x1 = Math.max(...xs) + 1.8;
      const z = Math.max(...ts.map(t => t.home.z + t.model.radius)) + 0.8;
      this.focus(e); this.face(e, cen);
      this.dim(1, 0.4);
      // 居合の構え：腰を落とし、刀を左の腰へ。横から低く
      this.setCam(V3(h.x + 2.1, 0.7, h.z - 0.5), V3(h.x, 0.65, h.z - 0.2), { snap: true });
      await this.tweenPose(m, POSES.iai, 0.3);
      Sfx.tone(60, 0.8, 'sawtooth', 0.05, 20);
      this.glint(m.handPos(), MOON, 0.6);
      await GFX.delay(0.45);
      // 一閃：敵の列の手前を、左から右へ（通った道に残像と、細い光の線）
      this.moonDisc(V3(cen.x - 4, 4.2, cen.z - 13), 1.3, 2.4);
      this.setCam(V3(cen.x, 1.5, z + 6.2), V3(cen.x, 0.9, cen.z), { snap: true });
      this.p.burst(this.hitPoint(e.u), hdr(KURO_SHADOW, 2), 16, { speed: 2, life: 0.4, size: 0.12 });
      const a = V3(x0, 0, z), b = V3(x1, 0, z);
      m.group.position.copy(a); this.face(e, b);
      this.lastAttack.moved = true;
      this.tweenPose(m, POSES.strike, 0.08);
      Sfx.swing();
      let n = 0;
      await GFX.tween(0.14, (k, p) => {
        m.group.position.lerpVectors(a, b, k);
        if (n < 6 && p >= n / 6) { n++; this.afterimage(e, { life: 0.5, op: 0.55 }); }
      }, Ease.out);
      const y = 0.75, len = x1 - x0, cnt = Math.round(len / 1.1) + 2;
      for (let i = 0; i < cnt; i++) this.fx.slash(V3(x0 + (i + 0.5) * len / cnt, y, z), MOON, { cam: this.camera, size: len / cnt * 1.8, angle: 0, life: 0.5 });
      // 静けさ……刀をおさめる、ちん
      await GFX.delay(0.5);
      await this.tweenPose(m, POSES.ready, 0.15);
      Sfx.tone(2400, 0.12, 'triangle', 0.06); Sfx.tone(3200, 0.25, 'sine', 0.03, 0, 0.03);
      await GFX.delay(0.1);
      // 遅れて、敵の列に横一文字
      for (const t of ts) {
        const p = this.hitPoint(t.u);
        this.fx.slash(p, c.col, { cam: this.camera, size: 4.2, angle: 0.06, life: 0.5 });
        this.fx.shards(p, MOON, 10, 6);
        this.squash(t, 0.25);
      }
      GFX.flash(MOON, 0.15, 0.3);
      this.dim(0, 0.5);   // 仲間は attackEnd の wide で戻る（ここで戻すと、命中の画の手前に映りこむ）
    },
  },
  // 受け流し：木刀を横に構えて、敵の打ちこみを受ける。火花が散って少し押され、そのまま返す刀で斬りあげる
  parry: {
    async attack(e, ts, c) {
      const t = ts[0], m = e.model, dest = this.meleeSpot(t, 0.75), wood = '#ffe0a0';
      this.sideCam(dest, t, 1);
      await this.dashTo(e, dest, { pose: POSES.ready, dur: 0.26, hop: 0.2 });
      this.face(e, t.home);
      await this.tweenPose(m, POSES.guard, 0.1);
      // 敵が打ちこんでくる
      const g = t.model.group, z0 = t.home.z;
      await GFX.tween(0.12, k => { g.position.z = z0 + k * 0.35; }, Ease.in);
      const tp = m.tipPos().lerp(m.handPos(), 0.4);
      Sfx.tone(1500, 0.14, 'square', 0.04, -300); Sfx.tone(2300, 0.1, 'triangle', 0.04);
      this.p.burst(tp, hdr(wood, 3), 22, { speed: 5, life: 0.35, size: 0.06, drag: 3 });
      this.fx.sprite(tp, '#ffffff', 0.8, 0.15, { k: 4 });
      GFX.shake(0.08);
      const back = dest.clone().add(V3(0, 0, 0.22));
      GFX.tween(0.14, k => { g.position.z = z0 + 0.35 * (1 - k); });
      await GFX.tween(0.1, k => { m.group.position.lerpVectors(dest, back, k); }, Ease.out);
      // 受けた力のまま、返す刀で斬りあげる
      await this.sweep(m, POSES.strike2, 0.09, wood, { n: 4 });
      const p = this.hitPoint(t.u);
      this.fx.slash(p, c.col, { cam: this.camera, size: 2.6, angle: -0.6 });
      this.fx.ring(p, wood, { r: 1.3, life: 0.35, face: this.camera.position, width: 0.08 });
      this.squash(t, 0.15);
    },
  },
  // 不動の壁：木刀を地面に突き立てると、仲間の前に壁が立ち、地を這う衝撃が敵のみんなへ走る
  wall: {
    async attack(e, ts, c) {
      const m = e.model, h = e.home, cen = this.enemyCenter(), wood = '#ffe0a0';
      this.focus(e); this.face(e, cen);
      // 横から：木刀を立てて、地面へ突き立てる
      this.setCam(V3(h.x + 3.0, 1.0, h.z - 0.9), V3(h.x, 0.7, h.z - 0.4), { snap: true });
      await this.tweenPose(m, POSES.swordUp, 0.22);
      m.flash(wood, 0.8);
      await GFX.delay(0.15);
      await this.tweenPose(m, POSES.plant, 0.08);
      Sfx.slam(); GFX.shake(0.3);
      const g0 = h.clone().add(V3(0, 0.05, -0.5));
      this.fx.ring(g0, wood, { r: 2.4, life: 0.5, width: 0.2 });
      this.p.burst(g0, '#d8c8a8', 30, { speed: 3.5, up: 1, life: 0.6, size: 0.12, drag: 4 });
      await GFX.delay(0.25);
      // うしろ上から：仲間の前に壁が立つ
      this.unfocus();
      this.setCam(V3(h.x + 1.2, 2.3, h.z + 3.4), V3(h.x, 0.6, h.z - 1.5), { snap: true });
      Sfx.shield();
      const xs = [...this.ents.values()].filter(x => x.ally).map(x => x.home.x);
      this.barrier(V3((Math.min(...xs) + Math.max(...xs)) / 2, 0, h.z - 0.75), Math.max(...xs) - Math.min(...xs) + 2.0, wood, 2.2);
      await GFX.delay(0.4);
      // 衝撃が地面を割って走り、敵の足もとから土を突きあげる
      this.setCam(V3(cen.x + 1.5, 3.4, h.z + 4.5), V3(cen.x, 0.5, cen.z + 0.5), { speed: 4 });
      Sfx.slam();
      await Promise.all(ts.map(t => {
        const g1 = t.home.clone().add(V3(0, 0.05, 0));
        return this.every(0.35, 9, i => {
          const q = g0.clone().lerp(g1, (i + 1) / 9);
          this.p.burst(q, '#c8b898', 10, { speed: 1.5, up: 3, life: 0.6, size: 0.16, grav: 6 });
          this.fx.ring(q, wood, { r: 0.6, life: 0.3, width: 0.1 });
        }).then(() => {
          this.p.burst(g1, '#c8b898', 40, { speed: 2.5, up: 5, life: 0.8, size: 0.2, grav: 9 });
          this.fx.ring(g1, wood, { r: 2, life: 0.4, width: 0.15 });
          this.squash(t, 0.3);
        });
      }));
      GFX.shake(0.25);
      GFX.delay(0.2).then(() => this.tweenPose(m, POSES.ready, 0.3));
    },
  },
  // 二連：右の小太刀、左の小太刀と続けて、X の字に斬る
  twin: {
    async attack(e, ts, c) {
      const t = ts[0], m = e.model, dest = this.meleeSpot(t, 0.6);
      this.sideCam(dest, t, 1);
      await this.dashTo(e, dest, { pose: POSES.windup, dur: 0.22, hop: 0.25 });
      this.face(e, t.home);
      await this.sweep(m, POSES.strike, 0.08, TWIN, { twist: -0.7 });
      this.fx.slash(this.hitPoint(t.u), c.col, { cam: this.camera, size: 2.2, angle: 0.75, life: 0.45 });
      this.squash(t, 0.08);
    },
    async restrike(e, te, i, c) {
      const m = e.model;
      this.face(e, te.home);
      await this.tweenPose(m, POSES.offStrike, 0.08);
      const p = this.hitPoint(te.u);
      this.fx.slash(p, c.col, { cam: this.camera, size: 2.2, angle: -0.75 });
      this.glint(p, TWIN, 0.6);
      this.squash(te, 0.1);
    },
  },
  // 三連影：敵のまわりを、影から影へ跳びうつりながら三度斬る。斬った場所には残像が残り、最後は三人のクロが敵をかこむ
  triple: {
    async attack(e, ts, c) {
      const t = ts[0], m = e.model;
      this.setCam(V3(t.home.x + 0.8, 2.0, t.home.z + t.model.radius + 4.2), V3(t.home.x, 0.7, t.home.z), { speed: 6 });
      await this.dashTo(e, this.ringSpot(t, -0.85), { pose: POSES.windup, dur: 0.22, hop: 0.3 });
      this.face(e, t.home);
      await this.tweenPose(m, POSES.strike, 0.07);
      this.fx.slash(this.hitPoint(t.u), c.col, { cam: this.camera, size: 2.2, angle: 0.6 });
    },
    async restrike(e, te, i, c) {
      const m = e.model, last = i === 2;
      this.afterimage(e, { life: 0.9, op: 0.8 });
      this.p.burst(this.hitPoint(e.u), hdr(KURO_SHADOW, 2), 12, { speed: 2, life: 0.35, size: 0.12 });
      Sfx.tone(300, 0.08, 'sine', 0.04, 500);
      m.group.position.copy(this.ringSpot(te, last ? 0 : 0.85));
      if (last) m.group.position.y = 1.1;
      this.face(e, te.home);
      m.setPose(last ? POSES.jump : POSES.windup);
      this.p.burst(this.hitPoint(e.u), hdr(KURO_SHADOW, 2), 12, { speed: 2, life: 0.35, size: 0.12 });
      await GFX.delay(0.05);
      const p = this.hitPoint(te.u);
      if (last) {
        GFX.tween(0.12, k => { m.group.position.y = 1.1 * (1 - k); }, Ease.in);
        await this.tweenPose(m, POSES.cleave, 0.1);
        this.fx.slash(p, c.col, { cam: this.camera, size: 2.8, angle: Math.PI / 2 - 0.15 });
        this.fx.ring(te.home.clone().add(V3(0, 0.05, 0)), KURO_SHADOW, { r: 2.2, life: 0.45, width: 0.15 });
      } else {
        await this.tweenPose(m, POSES.strike2, 0.07);
        this.fx.slash(p, c.col, { cam: this.camera, size: 2.2, angle: -0.6 });
      }
      this.squash(te, 0.1);
    },
  },
  // 月の爪：踏みこんで、月の光の三日月で斬る。傷口から赤いしずくが散る
  moonClaw: {
    async attack(e, ts, c) {
      const t = ts[0], m = e.model, dest = this.meleeSpot(t, 0.6);
      this.sideCam(dest, t, 1);
      await this.dashTo(e, dest, { pose: POSES.windup, dur: 0.24, hop: 0.3 });
      this.face(e, t.home);
      await this.sweep(m, POSES.strike, 0.1, MOON, { twist: -0.8 });
      const p = this.hitPoint(t.u);
      this.crescent(p, MOON, { r: 1.1, angle: -0.45 });
      this.fx.slash(p, c.col, { cam: this.camera, size: 1.6, angle: 0.9, life: 0.25 });
      this.bleed(p);
      this.squash(t, 0.12);
    },
  },
  // 月影斬り：足もとの影に沈み、影だけが地面をすべって敵の足もとへ。敵の影から跳びだして三日月に斬りあげ、にらみつける
  moonCut: {
    async attack(e, ts, c) {
      const t = ts[0], m = e.model, h = e.home, dest = this.meleeSpot(t, 0.55), mid = h.clone().lerp(dest, 0.55);
      this.focus(e);
      this.setCam(V3(mid.x + 6.2, 1.7, mid.z + 1.2), V3(mid.x, 0.5, mid.z - 0.2), { snap: true });
      this.face(e, t.home);
      await this.tweenPose(m, POSES.slam, 0.15);
      const pool = this.shadowPool(h, 0.75, 1.3);
      Sfx.tone(180, 0.35, 'sine', 0.05, -120);
      await GFX.tween(0.24, k => { m.group.position.y = -1.4 * k; }, Ease.in);
      this.lastAttack.moved = true;
      // 影が地面をすべる
      await GFX.tween(0.3, k => {
        pool.position.set(lerp(h.x, dest.x, k), 0.03, lerp(h.z, dest.z, k));
        for (let i = 0; i < 3; i++) this.p.emit(pool.position.clone().add(V3((Math.random() - 0.5) * 0.8, 0.05, (Math.random() - 0.5) * 0.5)), V3(0, 1.2, 0), hdr(KURO_SHADOW, 2), { life: 0.4, size: 0.1 });
      }, Ease.inOut);
      // 敵の影から、三日月に斬りあげて跳びだす
      m.group.position.set(dest.x, -1.4, dest.z); this.face(e, t.home);
      m.setPose(POSES.windup);
      Sfx.swing();
      const up = GFX.tween(0.16, k => { m.group.position.y = lerp(-1.4, 0.6, k); }, Ease.out);
      await this.sweep(m, POSES.strike2, 0.14, MOON, { n: 5 });
      const p = this.hitPoint(t.u);
      this.crescent(p, MOON, { r: 1.6, angle: Math.PI / 2 + 0.3, life: 0.5 });
      this.bleed(p, 22);
      this.squash(t, 0.2);
      await up;
      await GFX.tween(0.16, k => { m.group.position.y = 0.6 * (1 - k); }, Ease.in);
      this.tweenPose(m, { ...POSES.ready, headX: 0.15 }, 0.15);
      this.glare(e);   // 仲間は attackEnd の wide で戻る
    },
  },
  // 満月：夜空に満月がのぼる。クロは月を背に跳びあがって刀で円をえがき、敵のみんなへ三日月の刃が降りそそぐ
  fullMoon: {
    async attack(e, ts, c) {
      const m = e.model, h = e.home, cen = this.enemyCenter();
      this.focus(e); this.face(e, cen);
      this.dim(1, 0.5, [0.42, 0.48, 0.78]);
      // 横の低いところから見上げる。月はクロのうしろ
      const cam = V3(h.x + 3.6, 0.5, h.z - 1.0), top = V3(h.x, 3.0, h.z - 1.4);
      this.setCam(cam, V3(h.x, 1.0, h.z - 0.8), { snap: true });
      this.moonDisc(top.clone().add(top.clone().sub(cam).normalize().multiplyScalar(14)).add(V3(0, 1.5, 0)), 2.6, 2.0);
      await this.tweenPose(m, POSES.slam, 0.15);
      this.lastAttack.moved = true;
      this.tweenPose(m, POSES.jump, 0.1);
      const from = m.group.position.clone();
      await GFX.tween(0.4, k => {
        m.group.position.lerpVectors(from, top, Ease.out(k));
        this.setCam(cam, V3(h.x, lerp(1.0, 2.8, k), lerp(h.z - 0.8, top.z, k)), { snap: true });
        for (let i = 0; i < 2; i++) this.p.emit(this.hitPoint(e.u), V3((Math.random() - 0.5) * 0.5, -1.2, (Math.random() - 0.5) * 0.5), hdr(c.col, 2.5), { life: 0.4, size: 0.1 });
      }, Ease.linear);
      // 刀で円をえがく
      Sfx.swing();
      const ctr = this.hitPoint(e.u);
      this.fx.ring(ctr, c.col, { r: 1.7, life: 0.7, face: cam, width: 0.1 });
      this.fx.swirl(ctr, c.col, { r: 1.5, life: 0.5, tilt: Math.PI / 2, speed: 14, arc: 3.4, width: 0.06 });
      await this.sweep(m, POSES.strike2, 0.12, c.col, { n: 4 });
      await this.sweep(m, POSES.strike, 0.12, c.col, { n: 4 });
      await GFX.delay(0.2);
      // 敵がわへ切りかえ：三日月の刃が、月の光といっしょに降りそそぐ（クロはそのあいだに着地）
      m.group.visible = false;
      this.setCam(V3(cen.x + 1.2, 2.4, cen.z + 7.6), V3(cen.x, 1.4, cen.z), { snap: true });
      this.moonDisc(V3(cen.x - 4, 4.2, cen.z - 13), 1.3, 1.4);
      const drops = [];
      ts.forEach((t, i) => {
        const p = this.hitPoint(t.u);
        for (let j = 0; j < 3; j++) drops.push(GFX.delay(i * 0.06 + j * 0.13).then(() => this.crescent(p.clone().add(V3((Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.4, 0.2)), c.col, { r: 1.1 + Math.random() * 0.3, angle: Math.random() * Math.PI * 2, life: 0.4, drop: 3 })));
        GFX.delay(i * 0.06 + 0.3).then(() => this.fx.pillar(t.home, c.col, { h: 9, r: t.model.radius * 0.5 + 0.15, life: 0.5, k: 0.6 }));
      });
      await Promise.all(drops);
      await GFX.delay(0.15);
      m.group.position.copy(h); m.group.visible = true;
      m.setPose(POSES.ready);
      this.lastAttack.moved = false;
      GFX.flash(c.col, 0.2, 0.3);
      this.dim(0, 0.5);
    },
  },
  // ためぎり：その場で大きく振りかぶって力をため、一気に間合いをつめて振りおろす
  charge: {
    async attack(e, ts, c) {
      const t = ts[0], m = e.model, h = e.home;
      this.focus(e); this.face(e, t.home);
      this.setCam(V3(h.x + 1.1, 0.95, h.z - 2.3), V3(h.x, 0.8, h.z), { snap: true });
      await this.tweenPose(m, POSES.charge, 0.3);
      const tip = () => m.tipPos();
      const n = c.ult ? 24 : 16;
      await this.every(c.ult ? 0.9 : 0.6, n, i => {
        for (let j = 0; j < 2; j++) {
          const p = tip(), a = Math.random() * Math.PI * 2, from = p.clone().add(V3(Math.cos(a) * 0.8, (Math.random() - 0.3) * 0.8, Math.sin(a) * 0.8));
          this.p.emit(from, p.clone().sub(from).multiplyScalar(2.6), hdr(c.col, 3), { life: 0.38, size: 0.13, drag: 0 });
        }
        this.fx.sprite(tip(), c.col, 0.3 + i / n * 0.6, 0.15, { k: 3, grow: 1 });
        if (i % 4 === 0) this.fx.ring(h.clone().add(V3(0, 0.05, 0)), c.col, { r: 1.0, life: 0.3 });
      });
      m.flash(c.col, 1.0);
      this.fx.sprite(tip(), c.col, 1.2, 0.25, { k: 3 });
      const dest = this.meleeSpot(t, 0.7);
      this.closeCam(dest);
      await this.dashTo(e, dest, { pose: POSES.charge, dur: 0.18, hop: 0.15 });
      this.unfocus();
      this.face(e, t.home);
      await this.tweenPose(m, POSES.cleave, 0.08);
      GFX.shake(c.ult ? 0.35 : 0.22);
      const p = this.hitPoint(t.u);
      this.fx.slash(p, c.col, { cam: this.camera, size: c.ult ? 4.0 : 3.2, angle: Math.PI / 2 - 0.2 });
      this.fx.ring(t.home.clone().add(V3(0, 0.05, 0)), c.col, { r: 2.4, life: 0.5 });
      if (c.ult) { this.fx.pillar(t.home, c.col, { h: 10, r: 1.0 }); GFX.flash(c.col, 0.3, 0.3); }
    },
  },
  // 炎の大車輪：敵のまんなかへ跳びこみ、剣を伸ばして炎の輪をえがく
  spin: {
    async attack(e, ts, c) {
      const m = e.model, cen = this.enemyCenter();
      const dest = V3(cen.x, 0, Math.max(...ts.map(t => t.home.z)) + 1.6);
      this.setCam(V3(dest.x + 2.6, 2.4, dest.z + 4.2), V3(dest.x, 0.8, dest.z - 1.2), { speed: 5 });
      await this.dashTo(e, dest, { pose: POSES.jump, dur: 0.32, hop: 1.0 });
      this.tweenPose(m, POSES.spin, 0.1);
      const y0 = m.group.rotation.y, at = dest.clone().add(V3(0, 0.55, 0));
      for (let i = 0; i < 3; i++) GFX.delay(i * 0.12).then(() => this.fx.swirl(at, c.col, { r: 1.2 + i * 0.5, life: 0.6, tilt: 0, speed: 14, arc: 3.6, width: 0.06 }));
      await GFX.tween(0.6, k => {
        m.group.rotation.y = y0 + k * Math.PI * 4;
        m.group.position.y = Math.sin(k * Math.PI) * 0.25;
        for (let i = 0; i < 3; i++) { const a = Math.random() * Math.PI * 2; this.p.emit(at.clone().add(V3(Math.cos(a) * 1.4, 0, Math.sin(a) * 1.4)), V3(Math.cos(a) * 2, 1, Math.sin(a) * 2), hdr(c.col, 3), { life: 0.5, size: 0.14 }); }
      }, Ease.inOut);
      this.fx.ring(dest.clone().add(V3(0, 0.05, 0)), c.col, { r: 6, life: 0.6, width: 0.3 });
      for (const t of ts) this.fx.slash(this.hitPoint(t.u), c.col, { cam: this.camera, size: 3.0, angle: 0.1 });
      GFX.shake(0.25);
    },
  },
  // 暗黒ねこ波：笏をかかげると、足もとから闇がわいて地面に広がる。笏を突きたてると、闇が敵のむこうへ流れて、
  //   ねこの頭の形をした闇の大波が立ちあがる（とがった耳が二つ、たてに細い赤い目がぎらり）。
  //   波はふせて身がまえ、とびかかるように敵の上へくずれおちる。最後に、マオウがくっくっと笑って、ふんと鼻を鳴らす
  nekoWave: {
    async attack(e, ts, c) {
      const m = e.model, h = e.home, cen = this.enemyCenter(), vio = c.col, red = '#ff3a5a', was = m.face && m.face.expr;
      const xs = ts.map(t => t.home.x), wide = (Math.max(...xs) - Math.min(...xs)) / 2, tall = this.enemyTall();
      const topH = Math.max(...ts.map(t => t.model.height)), zFront = Math.max(...ts.map(t => t.home.z + t.model.radius));
      // ① 笏をかかげると、足もとから闇がわいて、地面に広がる
      this.focus(e); this.face(e, cen);
      this.staffCam(e);
      if (m.face) m.face.set('smug');
      await this.tweenPose(m, POSES.staffUp, 0.22);
      this.dim(1, 0.8, [0.52, 0.44, 0.64]);
      Sfx.noise(0.9, 0.06, 300); Sfx.tone(70, 1.0, 'sawtooth', 0.05, 25);
      const pool = this.shadowPool(h, 0.1, 2.2);
      await this.every(0.7, 14, i => {
        pool.scale.setScalar(0.3 + i / 13 * 1.4);
        const a = Math.random() * Math.PI * 2, r = 0.3 + Math.random() * 1.1, q = h.clone().add(V3(Math.cos(a) * r, 0.05, Math.sin(a) * r));
        this.p.emit(q, m.tipPos().sub(q).multiplyScalar(1 / 0.4), hdr(i % 3 ? vio : red, 2.4), { life: 0.4, size: 0.1, drag: 0 });
        if (i % 2 === 0) this.miasma(q, 1, { size: 0.7, up: 0.7, spread: 0.4, life: 0.7 });
      });
      this.eyeGlint(e);
      Sfx.tone(1600, 0.15, 'triangle', 0.04, -500);
      await GFX.delay(0.15);
      // 笏を突きたてる：闇が、敵のほうへ流れていく
      Sfx.swing();
      await this.sweep(m, POSES.plant, 0.14, vio, { n: 4, size: 0.14 });
      GFX.shake(0.12); Sfx.slam();
      this.fx.ring(h.clone().add(V3(0, 0.05, 0)), vio, { r: 1.8, life: 0.5, width: 0.25 });
      const p0 = pool.position.clone();
      GFX.tween(0.45, k => { pool.position.lerpVectors(p0, V3(cen.x * 0.5, 0.03, h.z - 2.2), Ease.in(k)); pool.scale.setScalar(1.7 + k); });
      await GFX.delay(0.3);
      // ② 敵のうしろから、敵ごしに見上げる：ねこの頭の形の闇の大波が立ちあがる（仲間は隠す）
      this.focus(null);
      const W = wide * 2 + 4.6, H = Math.max(3.6, topH * 1.6 + 0.8), hw = Math.min(W * 0.3, 1.4 + H * 0.3);
      const z0 = Math.min(h.z - 1.2, zFront + H * 0.4 + 1.2), zEnd = Math.max(zFront + 0.3, cen.z + H * 0.75 - 0.3);
      //   敵がわの右ななめ前から：波の顔と、前へかたむいてとびかかる形の両方が見える角度。
      //   ボスは奥（カメラのそば）に立つので、もっと横へ回って、ボスの横から波を見る
      const boss = this.b.enemies.some(x => x.def.boss), mz = (z0 + cen.z) / 2, D = 1.55 * H + wide * 0.5 + (boss ? 3.0 : 2.0), th = boss ? 1.05 : 0.7;
      this.setCam(V3(cen.x * 0.6 + Math.sin(th) * D, 1.0 + tall * 0.4, mz - Math.cos(th) * D), V3(cen.x * 0.6 - 0.3, H * 0.52, mz + 0.4), { snap: true });
      const wave = this.catWave(V3(cen.x * 0.6, 0, z0), W, H, hw), U = wave.userData;
      Sfx.noise(1.2, 0.1, 400); Sfx.tone(55, 1.4, 'sawtooth', 0.07, 15);
      await GFX.tween(0.8, k => {
        U.rise = Ease.out(k); U.lean = 0.05 + k * 0.17; wave.position.z = z0 - k * 0.3;
        if (Math.random() < 0.5) this.miasma(V3(wave.position.x + (Math.random() - 0.5) * W * 0.8, 0.2, wave.position.z - 0.4), 1, { size: 1.3, up: 0.6, spread: 0.6, life: 0.8 });
      }, Ease.linear);
      // 赤い目が、ぎらり
      Sfx.tone(1500, 0.2, 'triangle', 0.05, -600); Sfx.tone(90, 0.6, 'sawtooth', 0.06, -20);
      await GFX.tween(0.14, k => { U.eyes = Ease.back(k); });
      for (const p of wave.eyePos()) { this.fx.sprite(p, red, hw * 0.6, 0.4, { k: 3, grow: 0.6 }); this.fx.slash(p, red, { cam: this.camera, size: hw * 0.7, angle: Math.PI / 2, sym: true, life: 0.4 }); }
      // ふせて身がまえる（おしりをふるように、左右にゆれる）
      const x0 = wave.position.x;
      await GFX.tween(0.4, (k, p) => { U.crouch = Ease.inOut(Math.min(1, k * 2)); U.lean = 0.22 - U.crouch * 0.12; wave.position.x = x0 + Math.sin(p * 40) * 0.06 * U.crouch; }, Ease.linear);
      wave.position.x = x0;
      // ③ とびかかって、敵の上へくずれおちる
      Sfx.meow('maou'); Sfx.noise(0.6, 0.12, 700);
      const zB = wave.position.z;
      await GFX.tween(0.6, k => {
        U.crouch = 1 - Math.min(1, k * 3);
        U.rise = 1 + Math.sin(Math.min(1, k * 1.8) * Math.PI) * 0.25;   // のびあがって
        U.lean = 0.1 + Ease.in(k) * 1.3;                                  // 前へおおいかぶさり
        U.drop = k > 0.5 ? ((k - 0.5) / 0.5) ** 1.5 * 0.75 : 0;          // くずれおちる
        wave.position.z = lerp(zB, zEnd, Ease.inOut(k));
      }, Ease.linear);
      // がぶり
      GFX.flash(vio, 0.15, 0.3); GFX.shake(0.42);
      Sfx.slam(); this.boomSfx(1.2); Sfx.tone(42, 0.9, 'sawtooth', 0.09, -10);
      const flood = this.shadowPool(V3(cen.x, 0, cen.z), 0.1, 0.9);
      GFX.tween(0.4, k => flood.scale.setScalar((wide + 1.6) * Ease.out(k)));
      for (let i = 0; i < 3; i++) GFX.delay(i * 0.09).then(() => this.fx.ring(V3(cen.x, 0.07, cen.z), i === 1 ? red : vio, { r: W * 0.55 + i * 1.0, life: 0.6, width: 0.3 - i * 0.07, k: 2.4 }));
      for (const t of ts) {
        const hp = this.hitPoint(t.u);
        this.squash(t, 0.45);
        t.model.flash('#2a0a3a', 1.1);
        this.p.burst(hp, vio, 26, { speed: 6, up: 1.5, life: 0.6, size: 0.14 });
        this.miasma(t.home.clone().add(V3(0, 0.3, 0)), 4, { size: 1.6, up: 1.2, spread: 1.4, life: 0.9 });
        for (let j = 0; j < 8; j++) this.p.emit(t.home.clone().add(V3((Math.random() - 0.5) * 1.4, 0.1, (Math.random() - 0.5) * 1.0)), V3((Math.random() - 0.5) * 2, 3 + Math.random() * 2.5, (Math.random() - 0.5) * 2), hdr(j % 3 ? vio : red, 2.2), { life: 0.7, size: 0.13, grav: 7 });
      }
      await GFX.tween(0.45, k => { U.drop = 0.75 + k * 0.25; U.lean = 1.3 + k * 0.4; U.fade = k; U.eyes = 1 - k; });
      wave.userData.gone = true;
      await GFX.delay(0.3);
      // ④ くっくっと笑って、ふんと鼻を鳴らす（うしろに仲間が見える前からの画）
      this.unfocus();
      this.dim(0, 0.6);
      m.group.rotation.y = Math.PI + 0.2;   // 前（敵がわ）のカメラへ顔を向ける（笏の石が顔にかぶらない向き）
      this.setCam(V3(h.x - 1.0, 0.75, h.z - 2.6), V3(h.x + 0.5, 0.95, h.z + 0.8), { snap: true });
      if (m.face) m.face.set('smug');
      await this.tweenPose(m, ULT_POSES.maou.pose, 0.2);
      m.flash(vio, 0.4);
      Sfx.tone(196, 0.4, 'sawtooth', 0.04, 0); Sfx.tone(247, 0.4, 'sawtooth', 0.035, 0, 0.1);
      await this.chuckle(e, 0.55);
      this.huff(e); Sfx.puff();
      await GFX.delay(0.4);
      if (m.face) GFX.delay(0.3).then(() => { if (m.face.expr === 'smug') m.face.set(was || 'neutral'); });
      // 前からの画なので、引きの画へは切りかえて戻す（なめらかに戻すと、仲間の体を通りぬける）
      m.group.rotation.y = Math.PI;
      this.setCam(V3(0, boss ? 2.8 : 2.1, (boss ? 10.2 : 8.2) + tall), V3(0, boss ? 2.1 : 1.0, -2.5), { snap: true });
    },
  },
  // だしの大波：剣を立てると足もとにだしがわき、振りおろすと、削りぶしを乗せたこはく色の大波が巻きながら敵へ押しよせる
  dashi: {
    async attack(e, ts, c) {
      const m = e.model, h = e.home, cen = this.enemyCenter();
      this.focus(e); this.face(e, cen);
      // 足もとに、だしがわく（湯気と削りぶしが舞いあがる）
      this.setCam(V3(h.x + 2.6, 0.9, h.z + 1.3), V3(h.x - 0.1, 0.9, h.z - 0.6), { snap: true });
      await this.tweenPose(m, POSES.swordUp, 0.22);
      m.flash(DASHI, 1);
      Sfx.puff();
      this.fx.ring(h.clone().add(V3(0, 0.04, 0)), DASHI, { r: 1.6, life: 0.7, width: 0.5, k: 1.6 });
      await this.every(0.6, 12, i => {
        const a = Math.random() * Math.PI * 2, q = Math.random() * 1.1, p = h.clone().add(V3(Math.cos(a) * q, 0.05, Math.sin(a) * q));
        this.p.emit(p, V3(0, 1.4 + Math.random(), 0), hdr('#ffffff', 1.2), { life: 0.9, size: 0.22, drag: 1.5 });
        this.p.emit(p, V3(0, 0.8, 0), hdr(DASHI, 2), { life: 0.4, size: 0.1 });
        if (i % 3 === 0) this.katsuoFlakes(p.clone().add(V3(0, 0.2, 0)), 3, { speed: 1.6, size: 0.18 });
      });
      // 振りおろすと、大波が立ちあがって敵へ
      const xs = ts.map(t => t.home.x), w = Math.max(...xs) - Math.min(...xs) + 4, H = Math.max(2.4, ...ts.map(t => t.model.height * 1.4));
      const z0 = h.z - 0.6, z1 = Math.min(...ts.map(t => t.home.z)) - 0.2, midZ = (z0 + z1) / 2;
      // 敵の右前から低く見上げて：押しよせてくる波の正面（巻いた波がしら）と、のみこまれる敵を映す
      this.setCam(V3(cen.x + 5.2, 0.8, z1 - 4.2), V3(cen.x - 0.6, 1.5, midZ + 0.6), { snap: true });
      Sfx.swing();
      await this.sweep(m, POSES.cleave, 0.12, DASHI, { n: 6, size: 0.18 });
      Sfx.fire(); GFX.shake(0.15);
      const hit = new Set();
      await this.dashiWave(V3(cen.x * 0.5, 0, z0), z1, w, H, 0.85, z => {
        for (const t of ts) {
          if (hit.has(t) || z > t.home.z + t.model.radius * 0.5) continue;
          hit.add(t);
          const p = this.hitPoint(t.u);
          this.squash(t, 0.3);
          this.p.burst(p, hdr(DASHI, 2), 30, { speed: 4.5, up: 2, life: 0.8, size: 0.12, grav: 7 });
          this.katsuoFlakes(p.clone().add(V3(0, 0.4, 0)), 6, { size: 0.2 });
          for (let i = 0; i < 6; i++) this.p.emit(p.clone().add(V3((Math.random() - 0.5) * 0.8, 0, (Math.random() - 0.5) * 0.4)), V3(0, 1.5 + Math.random(), 0), hdr('#ffffff', 1.2), { life: 1.0, size: 0.28, drag: 1.2 });
        }
      });
      GFX.shake(0.2);
      await GFX.delay(0.25);
      // 敵のむこうからの画なので、引きの画へは切りかえて戻す（なめらかに戻すと、敵の体を通りぬける）
      const boss = this.b.enemies.some(x => x.def.boss);
      this.setCam(V3(0, boss ? 2.8 : 2.1, boss ? 10.2 : 8.2), V3(0, boss ? 2.1 : 1.0, -2.5), { snap: true });
    },
  },
  // 滅びの黒月：大笏に闇の光を吸いこむと、敵の頭上に、紅い光輪をまとった黒い月が生まれる。月はまわりの光を吸ってふくらみ、
  //   敵を浮かせる。笏をふりおろすと月が落ちて、闇のドームがはじけ、地面がひび割れる。
  //   最後に、紅い気をまとったマオウが、あごを上げてふんぞりかえる（余に続け）
  blackMoon: {
    async attack(e, ts, c) {
      const m = e.model, h = e.home, cen = this.enemyCenter(), vio = c.col, red = '#ff3a5a', was = m.face && m.face.expr;
      const xs = ts.map(t => t.home.x), wide = (Math.max(...xs) - Math.min(...xs)) / 2, tall = this.enemyTall();
      // ① 笏の紅い石へ、まわりの光が吸いこまれる
      this.focus(e); this.face(e, cen);
      this.staffCam(e);
      if (m.face) m.face.set('angry');
      await this.tweenPose(m, POSES.staffUp, 0.22);
      this.dim(1, 0.8, [0.42, 0.34, 0.5]);
      Sfx.tone(65, 1.1, 'sawtooth', 0.06, 30); Sfx.noise(0.9, 0.05, 300);
      const tip = m.tipPos();
      this.fx.sprite(tip, red, 0.3, 0.9, { k: 3, grow: 3 });
      await this.every(0.6, 20, i => {
        const d = V3(Math.random() - 0.5, Math.random() - 0.3, Math.random() - 0.5).normalize(), q = tip.clone().addScaledVector(d, 1.3);
        this.p.emit(q, d.multiplyScalar(-1.3 / 0.32), hdr(i % 3 ? vio : red, 2.6), { life: 0.32, size: 0.1, drag: 0 });
      });
      this.eyeGlint(e);
      Sfx.tone(1600, 0.15, 'triangle', 0.04, -500);
      await GFX.delay(0.3);
      // ② 敵の頭上に、黒い月が生まれ、光を吸ってふくらむ。敵は浮きあがってふるえる
      this.focus(null);
      //   月は一番背の高い敵の頭より上に。地面から月の光輪までが画面に収まる距離から映す（縦の画角 38°）
      const topH = Math.max(...ts.map(t => t.model.height)), R = 0.75 + wide * 0.18 + tall * 0.15, Y = Math.max(3.0, topH + 1.0) + R, M = V3(cen.x, Y, cen.z - 0.4);
      const span = Y + R * 1.6, far = span / 2 / Math.tan(19 * Math.PI / 180) + wide * 0.5;
      const moonCam = (dx, k = 1) => this.setCam(V3(cen.x + dx, span * 0.25, cen.z + far * k), V3(cen.x, span * 0.5, cen.z), { snap: true });
      moonCam(1.0);
      const moon = this.blackMoonBody(M, R);
      Sfx.tone(48, 1.6, 'sawtooth', 0.08, 12); Sfx.noise(1.4, 0.06, 500);
      const lifts = ts.map(t => ({ t, g: t.model.group, y0: t.model.group.position.y }));
      await GFX.tween(1.0, (k, p) => {
        moon.userData.size = Ease.out(Math.min(1, k * 1.6)) * (0.8 + 0.2 * k);
        // 地面とまわりから、光が月へ吸いこまれる
        for (let i = 0; i < 2; i++) {
          const a = Math.random() * Math.PI * 2, r = 2.5 + Math.random() * 2.5, q = V3(cen.x + Math.cos(a) * r, 0.2 + Math.random() * (Y - 0.5), cen.z + Math.sin(a) * r * 0.6);
          this.p.emit(q, M.clone().sub(q).multiplyScalar(1 / 0.45), hdr(Math.random() < 0.4 ? red : vio, 2.2), { life: 0.45, size: 0.11, drag: 0 });
        }
        for (const l of lifts) { l.g.position.y = l.y0 + Ease.inOut(k) * 0.5; l.g.position.x = l.t.home.x + Math.sin(p * 90 + l.t.home.x) * 0.03 * k; }
      }, Ease.linear);
      // ③ マオウが笏をふりおろす
      this.focus(e);
      this.setCam(V3(h.x + 1.9, 0.75, h.z - 1.6), V3(h.x - 0.1, 0.9, h.z - 0.4), { snap: true });
      this.eyeGlint(e);
      Sfx.swing();
      await this.sweep(m, POSES.plant, 0.14, red, { n: 4, size: 0.14 });
      this.fx.sprite(m.tipPos(), red, 1.2, 0.3, { k: 3 });
      await GFX.delay(0.3);
      // ④ 月が落ちる
      this.focus(null);
      moonCam(1.5, 1.08);
      const hitY = Math.max(R, topH * 0.45);
      Sfx.noise(0.45, 0.1, 900);
      await GFX.tween(0.32, k => {
        moon.position.y = Y + (hitY - Y) * k * k;
        moon.userData.size = 1 + k * 0.15;
        this.p.emit(moon.position.clone().add(V3((Math.random() - 0.5) * R * 2, R * 0.6, (Math.random() - 0.5) * R)), V3(0, 3, 0), hdr(red, 2.4), { life: 0.3, size: 0.12 });
      });
      for (const l of lifts) { l.g.position.y = l.y0; l.g.position.x = l.t.home.x; }
      // ⑤ 闇のドームがはじける
      moon.userData.gone = true;
      const W = Math.max(wide + 2.4, (topH + 0.6) / 0.8);   // ドーム（高さは半径の 0.8）が一番背の高い敵ものみこむ
      this.darkDome(V3(cen.x, 0, cen.z), R, W, 0.75);
      GFX.flash(red, 0.12, 0.3); GFX.shake(0.4);
      Sfx.slam(); this.boomSfx(1.4); Sfx.tone(40, 0.9, 'sawtooth', 0.09, -10);
      for (let i = 0; i < 3; i++) GFX.delay(i * 0.09).then(() => this.fx.ring(V3(cen.x, 0.07, cen.z), i === 1 ? vio : red, { r: W * 1.3 + i * 1.2, life: 0.65, width: 0.35 - i * 0.08, k: 2.5 }));
      for (const t of ts) {
        this.squash(t, 0.5);
        t.model.flash('#2a0a14', 1.2);
        this.groundCracks(t.home.clone().add(V3(0, 0.03, 0)), t.model.radius + 1.0);
        this.dustFx(t.home, 12);
        for (let j = 0; j < 6; j++) this.p.emit(t.home.clone().add(V3((Math.random() - 0.5) * 1.2, 0.1, (Math.random() - 0.5) * 1.0)), V3(0, 2.5 + Math.random() * 2, 0), hdr(j % 2 ? red : vio, 2.2), { life: 0.6, size: 0.14, grav: 5 });
      }
      this.fx.shards(V3(cen.x, hitY, cen.z), '#1a0f24', 16, 6);
      this.p.burst(V3(cen.x, hitY, cen.z), red, 40, { speed: 8, life: 0.6, size: 0.13 });
      await GFX.delay(0.75);
      // ⑥ 紅い気をまとって、あごを上げてふんぞりかえる（うしろに仲間が見える前からの画）
      this.unfocus();
      this.dim(0, 0.6);
      m.group.rotation.y = Math.PI + 0.2;   // 前（敵がわ）のカメラへ顔を向ける（笏の石が顔にかぶらない向き）
      this.setCam(V3(h.x - 1.0, 0.75, h.z - 2.6), V3(h.x + 0.5, 0.95, h.z + 0.8), { snap: true });
      if (m.face) m.face.set('smug');
      this.tweenPose(m, ULT_POSES.maou.pose, 0.22);
      m.flash(red, 0.5);
      this.fx.ring(h.clone().add(V3(0, 0.06, 0)), red, { r: 1.6, life: 0.6, width: 0.2 });
      Sfx.tone(196, 0.5, 'sawtooth', 0.05, 0); Sfx.tone(294, 0.5, 'sawtooth', 0.04, 0, 0.08);
      await this.every(0.6, 18, i => {
        const a = Math.random() * Math.PI * 2, r = 0.35 + Math.random() * 0.25;
        this.p.emit(h.clone().add(V3(Math.cos(a) * r, 0.1, Math.sin(a) * r)), V3(0, 1.6 + Math.random(), 0), hdr(i % 3 ? red : '#ffcf4a', 2.4), { life: 0.6, size: 0.1, drag: 1 });
      });
      await GFX.delay(0.15);
      if (m.face) GFX.delay(0.3).then(() => { if (m.face.expr === 'smug') m.face.set(was || 'neutral'); });
      // 前からの画なので、引きの画へは切りかえて戻す（なめらかに戻すと、仲間の体を通りぬける）
      m.group.rotation.y = Math.PI;
      const boss = this.b.enemies.some(x => x.def.boss);
      this.setCam(V3(0, boss ? 2.8 : 2.1, (boss ? 10.2 : 8.2) + tall), V3(0, boss ? 2.1 : 1.0, -2.5), { snap: true });
    },
  },
  // 魔王のいあつ：笏を立てて、黒い気をまとい、赤い目がぎらり。敵の向こうに巨大なマオウの影がそびえ、
  //   すくんだ敵の上へ、闇がずしんとのしかかる
  aura: {
    async attack(e, ts, c) {
      const m = e.model, h = e.home, cen = this.enemyCenter(), vio = c.col, was = m.face && m.face.expr;
      this.focus(e); this.face(e, cen);
      this.setCam(V3(h.x + 0.75, 0.6, h.z - 1.9), V3(h.x, 1.0, h.z), { snap: true });
      if (m.face) m.face.set('angry');
      await this.tweenPose(m, POSES.staffUp, 0.22);
      this.smokePuffs(h.clone().add(V3(0, 0.1, 0.5)), 0.3, 14, { up: 1.4, spread: 0.5, life: 0.45, dark: 0.85 });
      m.flash(vio, 1);
      Sfx.tone(90, 0.9, 'sawtooth', 0.06, -20); Sfx.noise(0.7, 0.06, 380);
      await GFX.delay(0.3);
      this.eyeGlint(e);
      Sfx.tone(1400, 0.18, 'triangle', 0.04, 500);
      await GFX.delay(0.35);
      // 敵の向こうに、巨大なマオウの影（カメラが仲間のうしろに来るので、仲間は隠す）
      this.focus(null);
      const xs = ts.map(t => t.home.x), wide = (Math.max(...xs) - Math.min(...xs)) / 2, zMin = Math.min(...ts.map(t => t.home.z)), zMax = Math.max(...ts.map(t => t.home.z));
      const S = Math.max(6, wide * 2 + 4.5) + this.enemyTall() * 0.6, sz = zMin - 2.6;
      this.setCam(V3(cen.x + 0.9, 1.5, zMax + 5.6 + wide * 0.7), V3(cen.x, 2.1, zMin - 1), { snap: true });
      const sh = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.maouShadowTex(), transparent: true, depthWrite: false, opacity: 0 }));
      this.fx.add(sh, 1.7, k => {
        const r = Ease.out(Math.min(1, k / 0.35));
        sh.scale.set(S, S, 1); sh.position.set(cen.x, S * (0.1 + 0.32 * r), sz);
        sh.material.opacity = (k < 0.25 ? k / 0.25 : k > 0.8 ? (1 - k) / 0.2 : 1) * 0.92;
      });
      Sfx.tone(55, 1.1, 'sawtooth', 0.08, 10);
      await GFX.delay(0.5);
      // 影の目が光り、敵がすくむ
      for (const s of [-1, 1]) { const p = V3(cen.x + s * S * 30 / 256, S * 0.42 + S * (0.5 - 128 / 256), sz + 0.05); this.fx.sprite(p, '#ff3a5a', S * 0.12, 0.45, { k: 3, grow: 0.5 }); }
      Sfx.tone(1800, 0.15, 'triangle', 0.04, -600);
      for (const t of ts) {
        const g = t.model.group, s0 = g.scale.clone();   // びくっとすくんで、ふるえる
        GFX.tween(0.4, k => { g.position.x = t.home.x + Math.sin(k * 70) * 0.05 * (1 - k); g.scale.set(s0.x * (1 + 0.08 * Math.sin(Math.min(1, k * 4) * Math.PI)), s0.y * (1 - 0.1 * Math.sin(Math.min(1, k * 4) * Math.PI)), s0.z); }).then(() => { g.position.x = t.home.x; g.scale.copy(s0); });
      }
      await GFX.delay(0.35);
      // 上から、闇がずしんとのしかかる
      for (const t of ts) {
        const r = t.model.radius * 1.5 + 0.3, top = t.model.height + 3.5;
        const disc = new THREE.Mesh(new THREE.PlaneGeometry(r * 2.6, r * 2.6), new THREE.MeshBasicMaterial({ map: glowTex(), color: '#1a0a24', transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide }));
        disc.rotation.x = -Math.PI / 2; disc.renderOrder = 11;
        this.fx.add(disc, 0.5, k => { const f = Math.min(1, k / 0.35); disc.position.set(t.home.x, 0.06 + top * (1 - f * f), t.home.z); disc.material.opacity = 0.8 * (k < 0.35 ? 1 : 1 - (k - 0.35) / 0.65); });
      }
      await GFX.delay(0.17);
      for (const t of ts) {
        this.squash(t, 0.45);
        this.fx.ring(t.home.clone().add(V3(0, 0.06, 0)), vio, { r: t.model.radius * 3 + 0.6, life: 0.5, width: 0.25 });
        this.dustFx(t.home, 10);
      }
      GFX.shake(0.22); GFX.flash(vio, 0.15, 0.25); Sfx.slam();
      await GFX.delay(0.2);
      if (m.face) GFX.delay(0.5).then(() => { if (m.face.expr === 'angry') m.face.set(was || 'neutral'); });
    },
  },
  // 闇の重圧（漆黒の大笏）：笏を地面に突き立てると、敵の足もとに魔法陣。天から黒い闇の柱が落ちて、敵を地面へ押しつぶし、地面がひび割れる
  gravity: {
    async attack(e, ts, c) {
      const m = e.model, h = e.home, cen = this.enemyCenter(), vio = c.col;
      this.focus(e); this.face(e, cen);
      this.setCam(V3(h.x + 2.0, 0.9, h.z - 1.0), V3(h.x - 0.1, 0.65, h.z - 0.3), { snap: true });
      await this.tweenPose(m, POSES.staffUp, 0.2);
      m.flash(vio, 1);
      await GFX.delay(0.15);
      await this.tweenPose(m, POSES.plant, 0.08);
      const foot = h.clone().add(V3(0, 0.05, -0.45));
      this.fx.ring(foot, vio, { r: 1.8, life: 0.5, width: 0.18 });
      this.groundCracks(foot, 0.9);
      this.dustFx(foot, 10);
      GFX.shake(0.15); Sfx.slam();
      await GFX.delay(0.3);
      this.focus(null);
      const xs = ts.map(t => t.home.x), wide = (Math.max(...xs) - Math.min(...xs)) / 2, zMax = Math.max(...ts.map(t => t.home.z));
      this.setCam(V3(cen.x + 1.2, 3.2 + this.enemyTall() * 0.4, zMax + 5.4 + wide * 0.6), V3(cen.x, 0.5, cen.z), { snap: true });
      for (const t of ts) this.fx.sigil(t.home.clone().add(V3(0, 0.06, 0)), vio, { r: t.model.radius * 1.6 + 0.5, life: 1.2, spin: 2 });
      Sfx.tone(70, 0.8, 'sawtooth', 0.06, 30);
      await GFX.delay(0.35);
      // 天から、重い闇の柱
      ts.forEach((t, i) => GFX.delay(i * 0.06).then(() => {
        const r = t.model.radius * 1.2 + 0.25, H = 7;
        const col = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.15, H, 28, 1, true), new THREE.MeshBasicMaterial({ map: this.fadeUpTex(), color: '#2a1238', transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide }));
        col.renderOrder = 11;
        this.fx.add(col, 0.55, k => {
          const f = Math.min(1, k / 0.3);
          col.position.set(t.home.x, H / 2 + 7 * (1 - f * f), t.home.z);
          if (k > 0.3) { const q = (k - 0.3) / 0.7; col.scale.set(1 + q * 0.5, 1, 1 + q * 0.5); col.material.opacity = 0.85 * (1 - q); }
        });
        GFX.delay(0.165).then(() => {
          this.squash(t, 0.55);
          this.groundCracks(t.home.clone().add(V3(0, 0.03, 0)), t.model.radius + 0.9);
          this.fx.ring(t.home.clone().add(V3(0, 0.06, 0)), vio, { r: t.model.radius * 3 + 0.8, life: 0.5, width: 0.3 });
          this.dustFx(t.home, 14);
          for (let j = 0; j < 6; j++) this.p.emit(t.home.clone().add(V3((Math.random() - 0.5) * 1.2, 0.1, (Math.random() - 0.5) * 1.2)), V3(0, 2 + Math.random() * 2, 0), hdr(vio, 2), { life: 0.5, size: 0.14, grav: 6 });
        });
      }));
      await GFX.delay(0.2 + ts.length * 0.06);
      GFX.shake(0.3); Sfx.slam(); Sfx.tone(50, 0.6, 'sawtooth', 0.08, -10);
      await GFX.delay(0.35);
    },
  },
  // 闇のつぶて（漆黒の大笏）：笏を立てると、先に黒い石のつぶてが三つ。笏をふるたびに一つずつ撃ちこみ、
  //   最後の一つがはじけて、となりの敵へもかけらが飛ぶ
  tsubute: {
    async attack(e, ts, c) {
      const m = e.model, h = e.home, t = ts[0], vio = c.col, red = '#ff3a5a';
      this.setCam(V3(h.x + 1.4, 1.4, h.z + 2.6), V3(t.home.x * 0.7, 0.9, t.home.z), { speed: 5 });
      this.face(e, t.home);
      await this.tweenPose(m, POSES.staffUp, 0.16);
      const tip = m.tipPos(), to = this.hitPoint(t.u);
      const stones = [0, 1, 2].map(i => {
        const g = new THREE.Group();
        const s = new THREE.Mesh(new THREE.OctahedronGeometry(i === 2 ? 0.15 : 0.11), new THREE.MeshBasicMaterial({ color: '#1a0f24' }));
        s.scale.y = 1.5; g.add(s);
        const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: hdr(red, 2.2), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); gl.scale.setScalar(0.42); gl.renderOrder = 11; g.add(gl);
        const a = i / 3 * Math.PI * 2; g.userData.at = tip.clone().add(V3(Math.cos(a) * 0.3, 0.25 + Math.sin(a) * 0.22, 0));
        g.scale.setScalar(0.01); this.fx.add(g, 1.6, (k, o, dt) => { s.rotation.y += dt * 8; });
        return g;
      });
      Sfx.tone(300, 0.2, 'triangle', 0.04, 300);
      await GFX.tween(0.18, k => stones.forEach(g => { g.position.copy(g.userData.at); g.scale.setScalar(Math.max(0.01, Ease.back(k))); }));
      await GFX.delay(0.12);
      for (let i = 0; i < 3; i++) {
        const g = stones[i], p0 = g.position.clone(), aim = to.clone().add(V3((Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3, 0)), last = i === 2;
        this.tweenPose(m, i % 2 ? POSES.staffUp : POSES.cast, 0.06);
        Sfx.noise(0.08, 0.1, 4000);
        await GFX.tween(0.13, k => { g.position.copy(p0).lerp(aim, k); this.p.emit(g.position, V3(0, 0, 0), hdr(i % 2 ? vio : red, 2), { life: 0.25, size: 0.13 }); }, Ease.in);
        g.visible = false;
        this.fx.sprite(aim, vio, last ? 1.6 : 0.8, 0.3, { k: 3 });
        this.fx.shards(aim, '#1a0f24', last ? 10 : 4, last ? 4 : 2.5);
        this.squash(t, last ? 0.25 : 0.1);
        Sfx.tone(last ? 160 : 220, 0.1, 'square', 0.05, -80);
        if (last) for (const a of ts.slice(1)) this.fx.projectile(aim, this.hitPoint(a.u), vio, { dur: 0.22, size: 0.35, arc: 0.5 });
      }
      await GFX.delay(0.15);
    },
  },
  // 稲妻：杖を掲げると、空から雷が落ちる
  bolt: {
    async attack(e, ts, c) {
      const m = e.model, h = e.home, main = ts[0];
      this.setCam(V3(h.x + 1.3, 1.4, h.z + 2.6), V3(main.home.x * 0.7, 1.4, main.home.z), { speed: 5 });
      this.face(e, main.home);
      await this.tweenPose(m, POSES.raise, 0.2);
      const tip = m.tipPos();
      this.fx.sprite(tip, c.col, 1.0, 0.35);
      this.fx.bolt(tip, tip.clone().add(V3(0, 4, 0)), c.col, { life: 0.18, segs: 8, jag: 0.15, r: 0.02 });
      Sfx.zap();
      await GFX.delay(0.15);
      this.foeCam(ts, 1.6);
      await GFX.delay(0.12);
      ts.forEach((t, i) => this.thunder(t, c.col, i === 0 ? 1.3 : 1));
    },
    async hop(e, te, c) { this.thunder(te, c.col, 1); await GFX.delay(0.06); },
  },
  // 氷：足もとに魔法陣、地面から氷柱が突き出す
  ice: {
    async attack(e, ts, c) {
      const m = e.model, h = e.home, main = ts[0];
      this.setCam(V3(h.x + 1.3, 1.4, h.z + 2.6), V3(main.home.x * 0.7, 1.0, main.home.z), { speed: 5 });
      this.face(e, main.home);
      await this.tweenPose(m, POSES.cast, 0.2);
      this.fx.swirl(m.tipPos(), c.col, { r: 0.25, life: 0.5 });
      this.foeCam(ts, 1.0);
      for (const t of ts) this.fx.sigil(t.home.clone().add(V3(0, 0.06, 0)), c.col, { r: t.model.radius * 1.8 + 0.6, life: 0.9 });
      await GFX.delay(0.3);
      ts.forEach((t, ti) => {
        const r = t.model.radius, n = ti === 0 ? 6 : 4;
        for (let j = 0; j < n; j++) {
          const a = j / n * Math.PI * 2 + Math.random() * 0.5, d = r * (0.5 + Math.random() * 0.5);
          this.fx.iceSpike(t.home.clone().add(V3(Math.cos(a) * d, 0, Math.sin(a) * d)), { h: (0.7 + Math.random() * 0.7) * Math.max(1, r), r: 0.16 * Math.max(1, r), dir: a, tilt: 0.4, life: 1.1, color: c.col });
        }
      });
      await GFX.delay(0.12);
    },
  },
  // ダイヤモンドダスト：杖を掲げると空気が凍り、きらめく氷の粒が敵のまわりで渦を巻く。
  //   粒が敵へ吸いこまれると体から氷の結晶がはじけ出し、砕けて、きらきら舞いおちる（アイス・改の「足もとの魔法陣と氷柱」とは別の見せ方）
  diamondDust: {
    async attack(e, ts, c) {
      const m = e.model, h = e.home, cen = this.enemyCenter(), tall = this.enemyTall();
      this.focus(e); this.face(e, cen);
      this.dim(1, 0.5, [0.72, 0.84, 1.0]);
      // 杖を立てると、まわりの空気から氷の粒が杖の先へ集まる
      this.staffCam(e);
      this.fx.swirl(h.clone(), '#cfefff', { r: 0.5, life: 0.7, tilt: 0.1, y0: 0.1, y1: 1.1, width: 0.015, k: 1.6 });
      await this.tweenPose(m, POSES.staffUp, 0.2);
      const tip = m.tipPos(), from = [];
      for (let i = 0; i < 36; i++) from.push(tip.clone().add(V3(Math.random() - 0.5, Math.random() * 0.8 - 0.2, -Math.random()).normalize().multiplyScalar(0.8 + Math.random() * 0.8)));   // カメラのない奥がわから
      this.frostDust(36, 0.5, (i, t, P) => { const k = Ease.in(Math.min(1, t * 1.15)); P.lerpVectors(from[i], tip, k); return Math.min(1, t * 6) * (1 - k * 0.8); }, { size: 0.045 });
      [1319, 1568, 1976, 2349].forEach((f, i) => Sfx.tone(f, 0.35, 'triangle', 0.035, 0, i * 0.09));
      await GFX.delay(0.45);
      this.glint(tip, '#e8fbff', 0.45);
      Sfx.tone(2637, 0.5, 'sine', 0.05);
      await GFX.delay(0.22);
      // 敵がわへ切りかえ：地面が白く凍りつき、無数の氷の粒がきらめきながら敵のまわりで渦を巻く
      const R = Math.max(...ts.map(t => Math.abs(t.home.x - cen.x) + t.model.radius)) + 1.2, top = 2.6 + tall;
      const camP = V3(cen.x + 1.2, 2.2 + tall * 0.5, cen.z + 7.4 + tall * 1.2), camL = V3(cen.x, 1.3 + tall * 0.4, cen.z);
      this.setCam(camP, camL, { snap: true });
      this.setCam(camP.clone().lerp(camL, 0.15), camL, { speed: 1.2 });   // ゆっくり寄る
      this.frostGround(cen.clone().add(V3(0, 0.03, 0)), R + 0.6, 2.2);
      Sfx.noise(1.3, 0.07, 5200);
      for (let i = 0; i < 2; i++) this.fx.swirl(cen.clone().add(V3(0, 0.5 + i * 1.0, 0)), '#cfefff', { r: R * (0.85 - i * 0.2), life: 1.1, tilt: 0.12, speed: 3.5, arc: 3, width: 0.012, k: 2.5, y1: 0.5 });
      const hp = ts.map(t => this.hitPoint(t.u)), N = 150, TB = 1.0, TC = 0.3;
      const mo = Array.from({ length: N }, (_, i) => ({ a: Math.random() * Math.PI * 2, r: R * (0.25 + Math.random() * 0.75), y: 0.2 + Math.random() * top, w: (1.2 + Math.random() * 1.4) * (i % 2 ? 1 : 0.8),
        to: hp[i % hp.length].clone().add(V3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(0.4)) }));
      const swirlAt = (o, sec, P) => { const a = o.a + o.w * sec, r = o.r * (1 - sec * 0.15); return P.set(cen.x + Math.cos(a) * r, o.y + Math.sin(sec * 3 + o.a) * 0.15, cen.z + Math.sin(a) * r * 0.6); };
      this.frostDust(N, TB + TC, (i, t, P) => {
        const o = mo[i], sec = t * (TB + TC);
        if (sec < TB) { swirlAt(o, sec, P); return Math.min(1, sec * 4); }
        const k = Ease.in((sec - TB) / TC);
        swirlAt(o, TB, P).lerp(o.to, k);
        return 1 - k * 0.6;
      }, { size: 0.06 });
      for (let i = 0; i < 12; i++) {
        const sec = 0.12 + i * 0.07;
        GFX.delay(sec).then(() => { this.glint(swirlAt(mo[(Math.random() * N) | 0], sec, V3()), '#ffffff', 0.45); Sfx.tone(2000 + Math.random() * 1500, 0.2, 'sine', 0.02); });
      }
      await GFX.delay(TB);
      Sfx.tone(880, 0.3, 'sine', 0.04, 1400);   // 粒が吸いこまれる
      await GFX.delay(TC);
      // 粒が敵に吸いこまれると、体から氷の結晶がはじけ出して閉じこめる
      Sfx.noise(0.25, 0.25, 6500); Sfx.tone(3200, 0.25, 'triangle', 0.04, -1200);
      const hold = 0.36;
      this.iceBloom(ts, hold);
      for (const t of ts) this.squash(t, 0.3);
      GFX.shake(0.12);
      await GFX.delay(hold);
      // 砕けて、きらきら舞いおちる（ダメージの数字が出るあいだも舞いつづける）
      Sfx.noise(0.6, 0.28, 7000); [3136, 2637, 2093].forEach((f, i) => Sfx.tone(f, 0.4, 'triangle', 0.035, -300, i * 0.05));
      for (const p of hp) this.fx.shards(p, '#bfefff', 8, 4.5);
      const M = Math.min(180, ts.length * 36), fall = Array.from({ length: M }, (_, i) => ({ p: hp[i % hp.length], v: V3(Math.random() - 0.5, Math.random() * 0.8 + 0.1, Math.random() - 0.5).normalize().multiplyScalar(1.5 + Math.random() * 3) }));
      this.frostDust(M, 1.8, (i, t, P) => {
        const o = fall[i], sec = t * 1.8, d = (1 - Math.exp(-2.5 * sec)) / 2.5;
        P.copy(o.p).addScaledVector(o.v, d); P.y -= sec * 0.35;
        return t < 0.6 ? 1 : (1 - t) / 0.4;
      }, { size: 0.055 });
      GFX.flash('#e8fbff', 0.25, 0.3);
      this.dim(0, 0.8);
      await GFX.delay(0.1);
    },
  },
  // ---------------- シロ（大ばくはつの杖）：まんがの爆発。火の玉と、もくもくの黒い煙 ----------------
  // ぼんっ：火花をちらす玉がぽーんと山なりに飛んでいき、敵の前でぼんっ（となりの敵にも小さく）
  pon: {
    async attack(e, ts, c) {
      const m = e.model, h = e.home, t = ts[0];
      this.setCam(V3(h.x + 1.3, 1.4, h.z + 2.6), V3(t.home.x * 0.7, 1.0, t.home.z), { speed: 5 });
      this.face(e, t.home);
      await this.tweenPose(m, POSES.cast, 0.18);
      const tip = m.tipPos(), to = this.hitPoint(t.u);
      this.p.burst(tip, hdr('#ffd060', 3), 10, { speed: 1.5, up: 1, life: 0.35, size: 0.07, grav: 4 });
      Sfx.toss();
      this.foeCam(ts, 0.9, 4);
      await this.fx.projectile(tip, to, c.col, { dur: 0.42, size: 0.35, arc: 1.1 });
      this.boom(to, 0.5 + t.model.radius * 0.4, { smoke: 6 });
      this.boomSfx(0.6);
      this.squash(t, 0.25);
      ts.slice(1).forEach((a, i) => GFX.delay(0.08 + i * 0.05).then(() => { this.boom(this.hitPoint(a.u), 0.3 + a.model.radius * 0.25, { smoke: 3, ring: false, sparks: 10 }); this.squash(a, 0.15); }));
      await GFX.delay(0.12);
    },
  },
  // ばくはつ魔法：杖の先で導火線のように火花がちりちり。赤い魔法の玉が敵のまんなかへ落ちて、ピッ、ピッ、ピピッと光り、敵から敵へ爆発が走る
  //   大成功（opt.boom === 'great'）は大きく、金の星が散る。自分もまきこまれたときは、技の run から B.motion(s, 'soot')
  bakuhatsu: {
    async attack(e, ts, c) {
      const m = e.model, cen = this.enemyCenter(), great = c.opt.boom === 'great', g = great ? 1.35 : 1;
      this.focus(e); this.face(e, cen);
      this.staffCam(e);
      await this.tweenPose(m, POSES.staffUp, 0.18);
      const tip = m.tipPos();
      Sfx.noise(0.5, 0.05, 6500);
      this.fx.sprite(tip, '#ffa040', 0.5, 0.5, { k: 2.5, grow: 1.4 });
      await this.every(0.45, 24, () => this.p.emit(tip, V3((Math.random() - 0.5) * 2.4, 1 + Math.random() * 1.8, (Math.random() - 0.5) * 2.4), hdr(Math.random() < 0.5 ? '#ffd060' : '#ff7a2a', 3), { life: 0.4, size: 0.12, grav: 5, drag: 0.5 }));
      this.focus(null);   // 敵がわの画では、手前の仲間を隠す
      const core = cen.clone().add(V3(0, 1.0, 0));
      this.boomCam(ts, 0);
      Sfx.toss();
      await this.fx.projectile(cen.clone().add(V3(-2.5, 6, 1.5)), core, '#ff4a2a', { dur: 0.35, size: 0.8, arc: 0 });
      // 魔法の玉：赤い玉がふくらみながら、だんだん速く白く光る
      const orb = this.magicOrb(core, 0.6);
      await GFX.delay(0.6);
      orb.visible = false;
      // ばくはつ：まんなかで大きく。そこから外へ、敵から敵へ
      this.boom(core, 1.3 * g, { smoke: 9 });
      this.boomSfx(1.2 * g);
      GFX.shake(0.25 * g);
      for (const t of ts) GFX.delay(0.05 + Math.abs(t.home.x - cen.x) * 0.04).then(() => { this.boom(this.hitPoint(t.u), (0.55 + t.model.radius * 0.4) * g, { smoke: 4, ring: false, sparks: 14 }); this.squash(t, 0.3); });
      if (great) for (let i = 0; i < 9; i++) GFX.delay(0.1 + i * 0.04).then(() => this.glint(core.clone().add(V3((Math.random() - 0.5) * 6, Math.random() * 2.2, 0.5)), '#ffd84a', 0.6));
      await GFX.delay(0.2);   // 仲間は attackEnd（wide）で戻る
    },
  },
  // ちょう大ばくはつ：画面が赤黒く沈み、杖の先へ力が集まる。玉が空へ上がって、敵のまんなかへ落ちる。
  //   真っ白に光ったあと、敵全体をのみこむ火の玉と、きのこ雲。毛が爆発するのは、技の run から B.motion(s, 'frizz')
  chouBakuhatsu: {
    async attack(e, ts, c) {
      const m = e.model, cen = this.enemyCenter(), was = m.face && m.face.expr;
      this.focus(e); this.face(e, cen);
      this.dim(1, 0.5, [0.86, 0.6, 0.55]);
      this.staffCam(e);
      if (m.face) m.face.set('joy');
      await this.tweenPose(m, POSES.staffUp, 0.2);
      const tip = m.tipPos();
      Sfx.tone(70, 1.0, 'sawtooth', 0.08, 30); Sfx.tone(300, 0.9, 'triangle', 0.04, 900);
      // 杖の先に赤い光がふくらみ、まわりから火の粉が吸いこまれる（顔にかからないよう、奥がわ・上がわから）
      const glow = this.fx.sprite(tip, '#ff5a2a', 0.2, 1.0, { k: 2.5, grow: 4 });
      this.fx.swirl(tip, '#ff6a2a', { r: 0.28, life: 0.9, tilt: 0.4, speed: 12, width: 0.008, k: 2 });
      for (let i = 0; i < 3; i++) GFX.delay(i * 0.26).then(() => this.fx.ring(e.home.clone().add(V3(0, 0.05, 0)), '#ff6a2a', { r: 1.6 - i * 0.3, life: 0.5, width: 0.1, k: 2.5 }));   // 足もとから熱の輪
      await this.every(0.85, 36, i => {
        const d = V3(Math.random() - 0.5, Math.random() * 0.8, -Math.random()).normalize().multiplyScalar(0.8 + Math.random() * 0.4);
        this.p.emit(tip.clone().add(d), d.multiplyScalar(-2.4), hdr(i % 3 ? '#ff7a2a' : '#ffd060', 3), { life: 0.36, size: 0.12, drag: 0 });
        if (i % 6 === 0) GFX.shake(0.04);
      });
      glow.visible = false;
      // 玉が空へ
      Sfx.toss(); Sfx.tone(600, 0.35, 'sine', 0.05, 1400);
      await this.fx.projectile(tip, tip.clone().add(V3(0, 5, -1)), '#ffb04a', { dur: 0.3, size: 0.5, arc: 0 });
      // 引きの画で：空から落ちてくる（手前の仲間は隠す）
      this.focus(null); if (m.face) m.face.set(was || 'neutral');
      const core = cen.clone().add(V3(0, 0.6, 0)), R = Math.max(2.2, ...ts.map(t => Math.abs(t.home.x - cen.x) + t.model.radius + 0.6));
      this.boomCam(ts, 1);
      Sfx.tone(2200, 0.5, 'sine', 0.05, -1800);
      await this.fx.projectile(cen.clone().add(V3(1.0, 10, 0)), core, '#fff0b0', { dur: 0.5, size: 1.0, arc: 0 });
      // どかーん
      GFX.flash('#ffffff', 0.6, 0.25);
      Sfx.slam(); this.boomSfx(2);
      GFX.shake(0.5);
      this.boom(core, R * 0.6, { smoke: 0, ring: false, sparks: 0, k: 1.25, life: 0.85, lumps: 9, glow: false });
      this.fx.ring(cen.clone().add(V3(0, 0.06, 0)), '#ffb060', { r: R * 2.6, life: 0.8, width: 0.4 });
      this.fx.ring(cen.clone().add(V3(0, 0.06, 0)), '#ffffff', { r: R * 1.8, life: 0.6, width: 0.2 });
      this.p.burst(core, hdr('#ffc060', 3), 90, { speed: 12, up: 0.5, life: 0.9, size: 0.14, grav: 5 });
      this.mushroom(cen, R);
      for (const t of ts) { this.squash(t, 0.35); GFX.delay(0.15 + Math.random() * 0.15).then(() => this.boom(this.hitPoint(t.u), 0.5 + t.model.radius * 0.4, { smoke: 3, ring: false, sparks: 10 })); }
      this.dim(0, 1.0);
      await GFX.delay(0.45);   // 仲間は attackEnd（wide）で戻る
    },
  },
  // 爆発のあおりで、自分もまきこまれる：煙につつまれて、すすけて、けほっ（ばくはつ魔法）
  soot: {
    async attack(e) { await this.blowback(e, false); },
  },
  // 毛が爆発：煙が晴れると、頭の毛がぼわっとふくらんでいる（ちょう大ばくはつ）
  frizz: {
    async attack(e) { await this.blowback(e, true); },
  },
  // 失敗した魔法：魚が降ってくる
  fish: {
    async attack(e, ts, c) {
      const m = e.model;
      this.foeCam(ts, 1.4, 5);
      await this.tweenPose(m, POSES.raise, 0.2);
      this.fx.sprite(m.tipPos(), '#8fd8ff', 0.8, 0.35);
      for (const t of ts) for (let i = 0; i < 3; i++) this.dropFish(t, i * 0.09 + Math.random() * 0.06);
      await GFX.delay(0.55);
    },
  },
  // 三つののろい：マオウの肩ごしに。笏の先から、三つののろいの火の玉（炎・雷・裂）が一つずつ出て、マオウのまわりを回り、
  //   順に敵へ飛びこんで、それぞれのしるしをつける
  curse3: {
    async attack(e, ts, c) {
      const m = e.model, h = e.home, t = ts[0], was = m.face && m.face.expr;
      const look = h.clone().lerp(t.home, 0.5);
      this.focus(e); this.face(e, t.home);
      this.setCam(V3(h.x - 1.5, 1.45, h.z + 2.1), V3(look.x, 0.9, look.z), { snap: true });   // マオウの肩ごしに、奥の敵まで
      if (m.face) m.face.set('smug');
      await this.tweenPose(m, POSES.staffUp, 0.2);
      this.chuckle(e, 0.4);
      Sfx.tone(700, 0.08, 'square', 0.03, 200); Sfx.tone(760, 0.08, 'square', 0.03, 200, 0.12); Sfx.tone(820, 0.08, 'square', 0.03, 200, 0.24);
      const kinds = [['#ff6a3c'], ['#ffd23c'], ['#e83a5a']], to = this.hitPoint(t.u), head = this.headPos(e).add(V3(0, 0.45, 0));
      const tip = m.tipPos(), APPEAR = 0.12, ORBIT = 0.8, GAP = 0.14, FLY = 0.32, D = ORBIT + GAP * 2 + FLY + 0.05;
      const wisps = kinds.map(([col]) => { const f = this.curseFlame(col); f.scale.setScalar(0.01); return f; });
      const done = kinds.map(() => false), g = new THREE.Group(); wisps.forEach(s => g.add(s));
      this.fx.add(g, D + 0.1, null);
      const P = V3();
      await GFX.tween(D, (_, p) => {
        const s = p * D;
        wisps.forEach((w, i) => {
          const t0 = i * APPEAR, tf = ORBIT + i * GAP;
          if (s < t0) return;
          const a = (s - t0) * 7 + i * 2.1, orbit = V3(head.x + Math.cos(a) * 0.55, head.y + Math.sin(s * 6 + i) * 0.12, head.z + Math.sin(a) * 0.45);
          if (s < tf) {
            const f = Math.min(1, (s - t0) / 0.15);
            P.copy(tip).lerp(orbit, Ease.out(f));
          } else {
            const f = Math.min(1, (s - tf) / FLY), from = V3(head.x + Math.cos((tf - t0) * 7 + i * 2.1) * 0.55, head.y, head.z + Math.sin((tf - t0) * 7 + i * 2.1) * 0.45);
            P.copy(from).lerp(to, Ease.in(f)); P.y += Math.sin(f * Math.PI) * 0.9;
            if (f >= 1 && !done[i]) {
              done[i] = true; w.visible = false;
              const [col] = kinds[i];
              this.fx.sprite(to, col, 1.1, 0.3, { k: 3 });
              this.fx.ring(to, col, { r: 0.9, life: 0.35, face: this.camera.position, width: 0.1 });
              this.p.burst(to, col, 16, { speed: 3, life: 0.5, size: 0.12 });
              this.squash(t, 0.12);
              Sfx.tone(300 + i * 160, 0.12, 'square', 0.04, -200);
            }
          }
          if (!done[i]) {
            w.position.copy(P);
            w.scale.setScalar(Math.max(0.01, Math.min(1, (s - t0) / 0.12)) * (1 + Math.sin(s * 30 + i) * 0.1));
            this.flameTrail(P, kinds[i][0]);
          }
        });
      }, Ease.linear);
      this.unfocus();
      if (m.face) GFX.delay(0.4).then(() => { if (m.face.expr === 'smug') m.face.set(was || 'neutral'); });
    },
  },
  // のろい返し：肩をゆらして笑い、笏をかかげると、敵の上にのろいの紋。三つの火の玉が敵のまわりをめぐって飛びこみ、
  //   紋から緑の稲妻が落ちる（このあと、持続ダメージがその場でもう一度はじける）
  curseBack: {
    async attack(e, ts, c) {
      const m = e.model, h = e.home, cen = this.enemyCenter(), gc = '#8aff6a', was = m.face && m.face.expr;
      this.focus(e); this.face(e, cen);
      this.setCam(V3(h.x + 0.85, 0.7, h.z - 2.0), V3(h.x, 1.0, h.z), { snap: true });
      if (m.face) m.face.set('smug');
      await this.tweenPose(m, POSES.staffUp, 0.2);
      this.chuckle(e, 0.55);
      [520, 480, 440].forEach((f, i) => Sfx.tone(f, 0.14, 'square', 0.03, -60, i * 0.16));
      this.smokePuffs(h.clone().add(V3(0, 0.1, 0.5)), 0.3, 12, { up: 1.3, spread: 0.5, life: 0.5, dark: 0.8 });
      await GFX.delay(0.6);
      this.focus(null);
      const xs = ts.map(t => t.home.x), wide = (Math.max(...xs) - Math.min(...xs)) / 2, zMax = Math.max(...ts.map(t => t.home.z)), top = 2.7 + this.enemyTall() * 0.7;
      this.setCam(V3(cen.x + 1.0, 2.0, zMax + 6.4 + wide * 0.7), V3(cen.x, 1.9, cen.z), { snap: true });
      // 敵の上に、のろいの紋
      const R = wide + 2.2, sig = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ map: this.curseSigilTex(), color: gc, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
      sig.rotation.x = -Math.PI / 2; sig.renderOrder = 11; sig.position.set(cen.x, top, cen.z);
      this.fx.add(sig, 1.9, (k, o, dt) => { sig.rotation.z += dt * 1.5; sig.scale.setScalar(R * Ease.back(Math.min(1, k * 4))); sig.material.opacity = k > 0.8 ? (1 - k) / 0.2 : 1; });
      Sfx.tone(110, 1.0, 'sawtooth', 0.05, 40);
      await GFX.delay(0.3);
      // 三つの火の玉が、敵のまわりをめぐって飛びこむ
      const kinds = ['#ff6a3c', '#ffd23c', '#e83a5a'];
      for (const t of ts) {
        const hp = this.hitPoint(t.u), r0 = t.model.radius + 0.6;
        kinds.forEach((col, i) => {
          const w = this.curseFlame(col, 1.5);
          this.fx.add(w, 0.7, k => {
            const a = k * 9 + i * 2.1, r = r0 * (1 - Ease.in(k));
            w.position.set(hp.x + Math.cos(a) * r, hp.y + 0.3 * (1 - k), hp.z + Math.sin(a) * r * 0.6);
            w.visible = k < 0.97;
            if (w.visible) this.flameTrail(w.position, col);
          });
        });
      }
      Sfx.noise(0.7, 0.05, 1800);
      await GFX.delay(0.68);
      // 紋から緑の稲妻
      ts.forEach((t, i) => GFX.delay(i * 0.05).then(() => {
        const hp = this.hitPoint(t.u);
        this.fx.bolt(V3(t.home.x, top, t.home.z), hp, gc, { life: 0.3, segs: 12, jag: 0.25, r: 0.04, k: 3 });
        this.fx.sprite(hp, gc, 2.2, 0.4, { k: 3 });
        kinds.forEach((col, j) => this.fx.ring(hp, col, { r: 1.0 + j * 0.35, life: 0.45, face: this.camera.position, width: 0.1 }));
        this.squash(t, 0.3);
      }));
      GFX.flash(gc, 0.18, 0.3); GFX.shake(0.25); Sfx.zap(); Sfx.slam();
      await GFX.delay(0.3);
      if (m.face) GFX.delay(0.5).then(() => { if (m.face.expr === 'smug') m.face.set(was || 'neutral'); });
    },
  },
  // 影分身：印を結ぶように刀を立てると、影の分身が左右へ散る。1 発目は本人と分身がはさんで斬り、2 発目からは分身が敵のまわりにあらわれて斬る
  shadow: {
    async attack(e, ts, c) {
      const t = ts[0], m = e.model, h = e.home;
      this.focus(e); this.face(e, t.home);
      this.setCam(V3(h.x + 0.5, 0.95, h.z - 2.7), V3(h.x, 0.8, h.z), { snap: true });
      await this.tweenPose(m, POSES.swordUp, 0.2);
      Sfx.warp();
      this.p.burst(h.clone().add(V3(0, 0.3, 0)), hdr(KURO_SHADOW, 2), 30, { speed: 3, up: 0.5, life: 0.6, size: 0.16, drag: 3 });
      for (const [vx, d] of [[-1, 0], [1, 0], [-2, 0.08], [2, 0.08]]) GFX.delay(d).then(() => this.afterimage(e, { life: 0.55, op: 0.75, v: V3(vx * 2.4, 0, 0) }));
      await GFX.delay(0.45);
      this.unfocus();
      const dest = this.meleeSpot(t, 0.7);
      this.closeCam(dest);
      const a = 1.1, r = t.model.radius + 0.7, side = t.home.clone().add(V3(Math.sin(a) * r, 0, Math.cos(a) * r));
      await this.dashTo(e, dest, { pose: POSES.windup, dur: 0.2, hop: 0.35 });
      this.face(e, t.home);
      this.shadowStrike(e, t, side, c.col);
      await this.tweenPose(m, POSES.strike, 0.07);
      this.fx.slash(this.hitPoint(t.u), c.col, { cam: this.camera, size: 2.6 });
    },
    async hop(e, te, c) {
      const a = (Math.random() - 0.5) * 2.4, r = te.model.radius + 0.7;
      const p = te.home.clone().add(V3(Math.sin(a) * r, 0, Math.cos(a) * r));
      await this.shadowStrike(e, te, p, c.col);
    },
  },
  // びっくり箱：笏から箱が跳んでいき、敵の前でぽんっと開く
  box: {
    async attack(e, ts, c) {
      const m = e.model, h = e.home, cen = this.enemyCenter();
      this.setCam(V3(h.x + 1.3, 1.4, h.z + 2.6), V3(cen.x * 0.7, 1.0, cen.z), { speed: 5 });
      this.face(e, cen);
      await this.tweenPose(m, POSES.raise, 0.2);
      this.p.burst(m.tipPos(), '#ffd76a', 20, { speed: 3, life: 0.6, size: 0.08 });
      Sfx.boing();
      this.foeCam(this.b.aliveEnemies().map(u => this.ent(u)).filter(Boolean), 0.8, 4);
      await this.jackBox(e, ts[0]);
    },
    async hop(e, te) { await this.jackBox(e, te); },
  },
  // 歌：まくらを抱いて歌うと、音符がふわふわ飛んでいく（子守歌は敵を、おひさまのうたは味方を）
  lullaby: {
    async attack(e, ts, c) {
      const m = e.model, h = e.home, cen = this.enemyCenter();
      const was = m.face && m.face.expr;
      this.focus(e); this.face(e, cen);
      this.setCam(V3(h.x + 0.9, 0.95, h.z - 2.1), V3(h.x, 0.75, h.z), { snap: true });
      if (m.face) m.face.set('gentle');
      Sfx.lullaby();
      await this.sing(m, 0.9, () => { const p = this.headPos(e); this.p.emit(p.clone().add(V3((Math.random() - 0.5) * 0.4, 0.2, 0)), V3(0, 0.8, 0), hdr('#fff0a8', 2), { life: 0.6, size: 0.06 }); });
      this.unfocus();
      this.foeCam(ts, 1.0, 4);
      // 音符は、カメラの手前を横切らないよう、タマと敵のなかほどから飛ばす
      const head = this.headPos(e);
      ts.forEach((t, i) => { const to = this.hitPoint(t.u).add(V3(0, 0.5, 0)), from = head.clone().lerp(to, 0.45); for (let j = 0; j < 3; j++) GFX.delay(i * 0.05 + j * 0.12).then(() => this.noteFly(from, to, 0.6)); });
      await GFX.delay(0.75);
      for (const t of ts) {
        const p = this.hitPoint(t.u).add(V3(0.2, 0.5, 0));
        for (let i = 0; i < 2; i++) GFX.delay(i * 0.2).then(() => { const z = this.zSprite(); z.position.copy(p); this.fx.add(z, 1.1, (k, o) => { o.position.y += 0.01; o.material.opacity = 1 - k; }); });
      }
      this.tweenPose(m, POSES.ready, 0.3);
      if (m.face) GFX.delay(0.5).then(() => m.face.set(was || 'neutral'));
    },
    async support(e, ts) {
      const m = e.model, h = e.home;
      const was = m.face && m.face.expr;
      this.setCam(V3(h.x * 0.3 + 0.6, 1.5, h.z - 4.6), V3(h.x * 0.3, 0.7, h.z), { snap: true });
      if (m.face) m.face.set('joy');
      Sfx.lullaby();
      for (let i = 0; i < 40; i++) this.p.emit(V3(h.x * 0.3 + (Math.random() - 0.5) * 6, 2.5 + Math.random() * 1.5, h.z + (Math.random() - 0.5) * 1.5), V3(0, -0.8, 0), hdr('#ffe08a', 2), { life: 1.6, size: 0.08, drag: 0.3 });
      let n = 0;
      await this.sing(m, 1.0, () => { const t = ts[n++ % ts.length]; if (t) this.noteFly(this.headPos(e), this.hitPoint(t).add(V3(0, 0.4, 0)), 0.6); });
      for (const t of ts) { const te = this.ent(t); if (te) this.fx.pillar(te.home, '#ffe08a', { h: 3, r: 0.35, life: 0.7, k: 0.7 }); }
      this.tweenPose(m, POSES.ready, 0.3).then(() => { m.group.rotation.y = Math.PI; });
      if (m.face) GFX.delay(0.6).then(() => m.face.set(was || 'neutral'));
    },
  },
  // かばう構え：刀を横に構えて仲間の前に立ち、光の壁を張る
  guard: {
    async support(e, ts, c) {
      const m = e.model, h = e.home;
      this.face(e, this.enemyCenter());
      this.setCam(V3(h.x + 0.9, 2.0, h.z + 2.9), V3(h.x, 0.6, h.z - 1.2), { speed: 4 });   // うしろ上から：仲間の前に壁が立つのが見えるように
      await this.tweenPose(m, POSES.guard, 0.18);
      Sfx.shield();
      m.flash('#b8c6ff', 0.8);
      const xs = [...this.ents.values()].filter(x => x.ally).map(x => x.home.x);
      this.barrier(V3((Math.min(...xs) + Math.max(...xs)) / 2, 0, h.z - 0.75), Math.max(...xs) - Math.min(...xs) + 1.6, '#9fd8ff');
      this.fx.ring(h.clone().add(V3(0, 0.05, 0)), '#9fd8ff', { r: 1.8, life: 0.5 });
      GFX.shake(0.06);
      await GFX.delay(0.45);
      this.tweenPose(m, POSES.ready, 0.3).then(() => { m.group.rotation.y = Math.PI; });
    },
  },
  // なでなで：相手のとなりまでとことこ歩いていき、頭をなでる
  pat: {
    async support(e, ts) {
      const m = e.model, t = ts[0], te = t && this.ent(t);
      if (!te || te === e) return MOVES.hug.support.call(this, e, ts);
      const side = Math.sign(e.home.x - te.home.x) || 1;
      const dest = te.home.clone().add(V3(side * 0.62, 0, -0.18));
      this.setCam(V3((te.home.x + dest.x) / 2 + side * 0.4, 1.15, te.home.z - 2.9), V3((te.home.x + dest.x) / 2, 0.75, te.home.z), { snap: true });
      await this.walkTo(e, dest, 0.4);
      this.face(e, te.home);
      const tm = te.model, was = [m.face && m.face.expr, tm.face && tm.face.expr];
      if (m.face) m.face.set('gentle');
      if (tm.face) tm.face.set('joy');
      for (let i = 0; i < 3; i++) {
        await this.tweenPose(m, POSES.patUp, 0.11);
        await this.tweenPose(m, POSES.patDown, 0.11);
        if (i === 1) this.heart(this.headPos(te).add(V3(0, 0.45, 0)));
      }
      GFX.delay(0.5).then(async () => {
        if (m.face) m.face.set(was[0] || 'neutral');
        if (tm.face) tm.face.set(was[1] || 'neutral');
        await this.walkTo(e, e.home, 0.35);
        m.group.rotation.y = Math.PI;
      });
    },
  },
  // みんなでぎゅっ：腕を大きく広げて、みんなをぎゅっ（ひとりでも、まくらをぎゅっ）
  hug: {
    async support(e, ts) {
      const m = e.model, h = e.home, all = ts.map(t => this.ent(t)).filter(Boolean);
      const was = m.face && m.face.expr;
      this.setCam(V3(h.x * 0.3 + 0.4, 1.4, h.z - 4.2), V3(h.x * 0.3, 0.7, h.z), { snap: true });
      m.group.rotation.y = Math.PI;
      if (m.face) m.face.set('joy');
      await this.tweenPose(m, all.length > 1 ? POSES.open : POSES.cheer, 0.25);
      await GFX.delay(0.15);
      await this.tweenPose(m, POSES.hugPillow, 0.12);
      Sfx.fluff();
      for (const x of all) {
        const g = x.model.group;
        if (x !== e) GFX.tween(0.3, k => { g.position.y = Math.sin(k * Math.PI) * 0.18; });
        this.heart(this.headPos(x).add(V3(0, 0.45, 0)));
      }
      await GFX.delay(0.4);
      this.tweenPose(m, POSES.ready, 0.3).then(() => { m.group.rotation.y = Math.PI; });
      if (m.face) GFX.delay(0.4).then(() => m.face.set(was || 'neutral'));
    },
  },
  // もふもふ応援：相手のほうを向いて、まくらを振って応援する
  cheer: {
    async support(e, ts) {
      const m = e.model, h = e.home, te = ts[0] && this.ent(ts[0]);
      const was = m.face && m.face.expr;
      const mid = te ? te.home.clone().add(h).multiplyScalar(0.5) : h, span = te ? Math.abs(te.home.x - h.x) : 0;
      this.setCam(V3(mid.x + 0.3, 1.2, h.z - Math.max(3.2, span * 1.3 + 1.6)), V3(mid.x, 0.75, h.z), { snap: true });
      if (te) this.face(e, te.home);
      if (m.face) m.face.set('joy');
      for (let i = 0; i < 3; i++) {
        await this.tweenPose(m, { ...POSES.cheer, twist: 0.25, armLz: 0.9, armRz: -0.2 }, 0.13);
        await this.tweenPose(m, { ...POSES.cheer, twist: -0.25, armLz: 0.2, armRz: -0.9 }, 0.13);
        this.p.burst(m.tipPos(), '#ffd76a', 10, { speed: 2, up: 1, life: 0.6, size: 0.08 });
      }
      if (te) { this.fx.beam(m.tipPos(), this.hitPoint(te.u), '#ffd76a', { life: 0.4, r: 0.03 }); te.model.flash('#ffd76a', 0.8); this.p.burst(this.hitPoint(te.u), '#ffd76a', 30, { speed: 3, up: 1, life: 0.8, size: 0.09 }); }
      await GFX.delay(0.2);
      this.tweenPose(m, POSES.ready, 0.3).then(() => { m.group.rotation.y = Math.PI; });
      if (m.face) GFX.delay(0.4).then(() => m.face.set(was || 'neutral'));
    },
  },
  // まくらの砦：みんなの前に、まくらがどさどさ降ってきて砦になる
  fort: {
    async support(e, ts) {
      const m = e.model, h = e.home;
      this.setCam(V3(h.x * 0.3 + 0.5, 1.6, h.z - 4.6), V3(h.x * 0.3, 0.6, h.z), { snap: true });
      await this.tweenPose(m, POSES.cheer, 0.25);
      this.p.burst(m.tipPos(), '#ffffff', 16, { speed: 2, up: 1, life: 0.6, size: 0.08 });
      const w = WEAPONS[equippedWeapon(e.u.key)], col = (w.look && w.look.c) || '#ffe0ea';
      ts.forEach((t, i) => { const x = this.ent(t); if (x) for (let j = 0; j < 3; j++) this.dropPillow(x.home.clone().add(V3((j - 1) * 0.32, 0, -0.55)), j === 1 ? 0.26 : 0, col, i * 0.08 + j * 0.06); });
      await GFX.delay(0.7);
      Sfx.fluff();
      this.tweenPose(m, POSES.ready, 0.3);
    },
  },
  // 魔法の失敗「かき氷」：みんなの頭の上に雪がふる
  snow: {
    async support(e, ts) {
      const m = e.model, h = e.home;
      this.setCam(V3(h.x * 0.3 + 0.5, 1.6, h.z - 4.6), V3(h.x * 0.3, 0.8, h.z), { snap: true });
      await this.tweenPose(m, POSES.raise, 0.2);
      for (const t of ts) { const x = this.ent(t); if (!x) continue; for (let i = 0; i < 20; i++) this.p.emit(x.home.clone().add(V3((Math.random() - 0.5) * 0.8, 1.8 + Math.random() * 0.6, (Math.random() - 0.5) * 0.6)), V3(0, -1.2, 0), hdr('#ffffff', 2), { life: 1.0, size: 0.07, drag: 0.3 }); }
      await GFX.delay(0.6);
      this.tweenPose(m, POSES.ready, 0.3);
    },
  },
  // なにが出るかな：おもちゃの笏をふると、ピコピコ鳴って紙ふぶきが出る
  surprise: {
    async attack(e) {
      const m = e.model, h = e.home;
      this.focus(e); this.face(e, this.enemyCenter());
      this.setCam(V3(h.x + 0.8, 0.9, h.z - 2.2), V3(h.x, 0.85, h.z), { snap: true });
      for (let i = 0; i < 2; i++) { await this.tweenPose(m, POSES.raise, 0.12); Sfx.boing(); await this.tweenPose(m, POSES.cast, 0.12); }
      const cols = ['#ff6a8a', '#ffd76a', '#6ad8ff', '#8aff8a'];
      for (let i = 0; i < 40; i++) this.p.emit(m.tipPos(), V3((Math.random() - 0.5) * 3, 2 + Math.random() * 2, (Math.random() - 0.5) * 3), hdr(pick(cols), 2.5), { life: 1.0, size: 0.09, grav: 4, drag: 1 });
      await GFX.delay(0.3);
      this.unfocus();
    },
  },
  // ピコピコハンマー：敵の頭の上に大きなハンマーがあらわれて、ピコッ
  hammer: {
    async attack(e, ts) {
      this.foeCam(ts, 1.2, 5);
      await Promise.all(ts.map((t, i) => GFX.delay(i * 0.1).then(() => this.toyHammer(t))));
    },
  },
  // おおきなパンチ：大きなグローブが飛んでいく
  glove: {
    async attack(e, ts, c) {
      const m = e.model, h = e.home, t = ts[0];
      this.setCam(V3(h.x + 1.3, 1.6, h.z + 2.8), V3(t.home.x * 0.7, 1.0, t.home.z), { speed: 5 });
      this.face(e, t.home);
      await this.tweenPose(m, POSES.cast, 0.15);
      const g = new THREE.Group(), mat = toon('#ff4a5a');
      const fist = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 12), mat); fist.scale.set(1, 0.9, 1.15); g.add(fist);
      const thumb = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), mat); thumb.position.set(0.3, 0.05, 0.1); g.add(thumb);
      const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.25, 14), toon('#ffffff')); cuff.rotation.x = Math.PI / 2; cuff.position.z = -0.42; g.add(cuff);
      const from = m.tipPos(), to = this.hitPoint(t.u);
      g.position.copy(from); g.lookAt(to);
      await new Promise(res => this.fx.add(g, 0.5, k => {
        const f = Math.min(1, k / 0.6);
        g.position.lerpVectors(from, to, Ease.in(f));
        g.scale.setScalar(k < 0.6 ? 0.5 + f * 0.7 : 1.2 * (1 - (k - 0.6) / 0.4));
        if (f >= 1 && !g.userData.hit) { g.userData.hit = true; res(); }
      }));
      this.squash(t, 0.35);
      Sfx.boing();
    },
  },
  // こちょこちょ：敵のまわりで羽根がくすぐる
  tickle: {
    async attack(e, ts) {
      this.foeCam(ts, 0.9, 5);
      for (const t of ts) {
        const p = this.hitPoint(t.u);
        for (let i = 0; i < 2; i++) {
          const f = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), toon('#fff4fa')); f.scale.set(0.35, 1.6, 0.2);
          const s = i ? 1 : -1, base = p.clone().add(V3(s * (t.model.radius + 0.1), -0.1, 0.3));
          this.fx.add(f, 1.1, k => { f.position.copy(base).add(V3(Math.sin(k * 40) * 0.08, Math.sin(k * 25) * 0.05, 0)); f.rotation.z = s * 0.6 + Math.sin(k * 40) * 0.5; f.scale.setScalar(k > 0.8 ? (1 - k) * 5 : 1).multiply(V3(0.35, 1.6, 0.2)); });
        }
        const g = t.model.group, x0 = g.position.x;
        GFX.tween(1.0, k => { g.position.x = x0 + Math.sin(k * 50) * 0.04 * (1 - k); });
      }
      Sfx.laugh();
      await GFX.delay(1.0);
    },
  },
  // がんばれの旗：みんなのうしろに小さな旗が立つ
  flag: {
    async support(e, ts) {
      const m = e.model, h = e.home;
      this.setCam(V3(h.x * 0.3 + 0.5, 1.5, h.z - 4.4), V3(h.x * 0.3, 0.8, h.z), { snap: true });
      await this.tweenPose(m, POSES.raise, 0.2);
      Sfx.horn(0.6);
      ts.forEach((t, i) => {
        const x = this.ent(t); if (!x) return;
        const g = new THREE.Group(), pole = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.7, 6), toon('#c8a060')); pole.position.y = 0.35; g.add(pole);
        const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.18), toon(['#ff6a8a', '#ffd76a', '#6ad8ff', '#8aff8a'][i % 4], { side: THREE.DoubleSide })); cloth.position.set(0.14, 0.6, 0); g.add(cloth);
        g.position.copy(x.home).add(V3(0.32, 0, 0.3));
        this.fx.add(g, 1.6, k => { g.scale.setScalar(Ease.back(Math.min(1, k * 5)) * (k > 0.85 ? (1 - k) / 0.15 : 1)); cloth.rotation.y = Math.sin(k * 20) * 0.3; });
      });
      await GFX.delay(0.6);
      this.tweenPose(m, POSES.ready, 0.3);
    },
  },
  // ---------------- 友情技（コンボスキル） ----------------
  // にゃんこブレイク：ミケとクロが敵の左右へ跳びこみ、ミケが斬り上げ、クロが返す刀で十字に斬る
  pairIn: {
    async attack(e, ts, c) {
      const t = ts[0], k = this.allyEnt('kuro'), r = t.model.radius + 0.6;
      const L = t.home.clone().add(V3(-r * 0.75, 0, r * 0.7)), R = t.home.clone().add(V3(r * 0.75, 0, r * 0.7));
      this.setCam(V3(t.home.x + 0.6, 1.3, t.home.z + r + 3.4), V3(t.home.x, 0.8, t.home.z), { snap: true });
      await Promise.all([this.dashTo(e, L, { pose: POSES.windup, dur: 0.3, hop: 0.4 }), k && k.u.alive ? GFX.delay(0.06).then(() => this.dashTo(k, R, { pose: POSES.windup, dur: 0.3, hop: 0.4 })) : null]);
      this.face(e, t.home); if (k) this.face(k, t.home);
      await this.tweenPose(e.model, POSES.strike, 0.08);
      this.fx.slash(this.hitPoint(t.u), c.col, { cam: this.camera, size: 3, angle: 0.75 });
    },
  },
  pairX: {
    keep: true,
    async attack(e, ts, c) {
      const t = ts[0];
      if (!this.partners.has(e) && !this.lastAttack.moved) await this.dashTo(e, this.meleeSpot(t, 0.6), { dur: 0.25 });
      this.face(e, t.home);
      await this.tweenPose(e.model, POSES.strike2, 0.08);
      const p = this.hitPoint(t.u);
      this.fx.slash(p, c.col, { cam: this.camera, size: 3, angle: -0.75 });
      GFX.delay(0.08).then(() => {
        this.fx.slash(p, '#ffffff', { cam: this.camera, size: 4.2, angle: 0.75 });
        this.fx.slash(p, '#ffffff', { cam: this.camera, size: 4.2, angle: -0.75 });
        this.fx.ring(p, '#ffcf4a', { r: 2.2, life: 0.5, face: this.camera.position, width: 0.12 });
        this.fx.shards(p, '#ffcf4a', 14, 5);
        GFX.flash('#fff4c8', 0.3, 0.25); GFX.shake(0.3);
      });
      await GFX.delay(0.15);
    },
  },
  // ファイアボール：ミケが魚を放り投げ、シロの炎で大きな火の玉になって敵へ落ちる
  fireball: {
    async attack(e, ts, c) {
      const mk = this.allyEnt('mike'), cen = this.enemyCenter(), h = e.home;
      const mid = V3((h.x + cen.x) / 2, 0, (h.z + cen.z) / 2);
      this.setCam(V3(mid.x + 3.0, 2.0, h.z + 3.8), V3(mid.x - 0.4, 1.7, mid.z - 0.4), { snap: true });
      this.face(e, cen);
      const top = V3(mid.x, 3.2, mid.z - 0.4);
      let fish = null;
      if (mk && mk.u.alive) {
        this.face(mk, cen);
        await this.tweenPose(mk.model, { ...POSES.windup, armLx: 0.6 }, 0.18);
        await this.tweenPose(mk.model, POSES.strike, 0.08);
        Sfx.swing();
        fish = this.flyFish(mk.model.handPos(), top, 0.5);
      }
      await this.tweenPose(e.model, POSES.raise, 0.25);
      await GFX.delay(fish ? 0.12 : 0);
      // 火がつく：杖から炎が走り、魚が大きな火の玉になる
      this.fx.bolt(() => e.model.tipPos(), top, c.col, { life: 0.25, segs: 10, jag: 0.12, r: 0.03 });
      Sfx.fire();
      await GFX.delay(0.12);
      const ball = this.fx.sprite(top, c.col, 1.2, 2.0, { k: 6, grow: 1 });
      this.fx.add(new THREE.Object3D(), 0.35, k => { ball.scale.setScalar(1.2 + Ease.out(k) * 1.6); for (let i = 0; i < 4; i++) this.p.emit(top, V3((Math.random() - 0.5) * 3, Math.random() * 2, (Math.random() - 0.5) * 3), hdr(c.col, 3), { life: 0.4, size: 0.16 }); });
      await GFX.delay(0.35);
      this.setCam(V3(cen.x + 1.2, 2.2, cen.z + 6.4), V3(cen.x, 1.0, cen.z), { speed: 6 });
      const land = cen.clone().add(V3(0, 0.5, 0));
      await this.fx.projectile(top, land, c.col, { dur: 0.3, size: 2.6, arc: 0.4 });
      ball.visible = false;
      this.fx.ring(cen.clone().add(V3(0, 0.05, 0)), c.col, { r: 6, life: 0.7, width: 0.4 });
      this.fx.sprite(land, c.col, 7, 0.5, { k: 3 });
      for (const t of ts) this.fx.pillar(t.home, c.col, { h: 5, r: t.model.radius * 0.9 + 0.3, life: 0.6, k: 2 });
      this.p.burst(land, c.col, 100, { speed: 9, up: 0.8, life: 0.8, size: 0.14 });
      GFX.flash(c.col, 0.3, 0.3); GFX.shake(0.3);
      if (mk) { mk.model.group.rotation.y = Math.PI; this.tweenPose(mk.model, POSES.ready, 0.3); }   // 相方の向きを戻す（attackEnd はシロだけ）
    },
  },
  // 黒白連撃：クロは敵から敵へ跳びまわって斬り、シロはうしろから雷の矢で続く。カメラは引きの一枚のまま
  kokubyaku: {
    keep: true,
    async attack(e, ts, c) {
      const t = ts[0], k = this.allyEnt('kuro'), sh = this.allyEnt('shiro'), cen = this.enemyCenter();
      for (const x of this.ents.values()) if (x.ally) x.model.group.visible = x === k || x === sh;
      const ax = sh ? sh.home.x : 0;
      this.setCam(V3(ax + 3.6, 3.2, 5.4), V3((ax + cen.x) / 2 - 0.4, 0.6, cen.z + 1.2), { snap: true });
      if (CHARS[e.u.key].gear.style === 'melee') {
        const a = (Math.random() - 0.5) * 1.6, r = t.model.radius + 0.6;
        await this.dashTo(e, t.home.clone().add(V3(Math.sin(a) * r, 0, Math.cos(a) * r)), { pose: POSES.windup, dur: 0.2, hop: 0.5 });
        this.face(e, t.home);
        await this.tweenPose(e.model, Math.random() < 0.5 ? POSES.strike : POSES.strike2, 0.07);
        this.fx.slash(this.hitPoint(t.u), c.col, { cam: this.camera, size: 2.4 });
      } else {
        this.face(e, t.home);
        await this.tweenPose(e.model, POSES.cast, 0.1);
        this.fx.bolt(e.model.tipPos(), this.hitPoint(t.u), c.col, { life: 0.18, segs: 12, jag: 0.12, r: 0.025 });
        this.fx.sprite(this.hitPoint(t.u), c.col, 1.4, 0.2, { k: 4 });
        Sfx.zap();
        await GFX.delay(0.08);
      }
    },
  },
  // にゃんにゃんヒール：みんなでこちらを向いて声を合わせ、音符と光が一行をつつむ
  chorus: {
    async support(e, ts) {
      const all = [...this.ents.values()].filter(x => x.ally && x.u.alive);
      const cx = all.reduce((a, x) => a + x.home.x, 0) / all.length, z = e.home.z;
      const was = all.map(x => x.model.face && x.model.face.expr);
      this.setCam(V3(cx + 0.4, 1.3, z - 4.6), V3(cx, 0.7, z), { snap: true });
      all.forEach(x => { x.model.group.rotation.y = Math.PI; if (x.model.face) x.model.face.set('joy'); });   // 敵がわのカメラのほうを向く
      Sfx.lullaby();
      await Promise.all(all.map((x, i) => GFX.delay(i * 0.05).then(() => this.sing(x.model, 1.0, n => { if (n % 2 === i % 2) this.noteFly(this.headPos(x), this.headPos(x).add(V3((Math.random() - 0.5) * 0.6, 1.2, 0)), 0.8); }))));
      this.fx.ring(V3(cx, 0.05, z), '#6dff9e', { r: Math.max(3, all.length * 0.8), life: 0.8, width: 0.25 });
      for (let i = 0; i < 60; i++) this.p.emit(V3(cx + (Math.random() - 0.5) * all.length * 1.3, Math.random() * 0.4, z + (Math.random() - 0.5)), V3(0, 1.5 + Math.random() * 1.5, 0), hdr(i % 2 ? '#6dff9e' : '#ffe08a', 2.5), { life: 1.0, size: 0.1, drag: 1 });
      GFX.flash('#e8ffe8', 0.2, 0.4);
      await GFX.delay(0.3);
      all.forEach((x, i) => { this.tweenPose(x.model, POSES.ready, 0.3).then(() => { x.model.group.rotation.y = Math.PI; }); if (x.model.face) GFX.delay(0.4).then(() => x.model.face.set(was[i] || 'neutral')); });
    },
  },
  // 魔王の号令：マオウが笏を振りあげて号令をかけ、みんなが拳をあげて奮い立つ。そして闇の波が敵へ
  gorei: {
    async attack(e, ts, c) {
      const m = e.model, h = e.home, cen = this.enemyCenter();
      const all = [...this.ents.values()].filter(x => x.ally && x.u.alive);
      const was = m.face && m.face.expr;
      this.focus(e);
      this.setCam(V3(h.x + 0.6, 0.6, h.z - 2.0), V3(h.x, 1.0, h.z), { snap: true });
      m.group.rotation.y = Math.PI;
      if (m.face) m.face.set('angry');
      await this.tweenPose(m, POSES.raise, 0.2);
      m.flash(c.col, 1);
      this.fx.ring(this.headPos(e), '#ffcf4a', { r: 1.6, life: 0.5, face: this.camera.position, width: 0.08 });
      GFX.delay(0.12).then(() => this.fx.ring(this.headPos(e), '#ffcf4a', { r: 2.4, life: 0.5, face: this.camera.position, width: 0.06 }));
      Sfx.horn(0.8);
      GFX.shake(0.1);
      await GFX.delay(0.45);
      // みんなが奮い立つ
      this.unfocus();
      const cx = all.reduce((a, x) => a + x.home.x, 0) / all.length;
      this.setCam(V3(cx + 0.4, 1.2, h.z - 4.4), V3(cx, 0.75, h.z), { snap: true });
      all.forEach((x, i) => {
        x.model.group.rotation.y = Math.PI;
        if (x !== e && x.model.face) x.model.face.set('joy');
        GFX.delay(i * 0.06).then(() => { this.tweenPose(x.model, POSES.victory, 0.15); GFX.tween(0.3, k => { x.model.group.position.y = Math.sin(k * Math.PI) * 0.25; }); });
        for (let j = 0; j < 14; j++) this.p.emit(x.home.clone().add(V3((Math.random() - 0.5) * 0.7, 0.1, (Math.random() - 0.5) * 0.5)), V3(0, 2.5 + Math.random() * 2, 0), hdr('#ffcf4a', 2.5), { life: 0.8, size: 0.1 });
        x.model.flash('#ffcf4a', 0.7);
      });
      await GFX.delay(0.65);
      all.forEach(x => { x.model.group.rotation.y = Math.PI; this.tweenPose(x.model, POSES.ready, 0.2); if (x !== e && x.model.face) x.model.face.set('neutral'); });
      // 闇の波
      this.focus(e);
      this.setCam(V3(h.x + 1.8, 1.6, h.z + 2.6), V3(cen.x, 0.7, cen.z), { snap: true });
      this.face(e, cen);
      await this.tweenPose(m, POSES.cleave, 0.1);
      const far = Math.max(...ts.map(t => h.distanceTo(t.home))) + 1.5;
      this.waveFx(h, c.col, { to: far, dur: 0.55 });
      GFX.delay(0.1).then(() => this.waveFx(h, '#ffcf4a', { to: far, dur: 0.55, h: 0.7 }));
      GFX.shake(0.15);
      await GFX.delay(0.45);
      this.unfocus();
      if (m.face) m.face.set(was || 'neutral');
      // 友情技の attackEnd は最後の子（マオウではない）なので、ここで向きを戻す
      m.group.rotation.y = Math.PI; this.tweenPose(m, POSES.ready, 0.3);
    },
  },
};

Object.assign(BattleView.prototype, {
  // いま使っている技の anim（技の run から opt.anim で差しかえられる）
  animOf(opt = {}) { return opt.anim || (this.b.curAb && this.b.curAb.anim) || null; },
  allyEnt(key) { return [...this.ents.values()].find(x => x.ally && x.u.key === key) || null; },
  // ---------- ミケの技の部品 ----------
  // 剣をふりぬく：ポーズへ寄せながら、切っ先の通り道に光の粒を残す（twist で、ひねりをポーズより大きく）
  sweep(m, pose, dur, col, { twist = pose.twist || 0, n = 3, size = 0.12, ease = Ease.in } = {}) {
    const from = { ...m.pose }, c = hdr(col, 3);
    return GFX.tween(dur, k => {
      for (const key of POSE_KEYS) m.pose[key] = lerp(from[key], pose[key] || 0, k);
      m.pose.twist = lerp(from.twist, twist, k);
      const tp = m.tipPos();
      for (let i = 0; i < n; i++) this.p.emit(tp, V3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(0.4), c, { life: 0.3, size, drag: 4 });
    }, ease);
  },
  // きらり：十字の光（真ん中が p にくるよう、光の中心がまんなかの模様で。地面すれすれでも下半分が地面にかくれないよう、手前に描く）
  glint(p, col, size = 1) {
    this.fx.sprite(p, col, size * 0.8, 0.3, { k: 4, grow: 1.2, top: true });
    for (const a of [0, Math.PI / 2]) this.fx.slash(p, col, { cam: this.camera, size: size * 1.6, angle: a, life: 0.3, sym: true, top: true });
  },
  // ---------- シロ（大ばくはつの杖）の技の部品 ----------
  // 杖を立てたシロを、前の斜め下から（顔と杖の先が見えるように）
  staffCam(e) { const h = e.home; this.setCam(V3(h.x + 2.3, 0.5, h.z - 1.3), V3(h.x - 0.1, 0.95, h.z - 0.5), { snap: true }); },
  // 爆発を映す引きの画（big：ちょう大ばくはつのきのこ雲が入るよう、もっと引いて上を見る）
  boomCam(ts, big) {
    const cen = this.enemyCenter(), tall = this.enemyTall(), wide = Math.max(...ts.map(t => Math.abs(t.home.x - cen.x)));
    this.setCam(V3(cen.x + 1.2, 2.2 + tall * 0.5 + big * 0.8, cen.z + 6.8 + wide * (0.6 + big * 0.7) + tall * 1.2 + big * 3.2), V3(cen.x, 1.2 + tall * 0.4 + big * 1.4, cen.z), { snap: true });
  },
  // 爆発の音（k：大きさ）
  boomSfx(k = 1) {
    Sfx.noise(0.35 + k * 0.25, Math.min(0.5, 0.2 + k * 0.12), 420);
    Sfx.noise(0.2 + k * 0.1, 0.15, 2600);
    Sfx.tone(110, 0.3 + k * 0.2, 'sawtooth', 0.06 + k * 0.02, -70);
  },
  // まんがの爆発：でこぼこの火の玉が、黄→橙→赤と色を変えながらふくらんではじけ、黒い煙がもくもく上がる
  //   size：火の玉の半径。明るい草原でも形が見えるよう、火も煙も不透明な面で描く（加算の光だけだと白くぼやける）
  //   火の玉は大小の玉を寄せたかたまり（一つの球だと、平たい円盤に見える）。外がわの玉ほど早く赤くなる
  boom(p, size, { smoke = 6, ring = true, sparks = 30, k = 1.6, life = 0.45, lumps = 6, glow = true } = {}) {
    const C0 = new THREE.Color('#fff2a8'), C1 = new THREE.Color('#ffa020'), C2 = new THREE.Color('#c8301a'), geo = new THREE.IcosahedronGeometry(1, 2);
    for (let i = 0; i <= lumps; i++) {
      const out = i ? 1 : 0, mat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, depthWrite: false, fog: false });
      const ball = new THREE.Mesh(geo, mat); ball.renderOrder = 12 - out;
      const d = V3(Math.random() - 0.5, Math.random() * 0.7 - 0.2, Math.random() - 0.5).normalize(), r = size * (i ? 0.5 + Math.random() * 0.25 : 0.75), off = i ? size * (0.45 + Math.random() * 0.2) : 0;
      const at = i ? Math.random() * 0.06 : 0, early = i ? 0.55 : 1;   // 外がわは少しおくれてふくらみ、早く赤くなる
      this.fx.add(ball, life + at, t0 => {
        const t = Math.max(0, (t0 * (life + at) - at) / life);
        ball.position.copy(p).addScaledVector(d, off * (0.6 + 0.4 * Ease.out(Math.min(1, t * 3))));
        ball.scale.setScalar(Math.max(1e-3, r * (t < 0.22 ? Ease.out(t / 0.22) : 1 - Ease.in((t - 0.22) / 0.78) * 0.55)));
        const u = Math.min(1, t / early);
        (u < 0.3 ? mat.color.lerpColors(C0, C1, u / 0.3) : mat.color.lerpColors(C1, C2, (u - 0.3) / 0.7)).multiplyScalar(k * (1 - t * 0.45));
        mat.opacity = t0 === 0 ? 0 : t < 0.55 ? 1 : (1 - t) / 0.45;
      });
    }
    if (glow) this.fx.sprite(p, '#ffc070', size * 1.8, 0.2, { k: 1.2, grow: 1.3 });
    if (smoke) this.smokePuffs(p, size, smoke);
    if (sparks) this.p.burst(p, hdr('#ffc060', 3), sparks, { speed: 3 + size * 4, up: 0.6, life: 0.6, size: 0.09, grav: 5 });
    if (ring) this.fx.ring(V3(p.x, 0.06, p.z), '#ffb060', { r: size * 2.6, life: 0.5, width: 0.15 });
  },
  // 魔法の玉：赤い玉がふくらみながら、ピッ、ピッ、ピピッと白く光る（life 秒。爆発の前ぶれ）
  magicOrb(p, life) {
    const mat = new THREE.MeshBasicMaterial({ color: hdr('#ff3a1a', 1.4), fog: false });
    const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 2), mat); orb.position.copy(p); orb.renderOrder = 12;
    const halo = this.fx.sprite(p, '#ff5a2a', 1.4, life, { k: 1.5, grow: 1.6 });
    const beeps = [0, 0.4, 0.66, 0.83];
    let n = 0;
    this.fx.add(orb, life, t => {
      while (n < beeps.length && t >= beeps[n]) { Sfx.tone(1400 + n * 120, 0.06, 'square', 0.04); n++; }
      const since = Math.min(...beeps.filter(b => b <= t).map(b => (t - b) * life));
      const w = Math.max(0, 1 - since / 0.08);
      mat.color.set('#ff3a1a').lerp(new THREE.Color('#ffffff'), w).multiplyScalar(1.4 + w);
      orb.scale.setScalar(0.3 + 0.25 * t + w * 0.06);
      halo.material.opacity = 0.6 + w * 0.4;
    });
    return orb;
  },
  // もくもくの煙：n 個の灰色の玉が、ふくらみながら外へ広がって上がり、うすれて消える
  smokePuffs(p, size, n, { up = 1, spread = 1, life = 1.1, dark = 0 } = {}) {
    for (let i = 0; i < n; i++) {
      const c = new THREE.Color().setHSL(0.9, 0.04, (0.3 + Math.random() * 0.25) * (1 - dark));
      const mat = new THREE.MeshToonMaterial({ color: c, gradientMap: TOON_GRAD, transparent: true });
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), mat);
      const d = V3(Math.random() - 0.5, Math.random() * 0.6, Math.random() - 0.5).normalize();
      const from = p.clone().addScaledVector(d, size * 0.3), v = d.clone().multiplyScalar(size * 1.6 * spread).add(V3(0, (0.6 + Math.random() * 0.6) * up, 0));
      const s1 = size * (0.45 + Math.random() * 0.35), L = life * (0.8 + Math.random() * 0.4), rot = Math.random() * 3;
      m.position.copy(from); m.rotation.set(rot, rot * 2, 0);
      this.fx.add(m, L, t => {
        m.position.copy(from).addScaledVector(v, Ease.out(t));
        m.scale.setScalar(Math.max(1e-3, s1 * (0.3 + 0.7 * Ease.out(Math.min(1, t * 2.5))) * (1 - t * 0.2)));
        mat.opacity = t < 0.55 ? 1 : (1 - t) / 0.45;
      });
    }
  },
  // きのこ雲：火の玉の上へ太い煙の柱がのびて、てっぺんで傘のように横へ広がる
  mushroom(cen, R) {
    const H = 2.4 + R * 0.4;
    for (let i = 0; i < 7; i++) GFX.delay(0.08 + i * 0.05).then(() => this.smokePuffs(V3(cen.x + (Math.random() - 0.5) * 0.4, 0.8 + i / 7 * H, cen.z), R * 0.32, 3, { up: 0.5, spread: 0.25, life: 1.8 }));
    GFX.delay(0.4).then(() => {
      for (let i = 0; i < 10; i++) {
        const a = i / 10 * Math.PI * 2, p = V3(cen.x + Math.cos(a) * R * 0.3, H + 0.5 + Math.random() * 0.4, cen.z + Math.sin(a) * R * 0.18);
        this.smokePuffs(p, R * 0.4, 1, { up: 0.3, spread: 1.6, life: 1.7 });
      }
    });
  },
  // 爆発のあおり：煙がつつむ → すすけた顔でけほっ。big：頭の毛がぼわっとふくらむ（すすけた毛のかたまりが頭をかこむ）
  async blowback(e, big) {
    const m = e.model, h = e.home, g = m.group, was = m.face && m.face.expr;
    this.focus(e);
    g.rotation.y = Math.PI;   // 敵がわを向いたまま、前（敵がわ）から映す（0 にすると背中が映る）
    this.setCam(V3(h.x + 0.9, 0.75, h.z - 2.9), V3(h.x, 1.0, h.z), { snap: true });
    this.tweenPose(m, POSES.hurt, 0.12);
    const hp = this.headPos(e);
    this.smokePuffs(hp.clone().add(V3(0, -0.2, 0)), 0.4, 6, { up: 0.5, spread: 0.8, life: 0.9, dark: 0.3 });
    this.p.burst(hp, hdr('#ffb050', 3), 16, { speed: 2.5, up: 0.6, life: 0.4, size: 0.07, grav: 4 });
    this.boomSfx(0.5);
    if (m.face) m.face.set(big ? 'surprise' : 'pained');
    const s0 = squashStart(g);
    GFX.tween(0.35, k => { const s = Math.sin(k * Math.PI) * 0.12; g.scale.set(s0.x * (1 + s), s0.y * (1 - s * 0.5), s0.z * (1 + s)); }, Ease.out).then(() => squashEnd(g));
    if (big) {
      // ぼわっ：すすけた毛のかたまりが、頭のてっぺんから横・うしろへふくらむ（顔の前にはかからない。顔は -Z 向き）
      const mat = new THREE.MeshToonMaterial({ color: '#8a8286', gradientMap: TOON_GRAD }), geo = new THREE.IcosahedronGeometry(1, 1);
      const tuft = new THREE.Group(), hc = m.eyePos(1, 0);   // 頭の球の中心
      for (let i = 0; i < 26; i++) {
        let d; do { d = V3(Math.random() - 0.5, Math.random() * 0.9 - 0.1, Math.random() - 0.5).normalize(); } while (d.z < -0.2);
        const b = new THREE.Mesh(geo, mat); b.position.copy(d).multiplyScalar(0.36 + Math.random() * 0.06); b.scale.setScalar(0.11 + Math.random() * 0.05); b.rotation.set(Math.random() * 3, Math.random() * 3, 0); tuft.add(b);
      }
      tuft.position.copy(hc);
      this.fx.add(tuft, 1.3, t => {
        tuft.position.copy(m.eyePos(1, 0));   // のけぞる頭についていく
        tuft.scale.setScalar(Math.max(1e-3, t < 0.15 ? Ease.back(t / 0.15) : t > 0.85 ? 1 - (t - 0.85) / 0.15 : 1));
      });
    }
    await GFX.delay(0.4);
    Sfx.tone(520, 0.12, 'square', 0.03, -200); Sfx.tone(480, 0.12, 'square', 0.03, -200, 0.16);   // けほっ
    this.smokePuffs(hp.clone().add(V3(0, -0.1, 0.35)), 0.12, 2, { up: 0.6, spread: 0.6, life: 0.7 });
    await GFX.delay(big ? 0.75 : 0.45);
    if (m.face) m.face.set(was || 'neutral');
  },
  // ---------- シロ（こおりの杖）の技の部品 ----------
  // 氷の粒（ダイヤモンドダスト）：n 個の小さな八面体を一度に描く（粒ごとに描くと、非力なスマホで重い）
  //   at(i, t, P)：t（0〜1）での i 個目の位置を P に入れ、大きさの倍率を返す（0 で見えない）。粒ごとに光り方をずらして、ときどき強くきらめかせる
  frostDust(n, life, at, { size = 0.05 } = {}) {
    const geo = new THREE.OctahedronGeometry(1, 0); geo.scale(0.6, 1, 0.6);
    const mat = new THREE.MeshBasicMaterial({ color: '#ffffff', fog: false });
    const mesh = new THREE.InstancedMesh(geo, mat, n); mesh.frustumCulled = false; mesh.renderOrder = 11;
    const ph = Array.from({ length: n }, () => Math.random() * 10), sp = Array.from({ length: n }, () => 5 + Math.random() * 9);
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), P = V3(), S = V3(), C = new THREE.Color();
    let time = 0;
    const set = t => {
      for (let i = 0; i < n; i++) {
        const s = Math.max(1e-4, at(i, t, P) * size);
        Q.setFromEuler(E.set(ph[i] + time * 3, ph[i] * 2 + time * 4, 0));
        mesh.setMatrixAt(i, M.compose(P, Q, S.setScalar(s)));
        const tw = Math.pow(0.5 + 0.5 * Math.sin(ph[i] * 7 + time * sp[i]), 8) * 2.2;
        mesh.setColorAt(i, C.setRGB(0.78 + tw, 0.92 + tw, 1.0 + tw));
      }
      mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor.needsUpdate = true;
    };
    set(0);
    return this.fx.add(mesh, life, (t, o, dt) => { time += dt; set(t); });
  },
  // 地面が白く凍りつく（中心から広がって、life 秒の終わりに消える）
  frostGround(p, r, life) {
    const mat = new THREE.MeshBasicMaterial({ map: frostTex(), color: '#e4f6ff', transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    m.position.copy(p); m.rotation.x = -Math.PI / 2; m.rotation.z = Math.random() * Math.PI; m.renderOrder = 2;
    return this.fx.add(m, life, t => {
      m.scale.setScalar(r * (0.15 + 0.85 * Ease.out(Math.min(1, t * 2.2))));
      mat.opacity = 0.8 * Math.min(1, t * 6) * (t > 0.7 ? (1 - t) / 0.3 : 1);
    });
  },
  // 氷の結晶の花：敵の体から大きな氷の結晶がいくつもはじけ出す（life 秒で消える。砕ける演出は呼んだ側で）
  iceBloom(ts, life) {
    const list = [];
    for (const t of ts) {
      const p = this.hitPoint(t.u), s = 0.75 + t.model.radius * 0.9, n = 8;
      for (let j = 0; j < n; j++) {
        const a = j / n * Math.PI * 2 + Math.random() * 0.5, el = -0.25 + Math.random() * 1.1;
        list.push({ p, d: V3(Math.cos(el) * Math.cos(a), Math.sin(el), Math.cos(el) * Math.sin(a)), len: (0.8 + Math.random() * 0.5) * s, w: (0.12 + Math.random() * 0.05) * s, spin: Math.random() * Math.PI, delay: Math.random() * 0.06 });
      }
    }
    const geo = new THREE.OctahedronGeometry(1, 0); geo.translate(0, 1, 0);   // 根もとを原点に、上へ長さ 2
    const mat = new THREE.MeshStandardMaterial({ color: '#f0fbff', emissive: '#8fe0ff', emissiveIntensity: 0.8, roughness: 0.05, metalness: 0.35, transparent: true, opacity: 0.95, flatShading: true });
    const mesh = new THREE.InstancedMesh(geo, mat, list.length); mesh.frustumCulled = false;
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), Q2 = new THREE.Quaternion(), S = V3(), up = V3(0, 1, 0);
    const set = t => {
      list.forEach((o, i) => {
        const k = Ease.back(Math.min(1, Math.max(0, (t * life - o.delay) / 0.14)));
        Q.setFromUnitVectors(up, o.d).multiply(Q2.setFromAxisAngle(up, o.spin));
        mesh.setMatrixAt(i, M.compose(o.p, Q, S.set(Math.max(1e-4, o.w * k), Math.max(1e-4, o.len * 0.5 * k), Math.max(1e-4, o.w * k))));
      });
      mesh.instanceMatrix.needsUpdate = true;
    };
    set(0);
    return this.fx.add(mesh, life, set);
  },
  // 右手の武器を s 倍に（技のあいだだけ。終わったら 1 に戻す）
  weaponGrow(m, s, dur) {
    const w = m.extras && m.extras.hold; if (!w) return Promise.resolve();
    const s0 = w.scale.x;
    return GFX.tween(dur, k => w.scale.setScalar(lerp(s0, s, k)), s > s0 ? Ease.back : Ease.inOut);
  },
  // 削りぶし：うすい花かつおが、ひらひら舞いおちる
  katsuoFlakes(p, n = 10, { speed = 2.2, size = 0.14 } = {}) {
    for (let i = 0; i < n; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: pick(['#f0c0a0', '#e8a888', '#f6d8c0']), transparent: true, side: THREE.DoubleSide, depthWrite: false });
      const f = new THREE.Mesh(new THREE.PlaneGeometry(size, size * 0.7), mat); f.position.copy(p);
      const v = V3(Math.random() - 0.5, 0.6 + Math.random() * 0.8, Math.random() - 0.5).normalize().multiplyScalar(speed * (0.5 + Math.random()));
      const spin = V3(Math.random() * 8, Math.random() * 8, Math.random() * 8);
      this.fx.add(f, 1.0 + Math.random() * 0.5, (k, o, dt) => {
        v.y -= 3.2 * dt; v.multiplyScalar(Math.exp(-2.2 * dt));
        o.position.addScaledVector(v, dt);
        o.rotation.x += spin.x * dt; o.rotation.y += spin.y * dt; o.rotation.z += spin.z * dt;
        mat.opacity = k > 0.7 ? (1 - k) / 0.3 : 1;
      });
    }
  },
  // くるくる回って飛んでいく削りぶし（とどいたら resolve）
  flyFlake(from, to, delay = 0, dur = 0.24) {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.3), new THREE.MeshBasicMaterial({ color: '#f0c0a0', side: THREE.DoubleSide }));
    const spin = 18 + Math.random() * 8, c = hdr('#ffd8a0', 2.5);
    f.position.copy(from);
    return GFX.delay(delay).then(() => new Promise(res => this.fx.add(f, dur, (k, o) => {
      o.position.lerpVectors(from, to, k); o.position.y += Math.sin(k * Math.PI) * 0.35;
      o.rotation.set(0.6, k * spin, 0.3);
      this.p.emit(o.position, V3(0, 0, 0), c, { life: 0.25, size: 0.12 });
      if (k >= 1) res();
    })));
  },
  // けずり節のひとふり：削りぶしを 3 枚飛ばす（右へふったら、次は左へ返す）
  async flakeShot(e, te, col) {
    const m = e.model;
    this.face(e, te.home);
    Sfx.swing();
    await this.tweenPose(m, m.pose.twist > 0 ? POSES.strike : POSES.strike2, 0.08);
    const from = m.tipPos(), to = this.hitPoint(te.u);
    await Promise.all([-1, 0, 1].map(j => this.flyFlake(from, to.clone().add(V3(j * 0.22, j * j * 0.12, 0)), (j + 1) * 0.04)));
    this.katsuoFlakes(to, 10, { size: 0.2 });
    this.fx.slash(to, col, { cam: this.camera, size: 1.3, angle: Math.random() * Math.PI });
    this.squash(te, 0.1);
  },
  // 燃えあがる：炎の帯が敵のまわりを巻いてのぼる
  flameUp(t, col, s = 1) {
    const g = t.home.clone().add(V3(0, 0.1, 0)), r = t.model.radius, h = t.model.height, c = hdr(col, 3), c2 = hdr('#ffd76a', 3);
    for (let i = 0; i < 2; i++) this.fx.swirl(g, col, { r: r * (0.9 + i * 0.3) * s, life: 0.8, tilt: 0, speed: 10 + i * 4, arc: 3.2, width: 0.05, y0: 0.1, y1: h * 0.9 });
    for (let i = 0; i < 24 * s; i++) {
      const a = Math.random() * Math.PI * 2, q = Math.random() * r;
      this.p.emit(V3(g.x + Math.cos(a) * q, 0.1 + Math.random() * h * 0.5, g.z + Math.sin(a) * q), V3(0, 2 + Math.random() * 2, 0), i % 3 ? c : c2, { life: 0.7, size: 0.15 * s });
    }
    this.fx.sprite(this.hitPoint(t.u), col, 2 * s, 0.4, { k: 3 });
  },
  // ねこじゃらしの穂のわた毛：ふわふわ浮いて流れる
  fluff(p, n = 20) {
    const a = hdr('#fffbe8', 1.6), b = hdr('#ffe07a', 1.6);
    for (let i = 0; i < n; i++) this.p.emit(p.clone().add(V3((Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.4)), V3((Math.random() - 0.5) * 2.5, 0.4 + Math.random() * 1.2, (Math.random() - 0.5) * 1.5), i % 3 ? a : b, { life: 1.4, size: 0.12, drag: 2.5, grav: -0.3 });
  },
  // ---------- クロの技の部品 ----------
  // 影の体：キャラのモデルを、むらさきがかった半透明の黒にしたもの（影分身・残像）
  shadowBody(key) {
    const cl = buildCharacter(key);
    cl.group.traverse(o => {
      if (!o.isMesh) return;
      if (o.userData.outline) { o.visible = false; return; }
      o.material = o.material.clone();
      Object.assign(o.material, { transparent: true, opacity: 0, depthWrite: false });
      if (o.material.color) o.material.color.set('#16122a');
      if (o.material.emissive) { o.material.emissive.set('#4a3aa8'); o.material.emissiveIntensity = 0.35; }
      o.castShadow = false;
    });
    cl.setOpacity = op => cl.group.traverse(x => { if (x.isMesh && !x.userData.outline) x.material.opacity = op; });
    return cl;
  },
  // 残像：いまの姿のまま、その場に影を残す（v：流れていく速さ）
  afterimage(e, { life = 0.45, op = 0.6, v = null } = {}) {
    const m = e.model, cl = this.shadowBody(e.u.key);
    cl.group.position.copy(m.group.position); cl.group.rotation.copy(m.group.rotation);
    cl.setPose(m.pose); cl.update(0, GFX.time);
    return this.fx.add(cl.group, life, (k, o, dt) => {
      if (v) o.position.addScaledVector(v, dt * (1 - k));
      cl.setOpacity(op * (1 - k) * (1 - k));
    });
  },
  // 敵のまわりの立ち位置（a：正面からの角度）
  ringSpot(t, a, back = 0.7) {
    const r = t.model.radius + back;
    return t.home.clone().add(V3(Math.sin(a) * r, 0, Math.cos(a) * r));
  },
  // 三本の爪あと：画面の上で、angle の向きの斬撃を平行に並べる
  clawMarks(p, col, { angle = 0.9, n = 3, gap = 0.3, size = 2.0, life = 0.3 } = {}) {
    const q = this.camera.quaternion, r = V3(1, 0, 0).applyQuaternion(q), u = V3(0, 1, 0).applyQuaternion(q);
    const perp = r.multiplyScalar(-Math.sin(angle)).add(u.multiplyScalar(Math.cos(angle)));
    for (let i = 0; i < n; i++) GFX.delay(i * 0.03).then(() => this.fx.slash(p.clone().addScaledVector(perp, (i - (n - 1) / 2) * gap), col, { cam: this.camera, size: size * (i === (n - 1) / 2 ? 1.1 : 0.9), angle, life }));
  },
  // にらむ：金の目がきらり（挑発）
  glare(e) {
    for (const k of [-1, 1]) this.glint(e.model.eyePos(k), '#ffd24a', 0.24);   // 首の傾き・前かがみも込みの、顔に描いた目の位置
    Sfx.tone(1800, 0.15, 'triangle', 0.04, 400);
  },
  // 画面を夜の色に沈める（k：1 で沈め、0 で戻す。col：沈めたときの色の掛け算）
  dim(k, dur = 0.3, col = [0.5, 0.5, 0.72]) {
    const U = GFX.grade.uniforms, a = U.tint.value.clone();
    return GFX.tween(dur, t => U.tint.value.setRGB(lerp(a.r, 1 - (1 - col[0]) * k, t), lerp(a.g, 1 - (1 - col[1]) * k, t), lerp(a.b, 1 - (1 - col[2]) * k, t)), Ease.inOut, true);
  },
  // 月：カメラに向いた白い円と、まわりのにじみ（life 秒で、ふわっとあらわれて消える）
  moonDisc(p, r, life) {
    const mat = new THREE.MeshBasicMaterial({ color: hdr('#fff8e4', 1.6), transparent: true, opacity: 0, depthWrite: false });
    const disc = new THREE.Mesh(new THREE.CircleGeometry(r, 48), mat); disc.position.copy(p); disc.renderOrder = 10;
    const halo = this.fx.sprite(p, '#d8d0ff', r * 5, life, { k: 0.8, grow: 1.05 });
    this.fx.add(disc, life, k => {
      disc.lookAt(this.camera.position);
      mat.opacity = Math.min(1, k * 5, (1 - k) * 4);
      halo.material.opacity = mat.opacity * 0.7;
    });
  },
  // 地面の影だまり（もどり値の位置を動かすと、影がすべっていく）
  shadowPool(at, r, life) {
    const mat = new THREE.MeshBasicMaterial({ color: '#0a0814', transparent: true, opacity: 0, depthWrite: false });
    const m = new THREE.Mesh(new THREE.CircleGeometry(1, 32), mat);
    m.rotation.x = -Math.PI / 2; m.position.set(at.x, 0.03, at.z); m.scale.setScalar(r);
    return this.fx.add(m, life, k => { mat.opacity = 0.75 * Math.min(1, k * 8, (1 - k) * 5); });
  },
  // 三日月の斬撃：カメラに向いた三日月が、ひらきながら消える（angle：三日月のふくらむ向き。drop：その高さから落ちてくる）
  crescent(p, col, { r = 1.2, angle = 0, life = 0.4, drop = 0 } = {}) {
    const shape = (inner) => {
      const s = new THREE.Shape();
      s.absarc(0, 0, 1, -Math.PI / 2, Math.PI / 2, false);
      s.absellipse(0, 0, inner, 1, Math.PI / 2, -Math.PI / 2, true);
      return new THREE.ShapeGeometry(s, 24);
    };
    const mk = (c, k, inner) => new THREE.Mesh(shape(inner), new THREE.MeshBasicMaterial({ color: hdr(c, k), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
    const g = new THREE.Group(), glow = mk(col, 1.6, 0.35), core = mk('#ffffff', 2.2, 0.78);
    glow.position.x = -0.68; core.position.set(-0.68, 0, 0.01);   // 三日月のまんなかを p に
    g.add(glow, core); g.renderOrder = 12;
    g.position.copy(p);
    return this.fx.add(g, life, k => {
      g.quaternion.copy(this.camera.quaternion); g.rotateZ(angle + k * 0.5);
      g.scale.setScalar(r * (0.55 + Ease.out(k) * 0.6));
      if (drop) g.position.set(p.x, p.y + drop * (1 - Ease.out(Math.min(1, k * 2.5))), p.z);
      glow.material.opacity = 1 - k * k; core.material.opacity = 1 - k;
    });
  },
  // 裂創のしぶき：赤いしずくが飛んで落ちる
  bleed(p, n = 14) {
    for (let i = 0; i < n; i++) this.p.emit(p, V3((Math.random() - 0.5) * 3, 0.5 + Math.random() * 2, 0.5 + Math.random()), hdr('#e0304a', 1.6), { life: 0.55, size: 0.07, grav: 7, drag: 0.8 });
  },
  // 放物線で飛ぶ魚（ファイアボール）
  flyFish(from, to, dur) {
    const g = new THREE.Group(), mat = toon('#4a7ab8');
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), mat); body.scale.set(0.55, 2.2, 0.9); g.add(body);
    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), toon('#e8f0f8')); belly.scale.set(0.5, 1.9, 0.8); belly.position.z = 0.03; g.add(belly);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.14, 3), mat); tail.position.y = 0.3; tail.scale.z = 0.3; g.add(tail);
    g.scale.setScalar(2.6);
    this.fx.add(g, dur + 0.3, k => {
      const f = Math.min(1, k * (dur + 0.3) / dur);
      g.position.lerpVectors(from, to, f); g.position.y += Math.sin(f * Math.PI) * 0.8;
      g.rotation.z = f * 9;
      if (f >= 1) g.visible = false;
    });
    return g;
  },
  // 敵の前の立ち位置
  meleeSpot(t, back = 0.7) { return t.home.clone().add(V3(0, 0, t.model.radius + back)); },
  // 敵の手前から、対象の敵たちを映す
  foeCam(ts, lookY = 1.0, speed = 6) {
    const cx = ts.reduce((a, t) => a + t.home.x, 0) / ts.length, z = Math.max(...ts.map(t => t.home.z)), wide = Math.max(...ts.map(t => Math.abs(t.home.x - cx)));
    this.setCam(V3(cx + 1.0, 1.9, z + 4.4 + wide * 0.6), V3(cx, lookY, z - 0.3), { speed });
  },
  closeCam(dest) { this.setCam(V3(dest.x + 3.3, 1.5, dest.z + 2.8), V3(dest.x - 0.4, 0.9, dest.z - 1.4), { speed: 5 }); },
  // 横から：手もとの動き（まくら・こぶし・しっぽ）が見えるように
  //   敵へ向かうと左手が -X 側になるので、左手のもの（まくら・ねこパンチ）が見えるよう、ふつうは左から映す
  sideCam(dest, t, side = -1) {
    const mid = dest.clone().add(t.home).multiplyScalar(0.5);
    this.setCam(V3(mid.x + side * 2.3, 1.05, mid.z + 0.9), V3(mid.x, 0.7, mid.z), { speed: 9 });
  },
  // 立ち位置へ跳んでいく（攻撃のあとは attackEnd で戻る）
  async dashTo(e, dest, { pose = POSES.windup, dur = 0.3, hop = 0.35, trail = true } = {}) {
    const m = e.model, from = m.group.position.clone(), col = this.b.abColor(e.u);
    this.face(e, dest);
    this.tweenPose(m, pose, Math.min(0.22, dur));
    await GFX.tween(dur, t => {
      m.group.position.lerpVectors(from, dest, t);
      m.group.position.y = Math.sin(t * Math.PI) * hop;
      if (trail) for (let i = 0; i < 2; i++) this.p.emit(this.hitPoint(e.u), V3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5), hdr(col, 2.5), { life: 0.4, size: 0.12 });
    }, Ease.inOut);
    if (this.lastAttack && this.lastAttack.src === e.u) this.lastAttack.moved = true;
    else this.partners.add(e);   // 技を撃つ子でなければ、相方として覚えておく（attackEnd で戻る）
  },
  // とことこ歩く（小さく弾みながら）
  async walkTo(e, dest, dur) {
    const m = e.model, from = m.group.position.clone();
    if (from.distanceTo(dest) < 0.05) return;
    this.face(e, dest);
    this.tweenPose(m, POSES.ready, 0.15);
    await GFX.tween(dur, t => {
      m.group.position.lerpVectors(from, dest, t);
      m.group.position.y = Math.abs(Math.sin(t * Math.PI * 3)) * 0.08;
    }, Ease.inOut);
  },
  // ぽよんとつぶれる
  squash(t, amt = 0.25) {
    const g = t.model.group, s0 = squashStart(g);
    GFX.tween(0.4, k => {
      if (t.dying) return;
      const s = Math.sin(k * Math.PI) * amt * (1 - k * 0.5);
      g.scale.set(s0.x * (1 + s * 0.6), s0.y * (1 - s), s0.z * (1 + s * 0.6));
    }, Ease.out).then(() => squashEnd(g, !t.dying));
  },
  // 歌う：体を左右にゆらしながら、dur 秒のあいだに 8 回 fn
  async sing(m, dur, fn) {
    await this.tweenPose(m, POSES.hugPillow, 0.25);
    let i = 0;
    await GFX.tween(dur, (_, p) => {
      m.pose.twist = Math.sin(p * Math.PI * 4) * 0.15;
      m.pose.headY = Math.sin(p * Math.PI * 4) * 0.2;
      const k = Math.floor(p * 8); while (i < k) { fn(i++); }
    }, Ease.linear);
  },
  // ♪・♥ などの一文字の板
  glyph(ch, fill, stroke, size = 0.32) {
    const key = 'glyph' + ch + fill;
    if (!TexCache[key]) {
      const c = document.createElement('canvas'); c.width = c.height = 64;
      const g = c.getContext('2d'); g.font = '800 50px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.lineWidth = 6; g.strokeStyle = stroke; g.strokeText(ch, 32, 35); g.fillStyle = fill; g.fillText(ch, 32, 35);
      TexCache[key] = new THREE.CanvasTexture(c);
    }
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: TexCache[key], transparent: true, depthWrite: false }));
    sp.scale.setScalar(size); sp.renderOrder = 12;
    return sp;
  },
  // 音符がふわふわ飛んでいく
  noteFly(from, to, dur) {
    const n = this.glyph(Math.random() < 0.5 ? '♪' : '♫', pick(['#ffe08a', '#ffb8d8', '#b8e0ff']), '#6a5a8a', 0.42);
    const side = V3((Math.random() - 0.5) * 0.8, 0.4 + Math.random() * 0.4, 0);
    this.fx.add(n, dur, k => {
      n.position.lerpVectors(from, to, Ease.inOut(k)).addScaledVector(side, Math.sin(k * Math.PI));
      n.material.rotation = Math.sin(k * 12) * 0.3;
      n.material.opacity = k > 0.85 ? (1 - k) / 0.15 : 1;
    });
  },
  heart(p) {
    for (let i = 0; i < 3; i++) {
      const s = this.glyph('♥', '#ff8ab8', '#ffffff', 0.26), q = p.clone().add(V3((i - 1) * 0.22, 0, 0));
      GFX.delay(i * 0.1).then(() => this.fx.add(s, 0.9, k => { s.position.copy(q).add(V3(0, k * 0.4, 0)); s.material.opacity = 1 - k * k; s.scale.setScalar(0.26 * Ease.back(Math.min(1, k * 4))); }));
    }
  },
  // 空から落ちる雷
  thunder(t, col, big = 1) {
    const g = t.home.clone().add(V3(0, 0.05, 0)), p = this.hitPoint(t.u);
    const top = V3(g.x + (Math.random() - 0.5) * 1.5, 9, g.z + (Math.random() - 0.5));
    this.fx.bolt(top, g, col, { life: 0.3, segs: 14, jag: 0.35, r: 0.05 * big, k: 6 });
    this.fx.bolt(top, g, '#ffffff', { life: 0.22, segs: 14, jag: 0.3, r: 0.02 * big, k: 6 });
    this.fx.ring(g, col, { r: 1.4 * big, life: 0.4 });
    this.fx.sprite(p, '#ffffff', 2 * big, 0.15, { k: 5 });
    this.p.burst(g, col, 20, { speed: 4, up: 1, life: 0.4, size: 0.08 });
    GFX.flash(col, 0.12, 0.15);
    Sfx.zap();
  },
  // 地面をすべる大きな波（前方の弧）
  //   壁は色を塗り（明るい背景でも見える）、波がしらは光らせる
  waveFx(at, col, { to = 8, dur = 0.55, h = 1.3, arc = 1.6 } = {}) {
    const mat = new THREE.MeshBasicMaterial({ color: col, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    const geo = new THREE.CylinderGeometry(1, 1, 1, 48, 1, true, Math.PI - arc / 2, arc); geo.translate(0, 0.5, 0);
    const w = new THREE.Mesh(geo, mat); w.position.set(at.x, 0, at.z); w.renderOrder = 11;
    const cmat = new THREE.MeshBasicMaterial({ color: hdr(col, 3), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    const crest = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.12, 48, 1, true, Math.PI - arc / 2, arc), cmat); w.add(crest);
    this.fx.add(w, dur, k => {
      const r = 0.5 + k * to, hh = h * Math.sin(Math.min(1, k * 1.4) * Math.PI * 0.5 + 0.3) * (1 - k * 0.3);
      w.scale.set(r, hh, r); crest.position.y = 1; crest.scale.y = 1 / Math.max(0.1, hh);
      mat.opacity = 0.55 * (1 - k * k); cmat.opacity = 1 - k * k;
      for (let i = 0; i < 10; i++) { const a = Math.PI + (Math.random() - 0.5) * arc; this.p.emit(V3(at.x + Math.sin(a) * r, hh, at.z + Math.cos(a) * r), V3(0, 2.2, 0), hdr(col, 3), { life: 0.4, size: 0.14 }); }
    });
  },
  // だしの大波：幅 w・高さ H の、前へ巻いた波の壁。at から z1 まで dur 秒ですべり、波の前の z を onZ に知らせる
  //   断面（z・y）を巻いた形に作って横（x）へ押し出し、横にうねらせる。色は根もとが濃いだし、上ほど明るく、波がしらは泡の白
  dashiWave(at, z1, w, H, dur, onZ) {
    const s = new THREE.Shape();
    s.moveTo(0.8, 0);
    s.quadraticCurveTo(0.75, 0.75, 0.15, 1.0);
    s.quadraticCurveTo(-0.45, 1.15, -0.78, 0.72);   // 波がしらが前へ巻き出す
    s.quadraticCurveTo(-0.5, 0.8, -0.34, 0.6);
    s.quadraticCurveTo(-0.1, 0.35, -0.35, 0);
    const geo = new THREE.ExtrudeGeometry(s, { depth: w, steps: Math.ceil(w * 3), bevelEnabled: false, curveSegments: 10 });
    geo.translate(0, 0, -w / 2); geo.rotateY(-Math.PI / 2);   // 断面の +x が うしろ（+z）、押し出しが横（x）
    const pos = geo.attributes.position, base = pos.array.slice(), n = pos.count, col = new Float32Array(n * 3);
    const deep = new THREE.Color('#a8601c'), light = new THREE.Color('#f2be6a'), foamC = new THREE.Color('#fff6e4'), cc = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const x = base[i * 3], y = base[i * 3 + 1], pz = base[i * 3 + 2];   // pz：断面の前後（- が前）
      cc.copy(deep).lerp(light, Math.min(1, y) ** 1.4).multiplyScalar(0.9 + 0.1 * Math.sin(x * 3 + y * 7));   // 水のすじ
      const f = Math.max(y > 0.95 ? (y - 0.95) / 0.12 : 0, pz < -0.5 ? (-0.5 - pz) / 0.22 : 0);   // 泡は頂と、巻いた先だけ
      if (f > 0) cc.lerp(foamC, Math.min(1, f) * 0.9);
      col[i * 3] = cc.r; col[i * 3 + 1] = cc.g; col[i * 3 + 2] = cc.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    // 光を受ける材質で、巻いた形に陰影をつける（暗くなりすぎないよう、だしの色で少し自ら光らせる）
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: new THREE.Color('#6a3a10'), transparent: true, opacity: 0.75, depthWrite: false, side: THREE.DoubleSide });
    const body = new THREE.Mesh(geo, mat); body.renderOrder = 11; body.frustumCulled = false;
    const g = new THREE.Group(); g.add(body); g.position.copy(at);
    const foam = hdr('#fff4e0', 1.6), drop = hdr(DASHI, 2), steam = hdr('#ffffff', 1.1), life = dur + 0.35;
    return new Promise(res => this.fx.add(g, life, (k, o) => {
      const s = k * life, t = Math.min(1, s / dur), up = Ease.out(Math.min(1, t * 2.5)), fall = s > dur ? (s - dur) / 0.35 : 0;
      // 横にうねる（x にそって高さと前後がゆれる）。両端は低く細くしぼる
      for (let i = 0; i < n; i++) {
        const x = base[i * 3], y = base[i * 3 + 1], tp = Math.max(0.08, 1 - Math.abs(2 * x / w) ** 5);
        pos.array[i * 3 + 1] = y * tp * (1 + (Math.sin(x * 1.3 + s * 7) * 0.07 + Math.sin(x * 0.55 - s * 4) * 0.06));
        pos.array[i * 3 + 2] = base[i * 3 + 2] * (0.35 + 0.65 * tp) + Math.sin(x * 0.9 + s * 5) * 0.08 * y;
      }
      pos.needsUpdate = true; geo.computeVertexNormals();
      const z = lerp(at.z, z1, Ease.inOut(t)), top = H * up * (1 - fall * 0.85);
      o.position.z = z;
      o.scale.set(1, Math.max(0.05, top), H * 0.75);
      mat.opacity = 0.75 * (1 - fall);
      if (fall < 1) {
        // 波がしらの泡・しぶき、乗っている削りぶし、湯気
        for (let i = 0; i < 14; i++) this.p.emit(V3(at.x + (Math.random() - 0.5) * w, top * (0.85 + Math.random() * 0.15), z - H * 0.6 * (0.2 + Math.random() * 0.4)), V3((Math.random() - 0.5) * 0.8, 0.6 + Math.random() * 1.2, -1.2 - Math.random()), Math.random() < 0.7 ? foam : drop, { life: 0.5, size: 0.15, grav: 3 });
        for (let i = 0; i < 4; i++) this.p.emit(V3(at.x + (Math.random() - 0.5) * w, 0.1, z - H * 0.75 * 0.3), V3((Math.random() - 0.5) * 1.5, 1 + Math.random(), -2), foam, { life: 0.4, size: 0.13, grav: 4 });
        // 巻いた先から、だしが幕のように流れおちる
        for (let i = 0; i < 10; i++) this.p.emit(V3(at.x + (Math.random() - 0.5) * w * 0.85, top * 0.72, z - H * 0.75 * 0.76), V3(0, -0.3, -0.8), Math.random() < 0.5 ? foam : drop, { life: 0.45, size: 0.12, grav: 7 });
        if (Math.random() < 0.5) this.katsuoFlakes(V3(at.x + (Math.random() - 0.5) * w, top, z), 1, { speed: 1.4, size: 0.22 });
        if (Math.random() < 0.35) this.p.emit(V3(at.x + (Math.random() - 0.5) * w, top, z + 0.3), V3(0, 1.2, 0), steam, { life: 0.9, size: 0.3, drag: 1.2 });
      }
      if (t < 1) onZ(z - H * 0.75 * 0.6);
      else if (!o.userData.done) { o.userData.done = true; onZ(-Infinity); res(); }
    }));
  },
  // 光の壁（かばう構え）
  barrier(at, width, col, H = 1.4) {
    const mat = new THREE.MeshBasicMaterial({ color: hdr(col, 1), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    const g = new THREE.Group(); g.position.copy(at);
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(width, H), mat); wall.position.y = H / 2; g.add(wall);
    const lmat = new THREE.MeshBasicMaterial({ color: hdr(col, 2.5), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false });
    for (const y of [0.02, H * 0.36, H * 0.71, H]) { const l = new THREE.Mesh(new THREE.BoxGeometry(width, 0.02, 0.02), lmat); l.position.y = y; g.add(l); }
    this.fx.add(g, 1.0, k => {
      g.scale.y = Ease.back(Math.min(1, k * 4));
      mat.opacity = 0.22 * (k > 0.6 ? (1 - k) / 0.4 : 1);
      lmat.opacity = k > 0.6 ? (1 - k) / 0.4 : 1;
    });
    for (let i = 0; i < 30; i++) this.p.emit(V3(at.x + (Math.random() - 0.5) * width, Math.random() * H, at.z), V3(0, 1, 0), hdr(col, 2.5), { life: 0.7, size: 0.08 });
  },
  // 影の分身：te のまわりの p にあらわれて斬り、消える
  async shadowStrike(e, te, p, col) {
    const cl = this.shadowBody(e.u.key);
    cl.group.position.copy(p);
    cl.group.rotation.y = Math.atan2(te.home.x - p.x, te.home.z - p.z);
    cl.setPose(POSES.windup);
    const life = 0.55, P0 = POSES.windup, P1 = POSES.strike;
    let struck = false;
    this.p.burst(p.clone().add(V3(0, 0.5, 0)), '#3a2a6a', 14, { speed: 2, life: 0.5, size: 0.14 });
    await new Promise(res => this.fx.add(cl.group, life, (k, o, dt) => {
      const s = k * life, f = clamp((s - 0.08) / 0.08, 0, 1);
      for (const key of POSE_KEYS) cl.pose[key] = lerp(P0[key] || 0, P1[key] || 0, f);
      cl.update(dt, GFX.time);
      const op = s < 0.08 ? s / 0.08 : s > 0.3 ? 1 - (s - 0.3) / (life - 0.3) : 1;
      cl.setOpacity(op * 0.85);
      if (f >= 1 && !struck) { struck = true; this.fx.slash(this.hitPoint(te.u), col, { cam: this.camera, size: 2.4 }); res(); }
    }));
  },
  // びっくり箱：放物線で跳んでいき、敵の前でぽんっと開く
  async jackBox(e, te) {
    const cols = ['#ff6a8a', '#6ad8ff', '#ffd76a', '#8aff8a', '#c8a0ff'];
    const g = new THREE.Group(), body = new THREE.Mesh(new THREEX.RoundedBoxGeometry(0.34, 0.3, 0.34, 3, 0.04), toon(pick(cols)));
    g.scale.setScalar(1.4);
    body.position.y = 0.15; g.add(body);
    const lidP = new THREE.Group(); lidP.position.set(0, 0.3, -0.17); g.add(lidP);
    const lid = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.04, 0.36), toon('#ffffff')); lid.position.z = 0.17; lidP.add(lid);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 10), glowMat('#ffe07a', 2)); head.visible = false; g.add(head);
    const from = e.model.tipPos(), to = te.home.clone().add(V3(0, 0, te.model.radius + 0.25));
    const S = 1.4, T1 = 0.2, T2 = 0.26;
    await new Promise(res => this.fx.add(g, 0.7, (k, o) => {
      const s = k * 0.7;
      if (s < T1) { const f = s / T1; o.position.lerpVectors(from, to, f); o.position.y = lerp(from.y, 0, f) + Math.sin(f * Math.PI) * 1.2; o.rotation.y = f * 6; }
      else if (s < T2) { o.position.copy(to); const f = Math.sin((s - T1) / (T2 - T1) * Math.PI); o.scale.set(S * (1 + f * 0.2), S * (1 - f * 0.25), S * (1 + f * 0.2)); }
      else {
        if (!head.visible) { head.visible = true; o.scale.setScalar(S); Sfx.pop(); this.p.burst(to.clone().add(V3(0, 0.6, 0)), pick(cols), 24, { speed: 3, up: 1.5, life: 0.6, size: 0.08 }); res(); }
        const f = Math.min(1, (s - T2) / 0.12);
        lidP.rotation.x = -f * 2.2; head.position.y = 0.3 + Ease.back(f) * 0.45; o.scale.setScalar(S * (s > 0.55 ? 1 - (s - 0.55) / 0.15 : 1));
      }
    }));
  },
  // ピコピコハンマー：敵の横に大きなハンマーがあらわれ、柄の先を支点に頭の上へ振りおろす
  async toyHammer(t) {
    const L = Math.max(0.9, t.model.radius * 1.6), hr = L * 0.26;
    const pivot = new THREE.Group();
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, L, 8), toon('#6ad8ff')); stick.position.y = L / 2; pivot.add(stick);
    const head = new THREE.Group(); head.position.y = L; pivot.add(head);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(hr, hr, hr * 2.4, 18), toon('#ff6a8a')); body.rotation.z = Math.PI / 2; head.add(body);
    for (const sx of [-1, 1]) { const cap = new THREE.Mesh(new THREE.CylinderGeometry(hr * 1.05, hr * 1.05, hr * 0.25, 18), toon('#ffd76a')); cap.rotation.z = Math.PI / 2; cap.position.x = sx * hr * 1.2; head.add(cap); }
    const top = t.model.height + hr;
    pivot.position.set(t.home.x + L, top, t.home.z + 0.1);
    let hit = false;
    await new Promise(res => this.fx.add(pivot, 0.8, k => {
      const s = k * 0.8, f = clamp((s - 0.2) / 0.12, 0, 1);
      pivot.scale.setScalar(Ease.back(Math.min(1, s / 0.15)) * (s > 0.65 ? 1 - (s - 0.65) / 0.15 : 1));
      pivot.rotation.z = lerp(0.15, Math.PI / 2, Ease.in(f));
      if (f >= 1 && !hit) { hit = true; Sfx.boing(); this.squash(t, 0.4); this.p.burst(V3(t.home.x, top, t.home.z), '#ffe066', 18, { speed: 3, life: 0.5, size: 0.09 }); res(); }
    }));
  },
  dropFish(t, delay) {
    const g = new THREE.Group(), mat = toon(pick(['#8ab8d8', '#a8c8e0', '#f2a8a0']));
    g.scale.setScalar(1.7);
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), mat); body.scale.set(0.55, 2.2, 0.9); g.add(body);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.14, 3), mat); tail.position.y = 0.3; tail.scale.z = 0.3; g.add(tail);
    const x = t.home.x + (Math.random() - 0.5) * t.model.radius * 1.6, z = t.home.z + (Math.random() - 0.3) * t.model.radius;
    const spin = (Math.random() - 0.5) * 16;
    GFX.delay(delay).then(() => this.fx.add(g, 0.9, k => {
      const s = k * 0.9;
      if (s < 0.4) { g.position.set(x, 7 - 7 * (s / 0.4) ** 2 + 0.15, z); g.rotation.z = s * spin; }
      else { const f = (s - 0.4) / 0.5; g.position.set(x, 0.2 + Math.sin(Math.min(1, f * 2) * Math.PI) * 0.3, z); g.rotation.z = Math.PI / 2 + Math.sin(f * 30) * 0.3 * (1 - f); g.scale.setScalar(1.7 * (f > 0.7 ? (1 - f) / 0.3 : 1)); }
    }));
  },
  dropPillow(at, y, col, delay) {
    const m = new THREE.Mesh(new THREEX.RoundedBoxGeometry(0.34, 0.24, 0.12, 4, 0.05), toon(col));
    m.rotation.set(0, (Math.random() - 0.5) * 0.4, Math.PI / 2);
    GFX.delay(delay).then(() => this.fx.add(m, 1.5, k => {
      const s = k * 1.5, f = Math.min(1, s / 0.3);
      m.position.set(at.x, y + 0.17 + (1 - f * f) * 4, at.z);
      const b = s > 0.3 && s < 0.45 ? Math.sin((s - 0.3) / 0.15 * Math.PI) * 0.2 : 0;
      m.scale.set(1 + b, 1 - b, 1);
      if (s > 1.2) m.scale.setScalar((1.5 - s) / 0.3);
    }));
  },
  // ---------- マオウの技の部品 ----------
  // 下が濃く、上へ行くほど消える縦のグラデーション（闇の柱）
  fadeUpTex() {
    if (TexCache.fadeUp) return TexCache.fadeUp;
    const c = document.createElement('canvas'); c.width = 4; c.height = 128;
    const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 128);
    gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.55, 'rgba(255,255,255,0.75)'); gr.addColorStop(1, 'rgba(255,255,255,1)');
    g.fillStyle = gr; g.fillRect(0, 0, 4, 128);
    return (TexCache.fadeUp = new THREE.CanvasTexture(c));
  },
  // ふんっ：鼻から、小さな白い息が二つ
  huff(e) {
    const m = e.model; m.group.updateMatrixWorld(true);
    for (const sd of [-1, 1]) {
      const p = m.headPivot.localToWorld(V3(sd * 0.05, 0.22, 0.34)), d = m.headPivot.localToWorld(V3(sd * 0.25, 0.12, 0.6)).sub(p);
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, depthWrite: false })); s.renderOrder = 12;
      this.fx.add(s, 0.45, k => { s.position.copy(p).addScaledVector(d, Ease.out(k)); s.scale.setScalar(1 + k * 1.6); s.material.opacity = 1 - k; });
    }
  },
  // くっくっと笑う：肩をゆらす（dur 秒）
  chuckle(e, dur) {
    const m = e.model, y0 = m.group.position.y;
    return GFX.tween(dur, k => { m.group.position.y = y0 + Math.abs(Math.sin(k * Math.PI * 5)) * 0.05 * (1 - k * 0.5); }).then(() => { m.group.position.y = y0; });
  },
  // マオウの目の位置（s：-1 と 1）と、赤い目のぎらり
  maouEye(e, s) { e.model.group.updateMatrixWorld(true); return e.model.headPivot.localToWorld(V3(s * 0.12, 0.3, 0.3)); },
  eyeGlint(e, col = '#ff3a5a') {
    for (const s of [-1, 1]) { const p = this.maouEye(e, s); this.fx.sprite(p, col, 0.4, 0.5, { k: 4, grow: 0.6 }); this.fx.slash(p, col, { cam: this.camera, size: 0.8, angle: 0, sym: true, life: 0.45 }); }
  },
  // 巨大なマオウの影（いあつ）：角・耳・王冠の黒い影に、つりあがった赤い目
  maouShadowTex() {
    if (TexCache.maouShadow) return TexCache.maouShadow;
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d');
    g.shadowColor = 'rgba(160,123,255,0.9)'; g.shadowBlur = 16; g.fillStyle = '#140a1e';
    g.beginPath(); g.moveTo(34, 256); g.quadraticCurveTo(46, 182, 128, 176); g.quadraticCurveTo(210, 182, 222, 256); g.closePath(); g.fill();
    for (const s of [-1, 1]) {
      g.beginPath(); g.moveTo(128 + s * 44, 86); g.quadraticCurveTo(128 + s * 96, 66, 128 + s * 84, 14); g.quadraticCurveTo(128 + s * 74, 56, 128 + s * 30, 72); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(128 + s * 26, 80); g.lineTo(128 + s * 70, 44); g.lineTo(128 + s * 72, 108); g.closePath(); g.fill();
    }
    g.beginPath(); g.ellipse(128, 130, 74, 62, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(102, 80); g.lineTo(96, 46); g.lineTo(113, 60); g.lineTo(128, 38); g.lineTo(143, 60); g.lineTo(160, 46); g.lineTo(154, 80); g.closePath(); g.fill();
    g.shadowBlur = 0; g.strokeStyle = 'rgba(255,207,74,0.8)'; g.lineWidth = 3; g.stroke();
    for (const s of [-1, 1]) {
      const x = 128 + s * 30, gr = g.createRadialGradient(x, 128, 0, x, 128, 22);
      gr.addColorStop(0, '#fff0f0'); gr.addColorStop(0.35, '#ff3a5a'); gr.addColorStop(1, 'rgba(255,58,90,0)');
      g.fillStyle = gr; g.beginPath(); g.ellipse(x, 128, 22, 11, -s * 0.35, 0, Math.PI * 2); g.fill();
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    return (TexCache.maouShadow = t);
  },
  // のろいの火の玉：その色に光る芯と、まわりのにじみ（size：大きさ）。尾は flameTrail で毎コマ足す
  curseFlame(col, size = 1) {
    const g = new THREE.Group();
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.09 * size, 14, 10), new THREE.MeshBasicMaterial({ color: hdr(col, 1.8) })); core.renderOrder = 12; g.add(core);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: hdr(col, 2.6), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    glow.scale.setScalar(0.42 * size); glow.renderOrder = 12; g.add(glow);
    return g;
  },
  // 火の玉の尾：上へゆらめいて消える炎の粒と、ときどき白い火の粉
  flameTrail(p, col) {
    for (let i = 0; i < 2; i++) this.p.emit(p.clone().add(V3((Math.random() - 0.5) * 0.1, (Math.random() - 0.5) * 0.1, (Math.random() - 0.5) * 0.1)), V3((Math.random() - 0.5) * 0.4, 0.8 + Math.random() * 0.6, (Math.random() - 0.5) * 0.4), hdr(col, 2.4), { life: 0.4, size: 0.16, drag: 2 });
    if (Math.random() < 0.3) this.p.emit(p, V3((Math.random() - 0.5) * 1.2, 0.6 + Math.random(), (Math.random() - 0.5) * 1.2), hdr('#ffffff', 2), { life: 0.3, size: 0.06, drag: 2 });
  },
  // のろいの紋（のろい返し）：二重の円に、ルーンと五芒星と目（白で描いて、色はマテリアルでつける）
  curseSigilTex() {
    if (TexCache.curseSigil) return TexCache.curseSigil;
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d'); g.strokeStyle = '#ffffff'; g.fillStyle = '#ffffff'; g.lineCap = 'round';
    g.lineWidth = 6; g.beginPath(); g.arc(128, 128, 120, 0, Math.PI * 2); g.stroke();
    g.lineWidth = 3; g.beginPath(); g.arc(128, 128, 96, 0, Math.PI * 2); g.stroke();
    for (let i = 0; i < 16; i++) {   // ルーン：短い線を組み合わせた記号
      const a = i / 16 * Math.PI * 2, x = 128 + Math.cos(a) * 108, y = 128 + Math.sin(a) * 108;
      g.save(); g.translate(x, y); g.rotate(a + Math.PI / 2); g.lineWidth = 2.5; g.beginPath();
      g.moveTo(-4, -6); g.lineTo(i % 2 ? 4 : 0, 6); g.moveTo(4, -6); g.lineTo(i % 3 ? -4 : 0, 0); if (i % 4 === 0) { g.moveTo(-5, 0); g.lineTo(5, 0); }
      g.stroke(); g.restore();
    }
    g.lineWidth = 3; g.beginPath();
    for (let i = 0; i <= 5; i++) { const a = -Math.PI / 2 + i * Math.PI * 4 / 5, x = 128 + Math.cos(a) * 92, y = 128 + Math.sin(a) * 92; i ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.stroke();
    g.lineWidth = 4; g.beginPath(); g.ellipse(128, 128, 26, 14, 0, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.arc(128, 128, 7, 0, Math.PI * 2); g.fill();
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    return (TexCache.curseSigil = t);
  },
  // 闇のもや：やわらかい黒紫のかたまりが、ふわっとふくらんで、のぼりながら消える（光らない）
  miasma(p, n, { size = 0.8, up = 0.8, spread = 0.6, life = 0.8 } = {}) {
    for (let i = 0; i < n; i++) {
      const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: '#1c0a2c', transparent: true, depthWrite: false, rotation: Math.random() * 6 })); m.renderOrder = 10;
      const from = p.clone().add(V3((Math.random() - 0.5) * spread, 0, (Math.random() - 0.5) * spread)), v = V3((Math.random() - 0.5) * spread, up * (0.6 + Math.random() * 0.8), (Math.random() - 0.5) * spread);
      const s1 = size * (0.7 + Math.random() * 0.6), L = life * (0.8 + Math.random() * 0.4);
      this.fx.add(m, L, t => { m.position.copy(from).addScaledVector(v, Ease.out(t)); m.scale.setScalar(s1 * (0.4 + 0.8 * Ease.out(t))); m.material.opacity = 0.85 * Math.min(1, t * 5) * (1 - t); });
    }
  },
  // 暗黒ねこ波の大波：幅 w・高さ H の闇の波の壁。まんなか（半幅 hw）が、ねこの頭の形にもりあがって、とがった耳が二つ立つ。
  //   頭の下のほうに、たてに細い赤い目が光る。波は前（-z）へかたむく。ふちは紫に光る。
  //   userData で動かす：rise（立ちあがり 0〜）・lean（前へのかたむき）・eyes（目のひらき）・crouch（ふせる）・drop（くずれる）・fade（うすれる）・gone（消す）
  //   position.z が波の根もとの z。eyePos() で目の位置
  catWave(at, w, H, hw) {
    const NX = 72, NY = 16, n = (NX + 1) * (NY + 1), U = { rise: 0, lean: 0, eyes: 0, crouch: 0, drop: 0, fade: 0 };
    const geo = new THREE.BufferGeometry(), pos = new Float32Array(n * 3), col = new Float32Array(n * 3), idx = [];
    const deep = new THREE.Color('#140a20'), mid = new THREE.Color('#3a1a5e'), light = new THREE.Color('#8a5ad0'), cc = new THREE.Color();
    for (let j = 0; j <= NY; j++) for (let i = 0; i <= NX; i++) {
      const v = j / NY, a = (j * (NX + 1) + i) * 3;
      cc.copy(deep).lerp(mid, Math.min(1, v * 1.6)); if (v > 0.6) cc.lerp(light, ((v - 0.6) / 0.4) ** 1.5);
      cc.multiplyScalar(0.8 + 0.2 * Math.sin((i / NX) * 70 + v * 4) * Math.sin((i / NX) * 23));   // 水のすじ
      col[a] = cc.r; col[a + 1] = cc.g; col[a + 2] = cc.b;
      if (i < NX && j < NY) { const q = j * (NX + 1) + i; idx.push(q, q + NX + 1, q + 1, q + 1, q + NX + 1, q + NX + 2); }
    }
    const col0 = col.slice();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.setIndex(idx);
    // 光を受ける材質で、うねりとかたむきに陰をつける（まっ黒につぶれないよう、紫で少し自ら光らせる）
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: new THREE.Color('#1a0a2a'), transparent: true, depthWrite: false, side: THREE.DoubleSide });
    const body = new THREE.Mesh(geo, mat); body.renderOrder = 11; body.frustumCulled = false;
    // 波がしらの光るふち（頭と耳の形をなぞる）
    const rg = new THREE.BufferGeometry(), rpos = new Float32Array((NX + 1) * 2 * 3), ridx = [];
    for (let i = 0; i < NX; i++) ridx.push(i, i + NX + 1, i + 1, i + 1, i + NX + 1, i + NX + 2);
    rg.setAttribute('position', new THREE.BufferAttribute(rpos, 3)); rg.setIndex(ridx);
    const rmat = new THREE.MeshBasicMaterial({ color: hdr('#b088ff', 2.4), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    const rim = new THREE.Mesh(rg, rmat); rim.renderOrder = 12; rim.frustumCulled = false;
    // 目：たてに細い赤い光と、まんなかの白い芯。目じりがつりあがるよう、内がわへかたむける
    const eyes = [-1, 1].map(s => {
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: hdr('#ff3a5a', 3), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, rotation: s * 0.3 }));
      const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: hdr('#fff0f0', 3), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, rotation: s * 0.3 }));
      glow.renderOrder = core.renderOrder = 13;
      return { s, glow, core };
    });
    const g = new THREE.Group(); g.add(body, rim); for (const e of eyes) g.add(e.glow, e.core);
    g.position.copy(at); g.userData = U;
    // 頭のてっぺんの高さ（H に掛ける）。ゆるくうねる波に、頭のもりあがりと、とがった耳
    const ex = hw * 0.6, ew = hw * 0.36;
    const prof = (x, s) => {
      const ax = Math.abs(x), taper = Math.max(0.04, 1 - Math.abs(2 * x / w) ** 6), earK = Math.min(1, Math.max(0, (U.rise - 0.45) / 0.45));
      let y = 0.56 + Math.sin(x * 1.6 + s * 6) * 0.05 + Math.sin(x * 0.7 - s * 3) * 0.04;
      if (ax < hw) y += 0.24 * Math.cos(ax / hw * Math.PI / 2) ** 0.8;
      const d = Math.abs(ax - ex) / ew; if (d < 1) y += 0.3 * earK * (1 - d) ** 1.4;
      return y * taper;
    };
    // 前後（z）：上ほど前へかたむき、頭のあたりは少し前へせりだす。ゆるく波打つ
    const zAt = (x, v, s) => {
      const head = Math.max(0, 1 - (Math.abs(x) / (hw * 1.3)) ** 2);
      return -(U.lean * 0.6 + head * 0.15) * H * v * v + Math.sin(x * 1.1 + s * 5) * 0.06 * v;
    };
    const hgt = () => H * U.rise * (1 - U.drop * 0.92) * (1 - U.crouch * 0.12);
    const pt = (x, v, s, out) => { out.set(x, v * prof(x, s) * hgt(), zAt(x, v, s)); return out; };
    g.eyePos = () => (g.updateMatrixWorld(true), eyes).map(e => g.localToWorld(pt(e.s * hw * 0.34, 0.62 / prof(e.s * hw * 0.34, GFX.time), GFX.time, V3()).add(V3(0, 0, -0.12))));
    const tmp = V3();
    return this.fx.add(g, 12, (k, o) => {
      if (U.gone) { o.visible = false; return; }
      const s = GFX.time;
      for (let j = 0; j <= NY; j++) for (let i = 0; i <= NX; i++) {
        const a = (j * (NX + 1) + i) * 3, x = (i / NX - 0.5) * w, v = j / NY; pt(x, v, s, tmp);
        pos[a] = tmp.x; pos[a + 1] = tmp.y; pos[a + 2] = tmp.z;
        // 下から上へ流れる、うすい光のすじ（水が波がしらへ巻きあがる）
        const f = 1 + 1.1 * Math.max(0, Math.sin((v * 2.2 - s * 1.3 + Math.sin(x * 0.9) * 0.12) * Math.PI * 2)) ** 8 * v;
        col[a] = col0[a] * f; col[a + 1] = col0[a + 1] * f; col[a + 2] = col0[a + 2] * f;
      }
      geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true; geo.computeVertexNormals();
      for (let r = 0; r < 2; r++) for (let i = 0; i <= NX; i++) {
        const a = (r * (NX + 1) + i) * 3, x = (i / NX - 0.5) * w; pt(x, r ? 1 : 0.9, s, tmp);
        rpos[a] = tmp.x; rpos[a + 1] = tmp.y; rpos[a + 2] = tmp.z - 0.02;
      }
      rg.attributes.position.needsUpdate = true;
      mat.opacity = 0.95 * (1 - U.fade); rmat.opacity = Math.min(1, U.rise * 2) * (1 - U.fade);
      for (const e of eyes) {
        const x = e.s * hw * 0.34, v = 0.62 / prof(x, s); pt(x, v, s, tmp); tmp.z -= 0.12;
        e.glow.position.copy(tmp); e.core.position.copy(tmp);
        const op = Math.max(0, U.eyes);
        e.glow.scale.set(hw * 0.26, Math.max(1e-3, hw * 0.55 * op), 1); e.core.scale.set(hw * 0.07, Math.max(1e-3, hw * 0.4 * op), 1);
        e.glow.material.opacity = e.core.material.opacity = Math.min(1, op) * (1 - U.fade);
      }
      // 波がしらから、紫のしぶき
      if (U.rise > 0.1 && U.fade < 0.6) for (let i = 0; i < 6; i++) {
        const x = (Math.random() - 0.5) * w * 0.9; g.localToWorld(pt(x, 1, s, tmp));
        this.p.emit(tmp.clone(), V3((Math.random() - 0.5) * 0.8, 0.8 + Math.random(), -0.6 - Math.random() * (0.6 + U.lean * 2)), hdr(Math.random() < 0.8 ? '#a07bff' : '#ff3a5a', 2.2), { life: 0.45, size: 0.13, grav: 3 });
      }
    });
  },
  // 地面のひび（r：長さ）。根もとからのびて、しばらくして消える
  groundCracks(at, r) {
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * Math.PI * 2 + Math.random() * 0.5, len = r * (0.6 + Math.random() * 0.6);
      const geo = new THREE.PlaneGeometry(1, 0.06); geo.translate(0.5, 0, 0);
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: '#120818', transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
      m.rotation.set(-Math.PI / 2, 0, a); m.position.set(at.x, 0.035, at.z); m.renderOrder = 10;
      this.fx.add(m, 1.0, k => { m.scale.set(len * Ease.out(Math.min(1, k * 6)), 1 + (1 - k), 1); m.material.opacity = k > 0.6 ? (1 - k) / 0.4 : 1; });
    }
  },
  // 黒い月（滅びの黒月）：まっ黒な玉に、ふちの細い光の輪と、うしろの紅いにじみ（日食の月）。
  //   userData.size で大きさ（R に掛ける）を、userData.gone で消す。position を動かすと、輪とにじみもついてくる
  blackMoonBody(at, R) {
    const g = new THREE.Group(); g.position.copy(at); g.userData.size = 0;
    const core = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), new THREE.MeshBasicMaterial({ color: '#05030a', fog: false })); core.renderOrder = 12;
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: hdr('#ff3a5a', 2.2), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false })); halo.renderOrder = 11;
    const rim = new THREE.Mesh(new THREE.RingGeometry(0.97, 1.07, 64), new THREE.MeshBasicMaterial({ color: hdr('#ffd0d8', 2.6), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false })); rim.renderOrder = 13;
    g.add(core, halo, rim);
    return this.fx.add(g, 6, (k, o, dt) => {
      const s = Math.max(1e-3, g.userData.size * R), t = GFX.time;
      if (g.userData.gone) { o.visible = false; return; }
      core.scale.setScalar(s);
      halo.scale.setScalar(s * (3.2 + Math.sin(t * 9) * 0.15)); halo.material.opacity = Math.min(1, g.userData.size * 1.5);
      rim.scale.setScalar(s); rim.quaternion.copy(this.camera.quaternion);
    });
  },
  // 闇のドーム：at の地面から、半径 r0 → r1 へ一気にふくらむ黒い半球。すそに紅い光の輪がついて、うすれて消える
  darkDome(at, r0, r1, life) {
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#0c0614', transparent: true, depthWrite: false, side: THREE.DoubleSide }));
    dome.position.copy(at); dome.renderOrder = 11;
    const hem = new THREE.Mesh(new THREE.TorusGeometry(1, 0.025, 8, 64), new THREE.MeshBasicMaterial({ color: hdr('#ff3a5a', 3), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
    hem.rotation.x = Math.PI / 2; hem.position.set(at.x, at.y + 0.08, at.z); hem.renderOrder = 12;
    const size = k => lerp(r0, r1, Ease.out(Math.min(1, k * 2.2)));
    this.fx.add(hem, life, k => { hem.scale.setScalar(size(k)); hem.material.opacity = 1 - k; });
    return this.fx.add(dome, life, k => {
      const s = size(k);
      dome.scale.set(s, s * 0.8, s);
      dome.material.opacity = 0.9 * (k < 0.35 ? 1 : 1 - (k - 0.35) / 0.65);
    });
  },
});
