import { one, run } from "../db";

/** Fixed-window limiter backed by SQLite so it survives restarts. Returns true when the action is allowed. */
export function hit(key: string, max: number, windowMs: number, now = Date.now()): boolean {
  const row = one<{ count: number; window_start: number }>("SELECT count, window_start FROM login_attempts WHERE key=?", key);
  if (!row || now - row.window_start > windowMs) {
    run("INSERT INTO login_attempts(key,count,window_start) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=1, window_start=?", key, now, now);
    return true;
  }
  if (row.count >= max) return false;
  run("UPDATE login_attempts SET count=count+1 WHERE key=?", key);
  return true;
}
export function reset(key: string) { run("DELETE FROM login_attempts WHERE key=?", key); }
