'use strict';
// ============================================================
//  おしゃれ（メガネ・帽子・マント・服）
//  見た目だけで、力は変わらない。第三章のニャハハ王国のおしゃれ屋で買うと、だれでも着られる（一度買えば、何匹でも同じものを着てよい）。
//  第二章までは買えない（なかまの画面の「おしゃれ」に、第三章から買えると出す）。ぽかぽか村のアン（お店は持たない）が、王国のおしゃれ屋へ誘う。
//  「なかま」の画面の「おしゃれ」のタブで着がえる。着ているものは、探索・会話・戦闘のモデルにそのまま出る。
//  look は js/gfx/cats.js の見た目に足すもの（形は js/gfx/outfit-models.js）。
// ============================================================
const OUTFIT_SLOTS = ['glasses', 'hat', 'cape', 'clothes'];
const OUTFIT_SLOT_NAME = { glasses: 'メガネ', hat: '帽子', cape: 'マント', clothes: '服' };
// その枠を着がえると、いつもの見た目のどれをはずすか（帽子をかぶるとハチマキ・三角帽子・冠・若葉をはずす など）
const OUTFIT_SLOT_LOOK = {
  glasses: ['glasses'],
  hat: ['band', 'hat', 'crown', 'sprout', 'cap', 'kerchief'],
  cape: ['cape', 'capeIn', 'collar'],
  clothes: ['vest', 'armor', 'ribbon', 'apron', 'scarf', 'bell', 'ruff'],
};
const OUTFITS = {
  // ---------------- メガネ ----------------
  g_round: { slot: 'glasses', name: 'まるメガネ', price: 200, icon: '👓', desc: 'ふちの細い、まるいメガネ。ちょっと、かしこそうに見える。',
    look: { specs: 'round', specsCol: '#7a5230' } },
  g_sun: { slot: 'glasses', name: 'サングラス', price: 300, icon: '🕶', desc: 'まっくろなレンズ。まぶしい日も、てれた日も、これで平気。',
    look: { specs: 'sun', specsCol: '#1c1c24' } },
  g_star: { slot: 'glasses', name: 'ほしがたメガネ', price: 350, icon: '⭐', desc: 'お祭りの夜にかける、星の形のメガネ。',
    look: { specs: 'star', specsCol: '#ff5aa8' } },
  g_clown: { slot: 'glasses', name: 'ピエロのはな', price: 250, icon: '🔴', desc: 'まっかな、まんまるの鼻。つけると、なぜか笑われる。',
    look: { specs: 'nose', specsCol: '#ff3040' } },
  // ---------------- 帽子 ----------------
  h_straw: { slot: 'hat', name: 'むぎわら帽子', price: 300, icon: '👒', desc: 'つばの広い、麦わらの帽子。赤いリボンつき。',
    look: { topper: 'straw', topCol: '#f0cf7a', topCol2: '#e0453a' } },
  h_silk: { slot: 'hat', name: 'シルクハット', price: 450, icon: '🎩', desc: '背の高い、紳士の帽子。かぶると、背すじがのびる。',
    look: { topper: 'silk', topCol: '#26232e', topCol2: '#c83a4a' } },
  h_beret: { slot: 'hat', name: 'ベレー帽', price: 250, icon: '🎨', desc: 'ななめにかぶる、やわらかい帽子。絵がうまくなりそうな気がする。',
    look: { topper: 'beret', topCol: '#3a5ab8', topCol2: '#2a3a7a' } },
  h_clown: { slot: 'hat', name: 'ピエロの帽子', price: 400, icon: '🎪', desc: 'しましまの、とんがり帽子。てっぺんのぽんぽんが、ゆれる。',
    look: { topper: 'clown', topCol: '#ff5a8a', topCol2: '#ffe066' } },
  // ---------------- マント ----------------
  c_night: { slot: 'cape', name: 'よぞらのマント', price: 500, icon: '🌙', desc: '夜空のような紺色に、星がちりばめてある。',
    look: { cape: '#ffffff', capeIn: '#3a4aa8', capeTex: 'stars', capeTexCol: ['#1e2a5e', '#ffe27a'] } },
  c_sakura: { slot: 'cape', name: 'さくらのマント', price: 500, icon: '🌸', desc: '春の花びらを染めた、うすもものマント。',
    look: { cape: '#ffffff', capeIn: '#fff4f8', capeTex: 'petals', capeTexCol: ['#ffb6cf', '#ffffff'] } },
  c_royal: { slot: 'cape', name: '王さまのマント', price: 800, icon: '👑', desc: 'ふちに白い毛皮をつけた、まっかなマント。えらくなった気分。',
    look: { cape: '#ffffff', capeIn: '#ffd76a', capeTex: 'ermine', capeTexCol: ['#c8283c', '#ffffff'] } },
  c_clown: { slot: 'cape', name: 'ピエロのマント', price: 600, icon: '🃏', desc: 'ひし形もようの、にぎやかなマント。',
    look: { cape: '#ffffff', capeIn: '#ffe066', capeTex: 'diamond', capeTexCol: ['#ff5a8a', '#5ac8ff'] } },
  // ---------------- 服 ----------------
  w_sweater: { slot: 'clothes', name: 'しましまセーター', price: 400, icon: '🧶', desc: 'ふかふかの毛糸のセーター。寒い日も、ぬくぬく。',
    look: { suit: 'sweater', suitCol: ['#e8503c', '#fff4e0'] } },
  w_happi: { slot: 'clothes', name: 'はっぴ', price: 500, icon: '🏮', desc: 'お祭りの服。着ると、なんだか元気が出る。',
    look: { suit: 'happi', suitCol: ['#2a4a9a', '#ffffff', '#e0453a'] } },
  w_tux: { slot: 'clothes', name: 'タキシード', price: 900, icon: '🤵', desc: 'ぱりっとした黒い礼服に、赤い蝶ネクタイ。',
    look: { suit: 'tux', suitCol: ['#23222c', '#ffffff', '#d8283c'] } },
  w_clown: { slot: 'clothes', name: 'ピエロの服', price: 800, icon: '🤡', desc: '右と左で色のちがう、水玉の服。ひらひらの襟と、ぽんぽんのボタン。',
    look: { suit: 'clown', suitCol: ['#ff5a8a', '#ffe066', '#ffffff', '#5ac8ff'] } },
};

