'use strict';
// ============================================================
//  画面：タイトル／列車（ハブ）／冒険／編成／キャラ／ワープ／模擬宇宙
// ============================================================
const App = {
  el: null,
  mount(node) { [...this.el.children].forEach(c => { if (c.id !== 'gl') c.remove(); }); this.el.appendChild(node); },
  go(fn, ...args) {
    Game.activeBattle = null; Game.activeField = null; Game.activeDialog = null;
    // 探索から離れる場合は保持していたフィールドを破棄する
    if (GFX.view && GFX.view.persist && fn !== FieldScreen) GFX.view.persist = false;
    const n = fn(...args); if (n) this.mount(n);
  },
};

function h(str) { const t = document.createElement('template'); t.innerHTML = str.trim(); return t.content.firstElementChild; }
function on(root, sel, ev, fn) { root.querySelectorAll(sel).forEach(el => el.addEventListener(ev, e => { Sfx.click(); fn(el, e); })); }

function topBar(title, back = true) {
  const d = Save.data;
  return `<div class="topbar">
    ${back ? '<button class="back" data-back>‹</button>' : ''}
    <div class="tb-title">${title}</div>
    <div class="currency">
      <span class="c-item" title="星玉"><i class="ic-jade"></i>${fmt(d.jade)}</span>
      <span class="c-item" title="旅情の記録（経験値）"><i class="ic-exp"></i>${fmt(d.expPool)}</span>
      <span class="c-item" title="秘技ポイント"><i class="ic-tp"></i>${d.tp}/5</span>
    </div></div>`;
}
function wireBack(node, fn = () => App.go(HubScreen)) { const b = node.querySelector('[data-back]'); if (b) b.onclick = () => { Sfx.click(); fn(); }; }

function charChip(key, extra = '') {
  const c = CHARS[key], o = Save.data.owned[key];
  return `<div class="chip r${c.rarity} ${extra}" data-key="${key}" style="--c:${ELEMENTS[c.elem].color}">
    <div class="chip-face">${avatarSVG(key)}</div>
    <div class="chip-el">${elemIcon(c.elem)}</div>
    <div class="chip-name">${c.name}</div>
    ${o ? `<div class="chip-lv">Lv.${o.lv}${o.eid ? ` <b>E${o.eid}</b>` : ''}</div>` : '<div class="chip-lv">未所持</div>'}
  </div>`;
}

// ------------------------------------------------------------
//  タイトル
// ------------------------------------------------------------
function TitleScreen() {
  GFX.show('title', () => new TitleView());
  const s = h(`<div class="screen title">
    <div class="t-rings"><i></i><i></i><i></i></div>
    <div class="t-logo">
      <div class="t-en">GALAXY RAIL</div>
      <h1>銀河鉄路</h1>
      <div class="t-name">ノクターン</div>
    </div>
    <div class="t-start">— クリックして開拓を始める —</div>
    <div class="t-note">ターン制コマンドRPG ／ ファンメイド・オリジナル作品</div>
  </div>`);
  s.onclick = () => { Sfx.init(); Sfx.select(); App.go(HubScreen); };
  return s;
}

// ------------------------------------------------------------
//  列車（ハブ）
// ------------------------------------------------------------
function HubScreen() {
  const lead = Save.data.team[0];
  const v3 = GFX.show('hub', () => new ShowcaseView(lead, { screenX: 330 }));
  if (v3 && (!v3.model || v3.model.key !== lead)) v3.setChar(lead);
  const s = h(`<div class="screen hub">
    ${topBar('星海列車 ノクターン号', false)}
    <div class="hub-hero" style="--c:${ELEMENTS[CHARS[lead].elem].color}">
      ${GFX.ok ? '<div class="hero-drag" title="ドラッグで回転"></div>' : `<div class="hero-art">${avatarSVG(lead)}</div>`}
      <div class="hero-cap"><div class="hero-name">${CHARS[lead].name}</div><div class="hero-title">${CHARS[lead].title}</div></div>
    </div>
    ${(() => { const c = Story.current(); return c ? `<div class="hub-quest" data-quest><small>開拓任務｜${c.ch.title}</small><b>◆ ${c.step.g}</b></div>` : ''; })()}
    <div class="hub-menu">
      <button class="hm" data-go="stages"><b>開拓任務</b><small>STORY</small><em>物語を進めて星核を追う</em></button>
      <button class="hm" data-go="field"><b>探索</b><small>EXPLORE</small><em>フィールドを歩いて敵や宝箱を探す</em></button>
      <button class="hm" data-go="su"><b>模擬宇宙</b><small>SIMULATED UNIVERSE</small><em>祝福を集めて深部を目指す</em></button>
      <button class="hm gold" data-go="warp"><b>ワープ</b><small>WARP</small><em>新たな仲間と出会う</em></button>
      <button class="hm" data-go="chars"><b>キャラクター</b><small>CHARACTERS</small><em>育成・スキル確認</em></button>
      <button class="hm" data-go="team"><b>編成</b><small>TEAM</small><em>出撃メンバーの変更</em></button>
    </div>
    <div class="hub-foot">
      <button class="link" data-reset>データを初期化</button>
      <span>操作：Q 通常攻撃 ／ E スキル ／ 1〜4 必殺技 ／ A・D 対象選択 ／ Space 決定 ／ V オート ／ F 倍速</span>
    </div>
  </div>`);
  const map = { stages: () => App.go(StoryScreen), field: () => App.go(FieldSelect), su: () => App.go(SuHome), warp: () => App.go(WarpScreen),
    chars: () => App.go(CharScreen), team: () => App.go(TeamScreen) };
  on(s, '[data-go]', 'click', el => map[el.dataset.go]());
  const q = s.querySelector('[data-quest]'); if (q) q.onclick = () => { Sfx.select(); Story.run(); };
  if (v3) v3.bindDrag(s.querySelector('.hero-drag'));
  s.querySelector('[data-reset]').onclick = () => {
    if (confirm('セーブデータを初期化しますか？')) { Save.reset(); App.go(HubScreen); }
  };
  return s;
}

