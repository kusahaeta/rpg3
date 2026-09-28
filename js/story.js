'use strict';
// ============================================================
//  ストーリー（開拓任務）
//  会話シーン → フィールドの目的地へ → バトル … を順に進める
// ============================================================

// 物語に登場する NPC（3Dモデルと肖像を生成）
const NPCS = {
  polka:  { name: 'ポルカ', title: 'ノクターン号の車掌', elem: 'imaginary', scale: 0.74,
            look: { hair: '#f7b6d2', eye: '#5fc8ff', style: 'bob', outfit: '#2a2d55', accent: '#e8c77a', acc: 'hat' } },
  iris:   { name: 'イリス', title: 'ヘリオス主任研究員', elem: 'ice',
            look: { hair: '#34405e', eye: '#8fd0ff', style: 'long', outfit: '#e6ecf6', accent: '#56c8ff', acc: 'pin' } },
  roa:    { name: 'ロア', title: 'ベロワ・レジスタンスの長', elem: 'ice',
            look: { hair: '#c9a57a', eye: '#5f9fd8', style: 'pony', outfit: '#4a3a2e', accent: '#9fd8ff' } },
  sougen: { name: 'ソウゲン', title: '仙舟ホウライの将軍', elem: 'imaginary',
            look: { hair: '#2b2530', eye: '#e8b04a', style: 'pony', outfit: '#3e1c1c', accent: '#e8c77a', acc: 'horn' } },
  // 探索フィールドの居住区で暮らす住人
  r_gant:     { name: 'ガント', title: '整備士', elem: 'physical', look: { hair: '#6a4a36', eye: '#c8a060', style: 'spiky', outfit: '#c8641e', accent: '#ffd27a' } },
  r_marta:    { name: 'マルタ', title: '食堂の料理長', elem: 'fire', look: { hair: '#a0503a', eye: '#8a5a3a', style: 'bob', outfit: '#f2eee6', accent: '#ff8a5a' } },
  r_pipi:     { name: 'ピピ', title: '居住区の子ども', elem: 'wind', scale: 0.72, look: { hair: '#ffd27a', eye: '#6dff9e', style: 'twin', outfit: '#6a9ad8', accent: '#ffffff' } },
  r_celes:    { name: 'セレス', title: '研究員', elem: 'quantum', look: { hair: '#8a7ad8', eye: '#c8b4ff', style: 'long', outfit: '#e6ecf6', accent: '#8a7aff', acc: 'pin' } },
  r_horst:    { name: 'ホルスト', title: '警備隊員', elem: 'physical', look: { hair: '#3a3a44', eye: '#8ab0d8', style: 'short', outfit: '#2a3a5a', accent: '#56c8ff' } },
  r_ida:      { name: 'イーダ', title: 'パン屋', elem: 'fire', look: { hair: '#d8a060', eye: '#6a8ab8', style: 'pony', outfit: '#8a4a3a', accent: '#ffd27a' } },
  r_boris:    { name: 'ボリス', title: '銀鬣衛兵', elem: 'ice', look: { hair: '#c8ccd8', eye: '#5f9fd8', style: 'short', outfit: '#3a4a6a', accent: '#c9d8ff' } },
  r_misha:    { name: 'ミーシャ', title: '雪遊びの子', elem: 'ice', scale: 0.72, look: { hair: '#e8c890', eye: '#5fb8ff', style: 'bob', outfit: '#c83a3a', accent: '#ffffff', acc: 'ahoge' } },
  r_grigori:  { name: 'グリゴリ', title: '古老', elem: 'ice', look: { hair: '#e8e8ee', eye: '#8a9ab0', style: 'short', outfit: '#4a3a2e', accent: '#9fd8ff' } },
  r_natasha:  { name: 'ナターシャ', title: '行商人', elem: 'lightning', look: { hair: '#5a2a3a', eye: '#c77dff', style: 'long', outfit: '#3a5a4a', accent: '#ffcf6a' } },
  r_oleg:     { name: 'オレグ', title: '坑夫頭', elem: 'physical', look: { hair: '#3a2e28', eye: '#c8a060', style: 'spiky', outfit: '#5a4232', accent: '#ffb04a' } },
  r_sveta:    { name: 'スヴェータ', title: '坑夫の酒場の女将', elem: 'fire', look: { hair: '#c86a3a', eye: '#8a6a4a', style: 'pony', outfit: '#6a2e2e', accent: '#ffd27a' } },
  r_kolya:    { name: 'コーリャ', title: '坑夫の子', elem: 'ice', scale: 0.72, look: { hair: '#6a4a36', eye: '#4fd8ff', style: 'short', outfit: '#4a5a6a', accent: '#ffb04a', acc: 'ahoge' } },
  r_vera:     { name: 'ヴェーラ', title: '鍛冶屋', elem: 'fire', look: { hair: '#b8b8c0', eye: '#e8b04a', style: 'bob', outfit: '#3a3a44', accent: '#ff8a3a' } },
  r_yunshu:   { name: 'ユンシュ', title: '茶館の主人', elem: 'wind', look: { hair: '#2a3a34', eye: '#6fd6a8', style: 'pony', outfit: '#3f7a68', accent: '#e8c77a' } },
  r_hakuen:   { name: 'ハクエン', title: '講談師', elem: 'imaginary', look: { hair: '#f0f0f4', eye: '#e8b04a', style: 'spiky', outfit: '#5a2a2a', accent: '#ffcf6a' } },
  r_linlin:   { name: 'リンリン', title: '屋台の娘', elem: 'fire', look: { hair: '#2b2530', eye: '#ff8a5a', style: 'twin', outfit: '#a8322c', accent: '#ffd27a' } },
  r_xiaochi:  { name: 'シャオチ', title: '市場の子ども', elem: 'wind', scale: 0.72, look: { hair: '#3a2a20', eye: '#ffcf6a', style: 'short', outfit: '#e8b35a', accent: '#ff6a6a', acc: 'ahoge' } },
  r_unki:     { name: 'ユウジン', title: '雲騎軍の兵', elem: 'lightning', look: { hair: '#1c1418', eye: '#e8b04a', style: 'pony', outfit: '#2c3a5a', accent: '#e8c77a' } },
};

