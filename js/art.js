'use strict';
// ============================================================
//  SVGアート：キャラクター肖像・敵スプライト
// ============================================================
let SVG_SEQ = 0;

function avatarSVG(key, opts = {}) {
  if (typeof GFX !== 'undefined' && GFX.portraits[key]) return `<img class="avatar" src="${GFX.portraits[key]}" alt="" draggable="false">`;
  const c = CHARS[key] || NPCS[key], L = c.look, col = ELEMENTS[c.elem].color;
  const id = 'av' + (++SVG_SEQ);
  const skin = L.skin || '#f9e2d2';
  const hair = L.hair;
  const bg = opts.noBg ? '' : `<rect width="100" height="100" fill="url(#${id}b)"/>
    <circle cx="80" cy="18" r="30" fill="${col}" opacity=".18"/>`;

  const back = {
    long: `<path d="M27 46 Q22 80 26 100 L74 100 Q78 80 73 46 Q72 18 50 18 Q28 18 27 46Z" fill="${hair}"/>`,
    twin: `<path d="M30 40 Q10 58 16 96 Q24 84 29 70 Q32 56 33 46Z M70 40 Q90 58 84 96 Q76 84 71 70 Q68 56 67 46Z" fill="${hair}"/>
           <circle cx="29" cy="36" r="4" fill="${L.accent}"/><circle cx="71" cy="36" r="4" fill="${L.accent}"/>`,
    pony: `<path d="M64 26 Q92 30 88 70 Q86 86 78 96 Q80 72 70 52Z" fill="${hair}"/>`,
    bob: `<path d="M27 48 Q24 72 32 76 L68 76 Q76 72 73 48 Q72 20 50 20 Q28 20 27 48Z" fill="${hair}"/>`,
    short: `<path d="M30 50 Q28 64 33 66 L67 66 Q72 64 70 50 Q70 22 50 22 Q30 22 30 50Z" fill="${hair}"/>`,
    spiky: `<path d="M29 50 Q24 66 30 70 L70 70 Q76 66 71 50 Q72 22 50 21 Q28 22 29 50Z" fill="${hair}"/>`,
  }[L.style] || '';

  const spikes = L.style === 'spiky'
    ? `<path d="M34 30 L28 14 L42 24 L46 8 L54 22 L64 10 L64 26 L76 20 L68 34Z" fill="${hair}"/>` : '';

  const acc = {
    ahoge: `<path d="M50 22 Q56 8 64 10 Q56 12 52 23Z" fill="${hair}"/>`,
    halo: `<ellipse cx="50" cy="16" rx="18" ry="4" fill="none" stroke="${L.accent}" stroke-width="2" opacity=".9"/>`,
    pin: `<path d="M62 30 l6 -3 l1 6 z" fill="${L.accent}"/><circle cx="66" cy="31" r="2" fill="#fff" opacity=".8"/>`,
    horn: `<path d="M36 28 L30 14 L40 25Z M64 28 L70 14 L60 25Z" fill="${L.accent}"/>`,
    star: `<path d="M68 26 l2 4 4 .5 -3 3 .8 4 -3.8 -2 -3.8 2 .8 -4 -3 -3 4 -.5z" fill="${L.accent}"/>`,
    butterfly: `<path d="M64 28 q6 -8 10 -2 q-4 4 -10 2z M64 28 q8 0 8 6 q-6 0 -8 -6z" fill="${L.accent}" opacity=".95"/>`,
    phones: `<rect x="26" y="44" width="6" height="12" rx="3" fill="${L.accent}"/><rect x="68" y="44" width="6" height="12" rx="3" fill="${L.accent}"/>
             <path d="M29 46 Q30 20 50 20 Q70 20 71 46" fill="none" stroke="#222" stroke-width="2"/>`,
  }[L.acc] || '';

  return `<svg class="avatar" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
  <defs>
    <radialGradient id="${id}b" cx="50%" cy="40%" r="75%"><stop offset="0" stop-color="${col}" stop-opacity=".55"/><stop offset="1" stop-color="#0a0e1c"/></radialGradient>
    <linearGradient id="${id}h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient>
  </defs>
  ${bg}
  ${back}
  <path d="M16 100 Q18 80 38 75 L50 82 L62 75 Q82 80 84 100Z" fill="${L.outfit}"/>
  <path d="M38 75 L50 90 L62 75" fill="none" stroke="${L.accent}" stroke-width="2.2"/>
  <circle cx="50" cy="93" r="2.6" fill="${L.accent}"/>
  <rect x="45" y="63" width="10" height="14" fill="${skin}"/>
  <rect x="45" y="63" width="10" height="5" fill="#000" opacity=".12"/>
  <path d="M33 49 Q33 70 50 73 Q67 70 67 49 Q67 31 50 31 Q33 31 33 49Z" fill="${skin}"/>
  <ellipse cx="40" cy="61" rx="3.4" ry="1.6" fill="#ff8d8d" opacity=".35"/>
  <ellipse cx="60" cy="61" rx="3.4" ry="1.6" fill="#ff8d8d" opacity=".35"/>
  <g>
    <ellipse cx="42.5" cy="54" rx="3.6" ry="4.8" fill="${L.eye}"/>
    <ellipse cx="57.5" cy="54" rx="3.6" ry="4.8" fill="${L.eye}"/>
    <ellipse cx="42.5" cy="55.5" rx="2" ry="2.6" fill="#000" opacity=".45"/>
    <ellipse cx="57.5" cy="55.5" rx="2" ry="2.6" fill="#000" opacity=".45"/>
    <circle cx="43.8" cy="52.2" r="1.3" fill="#fff"/><circle cx="58.8" cy="52.2" r="1.3" fill="#fff"/>
    <path d="M38 50 Q42.5 47.6 47 49.4" stroke="#2a1d22" stroke-width="1.3" fill="none"/>
    <path d="M53 49.4 Q57.5 47.6 62 50" stroke="#2a1d22" stroke-width="1.3" fill="none"/>
  </g>
  <path d="M47.8 64.5 Q50 65.8 52.2 64.5" stroke="#b0605a" stroke-width="1" fill="none"/>
  <path d="M31 54 Q27 23 50 22 Q73 23 69 54 Q68 42 62 36 Q59 45 53 39 Q47 47 42 38 Q37 45 31 54Z" fill="${hair}"/>
  <path d="M31 54 Q27 23 50 22 Q73 23 69 54 Q68 42 62 36 Q59 45 53 39 Q47 47 42 38 Q37 45 31 54Z" fill="url(#${id}h)"/>
  ${spikes}
  ${acc}
</svg>`;
}

