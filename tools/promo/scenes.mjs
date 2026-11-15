// 紹介動画の場面。どれも (api, 出力のフォルダ) を受けて、api.start → api.rec で撮る（tools/promo/rec.mjs）
// 物語の段階は STORY の添字（第二章は ci=1、第三章は ci=2）。ネタバレをさけて、第二章〜第三章から選ぶ
const dialogNext = `Game.activeDialog.key({ key: ' ', preventDefault() {} }); true`;

export const SCENES = {
  // タイトル：にゃんだーの樹を見上げたところから、5 匹のうしろへ下りてきて、ロゴがそろう
  async title(api, out) {
    // 読みこみ待ちのあいだにカメラが下りてしまうので、タイトルを出しなおす。
    // カメラは樹を見上げたところから、4 秒かけてなめらかに 5 匹のうしろへ（もとの演出より、ゆっくり）。ロゴは少し遅れて出す
    await api.ev(`{ App.go(TitleScreen); document.querySelector('.t-start').style.visibility = 'hidden';
      const logo = document.querySelector('.t-logo'); logo.style.visibility = 'hidden';
      const v = GFX.view, up = v.update.bind(v), P0 = V3(0.2, 0.6, 9.6), L0 = V3(0.6, 30, -40); let T = 0;
      v.update = (dt, t, rdt) => { up(dt, t, rdt); T += rdt; const e = Math.min(1, T / 4.2), s = e * e * (3 - 2 * e);
        v.camera.position.lerpVectors(P0, v.camPos, s); v.camera.lookAt(V3().lerpVectors(L0, v.curLook, s)); }; } true`);
    await api.start(out);
    await api.rec(7, async i => {
      if (i === 50) await api.ev(`{ const o = document.querySelector('.t-logo'), n = o.cloneNode(true); n.style.visibility = ''; o.replaceWith(n); } true`);
    });
  },

  // ミャオ街道の丘：南の斜面の道を、風車の立つ頂上へかけ上がる
  async hill(api, out) {
    await api.ev(`P.prep(1, 11); P.field('road1_hill', 16, 14, 0)`);
    await api.run(1);
    await api.ev(`P.noFoes(); { const v = Game.activeField; v.camPitch = 0.22; v.camDist = 6; } true`);
    await api.run(1);
    await api.start(out);
    await api.rec(7, async () => { await api.ev(`P.steer(-2, -8, true, 0.04)`); });
  },

  // まどろみの林：大きなたんぽぽの綿毛につかまって、川をこえる
  async fluff(api, out) {
    await api.ev(`P.prep(1, 4); P.field('woods', -19, -6, 0)`);
    await api.run(1.5);
    await api.ev(`P.noFoes(); { const v = Game.activeField; v.camPitch = 0.3; v.camDist = 6; } true`);
    await api.start(out);
    let grabbed = false;
    await api.rec(9, async () => {
      if (grabbed) return;
      const d = await api.ev(`P.steer(-19, -11, false, 0.2)`);
      if (d < 1.2) { grabbed = true; await api.ev(`P.halt(); Game.activeField.interact(); true`); }
    });
  },

  // 街道の宿場：シロの「ファイア！」で、空から魚が降ってくる
  async talk(api, out) {
    await api.ev(`P.prep(1, 2); App.go(DialogueScreen, 'c2_02', () => {}); document.querySelector('[data-auto]')?.remove(); true`);
    await api.run(1.5);
    for (let i = 0; i < 3; i++) { await api.ev(dialogNext); await api.run(0.3); await api.ev(dialogNext); await api.run(0.6); }
    // 5 行目「ファイア！」（1.4 秒後に魚が降る）→ 6 行目「……空から、魚が降ってきた。」→ 7 行目「わーい！　魚だーー！！」
    await api.start(out);
    await api.ev(dialogNext);
    await api.rec(4);
    await api.ev(dialogNext); await api.ev(dialogNext);
    await api.rec(3);
    await api.ev(dialogNext); await api.ev(dialogNext);
    await api.rec(3);
  },

  // ニャハハ王国の城下町：入口から、噴水の広場とお城のほうへ歩く
  async town(api, out) {
    await api.ev(`P.prep(2, 1); P.field('nyahaha', 0, 26, 0)`);
    await api.run(1.5);
    await api.ev(`{ const v = Game.activeField; v.camPitch = 0.25; v.camDist = 6.5; } true`);
    await api.run(0.5);
    await api.start(out);
    await api.rec(8, async () => { await api.ev(`P.steer(0, -6, false, 0.1)`); });
  },

  // ごろごろ切り通し：坂の脇の退避所で、坂いっぱいに突っこんでくる特攻隊長をやりすごす（退避所の中は見えないので、録画のはじめに見つけたことにする）
  async boulder(api, out) {
    await api.ev(`P.prep(1, 12); P.field('road2', 5, 23, -Math.PI / 2)`);
    await api.run(1.5);
    await api.ev(`P.noFoes(); P.cam = v => { const p = v.player.pos, y = p.y + (v.player.vis ?? 0);
      v.camera.position.set(p.x + 2.5, p.y + 2.2, p.z + 6); v.camera.lookAt(-1, p.y + 0.8, p.z - 3); }; true`);
    await api.run(0.5);
    await api.start(out);
    await api.ev(`{ const c = Game.activeField.rollers.find(o => o.R.lane); c.st = 'spot'; c.tm = 0.35; } true`);
    await api.rec(8);
  },

  // 見晴らし台：一行のうしろから、遠くのニャハハ王国のお城と笑顔の塔を見る（締めの画。会話ウィンドウは出さない）
  async vista(api, out) {
    await api.ev(`P.prep(1, 13); App.go(DialogueScreen, 'c2_05b', () => {}); document.querySelector('[data-auto]')?.remove(); true`);
    await api.run(1.2);
    for (let i = 0; i < 2; i++) { await api.ev(dialogNext); await api.run(0.2); await api.ev(dialogNext); await api.run(0.4); }
    await api.run(2);
    await api.ev(`{ const st = document.createElement('style'); st.textContent = '.screen.dialog .dl-box, .screen.dialog .dl-title { visibility: hidden; }'; document.head.appendChild(st); } true`);
    await api.start(out);
    for (const [pos, look, fov] of [[[-2.0, 1.6, -6.0], [30, 9, 314], 27]]) {
      await api.ev(`{ const v = GFX.view; v.cut(v.WP(${JSON.stringify(pos)}), v.WP(${JSON.stringify(look)}), { free: true, fov: ${fov}, drift: 0.25, dur: 5 }); } true`);
      await api.rec(4);
    }
  },

  // ぽかぽか村：ミケの家の柵の外の道を、東へ歩く（第一章のおわり。目的地の (0, 5) には近づかない）
  async village(api, out) {
    await api.ev(`P.prep(0, 7); P.field('pokapoka', -12, -6, -Math.PI / 2)`);
    await api.run(1.5);
    await api.ev(`P.noFoes(); { const v = Game.activeField; v.camPitch = 0.28; v.camDist = 6.5; } true`);
    await api.run(0.5);
    await api.start(out);
    await api.rec(8, async () => { await api.ev(`P.steer(24, -6, false, 0.08)`); });
  },

  // デバッグのメニュー：探索のメニューから「デバッグ」を開き、章へジャンプの一覧を見せる
  async debugmenu(api, out) {
    await api.ev(`P.prep(1, 4); P.field('woods', -19, -6, 0)`);
    await api.run(1.5);
    await api.ev(`P.noFoes(); true`);
    await api.run(0.5);
    await api.start(out);
    await api.rec(1);
    await api.ev(`Game.activeField.menu(); true`);
    await api.rec(1.5);
    await api.ev(`document.querySelector('.overlay [data-m=debug]').click(); true`);
    await api.rec(4.5);
  },

  // タイトルをそのまま見せる（作り直しの前と後をくらべる用。古い版は PROMO_URL で撮る）
  async titlehold(api, out) {
    await api.ev(`App.go(TitleScreen); true`);
    await api.run(6);
    await api.start(out);
    await api.rec(27);   // まとめなど、長い行でも止めずに流せるように
  },

  // 古代遺跡・石畳の丘の戦い（メイキング動画の必殺技用）：奥に石の神殿が見える戦場。シロは大ばくはつの杖（必殺技「ちょう大ばくはつ」）
  async battleHill(api, out) {
    await api.ev(`{ P.prep(4, 0, 60); addBond('mike', 'kuro', 999); const d = Save.data; gainWeapon('shiro_boom'); d.equip.shiro = 'shiro_boom'; Save.save();
      const st = CHAPTERS[4].stages.find(s => s.id === '5-1');
      new Battle({ team: teamMembers().map(m => ({ ...m, hpRatio: 1, energy: null })), techs: [], bg: CHAPTERS[4].bg, canRetry: false,
        loc: zoneArena('ruins_hill', { x: 0, z: 22 }), title: '古代遺跡・石畳の丘',
        waves: [st.waves.at(-1).map(k => ({ key: k, lv: st.lv }))], onResult: () => '', onExit: () => {} }).start(); } true`);
    await api.run(0.3);
    await api.ev(`(() => {
      const b = Game.activeBattle; window.__b = b;
      const plan = ['basic', 'combo', 'ult:mike', 'basic', 'ult:shiro', 'basic', 'ult:kuro', 'ult:tama', 'basic', 'basic'];
      let wait = 0;
      setInterval(() => {
        b.enemies.forEach(e => { if (e.hp < e.maxHp * 0.5) e.hp = e.maxHp; });
        b.allies.forEach(u => { if (u.hp < u.maxHp * 0.5) { u.hp = u.maxHp; b.updateUnit(u); } });
        const inp = b.input; if (!inp) { wait = 0; return; }
        if ((wait += 1) < 4) return;
        wait = 0;
        if (inp.mode === 'ult') { b.confirm(); return; }
        const a = plan.shift() || 'basic';
        if (a === 'combo') { b.bond = 100; b.renderBond(); b.requestCombo('nyankoBreak'); }
        else if (a.startsWith('ult:')) { const i = b.allies.findIndex(u => u.key === a.slice(4)); const u = b.allies[i]; u.energy = u.energyMax; b.updateUnit(u); b.requestUlt(i); }
        else { b.sp = 5; b.renderSp(); if (inp.sel !== a) b.selectAbility(a); b.confirm(); }
      }, 100);
      return true;
    })()`);
    await api.start(out);
    await api.rec(40);
  },

  // 必殺技を 3 つ続けて（App Store のプレビューの頭）：ミケ「炎の大車輪」（ほのおのつるぎ）→ シロ「ダイヤモンドダスト」（こおりの杖）→ マオウ「暗黒ねこ波」
  //   戦場は battleHill と同じ古代遺跡・石畳の丘。古代ほたるは光で画面が白くかすむので、石のねこ像だけ
  async battleUlt(api, out) {
    await api.ev(`{ P.prep(4, 0, 72); const d = Save.data;
      d.owned.maou = d.owned.maou || { lv: 72, exp: 0, eid: 0 }; d.owned.maou.lv = 72; d.team = ['mike', 'maou', 'shiro', 'tama'];
      for (const [k, w] of [['mike', 'mike_flame'], ['shiro', 'shiro_ice']]) { gainWeapon(w); d.equip[k] = w; }
      Save.save();
      const st = CHAPTERS[4].stages.find(s => s.id === '5-1');
      new Battle({ team: teamMembers().map(m => ({ ...m, hpRatio: 1, energy: null })), techs: [], bg: CHAPTERS[4].bg, canRetry: false,
        loc: zoneArena('ruins_hill', { x: 0, z: 22 }), title: '古代遺跡・石畳の丘',
        waves: [['sekizou', 'sekizou', 'sekizou'].map(k => ({ key: k, lv: st.lv }))], onResult: () => '', onExit: () => {} }).start(); } true`);
    await api.run(0.3);
    await api.ev(`(() => {
      const b = Game.activeBattle; window.__b = b;
      const plan = (window.__plan = ['ult:mike', 'ult:shiro', 'ult:maou', 'basic', 'basic', 'basic']);
      let wait = 0;
      setInterval(() => {
        b.enemies.forEach(e => { if (e.hp < e.maxHp * 0.5) e.hp = e.maxHp; });
        b.allies.forEach(u => { if (u.hp < u.maxHp * 0.5) { u.hp = u.maxHp; b.updateUnit(u); } });
        const inp = b.input; if (!inp) { wait = 0; return; }
        if ((wait += 1) < (window.__wait || 4)) return;
        wait = 0;
        if (inp.mode === 'ult') { b.confirm(); return; }
        const a = plan.shift() || 'basic';
        if (a.startsWith('ult:')) { const i = b.allies.findIndex(u => u.key === a.slice(4)); const u = b.allies[i]; u.energy = u.energyMax; b.updateUnit(u); b.requestUlt(i); }
        else { b.sp = 5; b.renderSp(); if (inp.sel !== a) b.selectAbility(a); b.confirm(); }
      }, 100);
      return true;
    })()`);
    await api.start(out);
    await api.rec(+(process.env.PROMO_SEC || 26));
  },

  // まどろみの林：大きなたんぽぽの綿毛のてっぺんで、タマが眠っている（c2_03 の 6 行目「……すぴー……。」）
  async tamaNap(api, out) {
    await api.ev(`P.prep(1, 3); App.go(DialogueScreen, 'c2_03', () => {}); document.querySelector('[data-auto]')?.remove(); true`);
    await api.run(1.5);
    // 5 行目のミケ「ほんとだ！　かわいい！」まで送る。短い行は一瞬で出しきるので、1 回ずつ送って文を見る
    const said = t => api.ev(`document.querySelector('.screen.dialog').innerText.includes(${JSON.stringify(t)})`);
    for (let i = 0; i < 20 && !(await said('かわいい')); i++) { await api.ev(dialogNext); await api.run(0.5); }
    await api.run(1);
    await api.start(out);
    await api.ev(dialogNext);   // タマ「……すぴー……。」
    await api.rec(4.5);
  },

  // ラスボス・コドクとの戦い（世界の果て。メイキング動画用）：ボスの波だけにして、スキル → コンボ → 必殺技
  async battleFinal(api, out) {
    await api.ev(`{ P.prep(7, 0, 80); addBond('mike', 'kuro', 999); Save.save();
      const st0 = CHAPTERS[7].stages.find(s => s.id === '8-3'); startStage(7, { ...st0, waves: [st0.waves.at(-1)] }, [], () => {}); } true`);
    await api.run(0.3);
    await api.ev(`(() => {
      const b = Game.activeBattle; window.__b = b;
      // スキルはシロの天才魔法が氷になるとボスが氷に包まれて見えなくなるので、ふつうの攻撃にする
      const plan = ['basic', 'combo', 'ult:mike', 'basic', 'ult:shiro', 'basic', 'ult:kuro', 'ult:tama', 'basic', 'basic'];
      let wait = 0;
      setInterval(() => {
        b.enemies.forEach(e => { if (e.hp < e.maxHp * 0.5) e.hp = e.maxHp; });
        b.allies.forEach(u => { if (u.hp < u.maxHp * 0.5) { u.hp = u.maxHp; b.updateUnit(u); } });
        const inp = b.input; if (!inp) { wait = 0; return; }
        if ((wait += 1) < 4) return;
        wait = 0;
        if (inp.mode === 'ult') { b.confirm(); return; }
        const a = plan.shift() || 'basic';
        if (a === 'combo') { b.bond = 100; b.renderBond(); b.requestCombo('nyankoBreak'); }
        else if (a.startsWith('ult:')) { const i = b.allies.findIndex(u => u.key === a.slice(4)); const u = b.allies[i]; u.energy = u.energyMax; b.updateUnit(u); b.requestUlt(i); }
        else { b.sp = 5; b.renderSp(); if (inp.sel !== a) b.selectAbility(a); b.confirm(); }
      }, 100);
      return true;
    })()`);
    await api.start(out);
    await api.rec(40);
  },

  // 笑顔の塔の戦い：スキル → コンボ → 必殺技
  async battle(api, out) {
    await api.ev(`{ P.prep(2, 2, 22); addBond('mike', 'kuro', 999); Save.save();
      const st = CHAPTERS[2].stages.find(s => s.id === '3-1'); startStage(2, st, [], () => {}); } true`);
    await api.run(0.3);
    // 敵は倒れないように。行動はこの順で選ぶ
    await api.ev(`(() => {
      const b = Game.activeBattle; window.__b = b;
      const plan = ['skill', 'combo', 'ult:mike', 'skill', 'ult:shiro', 'basic', 'ult:kuro', 'ult:tama', 'skill', 'skill'];
      let wait = 0;
      setInterval(() => {
        b.enemies.forEach(e => { if (e.hp < e.maxHp * 0.5) e.hp = e.maxHp; });
        const inp = b.input; if (!inp) { wait = 0; return; }
        if ((wait += 1) < 4) return;   // 選ぶまで少し間をおく（0.1 秒ごと）
        wait = 0;
        if (inp.mode === 'ult') { b.confirm(); return; }
        const a = plan.shift() || 'basic';
        if (a === 'combo') { b.bond = 100; b.renderBond(); b.requestCombo('nyankoBreak'); }
        else if (a.startsWith('ult:')) { const i = b.allies.findIndex(u => u.key === a.slice(4)); const u = b.allies[i]; u.energy = u.energyMax; b.updateUnit(u); b.requestUlt(i); }
        else { b.sp = 5; b.renderSp(); if (inp.sel !== a) b.selectAbility(a); b.confirm(); }
      }, 100);
      return true;
    })()`);
    await api.start(out);
    await api.rec(40);
  },
};

