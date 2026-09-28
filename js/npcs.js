'use strict';
// ============================================================
//  物語とフィールドに登場する人物（みんな2頭身のにゃんこ。ネズミもいる）
//  look は js/gfx/cats.js の見た目。face = ふだんの表情、faceAfter = [条件, 表情]
// ============================================================
const NPCS = {
  // ---------------- ぽかぽか村 ----------------
  sonchou:   { name: '村長', title: 'ぽかぽか村の村長', elem: 'wind', face: 'neutral',
    look: { fur: '#cfcac0', pattern: 'tabby', patches: ['#8a847a'], eye: '#8a9a5a', muzzle: '#f4f0e8', paws: '#f4f0e8', beard: '#ffffff', vest: '#6a8a5a', accent: '#8ad86a' }, gear: { weapon: 'cane' } },
  sakanaya:  { name: '魚屋のおばちゃん', title: '村いちばんの魚屋', elem: 'fire', face: 'smile', scale: 1.06,
    look: { fur: '#f0a860', pattern: 'tabby', patches: ['#c8783a'], eye: '#6a8a3a', muzzle: '#fff4e0', paws: '#fff4e0', apron: '#ffffff', kerchief: '#e05a6a', accent: '#ff8a6a' }, gear: { weapon: 'fish' } },
  bukiya:    { name: '武器屋の親方', title: 'がんこな鍛冶猫', elem: 'fire', face: 'serious', scale: 1.1,
    look: { fur: '#8a6a4a', pattern: 'solid', eye: '#e8a040', muzzle: '#e8d8c0', paws: '#e8d8c0', apron: '#5a4a3a', band: '#3a6ad8', scar: true, accent: '#ffb04a' } },
  douguya:   { name: '道具屋', title: 'めがねの道具屋', elem: 'wind', face: 'smile',
    look: { fur: '#a8a8b0', pattern: 'tuxedo', eye: '#4a8ad8', muzzle: '#ffffff', paws: '#ffffff', glasses: '#3a2a2a', vest: '#6a8a5a', accent: '#8ad86a' } },
  yadoya:    { name: '宿屋のおかみ', title: 'ひだまり亭のおかみ', elem: 'imaginary', face: 'gentle',
    look: { fur: '#3a3844', pattern: 'tuxedo', eye: '#8ad84a', muzzle: '#ffffff', paws: '#ffffff', apron: '#ffb8c8', bell: '#e05a6a', accent: '#ffb8c8' } },
  kannushi:  { name: '神主', title: '猫神社の神主', elem: 'imaginary', face: 'gentle',
    look: { fur: '#f8f4ec', pattern: 'solid', eye: '#6a6aa8', muzzle: '#ffffff', cap: '#2a2a34', capType: 'shrine', vest: '#ffffff', accent: '#e05a6a' } },
  koneko_a:  { name: 'こねこのチビ', title: '村の子ども', elem: 'wind', face: 'smile', scale: 0.72,
    look: { fur: '#d8a870', pattern: 'tabby', patches: ['#a87040'], eye: '#4aa8e8', muzzle: '#fff4e0', paws: '#fff4e0', bell: '#4aa8e8', accent: '#4aa8e8' } },
  koneko_b:  { name: 'こねこのモモ', title: '村の子ども', elem: 'imaginary', face: 'smile', scale: 0.72,
    look: { fur: '#ffffff', pattern: 'spots', patches: ['#8a8a96'], eye: '#e8a040', muzzle: '#ffffff', ribbon: '#ff8ab8', accent: '#ff8ab8' } },
  murabito_a:{ name: 'シャム爺', title: '村の物知り', elem: 'wind', face: 'neutral',
    look: { fur: '#f4e8d0', pattern: 'point', patches: ['#6a5040'], eye: '#4a8ae8', muzzle: '#f4e8d0', scarf: '#6ab85a', accent: '#6ab85a' } },
  murabito_b:{ name: 'サビ', title: 'ミケのおとなり', elem: 'fire', face: 'smile',
    look: { fur: '#4a3a34', pattern: 'calico', patches: ['#e89a4a', '#2a2224'], eye: '#e8c040', muzzle: '#6a5a50', accent: '#e89a4a' } },
  // ---------------- ほしふる森 ----------------
  king_npc:  { name: 'キングネズミ', title: 'ネズミの王国の王', elem: 'physical', face: 'sad', scale: 1.25,
    look: { species: 'mouse', fur: '#b8b0c4', eye: '#ff5a6a', muzzle: '#f0ecf4', paws: '#f0c8d0', earIn: '#f2b8c0', crown: '#ffcf4a', cape: '#8a2a3a', capeIn: '#ffcf4a', belly: '#f0ecf4', accent: '#ffcf4a' }, gear: { weapon: 'fork' } },
  kodomo_nezumi: { name: 'こどもネズミ', title: 'ネズミの王国の子', elem: 'physical', face: 'smile', scale: 0.7,
    look: { species: 'mouse', fur: '#c8c0d0', eye: '#3a2a3a', muzzle: '#f0ecf4', earIn: '#f2b8c0', accent: '#ffcf4a' } },
  // ---------------- ミャオ街道 ----------------
  chaya:     { name: '茶屋のおやじ', title: '茶屋「ねこじゃらし」', elem: 'wind', face: 'gentle',
    look: { fur: '#e8d0a8', pattern: 'tabby', patches: ['#b89868'], eye: '#6a8a3a', muzzle: '#fff4e0', kerchief: '#5a8ad8', apron: '#fff8f0', accent: '#5a8ad8' } },
  tabibito_a:{ name: '旅の猫', title: '街道を行く旅人', elem: 'wind', face: 'neutral',
    look: { fur: '#9a8a7a', pattern: 'solid', eye: '#c8a060', muzzle: '#c8b8a8', cape: '#6a8a5a', capeIn: '#c8d8a8', kerchief: '#8a6a4a', accent: '#6a8a5a' } },
  tabibito_b:{ name: '行商の猫', title: '魚を見た旅人', elem: 'lightning', face: 'surprise',
    look: { fur: '#ffffff', pattern: 'spots', patches: ['#2a2a30'], eye: '#4a8ad8', muzzle: '#ffffff', scarf: '#e0453a', accent: '#e0453a' } },
  bukiya2:   { name: '旅の鍛冶屋', title: '街道の鍛冶屋', elem: 'fire', face: 'smile',
    look: { fur: '#8a8a96', pattern: 'tabby', patches: ['#5a5a66'], eye: '#e8a040', muzzle: '#c8c8d0', apron: '#5a4a3a', band: '#e0453a', accent: '#ffb04a' } },
  // ---------------- ニャハハ王国 ----------------
  shimin_a:  { name: '王国の猫', title: '笑わない市民', elem: 'wind', face: 'sad', faceAfter: ['clear:3-3', 'joy'],
    look: { fur: '#b8a898', pattern: 'tabby', patches: ['#8a7a6a'], eye: '#8a8a6a', muzzle: '#d8d0c8', kerchief: '#8a8a96', accent: '#ff8ab8' } },
  shimin_b:  { name: '王国の猫', title: '笑わない市民', elem: 'fire', face: 'sad', faceAfter: ['clear:3-3', 'smile'],
    look: { fur: '#d8c8b8', pattern: 'calico', patches: ['#b8987a', '#6a5a50'], eye: '#6a7a9a', muzzle: '#f0e8e0', accent: '#ffd27a' } },
  shimin_c:  { name: '王国の猫', title: '笑わない市民', elem: 'ice', face: 'worry', faceAfter: ['clear:3-3', 'smile'],
    look: { fur: '#8a8a96', pattern: 'solid', eye: '#c8c86a', muzzle: '#a8a8b0', scarf: '#8a8aa8', accent: '#8ad8ff' } },
  piero_npc: { name: 'ピエロ', title: '笑顔の塔の道化', elem: 'imaginary', face: 'smile',
    look: { fur: '#ffffff', pattern: 'spots', patches: ['#ff8ab8'], eye: '#6a8aff', muzzle: '#ffffff', earIn: '#ffb8c8', nose: '#ff3a4a', cap: '#ff6a8a', capType: 'clown', ruff: '#ffe07a', accent: '#6ad8ff', vest: '#8a5ad8', blush: 0.6 }, gear: { weapon: 'juggle' } },
  douguya2:  { name: '道具屋', title: '王国の道具屋', elem: 'wind', face: 'sad', faceAfter: ['clear:3-3', 'joy'],
    look: { fur: '#c8b8a0', pattern: 'solid', eye: '#6a8a3a', muzzle: '#e8e0d0', glasses: '#3a2a2a', apron: '#8a8a96', accent: '#8ad86a' } },
  yadoya2:   { name: '宿の主人', title: 'わらいねこ亭', elem: 'imaginary', face: 'sad', faceAfter: ['clear:3-3', 'smile'],
    look: { fur: '#6a5a50', pattern: 'tuxedo', eye: '#e8c040', muzzle: '#ffffff', paws: '#ffffff', apron: '#c8c8d0', accent: '#ffd27a' } },
  nyahaha_ou:{ name: 'ニャハハ王', title: '笑いの国の王さま', elem: 'imaginary', face: 'sad', faceAfter: ['clear:3-3', 'joy'], scale: 1.2,
    look: { fur: '#f0c070', pattern: 'tabby', patches: ['#c89040'], eye: '#6a8a3a', muzzle: '#fff4e0', paws: '#fff4e0', crown: '#ffcf4a', cape: '#c83a3a', capeIn: '#ffffff', belly: '#fff4e0', beard: '#fff8ec', accent: '#ffcf4a' } },
  daijin:    { name: '大臣', title: 'ニャハハ王国の大臣', elem: 'wind', face: 'worry',
    look: { fur: '#8a8a8a', pattern: 'solid', eye: '#6a8ad8', muzzle: '#b8b8b8', glasses: '#2a2a3a', vest: '#3a4a8a', accent: '#8ad8ff' } },
  eihei:     { name: '衛兵', title: 'ニャハハ城の衛兵', elem: 'physical', face: 'serious',
    look: { fur: '#d8b890', pattern: 'solid', eye: '#6a5a3a', muzzle: '#f0e0c8', cap: '#c8c8d8', capType: 'helmet', vest: '#c83a3a', accent: '#ffcf4a' }, gear: { weapon: 'fork' } },
  // ---------------- くろねこ谷 ----------------
  kurone:    { name: 'クロネ婆', title: 'くろねこ谷の長老', elem: 'quantum', face: 'gentle',
    look: { fur: '#3a3440', pattern: 'solid', eye: '#e8c040', muzzle: '#4a4450', kerchief: '#8a5aa8', vest: '#5a4a6a', accent: '#c8a8ff' }, gear: { weapon: 'cane' } },
  tanimura:  { name: '谷の猫', title: 'くろねこ谷の住人', elem: 'quantum', face: 'neutral',
    look: { fur: '#5a5060', pattern: 'solid', eye: '#c8a8ff', muzzle: '#6a6070', scarf: '#6a4a8a', accent: '#c8a8ff' } },
  yadoya3:   { name: '谷の宿の主人', title: 'くろねこ谷の宿', elem: 'quantum', face: 'gentle',
    look: { fur: '#2e2a36', pattern: 'tuxedo', eye: '#8ad8a8', muzzle: '#ffffff', apron: '#8a7aa8', accent: '#c8a8ff' } },
  // クロのかつての仲間（黒影洞窟の幻）
  hayate:    { name: 'ハヤテ', title: '「影の四剣」のリーダー', elem: 'wind', face: 'smile',
    look: { fur: '#9a7a5a', pattern: 'tabby', patches: ['#6a4a2a'], eye: '#6ad8a8', muzzle: '#e8d8c0', scarf: '#3a6ad8', scar: true, material: 'ghost', ghostCol: '#6a8aff', accent: '#6ad8a8' }, gear: { weapon: 'sword' } },
  rin:       { name: 'リン', title: '「影の四剣」の弓使い', elem: 'ice', face: 'gentle',
    look: { fur: '#d8d8e0', pattern: 'point', patches: ['#6a6a7a'], eye: '#8ad8ff', muzzle: '#f0f0f4', ribbon: '#8ad8ff', material: 'ghost', ghostCol: '#8ab8ff', accent: '#8ad8ff' } },
  gorou:     { name: 'ゴロウ', title: '「影の四剣」の力持ち', elem: 'physical', face: 'joy', scale: 1.18,
    look: { fur: '#e8a050', pattern: 'tabby', patches: ['#b87030'], eye: '#8a6a3a', muzzle: '#fff0d8', belly: '#fff0d8', band: '#e0453a', material: 'ghost', ghostCol: '#ffb86a', accent: '#ffb86a' } },
  // ---------------- 魔王領 ----------------
  mazoku_yukyu: { name: '魔族兵のベル', title: '有給を申請中', elem: 'quantum', face: 'worry',
    look: { fur: '#8a6ad8', eye: '#ffe07a', muzzle: '#b8a0f0', paws: '#b8a0f0', earIn: '#ff9ac8', horns: '#fff0d8', wings: '#4a2a7a', cap: '#5a5a6a', capType: 'helmet', accent: '#ffcf4a' } },
  mazoku_nurse: { name: '保健係のナース', title: '魔王城の保健係', elem: 'imaginary', face: 'smile',
    look: { fur: '#ff9ac8', eye: '#7a4ad8', muzzle: '#ffd0e4', paws: '#ffd0e4', earIn: '#ff6a9a', horns: '#fff0d8', wings: '#8a3a6a', cap: '#ffffff', capType: 'chef', apron: '#ffffff', accent: '#ff6a9a' } },
  mazoku_c:  { name: '魔族兵', title: '魔王軍の兵士', elem: 'quantum', face: 'neutral',
    look: { fur: '#7a5ac8', eye: '#ffe07a', muzzle: '#a890e0', earIn: '#ff9ac8', horns: '#fff0d8', wings: '#3a1a6a', accent: '#ffcf4a' } },
  mazoku_nurse2: { name: '保健係', title: '魔王城の保健係', elem: 'imaginary', face: 'smile',
    look: { fur: '#ffb8d8', eye: '#7a4ad8', muzzle: '#ffe0ec', earIn: '#ff6a9a', horns: '#fff0d8', wings: '#8a3a6a', cap: '#ffffff', capType: 'chef', apron: '#ffffff', accent: '#ff6a9a' } },
  mazoku_d:  { name: '魔族兵', title: '休憩中', elem: 'quantum', face: 'sleepy',
    look: { fur: '#6a5ab8', eye: '#ffe07a', muzzle: '#9a8ad8', earIn: '#ff9ac8', horns: '#fff0d8', wings: '#3a1a6a', scarf: '#ff8ad8', accent: '#ffcf4a' } },
};

// ふだんの表情（物語が進むと変わる人もいる）
function defaultFace(key) {
  const n = NPCS[key]; if (!n) return (typeof CHAR_ACT !== 'undefined' && CHAR_ACT[key] && CHAR_ACT[key].face) || 'neutral';
  if (n.faceAfter && storyCond(n.faceAfter[0])) return n.faceAfter[1];
  return n.face || 'neutral';
}
