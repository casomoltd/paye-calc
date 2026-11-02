// Student loan repayments on one plan at a time (1, 2, 4, 5 and
// Postgraduate), at, below and above each plan's repayment threshold.
//
// The figures are this model's own output, not a published source. They
// pin today's behaviour, so an unintended change fails; they cannot show
// a rule is wrong, because a wrong rule produces them too. Where a rule
// changes, a row is re-derived by hand from its own taxable income, never
// regenerated from the model. The check against HMRC's own figures is
// `tests/regression/hmrc.test.ts`.

import {StudentLoanPlan} from '../../../../src/types';
import type {Scenario} from '../../../scenario';

export const SINGLE_PLAN = [
  {
    case: '£20,000, Plan 1 loan, 2024-25: under the Plan 1 threshold of £24,990, so '
      + 'nothing to repay',
    given: {
      year: '2024-25',
      region: 'rUK',
      gross: 20_000,
      loans: [StudentLoanPlan.Plan1],
    },
    expect: {
      studentLoan:      0.00,
      net:         17_921.40,
    },
  },
  {
    case: '£24,990, Plan 1 loan, 2024-25: exactly at the Plan 1 threshold, so nothing '
      + 'to repay',
    given: {
      year: '2024-25',
      region: 'rUK',
      gross: 24_990,
      loans: [StudentLoanPlan.Plan1],
    },
    expect: {
      studentLoan:      0.00,
      net:         21_514.20,
    },
  },
  {
    case: '£30,000, Plan 1 loan, 2024-25: repays 9% of pay over £24,990',
    given: {
      year: '2024-25',
      region: 'rUK',
      gross: 30_000,
      loans: [StudentLoanPlan.Plan1],
    },
    expect: {
      studentLoan:    450.90,
      net:         24_670.50,
    },
  },
  {
    case: '£50,000, Plan 1 loan, 2024-25: repays 9% of pay over £24,990',
    given: {
      year: '2024-25',
      region: 'rUK',
      gross: 50_000,
      loans: [StudentLoanPlan.Plan1],
    },
    expect: {
      studentLoan:  2_250.90,
      net:         37_270.50,
    },
  },
  {
    case: '£25,000, Plan 2 loan, 2024-25: under the Plan 2 threshold of £27,295, so '
      + 'nothing to repay',
    given: {
      year: '2024-25',
      region: 'rUK',
      gross: 25_000,
      loans: [StudentLoanPlan.Plan2],
    },
    expect: {
      studentLoan:      0.00,
      net:         21_521.40,
    },
  },
  {
    case: '£27,295, Plan 2 loan, 2024-25: exactly at the Plan 2 threshold, so nothing '
      + 'to repay',
    given: {
      year: '2024-25',
      region: 'rUK',
      gross: 27_295,
      loans: [StudentLoanPlan.Plan2],
    },
    expect: {
      studentLoan:      0.00,
      net:         23_173.80,
    },
  },
  {
    case: '£35,000, Plan 2 loan, 2024-25: repays 9% of pay over £27,295',
    given: {
      year: '2024-25',
      region: 'rUK',
      gross: 35_000,
      loans: [StudentLoanPlan.Plan2],
    },
    expect: {
      studentLoan:    693.45,
      net:         28_027.95,
    },
  },
  {
    case: '£60,000, Plan 2 loan, 2024-25: repays 9% of pay over £27,295',
    given: {
      year: '2024-25',
      region: 'rUK',
      gross: 60_000,
      loans: [StudentLoanPlan.Plan2],
    },
    expect: {
      studentLoan:  2_943.45,
      net:         42_417.55,
    },
  },
  {
    case: '£25,000, Plan 4 loan, 2024-25: under the Plan 4 threshold of £31,395, so '
      + 'nothing to repay',
    given: {
      year: '2024-25',
      region: 'rUK',
      gross: 25_000,
      loans: [StudentLoanPlan.Plan4],
    },
    expect: {
      studentLoan:      0.00,
      net:         21_521.40,
    },
  },
  {
    case: '£35,000, Plan 4 loan, 2024-25: repays 9% of pay over £31,395',
    given: {
      year: '2024-25',
      region: 'rUK',
      gross: 35_000,
      loans: [StudentLoanPlan.Plan4],
    },
    expect: {
      studentLoan:    324.45,
      net:         28_396.95,
    },
  },
  {
    case: '£50,000, Plan 4 loan, 2024-25: repays 9% of pay over £31,395',
    given: {
      year: '2024-25',
      region: 'rUK',
      gross: 50_000,
      loans: [StudentLoanPlan.Plan4],
    },
    expect: {
      studentLoan:  1_674.45,
      net:         37_846.95,
    },
  },
  {
    case: '£18,000, Postgraduate loan, 2024-25: under the Postgraduate threshold of '
      + '£21,000, so nothing to repay',
    given: {
      year: '2024-25',
      region: 'rUK',
      gross: 18_000,
      loans: [StudentLoanPlan.Postgraduate],
    },
    expect: {
      studentLoan:      0.00,
      net:         16_481.40,
    },
  },
  {
    case: '£21,000, Postgraduate loan, 2024-25: exactly at the Postgraduate '
      + 'threshold, so nothing to repay',
    given: {
      year: '2024-25',
      region: 'rUK',
      gross: 21_000,
      loans: [StudentLoanPlan.Postgraduate],
    },
    expect: {
      studentLoan:      0.00,
      net:         18_641.40,
    },
  },
  {
    case: '£30,000, Postgraduate loan, 2024-25: repays 6% of pay over £21,000',
    given: {
      year: '2024-25',
      region: 'rUK',
      gross: 30_000,
      loans: [StudentLoanPlan.Postgraduate],
    },
    expect: {
      studentLoan:    540.00,
      net:         24_581.40,
    },
  },
  {
    case: '£50,000, Postgraduate loan, 2024-25: repays 6% of pay over £21,000',
    given: {
      year: '2024-25',
      region: 'rUK',
      gross: 50_000,
      loans: [StudentLoanPlan.Postgraduate],
    },
    expect: {
      studentLoan:  1_740.00,
      net:         37_781.40,
    },
  },
  {
    case: '£25,000, Plan 1 loan, 2023-24: repays 9% of pay over £22,015',
    given: {
      year: '2023-24',
      region: 'rUK',
      gross: 25_000,
      loans: [StudentLoanPlan.Plan1],
    },
    expect: {
      studentLoan:    268.65,
      net:         20_755.55,
    },
  },
  {
    case: '£20,000, Plan 5 loan, 2025-26: under the Plan 5 threshold of £25,000, so '
      + 'nothing to repay',
    given: {
      year: '2025-26',
      region: 'rUK',
      gross: 20_000,
      loans: [StudentLoanPlan.Plan5],
    },
    expect: {
      studentLoan:      0.00,
      net:         17_921.40,
    },
  },
  {
    case: '£25,000, Plan 5 loan, 2025-26: exactly at the Plan 5 threshold, so nothing '
      + 'to repay',
    given: {
      year: '2025-26',
      region: 'rUK',
      gross: 25_000,
      loans: [StudentLoanPlan.Plan5],
    },
    expect: {
      studentLoan:      0.00,
      net:         21_521.40,
    },
  },
  {
    case: '£30,000, Plan 5 loan, 2025-26: repays 9% of pay over £25,000',
    given: {
      year: '2025-26',
      region: 'rUK',
      gross: 30_000,
      loans: [StudentLoanPlan.Plan5],
    },
    expect: {
      studentLoan:    450.00,
      net:         24_671.40,
    },
  },
  {
    case: '£50,000, Plan 5 loan, 2025-26: repays 9% of pay over £25,000',
    given: {
      year: '2025-26',
      region: 'rUK',
      gross: 50_000,
      loans: [StudentLoanPlan.Plan5],
    },
    expect: {
      studentLoan:  2_250.00,
      net:         37_271.40,
    },
  },
  {
    case: '£30,000, Plan 1 loan, 2025-26: repays 9% of pay over £26,065',
    given: {
      year: '2025-26',
      region: 'rUK',
      gross: 30_000,
      loans: [StudentLoanPlan.Plan1],
    },
    expect: {
      studentLoan:    354.15,
      net:         24_767.25,
    },
  },
  {
    case: '£50,000, Plan 1 loan, 2025-26: repays 9% of pay over £26,065',
    given: {
      year: '2025-26',
      region: 'rUK',
      gross: 50_000,
      loans: [StudentLoanPlan.Plan1],
    },
    expect: {
      studentLoan:  2_154.15,
      net:         37_367.25,
    },
  },
  {
    case: '£35,000, Plan 2 loan, 2025-26: repays 9% of pay over £28,470',
    given: {
      year: '2025-26',
      region: 'rUK',
      gross: 35_000,
      loans: [StudentLoanPlan.Plan2],
    },
    expect: {
      studentLoan:    587.70,
      net:         28_133.70,
    },
  },
  {
    case: '£35,000, Plan 4 loan, 2025-26: repays 9% of pay over £32,745',
    given: {
      year: '2025-26',
      region: 'rUK',
      gross: 35_000,
      loans: [StudentLoanPlan.Plan4],
    },
    expect: {
      studentLoan:    202.95,
      net:         28_518.45,
    },
  },
  {
    case: '£30,000, Plan 1 loan, 2026-27: repays 9% of pay over £26,900',
    given: {
      year: '2026-27',
      region: 'rUK',
      gross: 30_000,
      loans: [StudentLoanPlan.Plan1],
    },
    expect: {
      studentLoan:    279.00,
      net:         24_842.40,
    },
  },
  {
    case: '£50,000, Plan 1 loan, 2026-27: repays 9% of pay over £26,900',
    given: {
      year: '2026-27',
      region: 'rUK',
      gross: 50_000,
      loans: [StudentLoanPlan.Plan1],
    },
    expect: {
      studentLoan:  2_079.00,
      net:         37_442.40,
    },
  },
  {
    case: '£35,000, Plan 2 loan, 2026-27: repays 9% of pay over £29,385',
    given: {
      year: '2026-27',
      region: 'rUK',
      gross: 35_000,
      loans: [StudentLoanPlan.Plan2],
    },
    expect: {
      studentLoan:    505.35,
      net:         28_216.05,
    },
  },
  {
    case: '£35,000, Plan 4 loan, 2026-27: repays 9% of pay over £33,795',
    given: {
      year: '2026-27',
      region: 'rUK',
      gross: 35_000,
      loans: [StudentLoanPlan.Plan4],
    },
    expect: {
      studentLoan:    108.45,
      net:         28_612.95,
    },
  },
] as const satisfies readonly Scenario[];
