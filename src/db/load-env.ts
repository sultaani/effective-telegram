// Loads .env for command-line scripts (seed, migrate, create-admin). Next.js loads it for the app itself.
// Existing environment variables always win. Works on Windows, macOS and Linux with no extra dependency.
import fs from "node:fs";
import path from "node:path";

const file = path.resolve(process.cwd(), ".env");
if (fs.existsSync(file)) {
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (!m) continue;
    let v = m[2];
    if (/^(["']).*\1$/.test(v)) v = v.slice(1, -1);
    if (process.env[m[1]] === undefined) process.env[m[1]] = v;
  }
}