// ------------------------------------------------------------
//  冒険（ステージ選択）
// ------------------------------------------------------------
function allStages() { return CHAPTERS.flatMap((c, ci) => c.stages.map(s => ({ ...s, ci }))); }
function stageUnlocked(id) {
  const list = allStages(), i = list.findIndex(s => s.id === id);
  return i === 0 || !!Save.data.cleared[list[i - 1].id];
}

function StageScreen(ci, sid) {
  const list = allStages();
  if (ci == null) {
    const next = list.find(s => !Save.data.cleared[s.id] && stageUnlocked(s.id)) || list[list.length - 1];
    ci = next.ci; sid = next.id;
  }
  const ch = CHAPTERS[ci];
  const st = ch.stages.find(s => s.id === sid) || ch.stages[0];
  const techs = new Set();

  const enemyKeys = [...new Set(st.waves.flat())];
  const v3 = GFX.show('stage:' + ch.bg, () => new SceneryView(ch.bg, { screenX: 936, screenY: 250, close: true }));
  if (v3) v3.setEnemies(enemyKeys);
  const firstJade = st.boss ? 200 : 80;
  const s = h(`<div class="screen stages bg-${ch.bg}">
    ${topBar('冒険')}
    <div class="st-chapters">${CHAPTERS.map((c, i) => `
      <button class="st-ch ${i === ci ? 'on' : ''} ${stageUnlocked(c.stages[0].id) ? '' : 'locked'}" data-ci="${i}">
        <small>第${i + 1}章</small><b>${c.name}</b></button>`).join('')}</div>
    <div class="st-list">
      <div class="st-desc">${ch.desc}</div>
      ${GFX.ok ? `<button class="btn small st-explore" data-explore ${fieldUnlocked(ci) ? '' : 'disabled'}>このエリアを探索する ›</button>` : ''}
      ${ch.stages.map(x => `
        <button class="st-item ${x.id === st.id ? 'on' : ''} ${stageUnlocked(x.id) ? '' : 'locked'} ${x.boss ? 'boss' : ''}" data-sid="${x.id}">
          <span class="st-id">${x.id}</span><span class="st-nm">${x.name}</span>
          <span class="st-lv">Lv.${x.lv}</span>${Save.data.cleared[x.id] ? '<span class="st-ok">✓</span>' : ''}
        </button>`).join('')}
    </div>
    <div class="st-detail">
      <div class="sd-head"><span class="st-id">${st.id}</span><h2>${st.name}</h2><span class="sd-lv">推奨Lv.${st.lv}</span></div>
      <div class="sd-sec">出現する敵</div>
      ${GFX.ok ? `<div class="sd-stage3d"></div><div class="sd-weakrow">${enemyKeys.map(k => `<span style="--c:${ENEMIES[k].color}"><b>${ENEMIES[k].name}</b>${ENEMIES[k].weak.map(w => elemIcon(w)).join('')}</span>`).join('')}</div>` : ''}
      <div class="sd-enemies ${GFX.ok ? 'hidden' : ''}">${enemyKeys.map(k => {
        const e = ENEMIES[k];
        return `<div class="sd-en ${e.boss ? 'boss' : e.elite ? 'elite' : ''}" style="--c:${e.color}">
          <div class="sd-sprite">${enemySVG(k)}</div><div class="sd-ename">${e.name}</div>
          <div class="sd-weak">${e.weak.map(w => elemIcon(w)).join('')}</div></div>`;
      }).join('')}</div>
      <div class="sd-sec">報酬</div>
      <div class="sd-rew">
        <span><i class="ic-exp"></i>キャラEXP ${fmt((80 + st.lv * 30) * st.waves.length)}</span>
        ${Save.data.cleared[st.id] ? '<span class="dim">初回報酬 受取済</span>' : `<span><i class="ic-jade"></i>初回 星玉 ${firstJade}</span>`}
      </div>
      <div class="sd-sec">出撃メンバー <small>クリックで秘技を使用（秘技ポイント1消費）</small></div>
      <div class="sd-team">${Save.data.team.map(k => `
        <div class="sd-mem" data-k="${k}" title="${CHARS[k].technique.name}：${CHARS[k].technique.desc}">
          ${charChip(k)}<div class="tech-tag">秘技</div></div>`).join('')}
        <button class="btn small" data-edit>編成変更</button>
      </div>
      <div class="sd-tech"></div>
      <button class="btn gold big" data-start ${stageUnlocked(st.id) ? '' : 'disabled'}>戦闘開始</button>
    </div>
  </div>`);
  wireBack(s);
  on(s, '[data-ci]', 'click', el => { const i = +el.dataset.ci; if (!el.classList.contains('locked')) App.go(StageScreen, i, CHAPTERS[i].stages[0].id); });
  on(s, '[data-sid]', 'click', el => { if (!el.classList.contains('locked')) App.go(StageScreen, ci, el.dataset.sid); });
  s.querySelector('[data-edit]').onclick = () => { Sfx.click(); App.go(TeamScreen, () => App.go(StageScreen, ci, st.id)); };
  const ex = s.querySelector('[data-explore]');
  if (ex) ex.onclick = () => { Sfx.select(); App.go(FieldScreen, ci); };
  const techInfo = s.querySelector('.sd-tech');
  const refreshTech = () => {
    techInfo.innerHTML = techs.size
      ? [...techs].map(k => `<div><b>${CHARS[k].name}「${CHARS[k].technique.name}」</b> ${CHARS[k].technique.desc}</div>`).join('')
      : '<div class="dim">秘技は未使用</div>';
  };
  refreshTech();
  on(s, '.sd-mem', 'click', el => {
    const k = el.dataset.k;
    if (techs.has(k)) techs.delete(k);
    else if (techs.size < Save.data.tp) techs.add(k);
    el.classList.toggle('tech', techs.has(k));
    refreshTech();
  });
  s.querySelector('[data-start]').onclick = () => { Sfx.select(); startStage(ci, st, [...techs]); };
  return s;
}

