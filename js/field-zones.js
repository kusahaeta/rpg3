'use strict';
// ============================================================
//  探索フィールド：ミャオニアの区画データと、区画ごとの地形・小物の生成
//  区画はゲート（出入口）でつながる。座標は区画中央が原点、北が -Z（m）。
//  地形マップ（map）のある区画は座標がマス（列, 行）。
// ============================================================
// exits: side = n/s/e/w（辺）、at = 辺に沿った位置、to = 行き先
// town: 人が暮らす区画（敵が出ない）／ calmAfter: そのステージをクリアすると敵が出なくなる
// npcs[].v: [[条件, 台詞...]]（条件 'scene:ID' 'clear:ステージ' 'done' 'flag:名前'。後ろのものほど優先）
// npcs[].shop: weapon / item / inn / fish（話しかけると店）
// bg: 空と光（js/gfx/env.js の THEMES。省略時は章の bg）
const FIELD_ZONES = {
  // ---------------- 第一章 ぽかぽか村・ほしふる森 ----------------
  pokapoka: { ci: 0, name: 'ぽかぽか村', w: 72, d: 64, stage: '1-1', arenas: [[0, 12, 0]], build: 'village', town: true, groups: 0, chests: 3, crystals: 0,
    spawn: [0, 10], anchor: [5, 7],
    exits: [{ side: 'n', at: -10, to: 'road1' }, { side: 'e', at: 10, to: 'forest_in' }, { side: 's', at: 8, to: 'hill' }, { side: 'e', at: -22, to: 'dream' }],
    npcs: [
      { key: 'sonchou', at: [0, -13], face: 0, lines: ['ミケや、魚屋さんにちゃんと謝ったかの？', 'この村はな、にゃんだーの樹のおかげで、いつもぽかぽかなんじゃ。'],
        v: [['scene:c1_03', 'クロとやらは、空から落ちてきたのか……ふしぎなこともあるもんじゃ。', 'ほしふる森のネズミどもが、村の食べ物を持っていくので困っておる。'],
          ['clear:1-3', '森のネズミたちも、腹をすかせておったのか……。', 'ミケ、旅に出るなら、ちゃんと食べて寝るんじゃぞ。'],
          ['scene:c7_04', '樹が枯れかけておる……。じゃが、わしらはお前たちを信じとるよ。'],
          ['done', 'なんで勇者が魚屋なんじゃ……まあ、ミケらしいがの。', 'ほっほっほ。村はいつでもぽかぽかじゃ。']] },
      { key: 'sakanaya', at: [15, 1.5], face: -Math.PI / 2, shop: 'fish', lines: ['いらっしゃい！　今日もいい魚が入ってるよ！', '……ミケ！　また魚盗ったね！　ちゃんとお金を払いな！'],
        v: [['scene:c1_08', '旅に出るのかい。……ほら、弁当に焼き魚を入れといたよ。', 'お代は、ちゃんと帰ってきてから払いな！'],
          ['scene:c8_01', 'あんたに食べさせる魚くらい、いくらでも焼いてやるよ！'],
          ['done', '聞いたよ、あんた魚屋になるんだって？　……うちのライバルじゃないか！', 'まあいいさ。いい魚の見分け方、教えてやるよ。']] },
      { key: 'bukiya', at: [-18, 12], face: 0, shop: 'weapon', lines: ['おう、武器屋だ。にぼしを持ってくりゃ、得物を鍛えてやるぜ。'] },
      { key: 'douguya', at: [-5, 14], face: 0, shop: 'item', lines: ['いらっしゃいませ。道具屋ですにゃ。'] },
      { key: 'yadoya', at: [10.5, 14], face: 0, shop: 'inn', lines: ['宿屋「ひだまり亭」へようこそ。ひと晩休んでいくかい？'] },
      { key: 'kannushi', at: [24, -14], face: 0, lines: ['ここは猫神社。世界を作った猫の神さまをおまつりしておる。', '神さまは、たいそうめんどうくさがりだという言い伝えがあってのう。'],
        v: [['done', '……夢の中で、神さまに会うた者がおるらしい。', '鳥居の奥の道から、夢の世界へ行けるとか……。気をつけてな。']] },
      { key: 'koneko_a', at: [-4, 2], walk: 7, lines: ['ミケにいちゃん、あそぼー！', 'ねえねえ、勇者ってなに？　おいしいの？'],
        v: [['scene:c1_03', 'あの黒い猫、ずーっと怒った顔してるね！'], ['done', 'ぼくも大きくなったら勇者になる！　……それか魚屋！']] },
      { key: 'koneko_b', at: [6, -4], walk: 6, lines: ['にゃんだーの樹にはね、笑いの実とか友情の実がなるんだよ。', 'でも最近、実がなってないんだって……。'] },
      { key: 'murabito_a', at: [-12, -4], walk: 5, lines: ['ゆうべ、流れ星を見たかい？　村はずれの丘のほうに落ちたらしい。'],
        v: [['clear:1-3', '森のネズミたちが、どんぐりを返しにきたよ。律儀だねえ。'], ['scene:c7_04', '最近、みんなで集まって話すことが減ったなあ……。']] },
      { key: 'murabito_b', at: [-22, -18], face: Math.PI / 2, lines: ['ミケの家はそこだよ。……屋根に魚の骨が干してあるのは、見なかったことにしよう。'] },
    ],
    notes: [{ at: [6, -15], title: '村の掲示板', text: '「にゃんだーの樹の実りが悪く、今年の収穫祭は延期します——村長」' },
      { at: [-21.5, -11], title: 'ミケの家', text: '表札に「ミケ」。……窓辺に、食べかけの魚が干してある。' }],
    map2d: [470, 380] },

  hill: { ci: 0, name: '村はずれの丘', w: 52, d: 48, stage: '1-1', arenas: [[0, 10, 0]], build: 'hill', groups: 2, chests: 2, crystals: 2,
    anchor: [12, 14], exits: [{ side: 'n', at: 8, to: 'pokapoka' }, { side: 's', at: 0, to: 'tree_root' }],
    notes: [{ at: [-4, -12], title: '流れ星のかけら', text: '焦げた地面に、星の形の小さな石が残っている。ほんのりあたたかい。' }],
    map2d: [470, 450] },

  forest_in: { ci: 0, name: 'ほしふる森・入口', w: 60, d: 72, stage: '1-1', arenas: [[-2, -18, 0]], build: 'forest', bg: 'forest', groups: 5, chests: 3, crystals: 3,
    anchor: [-8, 26], spawn: [-24, 24], exits: [{ side: 'w', at: 24, to: 'pokapoka' }, { side: 'n', at: 4, to: 'forest_deep' }],
    notes: [{ at: [10, 10], title: '古い立て札', text: '「ほしふる森——夜になると、空から小さな星が降る。星をひろった者は、友を得るという」' }],
    map2d: [610, 380] },

  forest_deep: { ci: 0, name: 'ほしふる森・奥', w: 64, d: 72, stage: '1-2', arenas: [[-4, 0, 0]], build: 'forestDeep', bg: 'forest', groups: 6, chests: 3, crystals: 3,
    anchor: [0, 27], exits: [{ side: 's', at: 4, to: 'forest_in' }, { side: 'n', at: -6, to: 'rat_nest' }],
    notes: [{ at: [12, -10], title: '泉のほとり', text: 'すみきった泉。水面に、星のような光がゆらめいている。' },
      { at: [19, -6], title: '小さな墓', text: '小さな石の墓。黒い花が三輪、供えてある。……「ハヤテ、リン、ゴロウ。ここなら、にぎやかだろ」', when: 'scene:c8_04' }],
    map2d: [750, 380] },

  rat_nest: { ci: 0, name: 'ネズミの王国', w: 54, d: 54, stage: '1-3', arenas: [[0, -2, 0]], build: 'ratNest', bg: 'forest', groups: 3, chests: 2, crystals: 2, calmAfter: '1-3',
    anchor: [0, 20], exits: [{ side: 's', at: 0, to: 'forest_deep' }],
    npcs: [{ key: 'king_npc', after: 'c1_07', at: [0, -15], face: 0, lines: ['……魚、うまかったぞ。', '森のどんぐりが実らなくてな。みんな腹をすかせておったのだ。'],
      v: [['scene:c8_02', '魚……分けてやるよ。俺にとっては大事なんだ！'], ['done', 'おう、勇者か。……今年はどんぐりが豊作だ。分けてやろう。']] },
      { key: 'kodomo_nezumi', after: 'c1_07', at: [8, -6], walk: 5, species: 'mouse', lines: ['王さまがね、ぼくたちの分まで食べ物を探してくれてたの。'] }],
    notes: [{ at: [-12, -8], title: 'チーズの山', text: '村から持ってきたらしい食べ物が積んである。……でも、誰も手をつけていない。' }],
    map2d: [890, 380] },

  // ---------------- 第二章 ミャオ街道 ----------------
  road1: { ci: 1, name: 'ミャオ街道・丘', w: 50, d: 96, stage: '2-1', arenas: [[-6, 4, 0]], build: 'road', groups: 6, chests: 3, crystals: 3,
    anchor: [8, 38], spawn: [-8, 44], exits: [{ side: 's', at: -8, to: 'pokapoka' }, { side: 'n', at: 4, to: 'road_rest' }],
    notes: [{ at: [-6, 20], title: '道しるべ', text: '「北　ニャハハ王国／南　ぽかぽか村」' }],
    map2d: [470, 308] },

  road_rest: { ci: 1, name: '街道の宿場', w: 60, d: 56, stage: '2-1', arenas: [[0, 10, 0]], build: 'rest', town: true, groups: 0, chests: 2, crystals: 0,
    anchor: [6, 8], exits: [{ side: 's', at: 4, to: 'road1' }, { side: 'n', at: -4, to: 'road2' }, { side: 'e', at: 6, to: 'woods' }],
    npcs: [
      { key: 'chaya', at: [-10, -3.5], face: 0, shop: 'inn', lines: ['茶屋「ねこじゃらし」へようこそ。お茶でも飲んで、ひと休みしていきな。'] },
      { key: 'tabibito_a', at: [8, -8], walk: 6, lines: ['北のニャハハ王国は、笑いの国って呼ばれてたんだ。', 'でも最近、あそこから来た旅人は、みんな暗い顔をしてるんだよ……。'] },
      { key: 'tabibito_b', at: [-16, 10], face: Math.PI / 2, lines: ['さっき白い猫が魔法を見せてくれたんだけど……空から魚が降ってきたんだ。'],
        v: [['scene:c2_02', 'あの白い猫、あんたたちの仲間になったのかい。……魚、ありがとうって伝えておいて。']] },
      { key: 'bukiya2', at: [16, 4], face: -Math.PI / 2, shop: 'weapon', lines: ['旅の鍛冶屋だ。にぼしがあるなら、武器を鍛えてやるよ。'] },
    ],
    map2d: [470, 236] },

  woods: { ci: 1, name: 'まどろみの林', w: 58, d: 64, stage: '2-2', arenas: [[-6, 0, 0]], build: 'woods', bg: 'forest', groups: 5, chests: 3, crystals: 3,
    anchor: [-18, 8], exits: [{ side: 'w', at: 6, to: 'road_rest' }],
    th: { fog: '#c8dcc8', fogD: 0.03 },
    notes: [{ at: [4, -20], title: '大きな木のうろ', text: 'ふかふかの落ち葉がしきつめられている。誰かがここで眠っていたようだ。' }],
    map2d: [610, 236] },

  road2: { ci: 1, name: '街道の関所あと', w: 54, d: 72, stage: '2-3', arenas: [[0, 4, 0]], build: 'checkpoint', groups: 5, chests: 3, crystals: 3,
    anchor: [10, 25], exits: [{ side: 's', at: -4, to: 'road_rest' }, { side: 'n', at: 0, to: 'nyahaha' }],
    notes: [{ at: [-12, -6], title: '倒れた関所の札', text: '「ニャハハ王国まで あと少し。笑顔でお越しください」' }],
    map2d: [470, 164] },

  // ---------------- 第三章 ニャハハ王国 ----------------
  nyahaha: { ci: 2, name: 'ニャハハ王国・城下町', w: 76, d: 70, stage: '3-1', arenas: [[0, 14, 0]], build: 'kingdom', town: true, groups: 0, chests: 3, crystals: 0,
    anchor: [8, 12], spawn: [0, 28], exits: [{ side: 's', at: 0, to: 'road2' }, { side: 'n', at: -10, to: 'castle' }, { side: 'n', at: 20, to: 'tower' }, { side: 'e', at: 6, to: 'valley' }],
    npcs: [
      { key: 'shimin_a', at: [-10, 6], walk: 6, lines: ['……笑う？　どうやって笑うんだったかな……。'], v: [['clear:3-3', 'ふふっ……あれ、今わたし、笑った？'], ['done', 'あはははは！　毎日が楽しくってしかたないよ！']] },
      { key: 'shimin_b', at: [14, -4], face: Math.PI, lines: ['この国の宝の「笑いの実」が、魔王軍に盗まれたんだ。', 'それからは、誰も笑わなくなった……。'], v: [['clear:3-3', 'ピエロが笑った日から、少しずつみんなの顔がゆるんできたよ。']] },
      { key: 'shimin_c', at: [-20, -12], walk: 5, lines: ['笑顔の塔には、泣いてばかりのピエロが住みついてるって噂だよ。'], v: [['clear:3-3', '塔のピエロ、今は広場で子どもたちに手品を見せてるよ。']] },
      { key: 'piero_npc', after: 'c3_05', at: [0, 2], face: Math.PI, lines: ['ぼく、もう一度みんなを笑わせたいんだ。……今度は、ぼくも一緒に笑いながら。'],
        v: [['scene:c8_02', 'ぼくのショーで、世界中に笑いを届けるよ！'], ['done', 'いらっしゃい！　今日のショーは、ミケの魚どろぼうの再現劇だよ！']] },
      { key: 'douguya2', at: [22, 14], face: -Math.PI / 2, shop: 'item', lines: ['……いらっしゃい。道具なら、あるよ……。'], v: [['clear:3-3', 'いらっしゃいませー！　なんだか、声が出るようになったよ！']] },
      { key: 'yadoya2', at: [-22, 14], face: Math.PI / 2, shop: 'inn', lines: ['宿「わらいねこ亭」……名前だけは、ね。'] },
    ],
    notes: [{ at: [0, -4], title: '広場の噴水', text: '水の止まった噴水。台座に「笑う門には福きたる」と刻まれている。' }],
    map2d: [470, 95] },

  castle: { ci: 2, name: 'ニャハハ城・中庭', w: 44, d: 46, stage: '3-1', arenas: [[0, 6, 0]], build: 'castle', town: true, groups: 0, chests: 1, crystals: 0, skyTree: true,
    anchor: [10, 14], exits: [{ side: 's', at: 0, to: 'nyahaha' }],
    npcs: [
      { key: 'nyahaha_ou', at: [0, -14], face: 0, lines: ['……よく来てくれた、旅の者よ。わしが、ニャハハ王じゃ。', '笑いの実を失ってから、わしも笑い方を忘れてしもうた。'],
        v: [['clear:3-3', '塔のピエロを救ってくれたそうじゃな。……ふふ、ふははは！　礼を言うぞ！'], ['scene:c6_04', '笑いの実が戻ってきたぞ！　魔王どのが直々に届けてくれたそうじゃ。……ぶはははは！']] },
      { key: 'daijin', at: [-5, -10], face: Math.PI / 4, lines: ['宝物庫の台座は、空っぽのままでございます……。'] },
      { key: 'eihei', at: [7, 10], face: -Math.PI / 2, lines: ['ここはニャハハ城の中庭。……ここ数日、誰も通りません。'] },
    ],
    notes: [{ at: [8, -16], title: '宝物庫の台座', text: '「笑いの実」とあった台座。……今は、何もない。' }],
    map2d: [330, 95] },

  tower: { ci: 2, name: '笑顔の塔', stage: '3-1', arenas: [[10.5, 21, 90], [10.5, 11.5, 90], [10.5, 3, 90]], build: 'tower', arch: 'tower', bg: 'tower', groups: 6, chests: 3, crystals: 3, calmAfter: '3-3',
    th: { pattern: 'checker', floor: '#6a3458', floor2: '#7a4068', line: '#ffd27a', floorGlow: 0.25, fog: '#3a1a3a', light: 1.15 },
    map: [
      '######################',
      '#88888888888888888888#',
      '#88888888888888888888#',
      '#88888888888888888888#',
      '#88888888888888888888#',
      '#88888888888888888888#',
      '#########^^^^#########',
      '#########^^^^#########',
      '#########^^^^#########',
      '#########^^^^#########',
      '#44444444444444444444#',
      '#44444444444444444444#',
      '#44444444444444444444#',
      '#44444444444444444444#',
      '#^^^##############^^^#',
      '#^^^##############^^^#',
      '#^^^##############^^^#',
      '#^^^##############^^^#',
      '#00000000000000000000#',
      '#00000000000000000000#',
      '#00000000000000000000#',
      '#00000000000000000000#',
      '#00000000000000000000#',
      '#00000000000000000000#',
      '#00000000000000000000#',
      '##########ss##########',
    ],
    anchor: [10.5, 22], spawn: [10.5, 23.5], exits: [{ key: 's', to: 'nyahaha' }],
    notes: [{ at: [4, 11], title: '古いポスター', text: '「笑顔の塔　大サーカス！　主演：ピエロ」……色あせて、涙のしみがある。' }],
    map2d: [470, 30] },

  // ---------------- 第四章 くろねこ谷 ----------------
  valley: { ci: 3, name: 'くろねこ谷', w: 70, d: 68, stage: '4-1', arenas: [[-8, 18, 0]], build: 'valley', groups: 5, chests: 3, crystals: 3,
    anchor: [6, 24], exits: [{ side: 'w', at: 6, to: 'nyahaha' }, { side: 'n', at: 12, to: 'cave' }, { side: 'n', at: -18, to: 'ruins_out' }],
    safe: [{ at: [18, 16], r: 8, name: '谷の集落' }],
    npcs: [
      { key: 'kurone', at: [18, 14], face: -Math.PI / 2, lines: ['……おかえり、クロ。', 'あの子たちの墓には、毎日花を供えておるよ。'],
        v: [['clear:4-3', 'いい顔になったね、クロ。……今度の仲間は、大事にしなさい。']] },
      { key: 'tanimura', at: [22, 20], walk: 4, lines: ['クロさんは、昔「影の四剣」って呼ばれたパーティーにいたんだ。', '……あの日から、誰とも組まなくなったって聞いたよ。'] },
      { key: 'yadoya3', at: [14, 21], face: 0, shop: 'inn', lines: ['谷の宿だよ。……静かだけど、よく眠れる。'] },
    ],
    notes: [{ at: [-16, -11], title: '三つの墓標', text: '「ハヤテ」「リン」「ゴロウ」——そして、名前の刻まれていない四つ目の石。' },
      { at: [12, -4.5], title: '古いテント', text: '雨ざらしのテント。中に、誰かの荷物が残されている。' }],
    map2d: [620, 95] },

  cave: { ci: 3, name: '黒影洞窟', stage: '4-2', arenas: [[14.5, 12, 90], [14, 3.5, 90]], build: 'cave', arch: 'cave', bg: 'cave', groups: 6, chests: 3, crystals: 3, calmAfter: '4-3',
    th: { pattern: 'rock', floor: '#3a3444', floor2: '#443c50', line: '#8a6aff', floorGlow: 0.3, fog: '#141028', fogD: 0.02, light: 1.1 },
    map: [
      '##############################',
      '##########333333333###########',
      '########3333333333333#########',
      '#######333333333333333########',
      '#######333333333333333########',
      '########3333333333333#########',
      '###########3333333############',
      '############^^^^##############',
      '############^^^^##############',
      '############^^^^##############',
      '###0000000##0000######00000###',
      '##000000000000000000000000000#',
      '##0000##0000000000000##000000#',
      '##000####000000000000####0000#',
      '##000####0000####0000####0000#',
      '##0000##00000####00000##00000#',
      '##00000000000####000000000000#',
      '###0000000000000000000000000##',
      '#####00000000000000000000#####',
      '#######000000####000000#######',
      '#######000000####000000#######',
      '########0000000000000#########',
      '##########000000000###########',
      '############sssss#############',
    ],
    anchor: [14, 20], spawn: [14, 21.5], exits: [{ key: 's', to: 'valley' }],
    notes: [{ at: [4, 16], title: '壁のひっかき傷', text: '四本の爪あとが並んでいる。……「影の四剣、ここに参上」' }],
    map2d: [620, 30] },

  // ---------------- 第五章 古代遺跡 ----------------
  ruins_out: { ci: 4, name: '古代遺跡・外庭', w: 70, d: 70, stage: '5-1', arenas: [[-2, 6, 0]], build: 'ruinsOut', groups: 6, chests: 3, crystals: 3,
    anchor: [-10, 24], exits: [{ side: 's', at: -16, to: 'valley' }, { side: 'n', at: 0, to: 'ruins_in' }, { side: 'e', at: 10, to: 'demon_land' }],
    notes: [{ at: [14, 14], title: '倒れた石像', text: '四匹の猫が肩を寄せ合う石像。顔はすり減って、もう分からない。' }],
    map2d: [770, 95] },

  ruins_in: { ci: 4, name: '壁画の回廊', w: 36, d: 80, stage: '5-2', arenas: [[0, 14, 0], [0, -26, 0]], build: 'ruinsIn', bg: 'ruins', groups: 5, chests: 3, crystals: 2, calmAfter: '5-3', skyTree: false,
    th: { pattern: 'tiles', floor: '#9a9478', floor2: '#8a846a', line: '#8affe0', floorGlow: 0.3, fog: '#4a5a54', fogD: 0.03, light: 0.95 },
    anchor: [8, 34], exits: [{ side: 's', at: 0, to: 'ruins_out' }],
    notes: [{ at: [-13, 10], title: '壁画・一', text: '巨大な猫が、大きな樹を抱いて眠っている。' },
      { at: [13, -4], title: '壁画・二', text: '四匹の猫が、樹のまわりで手をつないでいる。……一匹は、とても小さい。' },
      { at: [-13, -18], title: '古代文字', text: '「樹は、猫たちのつながりから生まれた。つながりが絶えるとき、樹は最後のにゃんこを生む」' }],
    map2d: [770, 30] },

  // ---------------- 第六章 魔王領 ----------------
  demon_land: { ci: 5, name: '魔王領', w: 70, d: 78, stage: '6-1', arenas: [[0, -8, 0]], build: 'demonLand', groups: 6, chests: 3, crystals: 3,
    anchor: [12, 28], exits: [{ side: 'w', at: 12, to: 'ruins_out' }, { side: 'n', at: 0, to: 'demon_castle' }],
    safe: [{ at: [-14, 12], r: 8, name: '健康診断のテント' }],
    npcs: [
      { key: 'mazoku_yukyu', at: [-12, 8], face: 0, lines: ['あ、どうも。有給休暇の申請に来たんですけど……。', '魔王さまが「遊んでくれるならいいぞ」って……いや、無理でしょ……。'],
        v: [['clear:6-3', '魔王さま、最近ちょっと明るくなったんですよ。有給も通りました！']] },
      { key: 'mazoku_nurse', at: [-16, 14], face: Math.PI / 2, lines: ['はーい、健康診断はこちらでーす。', 'あら、あなた猫ね？　ついでに体重も測っていく？'] },
      { key: 'mazoku_c', at: [8, -8], walk: 6, lines: ['魔王城、怖いところだと思った？　……うん、まあ、見た目はね。'] },
    ],
    notes: [{ at: [4, 16], title: '立て看板', text: '「魔王領へようこそ！　※城内での猫じゃらしの使用は禁止します　——魔王」' }],
    map2d: [910, 95] },

  demon_castle: { ci: 5, name: '魔王城', stage: '6-2', arenas: [[11.5, 17, 0], [11.5, 4.5, 0]], build: 'demonCastle', arch: 'castle', bg: 'demon', groups: 6, chests: 3, crystals: 3, calmAfter: '6-3',
    th: { pattern: 'checker', floor: '#4a3a5a', floor2: '#3e304e', line: '#ff8ad8', floorGlow: 0.3, fog: '#2a1a38', fogD: 0.016, light: 1.1 },
    map: [
      '########################',
      '#666666666666666666666##',
      '#666666666666666666666##',
      '#666666666666666666666##',
      '#666666666666666666666##',
      '#666666666666666666666##',
      '#666666666666666666666##',
      '#########^^^^###########',
      '#########^^^^###########',
      '#########^^^^###########',
      '#########^^^^###########',
      '#000000D00000000D000000#',
      '#000000D00000000D000000#',
      '#000000#00000000#000000#',
      '#000000#00000000#000000#',
      '#000000#00000000#000000#',
      '########00000000########',
      '########00000000########',
      '#000000D00000000D000000#',
      '#000000D00000000D000000#',
      '#000000#00000000#000000#',
      '#000000#00000000#000000#',
      '########00000000########',
      '###########ss###########',
    ],
    anchor: [11.5, 20], spawn: [11.5, 21.5], exits: [{ key: 's', to: 'demon_land' }],
    npcs: [{ key: 'mazoku_nurse2', at: [3, 13], face: Math.PI / 2, lines: ['健康診断の順番待ちの方は、こちらの部屋でお待ちくださーい。'] },
      { key: 'mazoku_d', at: [20, 19], face: -Math.PI / 2, lines: ['……ここ、魔王軍の休憩室。お茶、飲む？'] }],
    notes: [{ at: [3, 20], title: '魔王城の掲示', text: '「本日の予定：健康診断（全員）。魔王さまの遊び相手（募集中）」' }],
    map2d: [910, 30] },

  // ---------------- 第七章 にゃんだーの樹 ----------------
  tree_root: { ci: 6, name: 'にゃんだーの樹・根もと', w: 80, d: 84, stage: '7-1', arenas: [[0, -10, 180]], build: 'treeRoot', bg: 'tree', groups: 6, chests: 3, crystals: 3, skyTree: false,
    anchor: [14, -30], spawn: [0, -36], exits: [{ side: 'n', at: 0, to: 'hill' }, { side: 's', at: 0, to: 'tree_under' }, { side: 'e', at: 14, to: 'world_end' }],
    notes: [{ at: [-12, 10], title: '落ちた葉', text: '灰色に色あせた葉。持ち上げると、さらさらと崩れた。' }],
    map2d: [470, 522] },

  tree_under: { ci: 6, name: '樹の地下', w: 48, d: 84, stage: '7-2', arenas: [[0, 20, 180]], build: 'treeUnder', bg: 'root', groups: 6, chests: 3, crystals: 2, skyTree: false,
    anchor: [8, -34], spawn: [0, -38], exits: [{ side: 'n', at: 0, to: 'tree_root' }],
    th: { fog: '#10180e', fogD: 0.034 },
    notes: [{ at: [-10, 0], title: '光る樹液', text: 'かすかに光る樹液が、根を伝って流れている。……まるで、泣いているみたいに。' }],
    map2d: [330, 540] },

  // ---------------- 第八章 世界の果て ----------------
  world_end: { ci: 7, name: '世界の果て', w: 70, d: 92, stage: '8-2', arenas: [[0, -26, 0]], build: 'worldEnd', bg: 'end', groups: 6, chests: 3, crystals: 3,
    anchor: [10, 38], spawn: [0, 42], exits: [{ side: 's', at: 0, to: 'tree_root' }],
    treeAt: [Math.PI, 200],
    notes: [{ at: [-12, 20], title: '最後の道しるべ', text: '「この先、世界の果て。——ひとりで行ってはならない」' }],
    map2d: [610, 540] },

  // ---------------- クリア後 ねこ神の夢 ----------------
  dream: { ci: 8, name: 'ねこ神の夢', w: 66, d: 70, stage: '9-1', arenas: [[0, -14, 0]], build: 'dream', bg: 'dream', groups: 6, chests: 4, crystals: 3,
    anchor: [0, 26], exits: [{ side: 's', at: 0, to: 'pokapoka' }],
    notes: [{ at: [-14, 10], title: 'ふしぎな看板', text: '「ここは夢の中。起きたら全部わすれます。——ねこ神」' }],
    map2d: [330, 410] },
};
prepareMapZones(FIELD_ZONES);

