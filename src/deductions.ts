/**
 * The pay each deduction falls on, split the way it is charged: income
 * by tax band, earnings by NI rate, earnings over each loan plan's
 * threshold. A total and its breakdown both read these, so the two
 * cannot disagree about which pound falls where.
 */

import type {
  NIThresholds,
  StudentLoanPlan,
  StudentLoanThreshold,
  TaxBand,
} from './types.js';

/** Taxable income in each band, in order, up to the last band it reaches. */
export function amountsByBand(
  taxable: number,
  bands: readonly TaxBand[],
): BandAmount[] {
  const amounts: BandAmount[] = [];
  let remaining = taxable;
  for (const band of bands) {
    const amount = Math.min(remaining, band.max - band.min);
    amounts.push({band, amount});
    remaining -= amount;
    if (remaining <= 0) break;
  }
  return amounts;
}


/** Earnings split at the primary threshold and the upper earnings limit. */
export function niAmounts(earnings: number, ni: NIThresholds): NiAmounts {
  return {
    belowThreshold: Math.min(earnings, ni.primaryThreshold),
    mainRateAmount: earnings > ni.primaryThreshold
      ? Math.min(earnings, ni.upperEarningsLimit) - ni.primaryThreshold
      : 0,
    upperRateAmount: Math.max(0, earnings - ni.upperEarningsLimit),
  };
}


/** Earnings over each active plan's threshold, for the plans the year has. */
export function loanAmounts(
  earnings: number,
  plans: ReadonlySet<StudentLoanPlan>,
  thresholds: Readonly<Record<StudentLoanPlan, StudentLoanThreshold | null>>,
): LoanAmount[] {
  return [...plans].flatMap((plan) => {
    const config = thresholds[plan];
    return config === null ? [] : [{
      plan,
      threshold: config.annualThreshold,
      rate: config.rate,
      amount: Math.max(0, earnings - config.annualThreshold),
    }];
  });
}

/** Taxable income in one band. */
interface BandAmount {
  readonly band: TaxBand;
  readonly amount: number;
}


/** Earnings below the primary threshold, at the main rate, and above the UEL. */
interface NiAmounts {
  readonly belowThreshold: number;
  readonly mainRateAmount: number;
  readonly upperRateAmount: number;
}


/** Earnings over one plan's repayment threshold. */
interface LoanAmount {
  readonly plan: StudentLoanPlan;
  readonly threshold: number;
  readonly rate: number;
  readonly amount: number;
}

