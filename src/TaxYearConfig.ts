import type {
  TaxBand,
  TaxBandName,
  NIThresholds,
  StudentLoanPlan,
  StudentLoanThreshold,
  YearLabel,
} from './types.js';
import {TAX_BAND_NAMES} from './types.js';
import {uplift} from './money.js';

/**
 * Pension annual allowance limits and taper thresholds —
 * the cap on tax-relieved pension savings per year and the
 * taper that reduces it for high earners. UK-wide.
 * Source: gov.uk "Tax on your private pension
 * contributions" / "Work out your reduced (tapered) annual
 * allowance"; HMRC PTM055100, PTM056510, PTM057100.
 */
export interface AnnualAllowanceConfig {
  /** Standard annual allowance (£60,000 from 2023-24). */
  standard: number;

  /**
   * Money Purchase Annual Allowance — applies once
   * defined-contribution benefits are flexibly accessed
   * (£10,000 from 2023-24).
   */
  moneyPurchase: number;

  /**
   * Adjusted-income limit above which the allowance tapers
   * (£1 per £2 over it), provided threshold income also
   * exceeds thresholdIncomeLimit. £260,000 from 2023-24.
   */
  adjustedIncomeLimit: number;

  /**
   * Threshold-income gate — the taper is disregarded
   * unless threshold income exceeds this, however high
   * adjusted income is. £200,000 from 2023-24.
   */
  thresholdIncomeLimit: number;

  /**
   * Minimum (floor) tapered allowance — the taper cannot
   * reduce the allowance below this. £10,000 from 2023-24.
   */
  taperFloor: number;
}

/**
 * Shared fields across all UK tax year configs.
 * PA, NI, qualifying earnings, and student loans are UK-wide.
 */
interface TaxYearConfigBase {
  /** Tax year identifier, e.g. '2024-25' */
  year: YearLabel;

  /** Personal Allowance - income below this is tax-free */
  personalAllowance: number;

  /**
   * Income threshold where Personal Allowance starts tapering: the personal
   * allowance taper. Income Tax Act 2007 s.35(2): "For an individual whose
   * adjusted net income exceeds £100,000, the allowance under subsection (1)
   * is reduced" by one half of the excess.
   * https://www.legislation.gov.uk/ukpga/2007/3/section/35
   */
  personalAllowanceTaperStart: number;

  /**
   * Income tax bands, in order, on TAXABLE income: pay less free pay
   * (`freePay.ts`). The additional rate (Scotland's top rate)
   * starts where the allowance has tapered to nil, so its edge is
   * £125,140 on taxable and total income alike; subtracting the
   * allowance from it, as from the lower edges, overtaxes everyone
   * above about £116,760.
   *
   * rUK: https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past
   * Scotland: until the Scottish Government's rates table is cited
   * here, its bands are pinned by HMRC's payroll test data alone. That data, run in
   * `tests/regression/hmrc.test.ts`, covers 2025-26 and 2026-27 in every
   * region; 2023-24 and 2024-25 have no pack and rest on the snapshots:
   * https://www.gov.uk/government/collections/software-developers-payroll-test-data
   */
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

