// What the model reports beyond the totals: net to gross, per-period
// figures, the effective tax rate and the band breakdowns.

import {describe, it, expect, beforeEach} from 'vitest';
import {
  GrossAnnual,
  NetAnnual,
  Period,
  taxYear,
  StudentLoanPlan,
} from '../../src/types';
import {TakeHomePay} from '../../src/TakeHomePay';

describe('TakeHomePay: outputs', () => {
  let model: TakeHomePay;

  beforeEach(() => {
    model = new TakeHomePay(taxYear('2024-25'), 'rUK');
  });

  describe('net to gross reverse', () => {
    it('basic rate earner', () => {
      model.setSalary(GrossAnnual(40000));
      const expectedNet = model.net;

      model.setSalary(NetAnnual(expectedNet));
      expect(model.gross).toBeCloseTo(40000, 0);
    });

    it('higher rate earner', () => {
      model.setSalary(GrossAnnual(80000));
      const expectedNet = model.net;

      model.setSalary(NetAnnual(expectedNet));
      expect(model.gross).toBeCloseTo(80000, 0);
    });

    it('PA taper zone', () => {
      model.setSalary(GrossAnnual(110000));
      const expectedNet = model.net;

      model.setSalary(NetAnnual(expectedNet));
      // A tax code moves in tens of pounds of allowance, which the taper
      // takes £1 per £2 of pay, so free pay holds for £20 of gross and
      // then drops £10: net is flat across up to £20 of gross, and the
      // search returns the least gross in that stretch.
      expect(Math.abs(model.gross - 110000)).toBeLessThan(20);
    });

    it('returns 0 for negative net', () => {
      model.setSalary(NetAnnual(-1000));
      expect(model.gross).toBe(0);
    });
  });

  describe('period display values', () => {
    it('shows annual values by default', () => {
      model.setSalary(GrossAnnual(60000));
      model.setPeriod(Period.Annual);
      expect(model.displayGross).toBe(60000);
      expect(model.displayNet).toBe(model.net);
    });

    it('shows monthly values', () => {
      model.setSalary(GrossAnnual(60000));
      model.setPeriod(Period.Monthly);
      expect(model.displayGross).toBe(5000);
      expect(model.displayNet).toBeCloseTo(
        model.net / 12, 2,
      );
    });

    it('shows weekly values', () => {
      model.setSalary(GrossAnnual(52000));
      model.setPeriod(Period.Weekly);
      expect(model.displayGross).toBe(1000);
      expect(model.displayNet).toBeCloseTo(
        model.net / 52, 2,
      );
      expect(model.displayIncomeTax).toBeCloseTo(
        model.incomeTax / 52, 2,
      );
      expect(
        model.displayNationalInsurance,
      ).toBeCloseTo(
        model.nationalInsurance / 52, 2,
      );
    });

  });

  describe('effective tax rate', () => {
    it('calculates as percentage of gross', () => {
      model.setSalary(GrossAnnual(50000));
      expect(model.effectiveTaxRate).toBeCloseTo(
        20.96, 1,
      );
    });

    it('returns 0 for zero income', () => {
      model.setSalary(GrossAnnual(0));
      expect(model.effectiveTaxRate).toBe(0);
    });
  });

  describe('breakdowns', () => {
    it('provides tax breakdown by band', () => {
      model.setSalary(GrossAnnual(60000));
      const breakdown = model.taxBreakdown;

      // The allowance, then the basic and higher bands it reaches.
      expect(breakdown).toHaveLength(3);
      expect(breakdown[0].name).toBe(
        'Personal Allowance',
      );
      expect(breakdown[0].rate).toBe(0);
      expect(breakdown[0].taxPaid).toBe(0);
      expect(breakdown[1].name).toBe('Basic Rate');
      expect(breakdown[1].rate).toBeCloseTo(0.2, 9);
    });

    it('provides NI breakdown', () => {
      model.setSalary(GrossAnnual(60000));
      const ni = model.niBreakdown;

      expect(ni.belowThreshold).toBe(12570);
      expect(ni.mainRateAmount).toBe(37700);
      expect(ni.upperRateAmount).toBe(9730);
      expect(ni.total).toBeCloseTo(3210.6, 1);
    });
  });

  describe('each total is the sum of its breakdown', () => {
    // Every deduction is worked per row (band, NI rate, loan plan) and
    // rounded there, as HMRC's student-loan test data works each plan
    // on its own; the total is the rows' sum, never a second rounding.
    const sum = (values: number[]) =>
      Math.round(values.reduce((a, b) => a + b, 0) * 100) / 100;

    it.each(['rUK', 'scotland'] as const)('%s, two loan plans', (region) => {
      const swept = new TakeHomePay(taxYear('2025-26'), region);
      swept.setStudentLoanPlans(
        new Set([StudentLoanPlan.Plan2, StudentLoanPlan.Postgraduate]),
      );
      for (let gross = 12_000; gross <= 160_000; gross += 7.37) {
        swept.setSalary(GrossAnnual(gross));
        const loans = swept.studentLoanBreakdown.map((l) => l.deduction);
        const bands = swept.taxBreakdown.map((b) => b.taxPaid);
        const ni = swept.niBreakdown;
        // The loan line is the one that tells the rules apart: two
        // plans' pence can round either way. Band edges and NI
        // limits are whole pounds, so only one tax or NI row carries
        // pence, and those two lines hold the rule rather than test it.
        expect(swept.studentLoanDeduction).toBe(sum(loans));
        expect(swept.incomeTax).toBe(sum(bands));
        expect(swept.nationalInsurance)
          .toBe(sum([ni.mainRateTax, ni.upperRateTax]));
      }
    });
  });
});
