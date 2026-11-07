// A defined benefit arrangement's pension input, checked against the rule
// as HMRC PTM053301 states it:
// https://www.gov.uk/hmrc-internal-manuals/pensions-tax-manual/ptm053301

import {describe, expect, it} from 'vitest';
import {
  definedBenefitInput, FIRST_TAX_YEAR_PENSION_INPUT_PERIOD,
  refuseBeforePensionInputPeriods, taxYearEnd, taxYearLabel,
} from '../src/index';
import type {ArrangementValues} from '../src/index';

/** A tax year that is a pension input period: 2026-27. */
const YEAR = taxYearEnd(2027);

/** An arrangement's pension from `opening` to `closing`, a year, with no
 *  automatic lump sum. */
const pensionOnly = (opening: number, closing: number): ArrangementValues => ({
  pensionOpening: opening, pensionClosing: closing,
  lumpSumOpening: 0, lumpSumClosing: 0,
});

describe('definedBenefitInput', () => {
  it('counts a pension\'s growth sixteen times', () => {
    const input = definedBenefitInput(
      {taxYearEnd: YEAR, arrangements: [pensionOnly(10_000, 10_500)], cpi: 0});
    // HMRC PTM053301: the pension's growth times 16.
    expect(input).toBe(500 * 16);
  });

  it('uplifts the opening value by CPI and adds the lump sum once', () => {
    const input = definedBenefitInput({taxYearEnd: YEAR, arrangements: [{
      pensionOpening: 1_000, pensionClosing: 1_100,
      lumpSumOpening: 3_000, lumpSumClosing: 3_300,
    }], cpi: 0.05});
    // HMRC PTM053301: the pension's growth after its opening value's CPI
    // uplift, times 16, plus the lump sum's growth after the same uplift.
    // (1,100 − 1,050) × 16 + (3,300 − 3,150)
    expect(input).toBeCloseTo(50 * 16 + 150);
  });

  it('nets a falling lump sum against a rising pension in one '
    + 'arrangement', () => {
    const input = definedBenefitInput({taxYearEnd: YEAR, arrangements: [{
      pensionOpening: 1_000, pensionClosing: 1_100,
      lumpSumOpening: 3_000, lumpSumClosing: 2_700,
    }], cpi: 0});
    // HMRC PTM053301: one arrangement's input is 16 × the pension's growth
    // plus the lump sum's, before the floor: 100 × 16 − 300.
    expect(input).toBe(100 * 16 - 300);
  });

  it('floors each arrangement on its own', () => {
    const input = definedBenefitInput({taxYearEnd: YEAR, arrangements: [
      pensionOnly(2_000, 1_900),
      pensionOnly(1_000, 1_050),
    ], cpi: 0});
    // HMRC PTM053301: an arrangement whose benefits fall counts nought, so
    // it takes nothing off the other's 50 × 16; summed first, the two
    // would net to nought.
    expect(input).toBe(50 * 16);
  });

  it('never counts a fall in the benefit as negative input', () => {
    const input = definedBenefitInput(
      {taxYearEnd: YEAR, arrangements: [pensionOnly(10_000, 9_500)], cpi: 0});
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
      {taxYearEnd: YEAR, arrangements: [pensionOnly(12_988.58, 15_204.11)], cpi: 0.03});
    expect(input).toBeCloseTo(29_213.97, 1);
    expect(input).toBeCloseTo(29_213.9616, 4);
  });

  it('uplifts nothing when CPI fell', () => {
    const input = definedBenefitInput(
      {taxYearEnd: YEAR, arrangements: [pensionOnly(1_000, 1_050)], cpi: -0.01});
    // Finance Act 2004 s.235(3): the uplift is the percentage "(if any)"
    // by which the index is higher, so a fall uplifts by nought.
    expect(input).toBe(50 * 16);
  });

  it('throws on a negative opening or closing value', () => {
    expect(() => definedBenefitInput(
      {taxYearEnd: YEAR, arrangements: [pensionOnly(-1, 1_000)], cpi: 0}))
      .toThrow(RangeError);
    expect(() => definedBenefitInput({taxYearEnd: YEAR, arrangements: [{
      pensionOpening: 0, pensionClosing: 1_000,
      lumpSumOpening: 0, lumpSumClosing: -1,
    }], cpi: 0})).toThrow(RangeError);
  });

  it('throws on a value or a CPI that is not a finite number', () => {
    expect(() => definedBenefitInput(
      {taxYearEnd: YEAR, arrangements: [pensionOnly(Number.NaN, 1_000)], cpi: 0}))
      .toThrow(RangeError);
    expect(() => definedBenefitInput(
      {taxYearEnd: YEAR, arrangements: [pensionOnly(1_000, 1_050)], cpi: Number.NaN}))
      .toThrow(RangeError);
  });

  it('refuses a tax year before 2016-17, which is no period', () => {
    // Finance Act 2004 s.238ZA(3): the periods are "the tax year 2016-17
    // and each subsequent tax year"
    // (https://www.legislation.gov.uk/ukpga/2004/12/section/238ZA).
    const arrangements = [pensionOnly(1_000, 1_050)];
    expect(definedBenefitInput(
      {taxYearEnd: taxYearEnd(2017), arrangements, cpi: 0})).toBe(50 * 16);
    expect(() => definedBenefitInput(
      {taxYearEnd: taxYearEnd(2016), arrangements, cpi: 0}))
      .toThrow('definedBenefitInput: 2015-16 is before the first tax year '
        + 'that is a pension input period, 2016-17');
  });

  it('is nought with no arrangement', () => {
    expect(definedBenefitInput({taxYearEnd: YEAR, arrangements: [], cpi: 0})).toBe(0);
  });
});

describe('the pension input periods', () => {
  it('begin with 2016-17', () => {
    // Finance Act 2004 s.238ZA(3): "the tax year 2016-17 and each
    // subsequent tax year"
    // (https://www.legislation.gov.uk/ukpga/2004/12/section/238ZA).
    expect(taxYearLabel(FIRST_TAX_YEAR_PENSION_INPUT_PERIOD)).toBe('2016-17');
    expect(() => refuseBeforePensionInputPeriods('asked', taxYearEnd(2017)))
      .not.toThrow();
    expect(() => refuseBeforePensionInputPeriods('asked', taxYearEnd(2016)))
      .toThrow('asked: 2015-16 is before the first tax year that is a '
        + 'pension input period, 2016-17');
  });
});