// ------------------------------------------------------------
//  ここから、第一章〜第六章をめぐる版（make.mjs の --plan=world）の場面。
//  ゲームの画面（16:9）だけを 1920×1080 で撮る（view）。猫の顔が見えるように、探索はカメラのほうへ歩かせ、会話は正面から撮る
// ------------------------------------------------------------
const WIDE = { w: 1280, h: 720, scale: 1.5 };
const wide = fn => Object.assign(fn, { view: WIDE });
const css = (api, text) => api.ev(`{ const st = document.createElement('style'); st.textContent = ${JSON.stringify(text)}; document.head.appendChild(st); } true`);

// 探索：地名・お知らせ・目的・目的地の光の柱と札・右上のボタンと地図・下の仲間の顔は出さない（見出しと重なり、App Store 用に上下を切ると半分だけ残る）。
// 右下の「調べる」「攻撃」のボタンは残す
const fieldUi = async api => {
  await css(api, '.fd-zone, .fd-title, .fd-toasts, .fd-quest, .fd-qmark, .fd-prompt, .fd-tr, .fd-map, .fd-team { visibility: hidden !important; }');
  await api.ev(`{ const q = Game.activeField.quest; if (q && q.g) q.g.visible = false; } true`);
};
// 4 匹の並び（撮るときだけ）。ふだんはタマがミケの真後ろに隠れるので、左からクロ・タマ・ミケ・シロに広げる（tools/shoot-store.mjs の comeBack と同じ）
const SPREAD = { kuro: { gap: 0.7, x: -1.4 }, tama: { gap: 1.1, x: -0.72 }, shiro: { gap: 0.6, x: 0.85 } };
// 探索で、カメラの向き（yaw：度。0 で北を背に南へ歩く）を止めたまま、4 匹をカメラのほうへ歩かせる（run で走る）。
// sx：スティックの横（まっすぐより少しななめに）。pre：撮る前に歩かせておくコマ数（並びが落ちつくまで）。prep：物語の段階 [章, 段階, レベル]
async function walk(api, out, { zone, x, z, yaw = 0, sx = 0, sec = 3, run = false, pitch = 0.12, dist = 5.5, pre = 40, prep = [6, 0, 40], cam = null, before = '' }) {
  await api.ev(`P.prep(${prep.join(', ')}); P.field('${zone}', ${x}, ${z}, 0)`);
  await api.run(1.5);
  await api.ev(`P.noFoes(); { const v = Game.activeField; v.camPitch = ${pitch}; v.camDist = ${dist}; v.camYaw = ${yaw} * Math.PI / 180; ${before} } true`);
  await fieldUi(api);
  const sy = run ? 0.98 : 0.8;
  await api.ev(`{ const S = ${JSON.stringify(SPREAD)}, a = Math.atan2(${sx}, ${sy});
    Game.activeField.followers.forEach(f => { const s = S[f.mem.key]; if (s) { f.gap = s.gap * ${run ? 1.5 : 1}; f.side = (s.x + f.gap * Math.sin(a)) / Math.cos(a); } });
    ${cam ? `P.cam = ${cam};` : ''} } true`);
  const go = `{ const v = Game.activeField; v.camYaw = ${yaw} * Math.PI / 180; v.keys.clear(); v.stick = { x: ${sx}, y: ${sy} }; } true`;
  for (let i = 0; i < pre; i++) { await api.ev(go); await api.run(1 / 30); }
  await api.start(out);
  await api.rec(sec, () => api.ev(go));
}

