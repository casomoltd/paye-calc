/**
 * fullNewStatePension: the full new State Pension, per tax year.
 *
 * The weekly rate is retyped here from the GOV.UK page, which is the
 * source the library cites, so a mistyped figure in either place fails.
 */
import {describe, expect, it} from 'vitest';
import {
  fullNewStatePension, statePensionYearly, taxYear,
} from '../src/index.js';

describe('fullNewStatePension', () => {
  it('reads 2026-27 as £241.30 a week, 52 weeks a year', () => {
    const rate = fullNewStatePension(taxYear('2026-27'));
    expect(rate.weekly).toBe(241.3);
    expect(rate.yearly).toBeCloseTo(12547.6, 2);
  });

  it('refuses a year it holds no rate for', () => {
    expect(() => fullNewStatePension(taxYear('2023-24')))
      .toThrow(RangeError);
  });

  it('turns a forecast\'s weekly figure into a yearly one, 52 weeks', () => {
    expect(statePensionYearly(200)).toBe(10400);
    expect(() => statePensionYearly(-1)).toThrow(RangeError);
  });
});
