import Decimal from "decimal.js";
import { D, ZERO, annuityPayment, periodicRate } from "@/lib/money";

export type RentVsBuyInput = {
  // Buy side
  homePrice: Decimal.Value;
  downPayment: Decimal.Value;
  mortgageAnnualRate: Decimal.Value;
  amortizationYears: number;
  propertyTaxAnnual: Decimal.Value; // as % of home value, e.g. 0.01
  maintenanceAnnual: Decimal.Value; // as % of home value
  homeAppreciation: Decimal.Value; // annual
  sellingCostPct: Decimal.Value; // e.g. 0.05 (5 % realtor+legal)

  // Rent side
  monthlyRent: Decimal.Value;
  rentInflation: Decimal.Value; // annual
  investmentReturn: Decimal.Value; // annual return on down-payment alternative

  years: number;
};

export type RentVsBuyRow = {
  year: number;
  buyHomeValue: Decimal;
  buyMortgageBalance: Decimal;
  buyCumulativeCost: Decimal; // interest + tax + maintenance paid
  buyNetWorth: Decimal; // equity - selling costs
  rentPortfolio: Decimal;
  rentCumulativeRent: Decimal;
  rentNetWorth: Decimal;
  advantageBuy: Decimal; // buyNetWorth - rentNetWorth
};

export type RentVsBuyResult = {
  schedule: RentVsBuyRow[];
  finalAdvantageBuy: Decimal;
};

export function projectRentVsBuy(input: RentVsBuyInput): RentVsBuyResult {
  const mortgagePrincipal = D(input.homePrice).minus(input.downPayment);
  const mortgageR = periodicRate(input.mortgageAnnualRate, 12, "canadian");
  const mortgagePayment = annuityPayment(
    mortgagePrincipal,
    mortgageR,
    input.amortizationYears * 12,
  );

  let mortgageBalance = mortgagePrincipal;
  let homeValue = D(input.homePrice);
  let buyCumulativeCost = ZERO;

  let rentPortfolio = D(input.downPayment);
  let currentMonthlyRent = D(input.monthlyRent);
  let rentCumulativeRent = ZERO;

  const rows: RentVsBuyRow[] = [];
  const invMonthlyR = D(1).plus(input.investmentReturn).pow(D(1).div(12)).minus(1);
  const homeMonthlyAppr = D(1).plus(input.homeAppreciation).pow(D(1).div(12)).minus(1);
  const rentMonthlyInflation = D(1).plus(input.rentInflation).pow(D(1).div(12)).minus(1);
  const propTaxMonthly = D(input.propertyTaxAnnual).div(12);
  const maintMonthly = D(input.maintenanceAnnual).div(12);

  for (let y = 1; y <= input.years; y += 1) {
    for (let m = 0; m < 12; m += 1) {
      // Buy: mortgage
      const interest = mortgageBalance.mul(mortgageR).toDP(2);
      let principalPart = mortgagePayment.minus(interest);
      if (mortgageBalance.plus(interest).lte(mortgagePayment)) {
        principalPart = mortgageBalance;
        mortgageBalance = ZERO;
      } else {
        mortgageBalance = mortgageBalance.minus(principalPart);
      }
      // Non-equity costs that go away when you sell.
      const taxMonthly = homeValue.mul(propTaxMonthly).toDP(2);
      const upkeepMonthly = homeValue.mul(maintMonthly).toDP(2);
      buyCumulativeCost = buyCumulativeCost.plus(interest).plus(taxMonthly).plus(upkeepMonthly);

      homeValue = homeValue.mul(D(1).plus(homeMonthlyAppr)).toDP(2);

      // Rent
      rentCumulativeRent = rentCumulativeRent.plus(currentMonthlyRent);
      const rentDelta = mortgagePayment
        .plus(taxMonthly)
        .plus(upkeepMonthly)
        .minus(currentMonthlyRent);
      // Delta between buying costs and rent gets invested (positive) or
      // withdrawn from the portfolio (negative, but floored at zero).
      rentPortfolio = Decimal.max(rentPortfolio.plus(rentDelta), ZERO);
      rentPortfolio = rentPortfolio.mul(D(1).plus(invMonthlyR)).toDP(2);
      currentMonthlyRent = currentMonthlyRent.mul(D(1).plus(rentMonthlyInflation)).toDP(2);
    }

    const sellingCosts = homeValue.mul(input.sellingCostPct).toDP(2);
    const buyNetWorth = homeValue.minus(mortgageBalance).minus(sellingCosts);
    const rentNetWorth = rentPortfolio;

    rows.push({
      year: y,
      buyHomeValue: homeValue,
      buyMortgageBalance: mortgageBalance,
      buyCumulativeCost,
      buyNetWorth,
      rentPortfolio,
      rentCumulativeRent,
      rentNetWorth,
      advantageBuy: buyNetWorth.minus(rentNetWorth),
    });
  }

  return {
    schedule: rows,
    finalAdvantageBuy: rows[rows.length - 1]?.advantageBuy ?? ZERO,
  };
}
