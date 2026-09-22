import { Layout } from "../components/layout.js"

type Props = {
  userId: string
  googleConnected: boolean
}

export const DashboardPage = ({ userId, googleConnected }: Props) => (
  <Layout title="ダッシュボード" userId={userId}>
    <h1>カレンダー通知君</h1>
    <div className="grid" style="margin: 24px 0">
      <section className="card">
        <h2>Google アカウントの連携</h2>
        <div className="status">
          <span className={`dot${googleConnected ? " ok" : ""}`} />
          {googleConnected ? "連携済み" : "未連携"}
        </div>
        <a className="button secondary" href="/integrations/google">
          {googleConnected ? "設定を確認" : "連携する"}
        </a>
      </section>
    </div>
    {!googleConnected && (
      <div className="notice">Googleを連携するとカレンダー通知を利用できます。</div>
    )}
    <section className="card">
      <h2>通知の設定</h2>
      <p className="muted">予定の説明に次の形式で通知先を記載してください。</p>
      <div className="description-example">notify#general&#123;@alice,@platform&#125;</div>
      <ul>
        <li>チャンネルはSlackのチャンネル名です。メンション部分は省略できます。</li>
        <li>
          メンションはSlackユーザー名、表示名、ユーザーグループ名または @here / @channel です。
        </li>
      </ul>
      <a className="button" href="/calendar">
        カレンダーを見る
      </a>
    </section>
  </Layout>
)
