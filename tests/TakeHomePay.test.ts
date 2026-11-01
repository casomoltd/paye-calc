import {taxYear} from '../src/types.js';
import {describe, it, expect, beforeEach} from 'vitest';
import {TakeHomePay} from '../src/TakeHomePay';
import {TaxCode} from '../src/TaxCode';
import {
  GrossAnnual,
  NetAnnual,
  PensionPercent,
  PensionFixed,
  PensionBasis,
  Period,
} from '../src/types';

describe('TakeHomePay', () => {
  let model: TakeHomePay;

  beforeEach(() => {
    model = new TakeHomePay(taxYear('2024-25'));
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
      expect(model.incomeTax).toBe(3486);
      expect(model.nationalInsurance).toBeCloseTo(1394.4, 9);
      expect(model.net).toBeCloseTo(25119.6, 9);
    });

    it('calculates correctly for £50k', () => {
      model.setSalary(GrossAnnual(50000));
      expect(model.incomeTax).toBe(7486);
      expect(model.nationalInsurance).toBeCloseTo(2994.4, 9);
    });
  });

  describe('higher rate taxpayer', () => {
    it('calculates correctly for £60k', () => {
      model.setSalary(GrossAnnual(60000));
      expect(model.incomeTax).toBe(11432);
      expect(model.nationalInsurance).toBeCloseTo(3210.6, 9);
    });

    it('calculates correctly for £80k', () => {
      model.setSalary(GrossAnnual(80000));
      expect(model.incomeTax).toBe(19432);
    });
  });

  describe('PA taper (£100k+)', () => {
    it('begins taper at £100,001', () => {
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

    it('calculates marginal rate in taper zone', () => {
      model.setSalary(GrossAnnual(110000));
      const marginal = model.marginalTaxRate;
      expect(marginal).toBeCloseTo(42, 0);
    });
  });

  describe('additional rate taxpayer', () => {
    it('calculates correctly for £150k', () => {
      model.setSalary(GrossAnnual(150000));
      expect(model.personalAllowance).toBe(0);
      expect(model.incomeTax).toBe(54331.5);
    });
  });

  describe('annual allowance taper', () => {
    it('full allowance below adjusted limit', () => {
      model.setPensionBasis(PensionBasis.Employer);
      model.setSalary(GrossAnnual(250000));
      expect(model.adjustedIncome).toBe(250000);
      expect(model.availableAnnualAllowance).toBe(60000);
    });

    it('gate: high adjusted, low threshold', () => {
      model.setPensionBasis(PensionBasis.Employer);
      model.setSalary(GrossAnnual(210000));
      model.setPension(PensionFixed(15000));
      model.setEmployerContribution(80000);
      expect(model.thresholdIncome).toBe(195000);
      expect(model.adjustedIncome).toBe(290000);
      // threshold income ≤ £200k → taper disregarded
      expect(model.availableAnnualAllowance).toBe(60000);
    });

    it('tapers £1 per £2 over £260k adjusted', () => {
      model.setPensionBasis(PensionBasis.Employer);
      model.setSalary(GrossAnnual(300000));
      expect(model.adjustedIncome).toBe(300000);
      expect(model.availableAnnualAllowance).toBe(40000);
    });

    it('floors at £10,000', () => {
      model.setPensionBasis(PensionBasis.Employer);
      model.setSalary(GrossAnnual(360000));
      expect(model.availableAnnualAllowance).toBe(10000);
    });

    it('uses MPAA when flexibly accessed', () => {
      model.setSalary(GrossAnnual(80000));
      model.setMpaaTriggered(true);
      expect(model.availableAnnualAllowance).toBe(10000);
    });

    it('DB pension input is 16x accrual', () => {
      model.setSalary(GrossAnnual(150000));
      model.setDbAnnualAccrual(5000);
      expect(model.pensionInput).toBe(80000);
    });

    it('reports annual-allowance excess', () => {
      model.setSalary(GrossAnnual(80000));
      model.setEmployerContribution(70000);
      expect(model.pensionInput).toBe(70000);
      expect(model.annualAllowanceExcess).toBe(10000);
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
      expect(model.incomeTax).toBe(6986);
    });

    it('reduces taxable income with fixed', () => {
      model.setSalary(GrossAnnual(50000));
      model.setPension(PensionFixed(3000));
      expect(model.pensionDeduction).toBe(3000);
      expect(model.incomeTax).toBe(6886);
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
      expect(model.incomeTax).toBeCloseTo(3248.4, 9);
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
      expect(model.incomeTax).toBe(7486);
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
      expect(model.net).toBeCloseTo(37644.6, 1);
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
      expect(model.gross).toBeCloseTo(110000, -1);
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

      expect(breakdown.length).toBeGreaterThan(0);
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

  describe('assumptions', () => {
    it('lists standard assumptions', () => {
      const assumptions = model.assumptions;
      expect(assumptions.length).toBeGreaterThan(0);
      expect(assumptions).toContain(
        'England, Wales, or Northern Ireland ' +
        'tax rates',
      );
    });

    it('reflects pension basis', () => {
      model.setPensionBasis(
        PensionBasis.SalarySacrifice,
      );
      expect(model.assumptions).toContain(
        'Salary sacrifice ' +
        '(pension reduces both tax and NI)',
      );

      model.setPensionBasis(PensionBasis.Personal);
      expect(model.assumptions).toContain(
        'Personal pension / relief at source ' +
        '(provider reclaims basic-rate relief)',
      );
    });
  });

  describe('custom tax code', () => {
    it('BR: all income at 20%', () => {
      model.setSalary(GrossAnnual(50000));
      model.setTaxCode(TaxCode.parse('BR')!);
      expect(model.personalAllowance).toBe(0);
      expect(model.incomeTax).toBe(10000);
    });

    it.each([
      {name: 'D0: all income at 40%', code: 'D0', tax: 20000},
      {name: 'D1: all income at 45%', code: 'D1', tax: 22500},
      {name: 'NT: no tax', code: 'NT', tax: 0},
    ])('$name', ({code, tax}) => {
      model.setSalary(GrossAnnual(50000));
      model.setTaxCode(TaxCode.parse(code)!);
      expect(model.incomeTax).toBe(tax);
    });

    it('0T: no allowance, progressive', () => {
      model.setSalary(GrossAnnual(30000));
      model.setTaxCode(TaxCode.parse('0T')!);
      expect(model.personalAllowance).toBe(0);
      expect(model.incomeTax).toBe(6000);
    });

    it('K100: negative PA', () => {
      model.setSalary(GrossAnnual(30000));
      model.setTaxCode(TaxCode.parse('K100')!);
      expect(model.personalAllowance).toBe(-1000);
      expect(model.incomeTax).toBe(6200);
    });

    it('500L: custom PA', () => {
      model.setSalary(GrossAnnual(30000));
      model.setTaxCode(TaxCode.parse('500L')!);
      expect(model.personalAllowance).toBe(5000);
      expect(model.incomeTax).toBe(5000);
    });

    it('NI unaffected by tax code', () => {
      model.setSalary(GrossAnnual(30000));
      const niDefault = model.nationalInsurance;

      model.setTaxCode(TaxCode.parse('BR')!);
      expect(model.nationalInsurance).toBe(niDefault);

      model.setTaxCode(TaxCode.parse('NT')!);
      expect(model.nationalInsurance).toBe(niDefault);
    });

    it('null clears custom code', () => {
      model.setSalary(GrossAnnual(30000));
      model.setTaxCode(TaxCode.parse('BR')!);
      expect(model.incomeTax).toBe(6000);

      model.setTaxCode(null);
      expect(model.incomeTax).toBe(3486);
    });

    it('assumptions show custom code', () => {
      model.setTaxCode(TaxCode.parse('BR')!);
      expect(model.assumptions).toContain(
        'Tax code: BR',
      );
    });

    it('assumptions show standard when cleared', () => {
      model.setTaxCode(null);
      expect(model.assumptions).toContain(
        'Standard tax code (1257L) ' +
        '– no special circumstances',
      );
    });
  });

  describe('Scottish flat-rate tax codes', () => {
    let scottishModel: TakeHomePay;

    beforeEach(() => {
      scottishModel = new TakeHomePay(
        taxYear('2025-26'), 'scotland',
      );
    });

    it.each([
      {name: 'BR uses Scottish basic rate (20%)', code: 'BR', tax: 10000},
      {name: 'D0 uses Scottish higher rate (42%)', code: 'D0', tax: 21000},
      {name: 'D1 uses Scottish top rate (48%)', code: 'D1', tax: 24000},
    ])('$name', ({code, tax}) => {
      scottishModel.setSalary(GrossAnnual(50000));
      scottishModel.setTaxCode(TaxCode.parse(code)!);
      expect(scottishModel.incomeTax).toBe(tax);
    });
  });
});
