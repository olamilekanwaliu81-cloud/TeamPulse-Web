import Link from "next/link";

export function Brand() {
  return (
    <Link className="brand" href="/" title="Back to the landing page">
      <span className="mark">
        <svg width="20" height="20" viewBox="0 0 28 28" fill="none" aria-hidden="true">
          <path d="M2 15h6l3-9 5 17 3-8h7" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      TeamPulse
    </Link>
  );
}

/** Sign-in, registration and link pages: the form on the left, a calm brand panel on the right. */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth">
      <section className="auth-main">
        <Brand />
        <div className="auth-card">{children}</div>
        <p className="auth-foot"><Link href="/">Back to the landing page</Link><span>TeamPulse</span></p>
      </section>
      <aside className="auth-panel" aria-hidden="true">
        <div className="ap-copy">
          <h2>Know where your team stands, every month.</h2>
          <p>One short check-in a month. See who is on track, who needs a nudge and who just signed up.</p>
        </div>
        <div className="ap-art">
          <div className="ap-card"><small>This month&apos;s check-in</small><h4>Your team</h4>
            <div className="ap-row"><i className="on">&#10003;</i>Plan for the month<b>done</b></div>
            <div className="ap-row"><i className="on">&#10003;</i>Personal PV<b>done</b></div>
            <div className="ap-row"><i>3</i>Sign-ups to confirm<b>by the 25th</b></div>
            <div className="ap-bar"><i /></div></div>
          <div className="ap-mini">
            <div className="ap-card"><small>Check-ins in</small><strong>18 / 25</strong><div className="up">72% of the team</div></div>
            <div className="ap-card"><small>New this month</small><strong>4</strong><div className="up">+2 since last month</div></div>
          </div>
        </div>
      </aside>
    </div>
  );
}
