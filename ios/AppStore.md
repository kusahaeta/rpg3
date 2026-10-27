# App Store に出すときのメモ

App Store Connect に入れる文面と、答える項目の案。審査に出すまでの手順は最後にまとめた。

## アプリの情報

| 項目 | 内容 |
| --- | --- |
| 名前（30字まで） | にゃんこファンタジー |
| サブタイトル（30字まで） | 流れ星のおちた丘から |
| バンドル ID | com.kusahaeta.nyanko |
| SKU | nyanko-fantasy |
| 主な言語 | 日本語（英語のローカリゼーションも足す。下の「英語の文面」） |
| カテゴリ | ゲーム › ロールプレイング（2つ目：ゲーム › アドベンチャー） |
| 価格 | 無料（App 内課金なし） |
| 対応機種 | iPhone だけ（iPad では iPhone 用の画面で動く） |
| プライバシーポリシーの URL | https://kusahaeta.github.io/rpg3/privacy.html（日本語と英語。ブラウザの言語で切りかわる） |
| サポートの URL | https://kusahaeta.github.io/rpg3/support.html（日本語と英語。問い合わせは Google フォーム：https://docs.google.com/forms/d/e/1FAIpQLSc08dt3hJR7oivL-jWh4hT5vhKLhDDexTu3wUKwtm-2VaoFsg/viewform） |
| 著作権 | 2026 kusahaeta |

ホーム画面に出る名前は、日本語の端末で「にゃんこ」、英語の端末で「Nyanko」（`ja.lproj`・`en.lproj` の `InfoPlist.strings`）。ゲームの言語も端末の言語で決まり、タイトル画面とオプションで切りかえられる。

## プロモーション用テキスト（170字まで・審査なしでいつでも変えられる）

2頭身のにゃんこたちが、ぽかぽか村から世界の果てまで旅をする 3D コマンド RPG。仲間との友情が深まるほど、ふたりで撃つコンボ技が増えていく。

## 説明

```
ぽかぽか村の、くいしんぼうなにゃんこ・ミケ。
流れ星の落ちた村はずれの丘で出会ったのは、空から落ちてきた黒猫だった。
生命樹「にゃんだーの樹」が弱りはじめ、世界のあちこちで、次々と異変が起きていく。
一匹では弱くても、仲間がいれば世界を変えられる――。

2頭身のにゃんこたちが旅をする、3D のコマンド RPG です。

■ にゃんこたちの冒険
ミケ、クロ、シロ、タマ、そして……。
くせの強い仲間たちと、村・森・王国・洞窟・遺跡・魔王城をめぐります。
笑って、ぶつかって、助けあって。旅をするほど、にゃんこたちの絆は深まっていきます。

■ ターン制バトル
速さで決まる行動順、仲間で分けあうスキルポイント、ためて撃つ必殺技。
敵の弱点を突いて「弱点撃破」をねらいましょう。
のんびり屋の仲間は戦闘中に寝てしまい、天才魔法使いの魔法からは、たまに魚が降ってくる……！？

■ 友情とコンボ技
いっしょに戦い、話すほど、仲間どうしの友情が深まります。
友情が深まると、戦闘中の掛け合いや、ふたりで撃つコンボ技、特別なイベントが見られます。

■ フィールドの探索
宝箱、お店、爪とぎの丸太、住人との会話。
笑わせて道をひらくお笑いの舞台や、光と影の謎ときも。

・横画面で遊びます
・インターネットにつながなくても遊べます
・セーブは自動です
・広告・アプリ内課金はありません
```

## キーワード（100字まで・カンマ区切り）

```
RPG,ねこ,猫,にゃんこ,コマンドバトル,ターン制,3D,冒険,ファンタジー,友情,かわいい,オフライン,ロールプレイング
```

## 英語の文面（English (U.S.) のローカリゼーション）

App Store Connect で「English (U.S.)」のローカリゼーションを足して入れる。日本以外でも配信するときは「価格および配信状況」で国を選ぶ（英語の文面を入れるだけなら、配信する国は変わらない）。

| 項目 | 内容 |
| --- | --- |
| 名前（30字まで） | Nyanko Fantasy |
| サブタイトル（30字まで） | A Cozy 3D Cat RPG Adventure |
| プライバシーポリシーの URL | https://kusahaeta.github.io/rpg3/privacy.html?lang=en |
| サポートの URL | https://kusahaeta.github.io/rpg3/support.html?lang=en（英語の問い合わせは Google フォームの英語版：https://docs.google.com/forms/d/e/1FAIpQLSeYLTOc9VE4JJbzA2dVWAYEYCVrlzm1p5cn1U8KDmjzHs4fWg/viewform） |