// ------------------------------------------------------------
//  台本
//  行：[話者, 本文, 表示名(省略可), 演出(省略可)]  話者 'n' = ナレーション、'e:敵キー' = 敵
//  選択肢：{ c: [[選択肢の文, [応答の行...]], ...] }（選んだ文はアステルの台詞になる）
//  { give: 'キャラ' } でキャラクターが仲間になる（編成に空きがあれば編成にも加わる）
// ------------------------------------------------------------
const SCENES = {
  // ---------------- 第一章 ----------------
  // 行の最後の { } は演出（js/stage.js）：f 表情 / g 身振り / to 話しかける相手 / r 周りの反応 / look 視線 / face 体の向き /
  // stance 立ち方 / move 歩く / hold 小物 / weapon 武器 / enter 登場 / defeat 撃破 / fx 効果 / cam カメラ / later [秒, 演出]
  c1_01: { bg: 'station', title: '目覚め', lines: [
    ['n', '冷たい光。遠くで鳴り続ける警報。……誰かが、ガラス越しにこちらを覗き込んでいる。', { cam: 'ots:mizore>aster', dur: 7, drift: 0.15, r: { aster: 'pained', mizore: 'worry', yue: 'worry' }, look: { aster: null } }],
    ['mizore', 'あっ、目を開けた！ ユエ、この子生きてるよ！', { f: 'joy', g: 'cheer', to: 'yue', r: { aster: ['surprise', 'lookUp'], yue: 'surprise' }, look: { aster: 'mizore' } }],
    ['yue', '落ち着いて、ミゾレ。……冷凍睡眠カプセルの中にいたのね。あなた、名前は言える？', { f: 'gentle', g: 'offer', to: 'aster', r: { mizore: 'smile' } }],
    { c: [
      ['……アステル。', [['yue', 'アステル。綺麗な名前ね。私はユエ、こっちの元気なのがミゾレよ。', { f: 'smile', g: 'present', r: { mizore: ['joy', 'wave'] } }]], { f: 'neutral', g: 'lookUp' }],
      ['ここは、どこ？', [['mizore', 'ヘリオス宇宙ステーション！ ……の、たぶん今いちばん危ないところ！', { f: 'joy', g: 'shrug', later: [1.8, { r: { mizore: 'worry' } }] }], ['yue', '私はユエ、この子はミゾレ。星海列車ノクターン号の乗員よ。', { f: 'gentle', g: 'present' }]], { f: 'worry', g: 'tilt' }],
    ] },
    ['n', '轟音。区画のどこかで隔壁が破られ、警報がいっそう甲高くなる。', { shake: 0.5, flash: '#ff3040', sfx: 'slam', cam: 'wide', dur: 6, r: { all: 'surprise', mizore: ['surprise', 'recoil'] }, look: { all: 'alarm' } }],
    ['yue', '反物質軍団……！ ステーションの奥にまで入り込んでいるわ。', { f: 'serious', g: 'point', look: { yue: 'alarm' }, stance: { yue: 'guardStaff' }, r: { aster: 'worry' } }],
    ['mizore', 'ここにいたら危ないよ！ アステル、立てる？', { f: 'worry', g: 'offer', to: 'aster', move: { mizore: [-0.3, -0.45] } }],
    { c: [
      ['……うん、平気。', [['mizore', 'よかった！ 離れないでね。', { f: 'joy', g: 'hop' }]], { f: 'neutral', g: 'nod', stance: { aster: 'idle' } }],
      ['体が、少し重い……。', [['yue', '無理もないわ。ゆっくりでいいから、ついてきて。', { f: 'gentle', g: 'handChest' }]], { f: 'pained', stance: { aster: 'weak' } }],
    ] },
    ['yue', 'まずはこのカプセルホールを出ましょう。南の通路の先に検問扉があるわ。敵に出くわすかもしれないから、気をつけて。', { f: 'serious', g: 'point', face: { yue: 'exit' }, look: { yue: 'exit', mizore: 'exit' }, r: { mizore: 'serious' } }],
  ] },
  c1_01b: { bg: 'station', title: '襲撃', cast: ['e:scout'], lines: [
    ['n', 'カプセルの列を抜け、南の通路へ。検問扉の手前で、赤い光を放つ影が通路をふさぐように群れている。', { cam: 'wide', dur: 7, look: { all: 'e:scout' }, r: { all: 'serious' } }],
    ['yue', '見つかったわ……！ 反物質軍団の斥候よ。', { f: 'serious', g: 'point', look: { yue: 'e:scout' }, stance: { yue: 'guardStaff' } }],
    ['e:scout', '――――！！', { shake: 0.25 }],
    ['mizore', '大丈夫、あたしが守ってあげる！ ……って、え？ そのバット、どこから出したの？', { f: 'joy', g: 'fist', stance: { mizore: 'mzGuard' }, later: [2.0, { weapon: { aster: true }, r: { mizore: ['surprise', 'recoil'], aster: 'surprise' }, look: { mizore: 'aster' } }] }],
    { c: [
      ['体が、勝手に動く。', [['yue', '……戦い方を覚えているのね。頼りにさせてもらうわ。', { f: 'gentle', g: 'nod' }]], { f: 'serious', stance: { aster: 'ready' }, look: { aster: 'e:scout' } }],
      ['なんとなく持ってた。', [['mizore', 'なんとなく！？ あはは、でも頼もしい！', { f: 'joy', g: 'laugh' }]], { f: 'neutral', g: 'shrug' }],
    ] },
    ['yue', '来るわ。構えて！', { f: 'angry', stance: { all: 'ready' }, look: { all: 'e:scout' }, face: { all: 'e:scout' }, r: { all: 'serious' }, cam: 'hero', dur: 6 }],
  ] },
  c1_02: { bg: 'station', title: '研究員イリス', lines: [
    ['n', '検問を抜けた先の吹き抜けのホール。上の回廊の奥にある医務室で、端末の陰から白衣の女性がおそるおそる顔を出した。', { cam: 'wide', dur: 7, look: { all: 'iris' }, r: { iris: 'worry', mizore: 'surprise' }, later: [1.8, { stance: { iris: 'polite' }, look: { iris: 'aster' } }] }],
    ['iris', '……助かったわ。あなたたち、星海列車の乗員ね？', { f: 'worry', g: 'handChest', move: { iris: [[0.2, 4.6], [-0.3, 3.4]] }, look: { iris: 'yue' } }],
    ['yue', 'ええ。ノクターン号のユエと、ミゾレ。そしてこちらは——', { f: 'smile', g: 'present', to: 'iris', r: { mizore: ['smile', 'wave'] } }],
    { c: [
      ['アステル。さっき目覚めたばかり。', [['iris', '……カプセルの少女。まさか、あの被験体が目覚めたなんて。', { f: 'surprise', g: 'recoil', to: 'aster' }]], { f: 'neutral', g: 'nod', to: 'iris' }],
      ['あなたは？', [['iris', 'ヘリオスの主任研究員、イリスよ。……あなた、あのカプセルの中にいた子ね。', { f: 'serious', g: 'think', to: 'aster' }]], { f: 'neutral', g: 'tilt', to: 'iris' }],
    ] },
    ['mizore', '被験体……？', { f: 'worry', g: 'tilt', to: 'iris', r: { aster: 'worry', yue: 'serious' } }],
    ['iris', '詳しい話は後にさせて。今はステーション中枢の星核が暴走しかけているの。', { f: 'serious', g: 'shake', to: 'yue' }],
    ['iris', '物資保管庫に、中枢を封鎖するための緊急制御キーがあるはず。下のホールから西の通路を抜けた先よ。キーは上の階の保管棚C-7にあるわ。取ってきてもらえる？', { f: 'worry', g: 'point', face: { iris: 'storage' }, look: { iris: 'storage' }, later: [2.4, { face: { iris: 'yue' }, look: { iris: 'yue' } }] }],
    ['yue', '引き受けましょう。星核を追うのが、私たちの旅だから。', { f: 'gentle', g: 'handChest', to: 'iris', r: { mizore: ['joy', 'fist'], iris: 'smile' } }],
    ['n', '【任務】中央ホールの西の通路から物資保管庫へ。上の階の保管棚C-7を調べよう。', { cam: 'wide', dur: 6, look: { all: 'door' } }],
  ] },
  c1_03: { bg: 'station', title: '物資保管庫', cast: ['e:drone', 'e:plunderer'], lines: [
    ['n', 'コンテナの並ぶ倉庫を見下ろす、上の階の保管棚ギャラリー。C-7と記された棚の奥で、青い光が明滅している。', { cam: 'rack', dur: 6, drift: 0.2, look: { all: 'key' }, hold: { mizore: 'key' }, r: { mizore: 'surprise' } }],
    ['mizore', 'キー、見っけ！ ……って、なんか後ろにいっぱい来てる！', { f: 'joy', g: 'raise', to: 'aster', face: { mizore: 'aster' },
      later: [1.7, { enter: ['e:drone', 'e:plunderer'], r: { all: ['surprise', 'recoil'] }, look: { all: 'e:plunderer' }, face: { mizore: 'e:drone' }, cam: 'wide' }] }],
    ['yue', '待ち伏せね。アステル、構えて。', { f: 'serious', stance: { all: 'ready' }, look: { all: 'e:plunderer', yue: 'aster' }, face: { all: 'e:drone' } }],
    { c: [
      ['任せて。', [['mizore', 'よーし、一気に片付けちゃおう！', { f: 'joy', g: 'fist', look: { mizore: 'e:drone' } }]], { f: 'serious', g: 'nod' }],
      ['数が多い……！', [['yue', '大丈夫。あなたは一人じゃないわ。', { f: 'gentle', to: 'aster' }]], { f: 'worry' }],
    ] },
  ] },
  c1_04: { bg: 'station', title: '風の刺客', lines: [
    ['n', '戦いが終わった瞬間、一陣の風が吹き抜けた。', { enter: 'kazane', move: { kazane: [[-4.4, 0.6], [-2.3, 1.0]] }, speed: 7, look: { all: 'kazane' }, r: { all: 'surprise' }, cam: 'wide', dur: 6 }],
    ['kazane', '……遅い。その程度で星核に近づくつもりか。', '？？？', { f: 'serious', g: 'tilt', to: 'aster', face: { kazane: 'aster' } }],
    ['mizore', 'わっ、誰！？', { f: 'surprise', g: 'recoil', to: 'kazane' }],
    ['kazane', 'カザネ。星核を狩る者だ。お前たちが列車の連中か。', { f: 'serious', g: 'tilt', to: 'yue' }],
    ['yue', 'あなたも星核を追っているのね。目的が同じなら、手を組まない？', { f: 'gentle', g: 'offer', to: 'kazane' }],
    ['kazane', '……足手まといでなければな。', { f: 'serious', g: 'turnAway' }],
    { c: [
      ['よろしく、カザネ。', [['kazane', '……フン。', { f: 'serious', g: 'turnAway', r: { mizore: 'smile' } }]], { f: 'smile', g: 'nod', to: 'kazane' }],
      ['素直じゃないね。', [['mizore', 'あはは、同感！', { f: 'joy', g: 'laugh' }], ['kazane', '……。', { f: 'angry', g: 'pout' }]], { f: 'smile', to: 'kazane' }],
    ] },
    { give: 'kazane' },
    ['iris', '（通信）みんな、聞こえる？ 主制御区画が占拠されてる。そこを取り戻せば、動力炉までの道が開けるわ。', 'イリス', { f: 'worry', g: 'explain', r: { all: 'serious' } }],
    ['yue', '主制御区画へは、収容区画の南の回廊にあるステーション・エレベーターで行けるわね。行きましょう。', { f: 'serious', g: 'nod', to: 'aster', r: { mizore: ['smile', 'fist'] } }],
  ] },
  c1_04b: { bg: 'station', title: '主制御区画', cast: ['e:knight'], lines: [
    ['n', 'エレベーターの扉が開くと、ロビーの先に掘り下げた中央管制室が見えた。ホロテーブルを囲む制御卓の光は赤く染まり、反物質軍団の兵たちが区画を埋め尽くしている。', { cam: 'wide', dur: 8, look: { all: 'e:knight' }, r: { all: 'serious' } }],
    ['iris', '（通信）そこが主制御区画よ。制御卓を取り戻せば、東の通路の先、動力炉への隔壁を開けられるわ。', 'イリス', { f: 'serious', g: 'explain' }],
    ['kazane', '数だけは多いな。', { f: 'serious', g: 'tilt', look: { kazane: 'e:knight' }, stance: { kazane: 'ready' } }],
    ['mizore', 'カザネ、さっそく腕の見せどころだよ！', { f: 'joy', g: 'fist', to: 'kazane' }],
    { c: [
      ['一気に行こう。', [['kazane', '……悪くない。', { f: 'smile', g: 'nod' }]], { f: 'serious', g: 'fist' }],
      ['カザネ、背中は任せた。', [['kazane', '……勝手にしろ。前だけ見ていろ。', { f: 'serious', g: 'turnAway' }]], { f: 'smile', to: 'kazane' }],
    ] },
    ['e:knight', '――――！', { shake: 0.3 }],
    ['yue', '気づかれたわ。行くわよ！', { f: 'angry', stance: { all: 'ready' }, look: { all: 'e:knight' }, face: { all: 'e:knight' }, r: { all: 'serious' }, cam: 'hero', dur: 6 }],
  ] },
  c1_05: { bg: 'station', title: '動力炉の前で', cast: ['e:golem'], lines: [
    ['iris', '（通信）炉へ入る前室に巨大な反応……鋼鉄の巨像よ。気をつけて。', { f: 'worry', g: 'explain', look: { all: 'e:golem' }, later: [1.4, { roar: 'e:golem', shake: 0.3, cam: 'foe:e:golem', r: { all: 'surprise' } }] }],
    ['iris', '（通信）巨像を退けたら、炉の底へ降りて。炉心の足もとにある制御端末に緊急制御キーを差し込むの。昇降機か階段で降りられるわ。炉を止めれば、星核への供給を断てるはずよ。', { f: 'serious', g: 'explain' }],
    ['kazane', '図体ばかりの木偶だ。弱点は炎と雷、それに量子。', { f: 'serious', g: 'point', look: { kazane: 'e:golem' }, face: { kazane: 'e:golem' } }],
    ['mizore', 'えっ、分析早くない？', { f: 'surprise', g: 'surprise', to: 'kazane' }],
    ['kazane', '狩りの基本だ。……行くぞ。', { f: 'serious', stance: { all: 'ready' }, look: { all: 'e:golem' }, face: { all: 'e:golem' }, later: [0.8, { roar: 'e:golem', shake: 0.35 }], cam: 'hero', dur: 6 }],
  ] },
  c1_05b: { bg: 'station', title: '緊急停止', lines: [
    ['n', 'キャットウォークから炉の底へ。脈打つ炉心の足もとで、制御端末が赤い警告を点滅させ続けている。', { cam: 'core', dur: 8, look: { all: 'core' } }],
    ['iris', '（通信）その端末よ。緊急制御キーを差し込んで、停止コードを送って！', 'イリス', { f: 'serious', g: 'point' }],
    ['mizore', 'はい、アステル。キーはあなたが使って。……見つけたのはあたしだけどね！', { f: 'joy', g: 'give', to: 'aster', face: { mizore: 'aster' }, later: [1.5, { hold: { mizore: null, aster: 'key' }, r: { aster: 'smile' } }] }],
    { c: [
      ['……差し込むよ。', [['yue', 'ええ。お願い、アステル。', { f: 'gentle', g: 'nod', look: { yue: 'aster' } }]], { f: 'serious', face: { aster: 'terminal' }, move: { aster: [0, 1.5] }, look: { aster: 'terminal' }, later: [0.7, { r: { aster: [null, 'insert'] } }], cam: 'terminal', dur: 5 }],
      ['止まって……！', [['mizore', 'がんばれ、炉！ ……じゃなくて、アステル！', { f: 'joy', g: 'cheer', look: { mizore: 'aster' } }]], { f: 'pained', face: { aster: 'terminal' }, move: { aster: [0, 1.5] }, look: { aster: 'terminal' }, later: [0.7, { r: { aster: [null, 'insert'] } }], cam: 'terminal', dur: 5 }],
    ] },
    ['n', 'キーが回る。低く唸っていた炉がゆっくりと鼓動を止め、赤い光が引いていく。冷却管から白い蒸気が噴き出した。', { fx: 'reactorStop', sfx: 'shield', cam: 'core', dur: 8, look: { all: 'core' }, hold: { aster: null }, r: { all: 'surprise' } }],
    ['iris', '（通信）動力炉の停止を確認……！ これで星核への供給は断たれたわ。', 'イリス', { f: 'smile', g: 'handChest', r: { mizore: ['joy', 'cheer'], yue: 'smile', aster: 'smile' } }],
    ['iris', '（通信）……待って。星核の出力が下がらない。炉なしで、自分で脈打ってる……？', 'イリス', { f: 'surprise', g: 'think', r: { all: 'worry' } }],
    ['n', '重い駆動音。炉の底の北、固く閉ざされていた星核の間への隔壁が、ひとりでに開いていく。', { fx: 'open:n', shake: 0.35, cam: 'bulkhead', dur: 8, look: { all: 'bulkhead' }, r: { all: 'surprise' } }],
    ['kazane', '……招かれているな。獲物のほうから。', { f: 'serious', g: 'tilt', look: { kazane: 'bulkhead' } }],
    ['yue', '封鎖するには、星核の間に踏み込むしかなさそうね。', { f: 'serious', g: 'handChest' }],
    ['iris', '（通信）ごめんなさい、ここから先は私にもわからない。……気をつけて。', 'イリス', { f: 'sad', g: 'lookDown', r: { all: 'serious' } }],
    ['n', '【任務】炉の底から北へ。開いた隔壁の先にある星核の間へ向かおう。', { cam: 'wide', dur: 7, look: { all: 'bulkhead' }, face: { all: 'bulkhead' } }],
  ] },
  c1_06: { bg: 'station', title: '星核の間', cast: ['e:boss_core'], lines: [
    ['n', '隔壁の先、星核の間。大階段を上り、深淵に架かる橋を渡ると、壇の上で紅い光が脈打っていた。炉が止まってもなお、その光は空間そのものを歪ませている。', { cam: 'core', dur: 8, look: { all: 'core' }, r: { all: 'surprise' } }],
    ['yue', 'これが……星核。', { f: 'surprise', g: 'lookUp', look: { yue: 'core' } }],
    ['n', 'アステルの胸の奥が、呼応するように熱を帯びる。', { fx: 'glow:aster', cam: 'aster', close: true, dur: 6, r: { aster: ['pained', 'handChest'] } }],
    ['mizore', 'アステル？ 顔色悪いよ……。', { f: 'worry', g: 'offer', to: 'aster', move: { mizore: [0.75, 0.25] } }],
    { c: [
      ['星核が、呼んでる気がする。', [['yue', '……やはり、あなたは。', { f: 'serious', g: 'lookDown' }], ['kazane', '話は後だ。来るぞ。', { f: 'serious', stance: { kazane: 'ready' }, look: { kazane: 'core' } }]], { f: 'serious', look: { aster: 'core' } }],
      ['平気。行こう。', [['mizore', 'うん……無理しないでね。', { f: 'worry', g: 'nod' }]], { f: 'smile', g: 'nod' }],
    ] },
    ['e:boss_core', '――――――！！', { enter: 'e:boss_core', shake: 0.6, flash: '#ff3040', look: { all: 'e:boss_core' }, face: { all: 'e:boss_core' }, r: { all: 'surprise' } }],
    ['n', '星核の番人が目を覚ました！', { stance: { all: 'ready' }, r: { all: 'angry' }, cam: 'hero', dur: 6 }],
  ] },
  c1_06b: { bg: 'station', title: '鎮まる星核', lines: [
    ['n', '星核の番人が崩れ落ち、紅い光の粒となって消えていく。', { defeat: 'e:boss_core', cam: 'foe:e:boss_core', dur: 6, look: { all: 'e:boss_core' } }],
    ['mizore', 'や、やった……？ やったよね！？', { f: 'joy', g: 'cheer', stance: { mizore: 'idle' }, to: 'aster' }],
    ['kazane', '……ああ。仕留めた。', { f: 'serious', stance: { kazane: 'armsCrossed', aster: 'idle', yue: 'polite' } }],
    ['n', 'だが壇の上の星核は、なおも激しく脈打っている。床の導管を走る光が、再び強まりはじめた。', { fx: 'coreSurge', shake: 0.4, cam: 'core', dur: 7, look: { all: 'core' }, r: { all: 'surprise' } }],
    ['iris', '（通信）星核の出力がまた上昇してる……！ このままじゃ、ステーションごと——', 'イリス', { f: 'surprise', g: 'bothChest' }],
    ['yue', '封印容器を使うわ。でも、この出力では近づくことも……。', { f: 'worry', g: 'give', hold: { yue: 'container' }, look: { yue: 'core' } }],
    ['n', 'そのとき、アステルの胸の奥が熱を帯びた。星核の鼓動と、自分の鼓動が重なっていく。', { fx: 'glow:aster', cam: 'aster', close: true, dur: 6, r: { aster: ['pained', 'handChest'] }, look: { aster: 'core' } }],
    { c: [
      ['……大丈夫。もう、暴れなくていいよ。', [['n', 'アステルが手を伸ばすと、荒れ狂っていた星核の光がふっと和らいだ。', { fx: 'coreCalm', cam: 'reach', dur: 8, r: { aster: [null, 'reach'] } }]], { f: 'gentle', move: { aster: [0, 1.8] }, face: { aster: 'core' }, look: { aster: 'core' }, cam: 'reach', dur: 6 }],
      ['……静かに。', [['n', '指先が触れた瞬間、星核の光が嘘のように鎮まった。', { fx: 'coreCalm', cam: 'reach', dur: 8, r: { aster: [null, 'reach'] } }]], { f: 'serious', move: { aster: [0, 1.8] }, face: { aster: 'core' }, look: { aster: 'core' }, cam: 'reach', dur: 6 }],
    ] },
    ['yue', '……今よ。', { f: 'serious', g: 'raise', move: { yue: [-0.8, 1.5] }, look: { yue: 'core' }, face: { yue: 'core' } }],
    ['n', 'ユエの掲げた封印容器に、星核の光が吸い込まれていく。紅く染まっていた間に、静けさが戻った。', { fx: 'coreSeal:yue', cam: 'seal', dur: 8, r: { yue: [null, 'raise'] }, look: { all: 'core' } }],
    ['iris', '（通信）……出力、ゼロ。星核の反応は完全に封じられたわ。ステーションは、助かった……！', 'イリス', { f: 'joy', g: 'bothChest', r: { mizore: 'joy', yue: 'gentle' } }],
    ['mizore', 'アステル、今の何！？ 星核がおとなしくなっちゃった！', { f: 'surprise', g: 'surprise', to: 'aster', move: { mizore: [0.8, 1.3] }, face: { aster: 'mizore' } }],
    { c: [
      ['わからない。……でも、懐かしい感じがした。', [['yue', '……そう。', { f: 'gentle', g: 'nod' }]], { f: 'gentle', g: 'handChest' }],
      ['体が、勝手に動いただけ。', [['kazane', '……また「勝手に」か。妙な奴だ。', { f: 'smile', g: 'turnAway' }]], { f: 'neutral', g: 'shrug' }],
    ] },
    ['iris', '（通信）アステル……あなたのことは、いつか必ず話すわ。今はただ、ありがとう。', 'イリス', { f: 'gentle', g: 'bow' }],
    ['yue', '列車に戻りましょう。ポルカが待っているわ。', { f: 'smile', g: 'nod', to: 'aster' }],
    ['mizore', 'うん！ アステルも一緒にね！', { f: 'joy', g: 'cheer', to: 'aster' }],
  ] },
  c1_07: { bg: 'space', title: '星海列車', lines: [
    ['polka', 'おかえりなさいませ！ 星海列車ノクターン号へようこそ、アステルさま！', { f: 'joy', g: 'bow', to: 'aster', later: [1.1, { r: { polka: [null, 'wave'] } }] }],
    ['mizore', '紹介するね、車掌のポルカちゃん！', { f: 'joy', g: 'present', to: 'aster' }],
    ['polka', 'ちゃん付けはおやめくださいと何度も……コホン。星核の回収、お見事でございました。', { f: 'angry', g: 'pout', to: 'mizore', later: [2.4, { r: { polka: ['smile', 'bow'] }, look: { polka: 'aster' } }] }],
    ['yue', 'アステル。さっき星核が鎮まったのは、偶然じゃないわ。あなたの体には、星核と同じ波長の「何か」がある。', { f: 'serious', g: 'handChest', to: 'aster', face: { yue: 'aster' } }],
    ['yue', 'その正体を知るために——私たちと一緒に旅をしない？', { f: 'gentle', g: 'offer', to: 'aster' }],
    { c: [
      ['一緒に行く。', [['mizore', 'やったー！ 今日からよろしくね、アステル！', { f: 'joy', g: 'cheer' }]], { f: 'smile', g: 'nod' }],
      ['行く当てもないしね。', [['kazane', '……ついでに俺も乗る。星核の匂いがする場所には、獲物がいるからな。', { f: 'smile', g: 'turnAway' }]], { f: 'smile', g: 'shrug' }],
    ] },
    ['polka', 'では——次の停車駅は、永久凍土の都ベロワ！ 出発進行でございます！', { f: 'joy', g: 'point', face: { polka: 'train' }, look: { all: 'train' }, r: { mizore: ['joy', 'cheer'] }, cam: 'depart', dur: 7 }],
    ['n', '第一章「目覚めの星」　完', { cam: 'depart', dur: 8, drift: 0.6, r: { all: 'smile' } }],
  ] },

  // ---------------- 第二章 ----------------
  c2_01: { bg: 'snow', title: '終わらない冬', lines: [
    ['n', '列車が停まったのは、終わらない冬に閉ざされた城塞都市だった。', { cam: 'arrive', dur: 8, drift: 0.5, look: { all: 'valley' }, later: [0.6, { move: { roa: [[-0.8, 6], [-0.4, 3.4]] }, speed: 1.6 }] }],
    ['mizore', 'さっむーい！ でも雪って、なんかワクワクする！', { f: 'joy', g: 'bothChest', face: { mizore: 'valley' }, look: { mizore: 'valley' }, r: { yue: 'smile' }, later: [1.4, { r: { mizore: [null, 'hop'] } }] }],
    ['roa', '……旅人か。悪いことは言わない。すぐにこの街を去れ。', { f: 'serious', g: 'shake', to: 'yue', cam: 'wide', dur: 7, move: { roa: [-0.4, 3.4] }, speed: 2.4, face: { aster: 'roa', mizore: 'roa', yue: 'roa', kazane: 'roa' }, r: { mizore: ['surprise', 'recoil'], kazane: 'serious' } }],
    ['yue', 'あなたは？', { f: 'neutral', g: 'tilt', to: 'roa' }],
    ['roa', 'ロア。この街のレジスタンスを率いている。女帝が星核を手にしてから、ベロワの冬は終わらなくなった。', { f: 'serious', g: 'explain', later: [2.6, { look: { roa: 'gate', mizore: 'gate' }, r: { roa: ['sad', 'lookDown'] } }] }],
    { c: [
      ['私たちが星核を止める。', [['roa', '……本気か。なら、まずは腕を見せてもらおう。外縁の獣どもが、街を狙っている。', { f: 'surprise', g: 'tilt', face: { roa: 'aster' }, look: { roa: 'aster' }, later: [2.2, { r: { roa: ['serious', 'point'] }, face: { roa: 'valley' }, look: { all: 'valley' }, cam: 'wide', dur: 5 }] }]], { f: 'serious', g: 'fist', to: 'roa' }],
      ['女帝って？', [['roa', 'かつては民を守る優しい統治者だった。今は……氷の刃そのものだ。', { f: 'sad', g: 'lookDown', face: { roa: 'aster' }, look: { roa: 'aster' }, r: { yue: 'worry' } }], ['roa', 'まずは外縁の獣を片付けるのを手伝ってくれ。', { f: 'serious', g: 'point', face: { roa: 'valley' }, look: { all: 'valley' }, cam: 'wide', dur: 6 }]], { f: 'neutral', g: 'tilt', to: 'roa' }],
    ] },
    ['roa', '腕が確かなら、街を案内しよう。谷の西の高台に東門がある。行政区を抜けて、北の大通りの門の先が凍てついた街路だ。', { f: 'serious', g: 'point', face: { roa: 'gate' }, look: { all: 'gate' }, r: { kazane: ['serious', 'nod'], mizore: ['joy', 'fist'] }, cam: 'look:gate', dur: 5, later: [3.2, { cam: 'wide', dur: 6 }] }],
  ] },
  c2_02: { bg: 'snow', title: '紫電の賞金稼ぎ', lines: [
    ['roa', 'ここが凍てついた街路だ。この先は女帝の兵で溢れている。気を抜くな。', { f: 'serious', g: 'point', face: { roa: 'stair' }, look: { all: 'stair' }, cam: 'wide', dur: 7, later: [2.4, { face: { roa: 'aster' }, look: { roa: 'aster' } }] }],
    ['kazane', '……誰かに見られている。', { f: 'serious', g: 'tilt', face: { kazane: 'roof' }, look: { kazane: 'roof' }, r: { mizore: 'worry', yue: 'serious' } }],
    ['n', '屋根の上に、紫電をまとう影。', { enter: 'laika', sfx: 'zap', cam: 'roofUp', dur: 6, look: { all: 'laika' }, r: { all: 'surprise', mizore: ['surprise', 'recoil'] } }],
    ['laika', 'へぇ、面白い連中だね。あたしはライカ。しがない賞金稼ぎさ。', '？？？', { f: 'smile', g: 'wave', to: 'aster', cam: 'laika', dur: 5, later: [2.8, { lift: { laika: 0 }, move: { laika: [3.2, 3.2] }, speed: 20, look: { all: 'laika' }, cam: 'wide', dur: 5 }] }],
    ['laika', '女帝の首には莫大な懸賞金がかかってる。邪魔はしないでよ？', { f: 'smile', g: 'shrug', to: 'roa', r: { roa: 'angry' } }],
    { c: [
      ['目的は星核だけ。', [['laika', 'なら利害は一致だ。しばらく付き合ってあげる。', { f: 'smile', g: 'nod', to: 'aster' }]], { f: 'serious', to: 'laika' }],
      ['一緒に戦わない？', [['laika', 'あはは、ストレートだね。いいよ、退屈しなさそうだし。', { f: 'joy', g: 'laugh', to: 'aster', r: { mizore: 'smile' } }]], { f: 'smile', g: 'offer', to: 'laika' }],
    ] },
    ['roa', 'この街路の東の坑口から地下鉱区へ入れる。鉱区昇降機で深層まで降り、北坑道から城塞の裏へ回り込むぞ。', { f: 'serious', g: 'point', face: { roa: 'mine' }, look: { all: 'mine' }, r: { mizore: ['smile', 'nod'], laika: [null, 'shrug'] }, cam: 'wide', dur: 6 }],
  ] },
  c2_03: { bg: 'snow', title: '地下鉱区', lines: [
    ['roa', 'この鉱区は、女帝がまだ優しかった頃、民の暮らしのために開放した場所だ。', { f: 'sad', g: 'explain', face: { roa: 'vein' }, look: { all: 'vein' }, cam: 'vein', dur: 8 }],
    ['yue', '……彼女を救う方法は、あるのかしら。', { f: 'worry', g: 'handChest', to: 'roa' }],
    ['roa', '星核さえ引き剥がせば、あるいは。', { f: 'serious', g: 'lookDown', face: { roa: 'yue' } }],
    ['mizore', 'なら、絶対に取り戻そう！', { f: 'joy', g: 'fist', to: 'roa', r: { laika: ['smile', 'shrug'] } }],
    { c: [
      ['必ず救い出す。', [['roa', '……ありがとう。お前たちに賭けてみよう。', { f: 'gentle', g: 'nod', to: 'aster' }]], { f: 'serious', g: 'handChest', to: 'roa' }],
      ['まずは道を開こう。', [['kazane', '同感だ。敵の気配が近い。', { f: 'serious', g: 'tilt', face: { kazane: 'north' }, look: { kazane: 'north' }, stance: { kazane: 'ready' } }]], { f: 'serious', g: 'nod', to: 'roa' }],
    ] },
    ['roa', 'この縦穴の北の岩棚から北坑道へ抜けられる。坑道の出口は城塞の門の脇だ。大通りの検問を通らずに済むはずだ。', { f: 'serious', g: 'point', face: { roa: 'north' }, look: { all: 'north' }, cam: 'shaft', dur: 7 }],
  ] },
  c2_04: { bg: 'snow', title: '城塞の門', lines: [
    ['roa', '……抜けたな。ここは門の東側、見張りの死角だ。', { f: 'serious', g: 'nod', cam: 'wide', dur: 7, look: { all: 'gate', roa: 'aster' } }],
    ['laika', '門の守りは固いよ。鋼鉄の巨像が二体、それに騎士が一体。', { f: 'serious', g: 'point', face: { laika: 'golems' }, look: { all: 'golems' }, cam: 'gate', dur: 7 }],
    ['kazane', '正面から叩き潰す。', { f: 'serious', g: 'fist', stance: { kazane: 'ready' }, to: 'laika' }],
    ['laika', '話が早い。嫌いじゃないよ、そういうの。', { f: 'joy', g: 'laugh', to: 'kazane' }],
    ['roa', '門さえ破れば宮殿の大広間だ。肖像の回廊と庭園を抜けた先に玉座の間がある。陛下はその奥だ。', { f: 'serious', g: 'explain', later: [2.2, { face: { roa: 'gate' }, look: { roa: 'gate' }, r: { roa: [null, 'point'] }, cam: 'gate', dur: 6 }] }],
    ['yue', '無茶はしないで。……アステル、合図をお願い。', { f: 'gentle', g: 'handChest', to: 'aster' }],
    { c: [['行こう！', [['mizore', 'おー！', { f: 'joy', g: 'cheer', cam: 'hero', dur: 6 }]], { f: 'serious', g: 'fist', stance: { all: 'ready' }, face: { all: 'gate' }, look: { all: 'gate' } }]] },
  ] },
  c2_05: { bg: 'snow', title: '氷晶の玉座', cast: ['e:boss_empress'], lines: [
    ['n', '凍てついた庭園を抜け、氷の回廊の果て、玉座の間。凍りついた時の中心に、女帝は座していた。', { cam: 'throne', dur: 8, look: { all: 'e:boss_empress' }, r: { all: 'serious' } }],
    ['e:boss_empress', '……また、私から何かを奪いに来たのか。', { shake: 0.2 }],
    ['roa', '陛下！ 目を覚ましてください！ ロアです！', { f: 'worry', g: 'reach', move: { roa: [-0.3, 4.4] }, speed: 3, to: 'e:boss_empress', r: { mizore: 'worry', yue: 'worry' } }],
    { c: [
      ['あなたを救いに来た。', [['e:boss_empress', '救い……？ そんなもの、この冬がすべて凍らせた。', { shake: 0.25 }]], { f: 'serious', g: 'handChest', to: 'e:boss_empress' }],
      ['星核を渡して。', [['e:boss_empress', 'これは私の力だ。二度と、誰にも奪わせはしない。', { shake: 0.3 }]], { f: 'serious', g: 'offer', to: 'e:boss_empress' }],
    ] },
    ['n', '女帝が立ち上がる。吹雪が、刃となって渦を巻いた！', { fx: 'blizzard', roar: 'e:boss_empress', shake: 0.5, flash: '#bfeaff', stance: { all: 'ready' }, face: { all: 'e:boss_empress' }, look: { all: 'e:boss_empress' }, r: { all: 'angry', roa: ['sad', 'recoil'] }, move: { roa: [-1.2, 1.6] }, speed: 4, cam: 'throne', dur: 4, later: [2.4, { cam: 'hero', dur: 6 }] }],
  ] },
  c2_06: { bg: 'snow', title: '雪解け', lines: [
    ['n', '星核が砕け、玉座を覆う氷がゆっくりと溶けていく。', { fx: 'thaw', sfx: 'shield', cam: 'throne', dur: 8, look: { all: 'core' }, r: { all: 'surprise' } }],
    ['roa', '陛下……！', { f: 'worry', g: 'reach', move: { roa: [[-0.8, 5.5], [-0.8, 9.6]] }, speed: 3.2, to: 'e:boss_empress', look: { all: 'e:boss_empress' }, cam: 'wide', dur: 6, later: [3.4, { stance: { roa: 'kneel' }, face: { roa: 'e:boss_empress' } }] }],
    ['n', '「……長い夢を見ていたようだ。ロア、民は……」', '女帝', { cam: 'reunion', dur: 8, look: { all: 'e:boss_empress' }, r: { roa: 'sad', mizore: 'worry' } }],
    ['roa', '皆、待っています。春を。', { f: 'gentle', g: 'handChest', stance: { roa: 'kneel' }, to: 'e:boss_empress', r: { yue: 'gentle', mizore: 'smile' } }],
    ['laika', '懸賞金はパーだね。ま、いいか。……ねえアステル、次の駅にもついてっていい？', { f: 'smile', g: 'shrug', to: 'aster', face: { aster: 'laika' }, stance: { aster: 'idle', mizore: 'idle', yue: 'polite', kazane: 'armsCrossed' } }],
    { c: [
      ['もちろん。', [['laika', '決まり！ 退屈させないでよね。', { f: 'joy', g: 'fist', r: { mizore: ['joy', 'cheer'] } }]], { f: 'smile', g: 'nod', to: 'laika' }],
      ['賞金は出ないよ？', [['laika', 'あはは、それ以上に面白いものが見られそうだからね。', { f: 'joy', g: 'laugh', r: { kazane: ['smile', 'turnAway'] } }]], { f: 'smile', g: 'tilt', to: 'laika' }],
    ] },
    ['polka', '（通信）皆さま、次の停車駅は、雲海の仙舟ホウライでございます！', 'ポルカ', { f: 'joy', g: 'bow', r: { mizore: ['joy', 'cheer'], yue: 'smile', laika: 'smile' } }],
    ['n', '第二章「凍てつく玉座」　完', { cam: 'window', dur: 9, drift: 0.6, r: { all: 'smile' } }],
  ] },

  // ---------------- 第三章 ----------------
  c3_01: { bg: 'xian', title: '雲海の方舟', lines: [
    ['n', '雲の海を往く巨大な方舟、仙舟ホウライ。'],
    ['sougen', '星海列車の方々か。仙舟を預かる将軍、ソウゲンと申す。'],
    ['sougen', '近く、月蝕が訪れる。その夜、封じられた古の龍が目覚めるという予言がある。'],
    ['homura', '予言じゃなくて観測結果よ、将軍。龍の封印に星核が使われていて、それが暴走しかけてるの。'],
    ['mizore', 'えっと、あなたは？'],
    ['homura', 'ホムラ。丹鼎司の学士よ。専門は……火薬。'],
    { c: [
      ['火薬……。', [['homura', 'そこに食いつくの？ あなたとは気が合いそうね。']]],
      ['力を貸してほしい。', [['homura', 'ええ、最初からそのつもり。']]],
    ] },
    ['sougen', 'まずは渡し場に湧いた炎霊を鎮めてほしい。民が避難できずにいる。'],
  ] },
  c3_02: { bg: 'xian', title: '丹鼎司', lines: [
    ['homura', '見て。封印の術式が、内側から焼き切られてる。'],
    ['yue', '星核が、龍を呼び覚まそうとしている……？'],
    ['homura', '逆よ。龍が星核を喰らおうとしてるの。'],
    ['kazane', 'どちらでも同じだ。斬ればいい。'],
    ['homura', '乱暴ね。……でも、嫌いじゃないわ。'],
  ] },
  c3_03: { bg: 'xian', title: '雲騎の演武場', lines: [
    ['sougen', '雲騎軍が演武場で足止めを食らっている。援護を頼めるか。'],
    ['laika', '任せて。ちょうどひと暴れしたかったところ。'],
    { c: [
      ['すぐに向かう。', [['sougen', 'かたじけない。']]],
      ['将軍は？', [['sougen', '私は封印の維持に回る。……月蝕まで、時間がない。']]],
    ] },
  ] },
  c3_04: { bg: 'xian', title: '月蝕', lines: [
    ['n', '空が欠けていく。月蝕が始まった。'],
    ['sougen', '……間に合わなかったか。'],
    ['homura', 'まだよ。鱗淵境を抜けて祭壇で龍を止めれば、仙舟は落ちない。'],
    ['mizore', 'だったら、急ごう！'],
  ] },
  c3_05: { bg: 'xian', title: '蝕月の祭壇', cast: ['e:boss_dragon'], lines: [
    ['n', '祭壇の上。月を喰らう龍が、雲海を震わせて咆哮する。'],
    ['e:boss_dragon', '――――――――！！'],
    ['sougen', '仙舟の民に代わり、礼を言う。……頼んだぞ、星の旅人たち。'],
    { c: [
      ['必ず止める。', [['homura', '行きましょう。花火の時間よ。']]],
      ['任せて。', [['laika', 'いいね、その顔。燃えてきた！']]],
    ] },
  ] },
  c3_06: { bg: 'xian', title: '雲海に還る', lines: [
    ['n', '龍は光の粒となって、雲海へと還っていった。'],
    ['homura', '星核の欠片、回収完了。……アステル、あなたの胸の光、また強くなってない？'],
    { c: [
      ['……感じる。全ての星核が、ひとつの場所を指してる。', [['yue', '星核の深淵。全ての星核が生まれた場所……。']]],
      ['気のせいだよ。', [['yue', '……いいえ。あなたの中の星核が、深淵を指しているわ。']]],
    ] },
    ['sougen', '深淵へ向かうのか。仙舟の星槎を貸そう。……無事を祈る。'],
    ['polka', '……次が、このレールの終点でございますね。'],
    ['n', '第三章「月蝕の龍」　完'],
  ] },

  // ---------------- 第四章 ----------------
  c4_01: { bg: 'abyss', title: 'レールの果て', lines: [
    ['n', 'レールの果て。星々の光さえ届かない、紅い深淵。'],
    ['ciel', 'ようこそ、星の旅人。ずっと、あなたを待っていたわ。', '？？？'],
    ['ciel', '私はシエル。星神アルケーを見張る者。そしてこちらは——'],
    ['nebula', 'ネビュラ。……アルケーは全ての星核を束ねて、この宇宙を「終わらせる」つもりよ。'],
    { c: [
      ['止めに来た。', [['nebula', 'そう。なら、同じ舟ね。']]],
      ['私は、何者なの？', [['ciel', 'あなたは、アルケーが最初に生み出した星核の「器」。'], ['ciel', 'けれど目覚めたあなたは、別の道を選んだ。……それが答えよ。']]],
    ] },
    ['kazane', '御託はいい。道を開けろ。'],
  ] },
  c4_02: { bg: 'abyss', title: '崩れた星図', lines: [
    ['vespa', 'ようやく会えた。こっちはずっと、ハッキングで道を開けて待ってたんだよ。', '？？？'],
    ['vespa', 'ヴェスパ。星図の管理AI……の、元・管理者ってとこ。'],
    ['vespa', 'この先の門のロック、あたしが外す。その間、守ってくれる？'],
    { c: [
      ['任せて。', [['vespa', '話が早くて助かる。じゃ、終わったらあたしも乗せてってよ。']]],
      ['信用していいの？', [['vespa', 'さあね。でも、アルケーを止めたいのは本当。']]],
    ] },
  ] },
  c4_03: { bg: 'abyss', title: '願い', lines: [
    ['vespa', 'ロック解除完了。……約束通り、仲間に入れてもらうよ。'],
    { give: 'vespa' },
    ['iris', '（通信）こちらヘリオス！ ……アステル、あなたのカプセルの記録を解析したわ。', 'イリス'],
    ['iris', 'あなたは確かにアルケーの器として作られた。でも、あなたを目覚めさせたのは——'],
    ['iris', '「誰かと旅をしたい」という、あなた自身の願いよ。'],
    { c: [
      ['……ありがとう、イリス。', [['mizore', 'ほらね。アステルはアステルだよ！']]],
      ['それなら、迷わない。', [['yue', 'ええ。行きましょう、最後の駅へ。']]],
    ] },
  ] },
  c4_04: { bg: 'abyss', title: '星神の座', cast: ['e:boss_final'], lines: [
    ['n', '星神の座。無数の星核が、終焉の光輪となって巡っている。'],
    ['e:boss_final', '還れ、我が器よ。旅は終わる。全ての星は、静寂へと還るのだ。'],
    { c: [
      ['旅は、終わらない。', [['e:boss_final', '……器が、意志を持つか。']]],
      ['私は、私だ。', [['e:boss_final', '愚かな。星は燃え尽きるために生まれるのだ。']]],
    ] },
    ['mizore', 'アステルはあたしたちの仲間！ 絶対に渡さない！'],
    ['yue', '行きましょう。——ここが、最後の停車駅よ。'],
  ] },
  c4_05: { bg: 'space', title: '次の停車駅', lines: [
    ['n', '光輪が砕け、深淵に星の光が満ちていく。'],
    ['polka', '……皆さま、本当にお疲れさまでございました。'],
    ['yue', 'アステル。これから、どうする？'],
    { c: [
      ['旅を続けよう。', [['mizore', 'うん！ まだ見てない星が、いっぱいあるもんね！']]],
      ['まずは、ゆっくり眠りたい。', [['kazane', '……同感だ。'], ['mizore', 'あはは、カザネが同意した！']]],
    ] },
    ['polka', 'では——次の停車駅は、まだ誰も知らない星でございます！ 出発進行！'],
    ['n', '銀河鉄路 ノクターン　完　— Thank you for playing —'],
  ] },
};

