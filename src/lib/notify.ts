import { one, run } from "../db";

/**
 * Event-driven notifications. In-app rows are written directly; email and SMS are queued in `outbox`
 * for a delivery worker (SMTP / SMS gateway) to send. No manual duplication of workflows.
 */
export function notify(userId: number, kind: string, title: string, body: string, link?: string) {
  run("INSERT INTO notifications(user_id,kind,title,body,link,created_at) VALUES(?,?,?,?,?,?)", userId, kind, title, body, link ?? null, Date.now());
  const u = one<{ email: string }>("SELECT email FROM users WHERE id=?", userId);
  if (u) run("INSERT INTO outbox(channel,to_addr,subject,body,created_at) VALUES('email',?,?,?,?)", u.email, title, body, Date.now());
}
