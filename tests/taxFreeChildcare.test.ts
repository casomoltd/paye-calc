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
      // Childcare Payments Act 2014: a top-up of 25% (s.1(4)) on up to
      // £2,000 paid in each 3-month period (s.19(5)(b), s.5(1)), four
      // periods a year; gov.uk/tax-free-childcare: "£500 every 3 months
      // (up to £2,000 a year)".
      topUpCapPerChild: 0.25 * 2_000 * 4,
      // s.19(5)(a): £4,000 a period for a disabled child; gov.uk: "£1,000
      // every 3 months (up to £4,000 a year)".
      topUpCapPerDisabledChild: 0.25 * 4_000 * 4,
    });
  });

  it('refuses a year it holds no figures for', () => {
    expect(() => taxFreeChildcare(taxYear('2023-24'))).toThrow(RangeError);
  });
});
