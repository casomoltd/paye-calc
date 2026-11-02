/**
 * What each pension basis does to pay: one row per basis, read by every
 * calculation that depends on it, so no path can treat a basis
 * differently from another.
 */

import {PensionBasis} from './types.js';
import type {TaxYearConfig} from './TaxYearConfig.js';

/** How a pension on one basis is taken, taxed and counted. */
export interface BasisRules {
  /** The pay a percentage contribution is a share of. */
  readonly earningsBase: (gross: number, config: TaxYearConfig) => number;
  /** Taken before income tax (net pay, auto-enrolment, sacrifice). */
  readonly beforeTax: boolean;
  /** Taken before the pay NI and student loans are worked on. */
  readonly beforeNi: boolean;
  /** How the annual-allowance tests, and relief at source, count it. */
  readonly split: (contribution: number) => ContributionSplit;
}

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
 * A year's contribution as the allowance tests see it: a net-pay
 * member contribution, a salary sacrifice (an employer contribution),
 * or a relief-at-source contribution, on which the provider claims
 * basic-rate relief.
 */
export interface ContributionSplit {
  readonly member: number;
  readonly sacrifice: number;
  readonly reliefAtSource: number;
}

const NOTHING: ContributionSplit = {member: 0, sacrifice: 0, reliefAtSource: 0};

/** Auto-enrolment's base: pay within the qualifying earnings band. */
function qualifyingEarnings(gross: number, config: TaxYearConfig): number {
  const {lowerThreshold, upperThreshold} = config.qualifyingEarnings;
  return Math.max(0, Math.min(gross, upperThreshold) - lowerThreshold);
}
