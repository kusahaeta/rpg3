'use strict';
// ============================================================
//  敵の技のモーション（BattleView に足す）
//  ENEMY_MOVES の anim で選ぶ。anim のない技は views.js の共通の動き（体当たり／全体は爆発）
//  技の定義に書けるもの：elem（見た目の色。ダメージは物理のまま）・obj（投げる物・降らせる物）・glyph（飛ばす文字）
//  FOE_MOVES[anim](e, ts, c)：e＝敵の ent、ts＝ねらわれた味方の ent、c＝{ col, mv }
//  敵が動いたら this.lastEnemy = { src, from } を立てる（enemyAttackEnd でもどる）
//  2頭身の骨組みの敵（ネズミ・魔族・魔王など。model.critter）は、手足のポーズも動かす
//  ボスの大技（ためる技のあとに撃つもの）は、ボスごとに専用の動きを持つ（ふだんの技と同じ動きにしない）
// ============================================================
// ためる技（type: 'charge'）のあとに撃つ大技。撃つ前に、ボスを足もとからあおる（bigWindup）
const BIG_FOE_MOVES = new Set(Object.values(ENEMY_MOVES).filter(m => m.type === 'charge').map(m => ENEMY_MOVES[m.next]));
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
  // 吐く（ほのお・こおり・胞子・ガス・ほこり・湯気・こけのこな）：口もとから、ねらった子へ流れていく
  async breath(e, ts, c) {
    const o = c.mv.obj || 'fire', from = this.foeMouth(e), big = o === 'gas' || o === 'dust';
    this.foeFlash(e, c.col);
    await this.foePose(e, { ...POSES.cast, lean: -0.2, headX: -0.3 }, 0.2);
    this.foeLean(e, -0.15, 0.2);
    this.foePose(e, { ...POSES.cast, lean: 0.25, headX: 0.15 }, 0.12);
    this.foeLean(e, 0.2, 0.12);
    const cols = { fire: ['#ff6a3c', '#ffd23c'], ice: ['#6fd6f5', '#ffffff'], spore: ['#ff9ad8', '#fff0a8'], gas: ['#9aff8a', '#ff9ad8'], dust: ['#b8b0a0', '#e8e0d0'], moss: ['#7ad84a', '#e8ffa8'], steam: ['#ffffff', '#ffb87a'] }[o] || [c.col, '#ffffff'];
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
  // 降らせる（なみだ・カレー・ろう・メテオ）：上を見上げると、ねらった子の上から降ってくる。メテオ（魔王の大技）は空が暗くなり、最後に大きな星が落ちる
  async rain(e, ts, c) {
    const o = c.mv.obj || 'drop';
    this.foeFlash(e, c.col);
    await this.foePose(e, POSES.raise, 0.2);
    this.foeHop(e, 0.2);
    this.p.burst(this.foeMouth(e).add(V3(0, 0.5, 0)), c.col, 20, { speed: 3, up: 3, life: 0.6, size: 0.1 });
    const meteor = o === 'meteor', n = ts.length === 1 ? 6 : meteor ? 2 : 4;   // メテオは一つずつの光が強いので、数をふやすと白く飛ぶ
    const U = GFX.grade.uniforms;
    if (meteor) GFX.tween(0.3, k => { U.tint.value.setRGB(1 - 0.35 * k, 1 - 0.45 * k, 1 - 0.2 * k); }, Ease.out, true);
    await Promise.all(ts.flatMap((t, i) => Array.from({ length: n }, (_, j) => GFX.delay(0.15 + i * 0.05 + j * 0.09).then(() => this.dropFx(t, o, c.col)))));
    if (meteor) {
      // ひときわ大きな星が、まん中に落ちる
      const xs = ts.map(t => t.home.x), cen = V3((Math.min(...xs) + Math.max(...xs)) / 2, 0, ts[0].home.z - 0.4);
      const m = this.fx.sprite(V3(cen.x - 4, 12, cen.z), c.col, 2.6, 0.45, { k: 2.5, grow: 1 });
      await GFX.tween(0.45, k => { m.position.set(cen.x - 4 * (1 - k), lerp(12, 0.6, Ease.in(k)), cen.z); m.material.opacity = 1; if (Math.random() < 0.5) this.p.emit(m.position, V3(0.8, 1.5, 0), hdr(c.col, 2), { life: 0.4, size: 0.35 }); }, Ease.linear);
      this.fx.ring(cen.clone().add(V3(0, 0.06, 0)), c.col, { r: 5, life: 0.6, width: 0.5, k: 2 });
      this.p.burst(cen.clone().add(V3(0, 0.4, 0)), c.col, 30, { speed: 8, up: 2, life: 0.7, size: 0.12 });
      for (const t of ts) this.foeKnock(t, t.home.clone().sub(cen).setY(0).normalize(), 0.4);
      GFX.shake(0.4); Sfx.slam();
      await GFX.delay(0.2);
      GFX.tween(0.4, k => { U.tint.value.setRGB(0.65 + 0.35 * k, 0.55 + 0.45 * k, 0.8 + 0.2 * k); }, Ease.out, true);
    }
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
  // 地ならし（おおあばれ・ぷるるん）：跳んで地面をたたき、ゆれがみんなへとどく
  async quake(e, ts, c) {
    const g = e.model.group, h = e.home;
    this.foeFlash(e, c.col);
    await this.foePose(e, POSES.jump, 0.15);
    await GFX.tween(0.35, k => { g.position.y = Math.sin(k * Math.PI) * 1.2; });
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
  // おしくらまんじゅう・大突進：みんなのあいだを駆けぬけて、またもどる
  //   大突進（boar）は、うしろへさがって前足で地面をかき、駆けぬけたらふりかえって、もう一度つっこんでくる
  async stampede(e, ts, c) {
    const g = e.model.group, from = g.position.clone(), boar = c.mv.glyph === 'boar';
    this.lastEnemy = { src: e.u, from };
    this.foeFlash(e, c.col);
    this.foePose(e, POSES.dash, 0.15);
    const z1 = Math.max(...ts.map(t => t.home.z)) + 1.2;
    let hit = new Set();
    const rad = e.model.radius, P = V3();
    const run = async (a, b, dur) => {
      this.face(e, b);
      let trail = 0;
      await GFX.tween(dur, k => {
        g.position.lerpVectors(a, b, k); g.position.y = Math.abs(Math.sin(k * Math.PI * 6)) * 0.12;
        if (Math.random() < 0.8) this.dustFx(g.position, boar ? 2 : 1);
        // 大突進：うしろに、もうもうと土煙がのこる
        if (boar) { const d = a.distanceTo(b) * k; while (trail < d) { trail += 0.5; P.lerpVectors(a, b, trail / a.distanceTo(b)); this.dustCloud(P.clone().add(V3((Math.random() - 0.5) * rad * 1.2, 0, 0)), rad * 0.95); } }
        for (const t of ts) if (!hit.has(t) && Math.abs(g.position.z - t.home.z) < 0.4) { hit.add(t); this.foeKnock(t, V3(Math.sign(t.home.x - g.position.x) || 1, 0, 0.4).normalize(), boar ? 0.6 : 0.45); if (boar) this.fx.sprite(this.hitPoint(t.u), c.col, 1.4, 0.25, { k: 3 }); }
      }, Ease.linear);
    };
    if (boar) {
      const back = from.clone().add(V3(0, 0, -1.4));
      await GFX.tween(0.3, k => { g.position.lerpVectors(from, back, Ease.out(k)); });
      // 鼻息あらく、前足で三回地面をかく
      for (let i = 0; i < 3; i++) {
        await GFX.tween(0.13, k => { g.rotation.x = -Math.sin(k * Math.PI) * 0.18; });
        this.dustFx(g.position.clone().add(V3(0, 0, 0.6)), 6);
        this.dustCloud(g.position.clone().add(V3((Math.random() - 0.5) * rad, 0, rad * 0.5)), rad * (0.7 + i * 0.2));
        this.p.burst(this.foeMouth(e), '#ffffff', 6, { speed: 2, life: 0.4, size: 0.12 });
      }
      e.model.flash('#ff3040', 1.6);
      await run(back, V3(from.x * 0.3 - 1.0, 0, z1), 0.42);
      GFX.shake(0.25);
      // うしろで土ぼこりをあげてふりかえり、もう一度
      this.dustFx(g.position, 14);
      for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2; this.dustCloud(g.position.clone().add(V3(Math.cos(a) * rad, 0, Math.sin(a) * rad)), rad * 1.2); }
      await GFX.delay(0.15);
      hit = new Set();
      await run(g.position.clone(), V3(from.x * 0.3 + 1.0, 0, from.z), 0.42);
      GFX.shake(0.25);
      return;
    }
    // 小さな子分の影もいっしょに走る（おしくらまんじゅう）
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
  // 闇がねらった子をつつむ（うつろな声）
  async gloom(e, ts, c) {
    const from = this.foeMouth(e);
    this.foeFlash(e, c.col);
    await this.foePose(e, POSES.raise, 0.25);
    for (const t of ts) {
      const p = this.hitPoint(t.u);
      await this.every(0.4, 16, () => this.p.emit(from, p.clone().sub(from).multiplyScalar(2.5).add(V3((Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 0.6, 0)), hdr(c.col, 2), { life: 0.4, size: 0.2, drag: 0 }));
      this.fx.ring(t.home.clone().add(V3(0, 0.05, 0)), c.col, { r: 1.6, life: 0.7, width: 0.5, k: 1.4 });
      for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; this.p.emit(t.home.clone().add(V3(Math.cos(a) * 0.9, 0.1, Math.sin(a) * 0.9)), V3(-Math.cos(a) * 1.2, 1.5, -Math.sin(a) * 1.2), hdr(c.col, 1.6), { life: 0.7, size: 0.18 }); }
      t.model.flash('#2a2238', 1.5);
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
  // 孤独の月蝕（ラスボスのコドク）：思い出のかけらが空へ集まって黒い月になる。月から鎖が降ってみんなをしばり、月がはじけて大爆発
  async eclipse(e, ts, c) {
    const U = GFX.grade.uniforms, core = this.hitPoint(e.u), purple = '#8a5aff', pale = '#e8dcff';
    const xs = ts.map(t => t.home.x), cen = V3((Math.min(...xs) + Math.max(...xs)) / 2, 0, ts[0].home.z);
    const moonAt = V3(cen.x, 5.2, (cen.z + e.home.z) / 2), R = 1.6;
    // みんなのうしろの低いところから、空を見上げる（月と、奥のコドクが入る）
    this.unfocus(); this.sway = 0.15;
    this.cut(V3(cen.x + 1.2, 0.7, cen.z + 4.6), V3(cen.x, 3.0, moonAt.z - 1), { fov: 50 });
    this.setCam(V3(cen.x + 0.6, 0.9, cen.z + 5.2), V3(cen.x, 3.2, moonAt.z - 1), { speed: 0.8 });
    // ① 空から光が消えていく
    GFX.tween(0.6, k => { U.tint.value.setRGB(1 - 0.55 * k, 1 - 0.62 * k, 1 - 0.4 * k); U.desat.value = 0.25 * k; }, Ease.out, true);
    Sfx.tone(70, 1.6, 'sawtooth', 0.08, -20); Sfx.noise(1.4, 0.08, 300);
    // ② 思い出のかけらが、うずを巻いて空へのぼる
    const plates = [];
    for (let i = 0; i < 14; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.36), new THREE.MeshBasicMaterial({ color: hdr('#b8a8e8', 1.4), transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }));
      const a0 = i / 14 * Math.PI * 2, y0 = 1 + (i % 3) * 1.1, dl = i * 0.03;
      this.fx.add(m, 1.1 + dl, (k, o) => {
        const f = Math.max(0, (k * (1.1 + dl) - dl) / 1.1), a = a0 + f * 5, r = 2.6 * (1 - Ease.in(f));
        o.position.set(lerp(e.home.x, moonAt.x, Ease.in(f)) + Math.cos(a) * r, lerp(y0, moonAt.y, Ease.inOut(f)), lerp(e.home.z, moonAt.z, Ease.in(f)) + Math.sin(a) * r * 0.7);
        o.rotation.set(f * 6, a, 0); o.visible = f < 0.98;
        if (Math.random() < 0.3) this.p.emit(o.position, V3(0, 0, 0), hdr(purple, 2), { life: 0.4, size: 0.12 });
      });
      plates.push(m);
    }
    if (e.model.critter) this.foePose(e, POSES.ult, 0.3);
    e.model.flash(purple, 1.6);
    await GFX.delay(1.1);
    // ③ 黒い月があらわれる（まわりに光の冠）
    const moon = this.eclipseObj(R, purple, pale);
    moon.position.copy(moonAt); moon.scale.setScalar(0.01);
    this.fx.add(moon, 3.2, (k, o) => { o.userData.spin(k); });
    GFX.flash(purple, 0.25, 0.4); Sfx.slam();
    this.fx.ring(moonAt, pale, { r: R * 3, life: 0.6, face: this.camera.position, width: 0.12, k: 2 });
    await GFX.tween(0.35, k => { moon.scale.setScalar(Math.max(0.01, Ease.back(k))); });
    // 月から、黒い稲妻があたりへ落ちる
    for (let i = 0; i < 7; i++) GFX.delay(i * 0.07).then(() => this.fx.bolt(moonAt, V3(cen.x + (Math.random() - 0.5) * 9, 0, cen.z - Math.random() * 5), i % 2 ? purple : pale, { life: 0.25, r: 0.035, jag: 0.4, segs: 12, k: 3 }));
    await GFX.delay(0.3);
    // ④ 鎖が、ひとりずつへ降ってきて、しばる
    const chains = ts.map((t, i) => GFX.delay(i * 0.08).then(() => this.chainFx(moonAt.clone().add(V3((Math.random() - 0.5) * R, -R * 0.6, 0)), this.hitPoint(t.u), 0.3, () => { t.model.flash(purple, 1.6); this.squash(t, 0.3); Sfx.tone(180, 0.15, 'square', 0.04, -60); })));
    const links = await Promise.all(chains);
    await GFX.delay(0.35);
    // ⑤ 月が光を吸いこんで、しぼむ
    await this.every(0.4, 16, () => { const a = Math.random() * Math.PI * 2, p = moonAt.clone().add(V3(Math.cos(a) * 4, Math.sin(a) * 3, 0)); this.p.emit(p, moonAt.clone().sub(p).multiplyScalar(2.6), hdr(pale, 2.4), { life: 0.38, size: 0.12, drag: 0 }); });
    await GFX.tween(0.18, k => { moon.scale.setScalar(Math.max(0.01, 1 - Ease.in(k) * 0.85)); });
    // ⑥ はじける：衝撃波・光の柱・砕ける鎖
    moon.visible = false;
    GFX.flash(purple, 0.4, 0.6); GFX.shake(0.6); GFX.slowmo(0.35, 0.7);
    Sfx.brk(); Sfx.slam();
    this.fx.sprite(moonAt, purple, 7, 0.5, { k: 2 });
    this.fx.shards(moonAt, '#2a1a4a', 20, 9);
    this.fx.shards(moonAt, pale, 10, 8);
    for (let i = 0; i < 3; i++) GFX.delay(i * 0.1).then(() => this.fx.ring(cen.clone().add(V3(0, 0.06, 0)), i === 1 ? pale : purple, { r: 8 + i * 2.5, life: 0.9, width: 0.45 - i * 0.1, k: 2 }));
    ts.forEach((t, i) => GFX.delay(0.05 + i * 0.05).then(() => { this.fx.pillar(t.home, purple, { h: 12, r: 0.55, life: 0.7, k: 1.6 }); this.p.burst(this.hitPoint(t.u), purple, 24, { speed: 5, up: 1.5, life: 0.7, size: 0.12 }); }));
    for (const ls of links) for (const l of ls) { const p = l.getWorldPosition(V3()); l.visible = false; if (Math.random() < 0.35) this.fx.shards(p, '#5a5070', 2, 4); }
    for (const t of ts) this.foeKnock(t, V3(0, 0, 1), 0.45);
    await GFX.delay(0.5);
    // 空がもどる
    GFX.tween(0.6, k => { U.tint.value.setRGB(0.45 + 0.55 * k, 0.38 + 0.62 * k, 0.6 + 0.4 * k); U.desat.value = 0.25 * (1 - k); }, Ease.out, true);
    this.setFov(38); this.sway = 0.2;
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

  // ---------- コドクの技（技の中身が見た目でわかるように） ----------
  // 孤独：ねらった子を、黒い丸がすっぽり包んで、仲間から閉ざす
  async sever(e, ts, c) {
    const t = ts[0], h = t.home, r = Math.max(0.75, t.model.height * 0.62);
    this.foeFlash(e, c.col);
    this.darkFlow(e, t, c.col, 0.35, 12);
    await GFX.delay(0.3);
    const ball = this.darkBall(r);
    ball.position.set(h.x, r * 0.8, h.z);
    this.fx.ring(h.clone().add(V3(0, 0.05, 0)), c.col, { r: r * 1.8, life: 0.6, width: 0.3, k: 1.6 });
    // まわりの闇が集まって、丸くなる
    await GFX.tween(0.3, k => { ball.scale.setScalar(Math.max(0.01, Ease.back(k))); });
    t.model.flash('#2a2238', 1.5);
    this.glyphPop('…', V3(h.x, r * 1.8 + 0.3, h.z), '#b8a8e8');
    await this.every(0.5, 10, () => { const a = Math.random() * Math.PI * 2; this.p.emit(ball.position.clone().add(V3(Math.cos(a) * r, (Math.random() - 0.5) * r, Math.sin(a) * r * 0.5)), V3(0, 0.8, 0), hdr('#8a6aff', 2), { life: 0.6, size: 0.12 }); });
    await GFX.tween(0.3, k => { ball.scale.setScalar(Math.max(0.01, 1 - Ease.in(k))); });
    ball.visible = false;
  },
  // 思い出消去：ねらった子の上に、色のついた思い出があらわれる。色が抜けて、コドクのまわりの板と同じ色になり、砕けて散る
  async shatter(e, ts, c) {
    const t = ts[0], above = this.headPos(t).add(V3(0, 1.1, 0));
    this.foeFlash(e, c.col);
    const mem = this.memoryObj();
    mem.position.copy(above); mem.quaternion.copy(this.camera.quaternion); mem.scale.setScalar(0.01);
    this.fx.add(mem, 1.6, null);
    this.p.burst(above, '#ffe8a8', 16, { speed: 2, life: 0.5, size: 0.08 });
    await GFX.tween(0.25, k => { mem.scale.setScalar(1.5 * Ease.back(k)); });
    // 闇が流れこんで、色が抜けていく
    this.darkFlow(e, t, c.col, 0.5, 18, above);
    const warm = new THREE.Color('#ffd88a'), cold = new THREE.Color('#8a80a8'), frame = new THREE.Color('#fff8ec'), frameCold = new THREE.Color('#5a5070');
    await GFX.tween(0.55, k => { mem.userData.photo.color.lerpColors(warm, cold, k); mem.userData.frame.color.lerpColors(frame, frameCold, k); mem.userData.heart.material.opacity = 1 - k; mem.position.x = above.x + Math.sin(k * 40) * 0.02 * k; });
    // ひびが入って、砕ける
    mem.visible = false;
    this.fx.shards(above, '#8a80a8', 18, 3);
    this.fx.shards(above, '#5a5070', 12, 2.5);
    t.model.flash('#2a2238', 1.5);
    // 光（EP）が、コドクへ吸いとられる
    const to = this.hitPoint(e.u), from = this.hitPoint(t.u);
    await this.every(0.35, 14, () => this.p.emit(from.clone().add(V3((Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.4, 0)), to.clone().sub(from).multiplyScalar(1.6).add(V3((Math.random() - 0.5), Math.random(), 0)), hdr('#ffe08a', 2), { life: 0.6, size: 0.1, drag: 0 }));
  },
  // 疑心：みんなをつなぐ金の糸があらわれ、黒くにごって、まん中から切れる
  async crack(e, ts, c) {
    this.foeFlash(e, c.col);
    const order = [...ts].sort((a, b) => a.home.x - b.home.x);
    // 糸が見えるように、みんなのすぐうしろへ寄る（全体攻撃のカメラは、大きなコドクに合わせて遠い）
    const xs = order.map(t => t.home.x), cx = (Math.min(...xs) + Math.max(...xs)) / 2, z = order[0].home.z;
    this.setCam(V3(cx + 0.6, 1.9, z + 3.6), V3(cx, 1.0, z - 1.5), { snap: true });
    for (const t of order) this.darkFlow(e, t, c.col, 0.35, 8);
    await GFX.delay(0.25);
    const knot = t => this.headPos(t).add(V3(0, 0.35, 0));   // 頭の上で結ぶ（体の高さだと、うしろからは味方の陰になる）
    const threads = order.slice(1).map((t, i) => this.bondThread(knot(order[i]), knot(t)));
    const gold = new THREE.Color(hdr('#ffd86a', 1.6)), dark = new THREE.Color('#2a1a3a');
    await GFX.tween(0.25, k => { threads.forEach(th => th.grow(Ease.out(k))); });
    await GFX.tween(0.35, k => { threads.forEach(th => th.mat.color.lerpColors(gold, dark, k)); });
    for (const t of order) this.glyphPop('？', this.headPos(t).add(V3(0, 0.75, 0)), '#8a6aff');
    // ぷつん
    await GFX.tween(0.3, k => { threads.forEach(th => th.snap(k)); });
    threads.forEach(th => { this.p.burst(th.mid, '#5a3a8a', 10, { speed: 2, life: 0.5, size: 0.08 }); th.hide(); });
    for (const t of order) this.foeKnock(t, V3(0, 0, 1), 0.15);
  },
  // 絶望：コドクの足もとから黒い影が地面に広がり、みんなの足もとをのみこむ
  async tide(e, ts, c) {
    const h = e.home, U = GFX.grade.uniforms;
    this.foeFlash(e, c.col);
    if (e.model.critter) this.foePose(e, POSES.open, 0.2);
    const far = Math.max(...ts.map(t => h.distanceTo(t.home))) + 1.2;
    const pool = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshBasicMaterial({ color: '#0a0612', transparent: true, opacity: 0.85, depthWrite: false }));
    pool.rotation.x = -Math.PI / 2; pool.position.set(h.x, 0.03, h.z); pool.scale.setScalar(0.01); pool.renderOrder = 2;
    this.fx.add(pool, 1.9, null);
    GFX.tween(0.3, k => { U.desat.value = 0.4 * k; }, Ease.out, true);
    const reached = new Set();
    await GFX.tween(0.8, k => {
      const r = far * Ease.inOut(k);
      pool.scale.setScalar(Math.max(0.01, r));
      // ふちから、闇がゆらゆら立ちのぼる
      for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.6, p = V3(h.x + Math.cos(a) * r, 0.1, h.z - Math.sin(a) * r); this.p.emit(p, V3(0, 1.2 + Math.random(), 0), hdr(Math.random() < 0.3 ? '#8a6aff' : '#2a1a4a', 1.6), { life: 0.8, size: 0.28, drag: 0.5 }); }
      for (const t of ts) if (!reached.has(t) && h.distanceTo(t.home) < r) {
        reached.add(t); t.model.flash('#2a2238', 1.5); this.squash(t, 0.3);
        for (let i = 0; i < 10; i++) this.p.emit(t.home.clone().add(V3((Math.random() - 0.5) * 0.7, 0.1, (Math.random() - 0.5) * 0.5)), V3(0, 1.5 + Math.random(), 0), hdr(c.col, 1.6), { life: 0.7, size: 0.2 });
      }
    }, Ease.linear);
    await GFX.delay(0.35);
    GFX.tween(0.4, k => { U.desat.value = 0.4 * (1 - k); }, Ease.out, true);
    await GFX.tween(0.4, k => { pool.material.opacity = 0.85 * (1 - k); });
    pool.visible = false;
  },

  // ---------- ボスがためて撃つ大技 ----------
  // ネズミ大行進：キングネズミはその場で号令をかけるだけ。うしろからネズミの大群が列になって行進し、みんなをふみこえていく
  async march(e, ts, c) {
    const h = e.home, rat = ENEMIES.nezumi.color;
    this.foeFlash(e, c.col);
    // フォークを高くかかげて「進めー！」、それから前をさす
    await this.foePose(e, POSES.raise, 0.2);
    this.glyphFly('！', this.foeMouth(e), this.foeMouth(e).add(V3(0.5, 1.2, 0.3)), c.col, 0.5, 0.6);
    this.fx.ring(this.foeMouth(e), c.col, { r: 1.6, life: 0.4, face: this.camera.position, width: 0.08 });
    Sfx.horn(0.6);
    await GFX.delay(0.3);
    this.foePose(e, { ...POSES.cast, headX: -0.15 }, 0.15);
    // 列：みんなの横はばより少し広く、キングのうしろから、みんなのうしろまで
    const xs = ts.map(t => t.home.x), x0 = Math.min(...xs) - 1.0, x1 = Math.max(...xs) + 1.0, cols = 9, rows = 5;
    const zA = h.z - 1.0, zB = Math.max(...ts.map(t => t.home.z)) + 2.5, dur = 1.25, hit = new Set();
    let last = 0;
    for (let r = 0; r < rows; r++) for (let i = 0; i < cols; i++) {
      const x = lerp(x0, x1, i / (cols - 1)) + (r % 2 ? 0.2 : -0.2) + (Math.random() - 0.5) * 0.15, dl = r * 0.16 + Math.random() * 0.05;
      last = Math.max(last, dl);
      GFX.delay(dl).then(() => this.ratRun(V3(x, 0, zA), V3(x, 0, zB), rat, dur, r === 0 ? z => {
        for (const t of ts) if (!hit.has(t) && z > t.home.z - 0.3 && Math.abs(t.home.x - x) < 0.8) { hit.add(t); this.foeKnock(t, V3(0, 0, 1), 0.35); this.squash(t, 0.3); t.model.flash('#ffffff', 0.8); }
      } : null));
    }
    // 行進のあいだ、地面がこきざみにゆれる
    await this.every(dur + last, 10, () => GFX.shake(0.06));
    await GFX.delay(0.1);
  },
  // さみしいフィナーレ：スポットライトの下で、お手玉を高く投げあげる。みんなの上で紙ふぶきになって、あとから涙が降る
  async finale(e, ts, c) {
    const from = this.foeMouth(e);
    this.fx.pillar(e.home, '#fff4d8', { h: 10, r: e.model.radius + 0.5, life: 1.6, k: 0.4 });
    this.foeFlash(e, c.col);
    await this.foePose(e, POSES.cheer, 0.2);
    this.foeHop(e, 0.25);
    await Promise.all(ts.flatMap((t, i) => [0, 1].map(j => GFX.delay(i * 0.1 + j * 0.18).then(async () => {
      const p = this.hitPoint(t.u).add(V3((j - 0.5) * 0.3, 0, 0));
      await this.tossFx(from, p, 'ball', 1, 3, 0.7);
      this.squash(t, 0.25);
      this.confettiFx(p.clone().add(V3(0, 0.3, 0)), 10);
    }))));
    this.foePose(e, { ...POSES.hurt, headX: 0.3 }, 0.25);
    for (const t of ts) for (let j = 0; j < 3; j++) GFX.delay(0.1 + j * 0.1).then(() => this.dropFx(t, 'drop', '#8ad8ff'));
    await GFX.delay(0.5);
  },
  // 影の乱れ斬り：影にとけて、ひとりずつの前にあらわれては斬る。もとの場所で刀をはらうと、遅れて斬りあとが走る
  async phantom(e, ts, c) {
    const g = e.model.group, from = g.position.clone(), r0 = g.rotation.y;
    this.lastEnemy = { src: e.u, from };
    const melt = () => { const p = this.hitPoint(e.u); this.p.burst(p, c.col, 30, { speed: 3, life: 0.5, size: 0.14 }); this.fx.sprite(p, c.col, 1.8, 0.3, { k: 2 }); };
    this.foeFlash(e, c.col);
    await this.foePose(e, POSES.iai, 0.25);
    melt(); g.visible = false;
    await GFX.delay(0.2);
    const cuts = [];
    for (let i = 0; i < ts.length; i++) {
      const t = ts[i], s = i % 2 ? 1 : -1;
      g.position.copy(t.home).add(V3(s * 0.75, 0, -(t.model.radius + e.model.radius + 0.2)));
      this.face(e, t.home); g.visible = true; melt();
      if (e.model.critter) e.model.critter.setPose(POSES.iai);
      await this.foePose(e, POSES.offStrike, 0.07);
      const p = this.hitPoint(t.u), a = s * 0.7;
      this.fx.slash(p, c.col, { cam: this.camera, size: 2.2, angle: a });
      this.foeKnock(t, V3(-s, 0, 0.5).normalize(), 0.25);
      cuts.push([p, a]);
      await GFX.delay(0.1);
      melt(); g.visible = false;
      await GFX.delay(0.05);
    }
    g.position.copy(from); g.rotation.y = r0; g.visible = true; melt();
    if (e.model.critter) e.model.critter.setPose(POSES.offStrike);
    await this.foePose(e, POSES.chiburi, 0.18);
    // 遅れて、さっきの斬りあとが一度に光る
    for (const [p, a] of cuts) this.fx.slash(p, c.col, { cam: this.camera, size: 3.2, angle: -a });   // 白い斬撃を重ねると、命中の光とあわせて白く飛ぶ
    for (const t of ts) t.model.flash(c.col, 1.2);
    GFX.shake(0.3);
    await GFX.delay(0.15);
  },
  // おかわり自由：みんなの頭の上に大なべがあらわれて、ひっくりかえる
  async pot(e, ts, c) {
    this.foeFlash(e, c.col);
    await this.foePose(e, POSES.raise, 0.2);
    this.foeHop(e, 0.2);
    const xs = ts.map(t => t.home.x), x0 = Math.min(...xs), x1 = Math.max(...xs), z = ts[0].home.z;
    // 味方のうしろ上から映すので、みんなの少し前の、頭より上に出す（真上だとカメラに近すぎて画面をふさぐ）
    const pot = this.potObj(), top = 2.0, pz = z - 2;
    pot.position.set((x0 + x1) / 2 - 1.4, top, pz);
    this.fx.add(pot, 2.4, null);
    this.p.burst(pot.position, '#ffffff', 30, { speed: 3, life: 0.6, size: 0.2 });
    await GFX.tween(0.3, k => { pot.scale.setScalar(0.8 * Ease.back(k)); });
    // かたむけながら、左から右へ流しかける
    const start = pot.position.x, end = (x0 + x1) / 2 + 1.4;
    // なべの口から、みんなの頭へ流れおちるカレーの帯
    const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.16, 1, 10, 1, true), toon('#b8742a'));
    stream.visible = false;
    this.fx.add(stream, 1.2, null);
    const lip = V3(), foot = V3(), up = V3(0, 1, 0);
    let next = 0;
    await GFX.tween(0.7, k => {
      pot.rotation.z = -Math.min(1, k * 2.5) * 1.9;
      pot.position.x = lerp(start, end, Ease.inOut(k));
      if (k > 0.3) {
        const rz = pot.rotation.z, lx = 1.0 * pot.scale.x, ly = 0.45 * pot.scale.x;
        lip.set(pot.position.x + lx * Math.cos(rz) - ly * Math.sin(rz), pot.position.y + lx * Math.sin(rz) + ly * Math.cos(rz), pot.position.z);
        foot.set(lip.x + 0.25, 0.8, z);
        stream.visible = true;
        stream.position.copy(lip).lerp(foot, 0.5);
        stream.quaternion.setFromUnitVectors(up, foot.clone().sub(lip).normalize());
        stream.scale.set(1, lip.distanceTo(foot), 1);
      }
      // なべの口から、みんなのほうへ流れおちる
      if (k > 0.25) for (let i = 0; i < 4; i++) this.p.emit(pot.position.clone().add(V3(0.5, -0.1, 0.2)), V3((Math.random() - 0.5) * 0.6, -1 - Math.random(), 3.4 + Math.random() * 0.6), hdr(Math.random() < 0.3 ? '#e8b060' : '#b8742a', 1.4), { life: 0.6, size: 0.24, grav: 7, drag: 0 });
      while (next < ts.length && pot.position.x + 0.6 > ts[next].home.x) {
        const t = ts[next++];
        for (let j = 0; j < 4; j++) GFX.delay(j * 0.05).then(() => this.dropFx(t, 'curry', c.col));
        GFX.delay(0.2).then(() => this.squash(t, 0.3));
      }
    }, Ease.linear);
    stream.visible = false;
    for (const t of ts) for (let i = 0; i < 4; i++) this.p.emit(t.home.clone().add(V3((Math.random() - 0.5) * 0.6, 0.6, 0)), V3(0, 1.2, 0), hdr('#ffffff', 1.2), { life: 1.0, size: 0.24 });
    await GFX.tween(0.25, k => { pot.scale.setScalar(0.8 * (1 - k)); pot.position.y = top + k * 0.6; });
    pot.visible = false;
  },
  // 寝返り大回転：ふとんごと横になって、みんなの前をごろごろと転がり、ぶつかっていく
  async negaeri(e, ts, c) {
    const g = e.model.group, from = g.position.clone(), h = Math.max(0.35, e.model.height * 0.28);
    this.lastEnemy = { src: e.u, from };
    this.foeFlash(e, c.col);
    // 味方のうしろ上から映すので、みんなのすぐ前をころがる（重なると味方の陰にかくれる）
    const xs = ts.map(t => t.home.x), z = ts[0].home.z - 0.75;
    const a = V3(Math.min(...xs) - 1.5, 0, z), b = V3(Math.max(...xs) + 1.5, 0, z);
    for (let i = 0; i < 3; i++) GFX.delay(i * 0.18).then(() => this.glyphFly('Z', this.foeMouth(e), this.foeMouth(e).add(V3(0.6 + i * 0.3, 1.2, 0)), c.col));
    this.foePose(e, POSES.sleep, 0.25);
    // 横から、ころがりはじめる場所へ
    g.rotation.y = Math.PI / 2;
    await GFX.tween(0.4, k => { g.position.lerpVectors(from, a, k); g.position.y = Math.sin(k * Math.PI) * 1.2; });
    const P = V3(), hit = new Set();
    const rollAt = (p, ang) => { g.rotation.set(0, Math.PI / 2, 0); g.rotateX(-ang); g.position.set(p.x + h * Math.sin(ang), h - h * Math.cos(ang), p.z); };
    await GFX.tween(0.9, k => {
      P.lerpVectors(a, b, k); const ang = (P.x - a.x) / h;
      rollAt(P, ang);
      if (Math.random() < 0.6) this.dustFx(P, 1);
      for (const t of ts) if (!hit.has(t) && P.x > t.home.x - 0.4) { hit.add(t); this.squash(t, 0.55); this.fx.ring(t.home.clone().add(V3(0, 0.05, 0)), c.col, { r: 1.3, life: 0.4, width: 0.2 }); this.p.burst(this.hitPoint(t.u), '#ffffff', 14, { speed: 2.5, up: 1, life: 0.7, size: 0.1, grav: 1.5 }); GFX.shake(0.15); }
    }, Ease.linear);
    g.rotation.set(0, -Math.PI / 2, 0); g.position.copy(b);
    this.foePose(e, POSES.ready, 0.2);
    await GFX.delay(0.15);
  },
  // 猫の形に刈りこみ：葉っぱのつむじ風が、みんなを猫の形の植えこみにしてしまう。はさみで「チョキン」とやると、はじける
  async topiary(e, ts, c) {
    this.foeFlash(e, c.col);
    await this.foePose(e, POSES.spin, 0.15);
    const g = e.model.group;
    GFX.tween(0.5, k => { g.rotation.y = k * Math.PI * 4; }).then(() => { g.rotation.y = 0; });
    const bushes = ts.map(t => {
      const at = t.home.clone().add(V3(0, 0.6, 0));
      for (let i = 0; i < 2; i++) this.fx.swirl(at, c.col, { r: 0.6 + i * 0.25, life: 0.6, tilt: 0, speed: 12, arc: 2.8, width: 0.025, y0: -0.4 + i * 0.4, y1: 0.4 + i * 0.4, k: 1.3 });
      const b = this.bushObj(Math.max(0.55, t.model.height * 0.5));
      b.position.copy(t.home); b.scale.setScalar(0.01);
      this.fx.add(b, 1.5, null);
      return b;
    });
    await GFX.delay(0.25);
    await GFX.tween(0.25, k => { for (const b of bushes) b.scale.setScalar(Math.max(0.01, Ease.back(k))); });
    // チョキン、チョキン
    this.foePose(e, POSES.strike, 0.1);
    for (let n = 0; n < 2; n++) {
      ts.forEach(t => { const p = this.hitPoint(t.u); this.fx.slash(p, '#ffffff', { cam: this.camera, size: 1.4, angle: 0.8 }); this.fx.slash(p, '#ffffff', { cam: this.camera, size: 1.4, angle: -0.8 }); });
      Sfx.swing();
      await GFX.delay(0.18);
    }
    // 植えこみがはじけて、葉っぱが散る
    bushes.forEach((b, i) => {
      b.visible = false;
      const p = this.hitPoint(ts[i].u);
      this.p.burst(p, '#5aa84a', 26, { speed: 4, up: 1.5, life: 0.9, size: 0.12, grav: 2 });
      this.p.burst(p, '#c8e870', 12, { speed: 3, up: 1, life: 0.8, size: 0.09, grav: 2 });
      this.squash(ts[i], 0.3);
    });
    GFX.shake(0.18);
    await GFX.delay(0.2);
  },
  // 大地ゆらし：高く跳んで地面をふみ鳴らすと、地割れが岩を突きあげながら、みんなの足もとまで走る
  async fissure(e, ts, c) {
    const g = e.model.group, h = e.home;
    this.foeFlash(e, c.col);
    await this.foePose(e, POSES.jump, 0.18);
    await GFX.tween(0.5, k => { g.position.y = Math.sin(k * Math.PI) * 2.4; }, Ease.inOut);
    g.position.y = 0;
    this.foePose(e, POSES.slam, 0.08);
    this.squashFoe(e, 0.4);
    GFX.shake(0.45); Sfx.slam();
    this.dustFx(h, 26);
    this.fx.ring(h.clone().add(V3(0, 0.05, 0)), c.col, { r: 4, life: 0.5, width: 0.4 });
    let last = 0;
    for (const t of ts) {
      const d = t.home.clone().sub(h).setY(0), n = Math.max(4, Math.round(d.length() / 0.8));
      for (let i = 1; i <= n; i++) {
        const k = i / n, at = h.clone().addScaledVector(d, k).add(V3((Math.random() - 0.5) * 0.3, 0, 0)), dl = 0.05 + i * 0.05;
        last = Math.max(last, dl);
        if (i < n) GFX.delay(dl).then(() => this.rockFx(at, 0.25 + k * 0.35, 0.5));
        else GFX.delay(dl).then(() => {
          for (let j = 0; j < 3; j++) { const a = j / 3 * Math.PI * 2; this.rockFx(t.home.clone().add(V3(Math.cos(a) * 0.45, 0, Math.sin(a) * 0.35)), 0.7 + Math.random() * 0.3, 0.6); }
          const gg = t.model.group; GFX.tween(0.35, q => { gg.position.y = Math.sin(q * Math.PI) * 0.6; });
          this.dustFx(t.home, 10);
        });
      }
    }
    await GFX.delay(last + 0.35);
  },
  // 天地創造にゃんこ：虹の輪が広がり、星のふる空から、大きな肉球がみんなの上におりてくる
  async creation(e, ts, c) {
    this.foeFlash(e, c.col);
    await this.foePose(e, POSES.ult, 0.25);
    const rainbow = ['#ff9ad8', '#ffe08a', '#8ad8ff', '#b8ff8a'];
    rainbow.forEach((col, i) => GFX.delay(i * 0.1).then(() => this.fx.ring(e.home.clone().add(V3(0, 0.08, 0)), col, { r: 9 + i, life: 0.9, width: 0.3, k: 2 })));
    const xs = ts.map(t => t.home.x), cen = V3((Math.min(...xs) + Math.max(...xs)) / 2, 0, ts[0].home.z - 0.3);
    this.every(0.6, 30, () => this.p.emit(cen.clone().add(V3((Math.random() - 0.5) * 7, 4 + Math.random() * 2, (Math.random() - 0.5) * 3)), V3(0, -2.5, 0), hdr(pick(rainbow), 2.4), { life: 1.0, size: 0.1, drag: 0 }));
    const paw = this.pawObj(c.col);
    paw.position.set(cen.x, 6, cen.z); paw.rotation.x = -Math.PI / 2 + 0.9;   // カメラへ向けて落としてきて、着くときに寝かせる
    this.fx.add(paw, 1.7, null);
    // 落ちてくるところの影
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(2.4, 32), new THREE.MeshBasicMaterial({ color: '#1a1020', transparent: true, opacity: 0, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.set(cen.x, 0.04, cen.z - 0.4);
    this.fx.add(shadow, 1.0, null);
    await GFX.tween(0.3, k => { shadow.material.opacity = 0.25 * k; shadow.scale.setScalar(0.4 + k * 0.3); });
    await GFX.tween(0.55, k => { const f = k * k; paw.position.y = lerp(6, 0.08, f); paw.rotation.x = -Math.PI / 2 + 0.9 * (1 - f); paw.scale.setScalar(lerp(0.6, 1, k)); shadow.material.opacity = 0.25 + 0.25 * k; shadow.scale.setScalar(0.7 + k * 0.3); }, Ease.linear);
    shadow.visible = false;
    GFX.flash('#ffffff', 0.35, 0.4); GFX.shake(0.45); Sfx.slam();
    this.fx.ring(cen.clone().add(V3(0, 0.1, 0)), c.col, { r: 6, life: 0.6, width: 0.5 });
    ts.forEach((t, i) => GFX.delay(i * 0.05).then(() => { this.p.burst(this.hitPoint(t.u), pick(rainbow), 20, { speed: 4, up: 1, life: 0.7, size: 0.1 }); this.squash(t, 0.4); }));
    await GFX.tween(0.4, k => { paw.traverse(o => { if (o.material) o.material.opacity = 1 - k; }); });
    paw.visible = false;
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


  // ためた大技を撃つ前：味方を隠して、ボスを足もとからあおる。まわりの光がボスへ吸いこまれる
  async bigWindup(e, col) {
    const h = e.home, core = this.hitPoint(e.u), U = GFX.grade.uniforms, big = Math.max(e.model.height, 1.2), d = 2.6 + big * 1.3;
    this.focus(e); this.sway = 0;
    this.cut(V3(h.x + 1.3, 0.35, h.z + d), V3(h.x, core.y + big * 0.15, h.z), { fov: 40 });
    this.setCam(V3(h.x + 0.8, 0.45, h.z + d - 0.8), V3(h.x, core.y + big * 0.2, h.z), { speed: 1.5 });
    GFX.tween(0.3, k => { U.desat.value = 0.35 * k; }, Ease.out, true);
    e.model.flash(col, 1.6);
    this.foePose(e, POSES.ult, 0.3);
    Sfx.tone(110, 0.8, 'sawtooth', 0.07, 60); Sfx.noise(0.7, 0.08, 500);
    await this.every(0.7, 28, () => {
      const a = Math.random() * Math.PI * 2, r = 2.5 + Math.random() * 2.5, p = core.clone().add(V3(Math.cos(a) * r, (Math.random() - 0.3) * 3, Math.sin(a) * r * 0.6));
      this.p.emit(p, core.clone().sub(p).multiplyScalar(2.6), hdr(Math.random() < 0.3 ? '#ffffff' : col, 3), { life: 0.38, size: 0.1, drag: 0 });
    });
    this.fx.sprite(core, col, 3 + big, 0.35, { k: 3 });
    GFX.tween(0.2, k => { U.desat.value = 0.35 * (1 - k); }, Ease.out, true);
    this.setFov(38); this.unfocus(); this.sway = 0.2;
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
  tossFx(from, to, o, scale = 1, lift = 1, dur = 0.5) {
    return new Promise(res => {
      const g = this.tossObj(o); g.scale.setScalar(1.6 * scale);
      const spin = V3(Math.random() * 12, Math.random() * 12, Math.random() * 12);
      this.fx.add(g, dur, (k, obj, dt) => {
        const f = Math.min(1, k / 0.8);
        obj.position.lerpVectors(from, to, f); obj.position.y += Math.sin(f * Math.PI) * lift;
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
    else if (o === 'meteor') { m = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: hdr(col, 3), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); m.scale.setScalar(1.1); }
    else if (o === 'leaf') { m = new THREE.Mesh(new THREE.CircleGeometry(0.1, 6), toon(pick(['#e8a040', '#c8584a', '#d8c040']), { side: THREE.DoubleSide })); m.scale.y = 0.6; }
    else { m = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), glowMat(pick(['#ff6a8a', '#ffd76a', '#6ad8ff']), 1.6)); }
    const meteor = o === 'meteor', h0 = meteor ? 9 : 5, dur = meteor ? 0.35 : 0.45, sx = meteor ? -3 : 0;
    this.fx.add(m, dur, (k, obj, dt) => {
      obj.position.set(x + sx * (1 - k), y1 + (h0 - y1) * (1 - Ease.in(k)), z);
      if (o === 'leaf') { obj.rotation.z += dt * 8; obj.position.x += Math.sin(k * 12) * 0.2; }
      if (meteor && Math.random() < 0.6) this.p.emit(obj.position, V3(0.5, 1, 0), hdr(col, 2.2), { life: 0.35, size: 0.32 });
      if (k >= 1 && !obj.userData.hit) {
        obj.userData.hit = true;
        const p = V3(x, y1, z);
        if (meteor) { this.fx.sprite(p, col, 1.8, 0.35, { k: 2.2 }); this.fx.ring(V3(x, 0.05, z), col, { r: 1.8, life: 0.4, width: 0.3, k: 2 }); GFX.shake(0.15); }
        else if (o === 'drop') this.p.burst(p, '#8ad8ff', 8, { speed: 2, up: 1, life: 0.4, size: 0.06, grav: 4 });
        else if (o === 'curry' || o === 'spicy') { this.p.burst(p, o === 'spicy' ? '#ff6a3c' : '#c8843a', 10, { speed: 2, up: 1, life: 0.5, size: 0.09, grav: 4 }); for (let i = 0; i < 3; i++) this.p.emit(p, V3(0, 1, 0), hdr('#ffffff', 1.2), { life: 0.8, size: 0.18 }); }
        else this.p.burst(p, col, 8, { speed: 2, life: 0.4, size: 0.07 });
      }
    });
  },
  // 闇が、敵の口もとからねらった子（to があればそこ）へ流れていく
  darkFlow(e, t, col, dur, n, to) {
    const from = this.foeMouth(e), p = to || this.hitPoint(t.u);
    return this.every(dur, n, () => this.p.emit(from, p.clone().sub(from).multiplyScalar(2.5).add(V3((Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 0.6, 0)), hdr(col, 2), { life: 0.4, size: 0.2, drag: 0 }));
  },
  // 黒い丸（孤独）：中が見えない黒い球と、紫にうっすら光るふち
  darkBall(r) {
    const g = new THREE.Group();
    const ball = new THREE.Mesh(new THREE.SphereGeometry(r, 28, 20), new THREE.MeshBasicMaterial({ color: '#0a0612', transparent: true, opacity: 0.94, depthWrite: false }));
    ball.renderOrder = 12; g.add(ball);
    const rim = new THREE.Mesh(new THREE.SphereGeometry(r * 1.06, 28, 20), new THREE.MeshBasicMaterial({ color: hdr('#8a5aff', 1.4), transparent: true, opacity: 0.45, side: THREE.BackSide, depthWrite: false, blending: THREE.AdditiveBlending }));
    rim.renderOrder = 11; g.add(rim);
    g.scale.setScalar(0.01);
    this.fx.add(g, 2, null);
    return g;
  },
  // 思い出（思い出消去）：白いふちの写真に、あたたかい色と ♥
  memoryObj() {
    const g = new THREE.Group();
    const frame = new THREE.MeshBasicMaterial({ color: '#fff8ec', side: THREE.DoubleSide }), photo = new THREE.MeshBasicMaterial({ color: '#ffd88a', side: THREE.DoubleSide });
    g.add(new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.6), frame));
    const in_ = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 0.46), photo); in_.position.z = 0.005; g.add(in_);
    const heart = this.glyph('♥', '#ff6a8a', '#ffffff', 0.3); heart.position.z = 0.01; g.add(heart);
    g.rotation.z = 0.1;
    g.userData = { frame, photo, heart };
    return g;
  },
  // 友情の糸（疑心）：a→b の細い管。grow で両はしから伸び、snap でまん中から切れて縮む
  bondThread(a, b) {
    const mat = new THREE.MeshBasicMaterial({ color: hdr('#ffd86a', 1.6), transparent: true, depthWrite: false });
    const mid = a.clone().lerp(b, 0.5), up = V3(0, 1, 0);
    const half = (p, q) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1, 8, 1, true), mat); m.quaternion.setFromUnitVectors(up, q.clone().sub(p).normalize()); m.renderOrder = 12; this.fx.add(m, 2, null); return m; };
    const L = half(a, mid), R = half(b, mid), len = a.distanceTo(mid);
    // 片がわの管を、はし p から長さ l だけ、q へ向けて置く
    const put = (m, p, q, l) => { m.position.copy(p).lerp(q, l / len / 2); m.scale.set(1, Math.max(0.001, l), 1); };
    put(L, a, mid, 0); put(R, b, mid, 0);
    return {
      mat, mid,
      grow: k => { put(L, a, mid, len * k); put(R, b, mid, len * k); },
      snap: k => { const l = len * (1 - Ease.in(k)); put(L, a, mid, l); put(R, b, mid, l); mat.opacity = 1 - k * 0.5; },
      hide: () => { L.visible = R.visible = false; },
    };
  },
  // 黒い月（孤独の月蝕）：黒い球の奥に、光の冠と、ゆっくり回る光の輪
  eclipseObj(R, col, pale) {
    const g = new THREE.Group();
    const add = (m, o = 0) => { m.renderOrder = 11 + o; g.add(m); return m; };
    const glow = add(new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: hdr(col, 1.8), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }))); glow.scale.setScalar(R * 4.2);
    const corona = add(new THREE.Mesh(new THREE.RingGeometry(R * 0.98, R * 1.22, 64), new THREE.MeshBasicMaterial({ color: hdr(pale, 2.4), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, side: THREE.DoubleSide })));
    const halo = add(new THREE.Mesh(new THREE.RingGeometry(R * 1.5, R * 1.58, 64), new THREE.MeshBasicMaterial({ color: hdr(col, 2), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, side: THREE.DoubleSide })));
    const ball = add(new THREE.Mesh(new THREE.SphereGeometry(R, 32, 24), new THREE.MeshBasicMaterial({ color: '#050208', fog: false })), 2);   // 霧がかかると、紫に透けて見える
    g.userData.spin = k => {
      corona.quaternion.copy(this.camera.quaternion); halo.quaternion.copy(this.camera.quaternion);
      halo.rotateX(1.1); halo.rotateZ(k * 4);
      corona.scale.setScalar(1 + Math.sin(k * 40) * 0.03);
      glow.material.opacity = 0.8 + Math.sin(k * 25) * 0.2;
    };
    return g;
  },
  // 鎖：a から b へ、輪がつながりながら伸びる。伸びきったら hit()。輪の配列を返す
  chainFx(a, b, dur, hit) {
    const dir = b.clone().sub(a), len = dir.length(), n = Math.max(6, Math.round(len / 0.2)), up = V3(0, 1, 0);
    dir.normalize();
    const mat = new THREE.MeshStandardMaterial({ color: '#4a4458', metalness: 0.8, roughness: 0.3, emissive: '#8a5aff', emissiveIntensity: 0.5 });
    const geo = new THREE.TorusGeometry(0.08, 0.025, 6, 12), links = [];
    for (let i = 0; i < n; i++) {
      const l = new THREE.Mesh(geo, mat);
      l.position.copy(a).addScaledVector(dir, (i + 0.5) / n * len);
      l.quaternion.setFromUnitVectors(up, dir); if (i % 2) l.rotateY(Math.PI / 2);
      l.scale.set(1, 1.5, 1); l.visible = false;
      this.fx.add(l, dur + 1.6, null);
      links.push(l);
    }
    return GFX.tween(dur, k => { const m = Math.floor(k * n); for (let i = 0; i < n; i++) links[i].visible = i <= m; }, Ease.linear).then(() => {
      links.forEach(l => { l.visible = true; });
      this.fx.ring(b, '#8a5aff', { r: 0.9, life: 0.35, face: this.camera.position, width: 0.1, k: 2 });
      if (hit) hit();
      return links;
    });
  },
  // 土煙：ふくらみながら立ちのぼって、うすれていく土色のかたまり（光の粒だと明るい道で見えない）
  dustCloud(at, size) {
    const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: pick(['#c8b090', '#b8a080', '#d8c4a0']), transparent: true, depthWrite: false, opacity: 0 }));
    const v = V3((Math.random() - 0.5) * 0.6, 0.5 + Math.random() * 0.5, (Math.random() - 0.5) * 0.6), life = 1.1 + Math.random() * 0.5;
    m.position.set(at.x, size * 0.35, at.z); m.renderOrder = 10;
    this.fx.add(m, life, (k, o, dt) => {
      o.position.addScaledVector(v, dt); v.multiplyScalar(1 - dt * 1.2);
      o.scale.setScalar(size * (0.6 + Ease.out(k) * 1.6));
      o.material.opacity = (k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85) * 0.6;   // 濃いと、みんなが隠れる
    });
  },
  // 紙ふぶき：色紙がくるくる舞いながら落ちる（光の粒だと明るい背景で見えない）
  confettiFx(p, n) {
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.14), new THREE.MeshBasicMaterial({ color: pick(['#ff6a8a', '#ffd23c', '#4ac8ff', '#a86aff', '#6ae08a']), side: THREE.DoubleSide, transparent: true }));
      const v = V3((Math.random() - 0.5) * 3, 1.5 + Math.random() * 2, (Math.random() - 0.5) * 2), spin = V3(Math.random() * 12, Math.random() * 12, 0);
      m.position.copy(p);
      this.fx.add(m, 1.1 + Math.random() * 0.4, (k, o, dt) => { v.y -= 5 * dt; v.multiplyScalar(1 - dt * 1.5); o.position.addScaledVector(v, dt); o.rotation.x += spin.x * dt; o.rotation.y += spin.y * dt; o.material.opacity = k > 0.8 ? (1 - k) * 5 : 1; });
    }
  },
  // 大なべ（おかわり自由）
  potObj() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 0.8, 0.9, 20, 1, true), toon('#4a4040', { side: THREE.DoubleSide })); g.add(body);
    const bottom = new THREE.Mesh(new THREE.CircleGeometry(0.8, 20), toon('#4a4040')); bottom.rotation.x = Math.PI / 2; bottom.position.y = -0.45; g.add(bottom);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.07, 6, 24), toon('#6a5a58')); rim.rotation.x = Math.PI / 2; rim.position.y = 0.45; g.add(rim);
    const curry = new THREE.Mesh(new THREE.CircleGeometry(0.95, 20), toon('#a86a20')); curry.rotation.x = -Math.PI / 2; curry.position.y = 0.32; g.add(curry);
    for (const s of [-1, 1]) { const hd = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.05, 6, 12), toon('#6a5a58')); hd.position.set(s * 1.08, 0.2, 0); hd.rotation.y = Math.PI / 2; g.add(hd); }
    g.scale.setScalar(0.01);
    return g;
  },
  // 猫の形の植えこみ（刈りこみ）
  bushObj(r) {
    const g = new THREE.Group(), mat = toon('#4a9a3e');
    const ball = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), mat); ball.position.y = r * 0.95; ball.scale.y = 1.05; g.add(ball);
    for (const s of [-1, 1]) { const ear = new THREE.Mesh(new THREE.ConeGeometry(r * 0.38, r * 0.75, 4), mat); ear.position.set(s * r * 0.55, r * 2.05, 0); ear.rotation.z = -s * 0.4; g.add(ear); }
    for (const s of [-1, 1]) { const eye = new THREE.Mesh(new THREE.SphereGeometry(r * 0.09, 8, 6), toon('#1a2a14')); eye.position.set(s * r * 0.35, r * 1.1, r * 0.92); g.add(eye); }
    return g;
  },
  // 大きな肉球（天地創造）：桃色の肉球を、光るふちが囲む。group の XY 面に置く（rotation.x で寝かせる）
  pawObj(col) {
    const g = new THREE.Group();
    const mk = (r, x, y, sy, color, k, add, z) => { const m = new THREE.Mesh(new THREE.CircleGeometry(r, 28), new THREE.MeshBasicMaterial({ color: add ? hdr(color, k) : color, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending })); m.position.set(x, y, z); m.scale.set(1, sy, 1); m.renderOrder = 11; g.add(m); };
    const pads = [[1.5, 0, -0.5, 0.8], [0.5, -1.6, 0.6, 1.15], [0.5, -0.6, 1.3, 1.15], [0.5, 0.6, 1.3, 1.15], [0.5, 1.6, 0.6, 1.15]];
    for (const [r, x, y, sy] of pads) mk(r * 1.18, x, y, sy, col, 2.2, true, 0);
    for (const [r, x, y, sy] of pads) mk(r, x, y, sy, '#ff9ab8', 1, false, 0.01);
    return g;
  },
  // 地面から突き出す岩（大地ゆらし）
  rockFx(at, h, life) {
    const geo = new THREE.ConeGeometry(h * 0.45, h, 5, 1); geo.translate(0, h / 2, 0);
    const m = new THREE.Mesh(geo, toon(pick(['#8a6a4a', '#a07a52', '#7a5a3e'])));
    m.position.set(at.x, 0, at.z); m.rotation.set((Math.random() - 0.5) * 0.4, Math.random() * Math.PI, (Math.random() - 0.5) * 0.4);
    this.dustFx(at, 2);
    this.fx.add(m, life, k => { m.scale.set(1, k < 0.2 ? Ease.back(k / 0.2) : k > 0.75 ? Math.max(0.01, (1 - k) / 0.25) : 1, 1); });
  },
  // 行進するネズミ（ネズミ大行進）：a→b へ、ちょこちょこ跳ねながら。onZ(z) で、いまの位置を知らせる
  ratRun(a, b, col, dur, onZ) {
    const g = new THREE.Group(), mat = toon(col), pink = toon('#f2b8c0');
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), mat); body.scale.set(0.85, 0.75, 1.2); body.position.y = 0.16; g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), mat); head.position.set(0, 0.24, 0.2); g.add(head);
    for (const s of [-1, 1]) { const ear = new THREE.Mesh(new THREE.CircleGeometry(0.07, 10), pink); ear.position.set(s * 0.08, 0.34, 0.17); g.add(ear); }
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 4), pink); nose.position.set(0, 0.23, 0.31); g.add(nose);
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.02, 0.35, 5), pink); tail.position.set(0, 0.16, -0.32); tail.rotation.x = -1.1; g.add(tail);
    g.scale.setScalar(1.5);
    g.position.copy(a); g.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
    const ph = Math.random() * 6;
    this.fx.add(g, dur, k => {
      g.position.lerpVectors(a, b, k);
      g.position.y = Math.abs(Math.sin(k * 26 + ph)) * 0.14;
      g.rotation.z = Math.sin(k * 26 + ph) * 0.12;
      if (Math.random() < 0.15) this.dustFx(g.position, 1);
      if (onZ) onZ(g.position.z);
      g.visible = k < 0.97;
    });
  },
  // 小さな子分が駆けていく（おしくらまんじゅう）
  minionRun(a, b, col, delay) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), toon(col)); m.scale.set(0.9, 0.8, 1.3);
    for (const s of [-1, 1]) { const ear = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), toon(col)); ear.position.set(s * 0.09, 0.13, 0.05); m.add(ear); }
    m.lookAt(b);
    GFX.delay(delay).then(() => this.fx.add(m, 0.5, k => { m.position.lerpVectors(a, b, k); m.position.y = 0.14 + Math.abs(Math.sin(k * 30)) * 0.08; if (Math.random() < 0.4) this.dustFx(m.position, 1); m.visible = k < 0.95; }));
  },
});
