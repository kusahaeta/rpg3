'use strict';
// 英語の辞書（data）：日本語の文 → 英語。node tools/lang.js write で、ソースの順に並べなおされる（値は手で直してよい）
Object.assign(EN, {
  // ── data.js ELEMENTS.physical
  '物理': 'Physical',
  '爪': 'Claw',
  // ── data.js ELEMENTS.fire
  '炎': 'Fire',
  // ── data.js ELEMENTS.ice
  '氷': 'Ice',
  // ── data.js ELEMENTS.lightning
  '雷': 'Lightning',
  // ── data.js ELEMENTS.quantum
  '闇': 'Dark',
  // ── data.js ELEMENTS.imaginary
  '光': 'Light',
  // ── data.js PATHS.destruction
  'ゆうしゃ': 'Hero',
  // ── data.js PATHS.hunt
  'かりうど': 'Hunter',
  // ── data.js PATHS.erudition
  'まほう': 'Mage',
  // ── data.js PATHS.harmony
  'おうえん': 'Cheer',
  // ── data.js PATHS.nihility
  'まおう': 'Overlord',
  // ── data.js PATHS.preservation
  'まもり': 'Guard',
  // ── data.js PATHS.abundance
  'いやし': 'Healer',
  // ── data.js CHARS.mike
  'ミケ': 'Mike',
  'ぽかぽか村の食いしん坊': 'Cozyville\'s Hungry Hero',
  'ねこパンチ': 'Cat Punch',
  '指定した敵単体に攻撃力100%の物理ダメージ。': 'Deals Physical DMG equal to 100% of ATK to one enemy.',
  '勇者のつるぎ': 'Hero\'s Sword',
  '指定した敵単体に攻撃力130%、隣接する敵に攻撃力50%の物理ダメージ。': 'Deals Physical DMG equal to 130% of ATK to one enemy and 50% of ATK to adjacent enemies.',
  '流星ねこぎり': 'Meteor Cat Slash',
  '指定した敵単体に攻撃力400%の炎ダメージ。味方全体の攻撃力+15%（2ターン）。': 'Deals Fire DMG equal to 400% of ATK to one enemy. All allies gain +15% ATK (2 turns).',
  '勇者の背中': 'Hero\'s Back',
  '食いしん坊': 'Big Appetite',
  '戦闘中1回、HPが40%を下回ると隠しておいた焼き魚を食べ、HPを30%回復。': 'Once per battle, when HP drops below 40%, eats a hidden grilled fish and restores 30% HP.',
  '仲間の数だけ与ダメージ+5%。': ' +5% DMG dealt for each ally.',
  'もぐもぐ': 'Munch munch',
  'とびかかり': 'Pounce',
  '戦闘開始時、敵全体に攻撃力80%の物理ダメージ。': 'At the start of battle, deals Physical DMG equal to 80% of ATK to all enemies.',
  // ── data.js CHARS.kuro
  'クロ': 'Kuro',
  '空から落ちてきた黒猫': 'The Black Cat Who Fell from the Sky',
  '黒爪': 'Black Claw',
  '孤高の剣': 'Lone Blade',
  '指定した敵単体に攻撃力200%の物理ダメージ。自身は敵に狙われやすくなる（2ターン）。': 'Deals Physical DMG equal to 200% of ATK to one enemy. Kuro becomes more likely to be targeted (2 turns).',
  '挑発': 'Taunt',
  '月影一閃': 'Moonshadow Flash',
  '敵全体に攻撃力150%の物理ダメージ。自身に防御力80%のシールド（3ターン）。': 'Deals Physical DMG equal to 150% of ATK to all enemies. Kuro gains a Shield equal to 80% of DEF (3 turns).',
  '守護': 'Protector',
  '……面倒だ': '...What a Pain',
  '自身の被ダメージ-15%、味方全体の被ダメージ-8%。味方が攻撃を受けてHPが50%を下回ると、その味方に防御力60%+300のシールド（2ターン）。クロのターンごとに1回。': 'Kuro takes 15% less DMG, and all allies take 8% less DMG. When an ally is hit and drops below 50% HP, gives that ally a Shield equal to 60% of DEF + 300 (2 turns). Once per Kuro\'s turn.',
  '自身の被ダメージ-15%。': 'Kuro takes 15% less DMG.',
  '影の足音': 'Shadow Steps',
  '戦闘開始時、敵全体の行動順を20%遅らせる。': 'At the start of battle, delays all enemies\' actions by 20%.',
  '行動遅延': 'Delayed',
  // ── data.js CHARS.shiro
  'シロ': 'Shiro',
  '自称・天才魔法使い': 'Self-Proclaimed Genius Mage',
  'マジックアロー': 'Magic Arrow',
  '指定した敵単体に攻撃力100%の雷ダメージ。': 'Deals Lightning DMG equal to 100% of ATK to one enemy.',
  '天才魔法': 'Genius Magic',
  'ファイア（敵全体に炎110%）・サンダー（単体に雷240%）・アイス（単体に氷140%、隣接に60%、凍結）のどれかを唱える。ただし25%の確率で失敗する（魚が降ってきたり、静電気が起きたりする）。': 'Casts one of Fire (110% Fire to all enemies), Thunder (240% Lightning to one enemy), or Ice (140% Ice to one enemy, 60% to adjacent, Freeze). But it fails 25% of the time (fish rain down, or there\'s a little static shock).',
  'ファイア': 'Fire',
  'サンダー': 'Thunder',
  'アイス': 'Ice',
  '{0}！': '{0}!',
  'ファイア……？': 'Fire...?',
  '魚が降ってきた！': 'It\'s raining fish!',
  'ちがう、そうじゃない！': 'No, not like that!',
  'サンダー……？': 'Thunder...?',
  'パチッ（静電気）': 'Zap (static)',
  '毛が逆立った': 'Fur Standing on End',
  'アイス……？': 'Ice...?',
  'かき氷ができた': 'Made shaved ice',
  'おいしい……': 'Yummy...',
  '失敗は成功のもと！': 'Failure is the mother of success!',
  'ちょう天才メテオ': 'Super Genius Meteor',
  '敵全体に攻撃力230%の炎ダメージ、100%の基礎確率で燃焼（攻撃力40%、2ターン）。': 'Deals Fire DMG equal to 230% of ATK to all enemies, with a 100% base chance to Burn (40% of ATK, 2 turns).',
  'プライド': 'Pride',
  '敵を倒すと与ダメージ+10%（最大3層）。': 'Defeating an enemy grants +10% DMG dealt (stacks up to 3).',
  '魔法の失敗が「成功のもと」になり追撃する。': ' Failed spells become "the mother of success" and trigger a follow-up attack.',
  'ヒール': 'Heal',
  '戦闘開始時、味方全体のHPを15%回復する。（シロの毛が爆発する）': 'At the start of battle, restores 15% HP to all allies. (Shiro\'s fur explodes.)',
  '毛が爆発した！': 'Her fur exploded!',
  // ── data.js CHARS.tama
  'タマ': 'Tama',
  'のんびり屋のふしぎな子': 'The Sleepy, Mysterious Little One',
  'ぽふっ': 'Poof',
  'なでなで': 'Pat Pat',
  '味方単体のHPをタマの最大HP25%+250回復し、他の味方は8%回復。': 'Restores HP to one ally equal to 25% of Tama\'s Max HP + 250, and 8% to the other allies.',
  'おひさまのうた': 'Sunshine Song',
  '味方全体のHPをタマの最大HP30%回復し、デバフを1つ解除する。': 'Restores HP to all allies equal to 30% of Tama\'s Max HP and removes 1 debuff.',
  'おひるね': 'Nap Time',
  '自分のターン開始時、20%の確率で寝てしまい行動できない。そのかわり寝言で味方全体のHPを最大HP6%回復する。（味方がピンチのときは起きている）': 'At the start of Tama\'s turn, 20% chance to fall asleep and skip the turn. Instead, sleep-talking restores 6% Max HP to all allies. (Stays awake when an ally is in danger.)',
  'すやすや……': 'Zzz...',
  'Zzz…': 'Zzz…',
  'ふかふか': 'Fluffy',
  '戦闘開始時、味方全体の最大HP+15%（3ターン）。': 'At the start of battle, all allies gain +15% Max HP (3 turns).',
  // ── data.js CHARS.maou
  'マオウ': 'Maou',
  '尊大な魔王': 'The Haughty Demon King',
  '魔王のしっぽ': 'Demon King\'s Tail',
  '魔王のいあつ': 'Demon King\'s Glare',
  '敵全体に攻撃力90%の闇ダメージ。70%の基礎確率で防御力-25%（2ターン）。': 'Deals Dark DMG equal to 90% of ATK to all enemies. 70% base chance to lower DEF by 25% (2 turns).',
  '威圧': 'Intimidated',
  '暗黒ねこ波': 'Dark Cat Wave',
  '敵全体に攻撃力200%の闇ダメージ。味方全体の与ダメージ+25%（2ターン）。': 'Deals Dark DMG equal to 200% of ATK to all enemies. All allies gain +25% DMG dealt (2 turns).',
  '余に続け': 'Follow Us',
  'きまぐれ': 'Whimsy',
  '自分のターン開始時、攻撃力+20%・速度+10%・会心率+15%のどれかをランダムに得る（2ターン）。': 'At the start of Maou\'s turn, randomly gains one of +20% ATK, +10% SPD, or +15% CRIT Rate (2 turns).',
  '威光': 'Majesty',
  '戦闘開始時、敵全体の攻撃力-15%（2ターン）。': 'At the start of battle, lowers all enemies\' ATK by 15% (2 turns).',
  // ── data.js COMBOS
  'にゃんこブレイク': 'Nyanko Break',
  'ミケとクロの連携。指定した敵単体にミケの攻撃力250%＋クロの攻撃力250%の物理ダメージ。弱点ゲージを大きく削る。': 'Mike and Kuro team up. Deals Physical DMG equal to 250% of Mike\'s ATK + 250% of Kuro\'s ATK to one enemy. Greatly reduces Toughness.',
  'ファイアボール': 'Fireball',
  'ミケが投げた魚にシロが火をつける。敵全体にシロの攻撃力180%の炎ダメージ、燃焼（2ターン）。': 'Shiro sets fire to a fish Mike throws. Deals Fire DMG equal to 180% of Shiro\'s ATK to all enemies and inflicts Burn (2 turns).',
  '黒白連撃': 'Black & White Barrage',
  'クロとシロの交互攻撃。ランダムな敵に、クロ（物理）とシロ（雷）が交互に攻撃力80%のダメージを計6回。': 'Kuro and Shiro take turns attacking. Kuro (Physical) and Shiro (Lightning) alternately hit random enemies for 80% of ATK, 6 hits in total.',
  'にゃんにゃんヒール': 'Nyan-Nyan Heal',
  'タマとみんなで声を合わせる。味方全体のHPを最大HP40%回復し、デバフを解除、シールドを付与。': 'Tama and everyone sing together. Restores 40% Max HP to all allies, removes debuffs, and grants a Shield.',
  '魔王の号令': 'Demon King\'s Command',
  'マオウの号令で全員が奮い立つ。味方全体の行動順を50%早め、攻撃力+30%（2ターン）。敵全体にマオウの攻撃力120%の闇ダメージ。': 'Maou\'s command rallies everyone. Advances all allies\' actions by 50% and grants +30% ATK (2 turns). Deals Dark DMG equal to 120% of Maou\'s ATK to all enemies.',
  '号令': 'Commanded',
  // ── data.js ALLSTARS
  'にゃんこオールスターズ': 'Nyanko All-Stars',
  '世界中の猫たちの「つながり」が力になる。敵全体に全員の攻撃力の合計300%の光ダメージ。': 'The bonds of cats all over the world become power. Deals Light DMG equal to 300% of everyone\'s combined ATK to all enemies.',
  // ── data.js BOND_INFO
  '通常会話': 'Normal talk',
  '戦闘中の掛け合い': 'Battle banter',
  '特別イベント': 'Special event',
  // ── data.js ENEMY_MOVES.strike
  'ひっかき': 'Scratch',
  // ── data.js ENEMY_MOVES.bite
  'かみつき': 'Bite',
  // ── data.js ENEMY_MOVES.heavy
  'たいあたり': 'Tackle',
  // ── data.js ENEMY_MOVES.blast
  'なぎはらい': 'Sweep',
  // ── data.js ENEMY_MOVES.aoe
  'おおあばれ': 'Rampage',
  // ── data.js ENEMY_MOVES.burn
  'ほのおのいき': 'Fire Breath',
  // ── data.js ENEMY_MOVES.frost
  'こおりのいき': 'Frost Breath',
  // ── data.js ENEMY_MOVES.shock
  'びりびり': 'Zap Zap',
  // ── data.js ENEMY_MOVES.slow
  'ねばねば': 'Sticky Goo',
  '減速': 'Slowed',
  // ── data.js ENEMY_MOVES.weaken
  'よわよわの術': 'Weakling Jinx',
  '防御ダウン': 'DEF Down',
  // ── data.js ENEMY_MOVES.charge
  'ちからをためている…': 'is building up power...',
  // ── data.js ENEMY_MOVES.nova
  'だいばくはつ': 'Big Bang',
  // ── data.js ENEMY_MOVES.summon
  'なかまをよんだ': 'called for friends',
  // ── data.js ENEMY_MOVES.puni
  'ぷにぷにアタック': 'Squishy Attack',
  'べとべと': 'Gooey',
  // ── data.js ENEMY_MOVES.spore
  'ねむりの胞子': 'Sleepy Spores',
  'ねむけ': 'Drowsy',
  // ── data.js ENEMY_MOVES.acorn
  'どんぐり投げ': 'Acorn Toss',
  // ── data.js ENEMY_MOVES.cheese
  'チーズどろぼう': 'Cheese Thief',
  // ── data.js ENEMY_MOVES.kingPress
  'キングプレス': 'King Press',
  // ── data.js ENEMY_MOVES.ratCharge
  '腹ぺこで目が回っている…': 'is dizzy with hunger...',
  // ── data.js ENEMY_MOVES.ratStorm
  'ネズミ大行進': 'Mouse Parade',
  // ── data.js ENEMY_MOVES.peck
  'つっつき': 'Peck',
  // ── data.js ENEMY_MOVES.roll
  'ごろごろ爆走': 'Rumble Rush',
  // ── data.js ENEMY_MOVES.howl
  'とおぼえ': 'Howl',
  'ォ': 'O',
  'びくびく': 'Spooked',
  // ── data.js ENEMY_MOVES.rush
  'まっしぐら': 'Headlong Charge',
  // ── data.js ENEMY_MOVES.boarCharge
  '鼻息があらい…': 'is snorting hard...',
  // ── data.js ENEMY_MOVES.boarRush
  'はらぺこ大突進': 'Starving Stampede',
  // ── data.js ENEMY_MOVES.giggle
  'ゲラゲラ笑い': 'Belly Laugh',
  'ハ': 'Ha',
  '笑いすぎ': 'Laughed Too Hard',
  // ── data.js ENEMY_MOVES.chomp
  'クスクスがぶり': 'Snicker Chomp',
  // ── data.js ENEMY_MOVES.laughgas
  'わらいガス': 'Laughing Gas',
  '笑い転げ': 'Rolling with Laughter',
  // ── data.js ENEMY_MOVES.juggle
  'ジャグリング': 'Juggling',
  // ── data.js ENEMY_MOVES.tears
  'なみだの雨': 'Rain of Tears',
  // ── data.js ENEMY_MOVES.showtime
  '最後のショーの準備をしている…': 'is preparing for the final show...',
  // ── data.js ENEMY_MOVES.finale
  'さみしいフィナーレ': 'Lonely Finale',
  // ── data.js ENEMY_MOVES.shade
  'かげぬい': 'Shadow Stitch',
  // ── data.js ENEMY_MOVES.cleave
  '重い一撃': 'Heavy Blow',
  // ── data.js ENEMY_MOVES.kuroCharge
  '影が、刀のまわりに集まっていく…': 'Shadows gather around the blade...',
  // ── data.js ENEMY_MOVES.kuroNova
  '影の乱れ斬り': 'Shadow Flurry',
  // ── data.js ENEMY_MOVES.pastEcho
  'あの日の記憶': 'Memory of That Day',
  '後悔': 'Regret',
  // ── data.js ENEMY_MOVES.stoneGaze
  '石のまなざし': 'Stone Gaze',
  'かちこち': 'Stiff as Stone',
  // ── data.js ENEMY_MOVES.beam
  '古代ビーム': 'Ancient Beam',
  // ── data.js ENEMY_MOVES.mossDust
  'こけのこな': 'Moss Dust',
  'こけまみれ': 'Mossy',
  // ── data.js ENEMY_MOVES.shellDrop
  'こうらおとし': 'Shell Drop',
  // ── data.js ENEMY_MOVES.sealCharge
  '封印の光が集まっている…': 'The light of the seal is gathering...',
  // ── data.js ENEMY_MOVES.sealBurst
  '封印の光': 'Seal Light',
  // ── data.js ENEMY_MOVES.paperwork
  '書類の山': 'Paperwork Pile',
  '事務作業': 'Desk Duty',
  // ── data.js ENEMY_MOVES.checkup
  '健康診断': 'Health Checkup',
  '要再検査': 'Needs a Recheck',
  // ── data.js ENEMY_MOVES.halt
  '止まれーっ！': 'Halt right there!',
  '足止め': 'Held Up',
  // ── data.js ENEMY_MOVES.swish
  'ふりふり': 'Swish Swish',
  // ── data.js ENEMY_MOVES.tickle
  'こしょこしょ': 'Tickle Tickle',
  'くすぐったい': 'Ticklish',
  // ── data.js ENEMY_MOVES.sweep
  'ほうきでサッサッ': 'Broom Sweep',
  // ── data.js ENEMY_MOVES.dust
  'ほこりはらい': 'Dust Off',
  'けほけほ': 'Cough Cough',
  // ── data.js ENEMY_MOVES.hotSoup
  'あつあつスープ': 'Piping-Hot Soup',
  // ── data.js ENEMY_MOVES.waxDrip
  'ろうのしずく': 'Wax Drip',
  'ろうでかちかち': 'Waxed Stiff',
  // ── data.js ENEMY_MOVES.tangle
  'こんがらがり': 'Tangle Up',
  'からまった': 'Tangled',
  // ── data.js ENEMY_MOVES.darkPaw
  '暗黒ねこパンチ': 'Dark Cat Punch',
  // ── data.js ENEMY_MOVES.darkWave
  '魔王の波動': 'Demon King\'s Surge',
  // ── data.js ENEMY_MOVES.maouCharge
  '「余と遊べ……！」': '"Play with Us...!"',
  // ── data.js ENEMY_MOVES.maouNova
  'さびしんぼメテオ': 'Lonely-Heart Meteor',
  // ── data.js ENEMY_MOVES.ladlePoka
  'おたまでポカリ': 'Ladle Bonk',
  // ── data.js ENEMY_MOVES.curryRain
  '魔界カレーのおすそわけ': 'Demon-World Curry Sharing',
  'おなかいっぱい': 'Stuffed',
  // ── data.js ENEMY_MOVES.simmer
  '大なべを、ぐつぐつ煮こんでいる…': 'is stirring a big simmering pot...',
  // ── data.js ENEMY_MOVES.curryNova
  'おかわり自由': 'Free Refills',
  // ── data.js ENEMY_MOVES.hotLadle
  'あつあつおたま': 'Piping-Hot Ladle',
  // ── data.js ENEMY_MOVES.spicyRain
  '激辛カレーの雨': 'Super-Spicy Curry Rain',
  // ── data.js ENEMY_MOVES.pillowSlam
  'まくらアタック': 'Pillow Attack',
  // ── data.js ENEMY_MOVES.snore
  'ごうおんいびき': 'Thunderous Snore',
  // ── data.js ENEMY_MOVES.nidone
  '二度寝': 'Back to Sleep',
  // ── data.js ENEMY_MOVES.nemuCharge
  'ふとんにくるまって、もぞもぞしている…': 'is wriggling around wrapped in a futon...',
  // ── data.js ENEMY_MOVES.negaeri
  '寝返り大回転': 'Rolling Over Spin',
  // ── data.js ENEMY_MOVES.snip
  'せんていバサミ': 'Pruning Shears',
  // ── data.js ENEMY_MOVES.leafStorm
  '落ち葉そうじ旋風': 'Leaf-Sweeping Whirlwind',
  'はっぱまみれ': 'Covered in Leaves',
  // ── data.js ENEMY_MOVES.pruneCharge
  'はさみを、しゃきしゃき研いでいる…': 'is sharpening the shears, shing-shing...',
  // ── data.js ENEMY_MOVES.topiary
  '猫の形に刈りこみ': 'Cat-Shaped Topiary',
  // ── data.js ENEMY_MOVES.yuagariPunch
  '湯上がりパンチ': 'Fresh-from-the-Bath Punch',
  // ── data.js ENEMY_MOVES.manjuToss
  'おみやげまんじゅう投げ': 'Souvenir Bun Toss',
  'もちもち': 'Squishy',
  // ── data.js ENEMY_MOVES.onsenCharge
  '「ふう……いい湯だった……」と、くつろいでいる…': 'is relaxing: "Ahh... what a lovely bath..."',
  // ── data.js ENEMY_MOVES.daichiQuake
  '大地ゆらし': 'Earthshake',
  // ── data.js ENEMY_MOVES.hollow
  'うつろな声': 'Hollow Voice',
  // ── data.js ENEMY_MOVES.isolate
  '孤独': 'Loneliness',
  // ── data.js ENEMY_MOVES.despair
  '絶望': 'Despair',
  // ── data.js ENEMY_MOVES.voidSwirl
  'からっぽの渦': 'Empty Vortex',
  // ── data.js ENEMY_MOVES.shadowRake
  '影の爪あと': 'Shadow Claw Marks',
  // ── data.js ENEMY_MOVES.doubt
  '疑心': 'Doubt',
  // ── data.js ENEMY_MOVES.erase
  '思い出消去': 'Memory Erase',
  // ── data.js ENEMY_MOVES.kodokuCharge
  'すべての声が遠ざかっていく…': 'Every voice is fading away...',
  // ── data.js ENEMY_MOVES.kodokuNova
  'ひとりぼっちの世界': 'A World All Alone',
  // ── data.js ENEMY_MOVES.eclipseCharge
  '空から、光が消えていく…': 'Light is draining from the sky...',
  // ── data.js ENEMY_MOVES.eclipse
  '孤独の月蝕': 'Eclipse of Solitude',
  // ── data.js ENEMY_MOVES.purin
  'ぷるるんボディ': 'Jiggly Body',
  // ── data.js ENEMY_MOVES.splash
  'ぴちぴちビンタ': 'Flip-Flop Slap',
  // ── data.js ENEMY_MOVES.chatter
  'おしゃべり攻撃': 'Chatter Attack',
  '…': '…',
  'うんざり': 'Fed Up',
  // ── data.js ENEMY_MOVES.swarm
  '100匹でおしくらまんじゅう': '100-Cat Squish Pile',
  // ── data.js ENEMY_MOVES.copycat
  'ものまねパンチ': 'Copycat Punch',
  // ── data.js ENEMY_MOVES.plushHug
  'もふもふハグ': 'Fluffy Hug',
  'ふわふわ': 'Fluffed',
  // ── data.js ENEMY_MOVES.godPaw
  '神のねこパンチ': 'Divine Cat Punch',
  // ── data.js ENEMY_MOVES.godCharge
  '「めんどうだが、少し本気を出そう」': '"It\'s a bother, but I suppose I\'ll get a little serious."',
  // ── data.js ENEMY_MOVES.godNova
  '天地創造にゃんこ': 'Creation of Heaven and Earth Nyanko',
  // ── data.js ENEMIES.slime
  'ぷにスライム': 'Squishy Slime',
  // ── data.js ENEMIES.kinoko
  'ねこまたきのこ': 'Two-Tail Mushroom',
  // ── data.js ENEMIES.risu
  'おこりリス': 'Angry Squirrel',
  // ── data.js ENEMIES.nezumi
  'はぐれネズミ': 'Stray Mouse',
  // ── data.js ENEMIES.king_nezumi
  'キングネズミ': 'King Mouse',
  '子分総動員': 'All Hands on Deck',
  'キングネズミ「子分ども、集まれチュウ！」': 'King Mouse: "Underlings, gather \'round, squeak!"',
  // ── data.js ENEMIES.karasu
  'いたずらカラス': 'Prankster Crow',
  // ── data.js ENEMIES.iwa
  'ごろごろ岩': 'Rumblerock',
  // ── data.js ENEMIES.noraInu
  'のら犬': 'Stray Dog',
  // ── data.js ENEMIES.inoshishi
  'ばくそうイノシシ': 'Rampage Boar',
  '暴走': 'Rampaging',
  'ばくそうイノシシは鼻息あらく地面をけった！「もう止まれねえブヒ！」': 'The Rampage Boar snorted and pawed the ground! "Can\'t stop now, oink!"',
  // ── data.js ENEMIES.ghost
  'ゲラゲラゴースト': 'Guffaw Ghost',
  // ── data.js ENEMIES.mimic
  'クスクスミミック': 'Snicker Mimic',
  // ── data.js ENEMIES.piero
  '泣き虫ピエロ': 'Crybaby Clown',
  '泣き顔の仮面': 'Crying Mask',
  '泣き虫ピエロ「笑ってくれないなら……みんな泣かせてやる！」': 'Crybaby Clown: "If you won\'t laugh... then I\'ll make you all cry!"',
  // ── data.js ENEMIES.kageneko
  'かげねこ': 'Shadow Cat',
  // ── data.js ENEMIES.yoroi
  'さまよう鎧': 'Wandering Armor',
  // ── data.js ENEMIES.kako_kuro
  '過去の影クロ': 'Shadow of Kuro\'s Past',
  '心の殻': 'Shell of the Heart',
  '過去の影クロ「近づくな……近づくなッ！」': 'Shadow of Kuro\'s Past: "Stay away... Stay away from me!"',
  '殻が割れた！': 'The shell cracked!',
  '「……っ。なんで、そこまで……」': '"...Ngh. Why go this far..."',
  // ── data.js ENEMIES.sekizou
  '石のねこ像': 'Stone Cat Statue',
  // ── data.js ENEMIES.kokegame
  'こけむしガメ': 'Mossback Turtle',
  // ── data.js ENEMIES.hotaru
  '古代ほたる': 'Ancient Firefly',
  // ── data.js ENEMIES.guardian
  '遺跡の守護神': 'Guardian of the Ruins',
  '守護神の封印紋が、赤く燃えあがった！': 'The Guardian\'s seal crest blazed red!',
  // ── data.js ENEMIES.mazoku
  '魔族兵': 'Demon Soldier',
  // ── data.js ENEMIES.kangoshi
  '魔族の保健係': 'Demon Nurse',
  // ── data.js ENEMIES.monban
  '魔族の門番': 'Demon Gatekeeper',
  // ── data.js ENEMIES.jarashi
  '魔界ねこじゃらし': 'Demon-World Cat Teaser',
  // ── data.js ENEMIES.souji
  '魔族の掃除係': 'Demon Janitor',
  // ── data.js ENEMIES.ryouri
  '魔族の料理番': 'Demon Cook',
  // ── data.js ENEMIES.shokudai
  '生きている燭台': 'Living Candlestick',
  // ── data.js ENEMIES.keito
  'ころころ毛糸玉': 'Rolling Yarn Ball',
  // ── data.js ENEMIES.nuigurumi
  'マオウのぬいぐるみ': 'Maou Plushie',
  // ── data.js ENEMIES.kacchu
  '魔王城の飾り甲冑': 'Castle Display Armor',
  // ── data.js ENEMIES.kanbu
  '魔族の中間管理職': 'Demon Middle Manager',
  // ── data.js ENEMIES.k_gutsu
  '四天王 炎のグツグツ': 'Big Four: Simmer of Flame',
  '強火': 'High Heat',
  'グツグツの大鍋が煮えたぎった！「ここからは強火だァ！」': 'Simmer\'s giant pot came to a roaring boil! "Time to crank up the heat!"',
  // ── data.js ENEMIES.k_nemu
  '四天王 眠りのネムネム': 'Big Four: Snooze of Slumber',
  '熟睡': 'Deep Sleep',
  'ネムネムは、すやすや眠りこんでしまった……「……むにゃ……あと五分……」': 'Snooze dozed right off... "...mmph... five more minutes..."',
  '目をさました！': 'Woke up!',
  '「……はっ！　寝てない、寝てないぞ！」': '"...Huh! I wasn\'t sleeping, I wasn\'t!"',
  // ── data.js ENEMIES.k_choki
  '四天王 風のチョキチョキ': 'Big Four: Snippy of Wind',
  '剪定': 'Pruning',
  'チョキチョキ「ほっほっ、のびすぎた枝は、切りそろえんとな！」': 'Snippy: "Ho ho, branches that grow too long must be trimmed!"',
  // ── data.js ENEMIES.k_dodon
  '四天王 大地のドドン': 'Big Four: Thump of Earth',
  'ひとっ風呂': 'Quick Soak',
  'ドドン「ちょいと、ひとっ風呂……ぬおお、のぼせてきたわい！」': 'Thump: "Just a quick soak... Whoa, I\'m getting all dizzy from the heat!"',
  // ── data.js ENEMIES.boss_maou
  '魔王マオウ': 'Demon King Maou',
  'ぬいぐるみの守り': 'Plushie Guard',
  '魔王マオウ「ぬいぐるみたちよ……余のそばにいろ！」': 'Demon King Maou: "My plushies... stay by Our side!"',
  '守りが消えた！': 'The guard vanished!',
  '「……みんな、いなくなった……」': '"...Everyone\'s gone..."',
  // ── data.js ENEMIES.kakera
  'コドクのかけら': 'Shard of Solitude',
  // ── data.js ENEMIES.utsuro
  '虚ろ': 'Hollow',
  // ── data.js ENEMIES.kodoku_kage
  'コドクの影': 'Shadow of Solitude',
  '孤独の闇': 'Darkness of Solitude',
  'コドクの影がふくれあがった！「……見るな。わたしを、見るな」': 'The Shadow of Solitude swelled up! "...Don\'t look. Don\'t look at me."',
  // ── data.js ENEMIES.kagejuu
  'コドクの獣': 'Beast of Solitude',
  // ── data.js ENEMIES.kodoku
  'コドク': 'Solitude',
  'コドク「まだ手を伸ばすか。ならば、闇の底まで沈めてやろう」': 'Solitude: "You still reach out? Then I will sink you to the bottom of the dark."',
  'コドク「なぜ、ひとりにならぬ……！　この果てを闇でとざす。もう、だれの声も届かぬように！」': 'Solitude: "Why won\'t you be alone...! I will seal this end of the world in darkness. So no voice can ever reach it!"',
  // ── data.js ENEMIES.purin
  '超巨大プリン': 'Super Giant Pudding',
  // ── data.js ENEMIES.sakana
  '喋る魚': 'Talking Fish',
  // ── data.js ENEMIES.tamas
  '100匹のタマ': '100 Tamas',
  // ── data.js ENEMIES.nisemike
  'ミケそっくりの偽物': 'Fake Mike',
  // ── data.js ENEMIES.kuroPlush
  'クロのぬいぐるみ': 'Kuro Plushie',
  // ── data.js ENEMIES.nekogami
  'ねこ神': 'The Cat God',
  'ねこ神「ふむ。少しは本気で遊んでやろう」': 'The Cat God: "Hmm. Perhaps I\'ll play a little more seriously."',
  'ねこ神「よかろう。世界をもう一度作るつもりで、相手をしてやる！」': 'The Cat God: "Very well. I shall face you as if creating the world anew!"',
  // ── data.js CHAPTERS
  'ぽかぽか村・ほしふる森': 'Cozyville & Starfall Forest',
  '流星が落ちた夜が明けて、ミケの冒険が始まる。': 'The night of the shooting star is over, and Mike\'s adventure begins.',
  'ほしふる森の入口': 'Starfall Forest Entrance',
  'ほしふる森の奥': 'Deep in Starfall Forest',
  'ネズミの王国': 'Mouse Kingdom',
  'ミャオ街道': 'Meow Road',
  '世界の異変を調べる旅。街道の先で、ふしぎな仲間と出会う。': 'A journey to look into the strange things happening in the world. Down the road, curious new friends await.',
  '街道の丘': 'Road Hill',
  'まどろみの林': 'Drowsy Woods',
  '風車の畑': 'Windmill Fields',
  'ごろごろ切り通し': 'Rumbling Pass',
  'ニャハハ王国': 'Kingdom of Nyahaha',
  '名前とは正反対に、誰も笑わない街。笑顔の塔に何かがいる。': 'Despite its name, a town where no one laughs. Something is in the Tower of Smiles.',
  '笑顔の塔・下層': 'Tower of Smiles: Lower Floors',
  '笑顔の塔・上層': 'Tower of Smiles: Upper Floors',
  '笑顔の塔・大舞台': 'Tower of Smiles: Grand Stage',
  'くろねこ谷': 'Blackcat Valley',
  'クロの故郷。黒影洞窟の奥に、過去が眠っている。': 'Kuro\'s homeland. The past sleeps deep in Shadowblack Cave.',
  '谷の墓標': 'Valley Graves',
  '黒影洞窟': 'Shadowblack Cave',
  '黒影洞窟・最奥': 'Shadowblack Cave: Depths',
  '古代遺跡': 'Ancient Ruins',
  'クロの旧仲間の記録が示した場所。壁画が、世界の歴史を語る。': 'The place shown in the records of Kuro\'s old friends. The murals tell the history of the world.',
  '遺跡の外庭': 'Ruins Outer Court',
  '壁画の大広間': 'Hall of Murals',
  '封印の間': 'Sealed Chamber',
  '魔王領': 'Demon King\'s Domain',
  '怖い場所のはずなのに、なんだか妙にコミカル。': 'It\'s supposed to be a scary place, but somehow it\'s oddly comical.',
  '魔王領の門': 'Domain Gate',
  '魔王城の保健の間': 'Castle Infirmary',
  '四天王・炎のグツグツ': 'Big Four: Simmer of Flame',
  '四天王・眠りのネムネム': 'Big Four: Snooze of Slumber',
  '四天王・風のチョキチョキ': 'Big Four: Snippy of Wind',
  '四天王・大地のドドン': 'Big Four: Thump of Earth',
  '魔王の間': 'Demon King\'s Chamber',
  'にゃんだーの樹': 'The Nyander Tree',
  'ぽかぽか村の南にそびえる生命樹。その根元に、黒い何かがいる。': 'The great tree of life south of Cozyville. Something dark lurks at its roots.',
  '樹の根の道': 'Root Path',
  '樹の地下': 'Under the Tree',
  '根元の闇': 'Darkness at the Roots',
  '世界の果て': 'World\'s End',
  '旅で出会った猫たちが集まる。最後の戦いへ。': 'The cats you met on your journey gather together. On to the final battle.',
  'ぽかぽか村の防衛': 'Defending Cozyville',
  '世界の果ての道': 'Road to World\'s End',
  'ねこ神の夢': 'The Cat God\'s Dream',
  'クリア後に見つかる、ふしぎな夢の世界。この世界を作った者が待つ。': 'A strange dream world found after the ending. The one who made this world awaits.',
  '夢の入口': 'Dream Entrance',
  'へんてこ回廊': 'Oddball Corridor',
  '夢の玉座': 'Dream Throne',
  // ── data.js ITEMS.onigiri
  'にぼしおにぎり': 'Sardine Rice Ball',
  '味方単体のHPを最大HPの30%回復する。': 'Restores 30% of Max HP to one ally.',
  // ── data.js ITEMS.katsuo
  'かつおぶし': 'Bonito Flakes',
  '味方全体のHPを最大HPの20%回復する。': 'Restores 20% of Max HP to all allies.',
  // ── data.js ITEMS.matatabi
  'またたびの実': 'Catnip Berry',
  '味方単体の必殺技ゲージを最大値の30%ためる。': 'Fills 30% of one ally\'s Ultimate gauge.',
  'ごろごろ': 'Purr purr',
  // ── data.js ITEMS.nekokan
  'ねこ缶': 'Cat Food Can',
  '戦闘不能の味方単体を、HP10%で起こす。': 'Revives one knocked-out ally with 10% HP.',
  // ── data.js ITEMS.ootoro
  'まぐろの大トロ': 'Fatty Tuna',
  '宝箱でしか見つからない、とろける大トロ。味方単体のHPを100%回復する。': 'Melt-in-your-mouth fatty tuna, only found in treasure chests. Fully restores one ally\'s HP.',
  // ── data.js ITEMS.kinmata
  '金のまたたび': 'Golden Catnip',
  '宝箱でしか見つからない、金色にかがやくまたたび。味方単体の必殺技ゲージを満タンにする。': 'Shining golden catnip, only found in treasure chests. Fully charges one ally\'s Ultimate gauge.',
  'ごろごろ♪': 'Purr purr♪',
  // ── data.js ITEMS.jarashi
  '猫じゃらし': 'Cat Teaser',
  'チョキチョキにもらった、だいじな猫じゃらし。敵の前で振る。猫じゃらしに目がない相手は、夢中になって1ターン行動できない（その敵には1戦闘に1回）。': 'A precious cat teaser from Snippy. Wave it in front of an enemy. Foes who can\'t resist cat teasers get so hooked they can\'t act for 1 turn (once per battle per enemy).',
  'みむきもしない': 'Totally ignored it',
  '{0}は猫じゃらしを振った！': '{0} waved the cat teaser!',
  '{0}は夢中になっている……（1ターン行動できない）': '{0} is completely hooked... (can\'t act for 1 turn)',
  '「……！？　こ、これは……っ」': '"...?! Wh-what is this...!"',
  // ── data.js BANTER
  '「クロ、どっちが多く倒すか勝負ね！」': '"Kuro, let\'s see who beats more of \'em!"',
  '「……面倒だ」': '"...What a pain."',
  '「おなか空いてきた！」': '"I\'m getting hungry!"',
  '「……戦闘中だぞ」': '"...We\'re in a fight."',
  '「クロの剣、かっこいいよね！」': '"Your sword is so cool, Kuro!"',
  '「……前を見ろ」': '"...Eyes forward."',
  '「……突っ込みすぎるな」': '"...Don\'t charge in so far."',
  '「だいじょうぶ、クロがいるもん！」': '"It\'s fine, I\'ve got you, Kuro!"',
  '「……おい、魚をくわえたまま戦うな」': '"...Hey. Don\'t fight with a fish in your mouth."',
  '「ふぁい！」': '"Mmkay!"',
  '「シロ、今度は魚じゃなくて火を出してね」': '"Shiro, try making fire this time instead of fish."',
  '「う、うるさいわね！」': '"Oh, be quiet!"',
  '「すごいじゃん天才！」': '"Wow, you really are a genius!"',
  '「と、当然でしょ！」': '"W-well, naturally!"',
  '「わたしの魔法の邪魔しないでよね！」': '"Don\'t get in the way of my magic!"',
  '「へへん、そっちこそ！」': '"Heh, you\'re the one in the way!"',
  '「ミケ、口のまわりに何かついてるわよ」': '"Mike, you\'ve got something around your mouth."',
  '「味見のあと！」': '"Taste-test leftovers!"',
  '「タマ、起きてる？」': '"Tama, you awake?"',
  '「……おきてる……すぴー」': '"...I\'m awake... zzz"',
  '「タマ、危ないから後ろにいてね」': '"Tama, stay behind me, it\'s dangerous."',
  '「うん……ミケにいちゃん……」': '"Okay... big brother Mike..."',
  '「ミケ……いっしょに、あそぼ……」': '"Mike... let\'s play... together..."',
  '「これが終わったらね！」': '"After this, okay?"',
  '「マオウ、魔王の本気を見せてよ！」': '"Maou, show us what a Demon King can really do!"',
  '「フン、言われずとも」': '"Hmph. You need not ask."',
  '「猫じゃらし、持ってきたよ」': '"I brought a cat teaser."',
  '「……い、いらぬ！」': '"...W-We don\'t want it!"',
  '「勇者よ、余の前に立つな。……危ないから」': '"Hero, do not stand in front of Us. ...It\'s dangerous."',
  '「やさしいじゃん！」': '"Aww, that\'s sweet!"',
  '「……魔法、落ち着いて撃て」': '"...Stay calm when you cast."',
  '「わ、わかってるわよ」': '"I-I know that!"',
  '「……さっきのは、よかった」': '"...That last one was good."',
  '「……え？　今ほめた？」': '"...Huh? Did you just compliment me?"',
  '「クロ、前は任せたわよ」': '"Kuro, I\'m counting on you up front."',
  '「……ああ」': '"...Yeah."',
  '「……タマ、無理はするな」': '"...Tama, don\'t push yourself."',
  '「……クロ、やさしいね……」': '"...Kuro... you\'re nice..."',
  '「……寝るなら、俺の後ろで寝ろ」': '"...If you\'re going to sleep, sleep behind me."',
  '「……すぅ……」': '"...zzz..."',
  '「クロ……けが、なおすね……」': '"Kuro... I\'ll fix your owies..."',
  '「……助かる」': '"...Thanks."',
  '「タマ、ほら起きて！　ヒールの時間よ！」': '"Tama, wake up! It\'s time to heal!"',
  '「……あと五分……」': '"...Five more minutes..."',
  '「タマ、はぐれないでね」': '"Tama, don\'t wander off."',
  '「……うん……」': '"...Okay..."',
  '「シロの魔法……きれい……」': '"Shiro\'s magic... so pretty..."',
  '「で、でしょ！」': '"R-right?!"',
  '「……」': '"..."',
  '「……やるか」': '"...Shall we?"',
  '「……うむ」': '"...Indeed."',
  '「……黒猫」': '"...Black cat."',
  '「……なんだ」': '"...What."',
  '「マオウ、あとで魔法の実験台になってね」': '"Maou, be my test subject for some magic later."',
  '「ことわる」': '"We refuse."',
  '「新しい魔法、試していい？」': '"Can I try out a new spell?"',
  '「よ、余に向けるでない！」': '"D-do not point it at Us!"',
  '「白いの、魔法が外れておるぞ」': '"White one, your magic missed."',
  '「わざとよ！」': '"I did that on purpose!"',
  '「マオウも……いっしょにおひるね……する？」': '"Maou... want to... take a nap with us...?"',
  '「……す、少しだけならな」': '"...W-well, perhaps just a short one."',
  '「……小さいの、下がっておれ」': '"...Little one, stay back."',
  '「……うん。ありがと……」': '"...Okay. Thank you..."',
  // ── npcs.js NPCS.sonchou
  '村長': 'Chief',
  'ぽかぽか村の村長': 'Chief of Cozyville',
  // ── npcs.js NPCS.sakanaya
  '魚屋のおばちゃん': 'Fishmonger Auntie',
  '村いちばんの魚屋': 'Best Fishmonger in the Village',
  // ── npcs.js NPCS.bukiya
  '武器屋の親方': 'Smithy Boss',
  'がんこな鍛冶猫': 'A Stubborn Blacksmith Cat',
  // ── npcs.js NPCS.douguya
  'めがねの道具屋': 'The Shopkeeper with Glasses',
  // ── npcs.js NPCS.yadoya
  '宿屋のおかみ': 'Innkeeper',
  'ひだまり亭のおかみ': 'Innkeeper of the Sunny Nook Inn',
  // ── npcs.js NPCS.kannushi
  '神主': 'Shrine Keeper',
  '猫神社の神主': 'Keeper of the Cat Shrine',
  // ── npcs.js NPCS.ann
  'アン': 'Anne',
  'ぽかぽか村のおしゃれ好き': 'Cozyville\'s fashionista',
  // ── npcs.js NPCS.koneko_a
  'こねこのチビ': 'Tiny the Kitten',
  '村の子ども': 'Village Kid',
  // ── npcs.js NPCS.koneko_b
  'こねこのモモ': 'Momo the Kitten',
  // ── npcs.js NPCS.murabito_a
  'シャム爺': 'Grandpa Siam',
  '村の物知り': 'The Village Know-It-All',
  // ── npcs.js NPCS.murabito_b
  'サビ': 'Rusty',
  'ミケのおとなり': 'Mike\'s Neighbor',
  // ── npcs.js NPCS.king_npc
  'ネズミの王国の王': 'King of the Mouse Kingdom',
  // ── npcs.js NPCS.kodomo_nezumi
  'こどもネズミ': 'Mouse Kid',
  'ネズミの王国の子': 'A Child of the Mouse Kingdom',
  // ── npcs.js NPCS.chaya
  '茶屋のおやじ': 'Teahouse Owner',
  '茶屋「ねこじゃらし」': 'The Cat Teaser Teahouse',
  // ── npcs.js NPCS.tabibito_a
  '旅の猫': 'Traveling Cat',
  '街道を行く旅人': 'A Traveler on the Road',
  // ── npcs.js NPCS.tabibito_b
  '行商の猫': 'Peddler Cat',
  '魚を見た旅人': 'The Traveler Who Saw the Fish',
  // ── npcs.js NPCS.bukiya2
  '街道の鍛冶屋': 'Roadside Blacksmith',
  // ── npcs.js NPCS.douguya3
  '行商の道具屋': 'Traveling Item Seller',
  '宿場の道具屋': 'Inn Town\'s Item Seller',
  // ── npcs.js NPCS.tsuribito
  '釣り好きのトラ': 'Tiger the Angler',
  '宿場の川べりの釣り猫': 'The Fishing Cat by the Inn Town\'s River',
  // ── npcs.js NPCS.hachi
  'ハチ': 'Hachi',
  '旅芸人（笛）': 'Traveling Performer (Flute)',
  // ── npcs.js NPCS.buchi
  'ブチ': 'Patches',
  '旅芸人（太鼓）': 'Traveling Performer (Drum)',
  // ── npcs.js NPCS.gonji
  'ゴン爺': 'Old Gon',
  'ニャハハ王国関所の関所番': 'Keeper of the Nyahaha Checkpoint',
  // ── npcs.js NPCS.shimin_a
  '王国の猫': 'Kingdom Cat',
  '笑わない市民': 'A Citizen Who Doesn\'t Laugh',
  // ── npcs.js NPCS.maku
  '笑顔の塔の大ロビーの幕': 'The Curtain in the Tower of Smiles\' Grand Lobby',
  // ── npcs.js NPCS.bikkuri
  '笑顔の塔の楽屋の、大きなびっくり箱': 'The Big Jack-in-the-Box in the Tower of Smiles\' Dressing Room',
  // ── npcs.js NPCS.piero_npc
  '笑顔の塔の道化': 'Jester of the Tower of Smiles',
  // ── npcs.js NPCS.douguya2
  '王国の道具屋': 'Kingdom Item Shop',
  // ── npcs.js NPCS.ishouya
  'おしゃれ屋のマダム': 'Madame Costumier',
  'ニャハハ王国のおしゃれ屋': 'Nyahaha\'s clothes shop',
  // ── npcs.js NPCS.yadoya2
  '宿の主人': 'Innkeeper',
  'わらいねこ亭': 'The Laughing Cat Inn',
  // ── npcs.js NPCS.bukiya3
  '王国の鍛冶屋': 'Kingdom Blacksmith',
  // ── npcs.js NPCS.nyahaha_ou
  'ニャハハ王': 'King Nyahaha',
  '笑いの国の王さま': 'King of the Land of Laughter',
  // ── npcs.js NPCS.daijin
  '大臣': 'Minister',
  'ニャハハ王国の大臣': 'Minister of the Kingdom of Nyahaha',
  // ── npcs.js NPCS.eihei
  '衛兵': 'Guard',
  'ニャハハ城の衛兵': 'Guard of Nyahaha Castle',
  // ── npcs.js NPCS.shisho
  '司書': 'Librarian',
  'ニャハハ王国の大図書館の司書': 'Librarian of the Kingdom of Nyahaha\'s Great Library',
  // ── npcs.js NPCS.kurone
  'クロネ婆': 'Granny Kurone',
  'くろねこ谷の長老': 'Elder of Blackcat Valley',
  // ── npcs.js NPCS.tanimura
  '谷の猫': 'Valley Cat',
  'くろねこ谷の住人': 'A Resident of Blackcat Valley',
  // ── npcs.js NPCS.yadoya3
  '谷の宿の主人': 'Valley Innkeeper',
  'くろねこ谷の宿': 'The Blackcat Valley Inn',
  // ── npcs.js NPCS.hayate
  '「影の四剣」のリーダー': 'Leader of the Four Shadow Blades',
  // ── npcs.js NPCS.rin
  '「影の四剣」の弓使い': 'Archer of the Four Shadow Blades',
  // ── npcs.js NPCS.gorou
  '「影の四剣」の力持ち': 'Strongcat of the Four Shadow Blades',
  // ── npcs.js NPCS.yuki
  'ユキ': 'Yuki',
  'シロの幼なじみ': 'Shiro\'s Childhood Friend',
  // ── npcs.js NPCS.mike_papa
  'ミケのお父さん': 'Mike\'s Dad',
  'ミケの父': 'Mike\'s Father',
  // ── npcs.js NPCS.mike_mama
  'ミケのお母さん': 'Mike\'s Mom',
  'ミケの母': 'Mike\'s Mother',
  // ── npcs.js NPCS.mazoku_yukyu
  '魔族兵のベル': 'Bell the Demon Soldier',
  '有給を申請中': 'Requesting Paid Leave',
  // ── npcs.js NPCS.mazoku_nurse
  '保健係のナース': 'Nurse (Infirmary Staff)',
  '魔王城の保健係': 'Demon King\'s Castle Infirmary Staff',
  // ── npcs.js NPCS.mazoku_c
  '魔王軍の兵士': 'Soldier of the Demon King\'s Army',
  // ── npcs.js NPCS.mazoku_nurse2
  '保健係': 'Infirmary Staff',
  // ── npcs.js NPCS.mazoku_d
  '休憩中': 'On Break',
  // ── npcs.js NPCS.uketsuke
  '受付のメリー': 'Merry the Receptionist',
  '魔王城の面会受付': 'Demon King\'s Castle Visitor Desk',
  // ── npcs.js NPCS.gutsugutsu
  '魔王軍四天王・台所の火の番': 'Big Four of the Demon King\'s Army: Kitchen Fire Keeper',
  // ── npcs.js NPCS.nemunemu
  '魔王軍四天王・夜勤明け': 'Big Four of the Demon King\'s Army: Just Off the Night Shift',
  // ── npcs.js NPCS.chokichoki
  '魔王軍四天王・庭師': 'Big Four of the Demon King\'s Army: Gardener',
  // ── npcs.js NPCS.dodon
  '魔王軍四天王のまとめ役（有給明け）': 'Leader of the Big Four (Just Back from Paid Leave)',
  // ── outfits.js OUTFIT_SLOT_NAME
  'メガネ': 'Glasses',
  '帽子': 'Hat',
  'マント': 'Cape',
  '服': 'Clothes',
  // ── outfits.js OUTFITS.g_round
  'まるメガネ': 'Round Glasses',
  'ふちの細い、まるいメガネ。ちょっと、かしこそうに見える。': 'Thin round frames. They make you look a little bit clever.',
  // ── outfits.js OUTFITS.g_sun
  'サングラス': 'Sunglasses',
  'まっくろなレンズ。まぶしい日も、てれた日も、これで平気。': 'Pitch-black lenses. Bright days or bashful days, you\'re covered.',
  // ── outfits.js OUTFITS.g_star
  'ほしがたメガネ': 'Star Glasses',
  'お祭りの夜にかける、星の形のメガネ。': 'Star-shaped glasses for festival nights.',
  // ── outfits.js OUTFITS.g_clown
  'ピエロのはな': 'Clown Nose',
  'まっかな、まんまるの鼻。つけると、なぜか笑われる。': 'A big, round, bright red nose. Somehow, people laugh when you wear it.',
  // ── outfits.js OUTFITS.h_straw
  'むぎわら帽子': 'Straw Hat',
  'つばの広い、麦わらの帽子。赤いリボンつき。': 'A wide-brimmed straw hat with a red ribbon.',
  // ── outfits.js OUTFITS.h_silk
  'シルクハット': 'Top Hat',
  '背の高い、紳士の帽子。かぶると、背すじがのびる。': 'A tall gentleman\'s hat. Wear it and you\'ll stand up straighter.',
  // ── outfits.js OUTFITS.h_beret
  'ベレー帽': 'Beret',
  'ななめにかぶる、やわらかい帽子。絵がうまくなりそうな気がする。': 'A soft hat worn at a tilt. You feel like you could paint a masterpiece.',
  // ── outfits.js OUTFITS.h_clown
  'ピエロの帽子': 'Clown Hat',
  'しましまの、とんがり帽子。てっぺんのぽんぽんが、ゆれる。': 'A striped, pointy hat. The pom-pom on top bounces around.',
  // ── outfits.js OUTFITS.c_night
  'よぞらのマント': 'Night Sky Cape',
  '夜空のような紺色に、星がちりばめてある。': 'Navy like the night sky, sprinkled with stars.',
  // ── outfits.js OUTFITS.c_sakura
  'さくらのマント': 'Sakura Cape',
  '春の花びらを染めた、うすもものマント。': 'A pale pink cape dyed with spring petals.',
  // ── outfits.js OUTFITS.c_royal
  '王さまのマント': 'Royal Cape',
  'ふちに白い毛皮をつけた、まっかなマント。えらくなった気分。': 'A bright red cape trimmed with white fur. You feel very important.',
  // ── outfits.js OUTFITS.c_clown
  'ピエロのマント': 'Clown Cape',
  'ひし形もようの、にぎやかなマント。': 'A lively cape with a diamond pattern.',
  // ── outfits.js OUTFITS.w_sweater
  'しましまセーター': 'Striped Sweater',
  'ふかふかの毛糸のセーター。寒い日も、ぬくぬく。': 'A fluffy wool sweater. Snug and toasty on cold days.',
  // ── outfits.js OUTFITS.w_happi
  'はっぴ': 'Happi Coat',
  'お祭りの服。着ると、なんだか元気が出る。': 'A festival coat. Wearing it somehow fills you with energy.',
  // ── outfits.js OUTFITS.w_tux
  'タキシード': 'Tuxedo',
  'ぱりっとした黒い礼服に、赤い蝶ネクタイ。': 'A crisp black suit with a red bow tie.',
  // ── outfits.js OUTFITS.w_clown
  'ピエロの服': 'Clown Suit',
  '右と左で色のちがう、水玉の服。ひらひらの襟と、ぽんぽんのボタン。': 'A polka-dot suit with a different color on each side. Frilly collar and pom-pom buttons.',
  // ── weapons.js WEAPON_KIND
  '剣': 'Sword',
  '刀': 'Katana',
  '杖': 'Staff',
  'まくら': 'Pillow',
  '笏': 'Scepter',
  // ── weapons.js WEAPONS.mike_wood
  '木のつるぎ': 'Wooden Sword',
  '村で拾った木のつるぎ。勇者の技は、旅とともに育っていく。': 'A wooden sword picked up in the village. A hero\'s skills grow along with the journey.',
  // ── weapons.js WEAPONS.mike_katsuo
  'かつおぶしソード': 'Bonito Sword',
  'かつおぶしを削って作った剣。振るたびに、いいにおいがする。': 'A sword carved from dried bonito. Smells delicious every time you swing it.',
  'ひとけずり': 'One Shave',
  '指定した敵単体に攻撃力100%の物理ダメージ。自身のHPを最大HP4%回復。': 'Deals Physical DMG equal to 100% of ATK to one enemy. Restores 4% of own Max HP.',
  'けずり節': 'Bonito Shavings',
  'ランダムな敵に攻撃力55%の物理ダメージを4回。そのあと、だしの香りで味方全体のHPを最大HP5%回復。': 'Deals Physical DMG equal to 55% of ATK to random enemies 4 times. Then the smell of soup stock restores 5% Max HP to all allies.',
  'だしの大波': 'Great Wave of Broth',
  '敵全体に攻撃力170%の炎ダメージ。味方全体のHPを最大HP15%回復。': 'Deals Fire DMG equal to 170% of ATK to all enemies. Restores 15% Max HP to all allies.',
  // ── weapons.js WEAPONS.mike_flame
  'ほのおのつるぎ': 'Flame Sword',
  '大樹のうろで眠っていた、刃が燃えているつるぎ。': 'A sword with a blazing blade, found sleeping in the Great Tree Hollow.',
  '火の粉': 'Sparks',
  '指定した敵単体に攻撃力100%の炎ダメージ。40%の基礎確率で燃焼（攻撃力30%、2ターン）。': 'Deals Fire DMG equal to 100% of ATK to one enemy. 40% base chance to Burn (30% of ATK, 2 turns).',
  '燃えうつり': 'Spreading Flames',
  '指定した敵単体に攻撃力120%、隣接する敵に攻撃力50%の炎ダメージ。指定した敵を燃焼（攻撃力50%、2ターン）、隣接する敵も50%の基礎確率で燃焼。': 'Deals Fire DMG equal to 120% of ATK to one enemy and 50% of ATK to adjacent enemies. Burns the target (50% of ATK, 2 turns); adjacent enemies have a 50% base chance to Burn.',
  '炎の大車輪': 'Flame Wheel',
  '敵全体に攻撃力170%の炎ダメージ。燃焼している敵は、燃焼のダメージがその場でもう一度発生する。': 'Deals Fire DMG equal to 170% of ATK to all enemies. Burning enemies take their Burn damage again on the spot.',
  // ── weapons.js WEAPONS.mike_big
  'ねこじゃらしの大剣': 'Cat Teaser Greatsword',
  'にゃんだーの樹の根にからまっていた大剣。ふさふさの先っぽが、つい気になる。': 'A greatsword that was tangled in the Nyander Tree\'s roots. The fluffy tip is so distracting.',
  'ぶんまわし': 'Big Swing',
  '指定した敵単体に攻撃力90%、隣接する敵に攻撃力30%の物理ダメージ。': 'Deals Physical DMG equal to 90% of ATK to one enemy and 30% of ATK to adjacent enemies.',
  'ためぎり': 'Charged Slash',
  '指定した敵単体に攻撃力300%の物理ダメージ。大きく振りかぶるので、自身の行動順が20%遅れる。': 'Deals Physical DMG equal to 300% of ATK to one enemy. The big windup delays your next action by 20%.',
  'にゃんだー斬り': 'Nyander Slash',
  '指定した敵単体に攻撃力550%の光ダメージ。弱点撃破されている敵には、与ダメージ+50%。': 'Deals Light DMG equal to 550% of ATK to one enemy. +50% DMG against enemies with Weakness Break.',
  // ── weapons.js WEAPONS.kuro_black
  '古びた黒刀': 'Worn Black Katana',
  '空から落ちてきたときに持っていた刀。ひとりで戦ってきた、するどい技が身についている。': 'The katana Kuro had when he fell from the sky. Sharp techniques from fighting alone are built into it.',
  // ── weapons.js WEAPONS.kuro_bokuto
  'まもりの木刀': 'Guardian Bokken',
  '道場で使う、かたい木刀。斬るより、受けとめるための刀。': 'A hard wooden sword used in training halls. Made more for blocking than cutting.',
  '受け流し': 'Parry',
  '指定した敵単体に防御力100%の物理ダメージ。': 'Deals Physical DMG equal to 100% of DEF to one enemy.',
  'かばう構え': 'Covering Stance',
  '自身は敵に狙われやすくなり（2ターン）、防御力80%+300のシールドを得る。味方全体の被ダメージ-15%（2ターン）。': 'Becomes more likely to be targeted (2 turns) and gains a Shield equal to 80% of DEF + 300. All allies take 15% less DMG (2 turns).',
  'まかせろ': 'Leave It to Me',
  '不動の壁': 'Immovable Wall',
  '味方全体に防御力60%+300のシールド（3ターン）。敵全体に防御力120%の物理ダメージ。': 'Gives all allies a Shield equal to 60% of DEF + 300 (3 turns). Deals Physical DMG equal to 120% of DEF to all enemies.',
  // ── weapons.js WEAPONS.kuro_twin
  '双子の小太刀': 'Twin Shortswords',
  'ほしふる森に落ちていた、二本ひと組の小太刀。すばやく何度も斬る。': 'A matched pair of shortswords found in Starfall Forest. Strikes fast, again and again.',
  '二連': 'Double Cut',
  '指定した敵単体に攻撃力55%の物理ダメージを2回。': 'Deals Physical DMG equal to 55% of ATK to one enemy twice.',
  '三連影': 'Triple Shadow',
  '指定した敵単体に攻撃力75%の物理ダメージを3回。自身の速度+15%（2ターン）。': 'Deals Physical DMG equal to 75% of ATK to one enemy 3 times. +15% own SPD (2 turns).',
  '身軽': 'Nimble',
  '影分身': 'Shadow Clones',
  'ランダムな敵に攻撃力60%の闇ダメージを8回。自身に防御力50%のシールド（2ターン）。': 'Deals Dark DMG equal to 60% of ATK to random enemies 8 times. Gains a Shield equal to 50% of DEF (2 turns).',
  // ── weapons.js WEAPONS.kuro_moon
  '月影の刀': 'Moonshadow Katana',
  '黒影洞窟の奥にしまわれていた刀。むかし、だれかがクロのために打ったものらしい。': 'A katana stored deep in Shadowblack Cave. It seems someone once forged it for Kuro.',
  '月の爪': 'Moon Claw',
  '指定した敵単体に攻撃力100%の物理ダメージ。40%の基礎確率で裂創（攻撃力40%、2ターン）。': 'Deals Physical DMG equal to 100% of ATK to one enemy. 40% base chance to Bleed (40% of ATK, 2 turns).',
  '月影斬り': 'Moonshadow Slash',
  '指定した敵単体に攻撃力170%の物理ダメージ、裂創（攻撃力60%、2ターン）。自身は敵に狙われやすくなる（2ターン）。': 'Deals Physical DMG equal to 170% of ATK to one enemy and inflicts Bleed (60% of ATK, 2 turns). Becomes more likely to be targeted (2 turns).',
  '満月': 'Full Moon',
  '敵全体に攻撃力140%の光ダメージ、80%の基礎確率で裂創（攻撃力50%、2ターン）。持続ダメージを受けている敵は、それがその場でもう一度発生する。': 'Deals Light DMG equal to 140% of ATK to all enemies, 80% base chance to Bleed (50% of ATK, 2 turns). Enemies taking damage over time take it again on the spot.',
  // ── weapons.js WEAPONS.shiro_star
  '見習いの杖': 'Apprentice Staff',
  '魔法学校でもらった杖。天才魔法は、ときどき失敗する。': 'A staff from magic school. Genius Magic sometimes fails.',
  // ── weapons.js WEAPONS.shiro_majime
  'まじめな杖': 'Sensible Staff',
  '「説明書どおりに唱えれば、失敗しません」と書いてある杖。シロは少し不満そう。': 'A staff labeled "Follow the instructions and you won\'t fail." Shiro looks a little annoyed.',
  'ていねいアロー': 'Careful Arrow',
  'ちゃんとサンダー': 'Proper Thunder',
  '指定した敵単体に攻撃力160%、隣接する敵に攻撃力60%の雷ダメージ。失敗しない。': 'Deals Lightning DMG equal to 160% of ATK to one enemy and 60% of ATK to adjacent enemies. Never fails.',
  'きちょうめんな雷雨': 'Meticulous Thunderstorm',
  'ランダムな敵に攻撃力70%の雷ダメージを7回。そのあと敵全体を50%の基礎確率で感電（攻撃力40%、2ターン）。': 'Deals Lightning DMG equal to 70% of ATK to random enemies 7 times. Then a 50% base chance to Shock all enemies (40% of ATK, 2 turns).',
  // ── weapons.js WEAPONS.shiro_ice
  'こおりの杖': 'Ice Staff',
  '笑顔の塔の大舞台にあった、ひんやりした杖。この杖の魔法は、すべて氷になる。': 'A chilly staff found on the Grand Stage of the Tower of Smiles. All magic from this staff turns to ice.',
  'つらら': 'Icicle',
  '指定した敵単体に攻撃力100%の氷ダメージ。': 'Deals Ice DMG equal to 100% of ATK to one enemy.',
  'アイス・改': 'Ice Plus',
  '指定した敵単体に攻撃力150%、隣接する敵に攻撃力60%の氷ダメージ。指定した敵を30%の基礎確率で凍結。': 'Deals Ice DMG equal to 150% of ATK to one enemy and 60% of ATK to adjacent enemies. 30% base chance to Freeze the target.',
  'ダイヤモンドダスト': 'Diamond Dust',
  '敵全体に攻撃力210%の氷ダメージ。敵全体を35%の基礎確率で凍結。': 'Deals Ice DMG equal to 210% of ATK to all enemies. 35% base chance to Freeze all enemies.',
  // ── weapons.js WEAPONS.shiro_boom
  '大ばくはつの杖': 'Big Boom Staff',
  '古代の魔法使いが「危ないので封印」と書き残した杖。シロは大よろこび。': 'A staff an ancient mage left with a note: "Too dangerous — sealed." Shiro is thrilled.',
  'ぼんっ': 'Pop',
  '指定した敵単体に攻撃力80%、隣接する敵に攻撃力30%の炎ダメージ。': 'Deals Fire DMG equal to 80% of ATK to one enemy and 30% of ATK to adjacent enemies.',
  'ばくはつ魔法': 'Explosion Magic',
  '敵全体に攻撃力150%の炎ダメージ。25%の確率で大成功（与ダメージ+60%）、25%の確率で自分もまきこまれる（最大HP10%のダメージ）。': 'Deals Fire DMG equal to 150% of ATK to all enemies. 25% chance of a big success (+60% DMG), 25% chance of getting caught in the blast too (10% of Max HP in damage).',
  '大成功！': 'Big success!',
  'けほっ': 'Cough!',
  'ちょう大ばくはつ': 'Super Big Boom',
  '敵全体に攻撃力300%の炎ダメージ。自身も最大HP15%のダメージを受ける（倒れはしない）。': 'Deals Fire DMG equal to 300% of ATK to all enemies. Also takes damage equal to 15% of own Max HP (won\'t be knocked out by it).',
  // ── weapons.js WEAPONS.tama_plain
  'ふつうのまくら': 'Plain Pillow',
  'いつも抱えているまくら。なでなでと、おひさまのうたで仲間をいやす。': 'The pillow Tama always hugs. Heals friends with Pat Pat and the Sunshine Song.',
  // ── weapons.js WEAPONS.tama_soba
  'そばがらまくら': 'Buckwheat Pillow',
  'かためのまくら。ふかふかではないけれど、しっかり支えてくれる。': 'A firm pillow. It\'s not fluffy, but it gives solid support.',
  'ざくっ': 'Crunch',
  'しっかり支える': 'Solid Support',
  '味方単体にタマの最大HP22%+300のシールド（2ターン）、HPを最大HP10%回復。': 'Gives one ally a Shield equal to 22% of Tama\'s Max HP + 300 (2 turns) and restores 10% Max HP.',
  'まくらの砦': 'Pillow Fort',
  '味方全体にタマの最大HP18%+250のシールド（2ターン）、HPを最大HP15%回復。': 'Gives all allies a Shield equal to 18% of Tama\'s Max HP + 250 (2 turns) and restores 15% Max HP.',
  // ── weapons.js WEAPONS.tama_cushion
  'ねこ型クッション': 'Cat-Shaped Cushion',
  '笑顔の塔の楽屋に置いてあったクッション。抱きしめると、元気が出る。': 'A cushion left in the dressing room of the Tower of Smiles. Hugging it cheers you right up.',
  'もふっ': 'Floof',
  'もふもふ応援': 'Fluffy Cheer',
  '自分以外の味方単体の攻撃力+35%（2ターン）、行動順を25%早める。': 'One other ally gains +35% ATK (2 turns) and acts 25% sooner.',
  'がんばれ〜': 'Go, go~',
  'みんなでぎゅっ': 'Group Hug',
  '味方全体の攻撃力+25%・会心率+15%（2ターン）、HPを最大HP10%回復。': 'All allies gain +25% ATK and +15% CRIT Rate (2 turns) and restore 10% Max HP.',
  'ぎゅっ': 'Hug',
  // ── weapons.js WEAPONS.tama_dream
  '夢見まくら': 'Dream Pillow',
  '封印の間で、ずっとだれかを眠らせていたまくら。敵もつい、うとうとする。': 'A pillow that kept someone asleep in the Sealed Chamber for ages. Even enemies get drowsy.',
  'ねむねむ': 'Sleepy Sleepy',
  '指定した敵単体に攻撃力100%の光ダメージ。行動順を10%遅らせる。': 'Deals Light DMG equal to 100% of ATK to one enemy. Delays its action by 10%.',
  '子守歌': 'Lullaby',
  '指定した敵単体に攻撃力60%の光ダメージ、行動順を40%遅らせる。味方全体のHPをタマの最大HP10%回復。': 'Deals Light DMG equal to 60% of ATK to one enemy and delays its action by 40%. Restores HP to all allies equal to 10% of Tama\'s Max HP.',
  'みんなでおひるね': 'Nap Time for All',
  '敵全体の行動順を35%遅らせる。味方全体のHPをタマの最大HP25%回復し、デバフを1つ解除する。': 'Delays all enemies\' actions by 35%. Restores HP to all allies equal to 25% of Tama\'s Max HP and removes 1 debuff.',
  // ── weapons.js WEAPONS.maou_scepter
  '魔王の笏': 'Demon King\'s Scepter',
  '魔王の座についたときから持っている笏。': 'The scepter Maou has carried since taking the Demon King\'s throne.',
  // ── weapons.js WEAPONS.maou_toy
  'おもちゃの笏': 'Toy Scepter',
  'ふると「ピコッ」と鳴る笏。なにが起きるかは、ふってみるまでわからない。': 'A scepter that goes "squeak" when you shake it. You never know what will happen until you do.',
  'ピコッ': 'Squeak',
  'なにが出るかな': 'What\'ll It Be?',
  '次のどれかが起きる：敵全体に攻撃力130%の物理ダメージ／ランダムな敵単体に攻撃力320%の物理ダメージ／敵全体の防御力-30%（2ターン）／味方全体の攻撃力+25%（2ターン）。': 'One of these happens: Physical DMG equal to 130% of ATK to all enemies / Physical DMG equal to 320% of ATK to one random enemy / all enemies\' DEF -30% (2 turns) / all allies\' ATK +25% (2 turns).',
  'ピコピコハンマー！': 'Squeaky Hammer!',
  'おおきなパンチ！': 'Giant Punch!',
  'こちょこちょ！': 'Tickle Tickle!',
  'がんばれの旗！': 'Cheer Flag!',
  'こちょこちょ': 'Tickled',
  'がんばれ': 'Cheered On',
  'びっくり箱の行進': 'Jack-in-the-Box Parade',
  'ランダムな敵に攻撃力50%の物理ダメージを10回。味方全体の必殺技ゲージ+15。': 'Deals Physical DMG equal to 50% of ATK to random enemies 10 times. All allies\' Ultimate gauge +15.',
  // ── weapons.js WEAPONS.maou_curse
  'のろいの笏': 'Cursed Scepter',
  '魔王城の宝物庫にしまってあった笏。「さわるな」と書いた紙がはってある。': 'A scepter kept in the Demon King\'s treasury, with a note stuck on it: "DON\'T TOUCH."',
  'のろいのしっぽ': 'Cursed Tail',
  '指定した敵単体に攻撃力100%の闇ダメージ。40%の基礎確率で感電（攻撃力30%、2ターン）。': 'Deals Dark DMG equal to 100% of ATK to one enemy. 40% base chance to Shock (30% of ATK, 2 turns).',
  '三つののろい': 'Triple Curse',
  '指定した敵単体に攻撃力130%の闇ダメージ。燃焼・感電・裂創（攻撃力40%、2ターン）を、それぞれ40%の基礎確率で付与。': 'Deals Dark DMG equal to 130% of ATK to one enemy. Each of Burn, Shock, and Bleed (40% of ATK, 2 turns) has a 40% base chance to be applied.',
  'のろい返し': 'Curse Rebound',
  '敵全体に攻撃力150%の闇ダメージ。持続ダメージを受けている敵は、それが150%の威力でその場でもう一度発生する。': 'Deals Dark DMG equal to 150% of ATK to all enemies. Enemies taking damage over time take it again on the spot at 150% power.',
  // ── weapons.js WEAPONS.maou_dark
  '漆黒の大笏': 'Jet-Black Great Scepter',
  '世界の果てに突きささっていた、大きな笏。持つと、少しだけ昔の魔王にもどった気がする。': 'A great scepter that was stuck in the ground at World\'s End. Holding it makes Maou feel a bit like the old Demon King again.',
  '闇のつぶて': 'Dark Pebbles',
  '指定した敵単体に攻撃力80%、隣接する敵に攻撃力30%の闇ダメージ。': 'Deals Dark DMG equal to 80% of ATK to one enemy and 30% of ATK to adjacent enemies.',
  '闇の重圧': 'Crushing Darkness',
  '敵全体に攻撃力100%の闇ダメージ。50%の基礎確率で防御力-30%・速度-10%（2ターン）。': 'Deals Dark DMG equal to 100% of ATK to all enemies. 50% base chance of DEF -30% and SPD -10% (2 turns).',
  '重圧': 'Crushed',
  '滅びの黒月': 'Black Moon of Ruin',
  '敵全体に攻撃力260%の闇ダメージ。味方全体の与ダメージ+30%（2ターン）。': 'Deals Dark DMG equal to 260% of ATK to all enemies. All allies gain +30% DMG dealt (2 turns).',
});
