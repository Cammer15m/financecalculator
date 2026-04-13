import Decimal from "decimal.js";
import { D, ZERO, annuityPayment, periodicRate } from "@/lib/money";

export type Frequency = "monthly" | "bi-weekly" | "weekly" | "accelerated-bi-weekly" | "accelerated-weekly";

export const PERIODS_PER_YEAR: Record<Frequency, number> = {
  monthly: 12,
  "bi-weekly": 26,
  weekly: 52,
  "accelerated-bi-weekly": 26,
  "accelerated-weekly": 52,
};

export type AmortInput = {
  principal: Decimal.Value;
  annualRate: Decimal.Value; // e.g. 0.0499 for 4.99 %
  amortizationYears: number;
  frequency: Frequency;
  compounding?: "canadian" | "simple";
};

export type AmortRow = {
  period: number;
  payment: Decimal;
  interest: Decimal;
  principal: Decimal;
  balance: Decimal;
};

export type AmortResult = {
  paymentAmount: Decimal; // per-period payment
  totalPeriods: number;
  totalInterest: Decimal;
  totalPaid: Decimal;
  schedule: AmortRow[];
};

// For accelerated bi-weekly / weekly, the payment is set to the monthly
// equivalent divided by (periods_per_month), so the borrower pays the monthly
// amount every two weeks (or every week) → one extra monthly payment per year.
export function computeAmortization(input: AmortInput): AmortResult {
  const compounding = input.compounding ?? "canadian";
  const freq = input.frequency;

  const monthlyR = periodicRate(input.annualRate, 12, compounding);
  const monthlyPayment = annuityPayment(input.principal, monthlyR, input.amortizationYears * 12);

  let payment: Decimal;
  let periodicR: Decimal;
  let totalPeriods: number;

  switch (freq) {
    case "monthly":
      payment = monthlyPayment;
      periodicR = monthlyR;
      totalPeriods = input.amortizationYears * 12;
      break;
    case "bi-weekly":
      // True bi-weekly: monthly × 12 / 26, no acceleration.
      periodicR = periodicRate(input.annualRate, 26, compounding);
      payment = annuityPayment(input.principal, periodicR, input.amortizationYears * 26);
      totalPeriods = input.amortizationYears * 26;
      break;
    case "weekly":
      periodicR = periodicRate(input.annualRate, 52, compounding);
      payment = annuityPayment(input.principal, periodicR, input.amortizationYears * 52);
      totalPeriods = input.amortizationYears * 52;
      break;
    case "accelerated-bi-weekly":
      payment = monthlyPayment.div(2).toDP(2);
      periodicR = periodicRate(input.annualRate, 26, compounding);
      totalPeriods = Math.ceil(input.amortizationYears * 26 * 1.5);
      break;
    case "accelerated-weekly":
      payment = monthlyPayment.div(4).toDP(2);
      periodicR = periodicRate(input.annualRate, 52, compounding);
      totalPeriods = Math.ceil(input.amortizationYears * 52 * 1.5);
      break;
  }

  const schedule: AmortRow[] = [];
  let balance = D(input.principal);
  let totalInterest = ZERO;
  let totalPaid = ZERO;

  for (let p = 1; balance.gt(0); p += 1) {
    const interest = balance.mul(periodicR).toDP(2);
    let principalPart = payment.minus(interest);
    let pay = payment;

    if (balance.plus(interest).lte(payment)) {
      // final payment — pay exactly the remaining balance + last interest.
      principalPart = balance;
      pay = balance.plus(interest).toDP(2);
      balance = ZERO;
    } else {
      balance = balance.minus(principalPart);
    }

    totalInterest = totalInterest.plus(interest);
    totalPaid = totalPaid.plus(pay);

    schedule.push({
      period: p,
      payment: pay,
      interest,
      principal: principalPart,
      balance,
    });

    if (p > totalPeriods + 12) break; // safety
  }

  return {
    paymentAmount: payment,
    totalPeriods: schedule.length,
    totalInterest,
    totalPaid,
    schedule,
  };
}
