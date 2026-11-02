// Take-home pay in Scotland with an employer pension on the net pay
// arrangement, before tax, from no pay up through each band, to where
// the allowance taper starts and past where the allowance is gone; no
// case sits inside the taper.
//
// The figures are this model's own output, not a published source. They
// pin today's behaviour, so an unintended change fails; they cannot show
// a rule is wrong, because a wrong rule produces them too. Where a rule
// changes, a row is re-derived by hand from its own taxable income, never
// regenerated from the model. The check against HMRC's own figures is
// `tests/regression/hmrc.test.ts`.

import {employer} from '../../../scenario';
import type {Scenario} from '../../../scenario';

export const EMPLOYER = [
  {
    case: 'No pay, 5% employer pension, 2024-25: nothing to tax',
    given: {year: '2024-25', region: 'scotland', gross: 0, pension: employer(5)},
    expect: {
      pension:           0.00,
      taxableGross:      0.00,
      allowance:    12_570.00,
      incomeTax:         0.00,
      ni:                0.00,
      net:               0.00,
    },
  },
  {
    case: '£5,000, 5% employer pension, 2024-25: all within the Personal Allowance, '
      + 'so no income tax and no NI',
    given: {year: '2024-25', region: 'scotland', gross: 5000, pension: employer(5)},
    expect: {
      pension:         250.00,
      taxableGross:  4_750.00,
      allowance:    12_570.00,
      incomeTax:         0.00,
      ni:                0.00,
      net:           4_750.00,
    },
  },
  {
    case: '£10,000, 5% employer pension, 2024-25: all within the Personal Allowance, '
      + 'so no income tax and no NI',
    given: {year: '2024-25', region: 'scotland', gross: 10_000, pension: employer(5)},
    expect: {
      pension:         500.00,
      taxableGross:  9_500.00,
      allowance:    12_570.00,
      incomeTax:         0.00,
      ni:                0.00,
      net:           9_500.00,
    },
  },
  {
    case: '£12,570, 5% employer pension, 2024-25: all within the Personal Allowance, '
      + 'so no income tax and no NI',
    given: {year: '2024-25', region: 'scotland', gross: 12_570, pension: employer(5)},
    expect: {
      pension:         629.00,
      taxableGross: 11_941.00,
      allowance:    12_570.00,
      incomeTax:         0.00,
      ni:                0.00,
      net:          11_941.00,
    },
  },
  {
    case: '£30,000, 5% employer pension, 2024-25: income tax reaching the '
      + 'intermediate rate',
    given: {year: '2024-25', region: 'scotland', gross: 30_000, pension: employer(5)},
    expect: {
      pension:       1_500.00,
      taxableGross: 28_500.00,
      allowance:    12_570.00,
      incomeTax:     3_180.44,
      ni:            1_394.40,
      net:          23_925.16,
    },
  },
  {
    case: '£50,000, 5% employer pension, 2024-25: income tax reaching the higher rate',
    given: {year: '2024-25', region: 'scotland', gross: 50_000, pension: employer(5)},
    expect: {
      pension:       2_500.00,
      taxableGross: 47_500.00,
      allowance:    12_570.00,
      incomeTax:     7_974.53,
      ni:            2_994.40,
      net:          36_531.07,
    },
  },
  {
    case: '£60,000, 5% employer pension, 2024-25: income tax reaching the higher rate '
      + 'and NI at 2% on pay over £50,270',
    given: {year: '2024-25', region: 'scotland', gross: 60_000, pension: employer(5)},
    expect: {
      pension:       3_000.00,
      taxableGross: 57_000.00,
      allowance:    12_570.00,
      incomeTax:    11_964.53,
      ni:            3_210.60,
      net:          41_824.87,
    },
  },
  {
    case: '£100,000, 5% employer pension, 2024-25: income tax reaching the advanced '
      + 'rate and NI at 2% on pay over £50,270',
    given: {year: '2024-25', region: 'scotland', gross: 100_000, pension: employer(5)},
    expect: {
      pension:       5_000.00,
      taxableGross: 95_000.00,
      allowance:    12_570.00,
      incomeTax:    28_524.26,
      ni:            4_010.60,
      net:          62_465.14,
    },
  },
  {
    case: '£125,140, 5% employer pension, 2024-25: the allowance cut to £3,129 by the '
      + 'taper, income tax reaching the advanced rate and NI at 2% on pay over £50,270',
    given: {year: '2024-25', region: 'scotland', gross: 125_140, pension: employer(5)},
    expect: {
      pension:        6_257.00,
      taxableGross: 118_883.00,
      allowance:      3_129.00,
      incomeTax:     43_520.06,
      ni:             4_513.40,
      net:           70_849.54,
    },
  },
  {
    case: '£150,000, 5% employer pension, 2024-25: the allowance fully withdrawn, '
      + 'income tax reaching the top rate and NI at 2% on pay over £50,270',
    given: {year: '2024-25', region: 'scotland', gross: 150_000, pension: employer(5)},
    expect: {
      pension:        7_500.00,
      taxableGross: 142_500.00,
      allowance:          0.00,
      incomeTax:     56_080.61,
      ni:             5_010.60,
      net:           81_408.79,
    },
  },
] as const satisfies readonly Scenario[];