// 会話：場面名・右上のボタンは出さない。ja の行が出るまで送る（英語の画面でも Tx で探す）
const scene = (api, id) => api.ev(`App.go(DialogueScreen, '${id}', () => {}); document.querySelectorAll('.dl-title, .dl-ctrl').forEach(e => e.style.visibility = 'hidden'); true`);
const tap = api => api.ev(`document.querySelector('.screen.dialog').click(); true`);
const lineIs = (api, ja) => api.ev(`(() => { const t = document.querySelector('.dl-text').textContent, w = Tx(${JSON.stringify(ja)}); return t.length > 3 && w.startsWith(t.slice(0, 12)); })()`);
async function talkTo(api, ja) {
  for (let i = 0; i < 80; i++) { if (await lineIs(api, ja)) return; await tap(api); await api.run(0.8); }
  throw new Error(`行が出てこなかった：${ja}`);
}
async function choose(api, ja) {
  for (let i = 0; i < 80; i++) {
    const n = await api.ev(`[...document.querySelectorAll('.dl-choice')].findIndex(b => b.textContent.includes(Tx(${JSON.stringify(ja)})))`);
    if (n >= 0) { await api.ev(`document.querySelectorAll('.dl-choice')[${n}].click(); true`); return; }
    await tap(api); await api.run(0.8);
  }
  throw new Error(`選択肢が出てこなかった：${ja}`);
}
// key の子の向いているほうの正面（d 前・r 横・y 上）から顔を写す。lift で見る点を上げる。drift：寄っていく速さ
const faceCam = (api, key, d, r, y, lift = 0, fov = 38) => api.ev(`{ const v = GFX.view, a = v.actors.${key}, ry = a.m.group.rotation.y, f = V3(Math.sin(ry), 0, Math.cos(ry)), s = V3(f.z, 0, -f.x);
  const base = a.m.group.getWorldPosition(V3()), look = base.clone(); look.y += a.headH * 0.75 + ${lift};
  const pos = base.clone().addScaledVector(f, ${d}).addScaledVector(s, ${r}); pos.y += ${y};
  v.cut(pos, look, { fov: ${fov} }); } true`);

