import "server-only";
import { query } from "@/lib/db";

export async function getFlag(key: string): Promise<boolean> {
  const { rows } = await query<{ enabled: boolean }>(
    "select enabled from feature_flags where key = $1",
    [key],
  );
  return rows[0]?.enabled === true;
}
