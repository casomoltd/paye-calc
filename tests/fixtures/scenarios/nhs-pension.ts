// Take-home pay with a pension taken from pay before tax (the net pay
// arrangement the NHS scheme uses), at NHS member contribution rates
// from 5.2% to 12.5%. The incomes and rates were chosen at the edges of
// the 2024-25 contribution tiers; the tiers themselves belong to the
// NHS library and are not checked here. One case is a real part-time
// payslip, a gross with pence.
//
// The figures are this model's own output, not a published source. They
// pin today's behaviour, so an unintended change fails; they cannot show
// a rule is wrong, because a wrong rule produces them too. Where a rule
// changes, a row is re-derived by hand from its own taxable income, never
// regenerated from the model. The check against HMRC's own figures is
// `tests/regression/hmrc.test.ts`.

import {employer} from '../../scenario';
import type {Scenario} from '../../scenario';

export const NHS_PENSION = [
  {
    case: 'No pay, 5.2% employer pension, 2024-25: nothing to tax',
    given: {year: '2024-25', region: 'rUK', gross: 0, pension: employer(5.2)},
    expect: {
      pension:      0.00,
      taxableGross: 0.00,
      incomeTax:    0.00,
      ni:           0.00,
      net:          0.00,
    },
  },
  {
    case: '£10,000, 5.2% employer pension, 2024-25: all within the Personal '
      + 'Allowance, so no income tax and no NI',
    given: {year: '2024-25', region: 'rUK', gross: 10_000, pension: employer(5.2)},
    expect: {
      pension:        520.00,
      taxableGross: 9_480.00,
      incomeTax:        0.00,
      ni:               0.00,
      net:          9_480.00,
    },
  },
  {
    case: '£13,259, 5.2% employer pension, 2024-25: all within the Personal '
      + 'Allowance, so no income tax',
    given: {year: '2024-25', region: 'rUK', gross: 13_259, pension: employer(5.2)},
    expect: {
      pension:         689.00,
      taxableGross: 12_570.00,
      incomeTax:         0.00,
      ni:               55.12,
      net:          12_514.88,
    },
  },
  {
    case: '£13,260, 6.5% employer pension, 2024-25: all within the Personal '
      + 'Allowance, so no income tax',
    given: {year: '2024-25', region: 'rUK', gross: 13_260, pension: employer(6.5)},
    expect: {
      pension:         862.00,
      taxableGross: 12_398.00,
      incomeTax:         0.00,
      ni:               55.20,
      net:          12_342.80,
    },
  },
  {
    case: '£20,000, 6.5% employer pension, 2024-25: income tax at the basic rate only',
    given: {year: '2024-25', region: 'rUK', gross: 20_000, pension: employer(6.5)},
    expect: {
      pension:       1_300.00,
      taxableGross: 18_700.00,
      incomeTax:     1_224.20,
      ni:              594.40,
      net:          16_881.40,
    },
  },
  {
    case: '£26,831, 6.5% employer pension, 2024-25: income tax at the basic rate only',
    given: {year: '2024-25', region: 'rUK', gross: 26_831, pension: employer(6.5)},
    expect: {
      pension:       1_744.00,
      taxableGross: 25_087.00,
      incomeTax:     2_501.60,
      ni:            1_140.88,
      net:          21_444.52,
    },
  },
  {
    case: '£26,832, 8.3% employer pension, 2024-25: income tax at the basic rate only',
    given: {year: '2024-25', region: 'rUK', gross: 26_832, pension: employer(8.3)},
    expect: {
      pension:       2_227.00,
      taxableGross: 24_605.00,
      incomeTax:     2_405.20,
      ni:            1_140.96,
      net:          21_058.84,
    },
  },
  {
    case: '£30,000, 8.3% employer pension, 2024-25: income tax at the basic rate only',
    given: {year: '2024-25', region: 'rUK', gross: 30_000, pension: employer(8.3)},
    expect: {
      pension:       2_490.00,
      taxableGross: 27_510.00,
      incomeTax:     2_986.20,
      ni:            1_394.40,
      net:          23_129.40,
    },
  },
  {
    case: '£32,691, 8.3% employer pension, 2024-25: income tax at the basic rate only',
    given: {year: '2024-25', region: 'rUK', gross: 32_691, pension: employer(8.3)},
    expect: {
      pension:       2_713.00,
      taxableGross: 29_978.00,
      incomeTax:     3_479.80,
      ni:            1_609.68,
      net:          24_888.52,
    },
  },
  {
    case: '£32,692, 9.8% employer pension, 2024-25: income tax at the basic rate only',
    given: {year: '2024-25', region: 'rUK', gross: 32_692, pension: employer(9.8)},
    expect: {
      pension:       3_204.00,
      taxableGross: 29_488.00,
      incomeTax:     3_381.80,
      ni:            1_609.76,
      net:          24_496.44,
    },
  },
  {
    case: '£40,000, 9.8% employer pension, 2024-25: income tax at the basic rate only',
    given: {year: '2024-25', region: 'rUK', gross: 40_000, pension: employer(9.8)},
    expect: {
      pension:       3_920.00,
      taxableGross: 36_080.00,
      incomeTax:     4_700.20,
      ni:            2_194.40,
      net:          29_185.40,
    },
  },
  {
    case: '£49,078, 9.8% employer pension, 2024-25: income tax at the basic rate only',
    given: {year: '2024-25', region: 'rUK', gross: 49_078, pension: employer(9.8)},
    expect: {
      pension:       4_810.00,
      taxableGross: 44_268.00,
      incomeTax:     6_337.80,
      ni:            2_920.64,
      net:          35_009.56,
    },
  },
  {
    case: '£49,079, 10.7% employer pension, 2024-25: income tax at the basic rate only',
    given: {year: '2024-25', region: 'rUK', gross: 49_079, pension: employer(10.7)},
    expect: {
      pension:       5_251.00,
      taxableGross: 43_828.00,
      incomeTax:     6_249.80,
      ni:            2_920.72,
      net:          34_657.48,
    },
  },
  {
    case: '£55,000, 10.7% employer pension, 2024-25: income tax at the basic rate '
      + 'only and NI at 2% on pay over £50,270',
    given: {year: '2024-25', region: 'rUK', gross: 55_000, pension: employer(10.7)},
    expect: {
      pension:       5_885.00,
      taxableGross: 49_115.00,
      incomeTax:     7_307.20,
      ni:            3_110.60,
      net:          38_697.20,
    },
  },
  {
    case: '£62,924, 10.7% employer pension, 2024-25: income tax reaching the higher '
      + 'rate and NI at 2% on pay over £50,270',
    given: {year: '2024-25', region: 'rUK', gross: 62_924, pension: employer(10.7)},
    expect: {
      pension:       6_733.00,
      taxableGross: 56_191.00,
      incomeTax:     9_904.80,
      ni:            3_269.08,
      net:          43_017.12,
    },
  },
  {
    case: '£62,925, 12.5% employer pension, 2024-25: income tax reaching the higher '
      + 'rate and NI at 2% on pay over £50,270',
    given: {year: '2024-25', region: 'rUK', gross: 62_925, pension: employer(12.5)},
    expect: {
      pension:       7_866.00,
      taxableGross: 55_059.00,
      incomeTax:     9_452.00,
      ni:            3_269.10,
      net:          42_337.90,
    },
  },
  {
    case: '£80,000, 12.5% employer pension, 2024-25: income tax reaching the higher '
      + 'rate and NI at 2% on pay over £50,270',
    given: {year: '2024-25', region: 'rUK', gross: 80_000, pension: employer(12.5)},
    expect: {
      pension:      10_000.00,
      taxableGross: 70_000.00,
      incomeTax:    15_428.40,
      ni:            3_610.60,
      net:          50_961.00,
    },
  },
  {
    case: '£100,000, 12.5% employer pension, 2024-25: income tax reaching the higher '
      + 'rate and NI at 2% on pay over £50,270',
    given: {year: '2024-25', region: 'rUK', gross: 100_000, pension: employer(12.5)},
    expect: {
      pension:      12_500.00,
      taxableGross: 87_500.00,
      incomeTax:    22_428.40,
      ni:            4_010.60,
      net:          61_061.00,
    },
  },
  {
    case: '£150,000, 12.5% employer pension, 2024-25: the allowance fully withdrawn, '
      + 'income tax reaching the additional rate and NI at 2% on pay over £50,270',
    given: {year: '2024-25', region: 'rUK', gross: 150_000, pension: employer(12.5)},
    expect: {
      pension:       18_750.00,
      taxableGross: 131_250.00,
      incomeTax:     45_265.50,
      ni:             5_010.60,
      net:           80_973.90,
    },
  },
  {
    case: '£30,000, 8.8% employer pension, 2023-24: income tax at the basic rate only',
    given: {year: '2023-24', region: 'rUK', gross: 30_000, pension: employer(8.8)},
    expect: {
      pension:       2_640.00,
      taxableGross: 27_360.00,
      incomeTax:     2_956.20,
      ni:            2_091.60,
      net:          22_312.20,
    },
  },
  {
    case: '£30,000, 8.3% employer pension, 2025-26: income tax at the basic rate only',
    given: {year: '2025-26', region: 'rUK', gross: 30_000, pension: employer(8.3)},
    expect: {
      pension:       2_490.00,
      taxableGross: 27_510.00,
      incomeTax:     2_986.20,
      ni:            1_394.40,
      net:          23_129.40,
    },
  },
  {
    case: '£47,967.50, 9.8% employer pension, 2024-25: income tax at the basic rate '
      + 'only',
    given: {year: '2024-25', region: 'rUK', gross: 47_967.5, pension: employer(9.8)},
    expect: {
      pension:       4_701.00,
      taxableGross: 43_266.50,
      incomeTax:     6_137.50,
      ni:            2_831.80,
      net:          34_297.20,
    },
  },
  {
    case: '£30,000, 8.3% employer pension, 2026-27: income tax at the basic rate only',
    given: {year: '2026-27', region: 'rUK', gross: 30_000, pension: employer(8.3)},
    expect: {
      pension:       2_490.00,
      taxableGross: 27_510.00,
      incomeTax:     2_986.20,
      ni:            1_394.40,
      net:          23_129.40,
    },
  },
  {
    case: '£28,000, 6.5% employer pension, 2026-27: income tax at the basic rate only',
    given: {year: '2026-27', region: 'rUK', gross: 28_000, pension: employer(6.5)},
    expect: {
      pension:       1_820.00,
      taxableGross: 26_180.00,
      incomeTax:     2_720.20,
      ni:            1_234.40,
      net:          22_225.40,
    },
  },
] as const satisfies readonly Scenario[];