// 戦闘：ステージ sid のさいごの波（ボスなど。wave で何番目かを選べる）を、物語と同じ戦場で。plan の順に行動する（'basic'・'skill'・'combo'・'ult:子'）。
// 技を選んでから決めるまで少し間をおいて、選んでいる画面も写す。だれも倒れない。上のまん中の場所の名前・技の名前の札（見出しと重なる）と、デバッグ用の AUTO は出さない。
// team：編成（マオウを入れるときなど）。目印：pick（技を選んだ）・act（決めた）・combo・ult（必殺技を出した）・ultgo（狙いを決めた）
async function battle(api, out, { ci, sid, plan, sec = 9, equip = [], hp = 4, pre = 0, team = null, wave = -1 }) {
  await api.ev(`{ P.prep(${ci}, 0, 0); const st = CHAPTERS[${ci}].stages.find(s => s.id === '${sid}'), d = Save.data;
    if (${JSON.stringify(team)}) { d.owned.maou = d.owned.maou || { lv: 1, exp: 0, eid: 0 }; d.team = ${JSON.stringify(team)}; }
    for (const k of d.team) d.owned[k].lv = st.lv + 4; addBond('mike', 'kuro', 999);
    for (const [k, w] of ${JSON.stringify(equip)}) { gainWeapon(w); d.equip[k] = w; } Save.save();
    startStage(${ci}, { ...st, waves: [st.waves.at(${wave})] }, [], () => {}); } true`);
  await css(api, '.bf-top, .announce, .bf-ctrl [data-c=auto] { visibility: hidden !important; }');
  await api.run(0.3);
  await api.ev(`(() => {
    const b = Game.activeBattle; window.__b = b; const plan = ${JSON.stringify(plan)}; let wait = 0, picked = false;
    b.enemies.forEach(e => { e.maxHp *= ${hp}; e.hp = e.maxHp; });
    setInterval(() => {
      b.enemies.forEach(e => { if (e.hp < e.maxHp * 0.5) e.hp = e.maxHp; });
      b.allies.forEach(u => { if (u.hp < u.maxHp * 0.5) { u.hp = u.maxHp; b.updateUnit(u); } });
      const inp = b.input; if (!inp) { wait = 0; picked = false; return; }
      wait += 1;
      if (inp.mode === 'ult') { if (wait >= 3) { wait = 0; __mark('ultgo'); b.confirm(); } return; }
      const a = plan[0] || 'basic';
      if (a === 'combo') { if (wait < 4) return; plan.shift(); wait = 0; b.bond = 100; b.renderBond(); __mark('combo'); b.requestCombo('nyankoBreak'); }
      else if (a.startsWith('ult:')) { if (wait < 4) return; plan.shift(); wait = 0; const i = b.allies.findIndex(u => u.key === a.slice(4)); const u = b.allies[i]; u.energy = u.energyMax; b.updateUnit(u); __mark('ult'); b.requestUlt(i); }
      else if (!picked) { if (wait < 4) return; picked = true; b.sp = 5; b.renderSp(); if (inp.sel !== a) b.selectAbility(a); if (plan.length) __mark('pick'); }
      else if (wait >= 11) { if (plan.length) __mark('act'); plan.shift(); wait = 0; picked = false; b.confirm(); }
    }, 100);
    return true;
  })()`);
  if (pre) await api.run(pre);
  await api.start(out);
  await api.rec(sec);
}

