import {taxYear} from '../src/types.js';
import {describe, it, expect} from 'vitest';
import {
  calculateTaperedAnnualAllowance,
  calculateThresholdIncome,
  calculateAdjustedIncome,
} from '../src/TaxYearConfig';
import type {TaxYearConfig} from '../src/TaxYearConfig';
import {getTaxYearConfig} from '../src/taxYears';

// HMRC's published worked examples (PTM057200) use the
// 2016-17 to 2019-20 regime: £150k adjusted-income limit,
// £40k standard allowance, £110k threshold-income gate,
// £10k floor. The library only ships 2023/24+ configs, so
// we assert the literal published outputs against a config
// overridden to those historical limits — proving formula
// fidelity to the oracle without shipping pre-2023 years.
const historical: TaxYearConfig = {
  ...getTaxYearConfig(taxYear('2025-26')),
  annualAllowance: {
    standard: 40000,
    moneyPurchase: 10000,
    adjustedIncomeLimit: 150000,
    thresholdIncomeLimit: 110000,
    taperFloor: 10000,
  },
};

describe('AA taper — HMRC PTM057200 oracle', () => {
  // Threshold income (130000) is above the £110k gate in
  // every simple case so the taper applies, matching
  // HMRC's adjusted-income-only worked figures.
  it('AI £160,000 → £35,000', () => {
    expect(
      calculateTaperedAnnualAllowance(
        160000, 130000, historical,
      ),
    ).toBe(35000);
  });

  it('AI £215,000 → £10,000 (floored)', () => {
    expect(
      calculateTaperedAnnualAllowance(
        215000, 130000, historical,
      ),
    ).toBe(10000);
  });

  it('AI £177,979 → £26,011 (rounds down)', () => {
    expect(
      calculateTaperedAnnualAllowance(
        177979, 130000, historical,
      ),
    ).toBe(26011);
  });

  it('Jon: TI £139,100, AI £178,500 → £25,750', () => {
    const inputs = {
      netIncome: 144500,
      memberContributions: 14000,
      employerContributions: 20000,
      reliefAtSourceContributions: 5400,
    };
    const threshold = calculateThresholdIncome(inputs);
    const adjusted = calculateAdjustedIncome(inputs);
    expect(threshold).toBe(139100);
    expect(adjusted).toBe(178500);
    expect(
      calculateTaperedAnnualAllowance(
        adjusted, threshold, historical,
      ),
    ).toBe(25750);
  });
});

// The mid-taper case below was additionally confirmed
// against HMRC's live Pension Annual Allowance tool
// (tax.service.gov.uk/paac) on 2026-06-22: £40,000
// available, £20,000 chargeable. See docs/verification.md.
describe('AA taper — current limits (2025-26)', () => {
  const cfg = getTaxYearConfig(taxYear('2025-26'));

  it('full allowance below adjusted-income limit', () => {
    expect(
      calculateTaperedAnnualAllowance(250000, 210000, cfg),
    ).toBe(60000);
  });

  it('threshold-income gate blocks the taper', () => {
    expect(
      calculateTaperedAnnualAllowance(400000, 200000, cfg),
    ).toBe(60000);
  });

  it('tapers £1 per £2 over £260,000', () => {
    expect(
      calculateTaperedAnnualAllowance(300000, 210000, cfg),
    ).toBe(40000);
  });

  it('floors at £10,000', () => {
    expect(
      calculateTaperedAnnualAllowance(360000, 210000, cfg),
    ).toBe(10000);
  });
});
