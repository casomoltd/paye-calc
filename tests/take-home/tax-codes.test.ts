// Tax codes as the model applies them: a code's own allowance in place
// of the tapered one, the flat-rate codes (BR, D codes, NT), and the
// D codes resolving to each nation's rates (HMRC PAYE Manual PAYE11025).
// HMRC's payroll test data carries BR and D0/D1 rows but no Scottish D
// code, so SD0 to SD3 are checked here against PAYE11025 by hand.

import {TaxCode} from '../../src/TaxCode';
import {describe, it, expect, beforeEach} from 'vitest';
import {
  GrossAnnual, TAX_OPENING_ROW_NAMES, TAX_ROW_KINDS, taxYear,
} from '../../src/types';
import {TakeHomePay} from '../../src/TakeHomePay';

describe('TakeHomePay: tax codes', () => {
  let model: TakeHomePay;

  beforeEach(() => {
    model = new TakeHomePay(taxYear('2024-25'), 'rUK');
  });

  describe('custom tax code', () => {
    it('BR: all income at 20%', () => {
      model.setSalary(GrossAnnual(50000));
      model.setTaxCode(TaxCode.from('BR'));
      expect(model.personalAllowance).toBe(0);
      expect(model.incomeTax).toBe(10000);
    });

    it.each([
      {name: 'D0: all income at 40%', code: 'D0', tax: 20000},
      {name: 'D1: all income at 45%', code: 'D1', tax: 22500},
      {name: 'NT: no tax', code: 'NT', tax: 0},
    ])('$name', ({code, tax}) => {
      model.setSalary(GrossAnnual(50000));
      model.setTaxCode(TaxCode.from(code));
      expect(model.incomeTax).toBe(tax);
    });

    it('0T: no allowance, progressive', () => {
      model.setSalary(GrossAnnual(30000));
      model.setTaxCode(TaxCode.from('0T'));
      expect(model.personalAllowance).toBe(0);
      expect(model.incomeTax).toBe(6000);
    });

    it('K100: negative PA', () => {
      model.setSalary(GrossAnnual(30000));
      model.setTaxCode(TaxCode.from('K100'));
      expect(model.personalAllowance).toBe(-1000);
      // K100 adds exactly £1,000 to pay, as HMRC's estimator shows:
      // 20% of 31,000.
      expect(model.incomeTax).toBe(6200);
    });

    it('K100: the breakdown opens with the pay the code adds', () => {
      model.setSalary(GrossAnnual(30000));
      model.setTaxCode(TaxCode.from('K100'));
      const [opening, ...bands] = model.taxBreakdown;
      // HMRC's estimator prints K100 as a £1,000 pay adjustment, not as a
      // negative allowance.
      expect(opening).toEqual({
        kind: TAX_ROW_KINDS.KCodeAddition,
        name: TAX_OPENING_ROW_NAMES.kCodePayAdjustment,
        taxableAmount: 1000,
      });
      expect(bands.every((row) => row.kind === TAX_ROW_KINDS.Band)).toBe(true);
      expect(model.taxBreakdown.every((row) => row.taxableAmount >= 0)).toBe(true);
    });

    it('a code says whether it is a K code from its letter', () => {
      expect(TaxCode.from('K100').isKCode).toBe(true);
      expect(TaxCode.from('SK100').isKCode).toBe(true);
      expect(TaxCode.from('1257L').isKCode).toBe(false);
      expect(TaxCode.from('0T').isKCode).toBe(false);
    });

    it('an L code opens with the allowance', () => {
      model.setSalary(GrossAnnual(30000));
      model.setTaxCode(TaxCode.from('500L'));
      expect(model.taxBreakdown[0]).toMatchObject({
        kind: TAX_ROW_KINDS.Allowance,
        name: TAX_OPENING_ROW_NAMES.personalAllowance,
        taxableAmount: 5000,
      });
    });

    it('500L: custom PA', () => {
      model.setSalary(GrossAnnual(30000));
      model.setTaxCode(TaxCode.from('500L'));
      expect(model.personalAllowance).toBe(5000);
      // 500L frees 5,009: 20% of 24,991.
      expect(model.incomeTax).toBeCloseTo(4998.2, 9);
    });

    it('NI unaffected by tax code', () => {
      model.setSalary(GrossAnnual(30000));
      const niDefault = model.nationalInsurance;

      model.setTaxCode(TaxCode.from('BR'));
      expect(model.nationalInsurance).toBe(niDefault);

      model.setTaxCode(TaxCode.from('NT'));
      expect(model.nationalInsurance).toBe(niDefault);
    });

    it('null clears custom code', () => {
      model.setSalary(GrossAnnual(30000));
      model.setTaxCode(TaxCode.from('BR'));
      expect(model.incomeTax).toBe(6000);

      model.setTaxCode(null);
      expect(model.incomeTax).toBeCloseTo(3484.2, 9);
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
      // PAYE11025: SD0 to SD3 are Scotland's four rates above basic.
      {name: 'SD0 uses the intermediate rate (21%)', code: 'SD0', tax: 10500},
      {name: 'SD1 uses the higher rate (42%)', code: 'SD1', tax: 21000},
      {name: 'SD2 uses the advanced rate (45%)', code: 'SD2', tax: 22500},
      {name: 'SD3 uses the top rate (48%)', code: 'SD3', tax: 24000},
    ])('$name', ({code, tax}) => {
      scottishModel.setSalary(GrossAnnual(50000));
      scottishModel.setTaxCode(TaxCode.from(code));
      expect(scottishModel.incomeTax).toBe(tax);
    });
  });

  describe('a D code and the rates must name the same nation', () => {
    // PAYE11025: D0 is 40% and D1 45% outside Scotland.
    it.each([
      {code: 'D0', tax: 20000},
      {code: 'D1', tax: 22500},
      {code: 'CD1', tax: 22500},
    ])('$code at rest-of-UK rates', ({code, tax}) => {
      model.setSalary(GrossAnnual(50000));
      model.setTaxCode(TaxCode.from(code));
      expect(model.incomeTax).toBe(tax);
    });

    it.each([
      {code: 'SD0', region: 'rUK'},
      {code: 'D0', region: 'scotland'},
      {code: 'CD1', region: 'scotland'},
    ] as const)('$code at $region rates throws', ({code, region}) => {
      const mismatched = new TakeHomePay(taxYear('2025-26'), region);
      mismatched.setSalary(GrossAnnual(50000));
      mismatched.setTaxCode(TaxCode.from(code));
      expect(() => mismatched.incomeTax).toThrow(/D code/);
    });

    it('a year without the band the code names throws', () => {
      // Scotland's advanced rate starts in 2024-25, so 2023-24 has
      // three rates above basic, and SD3 names a fourth.
      const before = new TakeHomePay(taxYear('2023-24'), 'scotland');
      before.setSalary(GrossAnnual(50000));
      before.setTaxCode(TaxCode.from('SD3'));
      expect(() => before.incomeTax).toThrow(/names no band/);
    });
  });
});
