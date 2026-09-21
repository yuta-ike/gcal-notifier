import type { Child } from "hono/jsx"

type Props = {
  title: string
  userId: string
  children: Child
}

export const Layout = ({ title, userId, children }: Props) => (
  <html lang="ja">
    <head>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>{title} | GCal Notifier</title>
      <link rel="stylesheet" href="/assets/styles.css" />
      <script type="module" src="/assets/calendar-modal.js" />
    </head>
    <body>
      <header>
        <nav>
          <a className="brand" href="/">
            GCal Notifier
          </a>
          <a href="/">トップ</a>
          <a href="/calendar">カレンダー</a>
          <a href="/integrations/google">Google連携</a>
          <span title={userId}>{userId}</span>
        </nav>
      </header>
      <main>{children}</main>
    </body>
  </html>
)