// ------------------------------------------------------------
//  任務の進行
// ------------------------------------------------------------
const STORY = [
  { title: '第一章　目覚めの星', steps: [
    { t: 'scene', id: 'c1_01', g: '謎の少女、目覚める' },
    { t: 'field', ci: 0, zone: 'c1_cryo', at: [7, 13.6], start: ['c1_cryo', 7.5, 2.8], scene: 'c1_01b', battle: '1-1', g: 'カプセルホールを出て、南の検問扉へ向かう' },
    { t: 'field', ci: 0, zone: 'c1_cryo', at: [27.5, 22], scene: 'c1_02', g: '吹き抜けの上の階へ上がり、医務室で生存者を探す' },
    { t: 'field', ci: 0, zone: 'c1_storage', at: [4, 12], scene: 'c1_03', battle: '1-2', g: '物資保管庫の上の階、保管棚C-7へ向かう' },
    { t: 'scene', id: 'c1_04', g: '風の刺客' },
    { t: 'field', ci: 0, zone: 'c1_control', at: [17.5, 17], scene: 'c1_04b', battle: '1-3', g: '主制御区画を奪還する' },
    { t: 'field', ci: 0, zone: 'c1_reactor', at: [9, 17], scene: 'c1_05', battle: '1-4', g: '動力炉への通路を調べる' },
    { t: 'field', ci: 0, zone: 'c1_reactor', at: [22.5, 24.5], scene: 'c1_05b', g: '炉の底へ降り、制御端末で緊急制御キーを使う' },
    { t: 'field', ci: 0, zone: 'c1_core', at: [12.5, 7], scene: 'c1_06', battle: '1-5', g: '開いた隔壁の先、星核の間へ向かう' },
    { t: 'scene', id: 'c1_06b', g: '星核を封じる' },
    { t: 'scene', id: 'c1_07', g: '星海列車へ' },
    { t: 'reward', jade: 300, g: '第一章 完' },
  ] },
  { title: '第二章　凍てつく玉座', steps: [
    { t: 'scene', id: 'c2_01', g: '終わらない冬の都' },
    { t: 'battle', stage: '2-1', g: '雪原の外縁で獣を退ける' },
    { t: 'field', ci: 1, zone: 'c2_street', at: [20, 38], scene: 'c2_02', battle: '2-2', g: 'ロアの案内で、行政区の北門から凍てついた街路へ向かう' },
    { t: 'field', ci: 1, zone: 'c2_mine_deep', at: [23, 25], scene: 'c2_03', battle: '2-3', g: '街路の東の坑口から地下鉱区へ入り、鉱区昇降機で深層の古い鉱脈へ向かう' },
    { t: 'field', ci: 1, zone: 'c2_gate', at: [46, 20], scene: 'c2_04', battle: '2-4', g: '深層の北の岩棚から北坑道を抜け、城塞の門の東側へ回り込む' },
    { t: 'field', ci: 1, zone: 'c2_palace', at: [20, 12], scene: 'c2_05', battle: '2-5', g: '大広間・肖像の回廊・凍てついた庭園を抜け、玉座の間へ向かう' },
    { t: 'scene', id: 'c2_06', g: '雪解け' },
    { t: 'reward', jade: 400, g: '第二章 完' },
  ] },
  { title: '第三章　月蝕の龍', steps: [
    { t: 'scene', id: 'c3_01', g: '雲海の方舟' },
    { t: 'battle', stage: '3-1', g: '渡し場の炎霊を鎮める' },
    { t: 'field', ci: 2, zone: 'c3_alchemy', at: [0, -7], scene: 'c3_02', battle: '3-2', g: '丹鼎司の研究所を訪ねる' },
    { t: 'scene', id: 'c3_03', g: '雲騎の演武場へ' },
    { t: 'battle', stage: '3-3', g: '演武場の雲騎軍を援護する' },
    { t: 'field', ci: 2, zone: 'c3_scale', at: [6, -8], scene: 'c3_04', battle: '3-4', g: '鱗淵境へ続く道を探す' },
    { t: 'scene', id: 'c3_05', g: '蝕月の祭壇へ' },
    { t: 'battle', stage: '3-5', g: '蝕月の龍を鎮める' },
    { t: 'scene', id: 'c3_06', g: '雲海に還る' },
    { t: 'reward', jade: 500, g: '第三章 完' },
  ] },
  { title: '第四章　終焉の星神', steps: [
    { t: 'scene', id: 'c4_01', g: 'レールの果て' },
    { t: 'battle', stage: '4-1', g: '虚無の回廊を進む' },
    { t: 'field', ci: 3, zone: 'c4_starmap', at: [0, 9], scene: 'c4_02', battle: '4-2', g: '崩れた星図の中心を調べる' },
    { t: 'scene', id: 'c4_03', g: '願い' },
    { t: 'battle', stage: '4-3', g: '終焉の門を越える' },
    { t: 'scene', id: 'c4_04', g: '星神の座へ' },
    { t: 'battle', stage: '4-4', g: '終焉の星神アルケーを倒す' },
    { t: 'scene', id: 'c4_05', g: '次の停車駅' },
    { t: 'reward', jade: 800, g: '第四章 完' },
  ] },
];

