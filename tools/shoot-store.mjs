// ストア用に、会話・戦闘・探索の一瞬を撮る（紹介動画の録画と同じ仮の時計でコマ送りするので、毎回同じ画になる）。
//   node tools/shoot-store.mjs <場面> <出力.png> [幅x高さ=1280x720] [倍率=3]
// ストアのスクショは、ゲームの画面（16:9）だけを 3840×2160 で撮り、tools/store-compose.mjs で切り抜き・並べ・見出しを入れる。
// 場面は下の SHOTS（1 コマ 1/30 秒）。SHOT_LANG=en で英語の画面（既定は日本語）。タイトル画面は tools/shoot-title.mjs で撮る。
// 先に `PORT=8937 node .claude/serve.js` を動かしておく。
import { writeFileSync } from 'node:fs';
import { session, FPS } from './promo/rec.mjs';

const step = (api, n) => api.run(n / FPS);
const tap = api => api.ev(`document.querySelector('.screen.dialog').click(); true`);   // 会話を 1 つ進める

// 会話を ja の行まで進める（英語の画面でも、Tx で置きかえた文で探す）。行が出たら 3 コマ目にタップして文字を出しきる。
// 短い行は 3 コマで出しきってしまい、タップで次の行へ進むので、tap = false にして、あとは時間で出しきる
async function talkTo(api, ja, tap0 = true) {
  for (let i = 0; i < 80; i++) {
    const ok = await api.ev(`(() => { const t = document.querySelector('.dl-text').textContent, w = Tx(${JSON.stringify(ja)}); return t.length > 3 && w.startsWith(t.slice(0, 12)); })()`);
    if (ok) { await step(api, 3); if (tap0) await tap(api); return; }
    await tap(api);
    await api.run(0.8);
  }
  throw new Error(`行が出てこなかった：${ja}`);
}
// 会話の寄りのカメラは、向きによっては背中を撮る。key の子の向いているほうの正面（d 前・r 横・y 上）から顔を写す。
// lift で見る点を上げると、子が画面の下寄りに写る（2×2 に並べたとき、上の段は見出しが重なるので、上を空ける）。
// 位置はモデルの実際の位置（綿毛の上のタマなど、舞台の立ち位置より高いことがある）
async function faceCam(api, key, d, r, y, lift = 0) {
  await api.ev(`{ const v = GFX.view, a = v.actors.${key}, ry = a.m.group.rotation.y, f = V3(Math.sin(ry), 0, Math.cos(ry)), s = V3(f.z, 0, -f.x);
    const base = a.m.group.getWorldPosition(V3()), look = base.clone(); look.y += a.headH * 0.75 + ${lift};
    const pos = base.clone().addScaledVector(f, ${d}).addScaledVector(s, ${r}); pos.y += ${y};
    v.cut(pos, look, { fov: 38 }); } true`);
  await step(api, 6);
}
// 冒険の 3 枚（縦に並べる）は、地名・お知らせ・目的・仲間の顔のアイコンを隠す（見出しと重なり、3 列に同じアイコンが並ぶため）
const hideFieldUi = api => api.ev(`document.querySelectorAll('.fd-zone, .fd-title, .fd-toasts, .fd-quest, .fd-team').forEach(e => e.style.visibility = 'hidden'); true`);
// 会話を始める（左上の場面名と、右上の AUTO・スキップのボタンは隠す。3 枚を並べて切り抜くと、場面名が半分だけ残るため）
const scene = (api, id) => api.ev(`App.go(DialogueScreen, '${id}', () => {}); document.querySelectorAll('.dl-title, .dl-ctrl').forEach(e => e.style.visibility = 'hidden'); true`);

