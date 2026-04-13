"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { logAction } from "@/lib/audit";

const BCRYPT_COST = 12;

export async function createUser(formData: FormData) {
  const actor = await requireAdmin();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "user") === "admin" ? "admin" : "user";

  if (!email || password.length < 8) throw new Error("email required, password min 8 chars");

  const hash = await bcrypt.hash(password, BCRYPT_COST);
  const { rows } = await query<{ id: string }>(
    "insert into users (email, password_hash, role) values ($1, $2, $3) returning id",
    [email, hash, role],
  );

  await logAction(actor.id, "admin.user.create", {
    email,
    role,
    target: rows[0]?.id ?? null,
  });
  revalidatePath("/admin/users");
}

export async function disableUser(formData: FormData) {
  const actor = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  if (!userId) return;

  await query("update users set disabled_at = now() where id = $1", [userId]);
  await logAction(actor.id, "admin.user.disable", { target: userId });
  revalidatePath("/admin/users");
}

export async function enableUser(formData: FormData) {
  const actor = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  if (!userId) return;

  await query("update users set disabled_at = null where id = $1", [userId]);
  await logAction(actor.id, "admin.user.enable", { target: userId });
  revalidatePath("/admin/users");
}

export async function setPassword(formData: FormData) {
  const actor = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const password = String(formData.get("password") ?? "");
  if (!userId || password.length < 8) throw new Error("userId + password min 8 chars");

  const hash = await bcrypt.hash(password, BCRYPT_COST);
  await query("update users set password_hash = $1 where id = $2", [hash, userId]);

  await logAction(actor.id, "admin.user.set_password", { target: userId });
  revalidatePath("/admin/users");
}
