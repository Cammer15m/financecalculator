import { query } from "@/lib/db";
import {
  createUser,
  disableUser,
  enableUser,
  setPassword,
} from "./actions";

type Row = {
  id: string;
  email: string;
  role: "user" | "admin";
  display_name: string | null;
  disabled_at: string | null;
  created_at: string;
};

export default async function UsersPage() {
  const { rows: users } = await query<Row>(
    "select id, email, role, display_name, disabled_at, created_at from users order by created_at desc",
  );

  return (
    <main className="mx-auto max-w-4xl">
      <h1 className="mb-4 text-xl font-semibold">Users</h1>

      <section className="mb-8 rounded border border-gray-200 p-4">
        <h2 className="mb-2 text-sm font-semibold">Create user</h2>
        <form action={createUser} className="flex flex-wrap items-end gap-2 text-sm">
          <label className="flex flex-col gap-1">
            Email
            <input
              type="email"
              name="email"
              required
              className="rounded border border-gray-300 px-2 py-1"
            />
          </label>
          <label className="flex flex-col gap-1">
            Temp password
            <input
              type="text"
              name="password"
              required
              minLength={8}
              className="rounded border border-gray-300 px-2 py-1"
            />
          </label>
          <label className="flex flex-col gap-1">
            Role
            <select name="role" className="rounded border border-gray-300 px-2 py-1">
              <option value="user">user</option>
              <option value="admin">admin</option>
            </select>
          </label>
          <button type="submit" className="rounded bg-black px-3 py-1 text-white">
            Create
          </button>
        </form>
      </section>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-gray-300 text-left">
            <th className="py-2">Email</th>
            <th>Role</th>
            <th>Status</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b border-gray-100">
              <td className="py-2 font-mono">{u.email}</td>
              <td>{u.role}</td>
              <td>{u.disabled_at ? "disabled" : "active"}</td>
              <td className="text-gray-500">
                {new Date(u.created_at).toISOString().slice(0, 10)}
              </td>
              <td className="flex flex-wrap gap-2 py-2">
                {u.disabled_at ? (
                  <form action={enableUser}>
                    <input type="hidden" name="userId" value={u.id} />
                    <button className="text-green-700 hover:underline">Enable</button>
                  </form>
                ) : (
                  <form action={disableUser}>
                    <input type="hidden" name="userId" value={u.id} />
                    <button className="text-red-700 hover:underline">Disable</button>
                  </form>
                )}
                <form action={setPassword} className="flex items-center gap-1">
                  <input type="hidden" name="userId" value={u.id} />
                  <input
                    type="text"
                    name="password"
                    placeholder="new password"
                    minLength={8}
                    required
                    className="rounded border border-gray-300 px-2 py-0.5 text-xs"
                  />
                  <button className="text-blue-700 hover:underline">Set</button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