const hasOutfit = id => !!(OUTFITS[id] && Save.data && (Save.data.wardrobe || {})[id]);
function gainOutfit(id) { const d = Save.data; (d.wardrobe || (d.wardrobe = {}))[id] = true; }
// 着ているもの：なし（undefined）はいつもの見た目、'none' は何もつけない、それ以外は OUTFITS の id
function outfitOf(key, slot) {
  const v = Save.data && Save.data.outfit && Save.data.outfit[key] && Save.data.outfit[key][slot];
  return v === 'none' || hasOutfit(v) ? v : null;
}
function setOutfit(key, slot, v) {
  const d = Save.data, o = (d.outfit || (d.outfit = {}))[key] || (d.outfit[key] = {});
  if (v) o[slot] = v; else delete o[slot];
  Save.save();
  if (typeof GFX !== 'undefined') GFX.forgetPortrait(key);   // 顔のアイコンも着がえた姿で描き直す
}
// いつもの見た目に、その枠のものがあるか（ハチマキ・マント・鎧 など）
const outfitHasDefault = (key, slot) => !!CHARS[key] && OUTFIT_SLOT_LOOK[slot].some(k => CHARS[key].look[k]);
// モデルの見た目に上書きするもの（buildCharacter の opt.look）
function outfitLook(key) {
  const look = {};
  for (const slot of OUTFIT_SLOTS) {
    const v = outfitOf(key, slot); if (!v) continue;
    for (const k of OUTFIT_SLOT_LOOK[slot]) look[k] = null;
    if (v !== 'none') Object.assign(look, OUTFITS[v].look);
  }
  return look;
}
// おしゃれ屋で買えるようになる章（STORY の番号。第三章）と、その章に入ったか
const OUTFIT_CH = 2;
const outfitShopOpen = () => Story.state.ch >= OUTFIT_CH;