// 戦闘：who の番（null なら最初の番）に act（b・inp が使える）を実行して止める。ほかの子はふつうの攻撃で、だれも倒れないようにする
// 上のまん中の場所の名前と WAVE は隠す（見出しを重ねる場所なので）
async function battleTurn(api, who, act) {
  await api.ev(`(() => {
    const b = Game.activeBattle; window.__go = null; let wait = 0;
    document.querySelector('.bf-top').style.visibility = 'hidden';
    const tm = setInterval(() => {
      b.enemies.forEach(e => { if (e.hp < e.maxHp * 0.5) e.hp = e.maxHp; });
      b.allies.forEach(u => { if (u.hp < u.maxHp * 0.5) { u.hp = u.maxHp; b.updateUnit(u); } });
      const inp = b.input; if (!inp || inp.mode !== 'turn') { wait = 0; return; }
      if ((wait += 1) < 5) return;
      wait = 0;
      if (${who ? `inp.unit.key === '${who}'` : 'true'}) { b.sp = 5; b.renderSp(); ${act} window.__go = __vt(); clearInterval(tm); }
      else { if (inp.sel !== 'basic') b.selectAbility('basic'); b.confirm(); }
    }, 100);
    return true;
  })()`);
  if (!await api.until(`__go != null`, 60)) throw new Error(`${who || '最初の子'}の番が来なかった`);
}
// 狙いを key の敵にして、コマンドを選んでいるところで止める
const aim = (sel, key) => `if (inp.sel !== '${sel}') b.selectAbility('${sel}'); inp.target = b.enemies.find(e => e.key === '${key}'); b.renderInput();`;

