// Take-home pay in the rest of the UK with an auto-enrolment pension, on
// qualifying earnings, from no pay up through each band, to where the
// allowance taper starts and past where the allowance is gone; no case
// sits inside the taper.
//
// The figures are this model's own output, not a published source. They
// pin today's behaviour, so an unintended change fails; they cannot show
// a rule is wrong, because a wrong rule produces them too. Where a rule
// changes, a row is re-derived by hand from its own taxable income, never
// regenerated from the model. The check against HMRC's own figures is
// `tests/regression/hmrc.test.ts`.

import {autoEnrolment} from '../../../scenario';
import type {Scenario} from '../../../scenario';

export const AUTO_ENROLMENT = [
  {
    case: 'No pay, 5% auto-enrolment pension, 2024-25: nothing to tax',
    given: {year: '2024-25', region: 'rUK', gross: 0, pension: autoEnrolment(5)},
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
    case: '£5,000, 5% auto-enrolment pension, 2024-25: all within the Personal '
      + 'Allowance, so no income tax and no NI',
    given: {year: '2024-25', region: 'rUK', gross: 5000, pension: autoEnrolment(5)},
    expect: {
      pension:           0.00,
      taxableGross:  5_000.00,
      allowance:    12_570.00,
      bandTax:      [],
      incomeTax:         0.00,
      niByRate:     [0.00, 0.00],
      ni:                0.00,
      net:           5_000.00,
    },
  },
  {
    case: '£10,000, 5% auto-enrolment pension, 2024-25: all within the Personal '
      + 'Allowance, so no income tax and no NI',
    given: {year: '2024-25', region: 'rUK', gross: 10_000, pension: autoEnrolment(5)},
    expect: {
      pension:         188.00,
      taxableGross:  9_812.00,
      allowance:    12_570.00,
      bandTax:      [],
      incomeTax:         0.00,
      niByRate:     [0.00, 0.00],
      ni:                0.00,
      net:           9_812.00,
    },
  },
  {
    case: '£12,570, 5% auto-enrolment pension, 2024-25: all within the Personal '
      + 'Allowance, so no income tax and no NI',
    given: {year: '2024-25', region: 'rUK', gross: 12_570, pension: autoEnrolment(5)},
    expect: {
      pension:         317.00,
      taxableGross: 12_253.00,
      allowance:    12_570.00,
      bandTax:      [],
      incomeTax:         0.00,
      niByRate:     [0.00, 0.00],
      ni:                0.00,
      net:          12_253.00,
    },
  },
  {
    case: '£30,000, 5% auto-enrolment pension, 2024-25: income tax at the basic rate '
      + 'only',
    given: {year: '2024-25', region: 'rUK', gross: 30_000, pension: autoEnrolment(5)},
    expect: {
      pension:       1_188.00,
      taxableGross: 28_812.00,
      allowance:    12_570.00,
      bandTax:      [3_246.60],
      incomeTax:     3_246.60,
      niByRate:     [1_394.40, 0.00],
      ni:            1_394.40,
      net:          24_171.00,
    },
  },
  {
    case: '£50,000, 5% auto-enrolment pension, 2024-25: income tax at the basic rate '
      + 'only',
    given: {year: '2024-25', region: 'rUK', gross: 50_000, pension: autoEnrolment(5)},
    expect: {
      pension:       2_188.00,
      taxableGross: 47_812.00,
      allowance:    12_570.00,
      bandTax:      [7_046.60],
      incomeTax:     7_046.60,
      niByRate:     [2_994.40, 0.00],
      ni:            2_994.40,
      net:          37_771.00,
    },
  },
  {
    case: '£60,000, 5% auto-enrolment pension, 2024-25: income tax reaching the '
      + 'higher rate and NI at 2% on pay over £50,270',
    given: {year: '2024-25', region: 'rUK', gross: 60_000, pension: autoEnrolment(5)},
    expect: {
      pension:       2_202.00,
      taxableGross: 57_798.00,
      allowance:    12_570.00,
      bandTax:      [7_540.00, 3_007.60],
      incomeTax:    10_547.60,
      niByRate:     [3_016.00, 194.60],
      ni:            3_210.60,
      net:          44_039.80,
    },
  },
  {
    case: '£100,000, 5% auto-enrolment pension, 2024-25: income tax reaching the '
      + 'higher rate and NI at 2% on pay over £50,270',
    given: {year: '2024-25', region: 'rUK', gross: 100_000, pension: autoEnrolment(5)},
    expect: {
      pension:       2_202.00,
      taxableGross: 97_798.00,
      allowance:    12_570.00,
      bandTax:      [7_540.00, 19_007.60],
      incomeTax:    26_547.60,
      niByRate:     [3_016.00, 994.60],
      ni:            4_010.60,
      net:          67_239.80,
    },
  },
  {
    case: '£125,140, 5% auto-enrolment pension, 2024-25: the allowance cut to £1,101 '
      + 'by the taper, income tax reaching the higher rate and NI at 2% on pay over '
      + '£50,270',
    given: {year: '2024-25', region: 'rUK', gross: 125_140, pension: autoEnrolment(5)},
    expect: {
      pension:        2_202.00,
      taxableGross: 122_938.00,
      allowance:      1_101.00,
      bandTax:      [7_540.00, 33_651.20],
      incomeTax:     41_191.20,
      niByRate:     [3_016.00, 1_497.40],
      ni:             4_513.40,
      net:           77_233.40,
    },
  },
  {
    case: '£150,000, 5% auto-enrolment pension, 2024-25: the allowance fully '
      + 'withdrawn, income tax reaching the additional rate and NI at 2% on pay over '
      + '£50,270',
    given: {year: '2024-25', region: 'rUK', gross: 150_000, pension: autoEnrolment(5)},
    expect: {
      pension:        2_202.00,
      taxableGross: 147_798.00,
      allowance:          0.00,
      bandTax:      [7_540.00, 34_976.00, 10_196.10],
      incomeTax:     52_712.10,
      niByRate:     [3_016.00, 1_994.60],
      ni:             5_010.60,
      net:           90_075.30,
    },
  },
] as const satisfies readonly Scenario[];
