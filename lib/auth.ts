import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getIronSession } from "iron-session";
import { query } from "@/lib/db";
import { sessionOptions, type SessionData } from "@/lib/session";

export type User = {
  id: string;
  email: string;
  role: "user" | "admin";
  display_name: string | null;
  disabled_at: string | null;
};

export async function getSession() {
  return getIronSession<SessionData>(cookies(), sessionOptions);
}

export async function getCurrentUser(): Promise<User | null> {
  const session = await getSession();
  if (!session.userId) return null;
  const { rows } = await query<User>(
    "select id, email, role, display_name, disabled_at from users where id = $1",
    [session.userId],
  );
  return rows[0] ?? null;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.disabled_at !== null) {
    const session = await getSession();
    session.destroy();
    redirect("/login?reason=disabled");
  }
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") {
    throw new Response("Forbidden", { status: 403 });
  }
  return user;
}
