import { requireUser } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { num, str } from "@/lib/url-state";
import { projectSmith } from "@/lib/finance/smith";
import { fmtMoney } from "@/lib/money";
import { NumberInput, SelectInput } from "@/components/NumberInput";
import { AmortizationTable } from "@/components/AmortizationTable";
import { BalanceChart } from "@/components/BalanceChart";
import { CsvExportButton } from "@/components/CsvExportButton";

type SP = Record<string, string | string[] | undefined>;

export default async function SmithPage({ searchParams }: { searchParams: SP }) {
  const user = await requireUser();
  const hasInput = Object.keys(searchParams).length > 0;

  const principal = num(searchParams.principal, 500000);
  const mRatePct = num(searchParams.mrate, 4.99);
  const years = num(searchParams.years, 25);
  const hRatePct = num(searchParams.hrate, 7.2);
  const invPct = num(searchParams.inv, 7);
  const taxPct = num(searchParams.tax, 43);
  const refundTarget = str(searchParams.refund, "heloc") as "heloc" | "investments";
  const months = num(searchParams.months, 300);
  const homeValue = num(searchParams.home, principal);
  const apprPct = num(searchParams.appr, 2);

  const result = projectSmith({
    mortgagePrincipal: principal,
    mortgageAnnualRate: mRatePct / 100,
    amortizationYears: years,
    helocAnnualRate: hRatePct / 100,
    investmentAnnualReturn: invPct / 100,
    marginalTaxRate: taxPct / 100,
    taxRefundTarget: refundTarget,
    monthsToProject: months,
    homeValue,
    homeAppreciation: apprPct / 100,
  });

  if (hasInput) {
    await logAction(user.id, "calculator.run", { calculator: "smith", principal, mRatePct, years, hRatePct, invPct, taxPct, refundTarget });
  }

  const scheduleRows = result.schedule.map((r) => ({
    month: r.month,
    mortgage: fmtMoney(r.mortgageBalance),
    heloc: fmtMoney(r.helocBalance),
    investments: fmtMoney(r.investmentBalance),
    reborrow: fmtMoney(r.reborrow),
    taxRefund: fmtMoney(r.taxRefundApplied),
    netWorth: fmtMoney(r.netWorth),
    baseline: fmtMoney(r.baselineNetWorth),
  }));

  const step = Math.max(1, Math.floor(result.schedule.length / 100));
  const chartData = result.schedule
    .filter((_, i) => i % step === 0 || i === result.schedule.length - 1)
    .map((r) => ({
      month: r.month,
      Mortgage: Number(r.mortgageBalance.toFixed(2)),
      HELOC: Number(r.helocBalance.toFixed(2)),
      Investments: Number(r.investmentBalance.toFixed(2)),
      "Net worth (SM)": Number(r.netWorth.toFixed(2)),
      "Net worth (baseline)": Number(r.baselineNetWorth.toFixed(2)),
    }));

  const final = result.schedule[result.schedule.length - 1];

  return (
    <main className="mx-auto max-w-6xl">
      <h1 className="mb-2 text-2xl font-semibold">Smith Maneuver</h1>
      <p className="mb-6 text-sm text-gray-600">
        Re-borrow each month&apos;s mortgage principal on the HELOC, invest it. HELOC interest is tax-deductible; annual refund applied to HELOC or investments per toggle.
      </p>

      <form className="mb-8 grid gap-3 sm:grid-cols-4" method="get">
        <NumberInput label="Mortgage principal" name="principal" defaultValue={principal} suffix="$"
          help="Current mortgage balance at the start of the strategy." />
        <NumberInput label="Mortgage rate" name="mrate" defaultValue={mRatePct} suffix="%" step="0.001"
          help="Annual mortgage rate (Canadian semi-annual compounding)." />
        <NumberInput label="Amortization" name="years" defaultValue={years} suffix="yr"
          help="Years remaining on the mortgage." />
        <NumberInput label="HELOC rate" name="hrate" defaultValue={hRatePct} suffix="%" step="0.01"
          help="HELOC interest rate — usually prime + margin, higher than mortgage." />
        <NumberInput label="Investment return" name="inv" defaultValue={invPct} suffix="%/yr" step="0.1"
          help="Expected annual return on the re-borrowed-and-invested money. 7% is the rough long-term stock-market average; use lower for conservative modelling." />
        <NumberInput label="Marginal tax rate" name="tax" defaultValue={taxPct} suffix="%" step="0.1"
          help="Your top tax bracket. HELOC interest is tax-deductible when the money is invested, so your refund = interest × marginal rate." />
        <SelectInput
          label="Tax refund target"
          name="refund"
          defaultValue={refundTarget}
          options={[
            { value: "heloc", label: "Pay down HELOC" },
            { value: "investments", label: "Reinvest in portfolio" },
          ]}
          help="What to do with the annual tax refund: pay down HELOC (more conservative, reduces debt faster) or reinvest (more aggressive, compounds returns)."
        />
        <NumberInput label="Home value" name="home" defaultValue={homeValue} suffix="$"
          help="Current home value — used for net-worth tracking." />
        <NumberInput label="Home appreciation" name="appr" defaultValue={apprPct} suffix="%/yr" step="0.1" required={false}
          help="Expected annual home price growth." />
        <NumberInput label="Months to project" name="months" defaultValue={months} suffix="mo"
          help="How many months to simulate. 300 = 25 years." />
        <div className="flex flex-wrap items-center gap-3 sm:col-span-4">
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
        <Stat label="Final investments" value={fmtMoney(final?.investmentBalance ?? 0)} />
        <Stat label="Final HELOC" value={fmtMoney(final?.helocBalance ?? 0)} />
        <Stat label="Total tax refunds" value={fmtMoney(result.totalTaxRefunds)} />
        <Stat label="Net worth advantage vs no-SM" value={fmtMoney(result.cumulativeAdvantage)} />
      </section>

      <section className="mb-6">
        <BalanceChart
          data={chartData}
          xKey="month"
          series={[
            { key: "Mortgage", label: "Mortgage" },
            { key: "HELOC", label: "HELOC" },
            { key: "Investments", label: "Investments" },
            { key: "Net worth (SM)", label: "Net worth (SM)" },
            { key: "Net worth (baseline)", label: "Net worth (baseline)" },
          ]}
          height={340}
        />
      </section>

      <div className="mb-4 flex justify-end">
        <CsvExportButton filename="smith-maneuver.csv" rows={scheduleRows} />
      </div>

      <AmortizationTable
        columns={[
          { key: "month", label: "Month", numeric: true },
          { key: "mortgage", label: "Mortgage", numeric: true },
          { key: "heloc", label: "HELOC", numeric: true },
          { key: "investments", label: "Investments", numeric: true },
          { key: "reborrow", label: "Re-borrow", numeric: true },
          { key: "taxRefund", label: "Tax refund", numeric: true },
          { key: "netWorth", label: "Net worth", numeric: true },
          { key: "baseline", label: "Baseline", numeric: true },
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
