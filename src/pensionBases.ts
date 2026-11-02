/**
 * What each pension basis does to pay: one row per basis, read by every
 * calculation that depends on it, so no path can treat a basis
 * differently from another.
 */

import {PensionBasis, TAX_BAND_NAMES, TAX_REGIONS, taxYear} from './types.js';
import type {YearLabel} from './types.js';
import {charge} from './money.js';
import {taxBandByName} from './TaxYearConfig.js';
import type {TaxYearConfig} from './TaxYearConfig.js';
import {getTaxYearConfig} from './taxYears/index.js';

/**
 * A year's contribution as the allowance tests see it: a net-pay
 * member contribution, a salary sacrifice (an employer contribution),
 * or a gross relief-at-source contribution.
 */
export interface ContributionSplit {
  readonly member: number;
  readonly sacrifice: number;
  readonly reliefAtSource: number;
}

/** How a pension on one basis is taken, taxed and counted. */
interface BasisRules {
  /** The pay a percentage contribution is a share of. */
  readonly earningsBase: (gross: number, config: TaxYearConfig) => number;
  /** Taken before income tax (net pay, auto-enrolment, sacrifice). */
  readonly beforeTax: boolean;
  /** Taken before the pay NI and student loans are worked on. */
  readonly beforeNi: boolean;
  /** How the annual-allowance tests, and relief at source, count it. */
  readonly split: (contribution: number) => ContributionSplit;
}

const NOTHING: ContributionSplit = {member: 0, sacrifice: 0, reliefAtSource: 0};

export const PENSION_BASES: Readonly<Record<PensionBasis, BasisRules>> = {
  [PensionBasis.None]: {
    earningsBase: () => 0, beforeTax: false, beforeNi: false,
    split: () => NOTHING,
  },
  [PensionBasis.AutoEnrolment]: {
    earningsBase: qualifyingEarnings, beforeTax: true, beforeNi: false,
    split: (member) => ({...NOTHING, member}),
  },
  [PensionBasis.Employer]: {
    earningsBase: (gross) => gross, beforeTax: true, beforeNi: false,
    split: (member) => ({...NOTHING, member}),
  },
  [PensionBasis.SalarySacrifice]: {
    earningsBase: (gross) => gross, beforeTax: true, beforeNi: true,
    split: (sacrifice) => ({...NOTHING, sacrifice}),
  },
  [PensionBasis.Personal]: {
    earningsBase: (gross) => gross, beforeTax: false, beforeNi: false,
    split: (reliefAtSource) => ({...NOTHING, reliefAtSource}),
  },
};

/**
 * The relief a provider claims on a gross relief-at-source contribution:
 * the basic rate of it, the part the member does not pay. It is the rest
 * of the UK's basic rate even for a Scottish taxpayer, so it is read
 * from the rUK year, never from the member's own region: "your pension
 * provider claims tax relief from the government at the basic 20% rate
 * and adds it to your pension pot", and a Scottish 19% taxpayer's
 * provider "still claims at 20%".
 * https://www.gov.uk/tax-on-your-private-pension/pension-tax-relief
 */
export function reliefAtSource(contribution: number, year: YearLabel): number {
  const basic = taxBandByName(
    getTaxYearConfig(taxYear(year), TAX_REGIONS.rUK),
    TAX_BAND_NAMES.basicRate,
  ).rate;
  return charge(contribution, basic);
}

/** Auto-enrolment's base: pay within the qualifying earnings band. */
function qualifyingEarnings(gross: number, config: TaxYearConfig): number {
  const {lowerThreshold, upperThreshold} = config.qualifyingEarnings;
  return Math.max(0, Math.min(gross, upperThreshold) - lowerThreshold);
}
