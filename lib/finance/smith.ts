import Decimal from "decimal.js";
import { D, ZERO, annuityPayment, periodicRate } from "@/lib/money";

// Smith Maneuver: on every mortgage payment, re-borrow the principal portion
// from the readvanceable HELOC and invest it. HELOC interest is tax
// deductible (investment loan). Annual tax refund is applied either to HELOC
// paydown or to the investment portfolio, depending on user toggle.

export type SmithInput = {
  mortgagePrincipal: Decimal.Value;
  mortgageAnnualRate: Decimal.Value;
  amortizationYears: number;
  helocAnnualRate: Decimal.Value;
  investmentAnnualReturn: Decimal.Value; // e.g. 0.07 for 7 %
  marginalTaxRate: Decimal.Value; // e.g. 0.43 for 43 %
  taxRefundTarget: "heloc" | "investments";
  monthsToProject: number;
  homeValue?: Decimal.Value;
  homeAppreciation?: Decimal.Value;
};

export type SmithRow = {
  month: number;
  mortgageBalance: Decimal;
  helocBalance: Decimal;
  investmentBalance: Decimal;
  mortgageInterest: Decimal;
  helocInterest: Decimal;
  investmentGain: Decimal;
  reborrow: Decimal;
  taxRefundApplied: Decimal;
  netWorth: Decimal;
  baselineNetWorth: Decimal; // same mortgage, no Smith — home - mortgage
};

export type SmithResult = {
  schedule: SmithRow[];
  totalTaxRefunds: Decimal;
  cumulativeAdvantage: Decimal; // final netWorth - baseline
};

export function projectSmith(input: SmithInput): SmithResult {
  const mortgageR = periodicRate(input.mortgageAnnualRate, 12, "canadian");
  const helocR = periodicRate(input.helocAnnualRate, 12, "simple");
  const invR = D(1).plus(input.investmentAnnualReturn).pow(D(1).div(12)).minus(1);
  const apprMonthly = input.homeAppreciation
    ? D(1).plus(input.homeAppreciation).pow(D(1).div(12)).minus(1)
    : ZERO;

  const mortgagePayment = annuityPayment(
    input.mortgagePrincipal,
    mortgageR,
    input.amortizationYears * 12,
  );

  let mortgageBalance = D(input.mortgagePrincipal);
  let helocBalance = ZERO;
  let investmentBalance = ZERO;
  let homeValue = D(input.homeValue ?? input.mortgagePrincipal);

  let baselineMortgage = D(input.mortgagePrincipal);
  let baselineHome = D(input.homeValue ?? input.mortgagePrincipal);

  let helocInterestYearToDate = ZERO;
  let totalTaxRefunds = ZERO;
  const rows: SmithRow[] = [];

  for (let m = 1; m <= input.monthsToProject; m += 1) {
    // SM side.
    const mInterest = mortgageBalance.mul(mortgageR).toDP(2);
    let mPrincipal = mortgagePayment.minus(mInterest);
    if (mortgageBalance.plus(mInterest).lte(mortgagePayment)) {
      mPrincipal = mortgageBalance;
      mortgageBalance = ZERO;
    } else {
      mortgageBalance = mortgageBalance.minus(mPrincipal);
    }

    // Re-borrow principal on HELOC, invest it.
    const reborrow = mPrincipal;
    helocBalance = helocBalance.plus(reborrow);
    investmentBalance = investmentBalance.plus(reborrow);

    // HELOC interest — capitalize for simplicity.
    const hInterest = helocBalance.mul(helocR).toDP(2);
    helocBalance = helocBalance.plus(hInterest);
    helocInterestYearToDate = helocInterestYearToDate.plus(hInterest);

    // Investment growth.
    const invGain = investmentBalance.mul(invR).toDP(2);
    investmentBalance = investmentBalance.plus(invGain);

    // Tax refund applied at month 12, 24, 36, …
    let refundApplied = ZERO;
    if (m % 12 === 0) {
      const refund = helocInterestYearToDate.mul(input.marginalTaxRate).toDP(2);
      refundApplied = refund;
      totalTaxRefunds = totalTaxRefunds.plus(refund);
      if (input.taxRefundTarget === "heloc") {
        helocBalance = Decimal.max(helocBalance.minus(refund), ZERO);
      } else {
        investmentBalance = investmentBalance.plus(refund);
      }
      helocInterestYearToDate = ZERO;
    }

    homeValue = homeValue.mul(D(1).plus(apprMonthly)).toDP(2);

    // Baseline: identical mortgage payment schedule, no SM.
    const bInterest = baselineMortgage.mul(mortgageR).toDP(2);
    let bPrincipal = mortgagePayment.minus(bInterest);
    if (baselineMortgage.plus(bInterest).lte(mortgagePayment)) {
      bPrincipal = baselineMortgage;
      baselineMortgage = ZERO;
    } else {
      baselineMortgage = baselineMortgage.minus(bPrincipal);
    }
    baselineHome = baselineHome.mul(D(1).plus(apprMonthly)).toDP(2);

    const netWorth = homeValue
      .plus(investmentBalance)
      .minus(mortgageBalance)
      .minus(helocBalance);
    const baselineNetWorth = baselineHome.minus(baselineMortgage);

    rows.push({
      month: m,
      mortgageBalance,
      helocBalance,
      investmentBalance,
      mortgageInterest: mInterest,
      helocInterest: hInterest,
      investmentGain: invGain,
      reborrow,
      taxRefundApplied: refundApplied,
      netWorth,
      baselineNetWorth,
    });

    if (mortgageBalance.isZero()) break;
  }

  const final = rows[rows.length - 1];
  const cumulativeAdvantage = final
    ? final.netWorth.minus(final.baselineNetWorth)
    : ZERO;

  return { schedule: rows, totalTaxRefunds, cumulativeAdvantage };
}
