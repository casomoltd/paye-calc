// The tapered pension annual allowance as the take-home model reports
// it: threshold and adjusted income, the allowance left, and the excess.

import {describe, it, expect, beforeEach} from 'vitest';
import {
  GrossAnnual,
  PensionFixed,
  PensionBasis,
  taxYear,
} from '../../src/types';
import {TakeHomePay} from '../../src/TakeHomePay';

describe('TakeHomePay: annual allowance taper', () => {
  let model: TakeHomePay;

  beforeEach(() => {
    model = new TakeHomePay(taxYear('2024-25'), 'rUK');
  });

  describe('annual allowance taper', () => {
    it('full allowance below adjusted limit', () => {
      model.setSalary(GrossAnnual(250000));
      const allowance = model.annualAllowance();
      expect(allowance.adjustedIncome).toBe(250000);
      expect(allowance.available).toBe(60000);
    });

    it('gate: high adjusted, low threshold', () => {
      model.setSalary(GrossAnnual(210000));
      model.setPension({
        basis: PensionBasis.Employer, contribution: PensionFixed(15000),
      });
      const allowance = model.annualAllowance({employerContribution: 80000});
      expect(allowance.thresholdIncome).toBe(195000);
      expect(allowance.adjustedIncome).toBe(290000);
      // threshold income ≤ £200k → taper disregarded
      expect(allowance.available).toBe(60000);
    });

    it('tapers £1 per £2 over £260k adjusted', () => {
      model.setSalary(GrossAnnual(300000));
      const allowance = model.annualAllowance();
      expect(allowance.adjustedIncome).toBe(300000);
      expect(allowance.available).toBe(40000);
    });

    it('floors at £10,000', () => {
      model.setSalary(GrossAnnual(360000));
      expect(model.annualAllowance().available).toBe(10000);
    });

    it('uses MPAA when flexibly accessed', () => {
      model.setSalary(GrossAnnual(80000));
      expect(model.annualAllowance({mpaaTriggered: true}).available)
        .toBe(10000);
    });

    it('DB pension input is 16x accrual', () => {
      model.setSalary(GrossAnnual(150000));
      expect(model.annualAllowance({dbAnnualAccrual: 5000}).pensionInput)
        .toBe(80000);
    });

    it('adds an employer DC payment to a DB input, but not the member\'s '
      + 'own DB contribution', () => {
      model.setSalary(GrossAnnual(80000));
      model.setPension({
        basis: PensionBasis.Employer, contribution: PensionFixed(8000),
      });
      const allowance = model.annualAllowance(
        {dbAnnualAccrual: 1000, employerContribution: 5000});
      // HMRC PTM053301: the DB input is 16 × the accrual, 16,000; the
      // employer's payment to a separate money purchase pot counts as
      // paid, 5,000. The member's 8,000 is paid into the DB scheme, so it
      // is already inside the 16,000.
      expect(allowance.pensionInput).toBe(1000 * 16 + 5000);
    });

    it('adds a relief-at-source contribution to a DB input', () => {
      model.setSalary(GrossAnnual(80000));
      model.setPension({
        basis: PensionBasis.Personal, contribution: PensionFixed(8000),
      });
      const allowance = model.annualAllowance(
        {dbAnnualAccrual: 1000, employerContribution: 5000});
      // HMRC PTM053301: the DB input is 16 × the accrual, 16,000. The
      // member's 8,000 goes to a personal pension, not the DB scheme, so
      // it counts as paid beside the employer's 5,000.
      expect(allowance.pensionInput).toBe(1000 * 16 + 8000 + 5000);
    });

    it('counts a sacrifice into a DB scheme once in adjusted income', () => {
      model.setSalary(GrossAnnual(300000));
      model.setPension({
        basis: PensionBasis.SalarySacrifice, contribution: PensionFixed(8000),
      });
      const allowance = model.annualAllowance({dbAnnualAccrual: 1000});
      // Worked by hand from gov.uk's taper steps. Net income is the pay
      // after the sacrifice, 292,000; threshold income adds the sacrifice
      // back, 300,000. The DB input is 16 × 1,000 = 16,000, and the
      // sacrifice is paid into it, so the employer's share is that input
      // less the member's own contributions (nil): 16,000. Adjusted income
      // is 292,000 + 16,000 = 308,000, and the allowance is 60,000 less
      // half of the 48,000 over the 260,000 limit.
      expect(allowance.thresholdIncome).toBe(300000);
      expect(allowance.adjustedIncome).toBe(308000);
      expect(allowance.available).toBe(36000);
      expect(allowance.pensionInput).toBe(16000);
    });

    it('reports annual-allowance excess', () => {
      model.setSalary(GrossAnnual(80000));
      const allowance = model.annualAllowance({employerContribution: 70000});
      expect(allowance.pensionInput).toBe(70000);
      expect(allowance.excess).toBe(10000);
    });
  });
});
