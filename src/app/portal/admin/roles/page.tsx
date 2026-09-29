import type { Metadata } from "next";
import { requirePermission } from "../../../../lib/auth";
import { ROLES, ROLE_LABELS, ROLE_PERMISSIONS, type Permission } from "../../../../lib/permissions";

export const metadata: Metadata = { title: "Roles and permissions" };

export default async function Page() {
  await requirePermission("roles:manage");
  const perms = [...new Set(Object.values(ROLE_PERMISSIONS).flat())].sort() as Permission[];
  return (
    <>
      <h1>Roles and permissions</h1><p className="muted">Permissions are defined in code so every change is reviewed and versioned. A tick means the role has the permission.</p>
      <div className="panel table-wrap"><table className="table"><thead><tr><th>Role</th>{perms.map((p) => <th key={p} style={{ fontSize: ".75rem" }}>{p}</th>)}</tr></thead>
        <tbody>{ROLES.map((r) => <tr key={r}><th scope="row">{ROLE_LABELS[r]}</th>{perms.map((p) => <td key={p} style={{ textAlign: "center" }}>{ROLE_PERMISSIONS[r].includes(p) ? <span aria-label="Allowed">✔</span> : <span aria-label="Not allowed" className="muted">–</span>}</td>)}</tr>)}</tbody></table></div>
    </>
  );
}
