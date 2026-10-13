'use strict';
// ============================================================
//  敵の技のモーション（BattleView に足す）
//  ENEMY_MOVES の anim で選ぶ。anim のない技は views.js の共通の動き（体当たり／全体は爆発）
//  技の定義に書けるもの：elem（見た目の色。ダメージは物理のまま）・obj（投げる物・降らせる物）・glyph（飛ばす文字）
//  FOE_MOVES[anim](e, ts, c)：e＝敵の ent、ts＝ねらわれた味方の ent、c＝{ col, mv }
//  敵が動いたら this.lastEnemy = { src, from } を立てる（enemyAttackEnd でもどる）
//  2頭身の骨組みの敵（ネズミ・魔族・魔王など。model.critter）は、手足のポーズも動かす
// ============================================================
const FOE_MOVES = {
  // ひっかき：とびかかって、三本の爪あと
  async claw(e, ts, c) {
    const t = ts[0];
    await this.foeLunge(e, t, { pose: POSES.windup });
    await this.foePose(e, POSES.strike, 0.07);
    this.clawFx(this.hitPoint(t.u), c.col, 3);
  },
  // かみつき・つっつき：とびかかって、がぶっ（つっつきは三回つつく）
  async bite(e, ts, c) {
    const t = ts[0];
    await this.foeLunge(e, t, { pose: POSES.ready });
    if (c.mv.glyph === 'peck') {
      for (let i = 0; i < 3; i++) { await this.foeNudge(e, t, 0.25, 0.07); this.fx.sprite(this.hitPoint(t.u).add(V3((Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3, 0)), c.col, 0.7, 0.18, { k: 3 }); }
      return;
    }
    await this.foeNudge(e, t, 0.35, 0.08);
    this.jawFx(this.hitPoint(t.u), c.col, Math.max(1, t.model.height * 0.8));
  },
  // 大きく振りかぶって斬る（重い一撃・孤高の剣）。snip はハサミで十字に
  async slash(e, ts, c) {
    const t = ts[0];
    await this.foeLunge(e, t, { pose: POSES.charge, back: 0.9 });
    await this.foePose(e, POSES.cleave, 0.08);
    const p = this.hitPoint(t.u);
    if (c.mv.glyph === 'x') {
      this.fx.slash(p, c.col, { cam: this.camera, size: 2.6, angle: 0.8 });
      this.fx.slash(p, c.col, { cam: this.camera, size: 2.6, angle: -0.8 });
      this.fx.ring(p, '#ffffff', { r: 0.9, life: 0.25, face: this.camera.position, width: 0.08 });
    } else {
      this.fx.slash(p, c.col, { cam: this.camera, size: 3.2, angle: Math.PI / 2 - 0.25 });
      this.fx.slash(p, '#ffffff', { cam: this.camera, size: 2.4, angle: Math.PI / 2 - 0.25 });
    }
    GFX.shake(0.12);
  },
  // パンチ・おたまでポカリ：こぶし（おたま）でぽかっ。星が散る
  async punch(e, ts, c) {
    const t = ts[0];
    await this.foeLunge(e, t, { pose: POSES.punchUp });
    await this.foePose(e, e.model.critter && e.model.critter.extras.tip ? POSES.strike : POSES.punch, 0.07);   // 武器（おたま・フォーク）を持つ子は振りおろす
    const p = this.hitPoint(t.u);
    this.fx.ring(p, c.col, { r: 1.0, life: 0.3, face: this.camera.position, width: 0.1 });
    this.starFx(p.clone().add(V3(0, 0.3, 0)), c.col);
    this.squash(t, 0.25);
  },
  // のしかかる（キングプレス・もふもふハグ）：高く跳んで、上から落ちてくる
  async press(e, ts, c) {
    const t = ts[0], g = e.model.group, from = g.position.clone(), top = t.model.height + 0.1;
    this.lastEnemy = { src: e.u, from };
    this.foeFlash(e, c.col);
    await this.foePose(e, POSES.jump, 0.15);
    const dest = t.home.clone().add(V3(0, 0, -0.1));
    await GFX.tween(0.45, k => { g.position.lerpVectors(from, dest, k); g.position.y = Math.sin(k * Math.PI) * 3 + top * Ease.in(k); }, Ease.inOut);
    await GFX.tween(0.1, k => { g.position.y = top * (1 - k); }, Ease.in);
    g.position.y = top * 0.4;
    this.foePose(e, POSES.slam, 0.08);
    this.squash(t, 0.5);
    this.fx.ring(t.home.clone().add(V3(0, 0.05, 0)), c.col, { r: 2.6, life: 0.5, width: 0.25 });
    this.dustFx(t.home, 18);
    if (c.mv.glyph === 'heart') this.heart(this.headPos(t).add(V3(0, 0.6, 0)));
    GFX.shake(0.25);
    // 相手の上から、うしろへ降りる
    await GFX.tween(0.18, k => { g.position.y = top * 0.4 + Math.sin(k * Math.PI) * 0.5; g.position.z = dest.z - k * (t.model.radius + e.model.radius); });
  },
  // たいあたり・まっしぐら：うしろへためて、まっすぐ突っこむ
  async tackle(e, ts, c) {
    const t = ts[0], g = e.model.group, from = g.position.clone();
    this.lastEnemy = { src: e.u, from };
    this.face(e, t.home);
    const dir = t.home.clone().sub(from).setY(0).normalize();
    this.foeFlash(e, c.col);
    this.foePose(e, POSES.dash, 0.2);
    await GFX.tween(0.25, k => { g.position.copy(from).addScaledVector(dir, -0.5 * Ease.out(k)); g.rotation.x = -0.15 * k; });
    const back = g.position.clone(), dest = t.home.clone().addScaledVector(dir, -(t.model.radius + e.model.radius + 0.1));
    await GFX.tween(c.mv.glyph === 'rush' ? 0.32 : 0.22, k => {
      g.position.lerpVectors(back, dest, k); g.position.y = Math.abs(Math.sin(k * Math.PI * 4)) * 0.08;
      if (Math.random() < 0.6) this.dustFx(g.position, 1);
    }, Ease.in);
    g.rotation.x = 0;
    this.foeKnock(t, dir, 0.6);
    this.fx.sprite(this.hitPoint(t.u), c.col, 1.8, 0.25, { k: 3 });
    GFX.shake(0.18);
  },
  // ごろごろ：転がって突っこみ、となりの子もはじきとばす
  async roll(e, ts, c) {
    const t = ts[0], g = e.model.group, from = g.position.clone(), h = e.model.height / 2;
    this.lastEnemy = { src: e.u, from };
    this.face(e, t.home);
    const dir = t.home.clone().sub(from).setY(0).normalize(), dest = t.home.clone().addScaledVector(dir, -(t.model.radius + e.model.radius));
    const rollAt = (p, a) => { g.rotation.x = a; g.position.set(p.x, h - h * Math.cos(a), p.z - h * Math.sin(a)); };
    const P = V3();
    await GFX.tween(0.45, k => { P.lerpVectors(from, dest, k); rollAt(P, k * Math.PI * 4); if (Math.random() < 0.7) this.dustFx(P, 1); }, Ease.in);
    rollAt(dest, 0); g.rotation.x = 0; g.position.copy(dest);
    this.foeKnock(t, dir, 0.5);
    ts.slice(1).forEach(a => this.foeKnock(a, V3(Math.sign(a.home.x - t.home.x), 0, 0.5).normalize(), 0.4));
    this.fx.ring(t.home.clone().add(V3(0, 0.1, 0)), c.col, { r: 2.4, life: 0.4, width: 0.2 });
    GFX.shake(0.2);
  },
  // 投げる（どんぐり・まんじゅう・お手玉・書類）
  async toss(e, ts, c) {
    this.foeFlash(e, c.col);
    await this.foePose(e, POSES.windup, 0.18);
    this.foePose(e, POSES.strike, 0.08);
    this.foeHop(e, 0.15);
    const from = this.foeMouth(e);
    await Promise.all(ts.map((t, i) => GFX.delay(i * 0.08).then(async () => {
      await this.tossFx(from, this.hitPoint(t.u), c.mv.obj, i === 0 ? 1 : 0.8);
      this.squash(t, 0.2);
      this.p.burst(this.hitPoint(t.u), c.col, 14, { speed: 3, life: 0.4, size: 0.08 });
    })));
  },
  // 吐く（ほのお・こおり・胞子・ガス・ほこり・湯気）：口もとから、ねらった子へ流れていく
  async breath(e, ts, c) {
    const o = c.mv.obj || 'fire', from = this.foeMouth(e), big = o === 'gas' || o === 'dust';
    this.foeFlash(e, c.col);
    await this.foePose(e, { ...POSES.cast, lean: -0.2, headX: -0.3 }, 0.2);
    this.foeLean(e, -0.15, 0.2);
    this.foePose(e, { ...POSES.cast, lean: 0.25, headX: 0.15 }, 0.12);
    this.foeLean(e, 0.2, 0.12);
    const cols = { fire: ['#ff6a3c', '#ffd23c'], ice: ['#6fd6f5', '#ffffff'], spore: ['#ff9ad8', '#fff0a8'], gas: ['#9aff8a', '#ff9ad8'], dust: ['#b8b0a0', '#e8e0d0'], steam: ['#ffffff', '#ffb87a'] }[o] || [c.col, '#ffffff'];
    const to = ts.map(t => this.hitPoint(t.u));
    await this.every(0.55, 44, i => {
      const p = to[i % to.length], d = p.clone().sub(from), dur = big ? 0.75 : 0.45;
      const v = d.multiplyScalar(1 / dur).add(V3((Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.8));
      this.p.emit(from, v, hdr(cols[i % 2], o === 'dust' ? 1.2 : 2.6), { life: dur, size: big ? 0.3 : 0.2, drag: 0, grav: o === 'fire' ? -1.5 : o === 'ice' ? 0.6 : 0 });
      // ふくらみながら流れる、息のかたまり（明るい背景でも見えるように）
      if (i % 4 === 0) this.puffFx(from, p, cols[0], dur, big ? 1.4 : 1.0, o === 'dust' ? 1 : 2);
    });
    for (const t of ts) {
      const p = this.hitPoint(t.u);
      if (o === 'ice') this.fx.sigil(t.home.clone().add(V3(0, 0.06, 0)), c.col, { r: 0.8, life: 0.6 });
      else this.p.burst(p, cols[0], 20, { speed: 2, up: 1, life: 0.6, size: big ? 0.22 : 0.12 });
    }
    this.foeLean(e, 0, 0.2);
  },
  // ビーム・まなざし：目（口もと）に光をためて、まっすぐ放つ
  async beam(e, ts, c) {
    const from = this.foeMouth(e), thin = c.mv.glyph === 'gaze';
    this.foePose(e, POSES.cast, 0.25);
    this.foeFlash(e, c.col);
    const glow = this.fx.sprite(from, c.col, 0.3, 0.6, { k: 4, grow: 1 });
    await GFX.tween(0.4, k => { glow.scale.setScalar(0.3 + k * 1.2); });
    for (const t of ts) {
      const p = this.hitPoint(t.u);
      this.fx.beam(from, p, c.col, { life: 0.35, r: thin ? 0.03 : t === ts[0] ? 0.16 : 0.1 });
      this.fx.beam(from, p, '#ffffff', { life: 0.25, r: thin ? 0.012 : 0.05 });
      this.fx.ring(p, c.col, { r: 1.1, life: 0.35, face: this.camera.position, width: 0.1 });
      if (thin) { t.model.flash('#c8b890', 1.5); this.fx.shards(p, '#c8b890', 8, 2.5); }
    }
    GFX.shake(0.08);
    await GFX.delay(0.12);
  },
  // びりびり：体から稲妻が走る
  async zap(e, ts, c) {
    this.foeFlash(e, c.col);
    await this.foeHop(e, 0.3);
    const from = this.foeMouth(e);
    for (const t of ts) {
      const p = this.hitPoint(t.u);
      for (let i = 0; i < 3; i++) GFX.delay(i * 0.07).then(() => this.fx.bolt(from, p, c.col, { life: 0.15, segs: 12, jag: 0.2, r: 0.025 }));
      this.fx.sprite(p, c.col, 1.4, 0.3, { k: 4 });
    }
    Sfx.zap();
    await GFX.delay(0.22);
  },
  // かげぬい：影から黒い棘が突き出して、足をぬいとめる
  async spike(e, ts, c) {
    this.foeFlash(e, c.col);
    await this.foePose(e, POSES.raise, 0.2);
    for (const t of ts) {
      const g = t.home.clone();
      this.fx.ring(g.clone().add(V3(0, 0.05, 0)), c.col, { r: 1.2, life: 0.5, width: 0.3 });
      for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; this.fx.iceSpike(g.clone().add(V3(Math.cos(a) * 0.35, 0, Math.sin(a) * 0.35)), { h: 0.7 + Math.random() * 0.4, r: 0.08, dir: a, tilt: 0.5, life: 0.9, color: c.col }); }
    }
    await GFX.delay(0.2);
  },
  // 降らせる（なみだ・カレー・ろう・メテオ）：上を見上げると、ねらった子の上から降ってくる
  async rain(e, ts, c) {
    const o = c.mv.obj || 'drop';
    this.foeFlash(e, c.col);
    await this.foePose(e, POSES.raise, 0.2);
    this.foeHop(e, 0.2);
    this.p.burst(this.foeMouth(e).add(V3(0, 0.5, 0)), c.col, 20, { speed: 3, up: 3, life: 0.6, size: 0.1 });
    const n = ts.length === 1 ? 6 : o === 'meteor' ? 2 : 4;
    await Promise.all(ts.flatMap((t, i) => Array.from({ length: n }, (_, j) => GFX.delay(0.15 + i * 0.05 + j * 0.07).then(() => this.dropFx(t, o, c.col)))));
  },
  // 叫ぶ・笑う・いびき・おしゃべり：声の輪と文字が、こちらへとどく
  async shout(e, ts, c) {
    const from = this.foeMouth(e), gl = c.mv.glyph;
    this.foeFlash(e, c.col);
    await this.foePose(e, { ...POSES.open, headX: -0.3 }, 0.18);
    this.foeLean(e, -0.15, 0.18);
    const dark = c.mv.obj === 'dark';
    const cen = ts.reduce((a, t) => a.add(t.home), V3()).multiplyScalar(1 / ts.length).add(V3(0, 0.7, 0));
    await this.every(0.6, 6, i => {
      this.fx.ring(from.clone().lerp(cen, i / 8), c.col, { r: 1 + i * 0.4, life: 0.5, face: this.camera.position, width: 0.08, k: dark ? 1.6 : 3 });
      if (gl) for (const t of ts) if (i % 2 === 0) this.glyphFly(gl, from, this.hitPoint(t.u).add(V3(0, 0.6, 0)), c.col);
      if (dark) for (let j = 0; j < 6; j++) this.p.emit(from, cen.clone().sub(from).multiplyScalar(1.8).add(V3((Math.random() - 0.5) * 3, (Math.random() - 0.5), 0)), hdr(c.col, 2), { life: 0.6, size: 0.18, drag: 0 });
    });
    for (const t of ts) { this.foeKnock(t, V3(0, 0, 1), 0.2); t.model.flash(c.col, 0.8); }
    this.foeLean(e, 0, 0.2);
  },
  // こしょこしょ：みんなのまわりで羽根がくすぐる
  async tickle(e, ts, c) {
    this.foeFlash(e, c.col);
    await this.foeHop(e, 0.25);
    for (const t of ts) {
      const p = this.hitPoint(t.u);
      for (let i = 0; i < 2; i++) {
        const f = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), toon('#fff4fa'));
        const s = i ? 1 : -1, base = p.clone().add(V3(s * 0.35, 0, -0.2));
        this.fx.add(f, 0.9, k => { f.position.copy(base).add(V3(Math.sin(k * 40) * 0.06, Math.sin(k * 25) * 0.05, 0)); f.rotation.z = s * 0.6 + Math.sin(k * 40) * 0.5; f.scale.set(0.35, 1.6, 0.2).multiplyScalar(k > 0.8 ? (1 - k) * 5 : 1); });
      }
      const g = t.model.group, x0 = t.home.x;
      GFX.tween(0.8, k => { g.position.x = x0 + Math.sin(k * 50) * 0.04 * (1 - k); }).then(() => { g.position.x = x0; });
    }
    Sfx.laugh();
    await GFX.delay(0.8);
  },
  // 地ならし（おおあばれ・大地ゆらし・寝返り・ぷるるん）：跳んで地面をたたき、ゆれがみんなへとどく
  async quake(e, ts, c) {
    const g = e.model.group, h = e.home;
    this.foeFlash(e, c.col);
    const spin = c.mv.glyph === 'spin';
    await this.foePose(e, POSES.jump, 0.15);
    await GFX.tween(0.35, k => { g.position.y = Math.sin(k * Math.PI) * 1.2; if (spin) g.rotation.y = k * Math.PI * 4; });
    g.rotation.y = 0;
    this.foePose(e, POSES.slam, 0.08);
    this.squashFoe(e, 0.3);
    GFX.shake(0.3);
    this.dustFx(h, 20);
    const far = Math.max(...ts.map(t => h.distanceTo(t.home))) + 1;
    this.fx.ring(h.clone().add(V3(0, 0.05, 0)), c.col, { r: far, life: 0.5, width: 0.5 });
    await GFX.delay(0.25);
    for (const t of ts) { const gg = t.model.group; GFX.tween(0.3, k => { gg.position.y = Math.sin(k * Math.PI) * 0.35; }); this.dustFx(t.home, 6); }
    await GFX.delay(0.1);
  },
  // 大行進・大突進：みんなのあいだを駆けぬけて、またもどる
  async stampede(e, ts, c) {
    const g = e.model.group, from = g.position.clone();
    this.lastEnemy = { src: e.u, from };
    this.foeFlash(e, c.col);
    this.foePose(e, POSES.dash, 0.15);
    const z1 = Math.max(...ts.map(t => t.home.z)) + 1.2;
    const hit = new Set();
    const run = async (a, b, dur) => {
      this.face(e, b);
      await GFX.tween(dur, k => {
        g.position.lerpVectors(a, b, k); g.position.y = Math.abs(Math.sin(k * Math.PI * 6)) * 0.12;
        if (Math.random() < 0.8) this.dustFx(g.position, 1);
        for (const t of ts) if (!hit.has(t) && Math.abs(g.position.z - t.home.z) < 0.4) { hit.add(t); this.foeKnock(t, V3(Math.sign(t.home.x - g.position.x) || 1, 0, 0.4).normalize(), 0.45); }
      }, Ease.linear);
    };
    // 小さな子分の影もいっしょに走る（大行進）
    if (c.mv.glyph === 'swarm') for (let i = 0; i < 8; i++) { const x = (i / 7 - 0.5) * 6; this.minionRun(V3(x, 0, from.z), V3(x + (Math.random() - 0.5), 0, z1), c.col, i * 0.04); }
    await run(from, V3(from.x * 0.3, 0, z1), 0.45);
    await GFX.delay(0.1);
    GFX.shake(0.2);
  },
  // なぎはらい・ほうき・まくら：まん中の子の前へ出て、横へ大きく振りぬく
  async sweep(e, ts, c) {
    const t = ts[0];
    await this.foeLunge(e, t, { pose: POSES.spin, back: 1.0 });
    const g = e.model.group, y0 = g.rotation.y;
    await GFX.tween(0.18, k => { g.rotation.y = y0 - 0.6 + k * 1.2; });
    g.rotation.y = y0;
    const xs = ts.map(x => x.home.x), y = t.model.height * 0.55;
    const mid = V3((Math.min(...xs) + Math.max(...xs)) / 2, y, t.home.z);
    this.fx.slash(mid, c.col, { cam: this.camera, size: Math.max(2.6, (Math.max(...xs) - Math.min(...xs)) + 1.6), angle: 0.08 });
    for (const x of ts) this.p.burst(this.hitPoint(x.u), c.col, 12, { speed: 3, life: 0.4, size: 0.08 });
    if (c.mv.obj === 'dust') for (const x of ts) this.dustFx(x.home, 10);
    if (c.mv.obj === 'feather') for (const x of ts) this.p.burst(this.hitPoint(x.u), '#ffffff', 16, { speed: 2, up: 1, life: 0.9, size: 0.1, grav: 1.5 });
    GFX.shake(0.12);
  },
  // 健康診断：近よって、聴診器をあてる（✚ が出る）
  async checkup(e, ts, c) {
    const t = ts[0];
    await this.foeLunge(e, t, { pose: POSES.ready, back: 0.8 });
    await this.foePose(e, { ...POSES.cast, armRx: -1.2 }, 0.15);
    for (let i = 0; i < 2; i++) { await GFX.delay(0.12); this.glyphPop('✚', this.hitPoint(t.u).add(V3((i - 0.5) * 0.3, 0.4, 0.2)), '#ff8ab8'); }
    this.fx.ring(this.hitPoint(t.u), c.col, { r: 0.9, life: 0.35, face: this.camera.position, width: 0.08 });
  },
  // 止まれーっ！：大声と「！」で、足がすくむ
  async halt(e, ts, c) {
    const t = ts[0];
    this.foeFlash(e, c.col);
    await this.foePose(e, { ...POSES.punch, headX: -0.2 }, 0.15);
    this.foeLean(e, 0.15, 0.1);
    this.glyphFly('！', this.foeMouth(e), this.hitPoint(t.u).add(V3(0, 0.7, 0)), c.col, 0.35, 0.7);
    await GFX.delay(0.35);
    this.fx.ring(t.home.clone().add(V3(0, 0.05, 0)), c.col, { r: 1.2, life: 0.4, width: 0.2 });
    t.model.flash('#ffffff', 1);
    this.foeLean(e, 0, 0.2);
  },
  // 闇がねらった子をつつむ（孤独・思い出消去・うつろな声）
  async gloom(e, ts, c) {
    const from = this.foeMouth(e);
    this.foeFlash(e, c.col);
    await this.foePose(e, POSES.raise, 0.25);
    for (const t of ts) {
      const p = this.hitPoint(t.u);
      await this.every(0.4, 16, () => this.p.emit(from, p.clone().sub(from).multiplyScalar(2.5).add(V3((Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 0.6, 0)), hdr(c.col, 2), { life: 0.4, size: 0.2, drag: 0 }));
      this.fx.ring(t.home.clone().add(V3(0, 0.05, 0)), c.col, { r: 1.6, life: 0.7, width: 0.5, k: 1.4 });
      for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; this.p.emit(t.home.clone().add(V3(Math.cos(a) * 0.9, 0.1, Math.sin(a) * 0.9)), V3(-Math.cos(a) * 1.2, 1.5, -Math.sin(a) * 1.2), hdr(c.col, 1.6), { life: 0.7, size: 0.18 }); }
      if (c.mv.glyph === 'away') this.foeKnock(t, V3(Math.sign(t.home.x) || 1, 0, 0.6).normalize(), 0.7);
      else t.model.flash('#2a2238', 1.5);
    }
  },
  // だいばくはつ：体に光をためて、まわりごと吹きとばす
  async nova(e, ts, c) {
    const from = this.foeMouth(e);
    this.foeFlash(e, c.col);
    await this.foePose(e, POSES.ult, 0.2);
    const orb = this.fx.sprite(from, c.col, 0.5, 1.2, { k: 4, grow: 1 });
    await this.every(0.5, 20, i => { orb.scale.setScalar(0.5 + i * 0.15); const a = Math.random() * Math.PI * 2, q = from.clone().add(V3(Math.cos(a) * 2, Math.sin(a) * 1.5, 0.5)); this.p.emit(q, from.clone().sub(q).multiplyScalar(3), hdr(c.col, 3), { life: 0.33, size: 0.12, drag: 0 }); });
    orb.visible = false;
    const far = Math.max(...ts.map(t => e.home.distanceTo(t.home))) + 1.5;
    this.fx.sprite(from, '#ffffff', 6, 0.5, { k: 4 });
    this.fx.ring(e.home.clone().add(V3(0, 0.1, 0)), c.col, { r: far, life: 0.6, width: 0.8 });
    this.p.burst(from, c.col, 120, { speed: 14, life: 0.8, size: 0.16 });
    GFX.flash(c.col, 0.5, 0.4); GFX.shake(0.4);
    await GFX.delay(0.2);
    for (const t of ts) this.foeKnock(t, t.home.clone().sub(e.home).setY(0).normalize(), 0.5);
  },
  // 光の柱が、ねらった子たちの上から落ちる（封印の光・天地創造）
  async pillars(e, ts, c) {
    this.foeFlash(e, c.col);
    await this.foePose(e, POSES.ult, 0.25);
    this.p.burst(this.foeMouth(e).add(V3(0, 0.6, 0)), c.col, 40, { speed: 4, up: 4, life: 0.7, size: 0.12 });
    await GFX.delay(0.25);
    for (const t of ts) {
      this.fx.sigil(t.home.clone().add(V3(0, 0.06, 0)), c.col, { r: 1.1, life: 0.8 });
    }
    await GFX.delay(0.3);
    ts.forEach((t, i) => GFX.delay(i * 0.06).then(() => { this.fx.pillar(t.home, c.col, { h: 12, r: 0.5, life: 0.6, k: 1.2 }); this.fx.sprite(this.hitPoint(t.u), '#ffffff', 1.2, 0.25, { k: 2 }); }));
    GFX.flash(c.col, 0.12, 0.3); GFX.shake(0.25);
    await GFX.delay(0.15 + ts.length * 0.06);
  },
  // ひとりぼっちの世界：黒い帳が、みんなを包んで閉じる
  async dome(e, ts, c) {
    this.foeFlash(e, c.col);
    await this.foePose(e, POSES.ult, 0.25);
    const cen = ts.reduce((a, t) => a.add(t.home), V3()).multiplyScalar(1 / ts.length);
    const r = Math.max(2.2, ...ts.map(t => Math.abs(t.home.x - cen.x) + 0.9));
    const mat = new THREE.MeshBasicMaterial({ color: '#07040c', transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(r, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2), mat);
    dome.scale.set(1, 0.8, 0.55); dome.position.copy(cen);
    this.fx.add(dome, 1.2, k => { const d = Math.min(1, k / 0.4); dome.position.y = (1 - Ease.out(d)) * 5; mat.opacity = k < 0.75 ? Ease.out(d) * 0.85 : 0.85 * (1 - (k - 0.75) / 0.25); });
    await GFX.delay(0.6);
    GFX.flash(c.col, 0.3, 0.3); GFX.shake(0.25);
    for (const t of ts) t.model.flash(c.col, 1);
    await GFX.delay(0.2);
  },
  // 猫の形に刈りこみ：葉っぱのつむじ風が、みんなをつつむ
  async whirl(e, ts, c) {
    this.foeFlash(e, c.col);
    await this.foePose(e, POSES.spin, 0.15);
    const g = e.model.group;
    GFX.tween(0.5, k => { g.rotation.y = k * Math.PI * 4; }).then(() => { g.rotation.y = 0; });
    for (const t of ts) {
      const at = t.home.clone().add(V3(0, 0.6, 0));
      for (let i = 0; i < 2; i++) this.fx.swirl(at, c.col, { r: 0.6 + i * 0.25, life: 0.8, tilt: 0, speed: 12, arc: 2.8, width: 0.025, y0: -0.4 + i * 0.4, y1: 0.4 + i * 0.4, k: 1.3 });
      for (let i = 0; i < 16; i++) GFX.delay(i * 0.04).then(() => { const a = i * 0.9; this.p.emit(at.clone().add(V3(Math.cos(a) * 0.7, (i / 16) * 0.8 - 0.3, Math.sin(a) * 0.7)), V3(-Math.sin(a) * 2, 0.8, Math.cos(a) * 2), hdr(i % 2 ? c.col : '#c8e870', 1.2), { life: 0.6, size: 0.12 }); });
    }
    await GFX.delay(0.7);
  },
};

