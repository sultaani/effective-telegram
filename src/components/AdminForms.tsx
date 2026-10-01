"use client";
import { ActionForm } from "./ActionForm";
import { contentAction, createUserAction, invoiceAction, programmeAction, resetPasswordAction, semesterAction } from "../app/actions/admin";
import { ROLES, ROLE_LABELS } from "../lib/permissions";

type Opt = { id: number; label: string };

export function CreateUserForm({ canPrivileged }: { canPrivileged: boolean }) {
  return (
    <ActionForm action={createUserAction} submit="Create account" pendingLabel="Creating…">
      <div className="grid cols-2">
        <div className="field"><label htmlFor="cu-name">Full name</label><input id="cu-name" name="name" type="text" required /></div>
        <div className="field"><label htmlFor="cu-email">Email</label><input id="cu-email" name="email" type="email" required /></div>
      </div>
      <fieldset style={{ border: 0, padding: 0, margin: "0 0 16px" }}><legend className="label">Roles</legend>
        <div className="row">{ROLES.filter((r) => r !== "STUDENT" && (canPrivileged || (r !== "SUPER_ADMIN" && r !== "ICT_ADMIN"))).map((r) => <label key={r} className="row" style={{ gap: 6 }}><input type="checkbox" name="roles" value={r} />{ROLE_LABELS[r]}</label>)}</div></fieldset>
    </ActionForm>
  );
}

export function ResetPasswordForm({ userId }: { userId: number }) {
  return <ActionForm action={resetPasswordAction} submit="Reset password" submitClass="btn small secondary" pendingLabel="Resetting…" confirm="Reset this user's password? They will be signed out."><input type="hidden" name="user" value={userId} /></ActionForm>;
}

