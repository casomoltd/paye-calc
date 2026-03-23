import {describe, it, expect} from 'vitest';
import {TaxCode, TaxStrategy} from '../src/TaxCode';

describe('TaxCode', () => {
  describe('parse — standard numeric codes', () => {
    it.each([
      ['1257L', 12570, TaxStrategy.Progressive],
      ['1257l', 12570, TaxStrategy.Progressive],
      ['45L', 450, TaxStrategy.Progressive],
      ['1000M', 10000, TaxStrategy.Progressive],
      ['1500N', 15000, TaxStrategy.Progressive],
      ['500T', 5000, TaxStrategy.Progressive],
      ['1257', 12570, TaxStrategy.Progressive],
    ])(
      '%s → PA=%i, strategy=%s',
      (code, pa, strategy) => {
        const result = TaxCode.parse(code);
        expect(result).not.toBeNull();
        expect(result!.personalAllowance).toBe(pa);
        expect(result!.strategy).toBe(strategy);
        expect(result!.prefix).toBeNull();
      },
    );
  });

  describe('parse — special codes', () => {
    it('BR → BasicRate, PA=0', () => {
      const r = TaxCode.parse('BR');
      expect(r).not.toBeNull();
      expect(r!.personalAllowance).toBe(0);
      expect(r!.strategy).toBe(
        TaxStrategy.BasicRate,
      );
    });

    it('D0 → HigherRate, PA=0', () => {
      const r = TaxCode.parse('D0');
      expect(r).not.toBeNull();
      expect(r!.personalAllowance).toBe(0);
      expect(r!.strategy).toBe(
        TaxStrategy.HigherRate,
      );
    });

    it('D1 → AdditionalRate, PA=0', () => {
      const r = TaxCode.parse('D1');
      expect(r).not.toBeNull();
      expect(r!.personalAllowance).toBe(0);
      expect(r!.strategy).toBe(
        TaxStrategy.AdditionalRate,
      );
    });

    it('NT → NoTax, PA=0', () => {
      const r = TaxCode.parse('NT');
      expect(r).not.toBeNull();
      expect(r!.personalAllowance).toBe(0);
      expect(r!.strategy).toBe(TaxStrategy.NoTax);
    });

    it('0T → Progressive, PA=0', () => {
      const r = TaxCode.parse('0T');
      expect(r).not.toBeNull();
      expect(r!.personalAllowance).toBe(0);
      expect(r!.strategy).toBe(
        TaxStrategy.Progressive,
      );
    });
  });

  describe('parse — K codes (negative PA)', () => {
    it('K100 → PA=-1000', () => {
      const r = TaxCode.parse('K100');
      expect(r).not.toBeNull();
      expect(r!.personalAllowance).toBe(-1000);
      expect(r!.strategy).toBe(
        TaxStrategy.Progressive,
      );
    });

    it('K500 → PA=-5000', () => {
      const r = TaxCode.parse('K500');
      expect(r).not.toBeNull();
      expect(r!.personalAllowance).toBe(-5000);
    });

    it('K1 → PA=-10', () => {
      const r = TaxCode.parse('K1');
      expect(r).not.toBeNull();
      expect(r!.personalAllowance).toBe(-10);
    });
  });

  describe('parse — Scottish prefix (S)', () => {
    it('S1257L → prefix=S, PA=12570', () => {
      const r = TaxCode.parse('S1257L');
      expect(r).not.toBeNull();
      expect(r!.prefix).toBe('S');
      expect(r!.personalAllowance).toBe(12570);
      expect(r!.strategy).toBe(
        TaxStrategy.Progressive,
      );
    });

    it('SBR → prefix=S, BasicRate', () => {
      const r = TaxCode.parse('SBR');
      expect(r).not.toBeNull();
      expect(r!.prefix).toBe('S');
      expect(r!.strategy).toBe(
        TaxStrategy.BasicRate,
      );
    });

    it('SK100 → prefix=S, PA=-1000', () => {
      const r = TaxCode.parse('SK100');
      expect(r).not.toBeNull();
      expect(r!.prefix).toBe('S');
      expect(r!.personalAllowance).toBe(-1000);
    });
  });

  describe('parse — Welsh prefix (C)', () => {
    it('C1257L → prefix=C, PA=12570', () => {
      const r = TaxCode.parse('C1257L');
      expect(r).not.toBeNull();
      expect(r!.prefix).toBe('C');
      expect(r!.personalAllowance).toBe(12570);
    });
  });

  describe('parse — emergency suffixes', () => {
    it('1257L W1 → strips W1', () => {
      const r = TaxCode.parse('1257L W1');
      expect(r).not.toBeNull();
      expect(r!.personalAllowance).toBe(12570);
    });

    it('1257L M1 → strips M1', () => {
      const r = TaxCode.parse('1257L M1');
      expect(r).not.toBeNull();
      expect(r!.personalAllowance).toBe(12570);
    });

    it('1257LX → strips X', () => {
      const r = TaxCode.parse('1257LX');
      expect(r).not.toBeNull();
      expect(r!.personalAllowance).toBe(12570);
    });

    it('BR M1 → still BasicRate', () => {
      const r = TaxCode.parse('BR M1');
      expect(r).not.toBeNull();
      expect(r!.strategy).toBe(
        TaxStrategy.BasicRate,
      );
    });
  });

  describe('parse — normalised code', () => {
    it('preserves original input as code', () => {
      const r = TaxCode.parse('s1257l');
      expect(r).not.toBeNull();
      expect(r!.code).toBe('S1257L');
    });

    it('preserves whitespace-trimmed code', () => {
      const r = TaxCode.parse('  1257L  ');
      expect(r).not.toBeNull();
      expect(r!.code).toBe('1257L');
    });
  });

  describe('parse — invalid inputs', () => {
    it.each([
      ['', 'empty string'],
      ['  ', 'whitespace only'],
      ['ABC', 'random letters'],
      ['12.5L', 'decimal number'],
      ['D2', 'invalid D code'],
      ['K', 'K with no number'],
      ['KL', 'K with letter'],
      ['LL', 'double letter'],
    ])('returns null for %s (%s)', (input) => {
      expect(TaxCode.parse(input)).toBeNull();
    });
  });

  describe('isValid', () => {
    it('returns true for valid codes', () => {
      expect(TaxCode.isValid('1257L')).toBe(true);
      expect(TaxCode.isValid('BR')).toBe(true);
      expect(TaxCode.isValid('K100')).toBe(true);
    });

    it('returns false for invalid codes', () => {
      expect(TaxCode.isValid('')).toBe(false);
      expect(TaxCode.isValid('ABC')).toBe(false);
    });
  });
});
