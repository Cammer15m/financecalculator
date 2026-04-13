"use server";

import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { logAction } from "@/lib/audit";

export async function toggleFlag(formData: FormData) {
  const actor = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const enabled = String(formData.get("enabled") ?? "false") === "true";
  if (!id) return;

  const { rows } = await query<{ key: string }>(
    "update feature_flags set enabled = $1, updated_by = $2, updated_at = now() where id = $3 returning key",
    [enabled, actor.id, id],
  );

  await logAction(actor.id, "admin.flag.toggle", { key: rows[0]?.key ?? null, enabled });
  revalidatePath("/admin/flags");
}