function speakerName(key) {
  if (key === 'n') return '';
  if (key.startsWith('e:')) return ENEMIES[key.slice(2)].name;
  return (CHARS[key] || NPCS[key]).name;
}

const Story = {
  get state() {
    if (!Save.data.story) Save.data.story = { ch: 0, step: 0, v: 6 };
    const s = Save.data.story;
    // v2：第二章の「紫電の賞金稼ぎ」と戦闘2-2を1つの探索任務にまとめたので、以降の段階を1つ詰める
    if (!s.v) { if (s.ch === 1 && s.step >= 3) s.step--; s.v = 2; }
    // v3：第二章の「氷晶の玉座」と戦闘2-5を、宮殿を歩く探索任務にまとめた
    if (s.v === 2) { if (s.ch === 1 && s.step >= 6) s.step--; s.v = 3; }
    // v4：第一章に、動力炉を緊急制御キーで止める探索任務（段階7）を挟んだ。星核の間を見終えていれば1つ送る
    if (s.v === 3) { if (s.ch === 0 && s.step >= 8) s.step++; s.v = 4; }
    // v5：第一章の「星核の間」と戦闘1-5を、星核の間を歩く探索任務にまとめた
    if (s.v === 4) { if (s.ch === 0 && s.step >= 9) s.step--; s.v = 5; }
    // v6：第一章の番人戦のあとに「鎮まる星核」（段階9）を挟んだ。第一章の報酬待ちなら1つ送る
    if (s.v === 5) { if (s.ch === 0 && s.step >= 10) s.step++; s.v = 6; }
    return s;
  },
  current() {
    const s = this.state, ch = STORY[s.ch];
    return ch && ch.steps[s.step] ? { ch, chIdx: s.ch, step: ch.steps[s.step] } : null;
  },
  done() { return !this.current(); },
  // シーンを見終えたか（そのシーンを含む段階が、現在の任務より前にある）
  seen(id) {
    const st = this.state;
    for (let ci = 0; ci < STORY.length; ci++) {
      const i = STORY[ci].steps.findIndex(x => x.id === id || x.scene === id);
      if (i >= 0) return ci < st.ch || (ci === st.ch && i < st.step);
    }
    return true;
  },
  advance() {
    const s = this.state;
    s.step++;
    if (s.step >= STORY[s.ch].steps.length) { s.ch++; s.step = 0; }
    Save.save();
  },
  progress(ci) {
    const s = this.state;
    if (s.ch > ci) return 1;
    if (s.ch < ci) return 0;
    return s.step / STORY[ci].steps.length;
  },
  // ステージが既にクリア済みなら戦闘を省略
  stageById(id) { return allStages().find(x => x.id === id); },
  battle(id, next) {
    if (Save.data.cleared[id]) { next(); return; }
    const st = this.stageById(id);
    startStage(st.ci, st, [], res => { if (res.win) next(); else App.go(StoryScreen); });
  },
  // 現在の任務を実行する
  run() {
    const cur = this.current();
    if (!cur) { App.go(StoryScreen); return; }
    const step = cur.step;
    const next = () => { this.advance(); this.run(); };
    switch (step.t) {
      case 'scene': App.go(DialogueScreen, step.id, next); break;
      case 'battle': this.battle(step.stage, next); break;
      case 'field': {
        // start：その章をまだ歩いていなければ、指定の区画・位置から探索を始める（目覚めた場所など）
        const r = Save.data.fieldResume;
        if (step.start && !(r && r.ci === step.ci)) {
          const [zone, sx, sz] = step.start, [x, z] = zonePoint(FIELD_ZONES[zone], [sx, sz]);
          Save.data.fieldResume = { ci: step.ci, zone, x, z, yaw: 0 };
        }
        App.go(FieldScreen, step.ci); break;
      }
      case 'reward': {
        Save.data.jade += step.jade; this.advance();
        App.go(ChapterClearScreen, cur.chIdx, step.jade);
        break;
      }
    }
  },
  // フィールドで目的地に着いた
  arrive() {
    const cur = this.current(); if (!cur || cur.step.t !== 'field') return;
    const step = cur.step;
    const next = () => { this.advance(); this.run(); };
    const fight = () => (step.battle ? this.battle(step.battle, next) : next());
    if (step.scene) App.go(DialogueScreen, step.scene, fight); else fight();
  },
};