export function InvoiceForm({ semesters, programmes }: { semesters: Opt[]; programmes: Opt[] }) {
  return (
    <ActionForm action={invoiceAction} submit="Create invoices" pendingLabel="Creating…" confirm="Create these invoices and notify the students?">
      <div className="grid cols-2">
        <div className="field"><label htmlFor="iv-desc">Description</label><input id="iv-desc" name="description" type="text" required placeholder="Tuition and levies" /></div>
        <div className="field"><label htmlFor="iv-amt">Amount (naira)</label><input id="iv-amt" name="naira" type="number" min="1" step="0.01" required /></div>
        <div className="field"><label htmlFor="iv-sem">Semester</label><select id="iv-sem" name="semester" required>{semesters.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></div>
        <div className="field"><label htmlFor="iv-prog">Programme</label><select id="iv-prog" name="programme"><option value="">All programmes</option>{programmes.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></div>
        <div className="field"><label htmlFor="iv-lvl">Level</label><select id="iv-lvl" name="level"><option value="">All levels</option><option>100</option><option>200</option><option>300</option></select></div>
      </div>
    </ActionForm>
  );
}

export function ProgrammeForm({ departments }: { departments: Opt[] }) {
  return (
    <ActionForm action={programmeAction} submit="Add programme" pendingLabel="Adding…">
      <div className="grid cols-2">
        <div className="field"><label htmlFor="pg-title">Programme title</label><input id="pg-title" name="title" type="text" required /></div>
        <div className="field"><label htmlFor="pg-dep">Department</label><select id="pg-dep" name="department" required><option value="">Choose…</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}</select></div>
        <div className="field"><label htmlFor="pg-award">Award</label><select id="pg-award" name="award"><option>NCE</option><option>PDE</option></select></div>
        <div className="field"><label htmlFor="pg-years">Duration (years)</label><input id="pg-years" name="years" type="number" min={1} max={6} defaultValue={3} /></div>
      </div>
      <div className="field"><label htmlFor="pg-sum">Summary</label><textarea id="pg-sum" name="summary" style={{ minHeight: 80 }} /></div>
      <div className="field"><label htmlFor="pg-entry">Entry requirements</label><textarea id="pg-entry" name="entry" style={{ minHeight: 80 }} /></div>
    </ActionForm>
  );
}

export function SemesterForm({ semesters, current }: { semesters: Opt[]; current?: number }) {
  return (
    <ActionForm action={semesterAction} submit="Save settings" pendingLabel="Saving…" confirm="Change the current semester? Students will see the new registration window immediately.">
      <div className="grid cols-3">
        <div className="field"><label htmlFor="se-sem">Current semester</label><select id="se-sem" name="semester" defaultValue={current}>{semesters.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></div>
        <div className="field"><label htmlFor="se-open">Registration opens</label><input id="se-open" name="opens" type="date" /></div>
        <div className="field"><label htmlFor="se-close">Registration closes</label><input id="se-close" name="closes" type="date" /></div>
      </div>
    </ActionForm>
  );
}

export function ContentForm({ item, type }: { item?: { id: number; type: string; title: string; slug: string; summary: string; body: string; audience: string; event_date: string | null; event_location: string | null; seo_description: string | null; image_url: string | null }; type: string }) {
  const t = item?.type ?? type;
  return (
    <ActionForm action={contentAction} submit={item ? "Save changes" : "Create draft"} pendingLabel="Saving…">
      {item && <input type="hidden" name="id" value={item.id} />}
      <input type="hidden" name="type" value={t} />
      <div className="field"><label htmlFor="c-title">Title</label><input id="c-title" name="title" type="text" defaultValue={item?.title} required maxLength={160} /></div>
      <div className="grid cols-2">
        <div className="field"><label htmlFor="c-slug">Web address ending</label><input id="c-slug" name="slug" type="text" defaultValue={item?.slug} maxLength={80} /><span className="hint">Leave blank to create it from the title.</span></div>
        <div className="field"><label htmlFor="c-aud">Who can see it</label><select id="c-aud" name="audience" defaultValue={item?.audience ?? "public"}><option value="public">Everyone</option><option value="students">Signed-in students</option><option value="staff">Signed-in staff</option></select></div>
      </div>
      <div className="field"><label htmlFor="c-sum">Short summary</label><textarea id="c-sum" name="summary" style={{ minHeight: 70 }} defaultValue={item?.summary} maxLength={400} /><span className="hint">Shown in lists and search results.</span></div>
      <div className="field"><label htmlFor="c-body">Content</label><textarea id="c-body" name="body" style={{ minHeight: 260 }} defaultValue={item?.body} /><span className="hint">Use “## ” for headings, “- ” for lists, and [text](https://link) for links.</span></div>
      {t === "event" && <div className="grid cols-2"><div className="field"><label htmlFor="c-date">Event date</label><input id="c-date" name="event_date" type="date" defaultValue={item?.event_date ?? ""} /></div><div className="field"><label htmlFor="c-loc">Location</label><input id="c-loc" name="event_location" type="text" defaultValue={item?.event_location ?? ""} /></div></div>}
      {(t === "news" || t === "page" || t === "testimonial") && <div className="field"><label htmlFor="c-img">Image</label><input id="c-img" name="image_url" type="text" defaultValue={item?.image_url ?? ""} placeholder="https://… or leave blank" /><span className="hint">Paste an image address, or upload a JPG or PNG below.</span><input name="image_file" type="file" accept=".png,.jpg,.jpeg" style={{ marginTop: 6 }} /></div>}
      {t === "download" && <div className="field"><label htmlFor="c-file">File (PDF, PNG or JPG, up to 5 MB)</label><input id="c-file" name="file" type="file" accept=".pdf,.png,.jpg,.jpeg" /></div>}
      <div className="field"><label htmlFor="c-seo">Search engine description</label><input id="c-seo" name="seo_description" type="text" maxLength={200} defaultValue={item?.seo_description ?? ""} /></div>
    </ActionForm>
  );
}
