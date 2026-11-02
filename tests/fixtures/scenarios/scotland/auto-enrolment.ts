// Take-home pay in Scotland with an auto-enrolment pension, on
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
    given: {year: '2024-25', region: 'scotland', gross: 0, pension: autoEnrolment(5)},
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
    case: '£5,000, 5% auto-enrolment pension, 2024-25: all within the Personal '
      + 'Allowance, so no income tax and no NI',
    given: {
      year: '2024-25',
      region: 'scotland',
      gross: 5000,
      pension: autoEnrolment(5),
    },
    expect: {
      pension:           0.00,
      taxableGross:  5_000.00,
      allowance:    12_570.00,
      incomeTax:         0.00,
      ni:                0.00,
      net:           5_000.00,
    },
  },
  {
    case: '£10,000, 5% auto-enrolment pension, 2024-25: all within the Personal '
      + 'Allowance, so no income tax and no NI',
    given: {
      year: '2024-25',
      region: 'scotland',
      gross: 10_000,
      pension: autoEnrolment(5),
    },
    expect: {
      pension:         188.00,
      taxableGross:  9_812.00,
      allowance:    12_570.00,
      incomeTax:         0.00,
      ni:                0.00,
      net:           9_812.00,
    },
  },
  {
    case: '£12,570, 5% auto-enrolment pension, 2024-25: all within the Personal '
      + 'Allowance, so no income tax and no NI',
    given: {
      year: '2024-25',
      region: 'scotland',
      gross: 12_570,
      pension: autoEnrolment(5),
    },
    expect: {
      pension:         317.00,
      taxableGross: 12_253.00,
      allowance:    12_570.00,
      incomeTax:         0.00,
      ni:                0.00,
      net:          12_253.00,
    },
  },
  {
    case: '£30,000, 5% auto-enrolment pension, 2024-25: income tax reaching the '
      + 'intermediate rate',
    given: {
      year: '2024-25',
      region: 'scotland',
      gross: 30_000,
      pension: autoEnrolment(5),
    },
    expect: {
      pension:       1_188.00,
      taxableGross: 28_812.00,
      allowance:    12_570.00,
      incomeTax:     3_245.96,
      ni:            1_394.40,
      net:          24_171.64,
    },
  },
  {
    case: '£50,000, 5% auto-enrolment pension, 2024-25: income tax reaching the '
      + 'higher rate',
    given: {
      year: '2024-25',
      region: 'scotland',
      gross: 50_000,
      pension: autoEnrolment(5),
    },
    expect: {
      pension:       2_188.00,
      taxableGross: 47_812.00,
      allowance:    12_570.00,
      incomeTax:     8_105.57,
      ni:            2_994.40,
      net:          36_712.03,
    },
  },
  {
    case: '£60,000, 5% auto-enrolment pension, 2024-25: income tax reaching the '
      + 'higher rate and NI at 2% on pay over £50,270',
    given: {
      year: '2024-25',
      region: 'scotland',
      gross: 60_000,
      pension: autoEnrolment(5),
    },
    expect: {
      pension:       2_202.00,
      taxableGross: 57_798.00,
      allowance:    12_570.00,
      incomeTax:    12_299.69,
      ni:            3_210.60,
      net:          42_287.71,
    },
  },
  {
    case: '£100,000, 5% auto-enrolment pension, 2024-25: income tax reaching the '
      + 'advanced rate and NI at 2% on pay over £50,270',
    given: {
      year: '2024-25',
      region: 'scotland',
      gross: 100_000,
      pension: autoEnrolment(5),
    },
    expect: {
      pension:       2_202.00,
      taxableGross: 97_798.00,
      allowance:    12_570.00,
      incomeTax:    29_783.36,
      ni:            4_010.60,
      net:          64_004.04,
    },
  },
  {
    case: '£125,140, 5% auto-enrolment pension, 2024-25: the allowance cut to £1,101 '
      + 'by the taper, income tax reaching the advanced rate and NI at 2% on pay over '
      + '£50,270',
    given: {
      year: '2024-25',
      region: 'scotland',
      gross: 125_140,
      pension: autoEnrolment(5),
    },
    expect: {
      pension:        2_202.00,
      taxableGross: 122_938.00,
      allowance:      1_101.00,
      incomeTax:     46_257.41,
      ni:             4_513.40,
      net:           72_167.19,
    },
  },
  {
    case: '£150,000, 5% auto-enrolment pension, 2024-25: the allowance fully '
      + 'withdrawn, income tax reaching the top rate and NI at 2% on pay over £50,270',
    given: {
      year: '2024-25',
      region: 'scotland',
      gross: 150_000,
      pension: autoEnrolment(5),
    },
    expect: {
      pension:        2_202.00,
      taxableGross: 147_798.00,
      allowance:          0.00,
      incomeTax:     58_623.65,
      ni:             5_010.60,
      net:           84_163.75,
    },
  },
] as const satisfies readonly Scenario[];
