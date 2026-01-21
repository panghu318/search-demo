# search-demo
——————————————
Playwright + TypeScript 検索デモ（UI付き）README
——————————————

■ 1. 概要
本プロジェクトは、Playwright と TypeScript を用いて Web 検索操作を自動化し、
検索結果（上位10件：タイトル / URL）を取得して CSV 形式で出力するデモです。

Backend は Node.js（Express）＋ Playwright、
Frontend は Vite + React の簡易 UI で構成されています。

UI から検索キーワードや検索サイトを指定し、
ブラウザ操作 → 検索 → データ取得 → CSV 出力までを実行できます。

■ 2. 動作環境（事前にインストールが必要なもの）

【必須】
・Node.js：18 以上推奨（18 LTS / 20 LTS 推奨）
・npm：Node.js に同梱されているものを使用

バージョン確認方法：
node -v
npm -v

【推奨】
・Google Chrome または Microsoft Edge

■ 3. 事前準備（セットアップ手順）

※ Backend と Frontend はそれぞれ別にセットアップが必要です。

【3.1 Backend セットアップ】

Backend のディレクトリ（package.json が存在する場所）へ移動（playwright-demo）

依存関係のインストール
npm install

Playwright 用ブラウザのインストール（※必須）
npx playwright install

Chromium のみで良い場合：
npx playwright install chromium

Linux や CI 環境でライブラリ不足エラーが出る場合：
npx playwright install --with-deps

※ npm install だけではブラウザはインストールされません。
　この手順を省略すると必ず起動に失敗します。

【3.2 Frontend（UI）セットアップ】

UI のディレクトリ（UI 用 package.json が存在する場所）へ移動（playwright-demo/ui）

依存関係のインストール
npm install

■ 4. 起動方法（実行手順）

【Step 1：Backend 起動】

Backend ディレクトリで以下を実行：
npm run start

起動後、Backend は以下で待ち受けます：
http://localhost:3000

※ UI は Backend に対して localhost:3000 を固定で呼び出します。

【Step 2：Frontend（UI）起動】

Frontend ディレクトリで以下を実行：
npm run dev

起動後、ターミナルに表示された URL
（例：http://localhost:5173）をブラウザで開いてください。

■ 5. UI の操作方法

検索キーワードを入力

検索サイトを選択
　（yahoo / startpage / duckduckgo）

必要に応じて「ブラウザを表示する（headless=false）」を ON/OFF

実行方法を選択

・「CSVを生成」
　Backend 側で検索処理を実行し、CSV ファイルを生成します

・「別名で保存」
　Frontend 側で CSV データを受け取り、保存ダイアログを表示します

■ 6. CSV 出力仕様

・取得件数：検索結果 上位 10 件
・取得項目：タイトル、URL
・ヘッダー行：あり
・文字コード：UTF-8

【通常モード（Backend 出力）】
・CSV はプロジェクト配下の output ディレクトリに出力されます
・output ディレクトリは自動作成されます
・書き込み権限がない環境では出力に失敗します

【別名で保存モード】
・CSV データを Frontend 側で受け取り保存します
・Chromium 系ブラウザでの利用を推奨します

■ 7. よくあるエラーと対処方法

【ブラウザが起動しない】
原因：Playwright 用ブラウザ未インストール
対処：npx playwright install chromium

【UI から実行できない】
原因：Backend が起動していない
対処：http://localhost:3000/health
 にアクセスして確認

【CSV が生成されない】
原因：output ディレクトリへの書き込み権限不足
対処：プロジェクト配下で実行する

【別名で保存が動かない】
原因：ブラウザ非対応
対処：Chrome / Edge を使用する

■ 8. 最短動作確認手順（まとめ）

Backend：
npm install
npx playwright install chromium
npm run start

Frontend：
npm install
npm run dev

UI を開き、検索キーワードを入力して「CSVを生成」を実行してください。

——————————————
