import { Layout } from "../components/layout.js"

type Props = {
  userId: string
  message: string
}

export const ErrorPage = ({ userId, message }: Props) => (
  <Layout title="エラー" userId={userId}>
    <div className="notice">{message}</div>
    <a href="/">ダッシュボードへ戻る</a>
  </Layout>
)
