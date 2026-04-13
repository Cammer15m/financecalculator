import Link from "next/link";
import { requireUser } from "@/lib/auth";

const CALCS = [
  { slug: "mortgage", title: "Mortgage amortization" },
  { slug: "heloc", title: "HELOC" },
  { slug: "combined", title: "Mortgage + HELOC" },
  { slug: "smith", title: "Smith Maneuver" },
  { slug: "recast", title: "Recast" },
  { slug: "rent-vs-buy", title: "Rent vs buy" },
];

export default async function DashboardPage() {
  const user = await requireUser();

  return (
    <main className="mx-auto max-w-4xl">
      <h1 className="mb-1 text-2xl font-semibold">Dashboard</h1>
      <p className="mb-6 text-sm text-gray-600">
        Signed in as <span className="font-mono">{user.email}</span> ({user.role})
      </p>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
        Calculators
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {CALCS.map((c) => (
          <Link
            key={c.slug}
            href={`/calculator/${c.slug}`}
            className="rounded border border-gray-200 p-4 hover:border-gray-400 hover:bg-gray-50"
          >
            <div className="font-medium">{c.title}</div>
          </Link>
        ))}
      </div>
    </main>
  );
}