function startStage(ci, st, techs, after) {
  const ch = CHAPTERS[ci];
  Save.data.tp -= techs.length; Save.save();
  const b = new Battle({
    team: teamMembers(), techs, bg: ch.bg, canRetry: true, loc: st.id,
    title: `${st.id}　${st.name}`,
    waves: st.waves.map(w => w.map(k => ({ key: k, lv: st.lv }))),
    onResult: res => {
      if (!res.win) return '<div class="dim">編成や育成を見直してみよう。</div>';
      const d = Save.data, exp = (80 + st.lv * 30) * st.waves.length;
      let html = '';
      if (!d.cleared[st.id]) { const j = st.boss ? 200 : 80; d.jade += j; html += `<div class="rw"><i class="ic-jade"></i>星玉 +${j}（初回）</div>`; }
      d.cleared[st.id] = true;
      d.expPool += st.lv * 20; d.tp = Math.min(5, d.tp + 1);
      html += `<div class="rw"><i class="ic-exp"></i>旅情の記録 +${st.lv * 20}　<i class="ic-tp"></i>秘技ポイント +1</div>`;
      html += '<div class="rw-team">' + d.team.map(k => {
        const up = grantExp(k, exp);
        return `<div class="rw-mem">${avatarSVG(k)}<span>Lv.${d.owned[k].lv}${up ? `<b> ▲${up}</b>` : ''}</span></div>`;
      }).join('') + '</div>';
      Save.save();
      return html;
    },
    onExit: (res, act) => {
      if (act === 'retry') startStage(ci, st, [], after);
      else if (after) after(res);
      else App.go(StageScreen, ci, st.id);
    },
  });
  b.start();
}

// ------------------------------------------------------------
//  編成
// ------------------------------------------------------------
function TeamScreen(backFn) {
  let slot = 0;
  const v3 = GFX.show('scene:space', () => new SceneryView('space'));
  if (v3) v3.setEnemies([]);
  const s = h(`<div class="screen team">${topBar('編成')}
    <div class="tm-slots"></div>
    <div class="tm-hint">枠を選んでから、下のキャラクターをクリックして配置（同じキャラは入れ替え）</div>
    <div class="tm-roster"></div></div>`);
  wireBack(s, backFn || (() => App.go(HubScreen)));
  const render = () => {
    const t = Save.data.team;
    s.querySelector('.tm-slots').innerHTML = [0, 1, 2, 3].map(i => `
      <div class="tm-slot ${i === slot ? 'on' : ''}" data-slot="${i}">
        <div class="tm-no">${i + 1}</div>
        ${t[i] ? charChip(t[i], 'big') + `<button class="tm-x" data-x="${i}">×</button>
          <div class="tm-path">${PATHS[CHARS[t[i]].path].name}・${ELEMENTS[CHARS[t[i]].elem].name}</div>` : '<div class="tm-empty">空き</div>'}
      </div>`).join('');
    s.querySelector('.tm-roster').innerHTML = Object.keys(CHARS).filter(k => Save.data.owned[k])
      .map(k => charChip(k, t.includes(k) ? 'inteam' : '')).join('');
    on(s, '[data-slot]', 'click', (el, e) => {
      if (e.target.closest('[data-x]')) {
        const i = +e.target.closest('[data-x]').dataset.x;
        if (Save.data.team.filter(Boolean).length > 1) { Save.data.team.splice(i, 1); Save.save(); }
        slot = Math.min(slot, Save.data.team.length); render(); return;
      }
      slot = +el.dataset.slot; render();
    });
    on(s, '.tm-roster .chip', 'click', el => {
      const k = el.dataset.key, team = Save.data.team, at = team.indexOf(k);
      const target = Math.min(slot, team.length);
      if (at >= 0) { if (team[target]) { team[at] = team[target]; team[target] = k; } }
      else team[target] = k;
      Save.data.team = team.filter(Boolean); Save.save();
      slot = Math.min(3, Math.min(target + 1, Save.data.team.length)); render();
    });
  };
  render();
  return s;
}