const SHOTS = {
  // 01：古代遺跡・外庭で、ミケとクロのコンボ技「にゃんこブレイク」の二つの斬撃が、石のねこ像の前で X に重なったところ。
  // 戦場は南向き（外庭の像の広場のほう）にして、背景に崩れた柱を入れる。古代ほたるは光で画面が白くかすむので出さない
  async combo(api) {
    await api.ev(`{ P.prep(4, 0, 35); addBond('mike', 'kuro', 999); Save.save();
      new Battle({ team: teamMembers().map(m => ({ ...m, hpRatio: 1, energy: null })), techs: [], bg: CHAPTERS[4].bg, canRetry: false,
        loc: { zone: 'ruins_out', at: [0, 0], face: 180, world: true }, title: FIELD_ZONES.ruins_out.name,
        waves: [[{ key: 'sekizou', lv: 35 }]], onResult: () => '', onExit: () => {} }).start(); } true`);
    await api.run(0.3);
    // コンボ技が会心で像を倒しきらないよう、敵の HP を多めにしておく（ゲージは満タンのまま）
    await battleTurn(api, null, `b.enemies.forEach(e => { e.maxHp *= 20; e.hp = e.maxHp; }); b.bond = 100; b.renderBond(); inp.target = b.enemies[0]; b.requestCombo('nyankoBreak');`);
    await step(api, 70);
  },

  // 02：冒険。ミャオ街道・丘のふもとから、頂上の風車（羽まで）と小麦畑へ向かって道を歩いていくところ（目的は「宿場の北、ごろごろ切り通しへ」）。
  // 立ち止まると仲間がこちらを向くので、歩きながら撮る。カメラはふだんより低く・遠く
  async field(api) {
    const [x0, z0, x1, z1] = [-2, 16, -2, -21];
    await api.ev(`P.prep(1, 11, 17); P.field('road1_hill', ${x0}, ${z0}, ${Math.atan2(-(x1 - x0), -(z1 - z0))}); true`);
    await api.run(1.5);
    await hideFieldUi(api);
    await api.ev(`P.noFoes(); Game.activeField.camPitch = 0.12; Game.activeField.camDist = 7; Game.activeField.camYaw = ${Math.atan2(-(x1 - x0), -(z1 - z0))}; true`);
    for (let i = 0; i < 60; i++) { await api.ev(`P.steer(${x1}, ${z1}, false)`); await step(api, 1); }
  },

  // 02：冒険（風車の街道・まどろみの林・笑顔の塔を縦に 3 つ並べる）。まどろみの林の綿毛の丘で、みんなで綿毛につかまって、ねむり川を越えるところ
  async woods(api) {
    await api.ev(`P.prep(1, 4); P.field('woods', -19, -6, 0)`);
    await api.run(1.5);
    await api.ev(`P.noFoes(); { const v = Game.activeField; v.camPitch = 0.3; v.camDist = 6; } true`);
    await hideFieldUi(api);
    for (let i = 0; i < 6 * FPS; i++) {
      const d = await api.ev(`P.steer(-19, -11, false, 0.2)`);
      if (d < 1.2) { await api.ev(`P.halt(); Game.activeField.interact(); true`); break; }
      await step(api, 1);
    }
    await step(api, 25);   // 川の上にさしかかったところ
  },

  // 02：冒険。笑顔の塔 1F の入口の広間から、玉と幕の舞台のある大ロビーへ歩いていくところ
  async tower(api) {
    await api.ev(`P.prep(2, 3, 20); P.field('tower', 0, 34, 0); true`);
    await api.run(1.5);
    await api.ev(`P.noFoes(); { const v = Game.activeField; v.camPitch = 0.2; v.camDist = 7; v.camYaw = 0; } true`);
    await hideFieldUi(api);
    for (let i = 0; i < 60; i++) { await api.ev(`P.steer(0, 0, false)`); await step(api, 1); }
  },

  // 05：会話（4 匹を 2×2 で 1 枚に並べる）。第二章「綿毛の上の子猫」で、大きなたんぽぽの綿毛のてっぺんで、タマが丸くなって眠っているところ（「……すぴー……。」）
  async tama(api) {
    await api.ev(`Debug.jump(1, 3); true`);
    await scene(api, 'c2_03');
    await api.run(2);
    await talkTo(api, '……すぴー……。', false);
    await step(api, 30);
    await faceCam(api, 'tama', 3.0, 0.9, -1.5, -0.3);   // 寄って、下から見上げる（寝ている子は頭を前に下げるので、上からだと頭のてっぺんしか写らない）
  },

  // 05：会話。第一章「空から来た黒猫」で「それより、魚もう一匹食べる？」を選び、クロが照れて「……もらう。」と言うところ。
  // 寄りのカメラは後ろから撮るので、クロの正面から撮りなおす（左の光る実は、流れ星の夜に落ちてきた友情の実）
  async kuro(api) {
    await api.ev(`Debug.jump(0, 2); true`);
    await scene(api, 'c1_03');
    await api.run(2);
    const pick = JSON.stringify('それより、魚もう一匹食べる？');
    for (let i = 0; i < 80; i++) {
      const n = await api.ev(`[...document.querySelectorAll('.dl-choice')].findIndex(b => b.textContent.includes(Tx(${pick})))`);
      if (n >= 0) { await api.ev(`document.querySelectorAll('.dl-choice')[${n}].click(); true`); break; }
      if (i === 79) throw new Error('選択肢が出てこなかった');
      await tap(api);
      await api.run(0.8);
    }
    await talkTo(api, '……もらう。', false);
    await step(api, 20);
    await faceCam(api, 'kuro', 2.4, 0.9, 0.8, 0.15);   // 低めから、顔が下を向きすぎないように（横の 0.9 で、手前のミケがほぼ外れる）
  },

  // 05：会話。第一章「魚どろぼう」で「でも、すっごくおいしかったよ！」を選び、ミケが両手を挙げたところ。
  // 選んで 3 コマ目に 1 回タップして文字を出しきる。カメラはそのあと寄っていくので、全身が入るのは 8 コマ目くらいまで
  async oishii(api) {
    await scene(api, 'c1_01');
    await api.run(2);
    const pick = JSON.stringify('でも、すっごくおいしかったよ！');
    for (let i = 0; i < 80; i++) {
      const n = await api.ev(`[...document.querySelectorAll('.dl-choice')].findIndex(b => b.textContent.includes(Tx(${pick})))`);
      if (n >= 0) { await api.ev(`document.querySelectorAll('.dl-choice')[${n}].click(); true`); break; }
      if (i === 79) throw new Error('選択肢が出てこなかった');
      await tap(api);
      await api.run(0.8);
    }
    await step(api, 3);
    await tap(api);
    await step(api, 4);
  },

  // 05：会話。第二章「自称・天才魔法使い」で、シロが「さあさあ、よってらっしゃい！…」と名のるところ
  async shiro(api) {
    await api.ev(`Debug.jump(1, 2); true`);
    await scene(api, 'c2_02');
    await api.run(2);
    await talkTo(api, 'さあさあ、よってらっしゃい！　世界一の天才魔法使い、シロさまの魔法をお見せするわ！');
    await step(api, 12);
    await faceCam(api, 'shiro', 3.2, 0.5, 1.3, 0.25);   // 手前のミケの後ろ頭が入らないよう、シロの正面から
  },

  // 03：くろねこ谷の戦場で、影ねこ 2 匹とさまよう鎧（4-1 の 2 戦目と同じ顔ぶれ）。ミケの番に「勇者のつるぎ」を選んで鎧に狙いを合わせ、
  // コマンドを選んでいるところ（決定はしない）
  async yoroi(api) {
    await api.ev(`{ P.prep(3, 1, 26); Save.save();
      new Battle({ team: teamMembers().map(m => ({ ...m, hpRatio: 1, energy: null })), techs: [], bg: CHAPTERS[3].bg, canRetry: false,
        loc: zoneArena('valley', { x: -6, z: 18 }), title: FIELD_ZONES.valley.name,
        waves: [['kageneko', 'yoroi', 'kageneko'].map(k => ({ key: k, lv: 26 }))], onResult: () => '', onExit: () => {} }).start(); } true`);
    await api.run(0.3);
    await battleTurn(api, 'mike', aim('skill', 'yoroi'));
    await step(api, 30);
  },
};

