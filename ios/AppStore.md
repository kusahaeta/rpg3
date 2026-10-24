# App Store に出すときのメモ

App Store Connect に入れる文面と、答える項目の案。審査に出すまでの手順は最後にまとめた。

## アプリの情報

| 項目 | 内容 |
| --- | --- |
| 名前（30字まで） | にゃんこファンタジー |
| サブタイトル（30字まで） | 流れ星のおちた丘から |
| バンドル ID | com.kusahaeta.nyanko |
| SKU | nyanko-fantasy |
| 主な言語 | 日本語 |
| カテゴリ | ゲーム › ロールプレイング（2つ目：ゲーム › アドベンチャー） |
| 価格 | 無料（App 内課金なし） |
| 対応機種 | iPhone だけ（iPad では iPhone 用の画面で動く） |
| プライバシーポリシーの URL | https://kusahaeta.github.io/rpg3/privacy.html |
| サポートの URL | https://kusahaeta.github.io/rpg3/support.html（問い合わせは Google フォーム：https://docs.google.com/forms/d/e/1FAIpQLSc08dt3hJR7oivL-jWh4hT5vhKLhDDexTu3wUKwtm-2VaoFsg/viewform） |
| 著作権 | 2026 kusahaeta |

ホーム画面に出る名前は「にゃんこ」（`Info.plist` の `CFBundleDisplayName`）。

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

はじめての提出では「審査の記録が少ないアカウントなので、くわしく教えて」と、iPhone 実機での画面収録と 5 つの問いへの答えを求められた（2026-10）。下の英文を App Store Connect の返信と Notes の両方に入れ、画面収録を返信に添える。次の提出からも Notes に残しておく。

```
Thank you for reviewing our app. Below is the information you requested. A screen recording captured on a physical iPhone running the latest iOS is attached to this reply.

1. Screen recording
The recording starts from the Home Screen, launches the app, and shows the typical flow: title screen, new game, the opening story scene, exploring the field (moving, talking to villagers, opening a treasure chest), a turn-based battle, and the menu.
The app has no account registration, no login, no user-generated content, and no paid content or In-App Purchases, so none of those flows exist.

2. Purpose and target audience
Nyanko Fantasy is an offline, single-player 3D turn-based RPG in which a party of cute two-head-tall cats travels from their village to the end of the world. It is meant for players of all ages (rated 9+) who enjoy story-driven RPGs. It provides a complete adventure with exploration, puzzles and turn-based battles, and the bonds between party members unlock combo skills and special events. The game is free, with no ads and no In-App Purchases.

3. Setup and how to access the main features
No login, account or sample files are needed. Launch the app and tap the title screen to start a new game; progress is saved automatically on the device.
The game is played in landscape. Field: drag on the left half of the screen to move, drag on the right half to rotate the camera, tap "攻撃" (Attack) to strike enemies, and tap "調べる" (Examine) to talk to characters and open chests. Running into an enemy starts a battle (hitting it with "攻撃" first gives a first strike); in battle, tap the skill buttons to act.
The game text is in Japanese only.

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

iPhone 6.9 インチ（横 2868×1320）を 3〜10 枚。`ios/screenshots/` の 6 枚（タイトル・コンボ技・街道・宿場の夜の会話・戦闘・シロの登場）を使う。ネタバレをさけて第二章〜第三章の場面から選んだ。

- 6.1／6.3 インチの枠は `6.3inch/`（2622×1206）、6.5 インチの枠は `6.5inch/`（2778×1284）。それぞれ 874×402・926×428 の 3 倍の画面で撮る。6.9 インチの分があれば、ほかのサイズは要らない
- ヘッダの画像・検索結果の画像は `header.png`（5244×2950。JPEG は受け付けない）。タイトル画面を「タップして はじめる」なしで撮った

撮りなおすときは、Chrome を `--headless=new --remote-debugging-port` で開き、DevTools プロトコルで画面を 956×440・3 倍・タッチありにして `?debug` のゲームを開く。`Debug.jump` で場面を作り、`#diag` を隠して `GFX.watchFps = () => {}; GFX.setTier(0)` で画質を「なめらか」に固定してから `Page.captureScreenshot` で撮る（ヘッドレスはコマ数が少なく見え、そのままだと軽量の画質に落とされる）。タイトル画面（`01-title.jpg` の 3 サイズと `header.png`）は `tools/shoot-title.mjs` で撮る。2026-10-25 に夕暮れの空のタイトルで撮りなおした：

```
PORT=8937 node .claude/serve.js
node tools/shoot-title.mjs 01-title.png 3 start 956x440           # 6.9 インチ 2868×1320
node tools/shoot-title.mjs 01-title.png 3 start 874x402           # 6.3 インチ 2622×1206
node tools/shoot-title.mjs 01-title.png 3 start 926x428           # 6.5 インチ 2778×1284
node tools/shoot-title.mjs header.png 4.096875 nostart 1280x720   # ヘッダ 5244×2950
```

App Store には JPEG（品質 92）にして入れる（ヘッダだけ PNG）。

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
