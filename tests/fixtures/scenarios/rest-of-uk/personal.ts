// Take-home pay in the rest of the UK with a personal pension with
// relief at source, from no pay up through each band, to where the
// allowance taper starts and past where the allowance is gone; no case
// sits inside the taper.
//
// The figures are this model's own output, not a published source. They
// pin today's behaviour, so an unintended change fails; they cannot show
// a rule is wrong, because a wrong rule produces them too. Where a rule
// changes, a row is re-derived by hand from its own taxable income, never
// regenerated from the model. The check against HMRC's own figures is
// `tests/regression/hmrc.test.ts`.

import {personal} from '../../../scenario';
import type {Scenario} from '../../../scenario';

export const PERSONAL = [
  {
    case: 'No pay, 5% personal pension, 2024-25: nothing to tax',
    given: {year: '2024-25', region: 'rUK', gross: 0, pension: personal(5)},
    expect: {
      pension:           0.00,
      taxableGross:      0.00,
      allowance:    12_570.00,
      bandTax:      [],
      incomeTax:         0.00,
      niByRate:     [0.00, 0.00],
      ni:                0.00,
      taxRelief:         0.00,
      net:               0.00,
    },
  },
  {
    case: '£5,000, 5% personal pension, 2024-25: all within the Personal Allowance, '
      + 'so no income tax and no NI',
    given: {year: '2024-25', region: 'rUK', gross: 5000, pension: personal(5)},
    expect: {
      pension:         250.00,
      taxableGross:  5_000.00,
      allowance:    12_570.00,
      bandTax:      [],
      incomeTax:         0.00,
      niByRate:     [0.00, 0.00],
      ni:                0.00,
      taxRelief:        50.00,
      net:           4_800.00,
    },
  },
  {
    case: '£10,000, 5% personal pension, 2024-25: all within the Personal Allowance, '
      + 'so no income tax and no NI',
    given: {year: '2024-25', region: 'rUK', gross: 10_000, pension: personal(5)},
    expect: {
      pension:         500.00,
      taxableGross: 10_000.00,
      allowance:    12_570.00,
      bandTax:      [],
      incomeTax:         0.00,
      niByRate:     [0.00, 0.00],
      ni:                0.00,
      taxRelief:       100.00,
      net:           9_600.00,
    },
  },
  {
    case: '£12,570, 5% personal pension, 2024-25: all within the Personal Allowance, '
      + 'so no income tax and no NI',
    given: {year: '2024-25', region: 'rUK', gross: 12_570, pension: personal(5)},
    expect: {
      pension:         629.00,
      taxableGross: 12_570.00,
      allowance:    12_570.00,
      bandTax:      [],
      incomeTax:         0.00,
      niByRate:     [0.00, 0.00],
      ni:                0.00,
      taxRelief:       125.80,
      net:          12_066.80,
    },
  },
  {
    case: '£30,000, 5% personal pension, 2024-25: income tax at the basic rate only',
    given: {year: '2024-25', region: 'rUK', gross: 30_000, pension: personal(5)},
    expect: {
      pension:       1_500.00,
      taxableGross: 30_000.00,
      allowance:    12_570.00,
      bandTax:      [3_484.20],
      incomeTax:     3_484.20,
      niByRate:     [1_394.40, 0.00],
      ni:            1_394.40,
      taxRelief:       300.00,
      net:          23_921.40,
    },
  },
  {
    case: '£50,000, 5% personal pension, 2024-25: income tax at the basic rate only',
    given: {year: '2024-25', region: 'rUK', gross: 50_000, pension: personal(5)},
    expect: {
      pension:       2_500.00,
      taxableGross: 50_000.00,
      allowance:    12_570.00,
      bandTax:      [7_484.20],
      incomeTax:     7_484.20,
      niByRate:     [2_994.40, 0.00],
      ni:            2_994.40,
      taxRelief:       500.00,
      net:          37_521.40,
    },
  },
  {
    case: '£60,000, 5% personal pension, 2024-25: income tax reaching the higher rate '
      + 'and NI at 2% on pay over £50,270',
    given: {year: '2024-25', region: 'rUK', gross: 60_000, pension: personal(5)},
    expect: {
      pension:       3_000.00,
      taxableGross: 60_000.00,
      allowance:    12_570.00,
      bandTax:      [7_540.00, 3_888.40],
      incomeTax:    11_428.40,
      niByRate:     [3_016.00, 194.60],
      ni:            3_210.60,
      taxRelief:       600.00,
      net:          42_961.00,
    },
  },
  {
    case: '£100,000, 5% personal pension, 2024-25: income tax reaching the higher '
      + 'rate and NI at 2% on pay over £50,270',
    given: {year: '2024-25', region: 'rUK', gross: 100_000, pension: personal(5)},
    expect: {
      pension:        5_000.00,
      taxableGross: 100_000.00,
      allowance:     12_570.00,
      bandTax:      [7_540.00, 19_888.40],
      incomeTax:     27_428.40,
      niByRate:     [3_016.00, 994.60],
      ni:             4_010.60,
      taxRelief:      1_000.00,
      net:           64_561.00,
    },
  },
  {
    case: '£125,140, 5% personal pension, 2024-25: the allowance fully withdrawn, '
      + 'income tax reaching the higher rate and NI at 2% on pay over £50,270',
    given: {year: '2024-25', region: 'rUK', gross: 125_140, pension: personal(5)},
    expect: {
      pension:        6_257.00,
      taxableGross: 125_140.00,
      allowance:          0.00,
      bandTax:      [7_540.00, 34_972.40],
      incomeTax:     42_512.40,
      niByRate:     [3_016.00, 1_497.40],
      ni:             4_513.40,
      taxRelief:      1_251.40,
      net:           73_108.60,
    },
  },
  {
    case: '£150,000, 5% personal pension, 2024-25: the allowance fully withdrawn, '
      + 'income tax reaching the additional rate and NI at 2% on pay over £50,270',
    given: {year: '2024-25', region: 'rUK', gross: 150_000, pension: personal(5)},
    expect: {
      pension:        7_500.00,
      taxableGross: 150_000.00,
      allowance:          0.00,
      bandTax:      [7_540.00, 34_976.00, 11_187.00],
      incomeTax:     53_703.00,
      niByRate:     [3_016.00, 1_994.60],
      ni:             5_010.60,
      taxRelief:      1_500.00,
      net:           85_286.40,
    },
  },
] as const satisfies readonly Scenario[];
