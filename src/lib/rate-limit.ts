import { one, run } from "../db";

/** Fixed-window limiter stored in Postgres so it works across serverless instances. Returns true when allowed. */
export async function hit(key: string, max: number, windowMs: number, now = Date.now()): Promise<boolean> {
  const row = await one<{ count: number; window_start: number }>("SELECT count, window_start FROM login_attempts WHERE key=?", key);
  if (!row || now - row.window_start > windowMs) {
    await run("INSERT INTO login_attempts(key,count,window_start) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=1, window_start=EXCLUDED.window_start", key, now);
    return true;
  }
  if (row.count >= max) return false;
  await run("UPDATE login_attempts SET count=count+1 WHERE key=?", key);
  return true;
}
export async function reset(key: string) { await run("DELETE FROM login_attempts WHERE key=?", key); }
