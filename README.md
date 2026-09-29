# Kogi State College of Education, Ankpa: Digital Platform (demo build)

Public website, CMS, and student / staff / administration portals in one Next.js application with an embedded SQLite database.

> **Demo status.** School names come from the college's official site navigation. Programmes, departments, staff, fees, dates, news and the crest are **sample content** clearly marked "Demo content" or "Awaiting confirmation". The grading scale and unit limits are assumptions (see "Rules to confirm"). Nothing here should be presented as official until the college confirms it.

## Run it (one command)

Requires Node.js 20 or newer.

```bash
npm install
cp .env.example .env   # the demo runs with the example values; production must change them
npm run demo        # seeds demo data, builds, and serves on http://localhost:3000
```

Sign in at `/portal/login`. Demo accounts (password `Demo@12345`): `student@`, `lecturer@`, `hod@`, `dean@`, `registrar@`, `bursary@`, `exams@`, `webadmin@`, `editor@`, `ict@`, `super@` `demo.kcoe.test`.
Change `DEMO_PASSWORD` in `.env` before seeding if the demo is on a public server, and set `SHOW_DEMO_ACCOUNTS` unset (the demo-account list is hidden when `NODE_ENV=production` unless `SHOW_DEMO_ACCOUNTS=1`).

## What is in it

| Area | Highlights |
|---|---|
| Public site | Home with programme finder, About/Admissions/Contact (CMS pages), Schools, Programmes (search, filters, course lists), News, Events, FAQ, Downloads, Leadership, site search, sitemap, robots, Open Graph, JSON-LD, canonical URLs |
| CMS | Pages, news, announcements, events, FAQs, downloads with secure uploads; Draft → Review → Published → Archived; separate **Verified / Awaiting confirmation / Demo content** flag; role-limited publishing; audit trail |
| Student portal | Dashboard of what needs action, course registration (compulsory/elective, unit limits, submit/approval), registered courses, results with semester GPA and CGPA, fees with invoices/payments/receipts, timetable, exam timetable, calendar, notifications, support requests |
| Staff portal | Assigned courses, class lists, score entry with live grade, submit to HOD, result history, HOD/Dean approvals scoped to department/school |
| Administration | Users and roles, students (filter, export), registration approvals, results publication, fee invoicing and payment review (CSV export), programmes, website content, academic settings, roles matrix, audit log, reports |

Result workflow: lecturer saves → submits → HOD/Dean approves (or returns) → Examinations office publishes → student is notified and can see it. Students never see unpublished results.

## Configuration (`.env`)

| Variable | Purpose |
|---|---|
| `APP_URL` | Public URL. If it starts with `https`, cookies are `Secure`. Also used in sitemap/canonical URLs. |
| `DATABASE_FILE` | SQLite file (default `data/kcoe.db`). Uploads live beside it in `data/uploads`. |
| `GATEWAY_SECRET` | Shared secret used to sign/verify payment webhooks. **Set a long random value in production.** |
| `DEMO_PASSWORD` | Password given to seeded demo users. |
| `SHOW_DEMO_ACCOUNTS` | `1` shows the demo-account hint on the login page in production. |

## Production deployment

1. Copy `.env.example` to `.env` and set `APP_URL` (https) and a long random `GATEWAY_SECRET`. In production the app refuses to process payments while `GATEWAY_SECRET` is unset or still the example value.
2. `npm ci && npm run build`. **Do not run `npm run seed` in production** (it wipes the database).
3. Create the first administrator: `ADMIN_EMAIL=... ADMIN_NAME="..." ADMIN_PASSWORD='...' npm run create-admin`.
4. `npm start` behind a TLS reverse proxy (nginx, Caddy) that forwards `X-Forwarded-For`. A `Dockerfile` is included; mount `/app/data` as a volume.
5. Migrations run automatically at start-up (`src/db/migrations.ts`, append-only).

