'use strict';
// ============================================================
//  技ごとのモーション（BattleView に足す）
//  技の定義（CHARS・WEAPONS）の anim で選ぶ。anim のない技は views.js の共通の動き
//  （近接：飛びこんで斬る／遠距離：弾を撃つ／味方へ：杖を掲げる）
//  MOVES[anim] の中身：
//    attack(e, ts, c)  敵への技（ts：対象の ent、c：{ col, ult, kind, opt }）
//    hop(e, te, c)     連続攻撃（bounce）の 2 発目から
//    support(e, ts, c) 味方への技（技の効果より先に動く）
//  ダメージのない技は、技の run から B.motion(s, anim) で動きだけを出す（attack か support を使う）
//    keep：友情技で、先に持ち場をはなれた相方を戻さずに残す（最後の attackEnd でみんな戻る）
// ============================================================
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
  // しっぽ：敵の前で背を向け、くるりと一回転してなぎ払う
  tail: {
    async attack(e, ts, c) {
      const t = ts[0], m = e.model, dest = this.meleeSpot(t, 0.6);
      this.sideCam(dest, t);
      await this.dashTo(e, dest, { pose: POSES.ready, dur: 0.28, hop: 0.3 });
      const y0 = Math.atan2(t.home.x - dest.x, t.home.z - dest.z);
      this.tweenPose(m, POSES.tailSpin, 0.12);
      await GFX.tween(0.12, k => { m.tailOut = k; m.group.rotation.y = y0 + k * 0.5; });
      let swept = false;
      await GFX.tween(0.34, (k, p) => {
        m.group.rotation.y = y0 + 0.5 + k * (Math.PI * 2 - 0.5);
        if (!swept && p > 0.4) {
          swept = true;
          this.fx.slash(this.hitPoint(t.u).add(V3(0, -0.15, 0)), c.col, { cam: this.camera, size: 2.6, angle: 0.08 });
          this.squash(t, 0.15);
        }
      }, Ease.inOut);
      GFX.tween(0.25, k => { m.tailOut = 1 - k; });
    },
  },
  // ---------------- ミケ（剣）：技ごとに、剣のふるい方を変える ----------------
  // 勇者のつるぎ：敵の前へ駆けこみ、かかげた切っ先がきらり。横一文字に、となりの敵ごとなぎ払う
  hero: {
    async attack(e, ts, c) {
      const t = ts[0], m = e.model, dest = this.meleeSpot(t, 0.8);
      const cx = ts.reduce((a, x) => a + x.home.x, 0) / ts.length;
      this.setCam(V3(cx + 2.4, 2.3, dest.z + 3.4), V3(cx - 0.2, 0.7, t.home.z), { speed: 5 });
      await this.dashTo(e, dest, { pose: POSES.dash, dur: 0.26, hop: 0.15 });
      this.face(e, t.home);
      await this.tweenPose(m, POSES.raise, 0.14);
      this.glint(m.tipPos(), '#fff4c8', 1.1);
      await GFX.delay(0.18);
      await this.tweenPose(m, POSES.strike2, 0.08);
      await this.sweep(m, POSES.strike, 0.16, c.col, { twist: -0.9 });
      // 横一文字：剣をふった向き（右から左）へ、細い光が敵の列をなぞっていく
      const ps = ts.map(x => this.hitPoint(x.u)), mid = ps.reduce((a, p) => a.add(p), V3()).multiplyScalar(1 / ps.length);
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
      // 横から少し見上げて：両手で立てた剣が、空へ向かってのびていく
      this.setCam(V3(h.x + 4.2, 1.0, h.z + 0.9), V3(h.x - 0.2, 1.6, h.z - 0.9), { snap: true });
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
      // 横から：振りおろすと、光の筋が地面を走って敵へとどく
      const mid = h.clone().lerp(t.home, 0.5);
      this.setCam(V3(mid.x + 7.5, 2.6, mid.z + 0.6), V3(mid.x, 1.2, mid.z), { snap: true });
      Sfx.swing();
      await this.sweep(m, POSES.cleave, 0.12, c.col, { n: 8, size: 0.2 });
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
  // 波：振りおろした剣・笏から、大きな波が敵へ押しよせる
  wave: {
    async attack(e, ts, c) {
      const m = e.model, h = e.home, cen = this.enemyCenter();
      this.focus(e);
      this.setCam(V3(h.x + 1.8, 1.6, h.z + 2.6), V3(cen.x, 0.7, cen.z), { speed: 4 });
      this.face(e, cen);
      await this.tweenPose(m, POSES.raise, 0.25);
      m.flash(c.col, 1);
      await GFX.delay(0.15);
      await this.tweenPose(m, POSES.cleave, 0.08);
      const far = Math.max(...ts.map(t => h.distanceTo(t.home))) + 1.5;
      this.waveFx(h, c.col, { to: far, dur: 0.6 });
      GFX.delay(0.12).then(() => this.waveFx(h, c.col, { to: far, dur: 0.6, h: 0.8 }));
      GFX.shake(0.15);
      await GFX.delay(0.5);
      this.unfocus();
    },
  },
  // 漆黒の帳：まっ黒な帳が敵を包み、内側から裂ける
  curtain: {
    async attack(e, ts, c) {
      const m = e.model, cen = this.enemyCenter();
      this.face(e, cen);
      this.setCam(V3(cen.x + 1.5, 3.0, cen.z + 8.5), V3(cen.x, 1.4, cen.z), { speed: 3 });
      await this.tweenPose(m, POSES.raise, 0.25);
      this.fx.sprite(m.tipPos(), c.col, 1.4, 0.5, { k: 3 });
      const r = Math.max(3, ...ts.map(t => Math.hypot(t.home.x - cen.x, t.home.z - cen.z) + t.model.radius * 1.6));
      const mat = new THREE.MeshBasicMaterial({ color: '#07040c', transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
      const dome = new THREE.Mesh(new THREE.SphereGeometry(r, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2), mat);
      dome.scale.set(1, 0.85, 0.7);
      this.fx.add(dome, 1.3, k => {
        const d = Math.min(1, k / 0.45);
        dome.position.set(cen.x, (1 - Ease.out(d)) * 6, cen.z);
        mat.opacity = k < 0.75 ? Ease.out(d) * 0.88 : 0.88 * (1 - (k - 0.75) / 0.25);
      });
      await this.every(0.75, 18, () => this.p.emit(V3(cen.x + (Math.random() - 0.5) * r * 1.6, Math.random() * 2, cen.z + (Math.random() - 0.5) * r), V3(0, 1.5, 0), hdr(c.col, 4), { life: 0.5, size: 0.12 }));
      GFX.flash(c.col, 0.35, 0.3);
      for (let i = 0; i < 4; i++) this.fx.slash(V3(cen.x + (Math.random() - 0.5) * r, 1 + Math.random(), cen.z), c.col, { cam: this.camera, size: 5, angle: Math.random() * Math.PI });
      this.p.burst(V3(cen.x, 1, cen.z), c.col, 90, { speed: 9, life: 0.8, size: 0.12 });
    },
  },
  // 威圧：笏を高く掲げ、上から押さえつける闇で敵をすくませる
  aura: {
    async attack(e, ts, c) {
      const m = e.model, h = e.home, cen = this.enemyCenter();
      const was = m.face && m.face.expr;
      this.focus(e); this.face(e, cen);
      this.setCam(V3(h.x + 0.8, 0.45, h.z - 2.0), V3(h.x, 1.0, h.z), { snap: true });
      if (m.face) m.face.set('angry');
      await this.tweenPose(m, POSES.raise, 0.25);
      m.flash(c.col, 1);
      this.fx.ring(h.clone().add(V3(0, 0.05, 0)), c.col, { r: 2.6, life: 0.6, width: 0.2 });
      await this.every(0.45, 12, () => { const a = Math.random() * Math.PI * 2; this.p.emit(h.clone().add(V3(Math.cos(a) * 0.6, 0.1, Math.sin(a) * 0.6)), V3(0, 2.5, 0), hdr(c.col, 3), { life: 0.6, size: 0.12 }); });
      this.unfocus();
      this.foeCam(ts, 0.8, 5);
      await GFX.delay(0.15);
      for (const t of ts) {
        const g = t.home.clone().add(V3(0, 0.05, 0)), r = t.model.radius;
        this.fx.ring(g, c.col, { r: r * 2.6, life: 0.6, width: 0.2 });
        for (let i = 0; i < 16; i++) this.p.emit(V3(g.x + (Math.random() - 0.5) * r * 2, t.model.height + 1.5 + Math.random(), g.z + (Math.random() - 0.5) * r), V3(0, -7, 0), hdr(c.col, 3), { life: 0.35, size: 0.12, drag: 0 });
        this.squash(t, 0.3);
      }
      GFX.shake(0.15); GFX.flash(c.col, 0.2, 0.3);
      await GFX.delay(0.1);
      if (m.face) GFX.delay(0.6).then(() => m.face.set(was || 'neutral'));
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
      if (c.ult) for (let i = 0; i < 80; i++) this.p.emit(V3((Math.random() - 0.5) * 12, 3 + Math.random() * 4, -3 + (Math.random() - 0.5) * 6), V3(0, -2, 0), hdr('#ffffff', 2.5), { life: 1.4, size: 0.06, drag: 0.5 });
      await GFX.delay(0.3);
      ts.forEach((t, ti) => {
        const r = t.model.radius, n = ti === 0 || c.ult ? 6 : 4;
        for (let j = 0; j < n; j++) {
          const a = j / n * Math.PI * 2 + Math.random() * 0.5, d = r * (0.5 + Math.random() * 0.5);
          this.fx.iceSpike(t.home.clone().add(V3(Math.cos(a) * d, 0, Math.sin(a) * d)), { h: (0.7 + Math.random() * 0.7) * (c.ult ? 1.6 : 1) * Math.max(1, r), r: 0.16 * Math.max(1, r), dir: a, tilt: 0.4, life: 1.1, color: c.col });
        }
      });
      await GFX.delay(0.12);
    },
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
  // 三つののろい：燃焼・感電・裂創の三つの玉が、うずを巻いて飛ぶ
  curse3: {
    async attack(e, ts, c) {
      const m = e.model, h = e.home, t = ts[0];
      this.focus(e);
      this.setCam(V3(h.x + 1.2, 1.3, h.z + 2.4), V3(t.home.x * 0.7, 1.0, t.home.z), { speed: 5 });
      this.face(e, t.home);
      await this.tweenPose(m, POSES.cast, 0.2);
      // 三つの玉が、うずを巻きながら敵へ
      const tip = m.tipPos(), to = this.hitPoint(t.u), dir = to.clone().sub(tip).normalize();
      const u = V3(0, 1, 0).cross(dir).normalize(), w = dir.clone().cross(u);
      const cols = ['fire', 'lightning', 'physical'].map(k => ELEMENTS[k].color);
      await new Promise(res => {
        const orbs = cols.map(col => { const o = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: hdr(col, 3), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); o.scale.setScalar(0.75); o.renderOrder = 12; return o; });
        const g = new THREE.Group(); orbs.forEach(o => g.add(o));
        this.fx.add(g, 0.55, k => {
          const p = tip.clone().lerp(to, Ease.inOut(k)), r = 0.35 * Math.sin(k * Math.PI) + 0.04;
          orbs.forEach((o, i) => {
            const a = k * 14 + i * Math.PI * 2 / 3;
            o.position.copy(p).addScaledVector(u, Math.cos(a) * r).addScaledVector(w, Math.sin(a) * r);
            this.p.emit(o.position, V3(0, 0, 0), hdr(cols[i], 2.5), { life: 0.35, size: 0.16 });
          });
          if (k >= 1) res();
        });
      });
      cols.forEach((col, i) => this.fx.ring(to, col, { r: 0.9 + i * 0.3, life: 0.4, face: this.camera.position, width: 0.08 }));
      this.unfocus();
    },
  },
  // 影分身：2 発目からは、影の分身が敵のまわりにあらわれて斬る
  shadow: {
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
  // 元魔王の号令：マオウが笏を振りあげて号令をかけ、みんなが拳をあげて奮い立つ。そして闇の波が敵へ
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
  sweep(m, pose, dur, col, { twist = pose.twist || 0, n = 3, size = 0.12 } = {}) {
    const from = { ...m.pose }, c = hdr(col, 3);
    return GFX.tween(dur, k => {
      for (const key of POSE_KEYS) m.pose[key] = lerp(from[key], pose[key] || 0, k);
      m.pose.twist = lerp(from.twist, twist, k);
      const tp = m.tipPos();
      for (let i = 0; i < n; i++) this.p.emit(tp, V3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(0.4), c, { life: 0.3, size, drag: 4 });
    }, Ease.in);
  },
  // きらり：十字の光
  glint(p, col, size = 1) {
    this.fx.sprite(p, col, size * 0.8, 0.3, { k: 4, grow: 1.2 });
    for (const a of [0, Math.PI / 2]) this.fx.slash(p, col, { cam: this.camera, size: size * 1.6, angle: a, life: 0.3 });
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
    const g = t.model.group, s0 = g.scale.clone();
    GFX.tween(0.4, k => {
      if (t.dying) return;
      const s = Math.sin(k * Math.PI) * amt * (1 - k * 0.5);
      g.scale.set(s0.x * (1 + s * 0.6), s0.y * (1 - s), s0.z * (1 + s * 0.6));
    }, Ease.out).then(() => { if (!t.dying) g.scale.copy(s0); });
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
  // 光の壁（かばう構え）
  barrier(at, width, col) {
    const mat = new THREE.MeshBasicMaterial({ color: hdr(col, 1), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    const g = new THREE.Group(); g.position.copy(at);
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(width, 1.4), mat); wall.position.y = 0.7; g.add(wall);
    const lmat = new THREE.MeshBasicMaterial({ color: hdr(col, 2.5), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false });
    for (const y of [0.02, 0.5, 1.0, 1.4]) { const l = new THREE.Mesh(new THREE.BoxGeometry(width, 0.02, 0.02), lmat); l.position.y = y; g.add(l); }
    this.fx.add(g, 1.0, k => {
      g.scale.y = Ease.back(Math.min(1, k * 4));
      mat.opacity = 0.22 * (k > 0.6 ? (1 - k) / 0.4 : 1);
      lmat.opacity = k > 0.6 ? (1 - k) / 0.4 : 1;
    });
    for (let i = 0; i < 30; i++) this.p.emit(V3(at.x + (Math.random() - 0.5) * width, Math.random() * 1.4, at.z), V3(0, 1, 0), hdr(col, 2.5), { life: 0.7, size: 0.08 });
  },
  // 影の分身：te のまわりの p にあらわれて斬り、消える
  async shadowStrike(e, te, p, col) {
    const cl = buildCharacter(e.u.key);
    cl.group.traverse(o => {
      if (!o.isMesh) return;
      if (o.userData.outline) { o.visible = false; return; }
      o.material = o.material.clone();
      Object.assign(o.material, { transparent: true, opacity: 0, depthWrite: false });
      if (o.material.color) o.material.color.set('#16122a');
      if (o.material.emissive) { o.material.emissive.set('#4a3aa8'); o.material.emissiveIntensity = 0.35; }
      o.castShadow = false;
    });
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
      o.traverse(x => { if (x.isMesh && !x.userData.outline) x.material.opacity = op * 0.85; });
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
});
