// How each pension basis changes take-home pay: employer (net pay),
// auto-enrolment on qualifying earnings, salary sacrifice, and personal
// relief at source; and working back from a net target on each.

import {describe, it, expect, beforeEach} from 'vitest';
import {
  GrossAnnual,
  NetAnnual,
  PensionPercent,
  PensionFixed,
  PensionBasis,
  taxYear,
} from '../../src/types';
import {TakeHomePay} from '../../src/TakeHomePay';

describe('TakeHomePay: pension bases', () => {
  let model: TakeHomePay;

  beforeEach(() => {
    model = new TakeHomePay(taxYear('2024-25'), 'rUK');
  });

  describe('no pension', () => {
    // A percentage set on the None basis is not a contribution: nothing
    // comes off pay, tax or NI, and the allowance tests see none.
    it('takes nothing, whatever percentage is set', () => {
      model.setPensionBasis(PensionBasis.None);
      model.setPension(PensionPercent(5));
      model.setSalary(GrossAnnual(40000));
      expect(model.pensionDeduction).toBe(0);
      expect(model.taxableGross).toBe(40000);
      expect(model.pensionInput).toBe(0);
    });
  });

  describe('pension deductions (employer)', () => {
    beforeEach(() => {
      model.setPensionBasis(PensionBasis.Employer);
    });

    it('reduces taxable income with %', () => {
      model.setSalary(GrossAnnual(50000));
      model.setPension(PensionPercent(5));
      expect(model.pensionDeduction).toBe(2500);
      // 20% of (47,500 − 12,579 free pay).
      expect(model.incomeTax).toBeCloseTo(6984.2, 9);
    });

    it('reduces taxable income with fixed', () => {
      model.setSalary(GrossAnnual(50000));
      model.setPension(PensionFixed(3000));
      expect(model.pensionDeduction).toBe(3000);
      // 20% of (47,000 − 12,579).
      expect(model.incomeTax).toBeCloseTo(6884.2, 9);
    });

    it('caps fixed pension at gross', () => {
      model.setSalary(GrossAnnual(5000));
      model.setPension(PensionFixed(10000));
      expect(model.pensionDeduction).toBe(5000);
    });

    it('NI on full gross (NET pay)', () => {
      model.setSalary(GrossAnnual(50000));
      model.setPension(PensionPercent(2));
      expect(model.nationalInsurance).toBeCloseTo(2994.4, 9);
    });
  });

  describe('auto-enrolment pension', () => {
    beforeEach(() => {
      model.setPensionBasis(
        PensionBasis.AutoEnrolment,
      );
    });

    it.each([
      {name: 'on qualifying earnings only', salary: 30000, deduction: 1188},
      {name: 'caps at upper threshold', salary: 60000, deduction: 2202},
      {name: 'zero below lower threshold', salary: 5000, deduction: 0},
    ])('$name', ({salary, deduction}) => {
      model.setSalary(GrossAnnual(salary));
      model.setPension(PensionPercent(5));
      expect(model.pensionDeduction).toBe(deduction);
    });

    it('NI on full gross', () => {
      model.setSalary(GrossAnnual(50000));
      model.setPension(PensionPercent(5));
      expect(model.nationalInsurance).toBeCloseTo(2994.4, 9);
    });

    it('reduces taxable income', () => {
      model.setSalary(GrossAnnual(30000));
      model.setPension(PensionPercent(5));
      // 20% of (28,812 − 12,579).
      expect(model.incomeTax).toBeCloseTo(3246.6, 9);
    });
  });

  describe('salary sacrifice pension', () => {
    beforeEach(() => {
      model.setPensionBasis(
        PensionBasis.SalarySacrifice,
      );
    });

    it('reduces NI base', () => {
      model.setSalary(GrossAnnual(50000));
      model.setPension(PensionPercent(5));
      expect(model.pensionDeduction).toBe(2500);
      expect(model.nationalInsurance).toBeCloseTo(2794.4, 9);
    });

    it('saves NI vs employer pension', () => {
      model.setSalary(GrossAnnual(50000));
      model.setPension(PensionPercent(5));
      const ssNI = model.nationalInsurance;

      model.setPensionBasis(PensionBasis.Employer);
      const employerNI = model.nationalInsurance;

      expect(ssNI).toBeLessThan(employerNI);
      expect(employerNI - ssNI).toBeCloseTo(200, 1);
    });

    it('same tax as employer pension', () => {
      model.setSalary(GrossAnnual(50000));
      model.setPension(PensionPercent(5));
      const ssTax = model.incomeTax;

      model.setPensionBasis(PensionBasis.Employer);
      const employerTax = model.incomeTax;

      expect(ssTax).toBe(employerTax);
    });
  });

  describe('personal pension (RAS)', () => {
    beforeEach(() => {
      model.setPensionBasis(PensionBasis.Personal);
    });

    it('does not reduce taxable income', () => {
      model.setSalary(GrossAnnual(50000));
      model.setPension(PensionPercent(5));
      expect(model.incomeTax).toBeCloseTo(7484.2, 9);
      expect(model.taxableGross).toBe(50000);
    });

    it('calculates basic-rate relief', () => {
      model.setSalary(GrossAnnual(50000));
      model.setPension(PensionPercent(5));
      expect(model.pensionDeduction).toBe(2500);
      expect(model.pensionTaxRelief).toBe(625);
    });

    it('includes relief in net', () => {
      model.setSalary(GrossAnnual(50000));
      model.setPension(PensionPercent(5));
      expect(model.net).toBeCloseTo(37646.4, 1);
    });

    it('NI on full gross', () => {
      model.setSalary(GrossAnnual(50000));
      model.setPension(PensionPercent(5));
      expect(model.nationalInsurance).toBeCloseTo(2994.4, 9);
    });

    it('zero relief for non-personal', () => {
      model.setPensionBasis(PensionBasis.Employer);
      model.setSalary(GrossAnnual(50000));
      model.setPension(PensionPercent(5));
      expect(model.pensionTaxRelief).toBe(0);
    });
  });

  describe('net to gross with pension bases', () => {
    it('reverses with salary sacrifice', () => {
      model.setPensionBasis(
        PensionBasis.SalarySacrifice,
      );
      model.setPension(PensionPercent(5));
      model.setSalary(GrossAnnual(50000));
      const expectedNet = model.net;

      model.setSalary(NetAnnual(expectedNet));
      expect(model.gross).toBeCloseTo(50000, 0);
    });

    it('reverses with personal pension', () => {
      model.setPensionBasis(PensionBasis.Personal);
      model.setPension(PensionPercent(5));
      model.setSalary(GrossAnnual(50000));
      const expectedNet = model.net;

      model.setSalary(NetAnnual(expectedNet));
      expect(model.gross).toBeCloseTo(50000, 0);
    });

    it('reverses with auto-enrolment', () => {
      model.setPensionBasis(
        PensionBasis.AutoEnrolment,
      );
      model.setPension(PensionPercent(5));
      model.setSalary(GrossAnnual(50000));
      const expectedNet = model.net;

      model.setSalary(NetAnnual(expectedNet));
      expect(model.gross).toBeCloseTo(50000, 0);
    });
  });
});
