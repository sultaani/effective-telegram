import type { Metadata } from "next";
import { requirePermission } from "../../../../lib/auth";
import { listUsers } from "../../../../services/users";
import { ROLES, ROLE_LABELS, type Role } from "../../../../lib/permissions";
import { CreateUserForm, ResetPasswordForm } from "../../../../components/AdminForms";
import { setRolesAction, toggleActiveAction } from "../../../actions/admin";
import { Empty, Pagination, StatusBadge, pageNum, str } from "../../../../components/bits";

export const metadata: Metadata = { title: "Users" };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const s = await requirePermission("users:manage");
  const sp = await searchParams; const q = str(sp.q), role = str(sp.role), page = pageNum(sp.page);
  const { rows, total, pages } = await listUsers({ q, role, page });
  const priv = s.actor.roles.includes("SUPER_ADMIN");
  return (
    <>
      <h1>Users</h1>
      <div className="panel"><h2>Add a staff account</h2><CreateUserForm canPrivileged={priv} /></div>
      <form className="filters" role="search"><div className="field"><label htmlFor="q">Search name or email</label><input id="q" name="q" type="search" defaultValue={q} /></div>
        <div className="field"><label htmlFor="role">Role</label><select id="role" name="role" defaultValue={role ?? ""}><option value="">Any role</option>{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}</select></div>
        <button className="btn">Filter</button></form>
      <p className="muted" aria-live="polite">{total} users</p>
      {rows.length === 0 ? <Empty title="No users match" /> : (
        <div className="panel table-wrap"><table className="table stack-sm"><thead><tr><th>Name</th><th>Roles</th><th>Status</th><th>Manage</th></tr></thead>
          <tbody>{rows.map((u) => {
            const roles = (u.roles ?? "").split(",").filter(Boolean) as Role[];
            const editable = !roles.includes("STUDENT");
            return (
              <tr key={u.id}><td data-label="Name"><strong>{u.name}</strong><br /><span className="small muted">{u.email}</span></td>
                <td data-label="Roles">{roles.map((r) => ROLE_LABELS[r]).join(", ") || "–"}</td>
                <td data-label="Status">{u.is_active ? <span className="badge ok">Active</span> : <span className="badge bad">Deactivated</span>}</td>
                <td data-label="Manage"><div className="stack" style={{ textAlign: "left" }}>
                  <form action={toggleActiveAction}><input type="hidden" name="user" value={u.id} /><input type="hidden" name="active" value={u.is_active ? "0" : "1"} /><button className="btn small secondary">{u.is_active ? "Deactivate" : "Reactivate"}</button></form>
                  <ResetPasswordForm userId={u.id} />
                  {editable && <details><summary style={{ cursor: "pointer", fontWeight: 600 }}>Change roles</summary>
                    <form action={setRolesAction} style={{ marginTop: 8 }}><input type="hidden" name="user" value={u.id} />
                      {ROLES.filter((r) => r !== "STUDENT" && (priv || (r !== "SUPER_ADMIN" && r !== "ICT_ADMIN") || roles.includes(r))).map((r) => <label key={r} className="row" style={{ gap: 6 }}><input type="checkbox" name="roles" value={r} defaultChecked={roles.includes(r)} disabled={!priv && (r === "SUPER_ADMIN" || r === "ICT_ADMIN")} />{ROLE_LABELS[r]}</label>)}
                      <button className="btn small" style={{ marginTop: 8 }}>Save roles</button></form></details>}
                </div></td></tr>);
          })}</tbody></table></div>
      )}
      <Pagination page={page} pages={pages} base="/portal/admin/users" params={{ q, role }} />
    </>
  );
}