// ============================================================
//  あらすじ：見終えたシーンの概要をテキストで振り返る
// ============================================================
const RECAP = {
  chapters: [
    'ヘリオス宇宙ステーション——冷凍睡眠から目覚めた少女アステルの旅が、ここから始まる。',
    '永久凍土の都ベロワ——星核を手にした女帝によって、終わらない冬に閉ざされた城塞都市。',
    '雲海の仙舟ホウライ——月蝕の夜、封じられた古の龍が目覚めようとしている。',
    '星核の深淵——全ての星核が生まれた場所。レールの果てで、星神アルケーが待つ。',
  ],
  scenes: {
    c1_01: 'ヘリオス宇宙ステーションの冷凍睡眠カプセルで、少女アステルが目を覚ました。見つけたのは星海列車ノクターン号の乗員、ユエとミゾレ。反物質軍団がステーションの奥まで入り込んでいると知り、三人はカプセルホールを出て、南の検問扉を目指す。',
    c1_01b: 'カプセルホールを抜けた検問扉の手前で、反物質軍団の斥候に行く手をふさがれる。記憶のないアステルは、どこからか取り出したバットを手に、体が覚えていた戦い方で応戦する。',
    c1_02: '敵を退け、吹き抜けのホールから上の階の医務室へ向かった一行は、端末の陰に隠れていたステーションの主任研究員イリスと出会う。イリスはアステルを「被験体」と呼び、何かを知っている様子。中枢の星核が暴走しかけており、それを封鎖する緊急制御キーを物資保管庫の保管棚C-7から持ち出すよう頼まれる。',
    c1_03: '物資保管庫の上の階、保管棚C-7で緊急制御キーを見つけたものの、待ち伏せていた敵の群れに囲まれてしまう。',
    c1_04: '戦いのあと、「星核を狩る者」を名乗るカザネが現れる。目的が同じことから、カザネも一行に同行することに。イリスの通信で、占拠された主制御区画を奪還すれば動力炉への道が開けると知る。',
    c1_04b: 'ステーション・エレベーターで向かった主制御区画は、反物質軍団の兵で埋め尽くされていた。制御卓を取り戻すため、カザネを加えた一行は正面から切り込む。',
    c1_05: '主制御区画を取り戻し、東の通路から動力炉へ。炉へ入る前室には鋼鉄の巨像が立ちはだかる。カザネはその弱点が炎・雷・量子だと即座に見抜いた。',
    c1_05b: '巨像を退け、炉の底へ降りて炉心の足もとの制御端末に緊急制御キーを差し込むと、動力炉は停止した。だが星核は炉の力なしに脈打ち続け、閉ざされていた星核の間の隔壁がひとりでに開く。封鎖するには、星核の間へ踏み込むしかない。',
    c1_06: '炉の底の北で開いた隔壁を抜け、深淵に架かる橋を渡って、ついに星核の間へ。脈打つ星核を前に、アステルの胸の奥が呼応するように熱を帯びる。そして、星核の番人が目を覚ました。',
    c1_06b: '番人を倒しても、星核の暴走は止まらなかった。そのときアステルの胸が星核と共鳴し、アステルが手を伸ばすと、荒れ狂う光が鎮まる。その隙にユエが封印容器で星核を封じ、ステーションは救われた。イリスは、アステルのことをいつか必ず話すと約束する。',
    c1_07: '星核を封じた一行は、車掌ポルカの待つノクターン号へ。ユエは、アステルの体に星核と同じ波長の「何か」があると告げ、その正体を知るための旅に誘う。アステルは列車に乗ることを決め、カザネも同行する。次の停車駅は、永久凍土の都ベロワ。',
    c2_01: '列車が着いたのは、終わらない冬に閉ざされた城塞都市ベロワ。レジスタンスを率いるロアによれば、かつて民に優しかった女帝が星核を手にしてから、冬が終わらなくなったという。一行はまず、街を狙う外縁の獣を退けることに。',
    c2_02: '腕を認めたロアの案内で、人々が暮らす行政区を抜けて凍てついた街路へ。そこへ女帝の首を狙う賞金稼ぎライカが現れ、利害が一致したことから行動を共にする。兵で溢れる大通りを避け、街路の東の坑口から地下鉱区へ入り、深層を抜けて城塞の裏へ回り込む作戦だ。',
    c2_03: '地下鉱区は、女帝がまだ優しかった頃、民の暮らしのために開放した場所だった。星核さえ引き剥がせば女帝を救えるかもしれない——深層の古い鉱脈の前で、一行は彼女を救うと誓い、北坑道から城塞の門の脇を目指す。',
    c2_04: '北坑道を抜け、見張りの死角となる門の東側へ出た。門を守るのは鋼鉄の巨像二体と騎士が一体。一行は一気に突破を図る。',
    c2_05: '城門を破り、衛兵が凍りついたまま彷徨う宮殿の大広間、肖像の回廊、凍てついた庭園を抜けて、玉座の間へ。そこで待っていたのは、凍りついた時の中心に座す女帝。ロアの呼びかけも届かず、女帝は星核の力を振るって襲いかかってくる。',
    c2_06: '星核が砕け、玉座を覆う氷が溶けていく。正気を取り戻した女帝は民を案じ、ロアは春を待つ人々のもとへ。懸賞金を逃したライカも、面白そうだからと一行の旅についてくることに。次の停車駅は、雲海の仙舟ホウライ。',
    c3_01: '雲海を往く仙舟ホウライ。将軍ソウゲンは、月蝕の夜に封じられた龍が目覚めると語る。丹鼎司の学士ホムラによれば、龍の封印には星核が使われており、それが暴走しかけているという。一行はまず、渡し場に湧いた炎霊を鎮めることに。',
    c3_02: '丹鼎司で封印を調べると、術式が内側から焼き切られていた。ホムラの見立てでは、龍のほうが星核を喰らおうとしている。',
    c3_03: '演武場で足止めされている雲騎軍の援護を、ソウゲンから頼まれる。将軍自身は封印の維持に回るが、月蝕までの猶予はもうわずかだ。',
    c3_04: '空が欠け、ついに月蝕が始まった。ホムラは、鱗淵境を抜けて祭壇で龍を止めれば、まだ仙舟は落ちないと告げる。',
    c3_05: '祭壇の上で、月を喰らう龍が雲海を震わせて咆哮する。ソウゲンに仙舟の命運を託され、一行は龍に挑む。',
    c3_06: '龍は光の粒となって雲海へ還り、星核の欠片も回収された。アステルの胸の光はさらに強まり、全ての星核が生まれた場所「星核の深淵」を指している。ソウゲンから星槎を借り、列車はレールの終点へ向かう。',
    c4_01: 'レールの果ての紅い深淵で、シエルとネビュラが一行を待っていた。星神アルケーは全ての星核を束ね、この宇宙を「終わらせる」つもりだという。シエルは、アステルの正体を知っているようだ。',
    c4_02: '崩れた星図で、元・管理者を名乗るヴェスパと出会う。終焉の門のロックを外すあいだ、一行がヴェスパを守ることになった。',
    c4_03: 'ロックが外れ、ヴェスパが仲間に加わる。イリスからの通信で、アステルがアルケーの「器」として作られたことが明かされる。けれど、アステルを目覚めさせたのは「誰かと旅をしたい」という、アステル自身の願いだった。',
    c4_04: '星神の座で、アルケーは器であるアステルに「還れ」と迫る。仲間たちとともに、アステルは最後の戦いに挑む。',
    c4_05: 'アルケーを退け、深淵に星の光が満ちた。旅を終えた一行は、それでも新たなレールの先を見つめる。次の停車駅は、まだ誰も知らない星。',
  },
};

