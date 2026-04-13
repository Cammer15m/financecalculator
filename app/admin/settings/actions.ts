"use server";

import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { logAction } from "@/lib/audit";

export async function upsertSetting(formData: FormData) {
  const actor = await requireAdmin();
  const key = String(formData.get("key") ?? "").trim();
  const value = String(formData.get("value") ?? "");
  const description = String(formData.get("description") ?? "") || null;
  if (!key) return;

  await query(
    `insert into app_settings (key, value, description, updated_by, updated_at)
     values ($1, $2, $3, $4, now())
     on conflict (key) do update
       set value = excluded.value,
           description = coalesce(excluded.description, app_settings.description),
           updated_by = excluded.updated_by,
           updated_at = now()`,
    [key, value, description, actor.id],
  );

  await logAction(actor.id, "admin.setting.upsert", { key, value });
  revalidatePath("/admin/settings");
}