// ------------------------------------------------------------
//  キャラクター
// ------------------------------------------------------------
function CharScreen(sel) {
  const keys = Object.keys(CHARS).sort((a, b) => (!!Save.data.owned[b] - !!Save.data.owned[a]) || CHARS[b].rarity - CHARS[a].rarity);
  sel = sel || Save.data.team[0];
  const v3 = GFX.show('chars', () => new ShowcaseView(sel, { screenX: 470 }));
  if (v3 && (!v3.model || v3.model.key !== sel)) v3.setChar(sel);
  const c = CHARS[sel], o = Save.data.owned[sel], col = ELEMENTS[c.elem].color;
  const st = o ? charStats(sel, o.lv, o.eid) : charStats(sel, 1, 0);
  const need = o && o.lv < 80 ? expToNext(o.lv) - o.exp : 0;
  const ab = (kind, label, a) => `<div class="ck-ab"><div class="ck-ab-h"><span class="ck-kind">${label}</span><b>${a.name}</b>${a.target ? `<span class="ck-tg">${{ single: '単体', blast: '拡散', aoe: '全体', bounce: 'バウンド', ally: '味方単体', allies: '味方全体', self: '自身' }[a.target]}</span>` : ''}</div><p>${a.desc}</p></div>`;
  const s = h(`<div class="screen chars">${topBar('キャラクター')}
    <div class="ck-list">${keys.map(k => charChip(k, (k === sel ? 'on ' : '') + (Save.data.owned[k] ? '' : 'locked'))).join('')}</div>
    <div class="ck-art ${GFX.ok ? 'is3d' : ''}" style="--c:${col}">${GFX.ok ? '' : avatarSVG(sel)}</div>
    <div class="ck-info" style="--c:${col}">
      <div class="ck-head">${stars(c.rarity)}<h2>${c.name}</h2><div class="ck-title">${c.title}</div>
        <div class="ck-tags">${elemIcon(c.elem)}<span>${ELEMENTS[c.elem].name}</span><span class="ck-path">運命：${PATHS[c.path].name}</span>
        ${o ? `<span class="ck-eid">星魂 ${o.eid}/6</span>` : ''}</div></div>
      ${o ? `<div class="ck-lv"><b>Lv.${o.lv}</b><span>/80</span>
        <div class="bar exp"><i style="width:${o.lv >= 80 ? 100 : o.exp / expToNext(o.lv) * 100}%"></i></div>
        <div class="ck-lvbtns">
          <button class="btn small" data-up="1" ${o.lv >= 80 || Save.data.expPool < need ? 'disabled' : ''}>+1 Lv（${fmt(need)}）</button>
          <button class="btn small" data-up="10" ${o.lv >= 80 || Save.data.expPool < need ? 'disabled' : ''}>+10 Lv</button>
          <button class="btn small" data-up="99" ${o.lv >= 80 || Save.data.expPool < need ? 'disabled' : ''}>最大</button>
        </div></div>` : '<div class="ck-lv dim">未所持 ― ワープで獲得できます</div>'}
      <div class="ck-stats">
        <div><span>HP</span><b>${fmt(st.maxHp)}</b></div><div><span>攻撃力</span><b>${fmt(st.atk)}</b></div>
        <div><span>防御力</span><b>${fmt(st.def)}</b></div><div><span>速度</span><b>${st.spd}</b></div>
        <div><span>会心率</span><b>${Math.round(st.crit * 100)}%</b></div><div><span>会心ダメージ</span><b>${Math.round(st.critDmg * 100)}%</b></div>
        <div><span>撃破特効</span><b>${Math.round(st.be * 100)}%</b></div><div><span>EP上限</span><b>${c.energyMax}</b></div>
      </div>
      <div class="ck-abs">
        ${ab('basic', '通常攻撃', c.basic)}${ab('skill', '戦闘スキル', c.skill)}${ab('ult', `必殺技（EP${c.energyMax}）`, c.ult)}
        ${ab('talent', '天賦', c.talent)}${ab('tech', '秘技', c.technique)}
        <div class="ck-ab"><div class="ck-ab-h"><span class="ck-kind">星魂</span><b>重ね合わせ</b></div><p>星魂1つにつきHP・攻撃力・防御力+6%（最大6）。</p></div>
      </div>
    </div></div>`);
  wireBack(s);
  on(s, '.ck-list .chip', 'click', el => App.go(CharScreen, el.dataset.key));
  if (v3) v3.bindDrag(s.querySelector('.ck-art'));
  on(s, '[data-up]', 'click', el => {
    let n = +el.dataset.up;
    while (n-- > 0 && o.lv < 80) {
      const nd = expToNext(o.lv) - o.exp;
      if (Save.data.expPool < nd) break;
      Save.data.expPool -= nd; grantExp(sel, nd);
    }
    Save.save(); Sfx.select(); App.go(CharScreen, sel);
  });
  return s;
}

