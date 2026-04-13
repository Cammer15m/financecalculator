import Link from "next/link";

const CALCS = [
  {
    slug: "mortgage",
    title: "Mortgage amortization",
    desc: "Fixed/variable rate, monthly / bi-weekly / weekly / accelerated.",
  },
  {
    slug: "heloc",
    title: "HELOC standalone",
    desc: "Interest-only variable line of credit projection.",
  },
  {
    slug: "combined",
    title: "Mortgage + HELOC (readvanceable)",
    desc: "Combined projection, limit grows with principal paydown.",
  },
  {
    slug: "smith",
    title: "Smith Maneuver",
    desc: "Re-borrow paid principal, invest, track tax-refund loop.",
  },
  {
    slug: "recast",
    title: "Mortgage recast",
    desc: "Lump-sum + re-amortization over remaining term.",
  },
  {
    slug: "rent-vs-buy",
    title: "Rent vs buy",
    desc: "N-year net-worth comparison.",
  },
];

export default function CalculatorsHub() {
  return (
    <main className="mx-auto max-w-4xl">
      <h1 className="mb-6 text-2xl font-semibold">Calculators</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {CALCS.map((c) => (
          <Link
            key={c.slug}
            href={`/calculator/${c.slug}`}
            className="block rounded border border-gray-200 p-4 hover:border-gray-400 hover:bg-gray-50"
          >
            <h2 className="font-medium">{c.title}</h2>
            <p className="mt-1 text-sm text-gray-600">{c.desc}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
