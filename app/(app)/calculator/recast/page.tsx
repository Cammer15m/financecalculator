import { requireUser } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { num } from "@/lib/url-state";
import { projectRecast } from "@/lib/finance/recast";
import { fmtMoney } from "@/lib/money";
import { NumberInput } from "@/components/NumberInput";
import { AmortizationTable } from "@/components/AmortizationTable";
import { CsvExportButton } from "@/components/CsvExportButton";

type SP = Record<string, string | string[] | undefined>;

export default async function RecastPage({ searchParams }: { searchParams: SP }) {
  const user = await requireUser();
  const hasInput = Object.keys(searchParams).length > 0;

  const principal = num(searchParams.principal, 500000);
  const ratePct = num(searchParams.rate, 4.99);
  const years = num(searchParams.years, 25);
  const lumpSum = num(searchParams.lump, 50000);
  const monthsBefore = num(searchParams.when, 60);

  const result = projectRecast({
    principal,
    annualRate: ratePct / 100,
    amortizationYears: years,
    frequency: "monthly",
    lumpSum,
    monthsBeforeRecast: monthsBefore,
  });

  if (hasInput) {
    await logAction(user.id, "calculator.run", { calculator: "recast", principal, ratePct, years, lumpSum, monthsBefore });
  }

  const scheduleRows = result.recast.schedule.map((r) => ({
    period: r.period,
    payment: fmtMoney(r.payment),
    interest: fmtMoney(r.interest),
    principal: fmtMoney(r.principal),
    balance: fmtMoney(r.balance),
  }));

  return (
    <main className="mx-auto max-w-5xl">
      <h1 className="mb-2 text-2xl font-semibold">Mortgage recast</h1>
      <p className="mb-6 text-sm text-gray-600">
        Apply a lump-sum payment and re-amortize the remaining balance over the remaining term. Payment drops; interest drops; term unchanged.
      </p>

      <form className="mb-8 grid gap-3 sm:grid-cols-5" method="get">
        <NumberInput label="Principal" name="principal" defaultValue={principal} suffix="$"
          help="Original mortgage amount." />
        <NumberInput label="Rate" name="rate" defaultValue={ratePct} suffix="%" step="0.001"
          help="Mortgage interest rate — stays the same through the recast." />
        <NumberInput label="Amortization" name="years" defaultValue={years} suffix="yr"
          help="Original amortization length. The recast keeps the remaining term unchanged." />
        <NumberInput label="Lump sum" name="lump" defaultValue={lumpSum} suffix="$"
          help="Extra payment applied directly to principal at the recast date. Bigger lump sum = bigger monthly-payment drop + bigger interest savings." />
        <NumberInput label="After month" name="when" defaultValue={monthsBefore} suffix="mo" min={1}
          help="How many regular monthly payments before the lump sum hits. Example: 60 = recast after 5 years." />
        <div className="flex flex-wrap items-center gap-3 sm:col-span-5">
          <button
            type="submit"
            className="rounded-md bg-black px-6 py-2.5 text-sm font-semibold text-white hover:bg-gray-800"
          >
            Calculate →
          </button>
          <span className="text-xs text-gray-500">
            Results update in the sections below.
          </span>
        </div>
      </form>

      <section className="mb-6 grid gap-3 sm:grid-cols-4">
        <Stat label="Original payment" value={fmtMoney(result.baseline.paymentAmount)} />
        <Stat label="New payment" value={fmtMoney(result.newPayment)} />
        <Stat label="Baseline total interest" value={fmtMoney(result.baseline.totalInterest)} />
        <Stat label="Interest saved" value={fmtMoney(result.interestSaved)} />
      </section>

      <div className="mb-4 flex justify-end">
        <CsvExportButton filename="recast-schedule.csv" rows={scheduleRows} />
      </div>

      <AmortizationTable
        columns={[
          { key: "period", label: "#", numeric: true },
          { key: "payment", label: "Payment", numeric: true },
          { key: "interest", label: "Interest", numeric: true },
          { key: "principal", label: "Principal", numeric: true },
          { key: "balance", label: "Balance", numeric: true },
        ]}
        rows={scheduleRows}
      />
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-gray-200 p-3">
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}
