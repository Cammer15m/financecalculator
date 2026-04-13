import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { logAction } from "@/lib/audit";

export async function POST(request: Request) {
  const session = await getSession();
  if (session.userId) await logAction(session.userId, "logout");
  session.destroy();
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}
