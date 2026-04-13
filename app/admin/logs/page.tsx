import { query } from "@/lib/db";

const PAGE_SIZE = 50;

type Props = {
  searchParams: { page?: string; action?: string; user?: string };
};

type Row = {
  id: string;
  user_id: string | null;
  action: string;
  metadata: Record<string, unknown> | null;
  ip: string | null;
  created_at: string;
};

export default async function LogsPage({ searchParams }: Props) {
  const page = Math.max(1, Number(searchParams.page ?? "1") || 1);
  const actionFilter = (searchParams.action ?? "").trim();
  const userFilter = (searchParams.user ?? "").trim();

  const where: string[] = [];
  const params: unknown[] = [];
  if (actionFilter) {
    params.push(`%${actionFilter}%`);
    where.push(`action ilike $${params.length}`);
  }
  if (userFilter) {
    params.push(userFilter);
    where.push(`user_id = $${params.length}`);
  }
  const whereSql = where.length ? `where ${where.join(" and ")}` : "";

  const offset = (page - 1) * PAGE_SIZE;
  params.push(PAGE_SIZE, offset);
  const limitIdx = params.length - 1;
  const offsetIdx = params.length;

  const rowsRes = await query<Row>(
    `select id, user_id, action, metadata, ip, created_at
       from audit_logs ${whereSql}
       order by created_at desc
       limit $${limitIdx} offset $${offsetIdx}`,
    params,
  );

  const countRes = await query<{ count: string }>(
    `select count(*)::text as count from audit_logs ${whereSql}`,
    params.slice(0, params.length - 2),
  );
  const total = Number(countRes.rows[0]?.count ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const qs = (p: number) => {
    const u = new URLSearchParams();
    u.set("page", String(p));
    if (actionFilter) u.set("action", actionFilter);
    if (userFilter) u.set("user", userFilter);
    return u.toString();
  };

  return (
    <main className="mx-auto max-w-5xl">
      <h1 className="mb-4 text-xl font-semibold">Audit logs</h1>

      <form className="mb-4 flex gap-2 text-sm">
        <input
          name="action"
          defaultValue={actionFilter}
          placeholder="action contains…"
          className="rounded border border-gray-300 px-2 py-1"
        />
        <input
          name="user"
          defaultValue={userFilter}
          placeholder="user id"
          className="rounded border border-gray-300 px-2 py-1"
        />
        <button className="rounded border border-gray-300 px-3 py-1">Filter</button>
      </form>

      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="border-b border-gray-300 text-left">
            <th className="py-2">When</th>
            <th>User</th>
            <th>Action</th>
            <th>Metadata</th>
            <th>IP</th>
          </tr>
        </thead>
        <tbody>
          {rowsRes.rows.map((r) => (
            <tr key={r.id} className="border-b border-gray-100 align-top">
              <td className="py-2 font-mono">
                {new Date(r.created_at).toISOString().replace("T", " ").slice(0, 19)}
              </td>
              <td className="font-mono">{r.user_id ?? "—"}</td>
              <td>{r.action}</td>
              <td className="font-mono text-gray-600">
                {r.metadata ? JSON.stringify(r.metadata) : ""}
              </td>
              <td className="font-mono">{r.ip ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 flex gap-2 text-sm">
        {page > 1 && (
          <a href={`?${qs(page - 1)}`} className="hover:underline">
            ← Prev
          </a>
        )}
        <span className="text-gray-500">
          Page {page} of {totalPages} ({total} rows)
        </span>
        {page < totalPages && (
          <a href={`?${qs(page + 1)}`} className="hover:underline">
            Next →
          </a>
        )}
      </div>
    </main>
  );
}
