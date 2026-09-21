# GCal Notifier

Google カレンダーの予定をSlackに通知するためのツール。

## 認証

認証は oauth2-proxy をサイドカーで立てて利用する。アプリケーション側はHTTP HeaderでUser IDを受け取るのみ。

## Frontend

### Google アカウント連携ページ

Google アカウント連携ページは、Google OAuth2.0の認証フローを利用して、ユーザーのGoogleアカウントとアプリケーションを連携させるためのページ。
Google カレンダーに関する必要なスコープを設定する

### カレンダービュー

`/calendar` で、`.env` の `GOOGLE_CALENDAR_ID` に指定したGoogleカレンダーの予定を月表示します。
予定はログインユーザー自身のGoogle OAuthトークンでGoogle Calendar APIから取得し、前後の月へ移動できます。

リマインダーは、Cloud Runに割り当てたサービスアカウントの認証情報でGoogle Calendar APIを呼び出します。対象カレンダーをそのサービスアカウントに共有すればよく、サービスアカウントキーやキー用の環境変数は使用しません。

## Database

MongoDBを利用する。開発環境では docker で起動する。

### access_tokens

ユーザーごとのアクセストークンを保存する。保存時は暗号化して保存する。

## 通知設定

通知ルールはDBには保存せず、Googleカレンダーの予定のdescriptionから読み取ります。
Slackへの通知送信には、`.env` の `SLACK_BOT_TOKEN` に設定した bot token を使用します。bot を送信先チャンネルへ招待しておいてください。
次の記法を予定のdescriptionに記載してください。

```text
notify#<slack_channel>{@<mention1>,@<mention2>}
```

または、メンションなしで:

```text
notify#<slack_channel>
```

例:

```text
notify#release-alerts{@alice,@platform}
```

チャンネルはSlackのチャンネル名、メンションはSlackユーザー名・表示名・ユーザーグループ名を指定します。メンション部分は省略できます。
`@here`、`@channel`、`@everyone`も利用できます。description内に複数の記法を記載すると、複数の通知先へ送信します。

通知ジョブの実行スロットは従来どおり10時、12時、18時です。

## リマインドロジック

毎日10時、12時、18時に起動し、対象カレンダーの予定を取得します。descriptionに通知記法があり、そのスロットで通知対象となる予定であれば、`SLACK_BOT_TOKEN` で通知します。

Cloud Runのサービスアカウントが対象カレンダーへアクセスできない場合、リマインド処理はエラーで終了します。

## 実装・起動

実装は `hono/jsx` による SSR、Hono の JSON API、MongoDB Driver、外部 cron から呼び出す通知エンドポイントで構成しています。

Node.js 26 以上と pnpm 12 を使用してください。

```sh
cp .env.example .env
pnpm install
pnpm dev
```

通知対象のGoogleカレンダーは、`.env` の `GOOGLE_CALENDAR_ID` に1つ指定します。

MongoDB と oauth2-proxy を含めて起動する場合は、`.env` に OAuth の値を設定してから実行します。

```sh
docker compose up --build
```

cron は `CRON_SECRET` を Bearer token として、次のように呼び出します。

```sh
curl -X POST \
  -H "Authorization: Bearer $CRON_SECRET" \
  "http://localhost:8080/api/cron/reminders?date=2026-09-12&slot=10:00"
```

ユニットテストと静的検査は以下で実行できます。

```sh
pnpm test
pnpm build
pnpm lint
```

## ディレクトリ構成

`routes` / `controller` / `domain` / `infrastructure` / `libs` / `ui` に責務を分離しています。

```text
index.tsx                 # HTTPサーバーの起動
src/
├── app.ts                # Honoアプリケーションと各routeの登録
├── config.ts             # 環境変数から設定を生成
├── db.ts                 # データベース接続の初期化
├── http.ts               # HonoのContext / User型
├── middleware/auth.ts    # Forward Authの認証情報を処理
├── routes/               # HTTP入力とレスポンス形式の変換
│   ├── web.tsx           # SSR画面とHTMLフォーム
│   ├── auth.tsx          # Google OAuth
│   ├── api.ts            # JSON API
│   ├── cron.ts           # 通知ジョブのエンドポイント
│   └── health.ts         # ヘルスチェック
├── controller/            # ユースケースの実行
│   ├── access-token-*.ts  # OAuthトークンの取得、保存、削除
│   ├── google-calendar-events-list.ts # Google Calendar予定一覧
│   ├── google-calendars-list.ts # Google Calendar一覧
│   └── reminder-job.ts    # Calendar取得からSlack通知までのCron処理
├── domain/               # 外部依存を持たないルール判定
│   ├── model/             # 通知記法、通知対象、予定などのドメインモデル
│   └── usecase/           # 通知対象判定、時刻判定
├── infrastructure/        # 外部サービスに依存する実装
│   ├── db/                # MongoDBの各操作
│   └── security/crypto.ts # トークンとOAuth stateの暗号処理
├── libs/                   # 外部APIや共通処理
│   ├── google/             # Google Calendar API
│   ├── slack/              # Slack APIとメッセージ処理
│   ├── api-client.ts       # HTTP APIクライアント共通処理
│   ├── db.ts               # MongoDB接続
│   ├── html.ts             # HTMLサニタイズ
│   └── *.ts                # 日時、ページング、Resultなどの共通処理
└── ui/                     # SSR用のUI
    ├── components/         # 共通UIコンポーネント
    └── views/              # ページ単位のSSR View
```

テストは各実装ファイルの隣に置いています。依存方向は `routes → controller → domain/libs/infrastructure` とし、HTTPのContextや環境変数をドメイン処理へ持ち込みません。`index.tsx` はComposition Rootとして `src/app.ts` を起動するだけです。
