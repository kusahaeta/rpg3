// ストア用に、会話・戦闘・探索の一瞬を撮る（紹介動画の録画と同じ仮の時計でコマ送りするので、毎回同じ画になる）。
//   node tools/shoot-store.mjs <場面> <出力.png> [幅x高さ=956x440] [倍率=3]
// 場面は下の SHOTS（1 コマ 1/30 秒）。SHOT_LANG=en で英語の画面（既定は日本語）。タイトル画面は tools/shoot-title.mjs で撮る。
// 先に `PORT=8937 node .claude/serve.js` を動かしておく。
import { writeFileSync } from 'node:fs';
import { session, FPS } from './promo/rec.mjs';

const step = (api, n) => api.run(n / FPS);
const tap = api => api.ev(`document.querySelector('.screen.dialog').click(); true`);   // 会話を 1 つ進める

// 会話を ja の行まで進める（英語の画面でも、Tx で置きかえた文で探す）。行が出たら 3 コマ目にタップして文字を出しきる
async function talkTo(api, ja) {
  for (let i = 0; i < 80; i++) {
    const ok = await api.ev(`(() => { const t = document.querySelector('.dl-text').textContent, w = Tx(${JSON.stringify(ja)}); return t.length > 3 && w.startsWith(t.slice(0, 12)); })()`);
    if (ok) { await step(api, 3); await tap(api); return; }
    await tap(api);
    await api.run(0.8);
  }
  throw new Error(`行が出てこなかった：${ja}`);
}
// 会話を始める（?debug の AUTO ボタンは消す）
const scene = (api, id) => api.ev(`App.go(DialogueScreen, '${id}', () => {}); document.querySelector('[data-auto]')?.remove(); true`);

// 戦闘：who の番（null なら最初の番）に act（b・inp が使える）を実行して止める。ほかの子はふつうの攻撃で、だれも倒れないようにする
async function battleTurn(api, who, act) {
  await api.ev(`(() => {
    const b = Game.activeBattle; window.__go = null; let wait = 0;
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
  // 02：笑顔の塔・下層（3-1）で、ミケとクロのコンボ技「にゃんこブレイク」がゴーストに当たったところ
  async combo(api) {
    await api.ev(`{ P.prep(2, 2, 20); addBond('mike', 'kuro', 999); Save.save(); startStage(2, CHAPTERS[2].stages.find(s => s.id === '3-1'), [], () => {}); } true`);
    await api.run(0.3);
    // コンボ技が会心でゴーストを倒しきらないよう、敵の HP を多めにしておく（ゲージは満タンのまま）
    await battleTurn(api, null, `b.enemies.forEach(e => { e.maxHp *= 20; e.hp = e.maxHp; }); b.bond = 100; b.renderBond(); b.requestCombo('nyankoBreak');`);
    await step(api, 75);
  },

  // 03：ミャオ街道・丘を、風車と小麦畑のそばの道にそって歩いていくところ（目的は「宿場の北、ごろごろ切り通しへ」）。
  // 立ち止まると仲間がこちらを向くので、歩きながら撮る。カメラはふだんより低く・遠く
  async field(api) {
    const [x0, z0, x1, z1] = [-6, -10, 20, -50];
    await api.ev(`P.prep(1, 11, 17); P.field('road1_hill', ${x0}, ${z0}, ${Math.atan2(-(x1 - x0), -(z1 - z0))}); true`);
    await api.run(1.5);
    await api.ev(`P.noFoes(); Game.activeField.camPitch = 0.22; Game.activeField.camDist = 6.5; true`);
    for (let i = 0; i < 60; i++) { await api.ev(`P.steer(${x1}, ${z1}, false)`); await step(api, 1); }
  },

  // 04：第二章「宿場の夜」で、ミケが「あるある！ 毎日ある！…」と言うところ
  async talk(api) {
    await api.ev(`Debug.jump(1, 8); true`);
    await scene(api, 'c2_03c');
    await api.run(2);
    await talkTo(api, 'あるある！　毎日ある！　今日だって、ねむり花の前で、ぐうぐう寝ちゃったし！');
    await step(api, 12);
  },

  // 05：ごろごろ切り通し（2-4 の 1 戦目）で、シロの番に「マジックアロー」でのら犬を狙い、コマンドを選んでいるところ
  async battle(api) {
    await api.ev(`{ P.prep(1, 12, 17); Save.save(); startStage(1, CHAPTERS[1].stages.find(s => s.id === '2-4'), [], () => {}); } true`);
    await api.run(0.3);
    await battleTurn(api, 'shiro', aim('basic', 'noraInu'));
    await step(api, 30);
  },

  // 06：第二章「自称・天才魔法使い」で、シロが「さあさあ、よってらっしゃい！…」と名のるところ
  async shiro(api) {
    await api.ev(`Debug.jump(1, 2); true`);
    await scene(api, 'c2_02');
    await api.run(2);
    await talkTo(api, 'さあさあ、よってらっしゃい！　世界一の天才魔法使い、シロさまの魔法をお見せするわ！');
    await step(api, 12);
  },

  // 07：第一章「魚どろぼう」で「でも、すっごくおいしかったよ！」を選び、ミケが両手を挙げたところ。
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

  // 08：くろねこ谷の戦場で、影ねこ 2 匹とさまよう鎧（4-1 の 2 戦目と同じ顔ぶれ）。ミケの番に「勇者のつるぎ」を選んで鎧に狙いを合わせ、
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

const [name, out, sizeArg = '956x440', scaleArg = '3'] = process.argv.slice(2);
if (!SHOTS[name] || !out) { console.error(`使い方: node tools/shoot-store.mjs <${Object.keys(SHOTS).join('|')}> <出力.png> [幅x高さ] [倍率]`); process.exit(1); }
const [w, h] = sizeArg.split('x').map(Number);
await session(async api => {
  await SHOTS[name](api);
  const shot = await api.send('Page.captureScreenshot', { format: 'png' });
  const png = Buffer.from(shot.result.data, 'base64');
  writeFileSync(out, png);
  console.log(`${out}（${png.readUInt32BE(16)}×${png.readUInt32BE(20)}）`);
}, { w, h, scale: Number(scaleArg), lang: process.env.SHOT_LANG || 'ja' });
