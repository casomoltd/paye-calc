/**
 * freeChildcareEngland: the income limit on England's free childcare for
 * working parents, per tax year, retyped here from its regulations so a
 * mistyped figure in either place fails.
 */
import {describe, expect, it} from 'vitest';
import {freeChildcareEngland, taxYear} from '../src/index.js';

describe('freeChildcareEngland', () => {
  it('reads 2026-27 at source', () => {
    expect(freeChildcareEngland(taxYear('2026-27'))).toEqual({
      // SI 2022/1134 reg 14(3)(c)(i): "does not for the relevant tax year
      // ... expect their adjusted net income to exceed £100,000".
      incomeLimit: 100_000,
    });
  });

  it('refuses a year it holds no figures for', () => {
    expect(() => freeChildcareEngland(taxYear('2023-24')))
      .toThrow(RangeError);
  });
});
