// The tapered pension annual allowance at its edges: the adjusted-income
// limit, the threshold-income gate, the £10,000 floor and the rounding
// of an odd pound. The rows follow the taper rules in HMRC's Pensions
// Tax Manual (PTM057100); the case "Adjusted income of £300,000 takes £20,000 off" is
// confirmed against HMRC's own PAAC tool (`docs/verification.md`), and
// the "Jon" case builds the
// incomes of the manual's worked example "Jon" (PTM057200) from their
// components.

import type {YearLabel} from '../../src/types';

/** The incomes the taper reads, given directly. */
interface Incomes {
  readonly adjusted: number;
  readonly threshold: number;
}

/** The incomes built from their components. */
interface Components {
  readonly netIncome: number;
  readonly memberContributions: number;
  readonly reliefAtSourceContributions: number;
  readonly employerContributions: number;
  readonly newSalarySacrifice: number;
}

export interface TaperCase {
  readonly case: string;
  readonly year: YearLabel;
  readonly given: Incomes | Components;
  /** Built incomes are pinned too, before the allowance they give. */
  readonly expect: Partial<Incomes> & {readonly allowance: number};
}

export const TAPER = [
  {
    case: 'Adjusted income under the £260,000 limit, so the full allowance',
    year: '2025-26',
    given: {
      adjusted:  250_000,
      threshold: 210_000,
    },
    expect: {
      allowance: 60_000,
    },
  },
  {
    case: 'Threshold income at the £200,000 limit, so no taper however high adjusted '
      + 'income is',
    year: '2025-26',
    given: {
      adjusted:  300_000,
      threshold: 200_000,
    },
    expect: {
      allowance: 60_000,
    },
  },
  {
    case: 'Threshold income £1 under its limit, so no taper even at £400,000 adjusted '
      + 'income',
    year: '2025-26',
    given: {
      adjusted:  400_000,
      threshold: 199_999,
    },
    expect: {
      allowance: 60_000,
    },
  },
  {
    case: 'Adjusted income exactly at the £260,000 limit, so no taper yet',
    year: '2025-26',
    given: {
      adjusted:  260_000,
      threshold: 210_000,
    },
    expect: {
      allowance: 60_000,
    },
  },
  {
    case: 'Adjusted income £2 over the limit takes £1 off the allowance',
    year: '2025-26',
    given: {
      adjusted:  260_002,
      threshold: 210_000,
    },
    expect: {
      allowance: 59_999,
    },
  },
  {
    case: 'Adjusted income of £300,000 takes £20,000 off, as HMRC\'s own PAAC tool '
      + 'also gives',
    year: '2025-26',
    given: {
      adjusted:  300_000,
      threshold: 210_000,
    },
    expect: {
      allowance: 40_000,
    },
  },
  {
    case: 'Adjusted income an odd number of pounds over the limit: the cut rounds down',
    year: '2025-26',
    given: {
      adjusted:  277_979,
      threshold: 210_000,
    },
    expect: {
      allowance: 51_011,
    },
  },
  {
    case: 'Adjusted income of £360,000 tapers the allowance down to its £10,000 floor',
    year: '2025-26',
    given: {
      adjusted:  360_000,
      threshold: 210_000,
    },
    expect: {
      allowance: 10_000,
    },
  },
  {
    case: 'Adjusted income of £400,000 cannot take the allowance below its £10,000 '
      + 'floor',
    year: '2025-26',
    given: {
      adjusted:  400_000,
      threshold: 210_000,
    },
    expect: {
      allowance: 10_000,
    },
  },
  {
    case: 'The Pensions Tax Manual\'s £160,000 example, moved up to today\'s limits',
    year: '2025-26',
    given: {
      adjusted:  270_000,
      threshold: 210_000,
    },
    expect: {
      allowance: 55_000,
    },
  },
  {
    case: 'The Pensions Tax Manual\'s worked example "Jon", incomes built from '
      + 'pay and pension: under today\'s limits the full £60,000 (the manual\'s '
      + 'own answer, under its older limits, is £25,750)',
    year: '2025-26',
    given: {
      netIncome:                   144_500,
      memberContributions:          14_000,
      reliefAtSourceContributions:   5_400,
      employerContributions:        20_000,
      newSalarySacrifice:                0,
    },
    expect: {
      threshold: 139_100,
      adjusted:  178_500,
      allowance:  60_000,
    },
  },
] as const satisfies readonly TaperCase[];
