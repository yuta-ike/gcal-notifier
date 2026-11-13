# GCal Notifier

Google カレンダーの予定をSlackに通知するためのツール。

アクセストークンを利用してGoogleカレンダーの予定を取得し、特定のグループメールアドレスがあればその予定をSlackに通知する。

毎日朝10時に起動される。

## 通知対象

カレンダーの説明に下記の文字列が含まれている場合、Slackに通知する。ここで指定されるのはチャンネル名のため、そこからチャンネルIDの特定はSlack APIを経由して行う。

```text
notify#<slack_channel>{@<mention1>,@<mention2>}
```

## 技術スタック

- @googleapis/calendar
- @slack/web-api
- zod

## デプロイ

Cloud Runを想定。`Dockerfile`を使ってデプロイする。

GitHub Releaseを公開すると、GitHub ActionsがDockerイメージをGitHub Container Registry（GHCR）へ公開する。イメージは`ghcr.io/<owner>/<repository>:<release-tag>`で参照できる。GHCR上のパッケージをパブリックにする場合は、初回のみGitHubのPackage settingsで可視性をPublicへ変更する。

### 設定

`.env.example`を参考に、次の環境変数を設定する。

- `GOOGLE_ACCESS_TOKEN`: Google Calendar APIのアクセストークン
- `GOOGLE_CALENDAR_ID`: 取得対象のカレンダーID（既定値は`primary`）
- `GOOGLE_GROUP_EMAIL`: 通知対象とする予定参加者のグループメールアドレス
- `SLACK_BOT_TOKEN`: Slack Bot Token（`channels:read`、`groups:read`、`chat:write`が必要）
- `PORT`: HTTPポート（既定値は`8080`）
- `TIME_ZONE`: 「今日」の判定に使うIANAタイムゾーン（既定値は`Asia/Tokyo`）

Cloud Schedulerなどから毎日10時に、空のJSONオブジェクト（`{}`）を本文として`POST /notify`を呼び出す。`GET /health`はヘルスチェック用である。

`/notify`は対象日の予定を取得し、参加者に`GOOGLE_GROUP_EMAIL`が含まれ、説明に通知記法がある予定だけを処理する。通知先チャンネルはSlack APIで名前からIDへ解決し、`@mention`は説明に書かれた平文のまま送信する。

## 品質保証

- knip
- oxlint, oxfmt
- github actions: ci
