import { requireUser } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { num } from "@/lib/url-state";
import { projectCombined } from "@/lib/finance/combined";
import { fmtMoney } from "@/lib/money";
import { NumberInput } from "@/components/NumberInput";
import { AmortizationTable } from "@/components/AmortizationTable";
import { BalanceChart } from "@/components/BalanceChart";
import { CsvExportButton } from "@/components/CsvExportButton";

type SP = Record<string, string | string[] | undefined>;

export default async function CombinedPage({ searchParams }: { searchParams: SP }) {
  const user = await requireUser();
  const hasInput = Object.keys(searchParams).length > 0;

  const principal = num(searchParams.principal, 500000);
  const mRatePct = num(searchParams.mrate, 4.99);
  const years = num(searchParams.years, 25);
  const hRatePct = num(searchParams.hrate, 7.2);
  const helocStart = num(searchParams.helocStart, 0);
  const helocDraw = num(searchParams.helocDraw, 500);
  const months = num(searchParams.months, 300);
  const homeValue = num(searchParams.home, principal);
  const apprPct = num(searchParams.appr, 2);

  const result = projectCombined({
    mortgagePrincipal: principal,
    mortgageAnnualRate: mRatePct / 100,
    amortizationYears: years,
    helocAnnualRate: hRatePct / 100,
    helocStartingBalance: helocStart,
    helocMonthlyDraw: helocDraw > 0 ? helocDraw : undefined,
    monthsToProject: months,
    homeValue,
    homeAppreciation: apprPct / 100,
  });

  if (hasInput) {
    await logAction(user.id, "calculator.run", { calculator: "combined", principal, mRatePct, years, hRatePct, helocDraw, months });
  }

  const scheduleRows = result.schedule.map((r) => ({
    month: r.month,
    mortgage: fmtMoney(r.mortgageBalance),
    helocLimit: fmtMoney(r.helocLimit),
    heloc: fmtMoney(r.helocBalance),
    home: fmtMoney(r.homeValue),
    netWorth: fmtMoney(r.netWorth),
  }));

  const step = Math.max(1, Math.floor(result.schedule.length / 100));
  const chartData = result.schedule
    .filter((_, i) => i % step === 0 || i === result.schedule.length - 1)
    .map((r) => ({
      month: r.month,
      Mortgage: Number(r.mortgageBalance.toFixed(2)),
      HELOC: Number(r.helocBalance.toFixed(2)),
      Home: Number(r.homeValue.toFixed(2)),
      NetWorth: Number(r.netWorth.toFixed(2)),
    }));

  const final = result.schedule[result.schedule.length - 1];

  return (
    <main className="mx-auto max-w-6xl">
      <h1 className="mb-2 text-2xl font-semibold">Mortgage + HELOC (readvanceable)</h1>
      <p className="mb-6 text-sm text-gray-600">
        A readvanceable mortgage ties a mortgage and a HELOC to the same property. As you pay down the mortgage principal, the HELOC limit grows by the same amount — re-borrowable instantly. This projects both balances plus net worth over time.
      </p>

      <form className="mb-8 grid gap-3 sm:grid-cols-4" method="get">
        <NumberInput label="Mortgage principal" name="principal" defaultValue={principal} suffix="$"
          help="The mortgage loan amount (after down payment)." />
        <NumberInput label="Mortgage rate" name="mrate" defaultValue={mRatePct} suffix="%" step="0.001"
          help="Annual mortgage interest rate." />
        <NumberInput label="Amortization" name="years" defaultValue={years} suffix="yr"
          help="Years to pay off the mortgage in full." />
        <NumberInput label="Home value" name="home" defaultValue={homeValue} suffix="$"
          help="Current market value of the home — used for net-worth tracking. Defaults to mortgage principal if you haven't entered one." />
        <NumberInput label="HELOC rate" name="hrate" defaultValue={hRatePct} suffix="%" step="0.01"
          help="HELOC interest rate (usually higher than the mortgage rate — prime + margin)." />
        <NumberInput label="HELOC starting balance" name="helocStart" defaultValue={helocStart} suffix="$" required={false}
          help="Current balance on the HELOC. 0 if unused." />
        <NumberInput label="HELOC monthly draw" name="helocDraw" defaultValue={helocDraw} suffix="$" required={false}
          help="Amount drawn from the HELOC each month (e.g. 500 = you spend $500/mo from the line). 0 = no new draws." />
        <NumberInput label="Home appreciation" name="appr" defaultValue={apprPct} suffix="%/yr" step="0.1" required={false}
          help="Expected annual home price growth. Canadian long-term average is ~3%, varies by city." />
        <NumberInput label="Months to project" name="months" defaultValue={months} suffix="mo"
          help="How many months to simulate. 300 = 25 years." />
        <div className="sm:col-span-4">
          <button className="rounded bg-black px-4 py-2 text-sm text-white" type="submit">
            Calculate
          </button>
        </div>
      </form>

      <section className="mb-6 grid gap-3 sm:grid-cols-4">
        <Stat label="Total mortgage interest" value={fmtMoney(result.totalMortgageInterest)} />
        <Stat label="Total HELOC interest" value={fmtMoney(result.totalHelocInterest)} />
        <Stat label="Final HELOC balance" value={fmtMoney(final?.helocBalance ?? 0)} />
        <Stat label="Final net worth" value={fmtMoney(final?.netWorth ?? 0)} />
      </section>

      <section className="mb-6">
        <BalanceChart
          data={chartData}
          xKey="month"
          series={[
            { key: "Mortgage", label: "Mortgage" },
            { key: "HELOC", label: "HELOC" },
            { key: "Home", label: "Home value" },
            { key: "NetWorth", label: "Net worth" },
          ]}
        />
      </section>

      <div className="mb-4 flex justify-end">
        <CsvExportButton filename="mortgage-heloc-combined.csv" rows={scheduleRows} />
      </div>

      <AmortizationTable
        columns={[
          { key: "month", label: "Month", numeric: true },
          { key: "mortgage", label: "Mortgage", numeric: true },
          { key: "helocLimit", label: "HELOC limit", numeric: true },
          { key: "heloc", label: "HELOC balance", numeric: true },
          { key: "home", label: "Home value", numeric: true },
          { key: "netWorth", label: "Net worth", numeric: true },
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
