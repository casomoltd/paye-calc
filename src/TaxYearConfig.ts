import type {
  TaxBand,
  NIThresholds,
  StudentLoanPlan,
  StudentLoanThreshold,
} from './types.js';

/**
 * Shared fields across all UK tax year configs.
 * PA, NI, qualifying earnings, and student loans are UK-wide.
 */
interface TaxYearConfigBase {
  /** Tax year identifier, e.g. '2024-25' */
  year: string;

  /** Personal Allowance - income below this is tax-free */
  personalAllowance: number;

  /**
   * Income threshold where Personal Allowance starts tapering.
   * PA reduces by £1 for every £2 over this threshold.
   */
  personalAllowanceTaperStart: number;

  /** Income tax bands — varies by region */
  incomeTaxBands: TaxBand[];

  /** National Insurance thresholds and rates */
  nationalInsurance: NIThresholds;

  /**
   * Auto-enrolment qualifying earnings band.
   * Only earnings within this band attract pension contributions
   * under the auto-enrolment scheme.
   */
  qualifyingEarnings: {
    lowerThreshold: number;
    upperThreshold: number;
  };

  /**
   * Student loan repayment thresholds and rates by plan.
   * null means the plan is not available for this tax year
   * (e.g. Plan 5 before April 2026).
   */
  studentLoanThresholds: Record<
    StudentLoanPlan,
    StudentLoanThreshold | null
  >;

  /** Display name for UI */
  displayName: string;

  /**
   * Standard contracted weekly hours for the region.
   * rUK: 37.5 (NHS AfC standard).
   * Scotland: 36 from 2026-27 (MSG AfC framework).
   */
  standardWeeklyHours: number;
}

/**
 * Config for England, Wales, and Northern Ireland.
 */
export interface TaxYearConfigUk extends TaxYearConfigBase {
  region: 'rUK';
}

/**
 * Config for Scotland (different income tax bands).
 */
export interface TaxYearConfigScotland
  extends TaxYearConfigBase {
  region: 'scotland';
}

/** Discriminated union — region determines income tax bands. */
export type TaxYearConfig =
  | TaxYearConfigUk
  | TaxYearConfigScotland;

/** Annual contracted hours: weekly hours x 52. */
export function hoursPerYear(
  config: TaxYearConfig,
): number {
  return config.standardWeeklyHours * 52;
}

/** Higher-rate income tax threshold for rUK.
 *  personalAllowance + basic rate band width. */
export function higherRateThreshold(
  config: TaxYearConfig,
): number {
  return config.personalAllowance
    + config.incomeTaxBands[0].max;
}

/**
 * Calculate the effective Personal Allowance after taper.
 * PA reduces by £1 for every £2 of income over the taper
 * threshold, until it reaches zero.
 */
export function calculateTaperedPersonalAllowance(
  grossIncome: number,
  config: TaxYearConfig,
): number {
  if (grossIncome <= config.personalAllowanceTaperStart) {
    return config.personalAllowance;
  }

  const excessIncome =
    grossIncome - config.personalAllowanceTaperStart;
  const reduction = Math.floor(excessIncome / 2);
  const taperedAllowance =
    config.personalAllowance - reduction;

  return Math.max(0, taperedAllowance);
}
