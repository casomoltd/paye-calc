// The band by income and the allowance taper's rate. Every band of every
// published year holds its own lower bound and the pound below its upper
// one; at the taper's start the band differs by region, which is why it is
// found by range and not by name; and the taper's effective rate is worked
// by hand below from the 2026-27 bands, not recomputed as the code does.

import {describe, expect, it} from 'vitest';
import {
  personalAllowanceTaperBand, personalAllowanceTaperRate, taxBandAt,
} from '../src/TaxYearConfig';
import {availableTaxYears, getTaxYearConfig} from '../src/taxYears';
import {
  CURRENT_TAX_YEAR, TAX_BAND_NAMES, TAX_REGIONS, TAX_YEARS, taxYear,
} from '../src/types';

const REGIONS = Object.values(TAX_REGIONS);

describe('taxBandAt', () => {
  for (const year of availableTaxYears) {
    it.each(REGIONS)(`${year} %s: each band holds its lower bound and the `
      + 'pound below its upper one', (region) => {
      const config = getTaxYearConfig(year, region);
      for (const band of config.incomeTaxBands) {
        expect(taxBandAt(config, band.min)).toBe(band);
        if (Number.isFinite(band.max)) {
          expect(taxBandAt(config, band.max - 1)).toBe(band);
        }
      }
    });
  }

  it.each([
    [TAX_REGIONS.rUK, TAX_BAND_NAMES.higherRate],
    [TAX_REGIONS.scotland, TAX_BAND_NAMES.advancedRate],
  ] as const)('%s: the band at the allowance taper\'s start is %s',
    (region, name) => {
      const config = getTaxYearConfig(CURRENT_TAX_YEAR, region);
      const taxable = config.personalAllowanceTaperStart
        - config.personalAllowance;
      expect(taxBandAt(config, taxable).name).toBe(name);
    });

  it('throws on a negative income, which no band holds', () => {
    const config = getTaxYearConfig(CURRENT_TAX_YEAR, TAX_REGIONS.rUK);
    expect(() => taxBandAt(config, -1)).toThrow(/no band holds/);
  });
});

describe('personalAllowanceTaperRate', () => {
  const Y2026_27 = taxYear(TAX_YEARS.Y2026_27);

  // Worked by hand from the 2026-27 band rates: each pound in the taper is
  // taxed at the band rate and withdraws half a pound of allowance, which is
  // then taxed at the same rate. rUK's 40% higher rate is gov.uk's income tax
  // rates page; Scotland's 45% advanced rate is pinned by HMRC's payroll test
  // data (both cited at `incomeTaxBands` in src/TaxYearConfig.ts). rUK:
  // 40% x 1.5 = 60%. Scotland: 45% x 1.5 = 67.5%.
  it.each([
    [TAX_REGIONS.rUK, 0.6],
    [TAX_REGIONS.scotland, 0.675],
  ] as const)('%s: %s in 2026-27', (region, rate) => {
    const config = getTaxYearConfig(Y2026_27, region);
    expect(personalAllowanceTaperRate(config)).toBeCloseTo(rate, 10);
  });

  for (const year of availableTaxYears) {
    it.each(REGIONS)(`${year} %s: the taper sits inside one band`,
      (region) => {
        expect(() => personalAllowanceTaperRate(
          getTaxYearConfig(year, region))).not.toThrow();
      });
  }

  it('throws when a band edge falls inside the taper', () => {
    const config = getTaxYearConfig(Y2026_27, TAX_REGIONS.rUK);
    // The taper's taxable income runs from start minus allowance to its
    // end; an edge between them splits it.
    const start = config.personalAllowanceTaperStart - config.personalAllowance;
    const edge = start + 1;
    const split = {
      ...config,
      incomeTaxBands: config.incomeTaxBands.flatMap((b) =>
        b.min <= start && start < b.max
          ? [{...b, max: edge}, {...b, min: edge, rate: b.rate + 0.01}]
          : [b]),
    };
    expect(() => personalAllowanceTaperBand(split))
      .toThrow(/band edge falls inside the taper/);
    expect(() => personalAllowanceTaperRate(split))
      .toThrow(/band edge falls inside the taper/);
  });
});
