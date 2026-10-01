/** Ordered, append-only PostgreSQL migrations. Never edit an applied migration; add a new one. */
import { applyBaseline, type Q } from "./baseline";

export const MIGRATIONS: { id: number; name: string; sql?: string; up?: (q: Q) => Promise<void> }[] = [
  {
    id: 1,
    name: "initial",
    sql: `
CREATE TABLE users(
  id SERIAL PRIMARY KEY, email TEXT NOT NULL, name TEXT NOT NULL, password_hash TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1, failed_logins INTEGER NOT NULL DEFAULT 0, locked_until BIGINT, created_at BIGINT NOT NULL);
CREATE UNIQUE INDEX users_email_lower ON users(lower(email));
CREATE TABLE user_roles(user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, role TEXT NOT NULL, PRIMARY KEY(user_id, role));
CREATE TABLE sessions(token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at BIGINT NOT NULL, created_at BIGINT NOT NULL, ip TEXT, user_agent TEXT);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE TABLE login_attempts(key TEXT PRIMARY KEY, count INTEGER NOT NULL, window_start BIGINT NOT NULL);

CREATE TABLE schools(id SERIAL PRIMARY KEY, slug TEXT NOT NULL UNIQUE, name TEXT NOT NULL, summary TEXT NOT NULL DEFAULT '',
  verification TEXT NOT NULL DEFAULT 'AWAITING_CONFIRMATION', image_url TEXT);
CREATE TABLE departments(id SERIAL PRIMARY KEY, school_id INTEGER NOT NULL REFERENCES schools(id), name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE,
  verification TEXT NOT NULL DEFAULT 'SAMPLE');
CREATE TABLE programmes(id SERIAL PRIMARY KEY, department_id INTEGER NOT NULL REFERENCES departments(id), slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL, award TEXT NOT NULL DEFAULT 'NCE', duration_years INTEGER NOT NULL DEFAULT 3, summary TEXT NOT NULL DEFAULT '',
  entry_requirements TEXT NOT NULL DEFAULT '', verification TEXT NOT NULL DEFAULT 'SAMPLE', is_active INTEGER NOT NULL DEFAULT 1);
CREATE TABLE courses(id SERIAL PRIMARY KEY, programme_id INTEGER NOT NULL REFERENCES programmes(id), code TEXT NOT NULL, title TEXT NOT NULL,
  units INTEGER NOT NULL, level INTEGER NOT NULL, semester_no INTEGER NOT NULL, is_compulsory INTEGER NOT NULL DEFAULT 1,
  UNIQUE(programme_id, code));
CREATE TABLE academic_sessions(id SERIAL PRIMARY KEY, label TEXT NOT NULL UNIQUE, is_current INTEGER NOT NULL DEFAULT 0);
CREATE TABLE semesters(id SERIAL PRIMARY KEY, session_id INTEGER NOT NULL REFERENCES academic_sessions(id), number INTEGER NOT NULL,
  is_current INTEGER NOT NULL DEFAULT 0, reg_opens BIGINT, reg_closes BIGINT, UNIQUE(session_id, number));

CREATE TABLE students(id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL UNIQUE REFERENCES users(id), matric_no TEXT NOT NULL UNIQUE,
  programme_id INTEGER NOT NULL REFERENCES programmes(id), entry_session_id INTEGER NOT NULL REFERENCES academic_sessions(id),
  level INTEGER NOT NULL, phone TEXT);
CREATE TABLE staff(id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL UNIQUE REFERENCES users(id), department_id INTEGER REFERENCES departments(id),
  display_name TEXT NOT NULL, position TEXT NOT NULL DEFAULT '', is_public INTEGER NOT NULL DEFAULT 0, bio TEXT NOT NULL DEFAULT '');
CREATE TABLE allocations(id SERIAL PRIMARY KEY, staff_id INTEGER NOT NULL REFERENCES staff(id), course_id INTEGER NOT NULL REFERENCES courses(id),
  semester_id INTEGER NOT NULL REFERENCES semesters(id), UNIQUE(staff_id, course_id, semester_id));

CREATE TABLE registrations(id SERIAL PRIMARY KEY, student_id INTEGER NOT NULL REFERENCES students(id), course_id INTEGER NOT NULL REFERENCES courses(id),
  semester_id INTEGER NOT NULL REFERENCES semesters(id), level_at_registration INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT', submitted_at BIGINT, UNIQUE(student_id, course_id, semester_id));
CREATE INDEX idx_reg_course ON registrations(course_id, semester_id);
CREATE TABLE results(id SERIAL PRIMARY KEY, registration_id INTEGER NOT NULL UNIQUE REFERENCES registrations(id),
  ca NUMERIC(5,2), exam NUMERIC(5,2), total NUMERIC(5,2), grade TEXT, points INTEGER, status TEXT NOT NULL DEFAULT 'DRAFT',
  entered_by INTEGER REFERENCES users(id), approved_by INTEGER REFERENCES users(id), published_by INTEGER REFERENCES users(id),
  updated_at BIGINT NOT NULL, published_at BIGINT);
CREATE INDEX idx_results_status ON results(status);
CREATE TABLE timetable(id SERIAL PRIMARY KEY, course_id INTEGER NOT NULL REFERENCES courses(id), semester_id INTEGER NOT NULL REFERENCES semesters(id),
  kind TEXT NOT NULL DEFAULT 'CLASS', day TEXT, exam_date TEXT, start_time TEXT NOT NULL, end_time TEXT NOT NULL, venue TEXT NOT NULL);

CREATE TABLE invoices(id SERIAL PRIMARY KEY, student_id INTEGER NOT NULL REFERENCES students(id), semester_id INTEGER NOT NULL REFERENCES semesters(id),
  description TEXT NOT NULL, amount_kobo BIGINT NOT NULL CHECK(amount_kobo > 0), due_date TEXT, created_at BIGINT NOT NULL);
CREATE INDEX idx_invoices_student ON invoices(student_id);
CREATE TABLE payments(id SERIAL PRIMARY KEY, invoice_id INTEGER NOT NULL REFERENCES invoices(id), reference TEXT NOT NULL UNIQUE,
  amount_kobo BIGINT NOT NULL, status TEXT NOT NULL DEFAULT 'PENDING', method TEXT, gateway_ref TEXT, paid_at BIGINT, created_at BIGINT NOT NULL);
CREATE INDEX idx_payments_invoice ON payments(invoice_id);

CREATE TABLE files(id TEXT PRIMARY KEY, original_name TEXT NOT NULL, stored_name TEXT NOT NULL, mime TEXT NOT NULL, size INTEGER NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'public', owner_user_id INTEGER REFERENCES users(id), created_at BIGINT NOT NULL, data BYTEA);
CREATE TABLE content_items(id SERIAL PRIMARY KEY, type TEXT NOT NULL, slug TEXT NOT NULL, title TEXT NOT NULL, summary TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'DRAFT', verification TEXT NOT NULL DEFAULT 'AWAITING_CONFIRMATION',
  audience TEXT NOT NULL DEFAULT 'public', event_date TEXT, event_location TEXT, seo_description TEXT, file_id TEXT REFERENCES files(id),
  image_url TEXT, created_by INTEGER REFERENCES users(id), updated_by INTEGER REFERENCES users(id), created_at BIGINT NOT NULL, updated_at BIGINT NOT NULL,
  published_at BIGINT, UNIQUE(type, slug));
CREATE INDEX idx_content_status ON content_items(type, status, published_at);

CREATE TABLE notifications(id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, kind TEXT NOT NULL,
  title TEXT NOT NULL, body TEXT NOT NULL, link TEXT, read_at BIGINT, created_at BIGINT NOT NULL);
CREATE INDEX idx_notif_user ON notifications(user_id, read_at);
CREATE TABLE outbox(id SERIAL PRIMARY KEY, channel TEXT NOT NULL, to_addr TEXT NOT NULL, subject TEXT, body TEXT NOT NULL,
  created_at BIGINT NOT NULL, sent_at BIGINT);
CREATE TABLE support_requests(id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), subject TEXT NOT NULL, message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN', created_at BIGINT NOT NULL);
CREATE TABLE audit_log(id SERIAL PRIMARY KEY, actor_id INTEGER, action TEXT NOT NULL, entity TEXT NOT NULL, entity_id TEXT, detail TEXT,
  ip TEXT, created_at BIGINT NOT NULL);
CREATE INDEX idx_audit_time ON audit_log(created_at);
`,
  },
  { id: 2, name: "baseline-site-content", up: applyBaseline },
];
