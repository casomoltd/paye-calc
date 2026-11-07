/**
 * taxFreeChildcare: Tax-Free Childcare's income limit and top-up caps,
 * per tax year. Each figure is retyped here from its source, so a
 * mistyped figure in either place fails.
 */
import {describe, expect, it} from 'vitest';
import {taxFreeChildcare, taxYear} from '../src/index.js';

describe('taxFreeChildcare', () => {
  it('reads 2026-27 at source', () => {
    expect(taxFreeChildcare(taxYear('2026-27'))).toEqual({
      // SI 2015/448 reg 15(1): "not expect their adjusted net income to
      // exceed £100,000 for the relevant tax year".
      incomeLimit: 100_000,
      // gov.uk/tax-free-childcare: "£500 every 3 months (up to £2,000 a
      // year)".
      topUpCapPerChild: 2_000,
      // Same page: "£1,000 every 3 months (up to £4,000 a year)" if the
      // child is disabled.
      topUpCapPerDisabledChild: 4_000,
    });
  });

  it('refuses a year it holds no figures for', () => {
    expect(() => taxFreeChildcare(taxYear('2023-24'))).toThrow(RangeError);
  });
});
