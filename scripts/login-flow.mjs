// Exercises the real login server action via progressive-enhancement form posts.
const base = process.argv[2] || "http://localhost:3000";
async function attempt(email, password) {
  const page = await (await fetch(base + "/portal/login")).text();
  const form = new FormData();
  for (const m of page.matchAll(/<input type="hidden" name="(\$ACTION[^"]*)" value="([^"]*)"/g)) form.append(m[1], m[2].replace(/&quot;/g, '"'));
  for (const m of page.matchAll(/<input type="hidden" name="(\$ACTION[^"]*)"\s*\/?>/g)) form.append(m[1], "");
  form.append("email", email); form.append("password", password);
  const r = await fetch(base + "/portal/login", { method: "POST", body: form, redirect: "manual", headers: { origin: base } });
  return { status: r.status, loc: r.headers.get("location"), cookie: r.headers.get("set-cookie"), text: await r.text() };
}
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log("FAIL:", m); } else console.log("ok:", m); };
const bad = await attempt("student@demo.kcoe.test", "wrong-password");
ok(!bad.cookie && /incorrect/i.test(bad.text), "wrong password shows generic error and sets no cookie");
const unk = await attempt("nobody@demo.kcoe.test", "whatever12345");
ok(!unk.cookie && /incorrect/i.test(unk.text), "unknown email gives the same message");
const good = await attempt("student@demo.kcoe.test", "Demo@12345");
ok(good.cookie?.includes("kcoe_session=") && /httponly/i.test(good.cookie) && /samesite=lax/i.test(good.cookie), "correct password sets an HttpOnly, SameSite session cookie");
ok(good.status === 303 || good.status === 307 || good.status === 302, `redirects after login (${good.status} → ${good.loc})`);
const lect = await attempt("registrar@demo.kcoe.test", "Demo@12345");
ok(/portal\/admin/.test(lect.loc ?? ""), `registrar lands in admin (${lect.loc})`);
if (good.cookie) {
  const c = good.cookie.split(";")[0];
  const dash = await fetch(base + "/portal/student", { headers: { cookie: c } });
  ok(dash.status === 200 && (await dash.text()).includes("Welcome"), "session cookie opens the student dashboard");
  const out = await fetch(base + "/portal/admin", { headers: { cookie: c }, redirect: "manual" });
  ok(out.status === 404, "same session cannot open admin");
}
// lockout after repeated failures
for (let i = 0; i < 5; i++) await attempt("lecturer2@demo.kcoe.test", "bad-guess-" + i);
const locked = await attempt("lecturer2@demo.kcoe.test", "Demo@12345");
ok(!locked.cookie && /locked|too many/i.test(locked.text), "account locks after repeated failures, even with the right password");
process.exit(fail ? 1 : 0);
