import Decimal from "decimal.js";
import { D, ZERO, periodicRate } from "@/lib/money";

export type HelocInput = {
  limit: Decimal.Value;
  startingBalance: Decimal.Value;
  annualRate: Decimal.Value;
  monthsToProject: number;
  // Optional fixed monthly payment above the interest-only minimum.
  monthlyPayment?: Decimal.Value;
};

export type HelocRow = {
  month: number;
  balance: Decimal;
  interest: Decimal;
  payment: Decimal;
  principal: Decimal;
};

export type HelocResult = {
  schedule: HelocRow[];
  totalInterest: Decimal;
  finalBalance: Decimal;
};

// HELOCs in Canada are typically interest-only, variable rate, compounded
// monthly and due monthly. This projection treats the stated rate as a
// nominal annual rate with monthly simple compounding (matches HELOC
// disclosure practice; Canadian semi-annual compounding rule applies to
// mortgages, not HELOCs).
export function projectHeloc(input: HelocInput): HelocResult {
  const mRate = periodicRate(input.annualRate, 12, "simple");
  const rows: HelocRow[] = [];
  let balance = D(input.startingBalance);
  const limit = D(input.limit);
  let totalInterest = ZERO;

  for (let m = 1; m <= input.monthsToProject; m += 1) {
    const interest = balance.mul(mRate).toDP(2);
    const minPayment = interest;
    const desired = input.monthlyPayment ? D(input.monthlyPayment) : minPayment;
    const payment = Decimal.max(desired, minPayment);
    const principal = payment.minus(interest);

    balance = Decimal.max(balance.minus(principal), ZERO);
    totalInterest = totalInterest.plus(interest);

    rows.push({ month: m, balance, interest, payment, principal });

    if (balance.isZero() && !input.monthlyPayment) break;
  }

  // Warn-by-data: if balance exceeds limit, caller can detect from row.balance > limit.
  void limit;

  return { schedule: rows, totalInterest, finalBalance: balance };
}
