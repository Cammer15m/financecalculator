import { requireUser } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { num } from "@/lib/url-state";
import { projectHeloc } from "@/lib/finance/heloc";
import { fmtMoney } from "@/lib/money";
import { NumberInput } from "@/components/NumberInput";
import { AmortizationTable } from "@/components/AmortizationTable";
import { BalanceChart } from "@/components/BalanceChart";
import { CsvExportButton } from "@/components/CsvExportButton";

type SP = Record<string, string | string[] | undefined>;

export default async function HelocPage({ searchParams }: { searchParams: SP }) {
  const user = await requireUser();
  const hasInput = Object.keys(searchParams).length > 0;

  const limit = num(searchParams.limit, 150000);
  const startingBalance = num(searchParams.balance, 50000);
  const ratePct = num(searchParams.rate, 7.2);
  const monthlyPayment = num(searchParams.payment, 0);
  const months = num(searchParams.months, 240);

  const result = projectHeloc({
    limit,
    startingBalance,
    annualRate: ratePct / 100,
    monthsToProject: months,
    monthlyPayment: monthlyPayment > 0 ? monthlyPayment : undefined,
  });

  if (hasInput) {
    await logAction(user.id, "calculator.run", {
      calculator: "heloc",
      limit,
      startingBalance,
      ratePct,
      monthlyPayment,
      months,
    });
  }

  const scheduleRows = result.schedule.map((r) => ({
    month: r.month,
    payment: fmtMoney(r.payment),
    interest: fmtMoney(r.interest),
    principal: fmtMoney(r.principal),
    balance: fmtMoney(r.balance),
  }));

  const step = Math.max(1, Math.floor(result.schedule.length / 80));
  const chartData = result.schedule
    .filter((_, i) => i % step === 0 || i === result.schedule.length - 1)
    .map((r) => ({ month: r.month, Balance: Number(r.balance.toFixed(2)), Interest: Number(r.interest.toFixed(2)) }));

  return (
    <main className="mx-auto max-w-5xl">
      <h1 className="mb-6 text-2xl font-semibold">HELOC standalone</h1>

      <form className="mb-8 grid gap-3 sm:grid-cols-5" method="get">
        <NumberInput label="Limit" name="limit" defaultValue={limit} suffix="$" min={0} />
        <NumberInput label="Starting balance" name="balance" defaultValue={startingBalance} suffix="$" min={0} />
        <NumberInput label="Annual rate" name="rate" defaultValue={ratePct} suffix="%" step="0.01" min={0} />
        <NumberInput label="Monthly payment (0 = interest-only)" name="payment" defaultValue={monthlyPayment} suffix="$" min={0} />
        <NumberInput label="Months to project" name="months" defaultValue={months} suffix="mo" min={1} max={600} />
        <div className="sm:col-span-5">
          <button className="rounded bg-black px-4 py-2 text-sm text-white" type="submit">
            Calculate
          </button>
        </div>
      </form>

      <section className="mb-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Total interest" value={fmtMoney(result.totalInterest)} />
        <Stat label="Final balance" value={fmtMoney(result.finalBalance)} />
        <Stat label="Limit utilization" value={`${((Number(result.finalBalance) / limit) * 100).toFixed(1)}%`} />
      </section>

      <section className="mb-6">
        <BalanceChart
          data={chartData}
          xKey="month"
          series={[
            { key: "Balance", label: "Balance" },
            { key: "Interest", label: "Interest/mo" },
          ]}
        />
      </section>

      <div className="mb-4 flex justify-end">
        <CsvExportButton filename="heloc.csv" rows={scheduleRows} />
      </div>

      <AmortizationTable
        columns={[
          { key: "month", label: "Month", numeric: true },
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
