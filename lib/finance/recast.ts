import Decimal from "decimal.js";
import { computeAmortization, type AmortInput, type AmortResult } from "@/lib/finance/amortization";
import { D } from "@/lib/money";

export type RecastInput = AmortInput & {
  lumpSum: Decimal.Value;
  monthsBeforeRecast: number; // how many payments made before recast
};

export type RecastResult = {
  baseline: AmortResult;
  recast: AmortResult;
  interestSaved: Decimal;
  newPayment: Decimal;
};

// Recast = make a lump-sum payment and re-amortize the remaining balance
// over the REMAINING term (not a new full term). Payment drops; interest
// drops; term is unchanged. We model this by:
//   1. run baseline amortization
//   2. find the balance at month N (after monthsBeforeRecast payments)
//   3. subtract the lump sum from that balance
//   4. amortize remaining balance over remaining months
//   5. compare total interest across both timelines
export function projectRecast(input: RecastInput): RecastResult {
  const baseline = computeAmortization(input);

  const cutoff = baseline.schedule[input.monthsBeforeRecast - 1];
  if (!cutoff) throw new Error("monthsBeforeRecast exceeds baseline schedule");

  const newPrincipal = cutoff.balance.minus(input.lumpSum);
  if (newPrincipal.lte(0)) {
    // Lump sum wipes out the mortgage.
    const zeroResult: AmortResult = {
      paymentAmount: D(0),
      totalPeriods: input.monthsBeforeRecast,
      totalInterest: baseline.schedule
        .slice(0, input.monthsBeforeRecast)
        .reduce((sum, r) => sum.plus(r.interest), D(0)),
      totalPaid: baseline.schedule
        .slice(0, input.monthsBeforeRecast)
        .reduce((sum, r) => sum.plus(r.payment), D(0))
        .plus(input.lumpSum),
      schedule: baseline.schedule.slice(0, input.monthsBeforeRecast),
    };
    return {
      baseline,
      recast: zeroResult,
      interestSaved: baseline.totalInterest.minus(zeroResult.totalInterest),
      newPayment: D(0),
    };
  }

  // Remaining periods at the original frequency.
  const periodsRemaining = baseline.totalPeriods - input.monthsBeforeRecast;
  const yearsRemaining = periodsRemaining / 12; // amortization is in years regardless of freq

  const recastLeg = computeAmortization({
    principal: newPrincipal,
    annualRate: input.annualRate,
    amortizationYears: yearsRemaining,
    frequency: input.frequency,
    compounding: input.compounding,
  });

  // Combine: first N months of baseline + all months of recastLeg (renumbered).
  const preRecastRows = baseline.schedule.slice(0, input.monthsBeforeRecast);
  const preInterest = preRecastRows.reduce((s, r) => s.plus(r.interest), D(0));
  const prePaid = preRecastRows.reduce((s, r) => s.plus(r.payment), D(0));

  const combined: AmortResult = {
    paymentAmount: recastLeg.paymentAmount,
    totalPeriods: input.monthsBeforeRecast + recastLeg.totalPeriods,
    totalInterest: preInterest.plus(recastLeg.totalInterest),
    totalPaid: prePaid.plus(recastLeg.totalPaid).plus(input.lumpSum),
    schedule: [
      ...preRecastRows,
      ...recastLeg.schedule.map((r) => ({
        ...r,
        period: input.monthsBeforeRecast + r.period,
      })),
    ],
  };

  return {
    baseline,
    recast: combined,
    interestSaved: baseline.totalInterest.minus(combined.totalInterest),
    newPayment: recastLeg.paymentAmount,
  };
}
