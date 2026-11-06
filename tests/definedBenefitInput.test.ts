// A defined benefit arrangement's pension input, checked against the rule
// as HMRC PTM053301 states it:
// https://www.gov.uk/hmrc-internal-manuals/pensions-tax-manual/ptm053301

import {describe, expect, it} from 'vitest';
import {definedBenefitInput} from '../src/index';

describe('definedBenefitInput', () => {
  it('counts a pension\'s growth sixteen times', () => {
    const input = definedBenefitInput(
      [{pension: {opening: 10_000, closing: 10_500}}], 0);
    // HMRC PTM053301: the pension's growth times 16.
    expect(input).toBe(500 * 16);
  });

  it('uplifts the opening value by CPI and adds the lump sum once', () => {
    const input = definedBenefitInput([{
      pension: {opening: 1_000, closing: 1_100},
      lumpSum: {opening: 3_000, closing: 3_300},
    }], 0.05);
    // HMRC PTM053301: the pension's growth after its opening value's CPI
    // uplift, times 16, plus the lump sum's growth after the same uplift.
    // (1,100 − 1,050) × 16 + (3,300 − 3,150)
    expect(input).toBeCloseTo(50 * 16 + 150);
  });

  it('nets a falling lump sum against a rising pension in one '
    + 'arrangement', () => {
    const input = definedBenefitInput([{
      pension: {opening: 1_000, closing: 1_100},
      lumpSum: {opening: 3_000, closing: 2_700},
    }], 0);
    // HMRC PTM053301: one arrangement's input is 16 × the pension's growth
    // plus the lump sum's, before the floor: 100 × 16 − 300.
    expect(input).toBe(100 * 16 - 300);
  });

  it('floors each arrangement on its own', () => {
    const input = definedBenefitInput([
      {pension: {opening: 2_000, closing: 1_900}},
      {pension: {opening: 1_000, closing: 1_050}},
    ], 0);
    // HMRC PTM053301: an arrangement whose benefits fall counts nought, so
    // it takes nothing off the other's 50 × 16; summed first, the two
    // would net to nought.
    expect(input).toBe(50 * 16);
  });

  it('never counts a fall in the benefit as negative input', () => {
    const input = definedBenefitInput(
      [{pension: {opening: 10_000, closing: 9_500}}], 0);
    // HMRC PTM053301: a fall gives an input of nought, not a negative one.
    expect(input).toBe(0);
  });

  it('matches HMRC\'s Fiona example', () => {
    // HMRC PTM053301, the Fiona example:
    // https://www.gov.uk/hmrc-internal-manuals/pensions-tax-manual/ptm053301
    // Opening pension £12,988.58, closing £15,204.11, no separate lump sum,
    // CPI 3 per cent. Opening value £214,051.79, closing value
    // £243,265.76, pension input £29,213.97. HMRC cuts the opening value
    // to the penny below (£214,051.7984 exactly), so the exact input sits
    // under a penny short of its figure.
    const input = definedBenefitInput(
      [{pension: {opening: 12_988.58, closing: 15_204.11}}], 0.03);
    expect(input).toBeCloseTo(29_213.97, 1);
    expect(input).toBeCloseTo(29_213.9616, 4);
  });

  it('uplifts nothing when CPI fell', () => {
    const input = definedBenefitInput(
      [{pension: {opening: 1_000, closing: 1_050}}], -0.01);
    // Finance Act 2004 s.235(3): the uplift is the percentage "(if any)"
    // by which the index is higher, so a fall uplifts by nought.
    expect(input).toBe(50 * 16);
  });

  it('throws on a negative opening or closing value', () => {
    expect(() => definedBenefitInput(
      [{pension: {opening: -1, closing: 1_000}}], 0)).toThrow(RangeError);
    expect(() => definedBenefitInput([{
      pension: {opening: 0, closing: 1_000},
      lumpSum: {opening: 0, closing: -1},
    }], 0)).toThrow(RangeError);
  });

  it('is nought with no arrangement', () => {
    expect(definedBenefitInput([], 0)).toBe(0);
  });
});
