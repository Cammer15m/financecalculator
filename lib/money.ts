import Decimal from "decimal.js";

// Global rounding mode: ROUND_HALF_UP (standard bank rounding on final cent).
Decimal.set({ rounding: Decimal.ROUND_HALF_UP, precision: 40 });

export const D = (v: Decimal.Value) => new Decimal(v);

export const ZERO = new Decimal(0);
export const ONE = new Decimal(1);

export function fromCents(cents: Decimal.Value): Decimal {
  return D(cents).div(100);
}

export function toCents(dollars: Decimal.Value): Decimal {
  return D(dollars).mul(100).toDP(0);
}

export function fmtMoney(v: Decimal.Value): string {
  const d = D(v).toDP(2);
  const sign = d.isNeg() ? "-" : "";
  const abs = d.abs();
  const [whole, frac = "00"] = abs.toFixed(2).split(".");
  const withCommas = whole!.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${sign}$${withCommas}.${frac}`;
}

export function fmtPct(rate: Decimal.Value, digits = 3): string {
  return `${D(rate).mul(100).toDP(digits).toString()}%`;
}

// Canadian mortgages compound interest semi-annually but are paid at a higher
// frequency (monthly / bi-weekly / weekly). Convert a nominal annual rate (as
// a decimal, e.g. 0.05 for 5 %) into the effective periodic rate.
//
//   periodic_rate = (1 + annual/2) ^ (2 / periods_per_year) - 1
//
// For a plain US-style compounding model, pass `mode = 'simple'` and the
// periodic rate becomes annual / periods_per_year.
export function periodicRate(
  annualRate: Decimal.Value,
  periodsPerYear: number,
  mode: "canadian" | "simple" = "canadian",
): Decimal {
  const r = D(annualRate);
  if (mode === "simple") return r.div(periodsPerYear);
  const half = ONE.plus(r.div(2));
  return half.pow(D(2).div(periodsPerYear)).minus(1);
}

// Annuity payment formula: P * i / (1 - (1 + i)^-n).
// Returns the per-period payment as a Decimal dollar value.
export function annuityPayment(
  principal: Decimal.Value,
  periodicR: Decimal.Value,
  nPeriods: number,
): Decimal {
  const P = D(principal);
  const i = D(periodicR);
  if (i.isZero()) return P.div(nPeriods).toDP(2);
  const onePlusIpowN = ONE.plus(i).pow(nPeriods);
  return P.mul(i).mul(onePlusIpowN).div(onePlusIpowN.minus(1)).toDP(2);
}
