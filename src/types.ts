/**
 * Core type definitions for the PAYE calculator.
 */

// ── Enums ──────────────────────────────────────────

/** Salary input mode */
export enum SalaryType {
  Gross = 'gross',
  Net = 'net',
}

/** Display period for amounts */
export enum Period {
  Weekly = 'weekly',
  Monthly = 'monthly',
  Annual = 'annual',
}

/** Pension contribution type */
export enum PensionType {
  Percent = 'percent',
  Fixed = 'fixed',
}

/** Pension scheme basis — determines tax/NI treatment */
export enum PensionBasis {
  None = 'none',
  AutoEnrolment = 'auto_enrolment',
  Employer = 'employer',
  SalarySacrifice = 'salary_sacrifice',
  Personal = 'personal',
  NHSPension = 'nhs_pension',
}

/** Student loan repayment plan type */
export enum StudentLoanPlan {
  Plan1 = 'plan_1',
  Plan2 = 'plan_2',
  Plan4 = 'plan_4',
  Plan5 = 'plan_5',
  Postgraduate = 'postgraduate',
}

// ── Interfaces ─────────────────────────────────────

/** A single tax band with its rate and boundaries */
export interface TaxBand {
  name: string;
  rate: number;
  min: number;
  max: number;
}

/** Breakdown of tax paid in each band */
export interface TaxBandBreakdown {
  name: string;
  rate: number;
  taxableAmount: number;
  taxPaid: number;
}

/** National Insurance thresholds */
export interface NIThresholds {
  primaryThreshold: number;
  upperEarningsLimit: number;
  mainRate: number;
  upperRate: number;
}

/** Breakdown of NI contributions */
export interface NIBreakdown {
  belowThreshold: number;
  mainRateAmount: number;
  mainRateTax: number;
  upperRateAmount: number;
  upperRateTax: number;
  total: number;
}

/** Segment for chart visualization. */
export interface ChartSegment {
  label: string;
  value: number;
}

/**
 * NHS Pension tier band — flat rate applied to entire
 * salary based on which band the annual pensionable
 * pay falls into.
 */
export interface NHSPensionTier {
  min: number;
  max: number;
  rate: number;
}

/** Repayment threshold and rate for a student loan */
export interface StudentLoanThreshold {
  annualThreshold: number;
  rate: number;
}

/** Breakdown of a single student loan plan's deduction */
export interface StudentLoanBreakdown {
  plan: StudentLoanPlan;
  threshold: number;
  rate: number;
  amount: number;
  deduction: number;
}

// ── Type aliases ───────────────────────────────────

/** Supported tax years */
export type TaxYear =
  (typeof TAX_YEARS)[keyof typeof TAX_YEARS];

/** UK nation for the region picker. */
export type Nation = keyof typeof NATIONS;

/** Tax region discriminant. */
export type TaxRegion =
  (typeof TAX_REGIONS)[keyof typeof TAX_REGIONS];

/** Salary input — either gross or target net */
export type Salary =
  | {type: SalaryType.Gross; annual: number}
  | {type: SalaryType.Net; annual: number};

/** Pension contribution — percent or fixed amount */
export type Pension =
  | {type: PensionType.Percent; percent: number}
  | {type: PensionType.Fixed; amount: number};

// ── Constants ──────────────────────────────────────

/** Tax year constants */
export const TAX_YEARS = {
  Y2023_24: '2023-24',
  Y2024_25: '2024-25',
  Y2025_26: '2025-26',
} as const;

/**
 * UK nations for the region picker.
 * England, Wales, and Northern Ireland share the same
 * income tax bands (rUK). Scotland has its own bands.
 */
export const NATIONS = {
  england: {
    label: 'England',
    flag: '\uD83C\uDFF4\uDB40\uDC67\uDB40\uDC62\uDB40\uDC65\uDB40\uDC6E\uDB40\uDC67\uDB40\uDC7F',
  },
  wales: {
    label: 'Wales',
    flag: '\uD83C\uDFF4\uDB40\uDC67\uDB40\uDC62\uDB40\uDC77\uDB40\uDC6C\uDB40\uDC73\uDB40\uDC7F',
  },
  scotland: {
    label: 'Scotland',
    flag: '\uD83C\uDFF4\uDB40\uDC67\uDB40\uDC62\uDB40\uDC73\uDB40\uDC63\uDB40\uDC74\uDB40\uDC7F',
  },
  'northern-ireland': {
    label: 'Northern Ireland',
    flag: '\u2618\uFE0F',
  },
} as const;

/** Nation key constants — use instead of literals. */
export const NATION_KEYS = {
  england: 'england',
  wales: 'wales',
  scotland: 'scotland',
  northernIreland: 'northern-ireland',
} as const satisfies Record<string, Nation>;

/**
 * Tax region determines which income tax bands apply.
 * rUK = England, Wales, Northern Ireland (same bands).
 * scotland = Scottish income tax bands.
 */
export const TAX_REGIONS = {
  rUK: 'rUK',
  scotland: 'scotland',
} as const;

/** Canonical band names used in tax year configs */
export const TAX_BAND_NAMES = {
  basicRate: 'Basic Rate',
  higherRate: 'Higher Rate',
  additionalRate: 'Additional Rate',
  topRate: 'Top Rate',
} as const;

/** Human-readable short labels for period segments */
export const PERIOD_LABELS: Record<Period, string> = {
  [Period.Weekly]: 'Week',
  [Period.Monthly]: 'Month',
  [Period.Annual]: 'Year',
};

// ── Functions ──────────────────────────────────────

/**
 * Maps a UI nation to the model-level tax region.
 */
export function nationToTaxRegion(
  nation: Nation,
): TaxRegion {
  return nation === TAX_REGIONS.scotland
    ? TAX_REGIONS.scotland
    : TAX_REGIONS.rUK;
}

/**
 * Factory: set salary from gross annual amount.
 */
export function GrossAnnual(amount: number): Salary {
  return {type: SalaryType.Gross, annual: amount};
}

/**
 * Factory: set salary from target net
 * (engine reverse-solves to gross).
 */
export function NetAnnual(amount: number): Salary {
  return {type: SalaryType.Net, annual: amount};
}

/**
 * Factory: create a percentage-based pension.
 */
export function PensionPercent(
  percent: number,
): Pension {
  return {type: PensionType.Percent, percent};
}

/**
 * Factory: create a fixed-amount pension.
 */
export function PensionFixed(amount: number): Pension {
  return {type: PensionType.Fixed, amount};
}
