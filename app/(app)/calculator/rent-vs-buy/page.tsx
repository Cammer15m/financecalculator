import { requireUser } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { num } from "@/lib/url-state";
import { projectRentVsBuy } from "@/lib/finance/rentvsbuy";
import { fmtMoney } from "@/lib/money";
import { NumberInput } from "@/components/NumberInput";
import { AmortizationTable } from "@/components/AmortizationTable";
import { BalanceChart } from "@/components/BalanceChart";
import { CsvExportButton } from "@/components/CsvExportButton";

type SP = Record<string, string | string[] | undefined>;

export default async function RentVsBuyPage({ searchParams }: { searchParams: SP }) {
  const user = await requireUser();
  const hasInput = Object.keys(searchParams).length > 0;

  const homePrice = num(searchParams.price, 700000);
  const downPayment = num(searchParams.down, 140000);
  const mRatePct = num(searchParams.mrate, 4.99);
  const years = num(searchParams.years, 25);
  const taxPct = num(searchParams.tax, 1);
  const maintPct = num(searchParams.maint, 1);
  const apprPct = num(searchParams.appr, 3);
  const sellPct = num(searchParams.sell, 5);
  const rent = num(searchParams.rent, 2500);
  const rentInflPct = num(searchParams.rentInfl, 3);
  const invPct = num(searchParams.inv, 6);
  const yearsCompare = num(searchParams.compare, 10);

  const result = projectRentVsBuy({
    homePrice,
    downPayment,
    mortgageAnnualRate: mRatePct / 100,
    amortizationYears: years,
    propertyTaxAnnual: taxPct / 100,
    maintenanceAnnual: maintPct / 100,
    homeAppreciation: apprPct / 100,
    sellingCostPct: sellPct / 100,
    monthlyRent: rent,
    rentInflation: rentInflPct / 100,
    investmentReturn: invPct / 100,
    years: yearsCompare,
  });

  if (hasInput) {
    await logAction(user.id, "calculator.run", { calculator: "rent-vs-buy", homePrice, downPayment, mRatePct, years, rent, yearsCompare });
  }

  const scheduleRows = result.schedule.map((r) => ({
    year: r.year,
    homeValue: fmtMoney(r.buyHomeValue),
    mortgageBalance: fmtMoney(r.buyMortgageBalance),
    buyNetWorth: fmtMoney(r.buyNetWorth),
    rentPortfolio: fmtMoney(r.rentPortfolio),
    rentNetWorth: fmtMoney(r.rentNetWorth),
    advantage: fmtMoney(r.advantageBuy),
  }));

  const chartData = result.schedule.map((r) => ({
    year: r.year,
    "Buy net worth": Number(r.buyNetWorth.toFixed(2)),
    "Rent net worth": Number(r.rentNetWorth.toFixed(2)),
    "Advantage (buy − rent)": Number(r.advantageBuy.toFixed(2)),
  }));

  return (
    <main className="mx-auto max-w-6xl">
      <h1 className="mb-2 text-2xl font-semibold">Rent vs buy</h1>
      <p className="mb-6 text-sm text-gray-600">
        Compares net worth N years from now under two scenarios: buying (mortgage + taxes + upkeep + home appreciation) versus renting and investing the would-be down payment plus any monthly savings.
      </p>

      <form className="mb-8 grid gap-3 sm:grid-cols-4" method="get">
        <NumberInput label="Home price" name="price" defaultValue={homePrice} suffix="$"
          help="Purchase price of the home." />
        <NumberInput label="Down payment" name="down" defaultValue={downPayment} suffix="$"
          help="Cash down — also used as the starting investment balance in the rent scenario." />
        <NumberInput label="Mortgage rate" name="mrate" defaultValue={mRatePct} suffix="%" step="0.001"
          help="Annual mortgage rate." />
        <NumberInput label="Amortization" name="years" defaultValue={years} suffix="yr"
          help="Years to pay off the mortgage." />
        <NumberInput label="Property tax" name="tax" defaultValue={taxPct} suffix="%/yr" step="0.01"
          help="Annual property tax as a % of home value. Canadian cities typically 0.6–1.5%." />
        <NumberInput label="Maintenance" name="maint" defaultValue={maintPct} suffix="%/yr" step="0.01"
          help="Upkeep, insurance, repairs — rule of thumb is ~1% of home value per year." />
        <NumberInput label="Home appreciation" name="appr" defaultValue={apprPct} suffix="%/yr" step="0.1"
          help="Expected annual home price growth." />
        <NumberInput label="Selling costs" name="sell" defaultValue={sellPct} suffix="%" step="0.1"
          help="Realtor + legal + transfer fees when you sell. Canada typically ~5%." />
        <NumberInput label="Monthly rent" name="rent" defaultValue={rent} suffix="$"
          help="Current monthly rent for a comparable home." />
        <NumberInput label="Rent inflation" name="rentInfl" defaultValue={rentInflPct} suffix="%/yr" step="0.1"
          help="Expected annual rent increase." />
        <NumberInput label="Investment return" name="inv" defaultValue={invPct} suffix="%/yr" step="0.1"
          help="Annual return on the down payment + monthly surplus invested under the rent scenario." />
        <NumberInput label="Years to compare" name="compare" defaultValue={yearsCompare} suffix="yr" min={1} max={50}
          help="How far forward to run the comparison." />
        <div className="sm:col-span-4">
          <button className="rounded bg-black px-4 py-2 text-sm text-white" type="submit">
            Calculate
          </button>
        </div>
      </form>

      <section className="mb-6 grid gap-3 sm:grid-cols-3">
        <Stat label={`Buy net worth (yr ${yearsCompare})`} value={fmtMoney(result.schedule[result.schedule.length - 1]?.buyNetWorth ?? 0)} />
        <Stat label={`Rent net worth (yr ${yearsCompare})`} value={fmtMoney(result.schedule[result.schedule.length - 1]?.rentNetWorth ?? 0)} />
        <Stat label="Advantage (buy − rent)" value={fmtMoney(result.finalAdvantageBuy)} />
      </section>

      <section className="mb-6">
        <BalanceChart
          data={chartData}
          xKey="year"
          series={[
            { key: "Buy net worth", label: "Buy net worth" },
            { key: "Rent net worth", label: "Rent net worth" },
            { key: "Advantage (buy − rent)", label: "Advantage" },
          ]}
          height={320}
        />
      </section>

      <div className="mb-4 flex justify-end">
        <CsvExportButton filename="rent-vs-buy.csv" rows={scheduleRows} />
      </div>

      <AmortizationTable
        columns={[
          { key: "year", label: "Year", numeric: true },
          { key: "homeValue", label: "Home value", numeric: true },
          { key: "mortgageBalance", label: "Mortgage", numeric: true },
          { key: "buyNetWorth", label: "Buy net worth", numeric: true },
          { key: "rentPortfolio", label: "Rent portfolio", numeric: true },
          { key: "rentNetWorth", label: "Rent net worth", numeric: true },
          { key: "advantage", label: "Advantage", numeric: true },
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
