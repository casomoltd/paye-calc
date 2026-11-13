// A pension input period's total input against an allowance: money
// purchase contributions added to the defined benefit input, and whether
// the total exceeds the allowance.

import {describe, expect, it} from 'vitest';
import {
  allowanceExceeded, CURRENT_TAX_YEAR, getTaxYearConfig, taxYearEndOf,
  totalPensionInput,
} from '../src/index';
import type {AllowanceCheck, PensionInputPeriod} from '../src/index';

const ALLOWANCE = getTaxYearConfig(CURRENT_TAX_YEAR, 'rUK')
  .annualAllowance.standard;

/** A year whose one arrangement's pension grows by `growth`, in the tax
 *  year {@link ALLOWANCE} is read for. */
const growing = (growth: number): PensionInputPeriod => ({
  taxYearEnd: taxYearEndOf(CURRENT_TAX_YEAR),
  arrangements: [{
    pensionOpening: 10_000, pensionClosing: 10_000 + growth,
    lumpSumOpening: 0, lumpSumClosing: 0,
  }],
  cpi: 0,
});

/** The standard allowance, met by `contributions` paid into a pot. */
const paying = (contributions: number): AllowanceCheck =>
  ({contributions, allowance: ALLOWANCE});

/** The pension growth that gives an input of `input`: a defined
 *  benefit pension's growth counts sixteen times (HMRC PTM053301,
 *  https://www.gov.uk/hmrc-internal-manuals/pensions-tax-manual/ptm053301). */
const growthFor = (input: number) => input / 16;

describe('totalPensionInput', () => {
  it('adds contributions to the defined benefit input', () => {
    expect(totalPensionInput(growing(growthFor(30_000)), 5_000))
      .toBeCloseTo(35_000);
  });

  it('adds contributions to a nought defined benefit input', () => {
    expect(totalPensionInput(growing(-500), 100)).toBe(100);
  });

  it('refuses contributions that are not an amount', () => {
    expect(() => totalPensionInput(growing(0), Number.NaN)).toThrow(RangeError);
  });
});

describe('allowanceExceeded', () => {
  it('is false below the allowance', () => {
    expect(allowanceExceeded(growing(growthFor(ALLOWANCE / 2)), paying(0)))
      .toBe(false);
  });

  it('is false at the allowance itself: the charge is on what "exceeds" '
    + 'it (Finance Act 2004 s.227ZA(3))', () => {
    expect(allowanceExceeded(growing(growthFor(ALLOWANCE)), paying(0)))
      .toBe(false);
  });

  it('is true above the allowance, counting pot contributions', () => {
    expect(allowanceExceeded(growing(growthFor(ALLOWANCE)), paying(1)))
      .toBe(true);
  });

  it('refuses an allowance that is not an amount', () => {
    expect(() => allowanceExceeded(
      growing(0), {contributions: 0, allowance: -1})).toThrow(RangeError);
  });
});