プライバシーポリシーとサポートのページは、1 つのページに日本語と英語の両方が書いてあり、ブラウザの言語で切りかわる（日本語以外は英語）。`?lang=en`／`?lang=ja` を付けると、その言語で開く。

プロモーション用テキスト（170字まで）：

```
Cute two-head-tall cats journey from a cozy village to the end of the world in this 3D turn-based RPG. The closer your party grows, the more combo moves you unlock.
```

説明：

```
Mike is a food-loving calico cat from the village of Cozyville.
On the hill where a shooting star fell, he meets a black cat who tumbled down from the sky.
The great Nyander Tree is weakening, and strange things are starting to happen all over the world.
Alone we may be weak, but together we can change the world—.

A 3D turn-based RPG starring adorable two-head-tall cats.

■ A Cat-Sized Adventure
Mike, Kuro, Shiro, Tama, and... someone else.
Travel with a quirky crew through villages, forests, kingdoms, caves, ancient ruins, and the Demon King's castle.
Laugh, clash, and help each other out. The farther you travel, the deeper their bonds become.

■ Turn-Based Battles
Turn order decided by speed, skill points shared by the whole party, and Ultimates you charge up and unleash.
Strike enemy weaknesses to land a "Weakness Break."
Your sleepy friend might doze off mid-battle, and the self-proclaimed genius mage's spells sometimes make fish rain from the sky...?!

■ Bonds and Combo Moves
Fight and talk together, and the bonds between your party members grow.
Deeper bonds unlock banter in battle, combo moves for two, and special events.

■ Explore the Field
Treasure chests, shops, scratching posts, and chats with the locals.
Open the way with comedy routines on stage, and solve puzzles of light and shadow.

・Play in English or Japanese (switch anytime from the title screen or Options)
・Played in landscape
・Play offline, no internet needed
・Saves automatically
・No ads, no in-app purchases
```

キーワード（100字まで）：

```
rpg,cat,cats,kitten,turn-based,3d,adventure,offline,cute,story,party,jrpg,friendship,meow,quest
```

スクリーンショットは、英語の画面のものを `ios/screenshots/en/` に用意した（日本語版と同じ 8 枚・同じサイズ。下の「スクリーンショット」）。English (U.S.) のローカリゼーションにはこちらを入れる。プレビュー動画は日本語の画面のものだけで、英語のローカリゼーションには主な言語の分が出る。

## 年齢レーティングの答え

- アニメまたはファンタジーの暴力：まれ／軽度（ねこやモンスターの戦い。血は出ない）
- ほかの項目（リアルな暴力・性的な内容・ホラー・ギャンブル・酒やたばこ・下品な言葉・医療の情報など）：なし
- 制限のない Web アクセス・ユーザーどうしのやりとり・ユーザーが作る内容：なし
- 広告：なし／App 内課金：なし

答えから自動で決まる（9+ になる見こみ）。

## App のプライバシー

「データを収集していません」を選ぶ。本アプリは外と通信しない（`fetch`・`XMLHttpRequest`・`WebSocket` も外の URL もなく、WebView はゲームの外へ移らない）。アプリのプライバシーマニフェストは `ios/Nyanko/PrivacyInfo.xcprivacy`。

## 輸出コンプライアンス

`Info.plist` に `ITSAppUsesNonExemptEncryption = false` が入っているので、アップロードのたびに聞かれない。

## 審査へのメモ（App Review Information の Notes）

はじめての提出では「審査の記録が少ないアカウントなので、くわしく教えて」と、iPhone 実機での画面収録と 5 つの問いへの答えを求められた（2026-10）。下の英文を App Store Connect の返信と Notes の両方に入れ、画面収録を返信に添える。次の提出からも Notes に残しておく。日本以外でも配信するときは、5 の 1 文目を「The app is distributed on the App Store in Japan and other regions.」に変える。