// 章ごとの区画（先頭が到着地点）
const CHAPTER_ZONES = [
  ['pokapoka', 'hill', 'forest_in', 'forest_deep', 'rat_nest'],
  ['road1', 'road_rest', 'woods', 'road2'],
  ['nyahaha', 'castle', 'tower'],
  ['valley', 'cave'],
  ['ruins_out', 'ruins_in'],
  ['demon_land', 'demon_castle'],
  ['tree_root', 'tree_under'],
  ['world_end'],
  ['dream'],
];
function zoneChapter(id) { return FIELD_ZONES[id].ci; }

// 区画同士の最短経路（任務の目的地が別区画のときの案内用）
function zonePath(from, to) {
  const prev = { [from]: null }, q = [from];
  while (q.length) {
    const z = q.shift(); if (z === to) break;
    for (const e of FIELD_ZONES[z].exits) if (!(e.to in prev) && zoneOpen(e.to)) { prev[e.to] = z; q.push(e.to); }
  }
  if (!(to in prev)) return null;
  const path = []; for (let z = to; z; z = prev[z]) path.unshift(z);
  return path;
}
// after：そのシーンを見終えるまで、区画へのゲートは閉ざされている
function zoneOpen(id) {
  const Z = FIELD_ZONES[id];
  if (!Z) return false;
  return stageUnlocked(Z.stage) && (!Z.after || typeof Story === 'undefined' || Story.seen(Z.after));
}
// 区画の戦場（ワールド座標）。地形マップの区画はマス座標から直す
function zoneArenas(Z) { return (Z.arenas || []).map(([x, z, f]) => { const [wx, wz] = Z.map ? zonePoint(Z, [x, z]) : [x, z]; return { x: wx, z: wz, face: f || 0 }; }); }
// その区画に敵が出るか（calmAfter のステージを越えると静かになる）
function zoneCalm(Z) { return !!(Z.town || (Z.calmAfter && Save.data.cleared[Z.calmAfter])); }
function exitPos(zone, e) {
  const hw = zone.w / 2, hd = zone.d / 2;
  switch (e.side) {
    case 'n': return { x: e.at, z: -hd + 0.5, nx: 0, nz: 1 };
    case 's': return { x: e.at, z: hd - 0.5, nx: 0, nz: -1 };
    case 'e': return { x: hw - 0.5, z: e.at, nx: -1, nz: 0 };
    default: return { x: -hw + 0.5, z: e.at, nx: 1, nz: 0 };
  }
}
// NPC の台詞：物語の進み具合で変わる
function npcLines(n) {
  let lines = n.lines;
  for (const [cond, ...ls] of n.v || []) if (storyCond(cond)) lines = ls;
  return lines;
}
function storyCond(cond) {
  if (!cond) return true;
  const [k, v] = cond.split(':');
  if (k === 'scene') return typeof Story !== 'undefined' && Story.seen(v);
  if (k === 'clear') return !!Save.data.cleared[v];
  if (k === 'flag') return !!(Save.data.flags || {})[v];
  if (k === 'done') return typeof Story !== 'undefined' && Story.done();
  return false;
}