Object.assign(BattleView.prototype, {
  // ---------- 敵の動きの部品 ----------
  // 全体攻撃は、味方のうしろ上から敵を見る（味方にとどく効果と、敵の両方が入る。大きな敵ほど引く）。
  //   一人・二人をねらう技は、カメラを切りかえない（enemyAttack の、味方のうしろから敵へ寄るカメラのまま）
  attackerCam(e, ts, anim) {
    if (ts.length < 3 || anim === 'stampede') return;
    const xs = ts.map(t => t.home.x), tx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const big = Math.max(e.model.height, 1.2), T = V3(tx, 0, ts[0].home.z), E = e.home.clone().setY(0), back = 3.6 + Math.max(0, big - 1.5) * 1.6;
    this.setCam(V3(tx + 1.2, 1.6 + big * 0.35, T.z + back), V3((tx + E.x) / 2, 0.5 + big * 0.3, (T.z * 2 + E.z) / 3), { snap: true });
  },


  // 口もと（体の前のほう）
  foeMouth(e) {
    const g = e.model.group, f = V3(Math.sin(g.rotation.y), 0, Math.cos(g.rotation.y));
    return this.hitPoint(e.u).addScaledVector(f, e.model.radius * 0.8).add(V3(0, e.model.height * 0.1, 0));
  },
  foeFlash(e, col) { e.model.flash(col, 1.2); this.fx.sprite(this.hitPoint(e.u), col, 2.0, 0.4, { k: 2 }); },
  // 骨組みの敵だけ、ポーズを動かす（ほかの敵は、そのまま待つ）
  foePose(e, pose, dur) { const m = e.model.critter; return m ? this.tweenPose(m, pose, dur) : GFX.delay(dur); },
  foeLean(e, a, dur) { const g = e.model.group, a0 = g.rotation.x; return GFX.tween(dur, k => { g.rotation.x = lerp(a0, a, k); }); },
  foeHop(e, h) { const g = e.model.group, y0 = g.position.y; return GFX.tween(0.3, k => { g.position.y = y0 + Math.sin(k * Math.PI) * h; }); },
  // ねらった子の前へ跳んでいく
  async foeLunge(e, t, { pose = POSES.windup, back = 0.7, dur = 0.28 } = {}) {
    const g = e.model.group, from = g.position.clone();
    this.lastEnemy = { src: e.u, from };
    const dest = t.home.clone().add(V3(0, 0, -(t.model.radius + e.model.radius + back - 0.4)));
    this.face(e, t.home);
    this.foeFlash(e, e.model.color);
    this.foePose(e, pose, 0.2);
    await GFX.tween(dur, k => { g.position.lerpVectors(from, dest, Ease.in(k)); g.position.y = Math.sin(k * Math.PI) * 0.3; });
    this.face(e, t.home);
  },
  // その場で、前へ小さく突き出す
  async foeNudge(e, t, d, dur) {
    const g = e.model.group, p0 = g.position.clone(), f = t.home.clone().sub(p0).setY(0).normalize();
    await GFX.tween(dur, k => { g.position.copy(p0).addScaledVector(f, Math.sin(k * Math.PI) * d); });
  },
  // 味方がはじきとばされて、もどる
  foeKnock(t, dir, d) {
    const g = t.model.group, h = t.home;
    GFX.tween(0.4, k => { const s = Math.sin(k * Math.PI) * d; g.position.set(h.x + dir.x * s, Math.sin(k * Math.PI) * d * 0.5, h.z + dir.z * s); }, Ease.out).then(() => g.position.copy(h));
  },
  squashFoe(e, amt) {
    const g = e.model.inner, s0 = g.scale.clone();
    GFX.tween(0.35, k => { const s = Math.sin(k * Math.PI) * amt; g.scale.set(s0.x * (1 + s * 0.5), s0.y * (1 - s), s0.z * (1 + s * 0.5)); }).then(() => g.scale.copy(s0));
  },
  dustFx(at, n) { for (let i = 0; i < n; i++) this.p.emit(V3(at.x + (Math.random() - 0.5) * 0.6, 0.08, at.z + (Math.random() - 0.5) * 0.6), V3((Math.random() - 0.5) * 2, 0.6 + Math.random(), (Math.random() - 0.5) * 2), hdr('#d8c8a8', 1.1), { life: 0.7, size: 0.22, drag: 2 }); },
  // 三本の爪あと
  clawFx(p, col, n) {
    const right = V3(1, 0, 0).applyQuaternion(this.camera.quaternion), up = V3(0, 1, 0).applyQuaternion(this.camera.quaternion), a = -0.9;
    const nx = -Math.sin(a), ny = Math.cos(a);
    for (let i = 0; i < n; i++) { const o = (i - (n - 1) / 2) * 0.22; this.fx.slash(p.clone().addScaledVector(right, nx * o).addScaledVector(up, ny * o), col, { cam: this.camera, size: 1.6, angle: a, life: 0.3 }); }
  },
  // がぶっ：上下のあごが、かみあわさる
  jawFx(p, col, size) {
    const mk = sgn => {
      const g = new THREE.Group();
      const mat = new THREE.MeshBasicMaterial({ color: hdr(col, 2.5), transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
      for (let i = 0; i < 5; i++) { const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.06 * size, 0.2 * size, 3), mat); tooth.position.set((i - 2) * 0.13 * size, 0, 0); tooth.rotation.z = sgn > 0 ? Math.PI : 0; g.add(tooth); }
      g.quaternion.copy(this.camera.quaternion);
      this.fx.add(g, 0.4, k => { const c = Math.min(1, k / 0.35); g.position.copy(p).addScaledVector(V3(0, 1, 0).applyQuaternion(this.camera.quaternion), sgn * (0.35 - Ease.in(c) * 0.25) * size); mat.opacity = k < 0.6 ? 1 : (1 - k) / 0.4; });
    };
    mk(1); mk(-1);
    GFX.delay(0.14).then(() => this.fx.sprite(p, col, 1.2, 0.2, { k: 3 }));
  },
  puffFx(from, to, col, dur, size, k) {
    const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: hdr(col, k), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    m.renderOrder = 11;
    const off = V3((Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.2, 0);
    this.fx.add(m, dur, t => { m.position.lerpVectors(from, to, t).add(off); m.scale.setScalar(size * (0.3 + t * 0.9)); m.material.opacity = t < 0.8 ? 0.9 : (1 - t) * 4.5; });
  },
  starFx(p, col) { for (let i = 0; i < 5; i++) { const s = this.glyph('★', '#ffe066', '#8a5a00', 0.22), a = i / 5 * Math.PI * 2; this.fx.add(s, 0.7, k => { s.position.copy(p).add(V3(Math.cos(a + k * 3) * 0.45, Math.sin(a + k * 3) * 0.25 + 0.15, 0.1)); s.material.opacity = 1 - k * k; }); } },
  // 文字が、ふわっと飛んでいく
  glyphFly(ch, from, to, col, size = 0.3, dur = 0.55) {
    const s = ch === 'Z' ? this.zSprite() : this.glyph(ch, '#ffffff', col, size);
    const side = (Math.random() - 0.5) * 0.8;
    this.fx.add(s, dur, k => { s.position.lerpVectors(from, to, Ease.out(k)); s.position.x += Math.sin(k * Math.PI) * side; s.position.y += Math.sin(k * Math.PI) * 0.3; s.material.opacity = k > 0.8 ? (1 - k) * 5 : 1; });
  },
  glyphPop(ch, p, col) { const s = this.glyph(ch, col, '#ffffff', 0.45); this.fx.add(s, 0.7, k => { s.position.copy(p).add(V3(0, k * 0.3, 0)); s.scale.setScalar(0.45 * Ease.back(Math.min(1, k * 4))); s.material.opacity = 1 - k * k; }); },
  // 投げる物
  tossObj(o) {
    const g = new THREE.Group();
    if (o === 'acorn') {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), toon('#a8642a')); b.scale.y = 1.25; g.add(b);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), toon('#6a4020')); cap.position.y = 0.06; g.add(cap);
    } else if (o === 'manju') {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10), toon('#fff4e0')); b.scale.y = 0.7; g.add(b);
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), toon('#c8584a')); dot.position.y = 0.11; g.add(dot);
    } else if (o === 'paper') {
      for (let i = 0; i < 3; i++) { const p = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.36), toon('#ffffff', { side: THREE.DoubleSide })); p.position.set((i - 1) * 0.08, i * 0.02, 0); p.rotation.set(-1.2, i * 0.4, 0); g.add(p); }
    } else if (o === 'ball') {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 10), glowMat(pick(['#ff6a8a', '#ffd76a', '#6ad8ff']), 1.6)); g.add(b);
    } else if (o === 'goo') {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), new THREE.MeshBasicMaterial({ color: hdr('#7ae07a', 1.2), transparent: true, opacity: 0.85 })); b.scale.set(1.2, 0.8, 1); g.add(b);
    } else if (o === 'soup') {
      const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), toon('#ffffff', { side: THREE.DoubleSide })); g.add(bowl);
      const soup = new THREE.Mesh(new THREE.CircleGeometry(0.14, 14), toon('#e8843a')); soup.rotation.x = -Math.PI / 2; soup.position.y = -0.01; g.add(soup);
    } else {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), toon('#c8a060')); g.add(b);
    }
    return g;
  },
  tossFx(from, to, o, scale = 1) {
    return new Promise(res => {
      const g = this.tossObj(o); g.scale.setScalar(1.6 * scale);
      const spin = V3(Math.random() * 12, Math.random() * 12, Math.random() * 12);
      this.fx.add(g, 0.5, (k, obj, dt) => {
        const f = Math.min(1, k / 0.8);
        obj.position.lerpVectors(from, to, f); obj.position.y += Math.sin(f * Math.PI) * 1.0;
        obj.rotation.x += spin.x * dt; obj.rotation.y += spin.y * dt;
        if (f >= 1) { obj.visible = false; if (!obj.userData.hit) { obj.userData.hit = true; res(); } }
      });
    });
  },
  // 降ってくる物
  dropFx(t, o, col) {
    const x = t.home.x + (Math.random() - 0.5) * 0.7, z = t.home.z + (Math.random() - 0.5) * 0.5, y1 = t.model.height * 0.9;
    let m;
    if (o === 'drop') { m = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshBasicMaterial({ color: hdr('#8ad8ff', 1.4), transparent: true, opacity: 0.85 })); m.scale.y = 1.8; }
    else if (o === 'curry' || o === 'spicy') { m = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), toon(o === 'spicy' ? '#d83a1a' : '#a86a20')); m.scale.y = 0.7; }
    else if (o === 'wax') { m = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), toon('#fff0e0')); m.scale.y = 1.6; }
    else if (o === 'meteor') { m = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: hdr(col, 4), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); m.scale.setScalar(1.2); }
    else if (o === 'leaf') { m = new THREE.Mesh(new THREE.CircleGeometry(0.1, 6), toon(pick(['#e8a040', '#c8584a', '#d8c040']), { side: THREE.DoubleSide })); m.scale.y = 0.6; }
    else { m = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), glowMat(pick(['#ff6a8a', '#ffd76a', '#6ad8ff']), 1.6)); }
    const meteor = o === 'meteor', h0 = meteor ? 9 : 5, dur = meteor ? 0.35 : 0.45, sx = meteor ? -3 : 0;
    this.fx.add(m, dur, (k, obj, dt) => {
      obj.position.set(x + sx * (1 - k), y1 + (h0 - y1) * (1 - Ease.in(k)), z);
      if (o === 'leaf') { obj.rotation.z += dt * 8; obj.position.x += Math.sin(k * 12) * 0.2; }
      if (meteor) this.p.emit(obj.position, V3(0.5, 1, 0), hdr(col, 3), { life: 0.4, size: 0.4 });
      if (k >= 1 && !obj.userData.hit) {
        obj.userData.hit = true;
        const p = V3(x, y1, z);
        if (meteor) { this.fx.sprite(p, col, 3, 0.4, { k: 4 }); this.fx.ring(V3(x, 0.05, z), col, { r: 1.8, life: 0.4, width: 0.3 }); GFX.shake(0.15); }
        else if (o === 'drop') this.p.burst(p, '#8ad8ff', 8, { speed: 2, up: 1, life: 0.4, size: 0.06, grav: 4 });
        else if (o === 'curry' || o === 'spicy') { this.p.burst(p, o === 'spicy' ? '#ff6a3c' : '#c8843a', 10, { speed: 2, up: 1, life: 0.5, size: 0.09, grav: 4 }); for (let i = 0; i < 3; i++) this.p.emit(p, V3(0, 1, 0), hdr('#ffffff', 1.2), { life: 0.8, size: 0.18 }); }
        else this.p.burst(p, col, 8, { speed: 2, life: 0.4, size: 0.07 });
      }
    });
  },
  // 小さな子分が駆けていく（大行進）
  minionRun(a, b, col, delay) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), toon(col)); m.scale.set(0.9, 0.8, 1.3);
    for (const s of [-1, 1]) { const ear = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), toon(col)); ear.position.set(s * 0.09, 0.13, 0.05); m.add(ear); }
    m.lookAt(b);
    GFX.delay(delay).then(() => this.fx.add(m, 0.5, k => { m.position.lerpVectors(a, b, k); m.position.y = 0.14 + Math.abs(Math.sin(k * 30)) * 0.08; if (Math.random() < 0.4) this.dustFx(m.position, 1); m.visible = k < 0.95; }));
  },
});
