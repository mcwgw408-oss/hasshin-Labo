# 発信ログ

React + Vite で作った、発信活動を記録するためのMVPアプリです。データはブラウザの `localStorage` に保存されます。

## 使い方

```bash
npm install
npm run dev
```

## GitHubでクリックだけで公開する方法

1. GitHubで新しいリポジトリを作成します。
2. リポジトリ画面の `Add file` から `Upload files` を選びます。
3. このフォルダ内のファイルをアップロードします。`node_modules` と `dist` はアップロード不要です。
4. `Commit changes` をクリックします。
5. リポジトリの `Settings` を開きます。
6. 左メニューの `Pages` を開きます。
7. `Build and deployment` の `Source` で `Deploy from a branch` を選びます。
8. `Branch` を `main`、フォルダを `/docs` にして `Save` をクリックします。
9. 少し待ってから `Settings` → `Pages` に表示されるURLを開くと、発信ログアプリを使えます。

## 画面

- ダッシュボード
- ログ一覧
- 新規登録・編集

## 最初の分析項目

- 今月の投稿数
- 媒体別投稿数
- 一番反応が良かった投稿