```
Thank you for reviewing our app. Below is the information you requested. A screen recording captured on a physical iPhone running the latest iOS is attached to this reply.

1. Screen recording
The recording starts from the Home Screen, launches the app, and shows the typical flow: title screen, new game, the opening story scene, exploring the field (moving, talking to villagers, opening a treasure chest), a turn-based battle, and the menu.
The app has no account registration, no login, no user-generated content, and no paid content or In-App Purchases, so none of those flows exist.

2. Purpose and target audience
Nyanko Fantasy is an offline, single-player 3D turn-based RPG in which a party of cute two-head-tall cats travels from their village to the end of the world. It is meant for players of all ages (rated 9+) who enjoy story-driven RPGs. It provides a complete adventure with exploration, puzzles and turn-based battles, and the bonds between party members unlock combo skills and special events. The game is free, with no ads and no In-App Purchases.

3. Setup and how to access the main features
No login, account or sample files are needed. Launch the app and tap the title screen to start a new game; progress is saved automatically on the device.
The game is played in landscape. Field: drag on the left half of the screen to move, drag on the right half to rotate the camera, tap "Attack" (攻撃) to strike enemies, and tap "Check" (調べる) to talk to characters and open chests. Running into an enemy starts a battle (hitting it with "Attack" first gives a first strike); in battle, tap the skill buttons to act.
The game text is available in English and Japanese. The language follows the device language and can be switched from the language buttons on the title screen or from Options in the menu.

4. External services
None. All game content is bundled in the app. The app does not connect to the internet and uses no third-party services such as analytics, advertising, authentication, payment or AI services. It uses the open-source three.js library (MIT License) inside the app for 3D rendering.

5. Regional differences
The app is distributed only on the Japan App Store. There are no regional differences in features or content; the app works the same way everywhere.

6. Regulated industry / third-party material
Not applicable. The app is a game and is not in a regulated industry. The characters, story, 3D models, art and music are original works created by the developer; three.js is used under the MIT License.
```

画面収録の撮り方（iPhone 実機・最新の iOS）：

- 審査に出したのと同じビルドを TestFlight で入れ、セーブを消して（アプリを入れなおす）はじめから撮る
- コントロールセンターの「画面収録」で撮る。マイクはオフ。ホーム画面から始めて、アイコンをタップして開くところを必ず入れる
- 流れ：タイトル → はじめから → 最初の会話（何回か送れば十分） → フィールドを歩く・住人と話す・宝箱を開ける → 戦闘を 1 回勝つ → メニューを開く。2〜4 分におさめる
- 写真アプリで頭とおしりを切って、返信に添付する。大きすぎて添付できないときは、限定公開の動画（YouTube の限定公開など）のリンクを返信に書く

## スクリーンショット

iPhone 6.9 インチ（横 2868×1320）を 3〜10 枚。`ios/screenshots/` の 8 枚（タイトル・コンボ技・街道・宿場の夜の会話・戦闘・シロの登場・ミケの「すっごくおいしかったよ！」・くろねこ谷のさまよう鎧との戦闘）を使う。ネタバレをさけて、第一章のはじめ・第二章〜第三章・第四章の道中の場面から選んだ。

- 6.1／6.3 インチの枠は `6.3inch/`（2622×1206）、6.5 インチの枠は `6.5inch/`（2778×1284）。それぞれ 874×402・926×428 の 3 倍の画面で撮る。6.9 インチの分があれば、ほかのサイズは要らない
- 英語版は `en/` に同じ並び（`en/` のすぐ下が 6.9 インチ、`en/6.3inch/`・`en/6.5inch/`・`en/header.png`）。English (U.S.) のローカリゼーションに入れる
- ヘッダの画像・検索結果の画像は `header.png`（5244×2950。JPEG は受け付けない）。タイトル画面を「タップして はじめる」と右上の言語ボタンなしで撮った

撮りなおすときは、Chrome を `--headless=new --remote-debugging-port` で開き、DevTools プロトコルで画面を 956×440・3 倍・タッチありにして `?debug` のゲームを開く。`Debug.jump` で場面を作り、`#diag` を隠して `GFX.watchFps = () => {}; GFX.setTier(0)` で画質を「なめらか」に固定してから `Page.captureScreenshot` で撮る（ヘッドレスはコマ数が少なく見え、そのままだと軽量の画質に落とされる）。タイトル画面（`01-title.jpg` の 3 サイズと `header.png`）は `tools/shoot-title.mjs` で撮る。2026-10-27 に、作りなおしたにゃんだーの樹のタイトルで撮りなおした：

```
PORT=8937 node .claude/serve.js
node tools/shoot-title.mjs 01-title.png 3 start 956x440           # 6.9 インチ 2868×1320
node tools/shoot-title.mjs 01-title.png 3 start 874x402           # 6.3 インチ 2622×1206
node tools/shoot-title.mjs 01-title.png 3 start 926x428           # 6.5 インチ 2778×1284
node tools/shoot-title.mjs header.png 4.096875 nostart 1280x720   # ヘッダ 5244×2950
```

タイトル画面のほかの 7 枚は `tools/shoot-store.mjs` で撮る。紹介動画の録画と同じ仮の時計でコマ送りして撮るので、毎回同じ画になる（ただし、いくつも同時に動かすと読みこみの速さで 1〜2 コマずれるので、1 つずつ撮る）。場面の名前と中身は：

