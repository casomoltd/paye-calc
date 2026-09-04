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

/**
 * A published year's LABEL — '2026-27' and the three before it.
 *
 * This is the type that KEYS things: every `Record<YearLabel, …>` and
 * every lookup table in this package and its consumers. It is
 * deliberately a plain string-literal union, because that is what makes
 * a total `Record` demand every member, a `Partial<Record<…>>` reject a
 * year nobody publishes, and a `switch` over years exhaustive. Those
 * three guarantees are how a new tax year becomes a compile error
 * rather than a silent fall-through.
 *
 * Do not brand this. {@link TaxYear} and {@link PayYear} below are the
 * branded types, and they exist for SIGNATURES, not for keys.
 */
export type YearLabel =
  (typeof TAX_YEARS)[keyof typeof TAX_YEARS];

declare const YEAR_BASIS: unique symbol;

/**
 * The year whose TAX rules apply — bands, thresholds, NI rates,
 * pension tiers. A UK-wide fact fixed by the calendar.
 *
 * Distinct from {@link PayYear} because the two answer different
 * questions and only usually agree. Someone paid last year's salary
 * this year still pays this year's tax; when an employer's pay round
 * runs late — Northern Ireland, right now — the two come apart, and
 * one value used for both silently misprices the deductions.
 *
 * The brand is a phantom: at runtime this is just the label. A bare
 * literal or a freshly-parsed label still assigns to it, so a parse
 * boundary needs no ceremony. What it stops is a value that has
 * already been established as one KIND of year being used as the
 * other.
 *
 * To index a label-keyed table with one, narrow it first — `const key:
 * YearLabel = year` — so the transition is visible at the boundary
 * where it happens rather than inferred everywhere.
 */
export type TaxYear = YearLabel & {
  readonly [YEAR_BASIS]?: 'tax';
};

/**
 * Read a label as a TAX year — the only way to mint one.
 *
 * A REQUIRED brand, so a bare label does not silently become either
 * basis. With an optional brand a label assigned to both, which left
 * a two-step hole: `PayYear` → `YearLabel` → `TaxYear` compiled with
 * no cast and no error, and that widening is the same idiom every
 * lookup uses to narrow for indexing. The single-expression mistake
 * was caught; the two-step one was not.
 *
 * A no-op at runtime. Its whole job is to make the moment a label
 * acquires a meaning a thing you have to write down.
 */
export function taxYear(label: YearLabel): TaxYear {
  return label as TaxYear;
}

/**
 * The year whose PAY SCALE a salary was published on — the employer's
 * pay round, not the calendar.
 *
 * Per-nation, and not necessarily the current tax year: a nation whose
 * award is announced but not yet in payment is still being paid last
 * year's scale. See {@link TaxYear} for why the two are separate types.
 *
 * This package publishes no pay scales — it names the type because it
 * owns the year vocabulary and both halves must be declared together
 * for either to mean anything. `@casomoltd/nhs-pay` is where pay years
 * are actually resolved.
 */
export type PayYear = YearLabel & {
  readonly [YEAR_BASIS]?: 'pay';
};

/**
 * Read a label as a PAY year — the only way to mint one.
 * See {@link taxYear} for why the brand is required.
 */
export function payYear(label: YearLabel): PayYear {
  return label as PayYear;
}

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
export const CURRENT_TAX_YEAR: TaxYear = taxYear(TAX_YEARS.Y2026_27);

/**
 * The tax year before {@link CURRENT_TAX_YEAR}.
 *
 * A year-on-year comparison needs both ends, and reaching for a pay
 * year as the other end is the conflation this vocabulary exists to
 * stop: "last year's contracted week" and "last year's pay round" are
 * different questions and diverge the moment a nation's award runs
 * late. Rolls with `CURRENT_TAX_YEAR`.
 */
export const PREVIOUS_TAX_YEAR: TaxYear = taxYear(TAX_YEARS.Y2025_26);

/**
 * The UK nations this library computes for, and the one correct
 * spelling of each.
 *
 * England, Wales and Northern Ireland share the same income tax bands
 * (rUK); Scotland sets its own. That difference is the reason the
 * nation is a parameter at all, and {@link nationToTaxRegion} is what
 * consumes it.
 *
 * `label` is the nation's OWN NAME, not display chrome: a caller
 * printing "Northern Ireland" must not be free to render "N. Ireland"
 * or "NI" and have two surfaces disagree about what the same value is
 * called. That is the same reason {@link STUDENT_LOAN_PLAN_LABELS}
 * sits beside its enum. It is the only presentational thing here and
 * it is deliberate — this package holds no icons, colours or view
 * props, and a doc comment naming a caller's screen is the sign one
 * has crept back in.
 */
export const NATIONS = {
  england: {label: 'England'},
  wales: {label: 'Wales'},
  scotland: {label: 'Scotland'},
  'northern-ireland': {label: 'Northern Ireland'},
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
