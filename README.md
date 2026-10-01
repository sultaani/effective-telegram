# Kogi State College of Education, Ankpa: Digital Platform

Public website, CMS, and student / staff / administration portals in one Next.js 15 application on **PostgreSQL (Neon)**.

## 1. Connect Neon and deploy

1. Create a Neon project. In **Connect**, copy the *pooled* connection string into `DATABASE_URL` and the *direct* one into `DATABASE_URL_UNPOOLED` (see `.env.example`).
2. Set `APP_URL` (https) and a long random `GATEWAY_SECRET` (for example `openssl rand -hex 32`).
3. `npm ci && npm run build`
4. `npm run migrate` creates all tables **and installs the baseline website content** (navigation pages, footer pages, the five schools, sample news, events and testimonials), so every menu and footer link works on a brand-new database without seeding. It never overwrites content staff have edited. It also runs automatically on first request. Run `npm run doctor` any time to check the connection and content counts.
5. Create the first administrator (works in PowerShell, cmd, macOS and Linux): `npm run create-admin -- --email you@college.edu.ng --name "Your Name" --password "a-long-passphrase-1"`
6. `npm start` behind TLS (Vercel, Render, Railway, a VPS with Caddy/nginx, or the included `Dockerfile`). Uploads are stored in Postgres, so the app servers stay stateless and can scale horizontally.

**Demo data.** To try the platform with sample content, create a *separate Neon branch*, put its connection string in `.env` and run `npm run seed:demo`. (Plain `npm run seed` refuses to touch a non-local database; `seed:demo` is the same command with the confirmation built in.) The seed **erases the database**; never run it on production. Demo accounts use `DEMO_PASSWORD` (default `Demo@12345`): `student@`, `lecturer@`, `hod@`, `dean@`, `registrar@`, `bursary@`, `exams@`, `webadmin@`, `editor@`, `ict@`, `super@` `demo.kcoe.test`.

## 2. Run locally without Neon (optional)

Scripts read `.env` automatically on every platform. If you use Neon you can skip this section.

```bash
npm install
npm rebuild @embedded-postgres/linux-x64 --ignore-scripts=false   # (Linux) links the bundled Postgres libraries; other platforms install their own package automatically
npm run db:local                # starts a throwaway local Postgres on :54329 (leave running; set LOCAL_PG_PORT to change it)
cp .env.example .env            # then set DATABASE_URL=postgres://kcoe:kcoe@localhost:54329/kcoe and GATEWAY_SECRET
npm run seed && npm run dev
```

## 3. What is in it

| Area | Highlights |
|---|---|
| Public site | Mega-menu navigation modelled on the Federal University Lokoja site structure (About, Academics, Admissions, Student, Research, Campus, TETFund, Support Services, News); full-bleed hero, programme finder, Provost's welcome, *Study at KCOE*, *What our students say*, latest news, Middlesex-style footer; schools, programmes with course lists, news, events, FAQ, downloads, gallery, site search, sitemap, robots, Open Graph, JSON-LD, canonical URLs |
| CMS | Pages, news, announcements, events, FAQs, downloads, testimonials; images by URL or upload; Draft → Review → Published → Archived; internal Verified / Awaiting confirmation / Demo flag (never shown to the public); role-limited publishing; audit trail |
| Student portal | Action-first dashboard, course registration with unit limits and approval, results with GPA/CGPA, fees, payments and receipts, timetable, calendar, notifications, support |
| Staff portal | Assigned courses, class lists, score entry, submit to HOD, HOD/Dean approvals scoped to department/school |
| Administration | Users and roles, students (filter, CSV export), registration approvals, results publication, fee invoicing and payments, programmes, website content, academic settings, roles matrix, audit log, reports |

Result workflow: lecturer saves → submits → HOD/Dean approves or returns → Examinations office publishes → student notified. Students never see unpublished results.

## 4. Images and content you must replace

- Photographs are hotlinked from Unsplash (free licence; credits in `src/lib/images.ts`). Replace them with the college's own photography by editing that file or setting images in the CMS. The Provost's portrait has no stock photo: upload the real one on the *Provost's welcome* page in the CMS.
- Sample content: programmes, departments, staff, fees, dates, news, testimonials, and the wording of most pages are placeholders written for the demo. The five school names and the college name come from the college's official site. The Provost's welcome is placeholder text that must be replaced with a message the Provost has approved.
- The crest in the header is a placeholder drawing.
- Assumptions to confirm: grading scale and CA/exam split (`src/lib/grading.ts`), unit load 15–24 (`src/services/registration.ts`).
- Payments use a built-in simulator (DemoPay) that follows the same signed-webhook path a real gateway uses. Connect Remita/Paystack by replacing `src/app/pay` and the initiation step.
- Email/SMS events are queued in the `outbox` table; a sender still needs to be connected.

## 5. Security summary

scrypt password hashing; random session tokens (only hashes stored), HttpOnly + SameSite + Secure on https, 8-hour expiry; per-IP and per-email rate limits plus account lock after 5 failures; identical errors for unknown users and wrong passwords; server-side authorisation on every page, action and route (unauthorised access returns 404); records are fetched through the signed-in student/lecturer, never by URL id alone; parameterised SQL with escaped `LIKE`; React escaping, a restricted content renderer, CSP and security headers; uploads validated by extension and magic bytes (5 MB cap) and stored in Postgres; payments settle only through an HMAC-verified, amount-checked, idempotent webhook; CSV exports neutralise spreadsheet formulas; sensitive actions are audited.

## 6. Backups

Neon provides point-in-time restore and branching; enable it for the production project. As an independent copy, `npm run backup -- /path/to/backups 14` writes a consistent snapshot of every table (gzip JSON) and keeps the newest 14. Restore into a migrated database with `CONFIRM=yes npm run restore -- backups/<timestamp>`. Test a restore each term.

## 7. Testing

```bash
npm run db:local                         # in one shell
TEST_DATABASE_URL=postgres://kcoe:kcoe@localhost:54329/kcoe_test npm test   # 29 unit + service tests (wipes the test DB)
npm run build && npm start               # then:
npm run smoke -- http://localhost:3000        # 138 route, permission and content checks (needs a seeded database)
npm run smoke:login -- http://localhost:3000  # real login, cookie flags, lockout
```

## 8. Layout

`src/db` migrations, connection, seed · `src/lib` auth, RBAC, grading, files, payments, images, site navigation · `src/services` business logic · `src/app/(site)` public pages · `src/app/portal` portals · `src/app/actions` server actions · `src/components` shared UI · `scripts` migrate, backup, restore, create-admin, smoke tests · `docs` research register.
