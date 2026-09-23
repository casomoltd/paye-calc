/**
 * minimumPensionAge: the normal minimum pension age on a drawing date.
 *
 * The ages and dates are retyped from Finance Act 2004 s.279(1), the
 * source the library cites, so a mistyped step in either place fails.
 */
import {describe, expect, it} from 'vitest';
import {minimumPensionAge} from '../src/index.js';

describe('minimumPensionAge', () => {
  it('is 50 before 6 April 2010', () => {
    // s.279(1)(a)(i): "before 6 April 2010, 50"
    expect(minimumPensionAge(new Date(2010, 3, 5))).toBe(50);
  });

  it('is 55 from 6 April 2010 until 5 April 2028', () => {
    // s.279(1)(a)(ii): "on and after that date but before 6 April 2028, 55"
    expect(minimumPensionAge(new Date(2010, 3, 6))).toBe(55);
    expect(minimumPensionAge(new Date(2028, 3, 5))).toBe(55);
  });

  it('is 57 from 6 April 2028', () => {
    // s.279(1)(a)(iii): "on and after 6 April 2028, 57"
    expect(minimumPensionAge(new Date(2028, 3, 6))).toBe(57);
    expect(minimumPensionAge(new Date(2048, 2, 31))).toBe(57);
  });

  it('refuses something that is not a date', () => {
    expect(() => minimumPensionAge(new Date('not a date'))).toThrow(RangeError);
  });
});
