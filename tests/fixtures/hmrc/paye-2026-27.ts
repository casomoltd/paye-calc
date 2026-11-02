// Verbatim transcription of HMRC's payroll test data for 2026-27,
// "PAYE Tax v1.1" (added 20 Jan 2026): every row of every sheet in its
// rest-of-UK, Scottish and Welsh tax workbooks, columns as printed. The
// v1.1 pack revised only the Scottish workbook; the other two keep their
// v1.0 names, as each sheet's `workbook` records.
// HMRC accepts a payroll result within a penny of these.
// Source: https://www.gov.uk/government/publications/software-developers-payroll-test-data-2026-to-2027
//
// ── Checked against the downloaded workbooks, 2 Nov 2026 ─

import type {PayeSheet} from './paye-sheet';

export const PAYE_2026_27 = [
  {
    workbook: '2026 - 27 rest of UK tax v1.0', sheet: 'Gen_cumul-mthly',
    region: 'rUK', basis: 'cumulative', periodsPerYear: 12,
    rows: [
      // code, period, gross pay, taxable to date, tax due, tax to date
      ['1257L', 1, 1156.25, 1156.25, 21.40, 21.40],
      ['1257L', 2, 1156.26, 2312.51, 21.60, 43.00],
      ['1257L', 3, 31_123.26, 33_435.77, 10_188.00, 10_231.00],
      ['1257L', 4, 14_465.71, 47_901.48, 4838.60, 15_069.60],
      ['1257L', 5, 52_681.25, 100_582.73, 22_085.10, 37_154.70],
      ['1257L', 6, 50_000.00, 150_582.73, 20_878.65, 58_033.35],
      ['1257L', 7, 15_000.00, 165_582.73, 5128.20, 63_161.55],
      ['1257L', 8, 14_000.55, 179_583.28, 4679.10, 67_840.65],
      ['BR', 9, 12_590.45, 192_173.73, -29_406.05, 38_434.60],
      ['NT', 10, 11_245.05, 203_418.78, -38_434.60, 0.00],
    ],
  },
  {
    workbook: '2026 - 27 rest of UK tax v1.0', sheet: 'Gen_cumul-wkly',
    region: 'rUK', basis: 'cumulative', periodsPerYear: 52,
    rows: [
      // code, period, gross pay, taxable to date, tax due, tax to date
      ['1257L', 1, 267.07, 267.07, 5.00, 5.00],
      ['1257L', 2, 266.08, 533.15, 4.80, 9.80],
      ['1257L', 3, 853.05, 1386.20, 122.20, 132.00],
      ['1257L', 4, 2021.09, 3407.29, 355.80, 487.80],
      ['1257L', 5, 9834.16, 13_241.45, 3599.60, 4087.40],
      ['1257L', 6, 15_000.00, 28_241.45, 6375.68, 10_463.08],
      ['1257L', 7, 242.84, 28_484.29, -264.87, 10_198.21],
      ['1257L', 8, 243.83, 28_728.12, -264.43, 9933.78],
      ['BR', 9, 632.84, 29_360.96, -4061.78, 5872.00],
      ['NT', 10, 2893.83, 32_254.79, -5872.00, 0.00],
    ],
  },
  {
    workbook: '2026 - 27 rest of UK tax v1.0', sheet: 'Gen_W1M1_mthly',
    region: 'rUK', basis: 'w1m1', periodsPerYear: 12,
    rows: [
      // code, period, gross pay, taxable to date, tax due, tax to date
      ['45L', 1, 39.24, 39.24, 0.00, 0.00],
      ['45L', 1, 39.25, 39.25, 0.20, 0.20],
      ['45L', 1, 3164.24, 3164.24, 625.00, 625.00],
      ['45L', 1, 3164.25, 3164.25, 625.20, 625.20],
      ['45L', 1, 10_450.24, 10_450.24, 3536.06, 3536.06],
      ['45L', 1, 10_500.78, 10_500.78, 3558.15, 3558.15],
      ['45L', 1, 12_539.24, 12_539.24, 4475.25, 4475.25],
      ['45L', 1, 12_539.25, 12_539.25, 4475.70, 4475.70],
      ['BR', 1, 99.99, 99.99, 19.80, 19.80],
      ['D0', 1, 99.99, 99.99, 39.60, 39.60],
      ['D1', 1, 99.99, 99.99, 44.55, 44.55],
    ],
  },
  {
    workbook: '2026 - 27 rest of UK tax v1.0', sheet: 'Gen_W1M1_wkly',
    region: 'rUK', basis: 'w1m1', periodsPerYear: 52,
    rows: [
      // code, period, gross pay, taxable to date, tax due, tax to date
      ['145L', 1, 29.05, 29.05, 0.00, 0.00],
      ['145L', 1, 29.06, 29.06, 0.20, 0.20],
      ['145L', 1, 750.06, 750.06, 144.40, 144.40],
      ['145L', 1, 750.07, 750.07, 144.40, 144.40],
      ['145L', 1, 2913.06, 2913.06, 1032.92, 1032.92],
      ['145L', 1, 2913.07, 2913.07, 1032.92, 1032.92],
      ['BR', 1, 101.99, 101.99, 20.20, 20.20],
      ['D0', 1, 101.99, 101.99, 40.40, 40.40],
      ['D1', 1, 101.99, 101.99, 45.45, 45.45],
    ],
  },
  {
    workbook: '2026 - 27 rest of UK tax v1.0', sheet: 'BR_monthly',
    region: 'rUK', basis: 'cumulative', periodsPerYear: 12,
    rows: [
      // code, period, gross pay, taxable to date, tax due, tax to date
      ['BR', 1, 2870.55, 2870.55, 574.00, 574.00],
      ['BR', 2, 3500.95, 6371.50, 700.20, 1274.20],
      ['BR', 3, 32_000.00, 38_371.50, 6400.00, 7674.20],
    ],
  },
  {
    workbook: '2026 - 27 rest of UK tax v1.0', sheet: 'BR_weekly',
    region: 'rUK', basis: 'cumulative', periodsPerYear: 52,
    rows: [
      // code, period, gross pay, taxable to date, tax due, tax to date
      ['BR', 1, 650.15, 650.15, 130.00, 130.00],
      ['BR', 2, 995.55, 1645.70, 199.00, 329.00],
      ['BR', 3, 7100.35, 8746.05, 1420.20, 1749.20],
    ],
  },
  {
    workbook: '2026 - 27 rest of UK tax v1.0', sheet: 'K_cumul_mthly',
    region: 'rUK', basis: 'cumulative', periodsPerYear: 12,
    rows: [
      // code, period, gross pay, taxable to date, tax due, tax to date
      ['K585', 1, 895.00, 895.00, 276.60, 276.60],
      ['K585', 2, 1250.00, 2145.00, 347.60, 624.20],
      ['K585', 3, 765.00, 2910.00, 250.60, 874.80],
    ],
  },
  {
    workbook: '2026 - 27 rest of UK tax v1.0', sheet: 'K_cumul_wkly',
    region: 'rUK', basis: 'cumulative', periodsPerYear: 52,
    rows: [
      // code, period, gross pay, taxable to date, tax due, tax to date
      ['K630', 1, 150.00, 150.00, 54.20, 54.20],
      ['K630', 2, 300.00, 450.00, 84.20, 138.40],
      ['K630', 3, 245.00, 695.00, 73.40, 211.80],
    ],
  },
  {
    workbook: '2026 - 27 rest of UK tax v1.0', sheet: 'K_W1M1_mthly',
    region: 'rUK', basis: 'w1m1', periodsPerYear: 12,
    rows: [
      // code, period, gross pay, taxable to date, tax due, tax to date
      ['K45', 1, 950.00, 950.00, 197.60, 197.60],
      ['K285', 1, 1120.00, 1120.00, 271.60, 271.60],
      ['K401', 1, 885.00, 885.00, 243.80, 243.80],
    ],
  },
  {
    workbook: '2026 - 27 rest of UK tax v1.0', sheet: 'K_W1M1_wkly',
    region: 'rUK', basis: 'w1m1', periodsPerYear: 52,
    rows: [
      // code, period, gross pay, taxable to date, tax due, tax to date
      ['K27', 1, 560.00, 560.00, 113.00, 113.00],
      ['K159', 1, 432.00, 432.00, 92.40, 92.40],
      ['K306', 1, 810.00, 810.00, 202.60, 202.60],
    ],
  },
  {
    workbook: '2026 - 27 rest of UK tax v1.0', sheet: 'Large_code_mthly',
    region: 'rUK', basis: 'cumulative', periodsPerYear: 12,
    rows: [
      // code, period, gross pay, taxable to date, tax due, tax to date
      ['999L', 1, 2500.00, 2500.00, 333.20, 333.20],
      ['1000L', 1, 3000.00, 3000.00, 433.00, 433.00],
      ['1001L', 1, 5000.00, 5000.00, 1037.66, 1037.66],
    ],
  },
  {
    workbook: '2026 - 27 rest of UK tax v1.0', sheet: 'Large_code_wkly',
    region: 'rUK', basis: 'cumulative', periodsPerYear: 52,
    rows: [
      // code, period, gross pay, taxable to date, tax due, tax to date
      ['999L', 1, 750.00, 750.00, 111.40, 111.40],
      ['1000L', 1, 900.00, 900.00, 141.40, 141.40],
      ['1001L', 1, 1500.00, 1500.00, 377.80, 377.80],
    ],
  },
  {
    workbook: '2026 - 27 Scottish tax v1.1', sheet: 'Gen_cumul_mthly',
    region: 'scotland', basis: 'cumulative', periodsPerYear: 12,
    rows: [
      // code, period, gross pay, taxable to date, tax due, tax to date
      ['S1257L', 1, 1156.25, 1156.25, 20.33, 20.33],
      ['S1257L', 2, 1156.26, 2312.51, 20.52, 40.85],
      ['S1257L', 3, 31_123.26, 33_435.77, 11_436.78, 11_477.63],
      ['S1257L', 4, 14_465.71, 47_901.48, 5380.32, 16_857.95],
      ['S1257L', 5, 52_681.25, 100_582.73, 23_753.37, 40_611.32],
      ['S1257L', 6, 50_000.00, 150_582.73, 22_466.49, 63_077.81],
      ['S1257L', 7, 15_000.00, 165_582.73, 5666.01, 68_743.82],
      ['S1257L', 8, 14_000.55, 179_583.28, 5186.97, 73_930.79],
      ['SBR', 9, 12_590.45, 192_173.73, -35_496.19, 38_434.60],
      ['NT', 10, 11_245.05, 203_418.78, -38_434.60, 0.00],
    ],
  },
  {
    workbook: '2026 - 27 Scottish tax v1.1', sheet: 'Gen_cumul_wkly',
    region: 'scotland', basis: 'cumulative', periodsPerYear: 52,
    rows: [
      // code, period, gross pay, taxable to date, tax due, tax to date
      ['S1257L', 1, 267.07, 267.07, 4.75, 4.75],
      ['S1257L', 2, 266.08, 533.15, 4.56, 9.31],
      ['S1257L', 3, 853.05, 1386.20, 120.40, 129.71],
      ['S1257L', 4, 2021.09, 3407.29, 376.31, 506.02],
      ['S1257L', 5, 9834.16, 13_241.45, 4079.90, 4585.92],
      ['S1257L', 6, 15_000.00, 28_241.45, 6845.99, 11_431.91],
      ['S1257L', 7, 242.84, 28_484.29, -237.32, 11_194.59],
      ['S1257L', 8, 243.83, 28_728.12, -236.84, 10_957.75],
      ['SBR', 9, 632.84, 29_360.96, -5085.75, 5872.00],
      ['NT', 10, 2893.83, 32_254.79, -5872.00, 0.00],
    ],
  },
  {
    workbook: '2026 - 27 Scottish tax v1.1', sheet: 'Gen_W1M1_mthly',
    region: 'scotland', basis: 'w1m1', periodsPerYear: 12,
    rows: [
      // code, period, gross pay, taxable to date, tax due, tax to date
      ['S45L', 1, 39.24, 39.24, 0.00, 0.00],
      ['S45L', 1, 39.25, 39.25, 0.19, 0.19],
      ['S45L', 1, 3164.24, 3164.24, 750.95, 750.95],
      ['S45L', 1, 3164.25, 3164.25, 751.37, 751.37],
      ['S45L', 1, 10_450.24, 10_450.24, 3967.32, 3967.32],
      ['S45L', 1, 10_500.78, 10_500.78, 3991.28, 3991.28],
      ['S45L', 1, 12_539.24, 12_539.24, 4969.52, 4969.52],
      ['S45L', 1, 12_539.25, 12_539.25, 4970.00, 4970.00],
      ['SBR', 1, 99.99, 99.99, 19.80, 19.80],
      ['SBR', 1, 1450.03, 1450.03, 290.00, 290.00],
      ['SD0', 1, 99.99, 99.99, 20.79, 20.79],
      ['SD0', 1, 1450.03, 1450.03, 304.50, 304.50],
      ['SD1', 1, 99.99, 99.99, 41.58, 41.58],
      ['SD1', 1, 1450.03, 1450.03, 609.00, 609.00],
      ['SD2', 1, 99.99, 99.99, 44.55, 44.55],
      ['SD2', 1, 1450.03, 1450.03, 652.50, 652.50],
      ['SD2', 1, 5300.67, 5300.67, 2385.00, 2385.00],
      ['SD3', 1, 99.99, 99.99, 47.52, 47.52],
      ['SD3', 1, 1450.03, 1450.03, 696.00, 696.00],
      ['SD3', 1, 5300.67, 5300.67, 2544.00, 2544.00],
    ],
  },
  {
    workbook: '2026 - 27 Scottish tax v1.1', sheet: 'Gen_W1M1_wkly',
    region: 'scotland', basis: 'w1m1', periodsPerYear: 52,
    rows: [
      // code, period, gross pay, taxable to date, tax due, tax to date
      ['S145L', 1, 29.05, 29.05, 0.00, 0.00],
      ['S145L', 1, 29.06, 29.06, 0.19, 0.19],
      ['S145L', 1, 750.06, 750.06, 173.65, 173.65],
      ['S145L', 1, 750.07, 750.07, 173.65, 173.65],
      ['S145L', 1, 2913.06, 2913.06, 1146.99, 1146.99],
      ['S145L', 1, 2913.07, 2913.07, 1146.99, 1146.99],
      ['SBR', 1, 101.99, 101.99, 20.20, 20.20],
      ['SBR', 1, 324.63, 324.63, 64.80, 64.80],
      ['SD0', 1, 101.99, 101.99, 21.21, 21.21],
      ['SD0', 1, 324.63, 324.63, 68.04, 68.04],
      ['SD1', 1, 101.99, 101.99, 42.42, 42.42],
      ['SD1', 1, 324.63, 324.63, 136.08, 136.08],
      ['SD2', 1, 101.99, 101.99, 45.45, 45.45],
      ['SD2', 1, 324.63, 324.63, 145.80, 145.80],
      ['SD2', 1, 1056.81, 1056.81, 475.20, 475.20],
      ['SD3', 1, 101.99, 101.99, 48.48, 48.48],
      ['SD3', 1, 324.63, 324.63, 155.52, 155.52],
      ['SD3', 1, 1056.81, 1056.81, 506.88, 506.88],
    ],
  },
  {
    workbook: '2026 - 27 Scottish tax v1.1', sheet: 'K_cumul_mthly',
    region: 'scotland', basis: 'cumulative', periodsPerYear: 12,
    rows: [
      // code, period, gross pay, taxable to date, tax due, tax to date
      ['SK585', 1, 895.00, 895.00, 273.29, 273.29],
      ['SK585', 2, 1250.00, 2145.00, 347.24, 620.53],
      ['SK585', 3, 765.00, 2910.00, 245.70, 866.23],
    ],
  },
  {
    workbook: '2026 - 27 Scottish tax v1.1', sheet: 'K_cumul_wkly',
    region: 'scotland', basis: 'cumulative', periodsPerYear: 52,
    rows: [
      // code, period, gross pay, taxable to date, tax due, tax to date
      ['SK630', 1, 150.00, 150.00, 53.43, 53.43],
      ['SK630', 2, 300.00, 450.00, 83.84, 137.27],
      ['SK630', 3, 245.00, 695.00, 73.04, 210.31],
    ],
  },
  {
    workbook: '2026- 27 Welsh tax v1.0', sheet: 'Gen_cumul_mthly',
    region: 'wales', basis: 'cumulative', periodsPerYear: 12,
    rows: [
      // code, period, gross pay, taxable to date, tax due, tax to date
      ['C1257L', 1, 1156.25, 1156.25, 21.40, 21.40],
      ['C1257L', 2, 1156.26, 2312.51, 21.60, 43.00],
      ['C1257L', 3, 31_123.26, 33_435.77, 10_188.00, 10_231.00],
      ['C1257L', 4, 14_465.71, 47_901.48, 4838.60, 15_069.60],
      ['C1257L', 5, 52_681.25, 100_582.73, 22_085.10, 37_154.70],
      ['C1257L', 6, 50_000.00, 150_582.73, 20_878.65, 58_033.35],
      ['C1257L', 7, 15_000.00, 165_582.73, 5128.20, 63_161.55],
      ['C1257L', 8, 14_000.55, 179_583.28, 4679.10, 67_840.65],
      ['CBR', 9, 12_590.45, 192_173.73, -29_406.05, 38_434.60],
      ['NT', 10, 11_245.05, 203_418.78, -38_434.60, 0.00],
    ],
  },
  {
    workbook: '2026- 27 Welsh tax v1.0', sheet: 'Gen_cumul_wkly',
    region: 'wales', basis: 'cumulative', periodsPerYear: 52,
    rows: [
      // code, period, gross pay, taxable to date, tax due, tax to date
      ['C1257L', 1, 267.07, 267.07, 5.00, 5.00],
      ['C1257L', 2, 266.08, 533.15, 4.80, 9.80],
      ['C1257L', 3, 853.05, 1386.20, 122.20, 132.00],
      ['C1257L', 4, 2021.09, 3407.29, 355.80, 487.80],
      ['C1257L', 5, 9834.16, 13_241.45, 3599.60, 4087.40],
      ['C1257L', 6, 15_000.00, 28_241.45, 6375.68, 10_463.08],
      ['C1257L', 7, 242.84, 28_484.29, -264.87, 10_198.21],
      ['C1257L', 8, 243.83, 28_728.12, -264.43, 9933.78],
      ['CBR', 9, 632.84, 29_360.96, -4061.78, 5872.00],
      ['NT', 10, 2893.83, 32_254.79, -5872.00, 0.00],
    ],
  },
  {
    workbook: '2026- 27 Welsh tax v1.0', sheet: 'Gen_W1M1_mthly',
    region: 'wales', basis: 'w1m1', periodsPerYear: 12,
    rows: [
      // code, period, gross pay, taxable to date, tax due, tax to date
      ['C45L', 1, 39.24, 39.24, 0.00, 0.00],
      ['C45L', 1, 39.25, 39.25, 0.20, 0.20],
      ['C45L', 1, 3164.24, 3164.24, 625.00, 625.00],
      ['C45L', 1, 3164.25, 3164.25, 625.20, 625.20],
      ['C45L', 1, 10_450.24, 10_450.24, 3536.06, 3536.06],
      ['C45L', 1, 10_500.78, 10_500.78, 3558.15, 3558.15],
      ['C45L', 1, 12_539.24, 12_539.24, 4475.25, 4475.25],
      ['C45L', 1, 12_539.25, 12_539.25, 4475.70, 4475.70],
      ['CBR', 1, 99.99, 99.99, 19.80, 19.80],
      ['CD0', 1, 99.99, 99.99, 39.60, 39.60],
      ['CD1', 1, 99.99, 99.99, 44.55, 44.55],
    ],
  },
  {
    workbook: '2026- 27 Welsh tax v1.0', sheet: 'Gen_W1M1_wkly',
    region: 'wales', basis: 'w1m1', periodsPerYear: 52,
    rows: [
      // code, period, gross pay, taxable to date, tax due, tax to date
      ['C145L', 1, 29.05, 29.05, 0.00, 0.00],
      ['C145L', 1, 29.06, 29.06, 0.20, 0.20],
      ['C145L', 1, 750.06, 750.06, 144.40, 144.40],
      ['C145L', 1, 750.07, 750.07, 144.40, 144.40],
      ['C145L', 1, 2913.06, 2913.06, 1032.92, 1032.92],
      ['C145L', 1, 2913.07, 2913.07, 1032.92, 1032.92],
      ['CBR', 1, 101.99, 101.99, 20.20, 20.20],
      ['CD0', 1, 101.99, 101.99, 40.40, 40.40],
      ['CD1', 1, 101.99, 101.99, 45.45, 45.45],
    ],
  },
] as const satisfies readonly PayeSheet[];