// 見終えたシーン（現在の任務より前の段階にあるもの）を章ごとに集める
function recapEntries() {
  const st = Story.state;
  return STORY.map((ch, ci) => {
    if (ci > st.ch) return null;
    const scenes = ch.steps
      .map((step, i) => ({ id: step.t === 'scene' ? step.id : step.t === 'field' ? step.scene : null, i }))
      .filter(x => x.id && (ci < st.ch || x.i < st.step))
      .map(x => ({ id: x.id, title: SCENES[x.id].title, text: RECAP.scenes[x.id] }));
    return { ci, title: ch.title, intro: RECAP.chapters[ci], scenes, done: ci < st.ch };
  }).filter(Boolean);
}

// あらすじをオーバーレイ o に表示する。onReplay(id) があればシーンを見直せる
function renderRecap(o, onClose, onReplay) {
  const list = recapEntries(), cur = Story.current();
  const body = list.map(c => `<section class="rc-ch">
      <h3>${c.title}${c.done ? '<small>完</small>' : ''}</h3>
      <p class="rc-intro">${c.intro}</p>
      ${c.scenes.length ? c.scenes.map(sc => `<div class="rc-scene">
        <div class="rc-head"><b>${sc.title}</b>${onReplay ? `<button class="btn small" data-replay="${sc.id}">もう一度見る</button>` : ''}</div>
        <p>${sc.text}</p></div>`).join('') : '<p class="rc-none">まだ物語は始まっていない。</p>'}
    </section>`).join('');
  o.innerHTML = `<div class="ov-box recap"><h2>これまでのあらすじ</h2>
    <div class="rc-list">${body}
      ${cur ? `<div class="rc-now"><small>現在の開拓任務</small>◆ ${cur.step.g}</div>` : '<div class="rc-now"><small>開拓任務</small>全ての任務をクリアしました</div>'}
    </div>
    <button class="btn gold" data-close>閉じる</button></div>`;
  o.classList.remove('hidden');
  const listEl = o.querySelector('.rc-list');
  listEl.scrollTop = listEl.scrollHeight;   // 最新の出来事から読めるように
  o.querySelector('[data-close]').onclick = () => { Sfx.click(); onClose(); };
  o.querySelectorAll('[data-replay]').forEach(b => b.onclick = () => { Sfx.select(); onReplay(b.dataset.replay); });
}