| 場面 | ファイル | 中身 |
| --- | --- | --- |
| `combo` | 02-combo | 笑顔の塔・下層で、ミケとクロのコンボ技「にゃんこブレイク」がゴーストに当たったところ |
| `field` | 03-field | ミャオ街道・丘を、風車と小麦畑のそばの道にそって歩いていくところ |
| `talk` | 04-talk | 第二章「宿場の夜」で、ミケが「あるある！ 毎日ある！…」と言うところ |
| `battle` | 05-battle | ごろごろ切り通しで、シロの番に「マジックアロー」でのら犬を狙うコマンド選択 |
| `shiro` | 06-shiro | 第二章「自称・天才魔法使い」で、シロが名のるところ |
| `oishii` | 07-oishii | 第一章「魚どろぼう」で「でも、すっごくおいしかったよ！」を選び、ミケが両手を挙げたところ |
| `yoroi` | 08-yoroi | くろねこ谷で、ミケの番に「勇者のつるぎ」でさまよう鎧を狙うコマンド選択 |

```
node tools/shoot-store.mjs oishii 07-oishii.png 956x440 3   # 6.9 インチ（6.3 インチは 874x402、6.5 インチは 926x428）
```

英語版（`ios/screenshots/en/`）は、`SHOT_LANG=en` を付けて同じ手順で撮る（`shoot-title.mjs` も同じ）。2026-10-27 に 8 枚・3 サイズとヘッダを撮った。日本語版の 02〜06 は 2026-10-24 にその場の手作業で撮ったもので、`shoot-store.mjs` で撮りなおすと英語版と同じ画になる：

```
SHOT_LANG=en node tools/shoot-title.mjs 01-title.png 3 start 956x440
SHOT_LANG=en node tools/shoot-store.mjs combo 02-combo.png 956x440 3
```

App Store には JPEG（品質 92。`sips -s format jpeg -s formatOptions 92`）にして入れる（ヘッダだけ PNG）。

## プレビュー動画

`promo/app-store-1920x886.mp4`（30 秒・横 1920×886・H.264 30fps・AAC 256kbps）。iPhone 6.9／6.5 インチのプレビューの決まり（15〜30 秒、30fps まで、音声トラック必須）にあわせた。6.1 インチなどは 6.9 インチの分が縮めて使われる。ポスターフレーム（既定は 5 秒）は、ロゴと 5 匹がそろったタイトル。

タイトル → 風車の丘 → シロの「ファイア！」 → 綿毛 → 城下町 → 戦闘（にゃんこブレイク・必殺技 3 つ）→ 見晴らし台から見るお城。BGM はタイトルの曲の 2 小節目からで、1 小節ごとに場面を切りかえ、ちょうど 30 秒で旋律が主音にもどって終わる。効果音はゲームのもの。作りなおすときは：

```
PORT=8937 node .claude/serve.js
for n in title hill talk fluff town battle vista; do node tools/promo/rec.mjs $n <場面のフォルダ>/$n; done
node tools/promo/make.mjs <場面のフォルダ> <出力のフォルダ>
```

字幕入り版は `promo/app-store-1920x886-captions.mp4`（Google Play 用は `promo/google-play-1920x1080-captions.mp4`）。場面ごとに「2頭身のにゃんこと 大冒険」「にぎやかな仲間たち」などの字幕が上に出て、最後の見晴らし台にタイトルの文字が出る。字幕の文字と位置は `make.mjs` の `CAPTIONS`。探索に入ったときの地名が字幕と重なるので、探索の場面（hill・fluff・town）だけ地名を消して撮りなおし、ほかの場面はそのまま使う：

```
for n in hill fluff town; do PROMO_NOZONE=1 node tools/promo/rec.mjs $n <字幕版の場面のフォルダ>/$n; done
node tools/promo/make.mjs <字幕版の場面のフォルダ> <出力のフォルダ> --captions
```

`rec.mjs` はヘッドレス Chrome の時計（requestAnimationFrame・タイマー・CSS アニメ・乱数）を差しかえて 1/30 秒ずつ進めて撮るので、コマ落ちしない。効果音は鳴らさずに時刻だけ記録し、`make.mjs` が BGM といっしょに OfflineAudioContext で書き出す。場面の撮り方は `tools/promo/scenes.mjs`、つなぎ方（使うコマ）は `make.mjs` の `EDIT`。

## 出すまでの手順

1. [App Store Connect](https://appstoreconnect.apple.com/) → アプリ → ＋ → 新規 App。プラットフォームは iOS、名前・言語・バンドル ID（`com.kusahaeta.nyanko`）・SKU は上の表のとおり
2. このリポジトリで `sh ios/tools/release.sh upload`。ビルド番号は main のコミット数で、数十分後に TestFlight に出る
3. TestFlight で手元の iPhone に入れて、リリース版で通しで遊べるかを確かめる
4. App Store Connect の「1.0 提出の準備中」に、上の文面・スクリーンショット・URL・年齢レーティング・プライバシーを入れ、ビルドを選んで「審査に追加」
