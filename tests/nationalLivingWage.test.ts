/**
 * The National Living Wage, held against GOV.UK's "National Minimum Wage
 * and National Living Wage rates" page, the figures retyped here so a
 * transcription slip fails.
 */
import {describe, expect, it} from 'vitest';
import {
  YEAR_LABELS, nationalLivingWageHourly, payYear, taxYear,
} from '../src/index.js';

describe('nationalLivingWageHourly', () => {
  it('gives each held year\'s rate', () => {
    // GOV.UK rows: "April 2024 to March 2025", £11.44.
    expect(nationalLivingWageHourly(YEAR_LABELS.Y2024_25)).toBeCloseTo(11.44, 2);
    // "April 2025 to March 2026", £12.21.
    expect(nationalLivingWageHourly(YEAR_LABELS.Y2025_26)).toBeCloseTo(12.21, 2);
    // "April 2026 (current rate)", £12.71.
    expect(nationalLivingWageHourly(YEAR_LABELS.Y2026_27)).toBeCloseTo(12.71, 2);
  });

  it('reads a tax year and a pay year alike', () => {
    const label = YEAR_LABELS.Y2026_27;
    expect(nationalLivingWageHourly(taxYear(label))).toBeCloseTo(12.71, 2);
    expect(nationalLivingWageHourly(payYear(label))).toBeCloseTo(12.71, 2);
  });

  it('refuses a year it holds no rate for', () => {
    expect(() => nationalLivingWageHourly(YEAR_LABELS.Y2023_24))
      .toThrow(/no National Living Wage for 2023-24/);
  });
});