// ============================================================
//  区画の地形・小物を組み立てるキット
// ============================================================
const ZMAT = {
  metal: ['#5a5a68', 0.6, 0.4], stone: ['#a8a296', 0.02, 0.92], stone2: ['#8a847a', 0.02, 0.92], marble: ['#e2dccf', 0.1, 0.6],
  wood: ['#9a6a42', 0.02, 0.85], wood2: ['#6a4a30', 0.02, 0.88], bark: ['#7a5a3a', 0, 0.95], plaster: ['#fff4e2', 0.02, 0.9], plaster2: ['#f6e4cc', 0.02, 0.9],
  roofRed: ['#e05a4a', 0.05, 0.7], roofBlue: ['#5a8ad8', 0.05, 0.7], roofGreen: ['#6ab85a', 0.05, 0.7], roofOrange: ['#f09a4a', 0.05, 0.7], roofPurple: ['#8a5ad8', 0.05, 0.7], roofGray: ['#8a8a96', 0.05, 0.8],
  leaf: ['#5ab04a', 0, 0.85], leaf2: ['#4a9a3e', 0, 0.85], leafDark: ['#3a6a3a', 0, 0.9], leafGray: ['#8a9480', 0, 0.9], leafPink: ['#ffb8d0', 0, 0.8], leafPurple: ['#7a4a9a', 0, 0.85],
  grass: ['#7ab85a', 0, 0.95], rock: ['#9a9488', 0.02, 0.95], rockDark: ['#4a4450', 0.02, 0.95], dirt: ['#a8845a', 0, 1],
  cloth: ['#5a8ad8', 0, 0.9], clothRed: ['#e05a4a', 0, 0.9], clothYellow: ['#ffd27a', 0, 0.9], clothPink: ['#ff9ac8', 0, 0.9], clothPurple: ['#8a5ad8', 0, 0.9], clothWhite: ['#fff8f0', 0, 0.9],
  gold: ['#e8c060', 0.8, 0.3], iron: ['#3a3a44', 0.7, 0.45], red: ['#d0403a', 0.1, 0.6], white: ['#ffffff', 0, 0.8],
  cheese: ['#ffd24a', 0, 0.7], darkStone: ['#3a3048', 0.1, 0.85], purpleStone: ['#5a4a70', 0.1, 0.8], obsidian: ['#1a1024', 0.6, 0.3],
  candyPink: ['#ffb8d8', 0.05, 0.5], candyBlue: ['#b8e0ff', 0.05, 0.5], candyYellow: ['#fff0a8', 0.05, 0.5], cream: ['#fff8ec', 0, 0.7], choco: ['#7a4a2a', 0.05, 0.6],
};

class ZoneKit {
  constructor(view) {
    this.v = view; this.zone = view.zone; this.scene = view.scene; this.r = view.rand;
    this.T = view.T; this.mc = {}; this.lights = 0;
  }
  gy(x, z) { return this.T ? this.T.baseAt(x, z) : 0; }
  P(c, r) { return this.T.point(c, r); }
  mat(key) {
    if (this.mc[key]) return this.mc[key];
    const [c, m, r] = ZMAT[key];
    const flat = ['rock', 'rockDark', 'stone', 'stone2', 'obsidian', 'darkStone'].includes(key);
    return (this.mc[key] = new THREE.MeshStandardMaterial({ color: c, metalness: m, roughness: r, flatShading: flat }));
  }
  toonM(col) { const k = 'toon' + col; return this.mc[k] || (this.mc[k] = toon(col)); }
  glow(color, k = 2.5) { const key = 'g' + color + k; return this.mc[key] || (this.mc[key] = glowMat(color, k)); }
  M(m) { return typeof m === 'string' ? (ZMAT[m] ? this.mat(m) : this.toonM(m)) : m; }
  add(o) { o.traverse(x => { if (x.isMesh) { x.castShadow = true; x.receiveShadow = true; } }); this.scene.add(o); return o; }
  mesh(geo, mat, x, y, z, o = {}) {
    const m = new THREE.Mesh(geo, this.M(mat));
    m.position.set(x, y + (o.parent || o.abs ? 0 : this.gy(x, z)), z); if (o.ry) m.rotation.y = o.ry; if (o.rx) m.rotation.x = o.rx; if (o.rz) m.rotation.z = o.rz;
    if (o.parent) o.parent.add(m); else this.add(m);
    if (o.noShadow) m.castShadow = false;
    return m;
  }
  colBox(x, z, hw, hd, top) { this.v.colliders.push({ box: true, x, z, hw, hd, top, y: this.T ? this.gy(x, z) : undefined }); }
  col(x, z, r, top) { this.v.colliders.push({ x, z, r, top, y: this.T ? this.gy(x, z) : undefined }); }
  box(x, z, w, h, d, mat, o = {}) {
    const geo = o.round ? new THREEX.RoundedBoxGeometry(w, h, d, 2, Math.min(w, h, d) * 0.1) : new THREE.BoxGeometry(w, h, d);
    const m = this.mesh(geo, mat, x, (o.y || 0) + h / 2, z, o);
    if (o.col !== false && (o.y || 0) < 1.6) {
      const ry = ((o.ry || 0) % Math.PI + Math.PI) % Math.PI, top = (o.y || 0) + h;
      if (ry < 0.05 || ry > Math.PI - 0.05) this.colBox(x, z, w / 2, d / 2, top);
      else if (Math.abs(ry - Math.PI / 2) < 0.05) this.colBox(x, z, d / 2, w / 2, top);
      else this.col(x, z, Math.max(w, d) * 0.45, top);
    }
    return m;
  }
  cyl(x, z, r, h, mat, o = {}) {
    const m = this.mesh(new THREE.CylinderGeometry(o.r2 ?? r, r, h, o.seg || 16, 1, !!o.open), mat, x, (o.y || 0) + h / 2, z, o);
    if (o.col !== false && (o.y || 0) < 1.6) this.col(x, z, Math.max(r, o.r2 || 0), (o.y || 0) + h);
    return m;
  }
  light(x, y, z, color, intensity = 8, dist = 16) {
    if (this.lights >= 4) return null;
    this.lights++;
    const l = new THREE.PointLight(color, intensity, dist, 1.6); l.position.set(x, y + this.gy(x, z), z); this.scene.add(l); return l;
  }
  tick(fn) { this.v.zoneTicks.push(fn); }
  spot(pad = 2) { return this.v.freeSpot(pad); }
  scatter(n, pad, fn) { for (let i = 0; i < n; i++) { const p = this.spot(pad); fn(p.x, p.z, i); } }
  near(x, z, r) { return this.v.reserved.some(p => Math.hypot(p.x - x, p.z - z) < p.r + r); }
  reserve(x, z, r) { this.v.reserved.push({ x, z, r }); }
  batch(mat) {
    const key = typeof mat === 'string' ? mat : mat.uuid;
    this.batches = this.batches || {};
    return (this.batches[key] = this.batches[key] || { acc: new GeoAcc(4), mat: this.M(mat) }).acc;
  }
  flush() {
    for (const b of Object.values(this.batches || {})) { const m = b.acc.mesh(b.mat); if (m) { m.castShadow = true; this.scene.add(m); } }
    this.batches = {};
  }

  // ---------------- 外周 ----------------
  perimeter(style) {
    const Z = this.zone, hw = Z.w / 2, hd = Z.d / 2;
    const gaps = Z.exits.map(e => ({ ...e, ...exitPos(Z, e) }));
    const edges = [
      { side: 'n', len: Z.w, pos: t => [t, -hd], ry: 0 }, { side: 's', len: Z.w, pos: t => [t, hd], ry: 0 },
      { side: 'w', len: Z.d, pos: t => [-hw, t], ry: Math.PI / 2 }, { side: 'e', len: Z.d, pos: t => [hw, t], ry: Math.PI / 2 },
    ];
    for (const ed of edges) {
      const seg = { fence: 2.4, forest: 3.2, rock: 3.4, wall: 4, roots: 4, cloud: 5, void: 3, candy: 3 }[style] || 3;
      for (let t = -ed.len / 2 + seg / 2; t < ed.len / 2; t += seg) {
        if (gaps.some(g => g.side === ed.side && Math.abs(g.at - t) < 3.4)) continue;
        const [x, z] = ed.pos(t);
        this.wallPiece(style, x, z, ed.ry, seg, t, ed.side);
      }
    }
  }
  wallPiece(style, x, z, ry, seg, t, side) {
    const r = this.r;
    const out = { n: [0, -1], s: [0, 1], w: [-1, 0], e: [1, 0] }[side];
    switch (style) {
      case 'fence': {
        this.batch('wood').box(x - (ry ? 0.08 : seg / 2), 0.55, z - (ry ? seg / 2 : 0.08), x + (ry ? 0.08 : seg / 2), 0.68, z + (ry ? seg / 2 : 0.08));
        this.batch('wood').box(x - (ry ? 0.08 : seg / 2), 0.22, z - (ry ? seg / 2 : 0.08), x + (ry ? 0.08 : seg / 2), 0.32, z + (ry ? seg / 2 : 0.08));
        this.batch('wood2').box(x - 0.1, 0, z - 0.1, x + 0.1, 0.9, z + 0.1);
        if (r() < 0.5) this.bush(x + out[0] * 1.6, z + out[1] * 1.6, 0.8 + r() * 0.6);
        break;
      }
      case 'forest': {
        const s = 1 + r() * 0.9; this.roundTree(x + out[0] * (1 + r() * 2), z + out[1] * (1 + r() * 2), s, r() < 0.5 ? 'leaf' : 'leaf2');
        if (r() < 0.6) this.bush(x - out[0] * 0.5 + (r() - 0.5) * 2, z - out[1] * 0.5 + (r() - 0.5) * 2, 0.9 + r() * 0.5);
        break;
      }
      case 'rock': { const s = 1.6 + r() * 2; const m = this.mesh(new THREE.DodecahedronGeometry(s, 0), 'rock', x + out[0] * 1.2, s * 0.5, z + out[1] * 1.2, { ry: r() * 3 }); m.scale.y = 0.8 + r() * 0.8; break; }
      case 'wall': {
        this.box(x, z, ry ? 0.9 : seg, 4.2, ry ? seg : 0.9, 'stone', { col: false });
        this.box(x, z, ry ? 1.1 : seg, 0.35, ry ? seg : 1.1, 'stone2', { y: 4.2, col: false });
        if (Math.round(t / seg) % 2 === 0) this.box(x, z, ry ? 1.1 : 1.1, 0.8, ry ? 1.1 : 1.1, 'stone2', { y: 4.5, col: false });
        break;
      }
      case 'roots': {
        const len = 5 + r() * 4, m = this.mesh(new THREE.CylinderGeometry(0.5, 1.4, len, 8), 'bark', x + out[0], len * 0.28, z + out[1], { rz: (r() - 0.5) * 1.2, rx: (r() - 0.5) * 1.2 });
        break;
      }
      case 'void': {
        if (r() < 0.5) { const s = 1 + r() * 1.5; this.mesh(new THREE.DodecahedronGeometry(s, 0), 'darkStone', x + out[0] * 1.5, -0.3, z + out[1] * 1.5, { ry: r() * 3 }); }
        this.mesh(new THREE.BoxGeometry(ry ? 0.1 : seg, 0.06, ry ? seg : 0.1), this.glow('#b8a8ff', 1.8), x, 0.04, z, { noShadow: true });
        break;
      }
      case 'candy': { const c = ['candyPink', 'candyBlue', 'candyYellow'][Math.floor(r() * 3)]; this.cyl(x + out[0], z + out[1], 0.25, 2.4 + r() * 2, 'cream', { col: false, seg: 8 }); this.mesh(new THREE.SphereGeometry(0.9 + r() * 0.5, 14, 10), c, x + out[0], 3.2 + r() * 1.5, z + out[1]); break; }
    }
  }