// ------------------------------------------------------------
//  ワープ
// ------------------------------------------------------------
function WarpScreen(bk = 'limited') {
  const b = BANNERS[bk], g = Save.data.gacha[bk];
  const feat = b.featured || 'laika';
  const col = ELEMENTS[CHARS[feat].elem].color;
  const showKey = bk === 'limited' ? feat : 'ciel';
  const v3 = GFX.show('warp:' + bk, () => new ShowcaseView(showKey, { screenX: 430 }));
  const s = h(`<div class="screen warp" style="--c:${col}">${topBar('ワープ')}
    <div class="wp-tabs">
      ${Object.entries(BANNERS).map(([k, v]) => `<button class="wp-tab ${k === bk ? 'on' : ''}" data-bk="${k}">
        <div class="wp-tab-face">${avatarSVG(v.featured || 'ciel')}</div><span>${v.type === 'limited' ? '限定' : '常設'}</span></button>`).join('')}
    </div>
    <div class="wp-banner">
      <div class="wp-art ${GFX.ok ? 'is3d' : ''}">${GFX.ok ? '' : bk === 'limited' ? avatarSVG(feat) : `<div class="wp-trio">${POOL5.map(k => avatarSVG(k)).join('')}</div>`}</div>
      <div class="wp-text">
        <div class="wp-type">${b.type === 'limited' ? 'イベントワープ' : '常設ワープ'}</div>
        <h2>${b.name}</h2>
        ${bk === 'limited' ? `<div class="wp-feat">${stars(5)} <b>${CHARS[feat].name}</b>（${ELEMENTS[CHARS[feat].elem].name}・${PATHS[CHARS[feat].path].name}）</div>
          <div class="wp-4">確率UP 4★：${b.rateUp4.map(k => CHARS[k].name).join('／')}</div>` : ''}
        <p>${b.desc}</p>
        <div class="wp-pity">5★まであと <b>${90 - g.p5}</b> 回（天井90）${b.type === 'limited' ? `　${g.guarantee ? '<span class="gold">次の5★は確定でネビュラ</span>' : '50%で限定キャラ'}` : ''}</div>
      </div>
    </div>
    <div class="wp-actions">
      <button class="wp-hist-btn btn small" data-hist>履歴</button>
      <button class="wp-btn" data-n="1"><span>ワープ ×1</span><em><i class="ic-jade"></i>160</em></button>
      <button class="wp-btn gold" data-n="10"><span>ワープ ×10</span><em><i class="ic-jade"></i>1600</em></button>
    </div>
    <div class="warp-ov hidden"></div>
  </div>`);
  wireBack(s);
  if (v3) v3.bindDrag(s.querySelector('.wp-art'));
  on(s, '[data-bk]', 'click', el => App.go(WarpScreen, el.dataset.bk));
  on(s, '[data-n]', 'click', el => {
    const res = warp(bk, +el.dataset.n);
    if (!res) { alert('星玉が足りません。冒険や模擬宇宙で獲得できます。'); return; }
    playWarp(s.querySelector('.warp-ov'), res, () => App.go(WarpScreen, bk));
  });
  s.querySelector('[data-hist]').onclick = () => {
    const ov = s.querySelector('.warp-ov');
    ov.classList.remove('hidden');
    ov.innerHTML = `<div class="ov-box hist"><h2>ワープ履歴</h2><div class="hist-list">${Save.data.history.map(x =>
      `<div class="r${x.rarity}"><span>${x.key ? CHARS[x.key].name : '旅情の記録'}</span><span>${stars(x.rarity)}</span><span class="dim">${BANNERS[x.banner].name}</span></div>`).join('') || '<div class="dim">履歴はありません</div>'}</div>
      <button class="btn gold" data-close>閉じる</button></div>`;
    ov.querySelector('[data-close]').onclick = () => ov.classList.add('hidden');
  };
  return s;
}