// ------------------------------------------------------------
//  敵スプライト
// ------------------------------------------------------------
function enemySVG(key) {
  const d = ENEMIES[key], c = d.color, id = 'en' + (++SVG_SEQ);
  const body = '#191628', edge = c;
  const core = `<radialGradient id="${id}c"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="${c}"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`;
  const metal = `<linearGradient id="${id}m" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3a3552"/><stop offset="1" stop-color="#110f1c"/></linearGradient>`;
  const S = (vb, inner) => `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg"><defs>${core}${metal}</defs>${inner}</svg>`;
  const st = `stroke="${edge}" stroke-width="1.4" stroke-linejoin="round"`;

  switch (d.shape) {
    case 'humanoid': return S('0 0 100 130', `
      <path d="M50 8 L61 23 L50 36 L39 23Z" fill="url(#${id}m)" ${st}/>
      <path d="M44 23 L56 23" stroke="${c}" stroke-width="2.5"/>
      <path d="M35 40 L65 40 L61 80 L50 88 L39 80Z" fill="url(#${id}m)" ${st}/>
      <path d="M35 42 L22 72 L29 75 L41 52Z" fill="${body}" ${st}/>
      <path d="M65 42 L80 58 L96 30 L86 66 L60 54Z" fill="${body}" ${st}/>
      <path d="M86 66 L96 30" stroke="${c}" stroke-width="2"/>
      <path d="M42 84 L37 124 L45 124 L50 92 L55 124 L63 124 L58 84Z" fill="${body}" ${st}/>
      <circle cx="50" cy="58" r="10" fill="url(#${id}c)"/>`);
    case 'brute': return S('0 0 120 130', `
      <path d="M60 10 L74 22 L70 36 L50 36 L46 22Z" fill="url(#${id}m)" ${st}/>
      <path d="M52 24 L68 24" stroke="${c}" stroke-width="3"/>
      <path d="M30 40 L90 40 L96 70 L80 92 L40 92 L24 70Z" fill="url(#${id}m)" ${st}/>
      <path d="M30 44 L8 86 L20 92 L38 62Z M90 44 L112 86 L100 92 L82 62Z" fill="${body}" ${st}/>
      <path d="M100 92 L118 110 L106 116 L94 96Z" fill="${c}" opacity=".8"/>
      <path d="M44 92 L40 126 L52 126 L60 98 L68 126 L80 126 L76 92Z" fill="${body}" ${st}/>
      <circle cx="60" cy="64" r="12" fill="url(#${id}c)"/>`);
    case 'drone': return S('0 0 120 110', `
      <ellipse cx="60" cy="52" rx="48" ry="10" fill="none" stroke="${c}" stroke-width="1.5" opacity=".6"/>
      <path d="M20 40 L4 30 M100 40 L116 30" stroke="${edge}" stroke-width="3"/>
      <ellipse cx="6" cy="28" rx="10" ry="2.5" fill="${c}" opacity=".7"/><ellipse cx="114" cy="28" rx="10" ry="2.5" fill="${c}" opacity=".7"/>
      <circle cx="60" cy="50" r="30" fill="url(#${id}m)" ${st}/>
      <circle cx="60" cy="50" r="14" fill="#0b0a14" stroke="${c}" stroke-width="2"/>
      <circle cx="60" cy="50" r="9" fill="url(#${id}c)"/>
      <path d="M44 80 L40 100 M60 80 L60 104 M76 80 L80 100" stroke="${edge}" stroke-width="2"/>`);
    case 'beast': return S('0 0 140 110', `
      <path d="M20 60 Q30 30 70 32 Q104 30 116 50 L134 44 L126 62 Q128 74 116 78 L110 104 L100 104 L98 80 L50 82 L44 104 L34 104 L34 80 Q16 76 20 60Z" fill="url(#${id}m)" ${st}/>
      <path d="M50 32 L56 14 L62 32 M70 30 L78 10 L84 32 M90 34 L100 18 L102 38" fill="${c}" opacity=".85"/>
      <circle cx="120" cy="54" r="3.5" fill="${c}"/>
      <path d="M124 64 L132 66 L126 70Z" fill="#fff" opacity=".8"/>
      <circle cx="70" cy="58" r="11" fill="url(#${id}c)"/>`);
    case 'spirit': return S('0 0 100 130', `
      <path d="M50 6 Q70 30 64 44 Q84 40 80 70 Q84 104 50 124 Q16 104 20 70 Q16 40 36 44 Q30 30 50 6Z" fill="${c}" opacity=".35"/>
      <path d="M50 22 Q64 42 58 54 Q74 54 70 78 Q70 102 50 114 Q30 102 30 78 Q26 54 42 54 Q36 42 50 22Z" fill="url(#${id}m)" ${st}/>
      <circle cx="43" cy="70" r="3" fill="${c}"/><circle cx="57" cy="70" r="3" fill="${c}"/>
      <circle cx="50" cy="88" r="10" fill="url(#${id}c)"/>`);
    case 'wraith': return S('0 0 110 130', `
      <path d="M55 6 Q82 10 84 44 L96 118 L80 106 L70 124 L58 108 L46 124 L36 106 L18 118 L28 44 Q30 10 55 6Z" fill="url(#${id}m)" ${st}/>
      <path d="M40 34 Q55 26 70 34 L66 50 Q55 56 44 50Z" fill="#07060c"/>
      <circle cx="49" cy="41" r="2.8" fill="${c}"/><circle cx="61" cy="41" r="2.8" fill="${c}"/>
      <path d="M28 60 L6 86 M84 60 L104 86" stroke="${c}" stroke-width="2" opacity=".8"/>
      <circle cx="55" cy="76" r="11" fill="url(#${id}c)"/>`);
    case 'knight': return S('0 0 140 170', `
      <path d="M70 6 L84 20 L82 42 L58 42 L56 20Z" fill="url(#${id}m)" ${st}/>
      <path d="M62 26 L78 26" stroke="${c}" stroke-width="3.5"/>
      <path d="M70 6 L66 -6 L74 -6Z" fill="${c}"/>
      <path d="M34 48 L106 48 L112 88 L92 118 L48 118 L28 88Z" fill="url(#${id}m)" ${st}/>
      <path d="M34 48 L14 58 L10 92 L26 98 L30 64Z M106 48 L126 58 L130 92 L114 98 L110 64Z" fill="${body}" ${st}/>
      <path d="M124 94 L132 160 L126 164 L118 96Z" fill="${c}" opacity=".85"/>
      <path d="M50 118 L44 166 L60 166 L70 128 L80 166 L96 166 L90 118Z" fill="${body}" ${st}/>
      <circle cx="70" cy="80" r="15" fill="url(#${id}c)"/>`);
    case 'golem': return S('0 0 160 170', `
      <rect x="58" y="6" width="44" height="34" rx="4" fill="url(#${id}m)" ${st}/>
      <rect x="64" y="18" width="32" height="6" fill="${c}"/>
      <path d="M30 46 L130 46 L140 110 L116 132 L44 132 L20 110Z" fill="url(#${id}m)" ${st}/>
      <rect x="2" y="50" width="30" height="70" rx="6" fill="${body}" ${st}/>
      <rect x="128" y="50" width="30" height="70" rx="6" fill="${body}" ${st}/>
      <rect x="132" y="112" width="22" height="30" fill="#222" stroke="${c}"/>
      <path d="M50 132 L46 166 L72 166 L76 138 L84 138 L88 166 L114 166 L110 132Z" fill="${body}" ${st}/>
      <circle cx="80" cy="88" r="18" fill="url(#${id}c)"/>`);
    case 'boss': return S('0 0 220 220', `
      <circle cx="110" cy="100" r="92" fill="none" stroke="${c}" stroke-width="1.5" opacity=".5" stroke-dasharray="6 10"/>
      <circle cx="110" cy="100" r="74" fill="none" stroke="${c}" stroke-width="1" opacity=".35"/>
      <path d="M110 10 L128 40 L160 30 L150 64 L190 76 L156 100 L190 124 L150 136 L160 170 L128 160 L110 196 L92 160 L60 170 L70 136 L30 124 L64 100 L30 76 L70 64 L60 30 L92 40Z" fill="url(#${id}m)" ${st}/>
      <circle cx="110" cy="100" r="40" fill="#0b0914" stroke="${c}" stroke-width="2"/>
      <circle cx="110" cy="100" r="30" fill="url(#${id}c)"/>
      <path d="M110 70 L118 100 L110 130 L102 100Z" fill="#fff" opacity=".7"/>`);
    case 'empress': return S('0 0 200 230', `
      <path d="M100 4 L108 24 L122 12 L120 34 L138 28 L126 46 L74 46 L62 28 L80 34 L78 12 L92 24Z" fill="${c}" opacity=".9"/>
      <path d="M100 44 L118 58 L114 84 L86 84 L82 58Z" fill="url(#${id}m)" ${st}/>
      <path d="M90 66 L96 66 M104 66 L110 66" stroke="${c}" stroke-width="3"/>
      <path d="M60 92 L140 92 L150 150 L184 224 L16 224 L50 150Z" fill="url(#${id}m)" ${st}/>
      <path d="M60 92 L20 120 L6 108 L50 84Z M140 92 L180 120 L194 108 L150 84Z" fill="${body}" ${st}/>
      <path d="M180 120 L198 40 L190 124Z" fill="${c}" opacity=".85"/>
      <path d="M70 170 L100 150 L130 170 L100 224Z" fill="${c}" opacity=".25"/>
      <circle cx="100" cy="122" r="18" fill="url(#${id}c)"/>`);
    case 'dragon': return S('0 0 260 200', `
      <path d="M20 140 Q40 80 90 90 Q120 40 170 60 Q220 40 244 70 L256 64 L250 84 Q240 110 206 104 Q180 150 130 150 Q90 180 40 170 Q10 170 20 140Z" fill="url(#${id}m)" ${st}/>
      <path d="M100 88 L110 50 L118 86 M130 72 L144 30 L150 70 M160 64 L178 28 L180 66" fill="${c}" opacity=".85"/>
      <path d="M40 140 Q70 190 120 170" fill="none" stroke="${c}" stroke-width="2" opacity=".6"/>
      <circle cx="234" cy="74" r="4.5" fill="${c}"/>
      <path d="M244 88 L258 94 L244 96Z" fill="#fff"/>
      <circle cx="140" cy="112" r="20" fill="url(#${id}c)"/>`);
    case 'deity': return S('0 0 240 240', `
      <circle cx="120" cy="110" r="104" fill="none" stroke="${c}" stroke-width="2" opacity=".5"/>
      <circle cx="120" cy="110" r="86" fill="none" stroke="${c}" stroke-width="1" stroke-dasharray="2 8" opacity=".7"/>
      <path d="M120 6 L132 60 L186 40 L150 84 L226 110 L150 136 L186 180 L132 160 L120 214 L108 160 L54 180 L90 136 L14 110 L90 84 L54 40 L108 60Z" fill="url(#${id}m)" ${st}/>
      <ellipse cx="120" cy="110" rx="34" ry="46" fill="#07060c" stroke="${c}" stroke-width="2"/>
      <path d="M100 100 Q120 86 140 100 Q120 114 100 100Z" fill="${c}"/>
      <circle cx="120" cy="100" r="6" fill="#fff"/>
      <circle cx="120" cy="136" r="16" fill="url(#${id}c)"/>`);
  }
  return '';
}

// 行動順アイコン用の小さな敵アイコン
function enemyMini(key) {
  const d = ENEMIES[key];
  return `<div class="mini-enemy" style="--c:${d.color}">${d.name.replace(/^.*[・ ]/, '').slice(0, 1)}</div>`;
}

function elemIcon(el, extra = '') {
  const e = ELEMENTS[el];
  return `<span class="el-icon ${extra}" style="--c:${e.color}" title="${e.name}">${e.glyph}</span>`;
}

function stars(n) { return '<span class="stars r' + n + '">' + '★'.repeat(n) + '</span>'; }
