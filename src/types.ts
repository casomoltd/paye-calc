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
}

/** Student loan repayment plan type */
export enum StudentLoanPlan {
  Plan1 = 'plan_1',
  Plan2 = 'plan_2',
  Plan4 = 'plan_4',
  Plan5 = 'plan_5',
  Postgraduate = 'postgraduate',
}

/**
 * Display names for the plans, beside the enum for the same
 * reason NATIONS carries nation labels: consumers rendering a
 * plan should never invent their own wording, and a plan added
 * here fails the Record check in every consumer map. Plan 4 names
 * Scotland because eligibility is Scotland-specific.
 */
export const STUDENT_LOAN_PLAN_LABELS: Record<
  StudentLoanPlan,
  string
> = {
  [StudentLoanPlan.Plan1]: 'Plan 1',
  [StudentLoanPlan.Plan2]: 'Plan 2',
  [StudentLoanPlan.Plan4]: 'Plan 4 (Scotland)',
  [StudentLoanPlan.Plan5]: 'Plan 5',
  [StudentLoanPlan.Postgraduate]: 'Postgraduate',
};

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

/**
 * Tax region discriminant.
 *
 * `'rUK'` — "rest of UK" in HMRC terminology.
 * England, Wales, and Northern Ireland share the
 * same income tax bands and rates. Scotland sets
 * its own via the Scottish Parliament, so it is a
 * separate region.
 */
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
  Y2026_27: '2026-27',
} as const;

/**
 * The tax year currently in force.
 *
 * The year whose rates, thresholds and statutory minima apply to
 * money paid TODAY. It is a UK-wide fact fixed by the calendar, and
 * it is deliberately NOT the same question as "which pay scale is a
 * person on": someone paid last year's salary this year still pays
 * this year's tax. Those two coincide most of the time, which is why
 * one value gets used for both and the error only surfaces when an
 * employer's pay round runs late.
 *
 * Rolls on 6 April. Bump it with the new year's config.
 */
export const CURRENT_TAX_YEAR: TaxYear = TAX_YEARS.Y2026_27;

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
 *
 * `rUK` ("rest of UK") is HMRC's term for England,
 * Wales, and Northern Ireland, which share the same
 * income tax rates. Scotland sets its own rates via
 * the Scottish Parliament and has six brackets
 * (starter, basic, intermediate, higher, advanced,
 * top) compared to rUK's three (basic, higher,
 * additional).
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

/**
 * Defined-benefit pension input multiplier. The pension
 * input amount for a DB scheme — the figure feeding the
 * annual-allowance adjusted-income test — is 16× the
 * annual pension accrual (plus any lump-sum growth, not
 * modelled here).
 * Source: HMRC PTM053301 (DB pension input amount).
 */
export const DB_PENSION_INPUT_MULTIPLIER = 16;

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