function playWarp(ov, results, done) {
  const top = Math.max(...results.map(r => r.rarity));
  const color = top === 5 ? '#ffd66b' : top === 4 ? '#c58bff' : '#7fb6ff';
  ov.classList.remove('hidden');
  const wv = GFX.ok ? new WarpView() : null;
  if (wv) { wv.key = 'warpfx'; GFX.setView(wv); wv.startTunnel(color); ov.classList.add('is3d'); ov.parentElement.classList.add('warping'); }
  ov.innerHTML = `<div class="wv-stage" style="--mc:${color}"><div class="wv-stars"></div><div class="wv-meteor"></div><div class="wv-flash"></div>
    <button class="wv-skip">スキップ ›</button></div>`;
  Sfx.warp(top);
  let i = -1, finished = false;
  const stage = ov.querySelector('.wv-stage');
  const summary = () => {
    finished = true;
    ov.classList.remove('is3d');
    ov.innerHTML = `<div class="wv-summary">
      <div class="wv-grid">${results.map(r => resultCard(r)).join('')}</div>
      <button class="btn gold" data-ok>確認</button></div>`;
    ov.querySelector('[data-ok]').onclick = () => { Sfx.click(); done(); };
  };
  const next = () => {
    if (finished) return;
    i++;
    if (i >= results.length) { summary(); return; }
    const r = results[i];
    if (r.rarity >= 4) Sfx.warp(r.rarity); else Sfx.click();
    const c = r.key ? CHARS[r.key] : null;
    if (wv) wv.reveal(r.key, r.rarity);
    stage.innerHTML = `<div class="wv-reveal r${r.rarity}" style="--c:${c ? ELEMENTS[c.elem].color : '#7fb6ff'}">
      <div class="wv-glow"></div>
      <div class="wv-art">${c ? avatarSVG(r.key) : '<div class="wv-book">📘</div>'}</div>
      <div class="wv-cap">${stars(r.rarity)}<h2>${c ? c.name : '旅情の記録'}</h2>
        ${c ? `<div class="wv-sub">${elemIcon(c.elem)} ${PATHS[c.path].name}　${c.title}</div>` : ''}
        ${r.isNew ? '<div class="wv-new">NEW</div>' : ''}${r.bonus ? `<div class="wv-bonus">${r.bonus}</div>` : ''}</div>
      <div class="wv-count">${i + 1} / ${results.length}</div>
      <button class="wv-skip">スキップ ›</button></div>`;
    stage.querySelector('.wv-skip').onclick = e => { e.stopPropagation(); summary(); };
  };
  stage.querySelector('.wv-skip').onclick = e => { e.stopPropagation(); summary(); };
  setTimeout(() => { if (!finished && i < 0) next(); }, 2300);
  stage.addEventListener('click', () => { if (i < 0) next(); else next(); });
}

function resultCard(r) {
  const c = r.key ? CHARS[r.key] : null;
  return `<div class="wr-card r${r.rarity}" style="--c:${c ? ELEMENTS[c.elem].color : '#7fb6ff'}">
    <div class="wr-face">${c ? avatarSVG(r.key) : '<div class="wv-book small">📘</div>'}</div>
    <div class="wr-name">${c ? c.name : '旅情の記録'}</div>${stars(r.rarity)}
    ${r.isNew ? '<div class="wr-new">NEW</div>' : ''}</div>`;
}

// ------------------------------------------------------------
//  模擬宇宙
// ------------------------------------------------------------
const SU_WORLDS = [
  { name: '第一世界', lv: 20, normals: ['scout', 'plunderer', 'drone', 'frostbeast'], elites: ['knight', 'golem'], boss: 'boss_core', bg: 'station' },
  { name: '第二世界', lv: 40, normals: ['frostbeast', 'flamespawn', 'drone', 'plunderer'], elites: ['knight', 'golem'], boss: 'boss_empress', bg: 'snow' },
  { name: '第三世界', lv: 60, normals: ['flamespawn', 'wraith', 'frostbeast', 'drone'], elites: ['knight', 'golem'], boss: 'boss_dragon', bg: 'xian' },
  { name: '第四世界', lv: 80, normals: ['wraith', 'flamespawn', 'scout', 'drone'], elites: ['knight', 'golem'], boss: 'boss_final', bg: 'abyss' },
];
const SU_NODES = ['battle', 'battle', 'event', 'elite', 'battle', 'rest', 'elite', 'event', 'boss'];
const NODE_INFO = { battle: ['⚔', '戦闘'], elite: ['☠', '強敵'], event: ['？', '事件'], rest: ['✚', '休憩'], boss: ['♛', '首領'] };
let SU = null;

