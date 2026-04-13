import { query } from "@/lib/db";
import { toggleFlag } from "./actions";

type Row = {
  id: string;
  key: string;
  enabled: boolean;
  description: string | null;
  updated_at: string;
};

export default async function FlagsPage() {
  const { rows: flags } = await query<Row>(
    "select id, key, enabled, description, updated_at from feature_flags order by key",
  );

  return (
    <main className="mx-auto max-w-3xl">
      <h1 className="mb-4 text-xl font-semibold">Feature flags</h1>

      {flags.length === 0 ? (
        <p className="text-sm text-gray-500">
          No flags defined. Insert rows into <code>feature_flags</code> to manage toggles.
        </p>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-300 text-left">
              <th className="py-2">Key</th>
              <th>Description</th>
              <th>Enabled</th>
              <th>Updated</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {flags.map((f) => (
              <tr key={f.id} className="border-b border-gray-100">
                <td className="py-2 font-mono">{f.key}</td>
                <td className="text-gray-600">{f.description}</td>
                <td>{f.enabled ? "✓" : "—"}</td>
                <td className="text-gray-500">
                  {new Date(f.updated_at).toISOString().slice(0, 10)}
                </td>
                <td>
                  <form action={toggleFlag}>
                    <input type="hidden" name="id" value={f.id} />
                    <input type="hidden" name="enabled" value={String(!f.enabled)} />
                    <button className="hover:underline">
                      {f.enabled ? "Disable" : "Enable"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
