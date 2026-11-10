// Where a gross salary range sits against the allowance taper and the
// income tax bands. The figures are worked by hand from the 2026-27 rUK
// and Scottish bands, not recomputed as the code does: the taper runs from
// £100,000 to £125,140, and above its start the allowance shrinks by £1 for
// every £2, so the additional rate begins at £125,140 gross.

import {describe, expect, it} from 'vitest';
import {taperPosition, taxBandsSpanned} from '../src/TaxYearConfig';
import {getTaxYearConfig} from '../src/taxYears';
import {TAX_BAND_NAMES, TAX_REGIONS, TAX_YEARS, taxYear} from '../src/types';

const Y2026_27 = taxYear(TAX_YEARS.Y2026_27);
const RUK = getTaxYearConfig(Y2026_27, TAX_REGIONS.rUK);
const SCOTLAND = getTaxYearConfig(Y2026_27, TAX_REGIONS.scotland);

describe('taperPosition', () => {
  it.each([
    [90_000, 99_000, 'below'],
    [95_000, 105_000, 'entering'],
    [101_000, 120_000, 'inside'],
    [120_000, 130_000, 'leaving'],
    [126_000, 140_000, 'above'],
  ] as const)('%i to %i is %s', (min, max, position) => {
    expect(taperPosition(RUK, min, max)).toBe(position);
  });

  it('a range ending exactly at the taper\'s start is below it', () => {
    expect(taperPosition(RUK, 90_000, 100_000)).toBe('below');
  });
});

describe('taxBandsSpanned', () => {
  const names = (min: number, max: number, config = RUK) =>
    taxBandsSpanned(config, min, max).map((b) => b.name);

  it('a range inside the basic rate spans it alone', () => {
    expect(names(30_000, 40_000)).toEqual([TAX_BAND_NAMES.basicRate]);
  });

  it('a range across £50,270 spans the basic and higher rates', () => {
    expect(names(45_000, 55_000)).toEqual([
      TAX_BAND_NAMES.basicRate, TAX_BAND_NAMES.higherRate,
    ]);
  });

  it('the additional rate starts at the taper\'s end, £125,140 gross', () => {
    expect(names(125_000, 125_139)).toEqual([TAX_BAND_NAMES.higherRate]);
    expect(names(125_141, 126_000)).toEqual([TAX_BAND_NAMES.additionalRate]);
  });

  it('reads the region\'s own bands: £30,000 is intermediate in Scotland',
    () => {
      expect(names(30_000, 30_001, SCOTLAND))
        .toEqual([TAX_BAND_NAMES.intermediateRate]);
    });
});