function SuHome(world = 0, path = 'destruction') {
  const v3 = GFX.show('scene:' + SU_WORLDS[world].bg, () => new SceneryView(SU_WORLDS[world].bg));
  if (v3) v3.setEnemies([SU_WORLDS[world].boss]);
  const s = h(`<div class="screen su-home">${topBar('模擬宇宙')}
    <div class="su-intro"><h2>模擬宇宙</h2><p>ランダムな戦闘を勝ち抜き、「祝福」を集めながら最深部の首領を目指すローグライクモード。HPとEPは戦闘間で引き継がれる。</p></div>
    <div class="su-sec">世界を選択</div>
    <div class="su-worlds">${SU_WORLDS.map((w, i) => `
      <button class="su-w ${i === world ? 'on' : ''}" data-w="${i}"><b>${w.name}</b><span>推奨Lv.${w.lv}</span>
      <em>${ENEMIES[w.boss].name}</em>${Save.data.suClears[i] ? '<i class="st-ok">✓</i>' : ''}</button>`).join('')}</div>
    <div class="su-sec">運命を選択 <small>選んだ運命の祝福が出やすくなる</small></div>
    <div class="su-paths">${Object.entries(PATHS).map(([k, p]) => `<button class="su-p ${k === path ? 'on' : ''}" data-p="${k}">${p.name}</button>`).join('')}</div>
    <div class="su-team">${Save.data.team.map(k => charChip(k)).join('')}<button class="btn small" data-edit>編成変更</button></div>
    <button class="btn gold big" data-go>模擬宇宙を開始</button>
  </div>`);
  wireBack(s);
  on(s, '[data-w]', 'click', el => App.go(SuHome, +el.dataset.w, path));
  on(s, '[data-p]', 'click', el => App.go(SuHome, world, el.dataset.p));
  s.querySelector('[data-edit]').onclick = () => { Sfx.click(); App.go(TeamScreen, () => App.go(SuHome, world, path)); };
  s.querySelector('[data-go]').onclick = () => {
    Sfx.select();
    SU = { world, path, idx: 0, blessings: [], jade: 0,
      team: teamMembers().map(m => ({ ...m, hpRatio: 1, energy: null })) };
    pickBlessing(() => App.go(SuMap), '初期祝福を選択');
  };
  return s;
}

function SuMap() {
  const w = SU_WORLDS[SU.world];
  const v3 = GFX.show('scene:' + w.bg, () => new SceneryView(w.bg));
  if (v3) v3.setEnemies([]);
  const s = h(`<div class="screen su-map bg-${w.bg}">${topBar(`模擬宇宙・${w.name}`, false)}
    <div class="su-nodes">${SU_NODES.map((n, i) => `
      <div class="su-node ${n} ${i < SU.idx ? 'done' : i === SU.idx ? 'cur' : ''}">
        <div class="sn-ic">${NODE_INFO[n][0]}</div><div class="sn-l">${NODE_INFO[n][1]}</div></div>
      ${i < SU_NODES.length - 1 ? '<div class="sn-line"></div>' : ''}`).join('')}</div>
    <div class="su-body">
      <div class="su-party">${SU.team.map(m => `
        <div class="sp-mem ${m.hpRatio <= 0 ? 'dead' : ''}">${avatarSVG(m.key)}
          <div class="bar hp"><i style="width:${m.hpRatio * 100}%"></i></div><span>${CHARS[m.key].name}</span></div>`).join('')}</div>
      <div class="su-bless"><div class="su-sec">獲得した祝福（${SU.blessings.length}）</div>
        ${SU.blessings.map(b => `<div class="bl-row p-${b.path}"><b>${b.name}</b><span>${b.desc}</span></div>`).join('') || '<div class="dim">なし</div>'}</div>
    </div>
    <div class="su-foot">
      <button class="btn" data-quit>中断して帰還</button>
      <button class="btn gold big" data-next>次の区域へ：${NODE_INFO[SU_NODES[SU.idx]][1]}</button>
    </div></div>`);
  s.querySelector('[data-quit]').onclick = () => { if (confirm('模擬宇宙を中断しますか？（報酬は獲得済みの分のみ）')) suEnd(false); };
  s.querySelector('[data-next]').onclick = () => { Sfx.select(); suNode(); };
  return s;
}

function suWaves(type) {
  const w = SU_WORLDS[SU.world], n = () => pick(w.normals);
  if (type === 'battle') return [[n(), n(), n()], [n(), n(), n()]].map(x => x.map(k => ({ key: k, lv: w.lv })));
  if (type === 'elite') return [[{ key: n(), lv: w.lv }, { key: pick(w.elites), lv: w.lv + 2 }, { key: n(), lv: w.lv }]];
  return [[n(), n(), n()].map(k => ({ key: k, lv: w.lv + 2 })), [{ key: w.boss, lv: w.lv + 5 }]];
}

