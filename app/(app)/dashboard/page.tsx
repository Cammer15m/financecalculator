import { requireUser } from "@/lib/auth";

export default async function DashboardPage() {
  const user = await requireUser();

  return (
    <main className="mx-auto max-w-xl">
      <h1 className="mb-2 text-xl font-semibold">Dashboard</h1>
      <p className="text-sm text-gray-700">
        Signed in as <span className="font-mono">{user.email}</span> ({user.role})
      </p>
      <p className="mt-4 text-sm text-gray-500">
        Phase 1 scaffold. Calculators land in Phase 2.
      </p>
    </main>
  );
}
