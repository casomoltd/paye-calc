// Income tax on a salary alone: zero and low income, each band, and the
// Personal Allowance taper above £100,000. Figures are 2024-25 rUK.

import {describe, it, expect, beforeEach} from 'vitest';
import {GrossAnnual, taxYear} from '../../src/types';
import {TakeHomePay} from '../../src/TakeHomePay';

describe('TakeHomePay: income tax', () => {
  let model: TakeHomePay;

  beforeEach(() => {
    model = new TakeHomePay(taxYear('2024-25'), 'rUK');
  });

  describe('zero income', () => {
    it('returns zero for all values', () => {
      model.setSalary(GrossAnnual(0));
      expect(model.gross).toBe(0);
      expect(model.net).toBe(0);
      expect(model.incomeTax).toBe(0);
      expect(model.nationalInsurance).toBe(0);
    });
  });

  describe('income below Personal Allowance', () => {
    it('pays no tax or NI on £10,000', () => {
      model.setSalary(GrossAnnual(10000));
      expect(model.incomeTax).toBe(0);
      expect(model.nationalInsurance).toBe(0);
      expect(model.net).toBe(10000);
    });

    it('pays no tax on £12,570', () => {
      model.setSalary(GrossAnnual(12570));
      expect(model.incomeTax).toBe(0);
      expect(model.nationalInsurance).toBe(0);
      expect(model.net).toBe(12570);
    });
  });

  describe('basic rate taxpayer', () => {
    it('calculates correctly for £30k', () => {
      model.setSalary(GrossAnnual(30000));
      // 20% of (30,000 − 12,579 free pay).
      expect(model.incomeTax).toBeCloseTo(3484.2, 9);
      expect(model.nationalInsurance).toBeCloseTo(1394.4, 9);
      // 30,000 − 3,484.20 tax − 1,394.40 NI.
      expect(model.net).toBeCloseTo(25121.4, 9);
    });

    it('calculates correctly for £50k', () => {
      model.setSalary(GrossAnnual(50000));
      // 20% of (50,000 − 12,579).
      expect(model.incomeTax).toBeCloseTo(7484.2, 9);
      expect(model.nationalInsurance).toBeCloseTo(2994.4, 9);
    });
  });

  describe('higher rate taxpayer', () => {
    it('calculates correctly for £60k', () => {
      model.setSalary(GrossAnnual(60000));
      // 20% of 37,700 + 40% of 9,721: HMRC's estimator gives the same.
      expect(model.incomeTax).toBeCloseTo(11428.4, 9);
      expect(model.nationalInsurance).toBeCloseTo(3210.6, 9);
    });

    it('calculates correctly for £80k', () => {
      model.setSalary(GrossAnnual(80000));
      // 20% of 37,700 + 40% of 29,721.
      expect(model.incomeTax).toBeCloseTo(19428.4, 9);
    });
  });

  describe('PA taper (£100k+)', () => {
    it('loses the first £1 of allowance at £100,002', () => {
      model.setSalary(GrossAnnual(100000));
      expect(model.personalAllowance).toBe(12570);

      model.setSalary(GrossAnnual(100001));
      expect(model.personalAllowance).toBe(12570);

      model.setSalary(GrossAnnual(100002));
      expect(model.personalAllowance).toBe(12569);
    });

    it('loses £1 PA for every £2 over £100k', () => {
      model.setSalary(GrossAnnual(110000));
      expect(model.personalAllowance).toBe(7570);
    });

    it('has zero PA at £125,140', () => {
      model.setSalary(GrossAnnual(125140));
      expect(model.personalAllowance).toBe(0);
    });

    it('gives 40% tax + 2% NI for £1 from an even pound in the taper', () => {
      model.setSalary(GrossAnnual(110000));
      const marginal = model.marginalTaxRate;
      expect(marginal).toBeCloseTo(42, 0);
    });
  });

  describe('additional rate taxpayer', () => {
    it('calculates correctly for £150k', () => {
      model.setSalary(GrossAnnual(150000));
      expect(model.personalAllowance).toBe(0);
      // 20% of 37,700 + 40% of 87,440 + 45% of the 24,860 above 125,140.
      expect(model.incomeTax).toBe(53703);
    });
  });
});
