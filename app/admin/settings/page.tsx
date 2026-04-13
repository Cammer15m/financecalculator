import { query } from "@/lib/db";
import { upsertSetting } from "./actions";

type Row = {
  id: string;
  key: string;
  value: string | null;
  description: string | null;
  updated_at: string;
};

export default async function SettingsPage() {
  const { rows: settings } = await query<Row>(
    "select id, key, value, description, updated_at from app_settings order by key",
  );

  return (
    <main className="mx-auto max-w-3xl">
      <h1 className="mb-4 text-xl font-semibold">App settings</h1>

      <section className="mb-8 rounded border border-gray-200 p-4">
        <h2 className="mb-2 text-sm font-semibold">New / update setting</h2>
        <form action={upsertSetting} className="flex flex-wrap items-end gap-2 text-sm">
          <label className="flex flex-col gap-1">
            Key
            <input
              name="key"
              required
              className="rounded border border-gray-300 px-2 py-1 font-mono"
            />
          </label>
          <label className="flex flex-col gap-1">
            Value
            <input name="value" className="rounded border border-gray-300 px-2 py-1" />
          </label>
          <label className="flex flex-col gap-1">
            Description
            <input
              name="description"
              className="rounded border border-gray-300 px-2 py-1"
            />
          </label>
          <button className="rounded bg-black px-3 py-1 text-white">Save</button>
        </form>
      </section>

      {settings.length === 0 ? (
        <p className="text-sm text-gray-500">No settings yet.</p>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-300 text-left">
              <th className="py-2">Key</th>
              <th>Value</th>
              <th>Description</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {settings.map((s) => (
              <tr key={s.id} className="border-b border-gray-100">
                <td className="py-2 font-mono">{s.key}</td>
                <td className="font-mono">{s.value}</td>
                <td className="text-gray-600">{s.description}</td>
                <td className="text-gray-500">
                  {new Date(s.updated_at).toISOString().slice(0, 10)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
