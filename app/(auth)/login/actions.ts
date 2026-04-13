"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAction } from "@/lib/audit";

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/dashboard");

  const { rows } = await query<{
    id: string;
    password_hash: string;
    disabled_at: string | null;
  }>(
    "select id, password_hash, disabled_at from users where email = $1",
    [email],
  );
  const user = rows[0];

  const valid = user && (await bcrypt.compare(password, user.password_hash));
  if (!user || !valid) {
    const params = new URLSearchParams({ error: "Invalid email or password", next });
    redirect(`/login?${params.toString()}`);
  }

  if (user.disabled_at !== null) {
    redirect("/login?reason=disabled");
  }

  const session = await getSession();
  session.userId = user.id;
  await session.save();

  await logAction(user.id, "login", { email });
  redirect(next || "/dashboard");
}
