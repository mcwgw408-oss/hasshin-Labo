# Hasshin Labo

発信ログをスマホでも使えるWebアプリです。

公開URL:

```text
https://mcwgw408-oss.github.io/hasshin-Labo/
```

スマホでは、このURLをSafariやChromeで開けば操作できます。最後の `/` まで入れて開くと404になりにくいです。

## スマホで404が出るとき

次を順番に確認してください。

1. URLが `https://mcwgw408-oss.github.io/hasshin-Labo/` になっているか確認する。
2. `hasshin-Labo` の大文字小文字が同じか確認する。
3. URLの最後に `/` を付ける。
4. ブラウザを更新する。
5. それでも古い画面が出る場合は、スマホのブラウザでページを再読み込みする。

## データについて

入力したデータは、その端末のブラウザに保存されます。

PCで入力したデータはPCに、スマホで入力したデータはスマホに保存されます。現時点ではPCとスマホの自動同期はありません。

## 開発用

PCで確認する場合:

```bash
npm install
npm run dev
```

公開用ファイルを作る場合:

```bash
npm run build
```