// ============================================================
//  会話シーンの3D演出
// ============================================================
POSES.talk = { armRx: -0.75, armRz: -0.05, elbowR: -1.35, armLz: 0.14, elbowL: -0.2, headX: -0.04 };
POSES.talk2 = { armRx: -0.5, elbowR: -1.0, armLx: -0.5, elbowL: -1.0, armLz: 0.2, armRz: -0.2, headY: 0.1 };

class DialogueView extends BaseView {
  constructor(scene) {
    super(scene.bg, 32);
    this.bloomStrength = 0.6;
    // 明るいステージでは顔が白飛びしないよう露出を下げる
    this.exposure = { snow: 0.78, xian: 0.9 }[scene.bg] || 1.0;
    this.actors = {};
    const keys = [];
    scene.lines.forEach(l => {
      if (Array.isArray(l) && l[0] !== 'n') keys.push(l[0]);
      if (l.c) { keys.push('aster'); l.c.forEach(([, rs]) => rs.forEach(r => keys.push(r[0]))); }
    });
    (scene.cast || []).forEach(k => keys.push(k));
    const people = [...new Set(keys)].filter(k => k !== 'n' && !k.startsWith('e:'));
    const foes = [...new Set(keys)].filter(k => k.startsWith('e:'));
    if (!people.includes('aster')) people.unshift('aster');
    // アステルを中央寄りに
    const order = people.filter(k => k !== 'aster');
    order.splice(Math.floor(order.length / 2), 0, 'aster');
    order.forEach((k, i) => {
      const m = buildCharacter(k);
      const x = (i - (order.length - 1) / 2) * 1.45;
      m.group.position.set(x, 0, Math.abs(x) * 0.25);
      m.group.rotation.y = -x * 0.2;
      m.setPose(POSES.idle);
      this.scene.add(m.group);
      this.actors[k] = { m, x };
    });
    foes.forEach(k => {
      const m = buildEnemy(k.slice(2));
      m.group.position.set(0, 0, -7 - m.radius);
      this.scene.add(m.group);
      this.actors[k] = { m, x: 0, foe: true };
    });
    this.wide(true);
  }
  wide(snap) {
    this.setCam(V3(0.6, 1.75, 6.2), V3(0, 1.25, -0.5), { snap, speed: 3 });
  }
  focus(key) {
    const a = this.actors[key];
    if (!a) { this.wide(); return; }
    const g = a.m.group.position;
    if (a.foe) {
      const h = a.m.height;
      this.setCam(V3(1.2, h * 0.45 + 0.8, g.z + h * 1.2 + 4.5), V3(0, h * 0.6, g.z), { speed: 3.5 });
      a.m.flash(a.m.color, 0.6);
      return;
    }
    const s = a.m.group.scale.y;
    const head = V3(g.x, 1.63 * s, g.z);
    const side = a.x > 0.1 ? -0.45 : 0.45;
    this.setCam(V3(head.x + side * 1.1, head.y + 0.02, head.z + 2.1), head.clone().add(V3(side * 0.3, -0.2, 0)), { speed: 4 });
    // 話すときの身振り
    const m = a.m, pose = Math.random() < 0.5 ? POSES.talk : POSES.talk2;
    const from = { ...m.pose };
    GFX.tween(0.35, t => { for (const k of POSE_KEYS) m.pose[k] = lerp(from[k], pose[k] || 0, t); })
      .then(() => GFX.delay(0.6))
      .then(() => { const f2 = { ...m.pose }; return GFX.tween(0.5, t => { for (const k of POSE_KEYS) m.pose[k] = lerp(f2[k], POSES.idle[k] || 0, t); }); });
  }
  update(dt, t, rdt) {
    super.update(rdt, t);
    for (const k in this.actors) { const a = this.actors[k]; a.m.update(rdt, t); if (a.m.emit) a.m.emit(this.p, a.m.group.position); }
  }
}

// ============================================================
//  会話画面
// ============================================================
function DialogueScreen(id, done) {
  const scene = SCENES[id];
  // 第一章は物語の場所で演じる舞台、それ以外は従来の並び立ち
  const v = GFX.ok ? (typeof SCENE_STAGES !== 'undefined' && SCENE_STAGES[id] ? new StageView(scene, id) : new DialogueView(scene)) : null;
  if (v) { v.key = 'dialog:' + id; GFX.setView(v); }
  const s = h(`<div class="screen dialog ${v ? '' : 'flat'} dlbg-${scene.bg}">
    <div class="dl-title"><small>開拓任務</small><b>${scene.title}</b></div>
    <div class="dl-ctrl"><button class="ctl" data-auto>AUTO</button><button class="ctl" data-skip>スキップ</button></div>
    <div class="dl-portrait"></div>
    <div class="dl-choices"></div>
    <div class="dl-box"><div class="dl-name"></div><div class="dl-text"></div><div class="dl-next">▼</div></div>
  </div>`);
  // 行を平坦なキューにする（選択肢は選ばれた時に展開）
  const queue = scene.lines.slice();
  let typing = null, full = '', auto = false, autoTimer = null, waitingChoice = false, finished = false;
  const nameEl = s.querySelector('.dl-name'), textEl = s.querySelector('.dl-text'), box = s.querySelector('.dl-box');
  const choicesEl = s.querySelector('.dl-choices'), portrait = s.querySelector('.dl-portrait');

  const finish = () => {
    if (finished) return; finished = true;
    clearInterval(typing); clearTimeout(autoTimer);
    Game.activeDialog = null;
    done();
  };
  const scheduleAuto = () => {
    clearTimeout(autoTimer);
    if (auto && !waitingChoice) autoTimer = setTimeout(advance, 1200 + full.length * 45);
  };
  const show = (speaker, text, nameOverride, dir) => {
    full = text;
    const nm = nameOverride || speakerName(speaker);
    nameEl.textContent = nm;
    nameEl.style.display = nm ? '' : 'none';
    box.classList.toggle('narr', speaker === 'n');
    const col = speaker === 'n' ? '#e8c77a' : speaker.startsWith('e:') ? ENEMIES[speaker.slice(2)].color : ELEMENTS[(CHARS[speaker] || NPCS[speaker]).elem].color;
    box.style.setProperty('--c', col);
    if (v) { if (v.line) v.line(speaker, text, dir || {}); else speaker === 'n' ? v.wide() : v.focus(speaker); }
    else portrait.innerHTML = speaker === 'n' || speaker.startsWith('e:') ? '' : avatarSVG(speaker);
    let i = 0; textEl.textContent = '';
    clearInterval(typing);
    typing = setInterval(() => {
      i += 1; textEl.textContent = full.slice(0, i);
      if (i >= full.length) { clearInterval(typing); typing = null; if (v && v.lineDone) v.lineDone(); scheduleAuto(); }
    }, 28);
    Sfx.tone(700 + Math.random() * 200, 0.03, 'sine', 0.02);
  };
  const advance = () => {
    if (finished || waitingChoice) return;
    if (typing) { clearInterval(typing); typing = null; textEl.textContent = full; if (v && v.lineDone) v.lineDone(); scheduleAuto(); return; }
    const l = queue.shift();
    if (!l) { finish(); return; }
    if (l.give) {
      const k = l.give;
      if (!Save.data.owned[k]) {
        const top = Math.max(...Object.values(Save.data.owned).map(x => x.lv));
        Save.data.owned[k] = { lv: Math.max(1, top - 3), exp: 0, eid: 0 };
        show('n', `${CHARS[k].name}が仲間になった！`);
      } else show('n', `${CHARS[k].name}が同行することになった。`);
      if (Save.data.team.length < 4 && !Save.data.team.includes(k)) Save.data.team.push(k);
      Save.save();
      if (v && v.give) v.give(k);
      Sfx.win();
      return;
    }
    if (l.c) {
      waitingChoice = true;
      textEl.textContent = ''; nameEl.style.display = 'none';
      choicesEl.innerHTML = l.c.map(([t], i) => `<button class="dl-choice" data-i="${i}"><kbd>${i + 1}</kbd>${t}</button>`).join('');
      choicesEl.querySelectorAll('.dl-choice').forEach(b => b.onclick = e => { e.stopPropagation(); choose(+b.dataset.i); });
      if (v) v.choice ? v.choice() : v.focus('aster');
      return;
    }
    // 行：[話者, 本文, 表示名(省略可), 演出(省略可)]
    show(l[0], l[1], typeof l[2] === 'string' ? l[2] : undefined, l.find((x, i) => i >= 2 && x && typeof x === 'object'));
  };
  const choose = i => {
    const cur = choicesEl.querySelectorAll('.dl-choice');
    if (!waitingChoice || !cur[i]) return;
    const node = currentChoice;
    waitingChoice = false; choicesEl.innerHTML = '';
    Sfx.select();
    const [text, replies, dir] = node.c[i];
    queue.unshift(['aster', text, dir || {}], ...replies);
    advance();
  };
  // 選択肢ノードを追跡するため advance をラップ
  let currentChoice = null;
  const origShift = queue.shift.bind(queue);
  queue.shift = () => { const l = origShift(); if (l && l.c) currentChoice = l; return l; };

  s.addEventListener('click', e => { if (e.target.closest('button')) return; Sfx.init(); advance(); });
  s.querySelector('[data-auto]').onclick = e => {
    auto = !auto; e.currentTarget.classList.toggle('on', auto);
    if (auto && !typing) scheduleAuto(); else clearTimeout(autoTimer);
  };
  s.querySelector('[data-skip]').onclick = () => {
    if (confirm('このシーンをスキップしますか？')) finish();
  };
  Game.activeDialog = {
    key(e) {
      const k = e.key;
      if (k === ' ' || k === 'Enter') { e.preventDefault(); advance(); }
      else if (waitingChoice && '123'.includes(k)) choose(+k - 1);
    },
  };
  setTimeout(advance, v ? 500 : 100);
  return s;
}
document.addEventListener('keydown', e => { if (Game.activeDialog) Game.activeDialog.key(e); });