**Scaling note.** SQLite in WAL mode comfortably serves a single-server institution of this size. The data access is isolated in `src/db` and `src/services`, so moving to PostgreSQL later means replacing that layer; the schema is written to translate directly.

## Backups and recovery

- Daily: `npm run backup -- /path/to/backups 14` (consistent online backup of the database plus uploads, keeps the newest 14). Schedule with cron and copy the folder off the server.
- Restore: stop the app, `npm run restore -- backups/<timestamp>`, start the app.
- Configuration is only `.env` and the code; keep both in a private repository/secret store.
- Test a restore on a copy at least once a term.

## Security summary

Passwords: scrypt with per-user salt; 10+ characters with a letter and number for new passwords. Sessions: random 256-bit token, only its hash is stored, HttpOnly + SameSite=Lax + Secure on https, 8-hour expiry, deleted on sign-out/deactivation/reset. Brute force: per-IP and per-email limits plus 15-minute account lock after 5 failures; identical error for unknown users and wrong passwords. CSRF: Next.js server-action origin checks and SameSite cookies. Access control: every page, action and route calls server-side `requireSession`/`requirePermission`; records are always looked up through the signed-in student/lecturer, never by an id from the URL alone; unauthorised access returns 404. SQL: parameterised queries only, with escaped `LIKE`. XSS: React escaping, a restricted content renderer (no raw HTML, only http/https/relative links), CSP and security headers. Uploads: extension + magic-byte checks, 5 MB cap, random names, stored outside `public/`. Payments: status changes only through an HMAC-verified webhook, amount must match, idempotent. CSV exports neutralise spreadsheet formulas. Sensitive actions are written to the audit log (never passwords or tokens).

## Roles and permissions

Defined in `src/lib/permissions.ts` (viewable in the app under Roles and permissions for a super administrator). Duties are separated: Super administrator manages access and configuration but cannot publish results or see fees; ICT administrators cannot grant privileged roles; editors draft but cannot publish; bursary cannot approve results.

## Design tokens

`src/styles/tokens.css`. Light theme only. Public site: green leads, blue for links, red for deadlines/alerts only. Portals: royal blue `#2148c0` (7.6:1 on white). Status is always shown with text, never colour alone. Fonts are self-hosted (Public Sans, Newsreader).

## Content verification workflow

New CMS items start as *Awaiting confirmation*. A website administrator marks an item *Verified* after checking it against an official source. Demo items are *Demo content*. Pages awaiting confirmation display a notice to the public. `docs/research-register.md` lists what was verified from the official site and what still needs the college's confirmation.

## Rules to confirm with the college

- Grading scale (A ≥ 70 = 5 … F < 40 = 0), CA 30 / exam 70 (`src/lib/grading.ts`).
- Unit load 15–24 per semester (`src/services/registration.ts`).
- Programme list, departments, entry requirements, fees, calendar, leadership, history, contact phone, crest and brand colours.
- Payment provider (Remita, Paystack, etc.). The included "DemoPay" simulator uses the same signed-webhook path a real gateway would; only `src/app/pay` and the initiation step need replacing.
- Email/SMS delivery: events already write to the `outbox` table; a small worker or SMTP/SMS integration must send them.

## Testing

```bash
npm test                     # unit + service tests (authorization, workflow, payments, CMS, users)
npm run build && npm start   # then in another shell:
npm run smoke -- http://localhost:3000        # 117 route/permission checks
npm run smoke:login -- http://localhost:3000  # real login, cookie flags, lockout
```
(Run `npm run seed` first so smoke tests have data; the lockout test locks the `lecturer2` demo account: reseed to reset.)

## Layout

`src/db` migrations and seed · `src/lib` auth, RBAC, grading, files, payments · `src/services` business logic · `src/app/(site)` public pages · `src/app/portal` portals · `src/app/actions` server actions · `src/components` shared UI · `scripts` backup/restore/admin/smoke · `docs` research register.
