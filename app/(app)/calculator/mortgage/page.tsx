import { requireUser } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { num, str } from "@/lib/url-state";
import { computeAmortization, type Frequency } from "@/lib/finance/amortization";
import { fmtMoney, fmtPct } from "@/lib/money";
import { NumberInput, SelectInput } from "@/components/NumberInput";
import { AmortizationTable } from "@/components/AmortizationTable";
import { BalanceChart } from "@/components/BalanceChart";
import { CsvExportButton } from "@/components/CsvExportButton";

type SP = Record<string, string | string[] | undefined>;

const FREQ_OPTIONS: { value: Frequency; label: string }[] = [
  { value: "monthly", label: "Monthly" },
  { value: "bi-weekly", label: "Bi-weekly" },
  { value: "weekly", label: "Weekly" },
  { value: "accelerated-bi-weekly", label: "Accelerated bi-weekly" },
  { value: "accelerated-weekly", label: "Accelerated weekly" },
];

export default async function MortgagePage({ searchParams }: { searchParams: SP }) {
  const user = await requireUser();
  const hasInput = Object.keys(searchParams).length > 0;

  const principal = num(searchParams.principal, 500000);
  const ratePct = num(searchParams.rate, 4.99);
  const years = num(searchParams.years, 25);
  const frequency = str(searchParams.frequency, "monthly") as Frequency;

  const result = computeAmortization({
    principal,
    annualRate: ratePct / 100,
    amortizationYears: years,
    frequency,
  });

  if (hasInput) {
    await logAction(user.id, "calculator.run", {
      calculator: "mortgage",
      principal,
      ratePct,
      years,
      frequency,
    });
  }

  const scheduleRows = result.schedule.map((r) => ({
    period: r.period,
    payment: fmtMoney(r.payment),
    interest: fmtMoney(r.interest),
    principal: fmtMoney(r.principal),
    balance: fmtMoney(r.balance),
  }));

  // Sample every ~N periods for the chart so it stays readable.
  const step = Math.max(1, Math.floor(result.schedule.length / 100));
  const chartData = result.schedule
    .filter((_, i) => i % step === 0 || i === result.schedule.length - 1)
    .map((r) => ({
      period: r.period,
      Balance: Number(r.balance.toFixed(2)),
      Interest: Number(r.interest.toFixed(2)),
      Principal: Number(r.principal.toFixed(2)),
    }));

  return (
    <main className="mx-auto max-w-5xl">
      <h1 className="mb-6 text-2xl font-semibold">Mortgage amortization</h1>

      <form className="mb-8 grid gap-3 sm:grid-cols-4" method="get">
        <NumberInput label="Principal" name="principal" defaultValue={principal} suffix="$" min={0} />
        <NumberInput label="Annual rate" name="rate" defaultValue={ratePct} suffix="%" step="0.001" min={0} />
        <NumberInput label="Amortization" name="years" defaultValue={years} suffix="yr" min={1} max={40} />
        <SelectInput label="Frequency" name="frequency" defaultValue={frequency} options={FREQ_OPTIONS} />
        <div className="sm:col-span-4">
          <button className="rounded bg-black px-4 py-2 text-sm text-white" type="submit">
            Calculate
          </button>
        </div>
      </form>

      <section className="mb-6 grid gap-3 sm:grid-cols-4">
        <Stat label="Payment" value={fmtMoney(result.paymentAmount)} sub={frequency} />
        <Stat label="Total interest" value={fmtMoney(result.totalInterest)} />
        <Stat label="Total paid" value={fmtMoney(result.totalPaid)} />
        <Stat label="Effective rate" value={fmtPct(ratePct / 100, 3)} sub="annual, Canadian compounding" />
      </section>

      <section className="mb-6">
        <BalanceChart
          data={chartData}
          xKey="period"
          series={[
            { key: "Balance", label: "Balance" },
            { key: "Interest", label: "Interest/period" },
            { key: "Principal", label: "Principal/period" },
          ]}
        />
      </section>

      <div className="mb-4 flex justify-end">
        <CsvExportButton filename="mortgage-amortization.csv" rows={scheduleRows} />
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

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded border border-gray-200 p-3">
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
      {sub && <div className="text-xs text-gray-500">{sub}</div>}
    </div>
  );
}
