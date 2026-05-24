# Hasshin Labo

発信ログ、noteシリーズ、note記事候補をスマホでも管理できるWebアプリです。

公開URL:

```text
https://mcwgw408-oss.github.io/hasshin-Labo/
```

スマホでは、このURLをSafariやChromeで開けば操作できます。最後の `/` まで入れて開くと404になりにくいです。

## できること

- 今週のテーマとタスクを管理
- 投稿ログを記録
- noteシリーズを管理
- note記事候補を管理
- スマホでは下部タブで画面を切り替え

## 404が出るとき

次を順番に確認してください。

1. URLが `https://mcwgw408-oss.github.io/hasshin-Labo/` になっているか確認する。
2. `hasshin-Labo` の大文字小文字が同じか確認する。
3. URLの最後に `/` を付ける。
4. ブラウザを更新する。

## データについて

入力したデータは、その端末のブラウザに保存されます。

PCで入力したデータはPCに、スマホで入力したデータはスマホに保存されます。現時点ではPCとスマホの自動同期はありません。

## 開発用

```bash
npm install
npm run dev
```

公開用ファイルを作る場合:

```bash
npm run build
```
