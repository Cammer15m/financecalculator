import "server-only";
import { headers } from "next/headers";
import { query } from "@/lib/db";

export type AuditMetadata = Record<string, unknown> | null;

export async function logAction(
  userId: string | null,
  action: string,
  metadata: AuditMetadata = null,
  ip?: string,
) {
  const resolvedIp = ip ?? readClientIp();
  try {
    await query(
      "insert into audit_logs (user_id, action, metadata, ip) values ($1, $2, $3, $4)",
      [userId, action, metadata ? JSON.stringify(metadata) : null, resolvedIp],
    );
  } catch (err) {
    console.error("[audit] failed to log action", { action, err });
  }
}

function readClientIp(): string | null {
  try {
    const h = headers();
    const fwd = h.get("x-forwarded-for");
    if (fwd) return fwd.split(",")[0]!.trim();
    return h.get("x-real-ip");
  } catch {
    return null;
  }
}
