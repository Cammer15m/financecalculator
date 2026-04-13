export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  if (!email || !password) return;
  if (password.length < 8) {
    console.error("[bootstrap] BOOTSTRAP_ADMIN_PASSWORD must be at least 8 chars; skipping");
    return;
  }

  const { query } = await import("@/lib/db");
  const bcrypt = (await import("bcryptjs")).default;

  try {
    const { rows } = await query<{ id: string }>(
      "select id from users where role = 'admin' limit 1",
    );
    if (rows.length > 0) return;

    const hash = await bcrypt.hash(password, 12);
    await query(
      `insert into users (email, password_hash, role)
       values ($1, $2, 'admin')
       on conflict (email) do update
         set password_hash = excluded.password_hash,
             role = 'admin',
             disabled_at = null`,
      [email, hash],
    );
    await query(
      "insert into audit_logs (user_id, action, metadata) values (null, $1, $2)",
      ["bootstrap.admin", JSON.stringify({ email })],
    );
    console.log(`[bootstrap] admin provisioned: ${email}`);
  } catch (err) {
    console.error("[bootstrap] failed to provision admin", err);
  }
}
