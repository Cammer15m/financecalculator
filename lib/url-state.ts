// Thin helpers for reading numeric / string query params with defaults.
// Calculator pages are server components that render from searchParams; the
// URL IS the state, so links are shareable by default.

export function str(v: string | string[] | undefined, d: string): string {
  if (Array.isArray(v)) return v[0] ?? d;
  return v ?? d;
}

export function num(v: string | string[] | undefined, d: number): number {
  const s = str(v, "");
  if (!s) return d;
  const n = Number(s);
  return Number.isFinite(n) ? n : d;
}

export function bool(v: string | string[] | undefined, d: boolean): boolean {
  const s = str(v, "");
  if (!s) return d;
  return s === "1" || s === "true" || s === "on";
}
