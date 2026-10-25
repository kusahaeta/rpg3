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

  // ごろごろ切り通し：坂の脇の退避所で、坂いっぱいの大岩をやりすごす
  async boulder(api, out) {
    await api.ev(`P.prep(1, 12); P.field('road2', 4, 20, -Math.PI / 2)`);
    await api.run(1.5);
    await api.ev(`P.noFoes(); P.cam = v => { const p = v.player.pos, y = p.y + (v.player.vis ?? 0);
      v.camera.position.set(p.x + 2.5, p.y + 2.2, p.z + 6); v.camera.lookAt(-1, p.y + 0.8, p.z - 3); }; true`);
    await api.run(0.5);
    await api.start(out);
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
