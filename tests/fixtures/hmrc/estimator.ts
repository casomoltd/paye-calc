// HMRC's own "Estimate your take-home pay" tool, run by hand for 2026-27
// with no pension, its "How we calculated this" figures transcribed as
// printed; a run with a tax code names it. Each row checks the model's income
// tax, NI and take-home against HMRC's, to the penny.
// Source: https://www.tax.service.gov.uk/estimate-paye-take-home-pay
//
// ── Run and transcribed 2 Nov 2026 ─

import type {TaxRegion, YearLabel} from '../../../src/types';

/** One run of HMRC's estimator, as it printed. */
interface EstimatorRun {
  readonly case: string;
  readonly given: {
    readonly year: YearLabel;
    readonly region: TaxRegion;
    readonly gross: number;
    readonly code?: string;
  };
  /** What the run printed; a run checked for take-home alone has only that. */
  readonly printed: {
    readonly personalAllowance?: number;
    /** What a K code adds to pay, which HMRC prints on its own line. */
    readonly kCodePayAdjustment?: number;
    /** Tax at each rate, in band order. */
    readonly taxByRate?: readonly number[];
    readonly ni?: number;
    readonly takeHome: number;
  };
}

export const ESTIMATOR_RUNS = [
  {
    case: '£60,000, 2026-27: free pay of 1257L, £9 above the allowance shown',
    given: {year: '2026-27', region: 'rUK', gross: 60_000},
    printed: {
      personalAllowance: 12_570,
      taxByRate: [7_540, 3_888.40],
      ni: 3_210.60,
      takeHome: 45_361,
    },
  },
  {
    case: '£110,000, 2026-27: the allowance tapered to £7,570, code 757L',
    given: {year: '2026-27', region: 'rUK', gross: 110_000},
    printed: {
      personalAllowance: 7_570,
      taxByRate: [7_540, 25_888.40],
      ni: 4_210.60,
      takeHome: 72_361,
    },
  },
  {
    case: '£125,140, 2026-27: the allowance tapered to exactly nothing, 0L, '
      + 'still £9 free',
    given: {year: '2026-27', region: 'rUK', gross: 125_140},
    printed: {
      personalAllowance: 0,
      taxByRate: [7_540, 34_972.40],
      ni: 4_513.40,
      takeHome: 78_114.20,
    },
  },
  {
    case: '£150,000, 2026-27: the taper past nothing, 0T, nothing free',
    given: {year: '2026-27', region: 'rUK', gross: 150_000},
    printed: {
      personalAllowance: 0,
      taxByRate: [7_540, 34_976, 11_187],
      ni: 5_010.60,
      takeHome: 91_286.40,
    },
  },
  {
    case: '£30,000, 2026-27: basic rate only',
    given: {year: '2026-27', region: 'rUK', gross: 30_000},
    printed: {
      personalAllowance: 12_570,
      taxByRate: [3_484.20],
      ni: 1_394.40,
      takeHome: 25_121.40,
    },
  },
  {
    case: '£100,000, 2026-27: no code, the taper not yet started',
    given: {year: '2026-27', region: 'rUK', gross: 100_000},
    printed: {
      personalAllowance: 12_570,
      taxByRate: [7_540, 19_888.40],
      ni: 4_010.60,
      takeHome: 68_561,
    },
  },
  {
    case: '£100,000, 2026-27, code 1256L: an L code frees ten times its number '
      + 'plus £9',
    given: {year: '2026-27', region: 'rUK', gross: 100_000, code: '1256L'},
    printed: {
      personalAllowance: 12_560,
      taxByRate: [7_540, 19_892.40],
      ni: 4_010.60,
      takeHome: 68_557,
    },
  },
  {
    case: '£125,142, 2026-27: the taper a pound past nil, £8 still free',
    given: {year: '2026-27', region: 'rUK', gross: 125_142},
    printed: {
      personalAllowance: 0,
      taxByRate: [7_540, 34_973.60],
      ni: 4_513.44,
      takeHome: 78_114.96,
    },
  },
  {
    case: '£60,000, 2026-27, code K100: a K code adds exactly ten times its '
      + 'number to pay',
    given: {year: '2026-27', region: 'rUK', gross: 60_000, code: 'K100'},
    printed: {
      personalAllowance: 0,
      kCodePayAdjustment: 1_000,
      taxByRate: [7_540, 9_320],
      ni: 3_210.60,
      takeHome: 39_929.40,
    },
  },
  {
    case: '£60,000, 2026-27, code 0T: no allowance, nothing free',
    given: {year: '2026-27', region: 'rUK', gross: 60_000, code: '0T'},
    printed: {
      personalAllowance: 0,
      taxByRate: [7_540, 8_920],
      ni: 3_210.60,
      takeHome: 40_329.40,
    },
  },
  {
    case: '£60,000, Scotland, 2026-27: up to the higher rate',
    given: {year: '2026-27', region: 'scotland', gross: 60_000},
    printed: {
      personalAllowance: 12_570,
      taxByRate: [753.73, 2_597.80, 2_968.56, 6_858.18],
      ni: 3_210.60,
      takeHome: 43_611.13,
    },
  },
  {
    case: '£80,000, Scotland, 2026-27: up to the advanced rate',
    given: {year: '2026-27', region: 'scotland', gross: 80_000},
    printed: {
      personalAllowance: 12_570,
      taxByRate: [753.73, 2_597.80, 2_968.56, 13_161.96, 2_245.95],
      ni: 3_610.60,
      takeHome: 54_661.40,
    },
  },
  {
    case: '£60,000, Scotland, 2026-27, code SD1: all of it at the 42% higher '
      + 'rate',
    given: {year: '2026-27', region: 'scotland', gross: 60_000, code: 'SD1'},
    printed: {
      personalAllowance: 0,
      taxByRate: [25_200],
      ni: 3_210.60,
      takeHome: 31_589.40,
    },
  },
  {
    case: '£100,002, 2026-27: the allowance £12,569, plus £9 with no rounding '
      + 'to a code',
    given: {year: '2026-27', region: 'rUK', gross: 100_002},
    printed: {takeHome: 68_561.76},
  },
] as const satisfies readonly EstimatorRun[];