  /** Pension annual allowance limits and taper thresholds. */
  annualAllowance: AnnualAllowanceConfig;
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


/**
 * Both tapers withdraw £1 for every £2 of income over their limit: the
 * personal allowance (ITA 2007 s.35(2), cited at
 * `personalAllowanceTaperStart`) and the annual allowance over the
 * adjusted-income limit (HMRC PTM057100).
 */
export const INCOME_PER_POUND_WITHDRAWN = 2;

/** A band by name; throws when the year has none, a data fault. */
export function taxBandByName(
  config: TaxYearConfig,
  name: TaxBandName,
): TaxBand {
  const band = config.incomeTaxBands.find(
    (b) => b.name === name,
  );
  if (!band) {
    throw new Error(
      `taxBandByName: no ${name} for ${config.region}`,
    );
  }
  return band;
}

/**
 * The higher-rate band for a region.
 *
 * Band ORDER is not band IDENTITY: `incomeTaxBands[0]` is the basic
 * rate in rUK but the STARTER rate in Scotland, and the last band is
 * Scotland's 48% Top Rate — so the higher band is found by name.
 * Every published region defines one, so its absence is a data fault
 * and this throws rather than fall back to a band that merely
 * exists.
 *
 * One producer, so a caller cannot disagree with another about which
 * band is "the higher band": two rules for it could diverge on a
 * rename and tax the same salary at two different rates.
 */
export function higherRateBand(
  config: TaxYearConfig,
): TaxBand {
  return taxBandByName(config, TAX_BAND_NAMES.higherRate);
}

/**
 * The band the next pound of taxable income (as `incomeTaxBands` defines it)
 * falls in, once `taxableIncome` has been taxed: the band whose range holds it, lower
 * bound included. Found by range, not by name, because the same income
 * can sit in differently-named bands in each region: at the allowance
 * taper's start rUK is in the Higher Rate and Scotland in the Advanced
 * Rate. A negative income is a caller error and an income no band holds
 * is a gap in the year's data; both throw.
 */
export function taxBandAt(
  config: TaxYearConfig,
  taxableIncome: number,
): TaxBand {
  const band = config.incomeTaxBands.find(
    (b) => taxableIncome >= b.min && taxableIncome < b.max,
  );
  if (!band) {
    throw new Error(
      `taxBandAt: no band holds ${taxableIncome} for ${config.region}`,
    );
  }
  return band;
}

/**
 * The income tax band the personal allowance taper (defined at
 * `personalAllowanceTaperStart`) sits in: the band at its
 * start, by range. Quoting one band for the whole taper holds only while the
 * taper sits inside it, so this throws if a year puts a band edge inside it.
 */
export function personalAllowanceTaperBand(config: TaxYearConfig): TaxBand {
  const band = taxBandAt(
    config, config.personalAllowanceTaperStart - config.personalAllowance,
  );
  // Near the taper's end the allowance is all but gone, so taxable income
  // there is within £1 of the gross: still inside the band that ends where
  // the taper does, when the year's bands are as published.
  const last = taxBandAt(config, personalAllowanceTaperEnd(config) - 1);
  if (last !== band) {
    throw new Error(
      `personalAllowanceTaperBand: a band edge falls inside the taper for `
      + `${config.region}`,
    );
  }
  return band;
}

/**
 * Income tax's effective marginal rate inside the personal allowance taper
 * (National Insurance aside): the band's rate on each pound itself, plus the
 * same rate on the allowance that pound withdraws.
 */
export function personalAllowanceTaperRate(config: TaxYearConfig): number {
  return uplift(
    personalAllowanceTaperBand(config).rate, 1 / INCOME_PER_POUND_WITHDRAWN,
  );
}

/** The published gross income at which the higher rate starts: the
 *  statutory allowance plus the band's own lower bound (£50,270). PAYE
 *  charges it £9 later, on pay above free pay (`freePay.ts`). */
export function higherRateThreshold(
  config: TaxYearConfig,
): number {
  return config.personalAllowance
    + higherRateBand(config).min;
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
  return Math.max(0, allowanceLeft(grossIncome, config));
}

/** The income at which the taper has taken the whole allowance:
 *  £125,140 when it starts at £100,000 on £12,570. */
export function personalAllowanceTaperEnd(config: TaxYearConfig): number {
  return config.personalAllowanceTaperStart
    + config.personalAllowance * INCOME_PER_POUND_WITHDRAWN;
}

/**
 * The allowance less the taper, before it is held at nil: negative once
 * the taper would take more than the whole allowance. HMRC's take-home
 * estimator frees £9 above this, so the two differ just past nil
 * (`freePay.ts`).
 */
export function allowanceLeft(
  grossIncome: number,
  config: TaxYearConfig,
): number {
  const excessIncome = Math.max(
    0, grossIncome - config.personalAllowanceTaperStart,
  );
  return config.personalAllowance
    - Math.floor(excessIncome / INCOME_PER_POUND_WITHDRAWN);
}