  // ---------------- 自然 ----------------
  roundTree(x, z, s = 1, leaf = 'leaf', o = {}) {
    this.cyl(x, z, 0.22 * s, 1.8 * s, 'bark', { r2: 0.16 * s, seg: 7, col: o.col });
    const n = o.lush ? 5 : 3;
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + this.r(); const m = this.mesh(new THREE.IcosahedronGeometry((0.9 + this.r() * 0.3) * s, 1), leaf, x + Math.cos(a) * 0.55 * s, (2.2 + this.r() * 0.5) * s, z + Math.sin(a) * 0.55 * s); m.scale.y = 0.85; }
    this.mesh(new THREE.IcosahedronGeometry(1.05 * s, 1), leaf, x, 2.8 * s, z).scale.y = 0.9;
    if (o.fruit) for (let i = 0; i < 4; i++) { const a = this.r() * 6; this.mesh(new THREE.SphereGeometry(0.12 * s, 8, 6), this.glow(o.fruit, 1.4), x + Math.cos(a) * 0.9 * s, (2.4 + this.r() * 0.6) * s, z + Math.sin(a) * 0.9 * s, { noShadow: true }); }
  }
  pine(x, z, s = 1, leaf = 'leafDark') {
    this.cyl(x, z, 0.2 * s, 1.2 * s, 'bark', { seg: 7 });
    for (let i = 0; i < 3; i++) this.mesh(new THREE.ConeGeometry((1.4 - i * 0.36) * s, 1.6 * s, 8), leaf, x, (1.5 + i * 0.95) * s, z);
  }
  deadTree(x, z, s = 1) {
    this.cyl(x, z, 0.2 * s, 2.6 * s, 'bark', { r2: 0.1 * s, seg: 6 });
    for (let i = 0; i < 4; i++) this.mesh(new THREE.CylinderGeometry(0.03 * s, 0.08 * s, 1.3 * s, 5), 'bark', x, (1.6 + i * 0.25) * s, z, { rz: (i % 2 ? 1 : -1) * (0.6 + this.r() * 0.4), ry: i * 1.6 });
  }
  bush(x, z, s = 1, leaf = 'leaf2', flower) {
    for (let i = 0; i < 3; i++) { const m = this.mesh(new THREE.IcosahedronGeometry(0.55 * s, 1), leaf, x + (i - 1) * 0.45 * s, 0.35 * s, z + (this.r() - 0.5) * 0.4 * s); m.scale.y = 0.75; }
    if (flower) for (let i = 0; i < 4; i++) this.mesh(new THREE.SphereGeometry(0.09 * s, 6, 4), flower, x + (this.r() - 0.5) * 1.2 * s, 0.62 * s, z + (this.r() - 0.5) * 0.6 * s, { noShadow: true });
    this.col(x, z, 0.8 * s, 0.8 * s);
  }
  flowers(x, z, n = 10, r = 2, cols = ['#ffffff', '#ffe07a', '#ffb8d8', '#b8d8ff']) {
    const stem = this.batch('leaf2');
    for (let i = 0; i < n; i++) {
      const a = this.r() * Math.PI * 2, d = Math.sqrt(this.r()) * r, px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d, y = this.gy(px, pz), h = 0.25 + this.r() * 0.2;
      stem.box(px - 0.015, y, pz - 0.015, px + 0.015, y + h, pz + 0.015);
      this.batch(cols[i % cols.length]).box(px - 0.08, y + h, pz - 0.08, px + 0.08, y + h + 0.06, pz + 0.08, '');
    }
  }
  rock(x, z, s = 1, mat = 'rock') { const m = this.mesh(new THREE.DodecahedronGeometry(s, 0), mat, x, s * 0.45, z, { ry: this.r() * 3 }); m.scale.y = 0.7; this.col(x, z, s * 0.9, s); return m; }
  mushroom(x, z, s = 1, cap = '#e05a6a', glowCol) {
    this.cyl(x, z, 0.12 * s, 0.6 * s, 'cream', { col: s > 1.5, seg: 8 });
    const m = this.mesh(new THREE.SphereGeometry(0.4 * s, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), glowCol ? this.glow(glowCol, 1.2) : cap, x, 0.55 * s, z); m.scale.y = 0.7;
    if (!glowCol) for (let i = 0; i < 3; i++) { const a = i * 2.1; this.mesh(new THREE.SphereGeometry(0.06 * s, 6, 4), 'white', x + Math.cos(a) * 0.22 * s, 0.75 * s, z + Math.sin(a) * 0.22 * s, { noShadow: true }); }
  }
  log(x, z, len = 3, ry = 0) { this.mesh(new THREE.CylinderGeometry(0.35, 0.38, len, 10), 'bark', x, 0.35, z, { rz: Math.PI / 2, ry }); this.col(x, z, len * 0.4, 0.7); }
  water(x, z, w, d, o = {}) {
    const m = this.mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ color: o.col || '#6ac0f0', transparent: true, opacity: 0.8, roughness: 0.1, metalness: 0.2, emissive: o.col || '#3a90d0', emissiveIntensity: 0.25 }), x, 0.04, z, { rx: -Math.PI / 2, rz: o.ry || 0, noShadow: true });
    m.receiveShadow = false;
    const y0 = m.position.y; this.tick((dt, t) => { m.material.emissiveIntensity = 0.22 + Math.sin(t * 1.5 + x) * 0.05; m.position.y = y0 + Math.sin(t) * 0.01; });
    return m;
  }
  pond(x, z, r = 3) {
    const m = this.mesh(new THREE.CircleGeometry(r, 32), new THREE.MeshStandardMaterial({ color: '#6ac0f0', transparent: true, opacity: 0.82, roughness: 0.08, metalness: 0.2, emissive: '#3a90d0', emissiveIntensity: 0.25 }), x, 0.05, z, { rx: -Math.PI / 2, noShadow: true });
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; this.rock(x + Math.cos(a) * (r + 0.3), z + Math.sin(a) * (r + 0.3), 0.35 + this.r() * 0.25); }
    this.col(x, z, r * 0.9, 0.3);
    return m;
  }
  bridge(x, z, len, ry = 0, w = 2.4) {
    const g = new THREE.Group(); g.position.set(x, this.gy(x, z), z); g.rotation.y = ry; this.scene.add(g);
    for (let i = 0; i < Math.ceil(len / 0.5); i++) { const p = new THREE.Mesh(new THREE.BoxGeometry(w, 0.1, 0.44), this.mat(i % 2 ? 'wood' : 'wood2')); p.position.set(0, 0.25 + Math.sin(i / (len / 0.5) * Math.PI) * 0.35, -len / 2 + i * 0.5); p.castShadow = true; p.receiveShadow = true; g.add(p); }
    for (const s of [-1, 1]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, len), this.mat('wood2')); rail.position.set(s * w / 2, 0.95, 0); g.add(rail); for (let i = 0; i <= 4; i++) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.8, 0.12), this.mat('wood2')); post.position.set(s * w / 2, 0.5, -len / 2 + i * len / 4); g.add(post); } }
  }

  // ---------------- 村の建物 ----------------
  // にゃんこの家：クリーム色の壁、三角屋根の端に猫耳、丸い扉。face = 玄関の向き
  catHouse(x, z, w, d, h, face, o = {}) {
    const side = face === 'e' || face === 'w', f = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] }[face];
    const W = side ? d : w, D = side ? w : d, faceRy = Math.atan2(f[0], f[1]);
    this.box(x, z, w, h, d, o.wall || (this.r() < 0.5 ? 'plaster' : 'plaster2'));
    // 木の柱（角）
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) this.mesh(new THREE.BoxGeometry(0.25, h, 0.25), 'wood2', x + sx * (w / 2 - 0.05), h / 2, z + sz * (d / 2 - 0.05));
    // 切妻屋根（棟は玄関の向きと直交）
    const roofM = o.roof || pick(['roofRed', 'roofBlue', 'roofGreen', 'roofOrange']);
    const RL = W + 0.8, RD = D / 2 + 0.6, RH = Math.min(2.4, D * 0.5);
    const shape = new THREE.Shape(); shape.moveTo(-RD, 0); shape.lineTo(0, RH); shape.lineTo(RD, 0); shape.lineTo(RD, -0.25); shape.lineTo(0, RH - 0.3); shape.lineTo(-RD, -0.25); shape.closePath();
    const rg = new THREE.ExtrudeGeometry(shape, { depth: RL, bevelEnabled: false }); rg.translate(0, 0, -RL / 2);
    const roof = this.mesh(rg, roofM, x, h, z, { ry: faceRy + Math.PI / 2 });
    // 妻壁（三角）
    const gs = new THREE.Shape(); gs.moveTo(-D / 2, 0); gs.lineTo(0, RH - 0.3); gs.lineTo(D / 2, 0); gs.closePath();
    for (const s of [-1, 1]) this.mesh(new THREE.ShapeGeometry(gs), o.wall || 'plaster', x + (side ? 0 : s * w / 2 * 1.001), h, z + (side ? s * d / 2 * 1.001 : 0), { ry: faceRy + Math.PI / 2 + (s > 0 ? 0 : Math.PI) }).material.side = THREE.DoubleSide;
    // 棟の両端の猫耳
    const ridgeDir = V3(Math.cos(faceRy), 0, -Math.sin(faceRy));
    for (const s of [-1, 1]) { const eg = new THREE.ConeGeometry(0.35, 0.6, 4); eg.rotateY(Math.PI / 4); const e = this.mesh(eg, roofM, x + ridgeDir.x * s * (RL / 2 - 0.4), h + RH + 0.15, z + ridgeDir.z * s * (RL / 2 - 0.4), { ry: faceRy }); e.scale.z = 0.5; }
    // 丸い扉と窓
    const at = (u, y, off = 0.03) => [x + f[0] * (D / 2 + off) + (side ? 0 : u), y, z + f[1] * (D / 2 + off) + (side ? u : 0)];
    const door = new THREE.Shape(); door.moveTo(-0.55, 0); door.lineTo(-0.55, 1.2); door.absarc(0, 1.2, 0.55, Math.PI, 0, true); door.lineTo(0.55, 0); door.closePath();
    this.mesh(new THREE.ShapeGeometry(door), 'wood2', ...at(o.doorU || 0, 0.02), { ry: faceRy, noShadow: true });
    this.mesh(new THREE.CircleGeometry(0.07, 10), 'gold', ...at((o.doorU || 0) + 0.3, 0.9, 0.05), { ry: faceRy, noShadow: true });
    if (W > 3.6) for (const u of [-W / 2 + 0.9, W / 2 - 0.9]) { if (Math.abs(u - (o.doorU || 0)) < 1.2) continue; this.mesh(new THREE.CircleGeometry(0.42, 16), this.glow(o.lit ? '#ffd27a' : '#bfe8ff', o.lit ? 1.6 : 0.6), ...at(u, Math.min(1.7, h - 0.8)), { ry: faceRy, noShadow: true }); this.mesh(new THREE.TorusGeometry(0.44, 0.05, 6, 20), 'wood2', ...at(u, Math.min(1.7, h - 0.8), 0.05), { ry: faceRy }); }
    // 煙突
    if (o.chimney !== false) { this.mesh(new THREE.BoxGeometry(0.5, 1.4, 0.5), 'stone', x - ridgeDir.x * W * 0.25, h + RH * 0.6 + 0.4, z - ridgeDir.z * W * 0.25); if (o.smoke) this.smoke(x - ridgeDir.x * W * 0.25, h + RH * 0.6 + 1.2, z - ridgeDir.z * W * 0.25, '#e8e0d8', 2); }
    // 看板
    if (o.sign) this.sign(...at(0, h - 0.35, 0.3).filter((_, i) => i !== 1), faceRy, o.sign, o.sub, o.signCol || '#ffd27a', h + 0.35 + RH * 0.1, Math.min(3.4, W - 0.4));
    this.reserve(x, z, Math.max(w, d) / 2 + 1);
    return { at, faceRy };
  }
  sign(x, z, ry, text, sub, col = '#ffd27a', y = 3.6, w = 3.2) {
    return this.mesh(new THREE.PlaneGeometry(w, w / 4), new THREE.MeshBasicMaterial({ map: signTex(text, sub, col), transparent: true, toneMapped: false, side: THREE.DoubleSide }), x, y, z, { ry, noShadow: true });
  }
  signpost(x, z, ry, text, sub) {
    this.box(x, z, 0.18, 2.2, 0.18, 'wood2');
    this.sign(x + Math.sin(ry) * 0.12, z + Math.cos(ry) * 0.12, ry, text, sub, '#ffd27a', 1.8, 2.0);
  }
  stall(x, z, ry = 0, cloth = 'clothRed', goods = ['#ffd27a', '#ff8a5a', '#6dff9e']) {
    this.box(x, z, 2.8, 1, 1.4, 'wood', { ry });
    const c = Math.cos(ry), sn = Math.sin(ry), P = (u, v) => [x + u * c + v * sn, z - u * sn + v * c];
    for (const u of [-1.3, 1.3]) for (const v of [-0.6, 0.6]) { const [px, pz] = P(u, v); this.mesh(new THREE.BoxGeometry(0.08, 2.3, 0.08), 'wood2', px, 1.15, pz); }
    const aw = this.mesh(new THREE.BoxGeometry(3.2, 0.1, 1.9), cloth, x, 2.35, z, { ry }); aw.rotateX(0.18);
    for (let i = 0; i < 5; i++) { const [px, pz] = P(-1 + i * 0.5, 0); this.mesh(new THREE.SphereGeometry(0.16, 8, 6), goods[i % goods.length], px, 1.15, pz); }
  }
  // 魚を干す棚
  fishRack(x, z, ry = 0) {
    const c = Math.cos(ry), sn = Math.sin(ry);
    for (const u of [-1.2, 1.2]) this.box(x + u * c, z - u * sn, 0.12, 1.9, 0.12, 'wood2', { col: false });
    this.mesh(new THREE.BoxGeometry(2.6, 0.08, 0.08), 'wood2', x, 1.8, z, { ry });
    for (let i = 0; i < 5; i++) { const u = -1 + i * 0.5, f = this.mesh(new THREE.SphereGeometry(0.14, 10, 8), i % 2 ? '#8ab8d8' : '#b8c8d8', x + u * c, 1.4, z - u * sn); f.scale.set(0.5, 2.2, 0.8); this.mesh(new THREE.ConeGeometry(0.12, 0.18, 3), '#8ab8d8', x + u * c, 1.0, z - u * sn, { rx: Math.PI }).scale.z = 0.3; }
    this.col(x, z, 1.4, 1.9);
  }
  well(x, z) {
    this.cyl(x, z, 1.0, 0.9, 'stone', { seg: 14 });
    this.mesh(new THREE.CircleGeometry(0.85, 20), new THREE.MeshStandardMaterial({ color: '#3a7aaa', roughness: 0.1, emissive: '#1a4a7a', emissiveIntensity: 0.3 }), x, 0.85, z, { rx: -Math.PI / 2, noShadow: true });
    for (const s of [-1, 1]) this.box(x + s * 0.85, z, 0.14, 2.2, 0.14, 'wood2', { y: 0.9, col: false });
    this.mesh(new THREE.ConeGeometry(1.4, 0.8, 4), 'roofRed', x, 3.4, z, { ry: Math.PI / 4 });
    this.mesh(new THREE.CylinderGeometry(0.2, 0.18, 0.3, 10), 'wood', x, 2.2, z);
  }
  fountain(x, z, dry = false) {
    this.cyl(x, z, 2.4, 0.6, 'stone', { seg: 24 });
    this.cyl(x, z, 0.4, 1.8, 'stone2', { seg: 10, col: false });
    this.mesh(new THREE.CylinderGeometry(0.9, 0.5, 0.3, 16), 'stone', x, 1.8, z);
    if (!dry) {
      this.mesh(new THREE.CircleGeometry(2.2, 24), new THREE.MeshStandardMaterial({ color: '#7ad0f8', transparent: true, opacity: 0.8, roughness: 0.05, emissive: '#3a90d0', emissiveIntensity: 0.3 }), x, 0.55, z, { rx: -Math.PI / 2, noShadow: true });
      this.v.emitters.push(dt => { for (let i = 0; i < 20 * dt; i++) this.v.p.emit(V3(x, 2.0 + this.gy(x, z), z), V3((Math.random() - 0.5) * 1.2, 2 + Math.random(), (Math.random() - 0.5) * 1.2), hdr('#bfe8ff', 1.4), { life: 0.9, size: 0.07, grav: 6, drag: 0.2 }); });
    }
  }
  bench(x, z, ry = 0) { this.box(x, z, 2, 0.12, 0.6, 'wood', { y: 0.45, ry, col: false }); this.box(x, z, 1.8, 0.45, 0.4, 'wood2', { ry }); }
  barrel(x, z) { this.cyl(x, z, 0.45, 1.1, 'wood', { seg: 12 }); for (const y of [0.2, 0.9]) this.mesh(new THREE.TorusGeometry(0.46, 0.03, 4, 16), 'iron', x, y, z, { rx: Math.PI / 2 }); }
  crate(x, z, s = 1.1) { this.box(x, z, s, s, s, 'wood', { round: true, ry: this.r() < 0.5 ? 0 : Math.PI / 2 }); }
  lantern(x, z, col = '#ffb04a', h = 2.6) {
    this.box(x, z, 0.18, h, 0.18, 'wood2');
    this.mesh(new THREE.BoxGeometry(0.7, 0.1, 0.1), 'wood2', x + 0.3, h - 0.1, z);
    this.mesh(new THREE.BoxGeometry(0.28, 0.36, 0.28), this.glow(col, 2.2), x + 0.55, h - 0.45, z, { noShadow: true });
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: hdr(col, 0.5), blending: THREE.AdditiveBlending, depthWrite: false }));
    sp.scale.setScalar(1.8); sp.position.set(x + 0.55, h - 0.45 + this.gy(x, z), z); this.scene.add(sp);
  }
  stoneLantern(x, z, col = '#ffb04a') {
    this.box(x, z, 0.9, 0.3, 0.9, 'stone');
    this.cyl(x, z, 0.18, 1.1, 'stone', { y: 0.3, r2: 0.15, col: false, seg: 8 });
    this.box(x, z, 0.7, 0.5, 0.7, 'stone', { y: 1.4, col: false });
    this.mesh(new THREE.BoxGeometry(0.5, 0.3, 0.72), this.glow(col, 2.2), x, 1.65, z, { noShadow: true });
    this.mesh(new THREE.ConeGeometry(0.65, 0.45, 4), 'stone', x, 2.1, z, { ry: Math.PI / 4 });
  }
  brazier(x, z, col = '#ff9a3a', h = 1.3) { this.cyl(x, z, 0.22, h, 'iron', { seg: 8 }); this.mesh(new THREE.CylinderGeometry(0.7, 0.35, 0.45, 12), 'gold', x, h + 0.2, z); this.fire(x, h + 0.45, z, col, 26, 0.28); }
  fire(x, y, z, col = '#ff8a3a', rate = 30, size = 0.25) {
    y += this.gy(x, z);
    this.v.emitters.push(dt => { for (let i = 0; i < rate * dt; i++) this.v.p.emit(V3(x + (Math.random() - 0.5) * 0.4, y, z + (Math.random() - 0.5) * 0.4), V3((Math.random() - 0.5) * 0.3, 1.4 + Math.random(), (Math.random() - 0.5) * 0.3), hdr(col, 2.2), { life: 0.6, size, drag: 1 }); });
  }
  smoke(x, y, z, col = '#c8c8d8', rate = 6) {
    y += this.gy(x, z);
    this.v.emitters.push(dt => { for (let i = 0; i < rate * dt; i++) this.v.p.emit(V3(x + (Math.random() - 0.5) * 0.6, y, z + (Math.random() - 0.5) * 0.6), V3(0, 0.8 + Math.random() * 0.5, 0), hdr(col, 0.35), { life: 2.2, size: 0.6, drag: 0.3 }); });
  }
  campfire(x, z) {
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; this.mesh(new THREE.DodecahedronGeometry(0.22, 0), 'rock', x + Math.cos(a) * 0.6, 0.12, z + Math.sin(a) * 0.6); }
    for (let i = 0; i < 3; i++) this.mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.9, 6), 'bark', x, 0.18, z, { rz: Math.PI / 2, ry: i * 1.05 });
    this.fire(x, 0.3, z, '#ff9a3a', 30, 0.26); this.col(x, z, 0.8, 0.5);
    this.light(x, 1.2, z, '#ffb060', 10, 12);
  }
  tent(x, z, ry = 0, cloth = 'clothYellow') {
    const g = new THREE.ConeGeometry(1.8, 2.2, 4); g.rotateY(Math.PI / 4);
    const m = this.mesh(g, cloth, x, 1.1, z, { ry }); m.scale.set(1, 1, 1.4);
    this.mesh(new THREE.PlaneGeometry(0.9, 1.3), 'wood2', x + Math.sin(ry) * 1.29, 0.65, z + Math.cos(ry) * 1.29, { ry, noShadow: true });
    this.col(x, z, 1.7, 2.2);
  }
  windmill(x, z, s = 1) {
    this.cyl(x, z, 1.4 * s, 6 * s, 'plaster', { r2: 1 * s, seg: 10 });
    this.mesh(new THREE.ConeGeometry(1.4 * s, 1.8 * s, 10), 'roofRed', x, 6.9 * s, z);
    const hub = new THREE.Group(); hub.position.set(x, 5.4 * s + this.gy(x, z), z + 1.2 * s); this.scene.add(hub);
    for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.6 * s, 3.4 * s, 0.06), this.mat('clothWhite')); b.position.y = 1.8 * s; const p = new THREE.Group(); p.rotation.z = i * Math.PI / 2; p.add(b); hub.add(p); b.castShadow = true; }
    this.tick(dt => { hub.rotation.z += dt * 0.6; });
  }
  // 神社：朱い鳥居と小さな社
  torii(x, z, ry = 0, s = 1) {
    const c = Math.cos(ry), sn = Math.sin(ry);
    for (const u of [-1.4, 1.4]) this.cyl(x + u * c * s, z - u * sn * s, 0.16 * s, 3.4 * s, 'red', { seg: 10 });
    this.mesh(new THREE.BoxGeometry(4.2 * s, 0.25 * s, 0.35 * s), 'red', x, 3.5 * s, z, { ry });
    this.mesh(new THREE.BoxGeometry(3.4 * s, 0.18 * s, 0.25 * s), 'red', x, 2.9 * s, z, { ry });
    this.mesh(new THREE.BoxGeometry(4.6 * s, 0.14 * s, 0.4 * s), '#2a2a34', x, 3.68 * s, z, { ry });
  }
  shrine(x, z, ry = 0) {
    this.box(x, z, 4.4, 0.6, 3.6, 'stone', { ry });
    this.box(x, z, 3.2, 2.4, 2.4, 'wood', { ry, y: 0.6 });
    const g = new THREE.ConeGeometry(3.1, 1.6, 4); g.rotateY(Math.PI / 4);
    const r = this.mesh(g, '#3a3a4a', x, 3.8, z, { ry }); r.scale.set(1.2, 1, 0.9);
    this.mesh(new THREE.BoxGeometry(1.6, 0.5, 0.1), 'gold', x + Math.sin(ry) * 1.25, 2.6, z + Math.cos(ry) * 1.25, { ry, noShadow: true });
    this.mesh(new THREE.SphereGeometry(0.22, 12, 10), 'gold', x + Math.sin(ry) * 1.35, 2.0, z + Math.cos(ry) * 1.35);
    this.catStatue(x + Math.sin(ry) * 2.6 + Math.cos(ry) * 1.6, z + Math.cos(ry) * 2.6 - Math.sin(ry) * 1.6, ry, 0.8);
    this.catStatue(x + Math.sin(ry) * 2.6 - Math.cos(ry) * 1.6, z + Math.cos(ry) * 2.6 + Math.sin(ry) * 1.6, ry, 0.8);
  }
  // 猫の石像（台座つき）
  catStatue(x, z, ry = 0, s = 1, mat = 'stone', eye) {
    this.box(x, z, 1.1 * s, 0.5 * s, 1.1 * s, 'stone2', { ry });
    const b = this.mesh(new THREE.SphereGeometry(0.42 * s, 14, 10), mat, x, 0.95 * s, z); b.scale.set(1, 1.15, 0.9);
    this.mesh(new THREE.SphereGeometry(0.4 * s, 14, 10), mat, x, 1.65 * s, z).scale.set(1.15, 0.95, 1);
    for (const sd of [-1, 1]) { const eg = new THREE.ConeGeometry(0.13 * s, 0.26 * s, 4); eg.rotateY(Math.PI / 4); const e = this.mesh(eg, mat, x + Math.cos(ry) * sd * 0.24 * s, 2.0 * s, z - Math.sin(ry) * sd * 0.24 * s, { ry }); e.scale.z = 0.5; e.rotation.z = -sd * 0.35; }
    if (eye) for (const sd of [-1, 1]) this.mesh(new THREE.SphereGeometry(0.05 * s, 8, 6), this.glow(eye, 3), x + Math.cos(ry) * sd * 0.14 * s + Math.sin(ry) * 0.36 * s, 1.68 * s, z - Math.sin(ry) * sd * 0.14 * s + Math.cos(ry) * 0.36 * s, { noShadow: true });
  }
  // お地蔵さまならぬ、ねこ地蔵（ここで休める）
  grave(x, z, ry = 0, name, flowerCol = '#ffffff') {
    this.box(x, z, 0.8, 1.1, 0.3, 'stone', { ry, round: true });
    this.mesh(new THREE.SphereGeometry(0.4, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), 'stone', x, 1.1, z, { ry }).scale.z = 0.38;
    if (name) this.sign(x + Math.sin(ry) * 0.17, z + Math.cos(ry) * 0.17, ry, name, null, '#c8a8ff', 0.7, 0.72);
    this.flowers(x + Math.sin(ry) * 0.5, z + Math.cos(ry) * 0.5, 4, 0.3, [flowerCol]);
  }
  crater(x, z, r = 5) {
    const m = this.mesh(new THREE.TorusGeometry(r, r * 0.22, 10, 36), 'dirt', x, 0, z, { rx: Math.PI / 2 }); m.scale.z = 0.35;
    this.mesh(new THREE.CircleGeometry(r * 0.95, 32), new THREE.MeshStandardMaterial({ color: '#5a4a38', roughness: 1 }), x, 0.03, z, { rx: -Math.PI / 2, noShadow: true });
    for (let i = 0; i < 14; i++) { const a = this.r() * Math.PI * 2, d = r * (1.2 + this.r() * 0.6); this.mesh(new THREE.DodecahedronGeometry(0.2 + this.r() * 0.3, 0), 'rockDark', x + Math.cos(a) * d, 0.1, z + Math.sin(a) * d); }
  }
  // 星のかけら（流れ星の残り）
  starRock(x, z, s = 1, col = '#fff0a8') {
    const m = this.mesh(new THREE.OctahedronGeometry(0.6 * s, 0), new THREE.MeshStandardMaterial({ color: '#fff8e0', emissive: col, emissiveIntensity: 1.2, roughness: 0.3, flatShading: true }), x, 0.5 * s, z, { ry: 0.4 });
    m.scale.y = 1.3;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: hdr(col, 0.8), blending: THREE.AdditiveBlending, depthWrite: false })); sp.scale.setScalar(3 * s); sp.position.copy(m.position); this.scene.add(sp);
    this.tick((dt, t) => { m.rotation.y += dt * 0.3; sp.material.opacity = 0.7 + Math.sin(t * 3) * 0.3; });
    this.col(x, z, 0.8 * s, 1.2 * s);
    return m;
  }
  // 巨木（ほしふる森）
  bigTree(x, z, s = 1, leaf = 'leaf2', glowFruit) {
    this.cyl(x, z, 1.4 * s, 7 * s, 'bark', { r2: 0.9 * s, seg: 12 });
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; const rt = this.mesh(new THREE.ConeGeometry(0.5 * s, 2.6 * s, 6), 'bark', x + Math.cos(a) * 1.4 * s, 0.6 * s, z + Math.sin(a) * 1.4 * s, { rz: Math.cos(a) * 0.9, rx: -Math.sin(a) * 0.9 }); }
    for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2 + 0.3; const m = this.mesh(new THREE.IcosahedronGeometry((2.2 + this.r()) * s, 1), leaf, x + Math.cos(a) * 2.3 * s, (7.5 + this.r() * 1.5) * s, z + Math.sin(a) * 2.3 * s); m.scale.y = 0.75; }
    this.mesh(new THREE.IcosahedronGeometry(3 * s, 1), leaf, x, 9.5 * s, z).scale.y = 0.8;
    if (glowFruit) for (let i = 0; i < 8; i++) { const a = this.r() * 6; this.mesh(new THREE.SphereGeometry(0.2 * s, 8, 6), this.glow(glowFruit, 1.8), x + Math.cos(a) * 3 * s, (6.5 + this.r() * 2) * s, z + Math.sin(a) * 3 * s, { noShadow: true }); }
    this.col(x, z, 1.6 * s, 7 * s);
  }
  // 小さなネズミの家（どんぐり型）
  ratHouse(x, z, s = 1, ry = 0) {
    const b = this.mesh(new THREE.SphereGeometry(0.8 * s, 14, 10), 'wood', x, 0.7 * s, z); b.scale.y = 1.1;
    const cap = this.mesh(new THREE.SphereGeometry(0.88 * s, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), 'bark', x, 1.1 * s, z); cap.scale.y = 0.6;
    this.mesh(new THREE.CylinderGeometry(0.06 * s, 0.06 * s, 0.35 * s, 6), 'bark', x, 1.7 * s, z);
    this.mesh(new THREE.CircleGeometry(0.28 * s, 14), 'wood2', x + Math.sin(ry) * 0.79 * s, 0.4 * s, z + Math.cos(ry) * 0.79 * s, { ry, noShadow: true });
    this.col(x, z, 0.9 * s, 1.8 * s);
  }
  cheese(x, z, s = 1) {
    const g = new THREE.CylinderGeometry(0.8 * s, 0.8 * s, 0.6 * s, 3, 1); const m = this.mesh(g, 'cheese', x, 0.3 * s, z, { ry: this.r() * 3 });
    for (let i = 0; i < 3; i++) this.mesh(new THREE.SphereGeometry(0.1 * s, 6, 4), '#e8b830', x + (this.r() - 0.5) * 0.6 * s, 0.61 * s, z + (this.r() - 0.5) * 0.4 * s, { noShadow: true });
    this.col(x, z, 0.6 * s, 0.6 * s);
  }
  acorns(x, z, n = 8) {
    for (let i = 0; i < n; i++) { const a = this.r() * 6, d = this.r() * 0.9, px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d; const m = this.mesh(new THREE.SphereGeometry(0.18, 8, 6), 'wood', px, 0.2 + (i > 5 ? 0.25 : 0), pz); m.scale.y = 1.2; this.mesh(new THREE.SphereGeometry(0.19, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), 'bark', px, 0.33 + (i > 5 ? 0.25 : 0), pz); }
  }
  // 柱（遺跡・城）
  column(x, z, h = 6, r = 0.6, mat = 'marble') {
    this.box(x, z, r * 2.6, 0.5, r * 2.6, mat);
    this.cyl(x, z, r, h - 1, mat, { y: 0.5, seg: 14, r2: r * 0.9, col: false });
    this.box(x, z, r * 2.6, 0.5, r * 2.6, mat, { y: h - 0.5, col: false });
    this.col(x, z, r * 1.3, h);
  }
  pillarBroken(x, z, h, fallen = false, mat = 'stone') {
    if (fallen) { this.mesh(new THREE.CylinderGeometry(0.55, 0.6, h, 12), mat, x, 0.55, z, { rz: Math.PI / 2, ry: this.r() * 3 }); this.col(x, z, Math.min(h / 2, 2)); return; }
    this.cyl(x, z, 0.6, h, mat, { r2: 0.55, seg: 12 });
    this.box(x, z, 1.5, 0.4, 1.5, 'stone2', { col: false });
    if (this.r() < 0.6) { const m = this.mesh(new THREE.IcosahedronGeometry(0.5, 0), 'leaf', x + 0.3, h, z); m.scale.y = 0.4; }
  }
  // 壁画（ry = 絵の正面）
  mural(x, z, ry, kind = 0, w = 5, h = 3.2, y = 2.2) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 320;
    const g = c.getContext('2d');
    g.fillStyle = '#c8b890'; g.fillRect(0, 0, 512, 320);
    for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '80,60,30'},${Math.random() * 0.12})`; g.fillRect(Math.random() * 512, Math.random() * 320, 4 + Math.random() * 20, 2 + Math.random() * 6); }
    g.strokeStyle = '#6a5030'; g.fillStyle = '#8a6a40'; g.lineWidth = 5; g.lineCap = 'round';
    const cat = (cx, cy, s, fill) => { g.beginPath(); g.ellipse(cx, cy, 28 * s, 34 * s, 0, 0, Math.PI * 2); fill ? g.fill() : g.stroke(); g.beginPath(); g.arc(cx, cy - 46 * s, 24 * s, 0, Math.PI * 2); fill ? g.fill() : g.stroke(); for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(cx + sd * 12 * s, cy - 64 * s); g.lineTo(cx + sd * 22 * s, cy - 84 * s); g.lineTo(cx + sd * 26 * s, cy - 58 * s); g.stroke(); } };
    if (kind === 0) {   // 大きな樹を抱く巨大な猫
      g.lineWidth = 8; g.beginPath(); g.moveTo(256, 300); g.lineTo(256, 150); g.stroke();
      for (let i = 0; i < 7; i++) { g.beginPath(); g.arc(256 + Math.cos(i) * 70, 110 + Math.sin(i * 2) * 30, 50, 0, Math.PI * 2); g.stroke(); }
      g.lineWidth = 6; cat(256, 240, 2.2);
    } else if (kind === 1) {   // 樹のまわりで手をつなぐ四匹（一匹は小さい）
      g.lineWidth = 6; g.beginPath(); g.moveTo(256, 300); g.lineTo(256, 170); g.stroke(); g.beginPath(); g.arc(256, 130, 60, 0, Math.PI * 2); g.stroke();
      [[110, 250, 1], [190, 250, 1], [320, 250, 1], [400, 262, 0.7]].forEach(([cx, cy, s]) => cat(cx, cy, s));
      g.beginPath(); g.moveTo(138, 240); g.lineTo(162, 240); g.moveTo(348, 240); g.lineTo(380, 248); g.stroke();
    } else {   // 光る小さな猫と、枯れた樹
      g.lineWidth = 6; g.beginPath(); g.moveTo(256, 300); g.lineTo(256, 130); g.moveTo(256, 170); g.lineTo(200, 120); g.moveTo(256, 190); g.lineTo(320, 130); g.stroke();
      g.fillStyle = '#e8d890'; cat(256, 290, 0.7, true);
      g.strokeStyle = '#e8d890'; for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; g.beginPath(); g.moveTo(256 + Math.cos(a) * 50, 250 + Math.sin(a) * 50); g.lineTo(256 + Math.cos(a) * 75, 250 + Math.sin(a) * 75); g.stroke(); }
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    this.box(x, z, w + 0.5, h + 0.5, 0.3, 'stone2', { ry, y: y - h / 2 - 0.25 });
    this.mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 }), x + Math.sin(ry) * 0.17, y, z + Math.cos(ry) * 0.17, { ry, noShadow: true });
  }
  // 封印の扉
  sealDoor(x, z, ry = 0, open = false) {
    this.box(x, z, 8, 7, 1.2, 'stone2', { ry });
    const d = this.mesh(new THREE.CircleGeometry(2.6, 40), new THREE.MeshStandardMaterial({ color: '#8a846a', roughness: 0.8 }), x + Math.sin(ry) * 0.62, 3.2, z + Math.cos(ry) * 0.62, { ry, noShadow: true });
    const ring = this.mesh(new THREE.RingGeometry(2.3, 2.5, 48), this.glow('#8affe0', open ? 3 : 1.4), x + Math.sin(ry) * 0.65, 3.2, z + Math.cos(ry) * 0.65, { ry, noShadow: true });
    ring.material = ring.material.clone(); ring.material.side = THREE.DoubleSide;
    this.tick((dt, t) => { ring.rotation.z = t * 0.2; });
    return { d, ring };
  }
  // 猫じゃらし（魔王領の野原に生えている）
  nekojarashi(x, z, s = 1) {
    const stem = this.mesh(new THREE.CylinderGeometry(0.02 * s, 0.03 * s, 1.4 * s, 5), 'leaf2', x, 0.7 * s, z);
    const ear = this.mesh(new THREE.CapsuleGeometry(0.08 * s, 0.35 * s, 3, 8), '#e8d890', x, 1.55 * s, z);
    const ph = this.r() * 6, y0 = ear.position.y;
    this.tick((dt, t) => { const w = Math.sin(t * 1.6 + ph) * 0.2; stem.rotation.z = w * 0.5; ear.rotation.z = w; ear.position.x = x + w * 0.3 * s; });
  }
  spookyTree(x, z, s = 1) {
    this.cyl(x, z, 0.25 * s, 2.6 * s, 'darkStone', { r2: 0.12 * s, seg: 6 });
    for (let i = 0; i < 4; i++) this.mesh(new THREE.CylinderGeometry(0.03 * s, 0.08 * s, 1.3 * s, 5), 'darkStone', x, (1.6 + i * 0.25) * s, z, { rz: (i % 2 ? 1 : -1) * (0.7 + this.r() * 0.4), ry: i * 1.6 });
    const m = this.mesh(new THREE.IcosahedronGeometry(1.1 * s, 1), 'leafPurple', x, 3 * s, z); m.scale.y = 0.8;
    for (let i = 0; i < 3; i++) { const a = this.r() * 6; this.mesh(new THREE.SphereGeometry(0.1 * s, 8, 6), this.glow('#ff8ad8', 2), x + Math.cos(a) * 0.9 * s, 2.6 * s, z + Math.sin(a) * 0.9 * s, { noShadow: true }); }
  }
  // 巨大な根（アーチ）
  root(x0, z0, x1, z1, r = 1, h = 3) {
    const pts = [V3(x0, -0.5, z0), V3((x0 + x1) / 2, h, (z0 + z1) / 2), V3(x1, -0.5, z1)];
    const m = this.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, r, 8, false), 'bark', 0, 0, 0, { abs: true });
    this.col(x0, z0, r * 1.2, 1); this.col(x1, z1, r * 1.2, 1);
    return m;
  }
  // 光る水晶の塊
  ore(x, z, n = 4, col = '#a07bff', s = 1) {
    const g = this.glow(col, 1.7);
    for (let i = 0; i < n; i++) { const h = (0.5 + this.r() * 0.9) * s, m = this.mesh(new THREE.OctahedronGeometry(0.28 * s, 0), g, x + (this.r() - 0.5) * s, h * 0.35, z + (this.r() - 0.5) * s, { rz: (this.r() - 0.5) * 0.8, ry: this.r() * 3, noShadow: true }); m.scale.y = h * 2.4; }
    this.col(x, z, 0.6 * s, 1.5 * s);
  }
  // 石筍
  stalag(x, z, h = 3) { const m = this.mesh(new THREE.ConeGeometry(0.5 + h * 0.12, h, 6), 'rockDark', x, h / 2, z, { ry: this.r() * 3 }); this.col(x, z, 0.4 + h * 0.1, h); return m; }
  floatRock(x, z, y, s = 1) {
    const m = this.mesh(new THREE.DodecahedronGeometry(s, 0), 'darkStone', x, y, z, { ry: this.r() * 3 }); m.scale.y = 0.6;
    const y0 = m.position.y, ph = this.r() * 6; this.tick((dt, t) => { m.position.y = y0 + Math.sin(t * 0.6 + ph) * 0.4; m.rotation.y += dt * 0.1; });
  }
  candy(x, z, s = 1) {
    const c = pick(['candyPink', 'candyBlue', 'candyYellow']);
    if (this.r() < 0.5) { this.cyl(x, z, 0.12 * s, 2.2 * s, 'cream', { seg: 8 }); this.mesh(new THREE.TorusGeometry(0.7 * s, 0.28 * s, 10, 20), c, x, 2.6 * s, z, { ry: this.r() * 3 }); }
    else { const m = this.mesh(new THREE.SphereGeometry(0.9 * s, 14, 10), c, x, 0.8 * s, z); for (let i = 0; i < 6; i++) this.mesh(new THREE.SphereGeometry(0.12 * s, 6, 4), pick(['candyPink', 'candyBlue', 'candyYellow', 'cream']), x + (this.r() - 0.5) * 1.4 * s, 0.9 * s + this.r() * 0.6 * s, z + (this.r() - 0.5) * 1.4 * s); this.col(x, z, 0.9 * s, 1.6 * s); }
  }
  // 外周の空いたところを土地に合った小物で埋める
  fill(style) {
    const Z = this.zone, hw = Z.w / 2, hd = Z.d / 2;
    const n = Math.round(Z.w * Z.d / 150);
    for (let i = 0, tries = 0; i < n && tries < n * 6; tries++) {
      const p = this.spot(2.5);
      if (Math.max(Math.abs(p.x) / hw, Math.abs(p.z) / hd) < 0.45) continue;
      if (this.v.safeAt && this.v.safeAt(p.x, p.z)) continue;
      i++;
      const r = this.r(), { x, z } = p;
      this.v.reserved.push({ x, z, r: 2 });
      switch (style) {
        case 'meadow': if (r < 0.4) this.roundTree(x, z, 0.8 + this.r() * 0.5, this.r() < 0.5 ? 'leaf' : 'leaf2', { fruit: this.r() < 0.2 ? '#ff8a8a' : null }); else if (r < 0.75) this.bush(x, z, 0.8 + this.r() * 0.4, 'leaf2', this.r() < 0.5 ? pick(['#ffffff', '#ffb8d8', '#ffe07a']) : null); else this.flowers(x, z, 12, 1.6); break;
        case 'forest': if (r < 0.5) this.roundTree(x, z, 0.9 + this.r() * 0.7, this.r() < 0.5 ? 'leaf' : 'leaf2', { lush: true }); else if (r < 0.7) this.mushroom(x, z, 0.8 + this.r() * 0.8, pick(['#e05a6a', '#ffb84a']), this.r() < 0.3 ? pick(['#8affc8', '#b8a8ff']) : null); else if (r < 0.85) this.bush(x, z, 1); else this.log(x, z, 2 + this.r() * 2, this.r() * 3); break;
        case 'road': if (r < 0.4) this.roundTree(x, z, 0.9 + this.r() * 0.4); else if (r < 0.7) this.flowers(x, z, 14, 2, ['#ffe07a', '#ffffff', '#ffb84a']); else if (r < 0.85) this.rock(x, z, 0.6 + this.r() * 0.6); else this.bush(x, z, 1); break;
        case 'valley': if (r < 0.45) this.deadTree(x, z, 0.9 + this.r() * 0.5); else if (r < 0.8) this.rock(x, z, 0.8 + this.r() * 0.8, this.r() < 0.5 ? 'rock' : 'rockDark'); else this.flowers(x, z, 6, 1.2, ['#c8a8ff', '#ffffff']); break;
        case 'ruins': if (r < 0.5) this.pillarBroken(x, z, 1.5 + this.r() * 4, this.r() < 0.35); else if (r < 0.75) this.roundTree(x, z, 0.8 + this.r() * 0.5, 'leaf2'); else this.rock(x, z, 0.8, 'stone2'); break;
        case 'demon': if (r < 0.4) this.spookyTree(x, z, 0.9 + this.r() * 0.4); else if (r < 0.75) for (let k = 0; k < 4; k++) this.nekojarashi(x + (this.r() - 0.5) * 2, z + (this.r() - 0.5) * 2, 0.8 + this.r() * 0.5); else this.rock(x, z, 0.8, 'purpleStone'); break;
        case 'tree': if (r < 0.5) this.roundTree(x, z, 0.8 + this.r() * 0.5, 'leafGray'); else if (r < 0.8) this.rock(x, z, 0.8); else this.flowers(x, z, 6, 1.2, ['#c8c8b8']); break;
        case 'end': if (r < 0.6) this.rock(x, z, 1 + this.r() * 1.2, 'darkStone'); else this.floatRock(x, z, 3 + this.r() * 4, 0.6 + this.r() * 0.8); break;
        case 'dream': this.candy(x, z, 0.8 + this.r() * 0.6); break;
      }
    }
  }
}

// 土の道（x0,z0 → x1,z1）
ZoneKit.prototype.path = function (x0, z0, x1, z1, w = 3, col = '#b8946a') {
  const len = Math.hypot(x1 - x0, z1 - z0), key = 'path' + col;
  const m = this.mc[key] || (this.mc[key] = new THREE.MeshStandardMaterial({ color: col, roughness: 1, transparent: true, opacity: 0.9, depthWrite: false }));
  const p = this.mesh(new THREE.PlaneGeometry(w, len + w * 0.6), m, (x0 + x1) / 2, 0.02, (z0 + z1) / 2, { rx: -Math.PI / 2, noShadow: true });
  p.rotation.z = -Math.atan2(x1 - x0, -(z1 - z0)); p.renderOrder = -1; p.receiveShadow = true;
  const disc = this.mesh(new THREE.CircleGeometry(w / 2, 16), m, x1, 0.021, z1, { rx: -Math.PI / 2, noShadow: true }); disc.receiveShadow = true;
};
// 川（colliders で渡れない。bridges の位置だけ通れる）
ZoneKit.prototype.river = function (z, w, x0, x1, bridges = []) {
  this.water((x0 + x1) / 2, z, x1 - x0, w);
  let x = x0;
  for (const b of [...bridges].sort((a, c) => a - c)) { if (b - 1.6 > x) this.colBox((x + b - 1.6) / 2, z, (b - 1.6 - x) / 2, w / 2, 0.2); x = b + 1.6; }
  if (x < x1) this.colBox((x + x1) / 2, z, (x1 - x) / 2, w / 2, 0.2);
  bridges.forEach(b => this.bridge(b, z, w + 2.4, 0));
};

// ============================================================
//  区画ごとの組み立て
// ============================================================
const ZONE_BUILD = {
  // ---------------- 第一章 ----------------
  // ぽかぽか村：広場の井戸、村長の家、ミケの家、商店、魚屋、猫神社
  village(K) {
    K.perimeter('fence');
    const post = storyCond('done');
    K.mesh(new THREE.CircleGeometry(10, 40), new THREE.MeshStandardMaterial({ color: '#c8b494', roughness: 1 }), 0, 0.015, 2, { rx: -Math.PI / 2, noShadow: true }).receiveShadow = true;
    K.path(0, 2, -10, -31, 3.2); K.path(0, 2, 35, 10, 3.2); K.path(0, 2, 8, 31, 3.2); K.path(4, -2, 24, -8, 2.6); K.path(24, -8, 35, -22, 2);
    K.well(0, 2);
    K.catHouse(0, -20, 9, 7, 4, 's', { roof: 'roofRed', sign: '村長の家', lit: true, smoke: true });
    K.catHouse(-26, -8, 6, 6, 3.4, 'e', { roof: 'roofOrange', sign: post ? 'ミケの家（魚屋）' : 'ミケの家' });
    K.fishRack(-24, -2.5, Math.PI / 2);
    K.catHouse(-18, 18, 7, 5, 3.6, 'n', { roof: 'roofBlue', sign: '武器屋', sub: 'つめとぎ・つるぎ' });
    K.catHouse(-5, 19, 6, 5, 3.4, 'n', { roof: 'roofGreen', sign: '道具屋' });
    K.catHouse(11, 20, 8, 6, 4.2, 'n', { roof: 'roofRed', sign: '宿屋 ひだまり亭', lit: true });
    K.catHouse(-24, -22, 6, 5, 3.4, 's', { roof: 'roofGreen' });
    K.catHouse(-30, 12, 5, 5, 3.2, 'e', { roof: 'roofBlue' });
    K.catHouse(14, -22, 6, 5, 3.4, 's', { roof: 'roofOrange' });
    // 魚屋の屋台と干し魚
    K.stall(18.5, 1.5, -Math.PI / 2, 'clothRed', ['#8ab8d8', '#b8c8d8', '#ff9a7a']);
    K.sign(17.2, 1.5, -Math.PI / 2, post ? 'ミケと魚屋' : '魚屋', '今日のおすすめ：焼き魚', '#8ad8ff', 3.1, 2.6);
    K.fishRack(21, -5, 0); K.fishRack(21, 8, 0); K.barrel(16.5, -2); K.barrel(16, 5);
    // 猫神社
    K.torii(24, -9, 0, 1); K.shrine(24, -23, 0);
    K.stoneLantern(21, -13); K.stoneLantern(27, -13);
    for (let z = -12; z > -20; z -= 1.6) K.mesh(new THREE.BoxGeometry(1.6, 0.06, 1), 'stone', 24, 0.03, z, { noShadow: true });
    // 村の小物
    for (const [x, z, ry] of [[-6, 8, 0.4], [6, -4, -0.6]]) K.bench(x, z, ry);
    for (const [x, z] of [[-10, -6], [9, 10], [-14, 8], [4, -12]]) K.lantern(x, z, '#ffc86a', 2.6);
    for (const [x, z] of [[-8, 12], [8, 12], [-12, -12], [12, -10], [-30, -2], [30, 18]]) K.flowers(x, z, 14, 1.8);
    for (const [x, z, s] of [[-32, -26, 1.3], [-6, -28, 1.1], [30, 26, 1.2], [-32, 26, 1.4], [32, -30, 1.1], [-14, 28, 1], [22, 28, 1]]) K.roundTree(x, z, s, 'leaf', { fruit: s > 1.2 ? '#ff8a8a' : null });
    K.crate(-14, 21); K.crate(-13, 22.2, 0.8); K.barrel(-22, 21);
    K.light(0, 5, 2, '#fff0c8', 6, 24);
  },
  // 村はずれの丘：流れ星の落ちたクレーター
  hill(K) {
    K.perimeter('forest');
    K.path(8, -23, 2, 6, 2.6); K.path(2, 6, 0, 23, 2.2);
    K.crater(0, -4, 5);
    if (storyCond('scene:c1_02') && !storyCond('scene:c1_03')) K.starRock(0, -4, 1.1); else if (storyCond('scene:c1_03')) K.starRock(-4, -9, 0.4);
    K.roundTree(-14, 8, 1.7, 'leaf', { lush: true, fruit: '#ff9a9a' }); K.bench(-11, 10, 0.5);
    K.flowers(-8, 14, 20, 3); K.flowers(12, -12, 14, 2.5); K.flowers(14, 8, 16, 3, ['#ffe07a', '#ffffff']);
    for (const [x, z] of [[-18, -14], [18, -2], [16, 16]]) K.rock(x, z, 1 + K.r());
    K.fill('meadow');
  },
  // ほしふる森・入口：小川と丸木橋、きのこ、倒木
  forest(K) {
    K.perimeter('forest');
    K.path(-29, 24, -10, 20, 2.6); K.path(-10, 20, -2, 4, 2.6); K.path(-2, -4, 4, -35, 2.6);
    K.river(0, 3, -30, 30, [-2]);
    for (const [x, z, s] of [[-18, 8, 1.4], [14, 18, 1.5], [18, -18, 1.6], [-16, -22, 1.3], [8, 28, 1.2]]) K.roundTree(x, z, s, 'leaf2', { lush: true });
    for (const [x, z] of [[-8, 12], [12, -8], [-14, -8], [6, 22], [-22, 30]]) K.mushroom(x, z, 0.8 + K.r() * 0.6, '#e05a6a', K.r() < 0.4 ? '#8affc8' : null);
    K.log(10, 8, 3, 0.6); K.log(-20, -14, 2.6, 2);
    K.flowers(-24, 18, 10, 2, ['#fff4a8', '#ffffff']);
    K.fill('forest');
  },
  // ほしふる森・奥：巨木、光るきのこの輪、星の泉
  forestDeep(K) {
    K.perimeter('forest');
    K.path(4, 35, 0, 20, 2.6); K.path(0, 20, -4, -6, 2.6); K.path(-4, -6, -6, -35, 2.6);
    K.bigTree(-14, -16, 1.2, 'leaf2', '#fff4a8'); K.bigTree(18, 18, 1.1, 'leaf', '#b8ffd8');
    K.pond(12, -4, 3.6);
    for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; K.mushroom(-6 + Math.cos(a) * 2.6, 12 + Math.sin(a) * 2.6, 0.7, null, '#8affc8'); }
    K.v.emitters.push(dt => { if (Math.random() < dt * 6) K.v.p.emit(V3(-6 + (Math.random() - 0.5) * 4, 0.4, 12 + (Math.random() - 0.5) * 4), V3(0, 0.6, 0), hdr('#8affc8', 2), { life: 2.4, size: 0.08, drag: 0 }); });
    if (storyCond('scene:c8_04')) K.grave(17, -8, -Math.PI / 2, 'なかま', '#3a3a4a');
    K.fill('forest');
  },
  // ネズミの王国：巨大な根のアーチの下、どんぐりの玉座、ネズミの家
  ratNest(K) {
    K.perimeter('roots');
    K.root(-14, -24, 14, -24, 1.6, 9); K.root(-20, -16, -6, -26, 1.1, 6); K.root(20, -16, 6, -26, 1.1, 6);
    K.box(0, -20, 3, 1.4, 2, 'wood2', { round: true }); K.acorns(0, -20.5, 12);
    K.mesh(new THREE.CylinderGeometry(1.2, 1.4, 2.4, 12, 1, true, Math.PI * 0.2, Math.PI * 0.6), 'wood', 0, 1.6, -20.8, { ry: Math.PI });
    for (const [x, z, s] of [[-14, -6, 1], [-18, 4, 0.9], [14, -8, 1.1], [18, 6, 0.9], [-10, 14, 0.8], [12, 16, 0.8]]) K.ratHouse(x, z, s, Math.atan2(-x, -z));
    for (const [x, z] of [[-12, -10], [8, -12], [-4, 4], [6, 8]]) K.cheese(x, z, 0.8 + K.r() * 0.5);
    for (const [x, z] of [[-6, -14], [6, -14], [-20, -8], [20, -4]]) K.mushroom(x, z, 1.2, null, '#ffd27a');
    K.acorns(-16, 18, 10); K.acorns(18, -16, 8);
  },

  // ---------------- 第二章 ----------------
  // ミャオ街道・丘：うねる道、風車、畑
  road(K) {
    K.perimeter('fence');
    K.path(-8, 47, -2, 26, 3.4); K.path(-2, 26, -10, 4, 3.4); K.path(-10, 4, 2, -20, 3.4); K.path(2, -20, 4, -47, 3.4);
    K.windmill(-15, -22, 1);
    for (let i = 0; i < 6; i++) K.mesh(new THREE.BoxGeometry(8, 0.35, 0.8), 'leaf2', 13, 0.18, 8 + i * 2, { noShadow: true });
    for (let i = 0; i < 6; i++) K.mesh(new THREE.BoxGeometry(8, 0.5, 0.8), '#e8c060', 13, 0.25, -30 + i * 2, { noShadow: true });
    K.signpost(-6, 22, 0, '→ ニャハハ王国', '← ぽかぽか村');
    K.fill('road');
  },
  // 街道の宿場：茶屋・屋台・井戸
  rest(K) {
    K.perimeter('fence');
    K.path(4, 27, 0, 2, 3); K.path(0, 2, -4, -27, 3); K.path(0, 2, 29, 6, 2.6);
    K.catHouse(-10, -8, 7, 6, 3.6, 's', { roof: 'roofGreen', sign: '茶屋 ねこじゃらし', lit: true, smoke: true });
    K.catHouse(12, -16, 7, 5, 3.4, 's', { roof: 'roofRed', sign: '旅人の宿', lit: true });
    K.catHouse(-20, 12, 5, 5, 3.2, 'e', { roof: 'roofBlue' });
    K.stall(19, 4, -Math.PI / 2, 'clothYellow', ['#c8c8d8', '#8a8a96', '#ffd27a']); K.sign(18, 4, -Math.PI / 2, '旅の鍛冶屋', null, '#ffd27a', 3.1, 2.4);
    K.stall(8, 12, Math.PI, 'clothPink');
    K.well(0, -2);
    for (const [x, z] of [[-6, 4], [6, -6]]) K.bench(x, z, 0.3);
    for (const [x, z] of [[-4, -4], [5, 3]]) K.lantern(x, z, '#ffc86a');
    // シロの魔法の失敗で降ってきた魚
    if (storyCond('scene:c2_02')) for (let i = 0; i < 6; i++) { const f = K.mesh(new THREE.SphereGeometry(0.14, 8, 6), '#8ab8d8', 2 + K.r() * 3, 0.1, 3 + K.r() * 3, { ry: K.r() * 3 }); f.scale.set(0.5, 0.5, 2); }
    K.fill('road');
  },
  // まどろみの林：タマが眠っていた大きな木のうろ
  woods(K) {
    K.perimeter('forest');
    K.path(-28, 6, -10, 2, 2.6); K.path(-10, 2, 4, -18, 2.6);
    K.bigTree(4, -26, 1.3, 'leaf', '#fff0a8');
    const hol = K.mesh(new THREE.CircleGeometry(1.2, 20), 'wood2', 4, 1.2, -24.2, { noShadow: true }); hol.scale.y = 1.2;
    for (let i = 0; i < 20; i++) K.mesh(new THREE.SphereGeometry(0.12, 6, 4), pick(['#e8a040', '#d8783a', '#f0c060']), 4 + (K.r() - 0.5) * 3, 0.05, -21.5 + (K.r() - 0.5) * 2, { noShadow: true }).scale.y = 0.3;
    for (let i = 0; i < 6; i++) K.flowers(-16 + K.r() * 32, -20 + K.r() * 40, 10, 2, ['#ffffff', '#fff8c8']);
    K.v.emitters.push(dt => { if (Math.random() < dt * 8) K.v.p.emit(V3((Math.random() - 0.5) * 40, 0.5 + Math.random(), (Math.random() - 0.5) * 50), V3(0.3, 0.2, 0), hdr('#ffffff', 1.2), { life: 5, size: 0.06, drag: 0 }); });
    K.fill('forest');
  },
  // 街道の関所あと：こわれた門、倒れた柵
  checkpoint(K) {
    K.perimeter('rock');
    K.path(-4, 35, 0, -35, 3.4);
    for (const x of [-3.5, 3.5]) K.box(x, -18, 0.6, 4.4, 0.6, 'wood2');
    K.mesh(new THREE.BoxGeometry(8.5, 0.5, 0.6), 'wood2', 1.5, 0.4, -16.6, { rz: 0.25, ry: 0.2 });
    K.box(-6, -18, 5, 1, 0.3, 'wood', { ry: 0.1 }); K.box(7, -17.5, 5, 1, 0.3, 'wood', { ry: -0.3 });
    K.mesh(new THREE.CircleGeometry(7, 24), new THREE.MeshStandardMaterial({ color: '#9a7a52', roughness: 1 }), 12, 0.02, -2, { rx: -Math.PI / 2, noShadow: true });
    for (const [x, z] of [[10, -4], [14, 0], [13, -6]]) K.barrel(x, z);
    K.crate(-12, 8); K.crate(-11, 9.3, 0.8);
    K.fill('road');
  },

  // ---------------- 第三章 ----------------
  // ニャハハ王国：色を失った街（第三章を終えると色が戻る）
  kingdom(K) {
    K.perimeter('wall');
    const happy = !!Save.data.cleared['3-3'];
    const roofs = happy ? ['roofRed', 'roofBlue', 'roofOrange', 'roofPurple', 'roofGreen'] : ['roofGray'];
    K.mesh(new THREE.CircleGeometry(12, 40), new THREE.MeshStandardMaterial({ color: happy ? '#e8d4b8' : '#b8b4b0', roughness: 1 }), 0, 0.015, -4, { rx: -Math.PI / 2, noShadow: true });
    K.fountain(0, -8, !happy);
    // 笑う猫の像（泣き顔の落書き）
    K.catStatue(-8, -8, 0.4, 1.1, happy ? 'marble' : 'stone');
    for (let x = -32; x <= 32; x += 9) { if (Math.abs(x + 10) < 5 || Math.abs(x - 20) < 5) continue; K.catHouse(x, -28, 7, 6, 4.2 + K.r() * 1.2, 's', { roof: pick(roofs), wall: happy ? 'plaster' : 'plaster2', lit: happy }); }
    for (let x = -32; x <= 32; x += 9) { if (Math.abs(x) < 6) continue; K.catHouse(x, 28, 7, 6, 4 + K.r() * 1.2, 'n', { roof: pick(roofs), wall: happy ? 'plaster' : 'plaster2', lit: happy }); }
    K.catHouse(27, 14, 6, 6, 3.6, 'w', { roof: pick(roofs), sign: '道具屋' });
    K.catHouse(-27, 14, 6, 6, 3.8, 'e', { roof: pick(roofs), sign: '宿 わらいねこ亭', lit: true });
    // 旗飾り（色が戻ると鮮やかに）
    const cols = happy ? ['#ff6a8a', '#ffd27a', '#6ad8ff', '#8aff9a'] : ['#8a8a90', '#a0a0a8'];
    for (const [x0, z0, x1, z1] of [[-12, -16, 12, -16], [-12, 8, 12, 8]]) {
      for (let i = 0; i <= 12; i++) { const t = i / 12, x = lerp(x0, x1, t), z = lerp(z0, z1, t), y = 4.6 - Math.sin(t * Math.PI) * 0.8; const g = new THREE.ConeGeometry(0.3, 0.6, 3); g.rotateZ(Math.PI); K.mesh(g, cols[i % cols.length], x, y, z, { noShadow: true }).scale.z = 0.15; }
      for (const x of [x0, x1]) K.box(x, z0, 0.2, 5, 0.2, 'wood2', { col: false });
    }
    K.signpost(16, -14, -0.4, '笑顔の塔', 'この先');
    for (const [x, z] of [[-18, -6], [18, -8], [-16, 18], [16, 18]]) K.lantern(x, z, happy ? '#ffc86a' : '#c8c8d0');
    if (happy) K.light(0, 6, -4, '#fff0c8', 8, 30);
  },
  // ニャハハ城・中庭：赤いじゅうたんと玉座、空の宝物台
  castle(K) {
    K.perimeter('wall');
    K.mesh(new THREE.PlaneGeometry(4, 36), 'clothRed', 0, 0.03, 2, { rx: -Math.PI / 2, noShadow: true });
    K.box(0, -18.5, 10, 0.8, 5, 'marble');
    K.box(0, -19.5, 2.2, 2.6, 1, 'gold', { y: 0.8 }); K.box(0, -19, 2, 0.5, 1.6, 'clothRed', { y: 0.8, col: false });
    for (let z = -12; z <= 16; z += 7) for (const x of [-5, 5]) K.column(x, z, 6, 0.55, 'marble');
    K.cyl(8, -19, 0.7, 1.2, 'marble', { seg: 10 }); K.mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.1, 16), 'gold', 8, 1.25, -19);
    for (const [x, z] of [[-16, -10], [16, -10], [-16, 10], [16, 10]]) K.bush(x, z, 1.3, 'leaf2', '#ffb8d8');
    K.catStatue(-12, -18, 0.3, 1.2, 'marble'); K.catStatue(12, -18, -0.3, 1.2, 'marble');
  },
  // 笑顔の塔（地形マップ）：サーカスの大舞台
  tower(K) {
    const P = (c, r) => K.P(c, r);
    // 下の広間：ポスター・太鼓・玉
    for (const [c, r, col] of [[4, 20, '#ff6a8a'], [17, 21, '#6ad8ff'], [8, 23, '#ffd27a'], [14, 19, '#8aff9a']]) { const [x, z] = P(c, r); K.mesh(new THREE.SphereGeometry(0.6, 16, 12), col, x, 0.6, z); K.col(x, z, 0.6, 1.2); }
    for (const [c, r] of [[3, 24], [18, 24]]) { const [x, z] = P(c, r); K.cyl(x, z, 0.7, 0.9, 'clothRed', { seg: 14 }); K.mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.08, 14), 'white', x, 0.92, z); }
    // 中二階：ジャグリングのピン、観客席
    for (let c = 3; c <= 18; c += 3) { const [x, z] = P(c, 12.2); K.box(x, z, 1.6, 0.5, 0.8, 'clothPurple'); }
    // 最上段：幕と舞台
    const [sx, sz] = P(10.5, 2); const y8 = K.gy(sx, sz);
    K.box(sx, sz - 2, 30, 0.6, 5, 'wood');
    for (const s of [-1, 1]) K.mesh(new THREE.PlaneGeometry(9, 8), 'clothRed', sx + s * 12, y8 + 4, sz - 4.4, { noShadow: true }).material.side = THREE.DoubleSide;
    K.mesh(new THREE.PlaneGeometry(40, 1.4), 'clothYellow', sx, y8 + 7.4, sz - 4.3, { noShadow: true });
    for (let i = 0; i < 5; i++) { const x = sx - 12 + i * 6; K.mesh(new THREE.ConeGeometry(1.2, 6, 16, 1, true), new THREE.MeshBasicMaterial({ color: hdr('#fff0c8', 0.6), transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }), x, 3, sz, { abs: false, noShadow: true }).position.y = y8 + 3; }
    for (const [c, r] of [[2, 2], [19, 2], [2, 11], [19, 11], [2, 19], [19, 19]]) { const [x, z] = P(c, r); K.brazier(x, z, '#ffd27a', 1.1); }
  },

  // ---------------- 第四章 ----------------
  // くろねこ谷：墓標の丘、古いテント、谷の集落、川
  valley(K) {
    K.perimeter('rock');
    K.river(-2, 3, -35, 35, [-4, 16]);
    K.path(-34, 6, -4, 6, 2.6); K.path(-4, 6, -4, -8, 2.6); K.path(-4, -8, 12, -33, 2.4); K.path(-4, -8, -18, -33, 2.4); K.path(-4, 6, 16, 18, 2.4);
    // 墓標：ハヤテ・リン・ゴロウ、名のない四つ目
    K.mesh(new THREE.SphereGeometry(7, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), 'grass', -16, -1.2, -16, { noShadow: true }).scale.y = 0.3;
    [['ハヤテ', -19], ['リン', -16.5], ['ゴロウ', -14], [null, -11.5]].forEach(([n, x]) => K.grave(x, -16, 0, n, '#ffffff'));
    K.deadTree(-22, -20, 1.2);
    // 影の四剣の古いテント
    K.tent(12, -8, 0.3, 'clothPurple'); K.campfire(9, -5);
    // 谷の集落
    K.catHouse(22, 10, 6, 5, 3.4, 's', { roof: 'roofPurple', lit: true, smoke: true });
    K.catHouse(14, 26, 6, 5, 3.4, 'n', { roof: 'roofGray', sign: '谷の宿', lit: true });
    K.catHouse(26, 22, 5, 5, 3.2, 'w', { roof: 'roofPurple', lit: true });
    for (const [x, z] of [[18, 18], [10, 14]]) K.lantern(x, z, '#c8a8ff');
    K.fill('valley');
  },
  // 黒影洞窟（地形マップ）：紫の水晶、石筍、爪あと
  cave(K) {
    const P = (c, r) => K.P(c, r);
    for (const [c, r, n] of [[3, 12, 5], [26, 12, 4], [8, 18, 3], [22, 17, 4], [12, 2, 6], [18, 3, 5], [5, 16, 3], [24, 15, 3]]) { const [x, z] = P(c, r); K.ore(x, z, n, '#a07bff', 1); }
    for (const [c, r] of [[9, 11], [20, 11], [6, 15], [24, 16], [14, 21]]) { const [x, z] = P(c, r); K.stalag(x, z, 1.8 + K.r() * 1.6); }
    // 最奥：古い剣が四本、地面に刺さっている
    const [fx, fz] = P(14.5, 1.5);
    for (let i = 0; i < 4; i++) K.mesh(new THREE.BoxGeometry(0.08, 1.2, 0.02), 'metal', fx - 1.5 + i, K.gy(fx, fz) + 0.5, fz, { abs: true, rz: (i - 1.5) * 0.12 });
    K.light(fx, 3, fz, '#a07bff', 8, 14);
  },
  // ore（水晶）と stalag（石筍）
  _unused() {},

  // ---------------- 第五章 ----------------
  // 古代遺跡・外庭：倒れた柱、四匹の猫の像、遺跡の入口
  ruinsOut(K) {
    K.perimeter('rock');
    K.path(-16, 34, -8, 10, 3); K.path(-8, 10, 0, -34, 3.4); K.path(0, 0, 34, 10, 2.6);
    // 入口の門構え（北）
    for (const x of [-5, 5]) K.column(0 + x, -31, 8, 0.8, 'stone');
    K.box(0, -31, 13, 1.4, 2.2, 'stone2', { y: 8, col: false });
    K.catStatue(-8, -28, 0.3, 1.4, 'stone', '#8affe0'); K.catStatue(8, -28, -0.3, 1.4, 'stone', '#8affe0');
    // 四匹の猫の像
    for (let i = 0; i < 4; i++) K.catStatue(12 + i * 1.3, 17, Math.PI + (i - 1.5) * 0.2, i === 3 ? 0.7 : 1, 'stone');
    for (const [x, z, h, f] of [[-18, -10, 4, false], [-22, 4, 2.5, false], [18, -14, 5, false], [22, 0, 3, true], [-14, 16, 3, true], [10, -20, 2, false]]) K.pillarBroken(x, z, h, f);
    K.fill('ruins');
  },
  // 壁画の回廊：両側の壁に壁画、奥に封印の扉
  ruinsIn(K) {
    K.perimeter('wall');
    K.path(0, 39, 0, -34, 4, '#b8b098');
    K.mural(-16.6, 10, Math.PI / 2, 0); K.mural(16.6, -4, -Math.PI / 2, 1); K.mural(-16.6, -18, Math.PI / 2, 2);
    for (let z = 28; z >= -26; z -= 9) for (const x of [-9, 9]) K.column(x, z, 7, 0.6, 'stone');
    const open = storyCond('scene:c5_03');
    const d = K.sealDoor(0, -37, 0, open);
    if (open) d.d.visible = false;
    for (let i = 0; i < 12; i++) K.mesh(new THREE.RingGeometry(0.5, 0.6, 24), K.glow('#8affe0', 1.2), 0, 0.03, 30 - i * 5.5, { rx: -Math.PI / 2, noShadow: true });
    for (const [x, z] of [[-6, 20], [6, 6], [-6, -10], [6, -24]]) K.brazier(x, z, '#8affe0', 1.2);
  },

  // ---------------- 第六章 ----------------
  // 魔王領：猫じゃらしの野原、健康診断のテント、有給の立て看板
  demonLand(K) {
    K.perimeter('rock');
    K.path(-34, 12, 0, 12, 3); K.path(0, 12, 0, -38, 3.4);
    K.tent(-16, 14, 0.4, 'clothWhite'); K.sign(-16, 16.2, 0.4, '健康診断', '順番にお並びください', '#ff8ad8', 2.6, 2.6);
    for (let i = 0; i < 3; i++) K.box(-12 + i * 1.3, 10, 0.5, 0.45, 0.5, 'wood', { col: false });
    K.signpost(8, 20, -0.3, '有給休暇 申請受付中', '※魔王さまの遊び相手になれる方に限る');
    for (let i = 0; i < 40; i++) K.nekojarashi(14 + K.r() * 16, -6 + K.r() * 20, 0.8 + K.r() * 0.6);
    // 城門（北）
    for (const x of [-5, 5]) { K.box(x, -36, 2.4, 9, 2.4, 'purpleStone'); K.mesh(new THREE.ConeGeometry(1.8, 3, 6), 'darkStone', x, 10.5, -36); }
    K.mesh(new THREE.BoxGeometry(0.8, 1.2, 0.1), K.glow('#ffcf4a', 2), -5, 6, -34.7, { noShadow: true });
    K.fill('demon');
  },
  // 魔王城（地形マップ）：廊下のじゅうたん、健康診断の部屋、休憩室、玉座の間
  demonCastle(K) {
    const P = (c, r) => K.P(c, r);
    { const [x0, z0] = P(11.5, 22), [x1, z1] = P(11.5, 11); K.mesh(new THREE.PlaneGeometry(3.6, Math.abs(z1 - z0) + 2), 'clothRed', x0, 0.03, (z0 + z1) / 2, { rx: -Math.PI / 2, noShadow: true }); }
    // 健康診断の部屋（西）：ベッドと体重計
    for (const [c, r] of [[2, 12], [2, 14]]) { const [x, z] = P(c, r); K.box(x, z, 2.2, 0.7, 1.2, 'clothWhite', { round: true }); }
    { const [x, z] = P(5, 14); K.box(x, z, 1, 0.12, 1, 'metal'); K.box(x - 0.4, z, 0.1, 1.2, 0.1, 'metal', { y: 0.1, col: false }); }
    // 休憩室（東）：お茶のテーブル
    { const [x, z] = P(20, 20); K.cyl(x, z, 1, 0.8, 'wood', { seg: 14 }); for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2; K.box(x + Math.cos(a) * 1.6, z + Math.sin(a) * 1.6, 0.6, 0.5, 0.6, 'clothPurple', { round: true }); } }
    // 玉座の間：大きなクッションの玉座と、猫じゃらし・毛糸玉
    const [tx, tz] = P(11.5, 2); const ty = K.gy(tx, tz);
    K.box(tx, tz - 1, 4, 1.2, 2.4, 'clothPurple', { round: true }); K.box(tx, tz - 2, 4, 3.4, 0.8, 'gold', { round: true });
    for (const [c, r, col] of [[7, 4, '#ff6a8a'], [16, 3, '#6ad8ff'], [9, 5, '#ffd27a']]) { const [x, z] = P(c, r); K.mesh(new THREE.SphereGeometry(0.4, 12, 10), col, x, ty + 0.4, z, { abs: true }); }
    for (let i = 0; i < 6; i++) { const [x, z] = P(4 + i * 3, 1.2); K.box(x, z, 0.8, 5, 0.8, 'purpleStone', { col: false }); K.mesh(new THREE.OctahedronGeometry(0.3), K.glow('#ff8ad8', 2.4), x, ty + 5.6, z, { abs: true }); }
    K.light(tx, ty + 5, tz + 4, '#ff8ad8', 10, 20);
  },

  // ---------------- 第七章 ----------------
  // にゃんだーの樹・根もと：南にそびえる幹、張り出す根、色あせた葉
  treeRoot(K) {
    const h = treeHealth(), revived = h >= 1;
    K.perimeter('fence');
    K.path(0, -41, 0, 36, 3.4); K.path(0, 10, 39, 14, 2.6);
    // 幹（区画の外の南にそびえる）
    K.cyl(0, 62, 22, 90, 'bark', { r2: 14, seg: 24, col: false });
    const leaf = new THREE.MeshStandardMaterial({ color: new THREE.Color('#9a9a88').lerp(new THREE.Color('#5ad06a'), h), roughness: 0.9 });
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; K.mesh(new THREE.IcosahedronGeometry(18, 1), leaf, Math.cos(a) * 30, 80 + (i % 3) * 8, 62 + Math.sin(a) * 26, { noShadow: true }); }
    for (let i = 0; i < 8; i++) { const a = -Math.PI / 2 + (i - 3.5) * 0.28; K.root(Math.cos(a) * 18, 44 + Math.sin(a) * 4, Math.cos(a) * (30 + i * 2), 30 - i * 2, 1.4 + (i % 3) * 0.5, 6 + (i % 2) * 3); }
    // 地面の根と落ち葉
    K.root(-30, 20, -10, 28, 1.2, 4); K.root(30, 22, 12, 30, 1.1, 4);
    for (let i = 0; i < 40; i++) { const m = K.mesh(new THREE.CircleGeometry(0.4, 6), revived ? 'leaf' : 'leafGray', (K.r() - 0.5) * 70, 0.04, (K.r() - 0.5) * 70, { rx: -Math.PI / 2, noShadow: true }); }
    if (revived) for (let i = 0; i < 24; i++) { const a = K.r() * 6; K.mesh(new THREE.SphereGeometry(1, 10, 8), K.glow(pick(['#ffd24a', '#ff8ab8', '#8ad8ff', '#b8ff8a']), 2), Math.cos(a) * 26, 64 + K.r() * 20, 50 + Math.sin(a) * 20, { noShadow: true }); }
    K.fill('tree');
  },
  // 樹の地下：根の天井、光る樹液、奥に樹の心臓
  treeUnder(K) {
    K.perimeter('roots');
    K.path(0, -41, 0, 36, 3, '#6a5a3a');
    for (let z = -34; z <= 30; z += 8) K.root(-22, z, 22, z + 3, 1 + K.r() * 0.6, 9 + K.r() * 3);
    for (const [x0, z0, x1, z1] of [[-20, -20, -8, 0], [18, -10, 6, 12], [-16, 16, -4, 30]]) K.water((x0 + x1) / 2, (z0 + z1) / 2, 1.2, Math.hypot(x1 - x0, z1 - z0), { col: '#8aff8a', ry: Math.atan2(x1 - x0, z1 - z0) });
    // 樹の心臓（奥）
    const heart = K.mesh(new THREE.IcosahedronGeometry(2.4, 1), new THREE.MeshStandardMaterial({ color: '#3a4a2a', emissive: '#8aff6a', emissiveIntensity: treeHealth() >= 1 ? 1.4 : 0.35, flatShading: true }), 0, 3.4, 36);
    K.tick((dt, t) => { heart.rotation.y += dt * 0.2; heart.scale.setScalar(1 + Math.sin(t * 1.2) * 0.04); });
    K.col(0, 36, 2.6, 6);
    for (const [x, z] of [[-10, -24], [10, -8], [-8, 8], [9, 22]]) K.mushroom(x, z, 1.2, null, '#b8ff8a');
    K.light(0, 4, 32, '#8aff8a', 10, 20);
  },

  // ---------------- 第八章 ----------------
  // 世界の果て：浮かぶ岩、光の道、果ての闘技場
  worldEnd(K) {
    K.perimeter('void');
    for (let z = 44; z > -30; z -= 3) { const x = Math.sin(z * 0.12) * 4; K.mesh(new THREE.CylinderGeometry(1.2, 1.4, 0.3, 8), 'darkStone', x, 0.12, z, { noShadow: true }); }
    K.mesh(new THREE.RingGeometry(8, 8.3, 64), K.glow('#b8a8ff', 2), 0, 0.05, -30, { rx: -Math.PI / 2, noShadow: true });
    K.mesh(new THREE.RingGeometry(5, 5.15, 64), K.glow('#ff8ab8', 2), 0, 0.05, -30, { rx: -Math.PI / 2, noShadow: true });
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; K.pillarBroken(Math.cos(a) * 11, -30 + Math.sin(a) * 11, 2 + K.r() * 4, false, 'darkStone'); }
    for (let i = 0; i < 16; i++) K.floatRock((K.r() - 0.5) * 60, (K.r() - 0.5) * 80, 4 + K.r() * 10, 0.8 + K.r() * 2);
    K.fill('end');
  },

  // ---------------- クリア後 ----------------
  // ねこ神の夢：お菓子と魚の浮かぶ夢の世界、奥に巨大な座布団の玉座
  dream(K) {
    K.perimeter('candy');
    K.box(0, -28, 8, 1.4, 8, 'candyPink', { round: true }); K.box(0, -30, 8, 4, 1.4, 'candyYellow', { round: true, y: 1.4 });
    for (const [x, z] of [[-4, -24], [4, -24]]) K.mesh(new THREE.SphereGeometry(0.3, 10, 8), 'gold', x, 1.6, z);
    for (let i = 0; i < 10; i++) {
      const g = new THREE.Group(); const f = new THREE.Mesh(new THREE.SphereGeometry(0.6, 12, 10), toon(pick(['#8ad8ff', '#ff9ab8', '#ffd27a']))); f.scale.set(0.6, 0.8, 1.8); g.add(f);
      const t = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.6, 3), f.material); t.rotation.x = Math.PI / 2; t.position.z = -1.1; t.scale.x = 0.3; g.add(t);
      const x = (K.r() - 0.5) * 50, z = (K.r() - 0.5) * 50, y0 = 4 + K.r() * 6, ph = K.r() * 6; g.position.set(x, y0, z); K.scene.add(g);
      K.tick((dt, tt) => { g.position.y = y0 + Math.sin(tt * 0.8 + ph); g.rotation.y = tt * 0.3 + ph; });
    }
    K.fill('dream');
  },
};
delete ZONE_BUILD._unused;
