// How each pension basis changes take-home pay: employer (net pay),
// auto-enrolment on qualifying earnings, salary sacrifice, and personal
// relief at source; and working back from a net target on each.

import {describe, it, expect, beforeEach} from 'vitest';
import {
  GrossAnnual,
  NetAnnual,
  NO_PENSION,
  PensionPercent,
  PensionFixed,
  PensionBasis,
  taxYear,
} from '../../src/types';
import {TakeHomePay} from '../../src/TakeHomePay';
import type {Pension, PensionChoice} from '../../src/types';

/** A pension paid on `basis`. */
const on = (
  basis: Exclude<PensionBasis, PensionBasis.None>,
  contribution: Pension,
): PensionChoice => ({basis, contribution});

describe('TakeHomePay: pension bases', () => {
  let model: TakeHomePay;

  beforeEach(() => {
    model = new TakeHomePay(taxYear('2024-25'), 'rUK');
  });

  describe('no pension', () => {
    // The None basis carries no contribution, so nothing comes off pay,
    // tax or NI, and the allowance tests see none.
    it('takes nothing until a pension is set', () => {
      model.setSalary(GrossAnnual(40000));
      expect(model.pension).toEqual(NO_PENSION);
      expect(model.pensionDeduction).toBe(0);
      expect(model.taxableGross).toBe(40000);
      expect(model.annualAllowance().pensionInput).toBe(0);
    });
  });

  describe('pension deductions (employer)', () => {
    const basis = PensionBasis.Employer;

    it('reduces taxable income with %', () => {
      model.setSalary(GrossAnnual(50000));
      model.setPension(on(basis, PensionPercent(5)));
      expect(model.pensionDeduction).toBe(2500);
      // 20% of (47,500 − 12,579 free pay).
      expect(model.incomeTax).toBeCloseTo(6984.2, 9);
    });

    it('reduces taxable income with fixed', () => {
      model.setSalary(GrossAnnual(50000));
      model.setPension(on(basis, PensionFixed(3000)));
      expect(model.pensionDeduction).toBe(3000);
      // 20% of (47,000 − 12,579).
      expect(model.incomeTax).toBeCloseTo(6884.2, 9);
    });

    it('caps fixed pension at gross', () => {
      model.setSalary(GrossAnnual(5000));
      model.setPension(on(basis, PensionFixed(10000)));
      expect(model.pensionDeduction).toBe(5000);
    });

    it('NI on full gross (NET pay)', () => {
      model.setSalary(GrossAnnual(50000));
      model.setPension(on(basis, PensionPercent(2)));
      expect(model.nationalInsurance).toBeCloseTo(2994.4, 9);
    });
  });

  describe('auto-enrolment pension', () => {
    const basis = PensionBasis.AutoEnrolment;

    it.each([
      {name: 'on qualifying earnings only', salary: 30000, deduction: 1188},
      {name: 'caps at upper threshold', salary: 60000, deduction: 2202},
      {name: 'zero below lower threshold', salary: 5000, deduction: 0},
    ])('$name', ({salary, deduction}) => {
      model.setSalary(GrossAnnual(salary));
      model.setPension(on(basis, PensionPercent(5)));
      expect(model.pensionDeduction).toBe(deduction);
    });

    it('NI on full gross', () => {
      model.setSalary(GrossAnnual(50000));
      model.setPension(on(basis, PensionPercent(5)));
      expect(model.nationalInsurance).toBeCloseTo(2994.4, 9);
    });

    it('reduces taxable income', () => {
      model.setSalary(GrossAnnual(30000));
      model.setPension(on(basis, PensionPercent(5)));
      // 20% of (28,812 − 12,579).
      expect(model.incomeTax).toBeCloseTo(3246.6, 9);
    });
  });

  describe('salary sacrifice pension', () => {
    const basis = PensionBasis.SalarySacrifice;

    it('reduces NI base', () => {
      model.setSalary(GrossAnnual(50000));
      model.setPension(on(basis, PensionPercent(5)));
      expect(model.pensionDeduction).toBe(2500);
      expect(model.nationalInsurance).toBeCloseTo(2794.4, 9);
    });

    it('saves NI vs employer pension', () => {
      model.setSalary(GrossAnnual(50000));
      model.setPension(on(basis, PensionPercent(5)));
      const ssNI = model.nationalInsurance;

      model.setPension(on(PensionBasis.Employer, PensionPercent(5)));
      const employerNI = model.nationalInsurance;

      expect(ssNI).toBeLessThan(employerNI);
      expect(employerNI - ssNI).toBeCloseTo(200, 1);
    });

    it('same tax as employer pension', () => {
      model.setSalary(GrossAnnual(50000));
      model.setPension(on(basis, PensionPercent(5)));
      const ssTax = model.incomeTax;

      model.setPension(on(PensionBasis.Employer, PensionPercent(5)));
      const employerTax = model.incomeTax;

      expect(ssTax).toBe(employerTax);
    });
  });

  describe('personal pension (RAS)', () => {
    const basis = PensionBasis.Personal;

    it('does not reduce taxable income', () => {
      model.setSalary(GrossAnnual(50000));
      model.setPension(on(basis, PensionPercent(5)));
      expect(model.incomeTax).toBeCloseTo(7484.2, 9);
      expect(model.taxableGross).toBe(50000);
    });

    it('claims basic-rate relief on the gross contribution', () => {
      model.setSalary(GrossAnnual(50000));
      model.setPension(on(basis, PensionPercent(5)));
      expect(model.pensionDeduction).toBe(2500);
      // The provider "claims tax relief from the government at the basic
      // 20% rate and adds it to your pension pot": 20% of the £2,500
      // the pot receives, so the member pays £2,000.
      // https://www.gov.uk/tax-on-your-private-pension/pension-tax-relief
      expect(model.pensionTaxRelief).toBe(500);
    });

    it("takes only the member's share from pay", () => {
      model.setSalary(GrossAnnual(50000));
      model.setPension(on(basis, PensionPercent(5)));
      // 50,000 − (2,500 − 500) − 7,484.20 tax − 2,994.40 NI.
      expect(model.net).toBeCloseTo(37521.4, 9);
    });

    it('NI on full gross', () => {
      model.setSalary(GrossAnnual(50000));
      model.setPension(on(basis, PensionPercent(5)));
      expect(model.nationalInsurance).toBeCloseTo(2994.4, 9);
    });

    it('zero relief for non-personal', () => {
      model.setSalary(GrossAnnual(50000));
      model.setPension(on(PensionBasis.Employer, PensionPercent(5)));
      expect(model.pensionTaxRelief).toBe(0);
    });
  });

  describe('net to gross with pension bases', () => {
    it('reverses with salary sacrifice', () => {
      model.setPension(on(PensionBasis.SalarySacrifice, PensionPercent(5)));
      model.setSalary(GrossAnnual(50000));
      const expectedNet = model.net;

      model.setSalary(NetAnnual(expectedNet));
      expect(model.gross).toBeCloseTo(50000, 0);
    });

    it('reverses with personal pension', () => {
      model.setPension(on(PensionBasis.Personal, PensionPercent(5)));
      model.setSalary(GrossAnnual(50000));
      const expectedNet = model.net;

      model.setSalary(NetAnnual(expectedNet));
      expect(model.gross).toBeCloseTo(50000, 0);
    });

    it('reverses with auto-enrolment', () => {
      model.setPension(on(PensionBasis.AutoEnrolment, PensionPercent(5)));
      model.setSalary(GrossAnnual(50000));
      const expectedNet = model.net;

      model.setSalary(NetAnnual(expectedNet));
      expect(model.gross).toBeCloseTo(50000, 0);
    });
  });
});