// タイトルの 5 匹を、こちら（カメラ）へ向かせる表情とポーズ（ストアのスクショと同じ。tools/shoot-store.mjs の TITLE_LOOK）
const TITLE_LOOK = {
  mike:  { face: 'joy', pose: { headX: -0.15, headY: 0.1, armRx: -2.7, armRz: -0.35, elbowR: -0.2, armLz: 0.3, elbowL: -0.4 } },
  kuro:  { face: 'serious', pose: { headY: -0.45, twist: -0.1, armLz: 0.15, armRz: -0.15, elbowL: -0.3, elbowR: -0.3 } },
  shiro: { face: 'smug', pose: { lean: -0.08, headX: -0.15, headY: 0.15, armRx: -2.9, armRz: -0.2, elbowR: -0.15, armLx: 0.2, armLz: 0.6, elbowL: -1.9 } },
  tama:  { sleep: true, pose: { headX: 0.4, headY: 0.15, lean: 0.06, armLx: -0.9, armLz: 0.45, elbowL: -1.5, armRx: -0.9, armRz: -0.45, elbowR: -1.5 } },
  maou:  { face: 'smug', pose: 'ULT_POSE_MAOU' },
};

Object.assign(SCENES, {
  // 風車の丘：頂上の風車と小麦畑を背に、4 匹がこちらへ走ってくる（動画の頭）
  w_run: wide((api, out) => walk(api, out, { zone: 'road1_hill', x: -2, z: -2, sx: -0.2, run: true, sec: 4, dist: 3.4, pitch: 0.08, prep: [1, 11, 17] })),
  // 各地をカメラのほうへ歩く（どれも同じ構図で、背景だけが変わる）
  w_village: wide((api, out) => walk(api, out, { zone: 'pokapoka', x: 0, z: 12, yaw: 180, sx: 0.15 })),
  w_forest: wide((api, out) => walk(api, out, { zone: 'forest_in', x: -2, z: -12, sx: 0.12 })),
  w_rat: wide((api, out) => walk(api, out, { zone: 'rat_nest', x: -6, z: -4, yaw: 90, sx: 0.12 })),
  w_town: wide((api, out) => walk(api, out, { zone: 'nyahaha', x: 0, z: 4, sx: -0.15 })),
  w_tower: wide((api, out) => walk(api, out, { zone: 'tower', x: -1.2, z: -5, sx: 0.15, pitch: 0.2 })),
  w_valley: wide((api, out) => walk(api, out, { zone: 'valley_village', x: -12, z: -5, sx: 0.15 })),
  w_cave: wide((api, out) => walk(api, out, { zone: 'cave', x: -8, z: 8, yaw: 90, sx: 0.12 })),
  w_ruins: wide((api, out) => walk(api, out, { zone: 'ruins_hill', x: 0, z: -6, sx: 0.12 })),
  w_demon: wide((api, out) => walk(api, out, { zone: 'demon_land', x: -2, z: 10, sx: 0.15 })),
  w_castle: wide((api, out) => walk(api, out, { zone: 'demon_castle', x: 1, z: 2, sx: 0.12 })),

  // まどろみの林：大きなたんぽぽの綿毛につかまって、川をこえる
  w_glide: wide(async (api, out) => {
    await api.ev(`P.prep(1, 4); P.field('woods', -19, -6, 0)`);
    await api.run(1.5);
    await api.ev(`P.noFoes(); { const v = Game.activeField; v.camPitch = 0.3; v.camDist = 6; } true`);
    await fieldUi(api);
    for (let i = 0; i < 6 * 30; i++) {
      const d = await api.ev(`P.steer(-19, -11, false, 0.2)`);
      if (d < 1.2) { await api.ev(`P.halt(); Game.activeField.interact(); { const v = Game.activeField; v.camPitch = 0.16; v.camDist = 3.4; } true`); break; }   // つかまったら、カメラを寄せて低く
      await api.run(1 / 30);
    }
    await api.start(out);
    await api.rec(6);
  }),

  // ごろごろ切り通し：坂いっぱいに突っこんでくる特攻隊長を、坂の脇の退避所でやりすごす
  w_boar: wide(async (api, out) => {
    await api.ev(`P.prep(1, 12); P.field('road2', 5, 23, -Math.PI / 2)`);
    await api.run(1.5);
    await api.ev(`P.noFoes(); P.cam = v => { const p = v.player.pos;
      v.camera.position.set(p.x + 2.5, p.y + 2.2, p.z + 6); v.camera.lookAt(-1, p.y + 1.7, p.z - 3); }; true`);
    await fieldUi(api);
    await api.run(0.5);
    await api.start(out);
    await api.ev(`{ const c = Game.activeField.rollers.find(o => o.R.lane); c.st = 'spot'; c.tm = 0.35; } true`);
    await api.rec(6);
  }),

  // ミケ：第一章「魚どろぼう」で「でも、すっごくおいしかったよ！」を選び、両手をあげる
  w_mike: wide(async (api, out) => {
    await scene(api, 'c1_01');
    await api.run(2);
    await choose(api, 'でも、すっごくおいしかったよ！');
    await faceCam(api, 'mike', 1.9, 0.6, 0.7, 0.1, 54);   // 手前の魚屋のおばちゃんの後ろ頭が入らないよう、ミケの正面から
    await api.start(out);
    await api.rec(0.1);
    await tap(api);
    await api.rec(3);
  }),
  // クロ：第一章「空から来た黒猫」で「それより、魚もう一匹食べる？」を選ぶと、照れて「……もらう。」
  w_kuro: wide(async (api, out) => {
    await api.ev(`Debug.jump(0, 2); true`);
    await scene(api, 'c1_03');
    await api.run(2);
    await choose(api, 'それより、魚もう一匹食べる？');
    await talkTo(api, '……もらう。');
    await faceCam(api, 'kuro', 2.4, 0.9, 0.8, 0.15);
    await api.start(out);
    await api.rec(3);
  }),
  // シロ：第二章「自称・天才魔法使い」の「ファイア！」で、空から魚が降ってくる
  w_shiro: wide(async (api, out) => {
    await api.ev(`Debug.jump(1, 2); true`);
    await scene(api, 'c2_02');
    await api.run(2);
    await talkTo(api, 'さあさあ、よってらっしゃい！　世界一の天才魔法使い、シロさまの魔法をお見せするわ！');
    await talkTo(api, 'そこ！　聞こえてるわよ！　……見てなさい。ファイア！');   // この行の 1.4 秒あとに光って（効果音 zap）、魚が降る
    await faceCam(api, 'shiro', 2.7, 0.3, 1.0, 0.05, 64);   // 手前のクロの後ろ頭が入らないよう、シロの正面から。降ってくる魚が入るよう、少し引いて上を空ける
    await api.start(out);
    await api.rec(5);
  }),
  // タマ：第二章「綿毛の上の子猫」で、大きなたんぽぽの綿毛のてっぺんで眠っている（「……すぴー……。」）
  w_tama: wide(async (api, out) => {
    await api.ev(`Debug.jump(1, 3); true`);
    await scene(api, 'c2_03');
    await api.run(2);
    await talkTo(api, '……すぴー……。');
    await api.run(1);
    await faceCam(api, 'tama', 3.0, 0.9, -1.5, -0.3);
    await api.run(0.2);
    await api.start(out);
    await api.rec(3);
  }),

  // 戦闘（どれも物語と同じ戦場・同じ相手）
  // 風車の畑：のら犬とカラス。技を選んで攻撃 → ミケとクロのコンボ技「にゃんこブレイク」
  w_bField: wide((api, out) => battle(api, out, { ci: 1, sid: '2-3', plan: ['skill', 'combo'], sec: 12, hp: 20 })),
  // 笑顔の塔の大舞台：ピエロに、シロの必殺技「ちょう天才メテオ」
  w_bStage: wide((api, out) => battle(api, out, { ci: 2, sid: '3-3', plan: ['ult:shiro'], sec: 7 })),
  // くろねこ谷の墓標：影ねことさまよう鎧に、クロの必殺技「月影一閃」
  w_bValley: wide((api, out) => battle(api, out, { ci: 3, sid: '4-1', plan: ['ult:kuro'], sec: 11 })),
  // 魔王城の玉座の間：魔王マオウに、ミケの必殺技「炎の大車輪」（ほのおのつるぎ）
  w_bThrone: wide((api, out) => battle(api, out, { ci: 5, sid: '6-3', plan: ['ult:mike'], sec: 7, equip: [['mike', 'mike_flame']] })),
  // ネズミの王国：キングネズミに、ミケの必殺技「流星ねこぎり」
  w_bRat: wide((api, out) => battle(api, out, { ci: 0, sid: '1-3', plan: ['ult:mike'], sec: 7 })),
  // ごろごろ切り通し：ばくそうイノシシに、シロの必殺技「ダイヤモンドダスト」（こおりの杖）
  w_bCanyon: wide((api, out) => battle(api, out, { ci: 1, sid: '2-4', plan: ['ult:shiro'], sec: 7, equip: [['shiro', 'shiro_ice']] })),

  // 動画の頭：くろねこ谷の墓標で、クロの必殺技「満月」（月影の刀）。カットイン → 夜空の大きな月へ跳ぶ → 三日月の斬撃
  w_bMoon: wide((api, out) => battle(api, out, { ci: 3, sid: '4-1', plan: ['ult:kuro'], sec: 12, equip: [['kuro', 'kuro_moon']] })),
  // ネズミの王国：マオウの必殺技「暗黒ねこ波」。敵が 1 体だと波が細いので、ネズミ 3 匹の波で
  w_bWave: wide((api, out) => battle(api, out, { ci: 0, sid: '1-3', plan: ['ult:maou'], sec: 11, wave: 0, team: ['mike', 'maou', 'shiro', 'tama'] })),
  // ごろごろ切り通し：シロの必殺技「ちょう大ばくはつ」（大ばくはつの杖）。光の玉が上がる → 大ばくはつ → けむりで頭がもこもこのシロ。敵 3 体の波で
  w_bBoom: wide((api, out) => battle(api, out, { ci: 1, sid: '2-4', plan: ['ult:shiro'], sec: 11, wave: 0, equip: [['shiro', 'shiro_boom']] })),

  // タイトル：樹とロゴはそのままで、5 匹がこちらを向いている（ストアのスクショと同じ顔ぶれ・ポーズ）。カメラはゆっくり寄り、ロゴが一文字ずつはねて出る
  w_title: wide(async (api, out) => {
    await api.ev(`App.go(TitleScreen); document.querySelectorAll('.t-start, .t-lang').forEach(e => e.style.visibility = 'hidden');
      document.querySelector('.t-logo').style.visibility = 'hidden'; true`);
    await api.run(2);
    await api.ev(`{ const v = GFX.view, L = ${JSON.stringify(TITLE_LOOK).replace('"ULT_POSE_MAOU"', '{ ...ULT_POSES.maou.pose, headX: -0.18, lean: -0.15 }')};
      const keys = ['mike', 'kuro', 'shiro', 'tama', 'maou'];
      v.cats.forEach((m, i) => { const p = m.group.position, c = L[keys[i]]; m.group.rotation.y = Math.atan2(0 - p.x, 8.1 - p.z);
        Object.assign(m.look, { t: 1e9, y: 0, tw: 0, up: 0 });
        if (c.sleep) { m.face.set('sleepy'); m.face.shut = true; } else { m.face.set(c.face); m.face.closed = false; m.face.blinkT = 99; } });
      const up = v.update.bind(v); let T = 0;
      v.update = (dt, t, rdt) => { up(dt, t, rdt); T += rdt; const e = Math.min(1, T / 5), s = 1 - (1 - e) * (1 - e);
        v.cats.forEach((m, i) => { for (const k of POSE_KEYS) m.pose[k] = (POSES.idle[k] || 0); Object.assign(m.pose, L[keys[i]].pose); });
        v.camPos.set(0, 1.3, 9.0 - 0.9 * s); v.camera.position.copy(v.camPos); v.curLook.copy(v.camLook); v.camera.lookAt(v.curLook); }; } true`);
    await api.run(0.1);
    await api.start(out);
    await api.rec(6, async i => {
      if (i === 8) await api.ev(`{ const o = document.querySelector('.t-logo'), n = o.cloneNode(true); n.style.visibility = ''; o.replaceWith(n); } true`);
    });
  }),
});
