// Take-home pay in Scotland with no pension, from no pay up through each
// band, to where the allowance taper starts and past where the allowance
// is gone; no case sits inside the taper.
//
// The figures are this model's own output, not a published source. They
// pin today's behaviour, so an unintended change fails; they cannot show
// a rule is wrong, because a wrong rule produces them too. Where a rule
// changes, a row is re-derived by hand from its own taxable income, never
// regenerated from the model. The check against HMRC's own figures is
// `tests/regression/hmrc.test.ts`.

import type {Scenario} from '../../../scenario';

export const NO_PENSION = [
  {
    case: 'No pay, no pension, 2024-25: nothing to tax',
    given: {year: '2024-25', region: 'scotland', gross: 0},
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
    case: '£5,000, no pension, 2024-25: all within the Personal Allowance, so no '
      + 'income tax and no NI',
    given: {year: '2024-25', region: 'scotland', gross: 5000},
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
    case: '£10,000, no pension, 2024-25: all within the Personal Allowance, so no '
      + 'income tax and no NI',
    given: {year: '2024-25', region: 'scotland', gross: 10_000},
    expect: {
      pension:           0.00,
      taxableGross: 10_000.00,
      allowance:    12_570.00,
      incomeTax:         0.00,
      ni:                0.00,
      net:          10_000.00,
    },
  },
  {
    case: '£12,570, no pension, 2024-25: all within the Personal Allowance, so no '
      + 'income tax and no NI',
    given: {year: '2024-25', region: 'scotland', gross: 12_570},
    expect: {
      pension:           0.00,
      taxableGross: 12_570.00,
      allowance:    12_570.00,
      incomeTax:         0.00,
      ni:                0.00,
      net:          12_570.00,
    },
  },
  {
    case: '£30,000, no pension, 2024-25: income tax reaching the intermediate rate',
    given: {year: '2024-25', region: 'scotland', gross: 30_000},
    expect: {
      pension:           0.00,
      taxableGross: 30_000.00,
      allowance:    12_570.00,
      incomeTax:     3_495.44,
      ni:            1_394.40,
      net:          25_110.16,
    },
  },
  {
    case: '£50,000, no pension, 2024-25: income tax reaching the higher rate',
    given: {year: '2024-25', region: 'scotland', gross: 50_000},
    expect: {
      pension:           0.00,
      taxableGross: 50_000.00,
      allowance:    12_570.00,
      incomeTax:     9_024.53,
      ni:            2_994.40,
      net:          37_981.07,
    },
  },
  {
    case: '£60,000, no pension, 2024-25: income tax reaching the higher rate and NI '
      + 'at 2% on pay over £50,270',
    given: {year: '2024-25', region: 'scotland', gross: 60_000},
    expect: {
      pension:           0.00,
      taxableGross: 60_000.00,
      allowance:    12_570.00,
      incomeTax:    13_224.53,
      ni:            3_210.60,
      net:          43_564.87,
    },
  },
  {
    case: '£100,000, no pension, 2024-25: income tax reaching the advanced rate and '
      + 'NI at 2% on pay over £50,270',
    given: {year: '2024-25', region: 'scotland', gross: 100_000},
    expect: {
      pension:            0.00,
      taxableGross: 100_000.00,
      allowance:     12_570.00,
      incomeTax:     30_774.26,
      ni:             4_010.60,
      net:           65_215.14,
    },
  },
  {
    case: '£125,140, no pension, 2024-25: the allowance fully withdrawn, income tax '
      + 'reaching the advanced rate and NI at 2% on pay over £50,270',
    given: {year: '2024-25', region: 'scotland', gross: 125_140},
    expect: {
      pension:            0.00,
      taxableGross: 125_140.00,
      allowance:          0.00,
      incomeTax:     47_743.76,
      ni:             4_513.40,
      net:           72_882.84,
    },
  },
  {
    case: '£150,000, no pension, 2024-25: the allowance fully withdrawn, income tax '
      + 'reaching the top rate and NI at 2% on pay over £50,270',
    given: {year: '2024-25', region: 'scotland', gross: 150_000},
    expect: {
      pension:            0.00,
      taxableGross: 150_000.00,
      allowance:          0.00,
      incomeTax:     59_680.61,
      ni:             5_010.60,
      net:           85_308.79,
    },
  },
  {
    case: '£30,000, no pension, 2026-27: income tax reaching the intermediate rate',
    given: {year: '2026-27', region: 'scotland', gross: 30_000},
    expect: {
      pension:           0.00,
      taxableGross: 30_000.00,
      allowance:    12_570.00,
      incomeTax:     3_449.18,
      ni:            1_394.40,
      net:          25_156.42,
    },
  },
  {
    case: '£50,000, no pension, 2026-27: income tax reaching the higher rate',
    given: {year: '2026-27', region: 'scotland', gross: 50_000},
    expect: {
      pension:           0.00,
      taxableGross: 50_000.00,
      allowance:    12_570.00,
      incomeTax:     8_978.27,
      ni:            2_994.40,
      net:          38_027.33,
    },
  },
  {
    case: '£60,000, no pension, 2026-27: income tax reaching the higher rate and NI '
      + 'at 2% on pay over £50,270',
    given: {year: '2026-27', region: 'scotland', gross: 60_000},
    expect: {
      pension:           0.00,
      taxableGross: 60_000.00,
      allowance:    12_570.00,
      incomeTax:    13_178.27,
      ni:            3_210.60,
      net:          43_611.13,
    },
  },
  {
    case: '£100,000, no pension, 2026-27: income tax reaching the advanced rate and '
      + 'NI at 2% on pay over £50,270',
    given: {year: '2026-27', region: 'scotland', gross: 100_000},
    expect: {
      pension:            0.00,
      taxableGross: 100_000.00,
      allowance:     12_570.00,
      incomeTax:     30_728.00,
      ni:             4_010.60,
      net:           65_261.40,
    },
  },
] as const satisfies readonly Scenario[];
