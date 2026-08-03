# Lantern mobile（Expo）

React Native移行フェーズAの成果物。Web版（`../frontend`）と同じFlask APIを参照する。

## セットアップ

```bash
npm install
```

`.env` を作成する（gitignore済み。値は `../frontend/.env` と対応する）。

```
EXPO_PUBLIC_API_URL=<Render の URL>
EXPO_PUBLIC_SUPABASE_URL=<Supabase の URL>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<Supabase の anon キー>
```

## 開発

```bash
npx expo start
```

Web で確認する場合は `npx expo start --web`（ポート8081）。
Flask 側の CORS は `http://localhost:8081` を許可済み。

## ビルド

```bash
npx expo export --platform web
```

出力は `dist/`。

## EAS ビルド（iOS / Android）

### 1. ログインとプロジェクト作成

```bash
npx eas-cli login
npx eas-cli init
```

`eas init` は Expo 上にプロジェクトを作り、`app.json` に `extra.eas.projectId` を書き込む。
生成された projectId はコミットしてよい（秘密情報ではない）。

### 2. 環境変数の登録

`.env` は gitignore されており EAS Build には渡らないため、EAS 側に登録する。
既存の `.env` をそのまま3環境へ流し込むのが早い。

```bash
npx eas-cli env:push production --path .env
npx eas-cli env:push preview --path .env
npx eas-cli env:push development --path .env
```

個別に設定する場合は次の形式（EAS CLI 21 系では `env:create` ではなく `env:set`）。

```bash
npx eas-cli env:set production --name EXPO_PUBLIC_API_URL --value <値> --visibility plaintext
```

値を `eas.json` に直接書かないのは、リポジトリに残さないため。
`EXPO_PUBLIC_` 接頭辞の変数はクライアントバンドルに埋め込まれるため、
`visibility` は `plaintext` でよい（`secret` にするとビルド時に読めない）。

### 3. ビルド

```bash
npx eas-cli build --profile preview --platform android   # 内部配布用APK
npx eas-cli build --profile production --platform ios
```

iOS の実機ビルド・配布には Apple Developer Program（$99/年）、
Android の配布には Google Play Console（$25・買い切り）の登録が必要。

## YouTube連携の実機確認について

YouTube OAuth は認証後に `lantern://dashboard` へ復帰する。
このスキームはブラウザでは解決されないため、**Expo Web では連携の往復を確認できない**。
Expo Go または開発ビルドでの確認が必要。

バックエンド側は `state` に `user_id|platform` を載せ、`platform=app` のときだけ
アプリのスキームへリダイレクトする。Google Cloud Console のリダイレクトURI設定は
変更不要（Google の戻り先は従来通り Flask のまま）。

## Web版との関係

現時点では `../frontend`（React + Vite）が本番Webを担っている。
A7 で Expo Web 出力へ切り替える計画。それまでは両方を保守する。
