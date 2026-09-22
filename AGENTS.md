# AGENTS.md

このファイルは、リポジトリ内で作業するエージェント向けの補足ルールです。

## 参照先

- アプリケーションの目的、セットアップ、環境変数、通知記法、ディレクトリ構成は [README.md](./README.md) を参照する。
- 依存ライブラリのバージョンは [pnpm-workspace.yaml](./pnpm-workspace.yaml) の `catalog` を正とする。
- CI/CDの変更時は [.github/workflows](./.github/workflows) と [Dockerfile](./Dockerfile) の既存方針を確認する。

## 開発ルール

- 実行環境、起動方法、検証コマンドは [README.md](./README.md) の記載に従う。依存関係の追加・更新では、`package.json` に個別のバージョンを直接書かず `catalog:` を使う。
- TypeScriptはESM構成のため、ソース間のimportでは`.js`拡張子を維持する。
- READMEに記載された責務分離と依存方向を維持し、ドメインモデルへHTTPや環境変数の依存を持ち込まない。
- 実装を変更したら、対応するテストを実装ファイルの隣に追加・更新する。外部APIのリクエスト形式を変更する場合は、送信JSONを検証するテストも更新する。
- HTMLのサニタイズやSlackのメンション形式など、外部サービスに依存する処理は既存のライブラリ・API仕様に合わせ、独自の簡易実装へ戻さない。
- `.env`、アクセストークン、秘密鍵などの認証情報をコミットしない。設定例を変更する場合は`.env.example`だけを更新する。
- `dist`や`node_modules`などの生成物をコミットしない。
