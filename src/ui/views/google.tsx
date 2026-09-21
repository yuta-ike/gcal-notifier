import { Layout } from "../components/layout.js"

type Props = {
  userId: string
  connected: boolean
}

export const GooglePage = ({ userId, connected }: Props) => (
  <Layout title="Google連携" userId={userId}>
    <h1>Google アカウント連携</h1>
    <p className="muted">
      予定とカレンダーを確認するため、Google Calendar へのアクセスを許可します。
    </p>
    <section className="card" style="margin-top: 20px">
      <div className="status">
        <span className={`dot${connected ? " ok" : ""}`} />
        {connected ? "連携済み" : "未連携"}
      </div>
      <div className="actions">
        <a className="button" href="/auth/google/start">
          {connected ? "Googleを再連携" : "Googleと連携"}
        </a>
        {connected && (
          <form method="post" action="/integrations/google/disconnect">
            <button className="danger" type="submit">
              連携を解除
            </button>
          </form>
        )}
      </div>
    </section>
  </Layout>
)