function suNode() {
  const type = SU_NODES[SU.idx], w = SU_WORLDS[SU.world];
  if (type === 'rest') {
    SU.team.forEach(m => { m.hpRatio = 1; });
    suModal('休憩区域', '列車の仲間と一息ついた。<br>味方全体のHPが全回復し、戦闘不能から復帰した。', [['進む', () => { SU.idx++; App.go(SuMap); }]]);
    return;
  }
  if (type === 'event') {
    const ev = pick([
      ['放浪する商人', '怪しげな商人が祝福を売っている。', [['祝福を受け取る', () => pickBlessing(() => { SU.idx++; App.go(SuMap); })],
        ['星玉を受け取る(+60)', () => { SU.jade += 60; SU.idx++; App.go(SuMap); }]]],
      ['星の泉', '淡く光る泉がある。', [['泉の水を飲む（HP50%回復）', () => { SU.team.forEach(m => { if (m.hpRatio > 0) m.hpRatio = Math.min(1, m.hpRatio + 0.5); }); SU.idx++; App.go(SuMap); }],
        ['泉に祈る（祝福を獲得）', () => pickBlessing(() => { SU.idx++; App.go(SuMap); })]]],
      ['古びた記録装置', '誰かの戦闘記録が残されている。', [['記録を読む（EP全回復）', () => { SU.team.forEach(m => { m.energy = CHARS[m.key].energyMax; }); SU.idx++; App.go(SuMap); }],
        ['解析する（祝福を獲得）', () => pickBlessing(() => { SU.idx++; App.go(SuMap); })]]],
    ]);
    suModal(ev[0], ev[1], ev[2]);
    return;
  }
  const alive = SU.team.filter(m => m.hpRatio > 0);
  if (!alive.length) { suEnd(false); return; }
  const b = new Battle({
    team: SU.team.map(m => ({ ...m, energy: m.energy == null ? undefined : m.energy })),
    waves: suWaves(type), mods: SU.blessings, bg: w.bg,
    title: `模擬宇宙・${w.name}　${NODE_INFO[type][1]}`,
    onResult: res => {
      if (!res.win) return '<div class="dim">模擬宇宙の探索はここで終了。</div>';
      res.team.forEach((t, i) => { SU.team[i].hpRatio = t.hpRatio; SU.team[i].energy = t.energy; });
      if (SU.blessings.some(x => x.afterWin)) SU.team.forEach(m => { if (m.hpRatio > 0) m.hpRatio = Math.min(1, m.hpRatio + 0.3); });
      SU.jade += type === 'boss' ? 150 : type === 'elite' ? 50 : 30;
      return `<div class="rw"><i class="ic-jade"></i>獲得予定の星玉 ${SU.jade}</div>`;
    },
    onExit: res => {
      if (!res.win) { suEnd(false); return; }
      SU.idx++;
      if (type === 'boss') suEnd(true);
      else pickBlessing(() => App.go(SuMap));
    },
  });
  b.start();
}

function suModal(title, text, choices) {
  const s = h(`<div class="screen su-modal"><div class="ov-box"><h2>${title}</h2><p>${text}</p><div class="su-choices"></div></div></div>`);
  const box = s.querySelector('.su-choices');
  choices.forEach(([label, fn]) => { const b = h(`<button class="btn">${label}</button>`); b.onclick = () => { Sfx.select(); fn(); }; box.appendChild(b); });
  App.mount(s);
}

function pickBlessing(done, title = '祝福を選択') {
  const owned = new Set(SU.blessings.map(b => b.id));
  const pool = BLESSINGS.filter(b => !owned.has(b.id));
  if (!pool.length) { done(); return; }
  const choices = [];
  const pathPool = pool.filter(b => b.path === SU.path);
  if (pathPool.length) choices.push(pick(pathPool));
  while (choices.length < 3 && choices.length < pool.length) {
    const c = pick(pool); if (!choices.includes(c)) choices.push(c);
  }
  const s = h(`<div class="screen su-pick"><h2>${title}</h2><div class="bl-cards">${choices.map((b, i) => `
    <button class="bl-card p-${b.path}" data-i="${i}"><div class="bl-path">${PATHS[b.path].name}</div>
      <div class="bl-emblem">${PATHS[b.path].name[0]}</div><b>${b.name}</b><p>${b.desc}</p></button>`).join('')}</div></div>`);
  on(s, '[data-i]', 'click', el => { SU.blessings.push(choices[+el.dataset.i]); done(); });
  App.mount(s);
}

function suEnd(cleared) {
  const d = Save.data, w = SU_WORLDS[SU.world];
  let jade = SU.jade;
  if (cleared && !d.suClears[SU.world]) { jade += 300; d.suClears[SU.world] = true; }
  d.jade += jade;
  const exp = Math.round((SU.idx + 1) * (80 + w.lv * 30) * 0.8);
  d.expPool += SU.idx * w.lv * 10;
  const ups = SU.team.map(m => [m.key, grantExp(m.key, exp)]);
  Save.save();
  const s = h(`<div class="screen su-end"><div class="ov-box result ${cleared ? 'win' : 'lose'}">
    <div class="res-title">${cleared ? '模擬宇宙 踏破' : '探索終了'}</div>
    <div class="res-sub">${w.name}　到達区域 ${Math.min(SU.idx, SU_NODES.length)} / ${SU_NODES.length}</div>
    <div class="res-info"><div class="rw"><i class="ic-jade"></i>星玉 +${jade}${cleared && jade > SU.jade ? '（初回踏破ボーナス含む）' : ''}</div>
      <div class="rw"><i class="ic-exp"></i>旅情の記録 +${SU.idx * w.lv * 10}</div>
      <div class="rw-team">${ups.map(([k, u]) => `<div class="rw-mem">${avatarSVG(k)}<span>Lv.${d.owned[k].lv}${u ? `<b> ▲${u}</b>` : ''}</span></div>`).join('')}</div></div>
    <button class="btn gold" data-ok>列車に戻る</button></div></div>`);
  s.querySelector('[data-ok]').onclick = () => { Sfx.click(); SU = null; App.go(HubScreen); };
  App.mount(s);
}
