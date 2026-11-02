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

    it('reports annual-allowance excess', () => {
      model.setSalary(GrossAnnual(80000));
      const allowance = model.annualAllowance({employerContribution: 70000});
      expect(allowance.pensionInput).toBe(70000);
      expect(allowance.excess).toBe(10000);
    });
  });
});
