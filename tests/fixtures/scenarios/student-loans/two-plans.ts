// Student loan repayments on two plans at once, each worked against
// its own threshold.
//
// The figures are this model's own output, not a published source. They
// pin today's behaviour, so an unintended change fails; they cannot show
// a rule is wrong, because a wrong rule produces them too. Where a rule
// changes, a row is re-derived by hand from its own taxable income, never
// regenerated from the model. The check against HMRC's own figures is
// `tests/regression/hmrc.test.ts`.

import {StudentLoanPlan} from '../../../../src/types';
import type {Scenario} from '../../../scenario';

export const TWO_PLANS = [
  {
    case: '£35,000, Plan 2 and Postgraduate loans, 2024-25: repays 9% of pay over '
      + '£27,295 and 6% of pay over £21,000, each plan on its own',
    given: {
      year: '2024-25',
      region: 'rUK',
      gross: 35_000,
      loans: [StudentLoanPlan.Plan2, StudentLoanPlan.Postgraduate],
    },
    expect: {
      studentLoan:  1_533.45,
      net:         27_187.95,
    },
  },
  {
    case: '£50,000, Plan 2 and Postgraduate loans, 2024-25: repays 9% of pay over '
      + '£27,295 and 6% of pay over £21,000, each plan on its own',
    given: {
      year: '2024-25',
      region: 'rUK',
      gross: 50_000,
      loans: [StudentLoanPlan.Plan2, StudentLoanPlan.Postgraduate],
    },
    expect: {
      studentLoan:  3_783.45,
      net:         35_737.95,
    },
  },
  {
    case: '£30,000, Plan 1 and Postgraduate loans, 2024-25: repays 9% of pay over '
      + '£24,990 and 6% of pay over £21,000, each plan on its own',
    given: {
      year: '2024-25',
      region: 'rUK',
      gross: 30_000,
      loans: [StudentLoanPlan.Plan1, StudentLoanPlan.Postgraduate],
    },
    expect: {
      studentLoan:    990.90,
      net:         24_130.50,
    },
  },
] as const satisfies readonly Scenario[];