// ============================================================
//  任務画面・章クリア
// ============================================================
// ============================================================
//  デバッグ：章・段階へジャンプ
//  URL に ?debug を付けて開くと有効になり（以後も有効のまま）、?debug=0 で無効に戻る。
//  開拓任務の画面に「デバッグ：章へジャンプ」が出る。最初のジャンプの前にセーブデータを退避する
// ============================================================
const Debug = {
  KEY: 'galaxy_rail_debug', BACKUP: 'galaxy_rail_debug_backup',
  init() {
    try {
      const q = new URLSearchParams(location.search);
      if (q.has('debug')) { if (q.get('debug') === '0') localStorage.removeItem(this.KEY); else localStorage.setItem(this.KEY, '1'); }
    } catch (e) { /* 保存不可の環境 */ }
  },
  get on() { try { return localStorage.getItem(this.KEY) === '1'; } catch (e) { return false; } },
  get hasBackup() { try { return !!localStorage.getItem(this.BACKUP); } catch (e) { return false; } },
  // 段階で見る会話シーンと、そこで仲間になるキャラクター
  gives(step) {
    const out = [], walk = ls => ls.forEach(l => { if (l && l.give) out.push(l.give); else if (l && l.c) l.c.forEach(([, rs]) => walk(rs)); });
    const sc = SCENES[step.id || step.scene]; if (sc) walk(sc.lines);
    return out;
  },
  // その段階で戦うステージ（なければ章の最後のステージ）の推奨レベル
  levelAt(ci, si) {
    const ch = STORY[ci];
    if (!ch) return Math.max(...allStages().map(s => s.lv));
    const st = ch.steps.slice(si).find(x => x.stage || x.battle), id = st ? st.stage || st.battle : CHAPTERS[ci].stages.at(-1).id;
    return (allStages().find(s => s.id === id) || {}).lv || 1;
  },
  // 章 ci の段階 si の直前まで進めた状態にする（ci = STORY.length で全章クリア）
  jump(ci, si, { level = true } = {}) {
    const d = Save.data;
    try { if (!this.hasBackup) localStorage.setItem(this.BACKUP, JSON.stringify(d)); } catch (e) { /* 退避できなくても続ける */ }
    const before = [];
    for (let c = 0; c < STORY.length; c++) STORY[c].steps.forEach((st, i) => { if (c < ci || (c === ci && i < si)) before.push(st); });
    // 物語の位置
    const v = Story.state.v;
    d.story = { ch: ci, step: si, v };
    // クリア済みのステージ：前の章はすべて、この章は目的地より前の戦闘まで
    const cleared = {};
    for (let c = 0; c < Math.min(ci, CHAPTERS.length); c++) CHAPTERS[c].stages.forEach(s => { cleared[s.id] = true; });
    before.forEach(st => { if (st.stage) cleared[st.stage] = true; if (st.battle) cleared[st.battle] = true; });
    d.cleared = cleared;
    // 飛ばした会話で仲間になるキャラクター
    for (const k of before.flatMap(st => this.gives(st))) {
      if (!d.owned[k]) d.owned[k] = { lv: 1, exp: 0, eid: 0 };
      if (d.team.length < 4 && !d.team.includes(k)) d.team.push(k);
    }
    // 編成のレベルを推奨レベルまで上げる
    if (level) { const lv = this.levelAt(ci, si); for (const k of d.team) if (d.owned[k].lv < lv) Object.assign(d.owned[k], { lv, exp: 0 }); }
    // 探索任務へ飛んだときは、その区画の時空アンカーから歩き出す（それ以外は章の開始位置から）
    delete d.fieldResume;
    const tgt = STORY[ci] && STORY[ci].steps[si];
    if (tgt && tgt.t === 'field' && !tgt.start) { const Z = FIELD_ZONES[tgt.zone]; d.fieldResume = { ci: tgt.ci, zone: tgt.zone, x: Z.anchor[0], z: Z.anchor[1], yaw: 0 }; }
    Save.save();
  },
  restore() {
    try {
      const b = localStorage.getItem(this.BACKUP); if (!b) return false;
      localStorage.setItem(SAVE_KEY, b); localStorage.removeItem(this.BACKUP);
    } catch (e) { return false; }
    Save.load();
    return true;
  },
  // ジャンプ先を選ぶ画面
  render(o, onDone) {
    const cur = Story.current(), icon = { scene: '💬', battle: '⚔', field: '◆', reward: '★' };
    const btn = (ci, si, label, now) => `<button class="dbg-step ${now ? 'now' : ''}" data-j="${ci},${si}">${label}</button>`;
    o.innerHTML = `<div class="ov-box dbg"><h2>デバッグ：章へジャンプ</h2>
      <div class="dbg-note">選んだ段階の直前まで進めた状態にします。前の章のステージはクリア済みになり、途中で加わる仲間も加入します。最初のジャンプの前にセーブデータを退避します。</div>
      <label class="dbg-opt"><input type="checkbox" data-lv checked>編成のレベルを推奨レベルまで上げる</label>
      <div class="dbg-list">${STORY.map((ch, ci) => `<section><h3>${ch.title}<small>推奨 Lv.${this.levelAt(ci, 0)}</small></h3>
        ${ch.steps.map((st, si) => btn(ci, si, `<span>${icon[st.t]}</span>${st.g}`, cur && cur.chIdx === ci && Story.state.step === si)).join('')}</section>`).join('')}
        <section><h3>クリア後</h3>${btn(STORY.length, 0, '<span>★</span>全ての章をクリアした状態', !cur)}</section></div>
      <div class="dbg-foot">${this.hasBackup ? '<button class="btn small" data-restore>ジャンプ前のセーブに戻す</button>' : ''}<button class="btn gold" data-close>閉じる</button></div></div>`;
    o.classList.remove('hidden');
    const now = o.querySelector('.dbg-step.now'); if (now) now.scrollIntoView({ block: 'center' });
    o.querySelector('[data-close]').onclick = () => { Sfx.click(); o.classList.add('hidden'); };
    o.querySelectorAll('[data-j]').forEach(b => b.onclick = () => {
      const [ci, si] = b.dataset.j.split(',').map(Number);
      Sfx.select(); this.jump(ci, si, { level: o.querySelector('[data-lv]').checked }); onDone();
    });
    const r = o.querySelector('[data-restore]');
    if (r) r.onclick = () => { Sfx.click(); if (this.restore()) onDone(); };
  },
};
Debug.init();

function StoryScreen() {
  const cur = Story.current();
  const v3 = GFX.show('stage:' + (cur ? CHAPTERS[cur.chIdx].bg : 'space'), () => new SceneryView(cur ? CHAPTERS[cur.chIdx].bg : 'space'));
  if (v3) v3.setEnemies([]);
  const icon = { scene: '💬', battle: '⚔', field: '◆', reward: '★' };
  const s = h(`<div class="screen story">${topBar('開拓任務')}
    <div class="sy-chapters">${STORY.map((c, i) => {
      const p = Story.progress(i);
      return `<div class="sy-ch ${p >= 1 ? 'done' : p > 0 || (cur && cur.chIdx === i) ? 'now' : 'locked'}">
        <small>${p >= 1 ? 'クリア済' : cur && cur.chIdx === i ? '進行中' : '未開放'}</small><b>${c.title}</b>
        <div class="bar exp"><i style="width:${p * 100}%"></i></div></div>`;
    }).join('')}</div>
    <div class="sy-main">
      ${cur ? `
        <div class="sy-chtitle">${cur.ch.title}</div>
        <div class="sy-goal"><span>${icon[cur.step.t]}</span>${cur.step.g}</div>
        <div class="sy-desc">${{ scene: () => '物語の続きを見る。', battle: () => `任務ステージ「${cur.step.stage}」で戦闘が発生する。`,
          field: () => `探索フィールド「${FIELD_ZONES[cur.step.zone].name}」の目的地（◆）へ向かう。到着すると物語が進み、戦闘が発生する。`, reward: () => '章の報酬を受け取る。' }[cur.step.t]()}</div>
        <div class="sy-steps">${cur.ch.steps.map((st, i) => `<div class="sy-step ${i < Story.state.step ? 'done' : i === Story.state.step ? 'now' : ''}">
          <span>${icon[st.t]}</span>${i <= Story.state.step ? st.g : '？？？'}</div>`).join('')}</div>
        <button class="btn gold big" data-go>任務を続ける</button>`
      : `<div class="sy-chtitle">全ての開拓任務をクリアしました</div><div class="sy-desc">ステージ一覧から再挑戦したり、探索や模擬宇宙で育成を続けられます。</div>`}
      <div class="sy-sub">
        <button class="btn small" data-stages>ステージ一覧（再挑戦）</button>
        <button class="btn small" data-field>探索へ</button>
        <button class="btn small" data-recap>あらすじ</button>
        ${Debug.on ? '<button class="btn small dbg-btn" data-debug>デバッグ：章へジャンプ</button>' : ''}
      </div>
    </div>
    <div class="overlay hidden"></div></div>`);
  wireBack(s);
  const go = s.querySelector('[data-go]');
  if (go) go.onclick = () => { Sfx.select(); Story.run(); };
  s.querySelector('[data-stages]').onclick = () => { Sfx.click(); App.go(StageScreen); };
  s.querySelector('[data-field]').onclick = () => { Sfx.click(); App.go(FieldSelect); };
  const ov = s.querySelector('.overlay');
  s.querySelector('[data-recap]').onclick = () => {
    Sfx.click();
    renderRecap(ov, () => ov.classList.add('hidden'), id => App.go(DialogueScreen, id, () => App.go(StoryScreen)));
  };
  const dbg = s.querySelector('[data-debug]');
  if (dbg) dbg.onclick = () => { Sfx.click(); Debug.render(ov, () => App.go(StoryScreen)); };
  return s;
}

function ChapterClearScreen(ci, jade) {
  const s = h(`<div class="screen su-end"><div class="ov-box result win">
    <div class="res-title">${STORY[ci].title.split('　')[0]}　完</div>
    <div class="res-sub">${STORY[ci].title.split('　')[1] || ''}</div>
    <div class="res-info"><div class="rw"><i class="ic-jade"></i>章クリア報酬　星玉 +${jade}</div>
    ${STORY[ci + 1] ? `<div class="dim">次章「${STORY[ci + 1].title}」が開放された</div>` : '<div class="dim">全ての章をクリアしました。遊んでくれてありがとう！</div>'}</div>
    <button class="btn gold" data-ok>${STORY[ci + 1] ? '次の章へ' : '列車に戻る'}</button></div></div>`);
  Save.save(); Sfx.win();
  s.querySelector('[data-ok]').onclick = () => { Sfx.click(); STORY[ci + 1] ? Story.run() : App.go(HubScreen); };
  return s;
}
