import type { SessionOptions } from "iron-session";

export type SessionData = {
  userId?: string;
};

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_PASSWORD ?? "",
  cookieName: "fc_session",
  cookieOptions: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  },
};

if (process.env.NODE_ENV === "production" && (process.env.SESSION_PASSWORD?.length ?? 0) < 32) {
  throw new Error("SESSION_PASSWORD must be at least 32 characters in production");
}
