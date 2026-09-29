import { run } from "../db";

/** Record a sensitive action. Never pass passwords, tokens or full payloads in `detail`. */
export function audit(actorId: number | null, action: string, entity: string, entityId?: string | number, detail?: string, ip?: string) {
  run("INSERT INTO audit_log(actor_id,action,entity,entity_id,detail,ip,created_at) VALUES(?,?,?,?,?,?,?)",
    actorId, action, entity, entityId == null ? null : String(entityId), detail ?? null, ip ?? null, Date.now());
}