// 04：おしゃれ（4 匹を 1 枚に並べる。並べ方は tools/store-compose.mjs）。なかまの画面で着せて、画面の板や一覧は隠し、景色と猫だけを撮る。
// 景色の一枚絵は猫のまわり（左がわ）だけなので、使うのは猫のまわりだけ。目を閉じているとき（まばたき・笑う仕草の joy）には撮らない
const FITS = { mike: { hat: 'h_straw', clothes: 'w_happi' }, kuro: { hat: 'h_silk', clothes: 'w_tux', cape: 'c_royal' },
  shiro: { hat: 'h_beret', glasses: 'g_round', cape: 'c_sakura' }, tama: { hat: 'h_clown', clothes: 'w_clown', glasses: 'g_clown' } };
for (const [key, fits] of Object.entries(FITS)) SHOTS[`fit-${key}`] = async api => {
  await api.ev(`{ P.prep(2, 2, 30); Object.keys(OUTFITS).forEach(gainOutfit); Save.data.outfit = {};
    const f = ${JSON.stringify(fits)}; for (const s in f) setOutfit('${key}', s, f[s]);
    charTab = 'fit'; App.go(CharScreen, '${key}'); } true`);
  await api.run(2.5);
  await api.ev(`document.querySelector('.screen.chars').style.visibility = 'hidden'; true`);
  await api.until(`(f => !f.closed && f.expr !== 'joy')(GFX.view.model.face)`, 8);
  await api.ev(`GFX.view.model.face.blinkT = 99; true`);
  await step(api, 3);
};

const [name, out, sizeArg = '1280x720', scaleArg = '3'] = process.argv.slice(2);
if (!SHOTS[name] || !out) { console.error(`使い方: node tools/shoot-store.mjs <${Object.keys(SHOTS).join('|')}> <出力.png> [幅x高さ] [倍率]`); process.exit(1); }
const [w, h] = sizeArg.split('x').map(Number);
await session(async api => {
  await SHOTS[name](api);
  const shot = await api.send('Page.captureScreenshot', { format: 'png' });
  const png = Buffer.from(shot.result.data, 'base64');
  writeFileSync(out, png);
  console.log(`${out}（${png.readUInt32BE(16)}×${png.readUInt32BE(20)}）`);
}, { w, h, scale: Number(scaleArg), lang: process.env.SHOT_LANG || 'ja' });
