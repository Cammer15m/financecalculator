import Decimal from "decimal.js";
import { D, ZERO, annuityPayment, periodicRate } from "@/lib/money";

// Readvanceable mortgage + HELOC: as the mortgage principal is paid down,
// the HELOC limit automatically increases by the same amount. User can draw
// from the HELOC up to the increased limit. The home value is assumed
// constant unless an appreciation rate is provided.

export type CombinedInput = {
  mortgagePrincipal: Decimal.Value;
  mortgageAnnualRate: Decimal.Value;
  amortizationYears: number;
  helocAnnualRate: Decimal.Value;
  helocStartingBalance?: Decimal.Value;
  helocMonthlyDraw?: Decimal.Value; // constant monthly draw
  monthsToProject: number;
  homeValue?: Decimal.Value;
  homeAppreciation?: Decimal.Value; // annual, decimal
};

export type CombinedRow = {
  month: number;
  mortgageBalance: Decimal;
  mortgagePayment: Decimal;
  mortgageInterest: Decimal;
  mortgagePrincipal: Decimal;
  helocLimit: Decimal;
  helocBalance: Decimal;
  helocInterest: Decimal;
  homeValue: Decimal;
  netWorth: Decimal; // home - (mortgage + heloc)
};

export type CombinedResult = {
  schedule: CombinedRow[];
  totalMortgageInterest: Decimal;
  totalHelocInterest: Decimal;
};

export function projectCombined(input: CombinedInput): CombinedResult {
  const mortgageR = periodicRate(input.mortgageAnnualRate, 12, "canadian");
  const helocR = periodicRate(input.helocAnnualRate, 12, "simple");
  const mortgagePayment = annuityPayment(
    input.mortgagePrincipal,
    mortgageR,
    input.amortizationYears * 12,
  );
  const apprMonthly = input.homeAppreciation
    ? D(1).plus(input.homeAppreciation).pow(D(1).div(12)).minus(1)
    : ZERO;

  let mortgageBalance = D(input.mortgagePrincipal);
  const originalPrincipal = D(input.mortgagePrincipal);
  let helocBalance = D(input.helocStartingBalance ?? 0);
  let homeValue = D(input.homeValue ?? input.mortgagePrincipal);
  let totalMortgageInterest = ZERO;
  let totalHelocInterest = ZERO;
  const rows: CombinedRow[] = [];

  for (let m = 1; m <= input.monthsToProject; m += 1) {
    // Mortgage payment.
    const mInterest = mortgageBalance.mul(mortgageR).toDP(2);
    let mPrincipal = mortgagePayment.minus(mInterest);
    let mPay = mortgagePayment;
    if (mortgageBalance.plus(mInterest).lte(mortgagePayment)) {
      mPrincipal = mortgageBalance;
      mPay = mortgageBalance.plus(mInterest).toDP(2);
      mortgageBalance = ZERO;
    } else {
      mortgageBalance = mortgageBalance.minus(mPrincipal);
    }
    totalMortgageInterest = totalMortgageInterest.plus(mInterest);

    // HELOC: limit grows as mortgage principal is paid down. User optionally
    // draws a fixed monthly amount (capped at available limit).
    const helocLimit = originalPrincipal.minus(mortgageBalance);
    if (input.helocMonthlyDraw) {
      const available = helocLimit.minus(helocBalance);
      const draw = Decimal.max(Decimal.min(D(input.helocMonthlyDraw), available), ZERO);
      helocBalance = helocBalance.plus(draw);
    }
    const hInterest = helocBalance.mul(helocR).toDP(2);
    // Interest-only HELOC: add interest to balance (capitalized) unless caller
    // services it separately. For a conservative projection we capitalize.
    helocBalance = helocBalance.plus(hInterest);
    totalHelocInterest = totalHelocInterest.plus(hInterest);

    homeValue = homeValue.mul(D(1).plus(apprMonthly)).toDP(2);

    rows.push({
      month: m,
      mortgageBalance,
      mortgagePayment: mPay,
      mortgageInterest: mInterest,
      mortgagePrincipal: mPrincipal,
      helocLimit,
      helocBalance,
      helocInterest: hInterest,
      homeValue,
      netWorth: homeValue.minus(mortgageBalance.plus(helocBalance)),
    });

    if (mortgageBalance.isZero() && !input.helocMonthlyDraw) break;
  }

  return { schedule: rows, totalMortgageInterest, totalHelocInterest };
}
