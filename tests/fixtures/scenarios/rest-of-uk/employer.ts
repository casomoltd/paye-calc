// Take-home pay in the rest of the UK with an employer pension on the
// net pay arrangement, before tax, from no pay up through each band, to
// where the allowance taper starts and past where the allowance is gone;
// no case sits inside the taper.
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
    given: {year: '2024-25', region: 'rUK', gross: 0, pension: employer(5)},
    expect: {
      pension:           0.00,
      taxableGross:      0.00,
      allowance:    12_570.00,
      bandTax:      [],
      incomeTax:         0.00,
      niByRate:     [0.00, 0.00],
      ni:                0.00,
      net:               0.00,
    },
  },
  {
    case: '£5,000, 5% employer pension, 2024-25: all within the Personal Allowance, '
      + 'so no income tax and no NI',
    given: {year: '2024-25', region: 'rUK', gross: 5000, pension: employer(5)},
    expect: {
      pension:         250.00,
      taxableGross:  4_750.00,
      allowance:    12_570.00,
      bandTax:      [],
      incomeTax:         0.00,
      niByRate:     [0.00, 0.00],
      ni:                0.00,
      net:           4_750.00,
    },
  },
  {
    case: '£10,000, 5% employer pension, 2024-25: all within the Personal Allowance, '
      + 'so no income tax and no NI',
    given: {year: '2024-25', region: 'rUK', gross: 10_000, pension: employer(5)},
    expect: {
      pension:         500.00,
      taxableGross:  9_500.00,
      allowance:    12_570.00,
      bandTax:      [],
      incomeTax:         0.00,
      niByRate:     [0.00, 0.00],
      ni:                0.00,
      net:           9_500.00,
    },
  },
  {
    case: '£12,570, 5% employer pension, 2024-25: all within the Personal Allowance, '
      + 'so no income tax and no NI',
    given: {year: '2024-25', region: 'rUK', gross: 12_570, pension: employer(5)},
    expect: {
      pension:         629.00,
      taxableGross: 11_941.00,
      allowance:    12_570.00,
      bandTax:      [],
      incomeTax:         0.00,
      niByRate:     [0.00, 0.00],
      ni:                0.00,
      net:          11_941.00,
    },
  },
  {
    case: '£30,000, 5% employer pension, 2024-25: income tax at the basic rate only',
    given: {year: '2024-25', region: 'rUK', gross: 30_000, pension: employer(5)},
    expect: {
      pension:       1_500.00,
      taxableGross: 28_500.00,
      allowance:    12_570.00,
      bandTax:      [3_184.20],
      incomeTax:     3_184.20,
      niByRate:     [1_394.40, 0.00],
      ni:            1_394.40,
      net:          23_921.40,
    },
  },
  {
    case: '£50,000, 5% employer pension, 2024-25: income tax at the basic rate only',
    given: {year: '2024-25', region: 'rUK', gross: 50_000, pension: employer(5)},
    expect: {
      pension:       2_500.00,
      taxableGross: 47_500.00,
      allowance:    12_570.00,
      bandTax:      [6_984.20],
      incomeTax:     6_984.20,
      niByRate:     [2_994.40, 0.00],
      ni:            2_994.40,
      net:          37_521.40,
    },
  },
  {
    case: '£60,000, 5% employer pension, 2024-25: income tax reaching the higher rate '
      + 'and NI at 2% on pay over £50,270',
    given: {year: '2024-25', region: 'rUK', gross: 60_000, pension: employer(5)},
    expect: {
      pension:       3_000.00,
      taxableGross: 57_000.00,
      allowance:    12_570.00,
      bandTax:      [7_540.00, 2_688.40],
      incomeTax:    10_228.40,
      niByRate:     [3_016.00, 194.60],
      ni:            3_210.60,
      net:          43_561.00,
    },
  },
  {
    case: '£100,000, 5% employer pension, 2024-25: income tax reaching the higher '
      + 'rate and NI at 2% on pay over £50,270',
    given: {year: '2024-25', region: 'rUK', gross: 100_000, pension: employer(5)},
    expect: {
      pension:       5_000.00,
      taxableGross: 95_000.00,
      allowance:    12_570.00,
      bandTax:      [7_540.00, 17_888.40],
      incomeTax:    25_428.40,
      niByRate:     [3_016.00, 994.60],
      ni:            4_010.60,
      net:          65_561.00,
    },
  },
  {
    case: '£125,140, 5% employer pension, 2024-25: the allowance cut to £3,129 by the '
      + 'taper, income tax reaching the higher rate and NI at 2% on pay over £50,270',
    given: {year: '2024-25', region: 'rUK', gross: 125_140, pension: employer(5)},
    expect: {
      pension:        6_257.00,
      taxableGross: 118_883.00,
      allowance:      3_129.00,
      bandTax:      [7_540.00, 31_218.00],
      incomeTax:     38_758.00,
      niByRate:     [3_016.00, 1_497.40],
      ni:             4_513.40,
      net:           75_611.60,
    },
  },
  {
    case: '£150,000, 5% employer pension, 2024-25: the allowance fully withdrawn, '
      + 'income tax reaching the additional rate and NI at 2% on pay over £50,270',
    given: {year: '2024-25', region: 'rUK', gross: 150_000, pension: employer(5)},
    expect: {
      pension:        7_500.00,
      taxableGross: 142_500.00,
      allowance:          0.00,
      bandTax:      [7_540.00, 34_976.00, 7_812.00],
      incomeTax:     50_328.00,
      niByRate:     [3_016.00, 1_994.60],
      ni:             5_010.60,
      net:           87_161.40,
    },
  },
  {
    case: '£100,000, 5% employer pension, 2026-27: income tax reaching the higher '
      + 'rate and NI at 2% on pay over £50,270',
    given: {year: '2026-27', region: 'rUK', gross: 100_000, pension: employer(5)},
    expect: {
      pension:       5_000.00,
      taxableGross: 95_000.00,
      allowance:    12_570.00,
      bandTax:      [7_540.00, 17_888.40],
      incomeTax:    25_428.40,
      niByRate:     [3_016.00, 994.60],
      ni:            4_010.60,
      net:          65_561.00,
    },
  },
] as const satisfies readonly Scenario[];
