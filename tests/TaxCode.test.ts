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
        const result = TaxCode.from(code);
        expect(result.personalAllowance).toBe(pa);
        expect(result.strategy).toBe(strategy);
        expect(result.prefix).toBeNull();
      },
    );
  });

  describe('parse — special codes', () => {
    it('BR → BasicRate, PA=0', () => {
      const r = TaxCode.from('BR');
      expect(r.personalAllowance).toBe(0);
      expect(r.strategy).toBe(
        TaxStrategy.BasicRate,
      );
    });

    // HMRC PAYE Manual PAYE11025: Dn is the nth rate above basic,
    // D0 to D1 outside Scotland and SD0 to SD3 inside it.
    it.each([
      ['D0', 0], ['D1', 1], ['CD1', 1],
      ['SD0', 0], ['SD1', 1], ['SD2', 2], ['SD3', 3],
    ])('%s → FlatRate, band %i, PA=0', (input, band) => {
      const r = TaxCode.from(input);
      expect(r.personalAllowance).toBe(0);
      expect(r.strategy).toBe(TaxStrategy.FlatRate);
      expect(r.rule).toEqual({strategy: TaxStrategy.FlatRate, band});
    });

    it('NT → NoTax, PA=0', () => {
      const r = TaxCode.from('NT');
      expect(r.personalAllowance).toBe(0);
      expect(r.strategy).toBe(TaxStrategy.NoTax);
    });

    it('0T → Progressive, PA=0', () => {
      const r = TaxCode.from('0T');
      expect(r.personalAllowance).toBe(0);
      expect(r.strategy).toBe(
        TaxStrategy.Progressive,
      );
    });
  });

  describe('parse — K codes (negative PA)', () => {
    it('K100 → PA=-1000', () => {
      const r = TaxCode.from('K100');
      expect(r.personalAllowance).toBe(-1000);
      expect(r.strategy).toBe(
        TaxStrategy.Progressive,
      );
    });

    it('K500 → PA=-5000', () => {
      const r = TaxCode.from('K500');
      expect(r.personalAllowance).toBe(-5000);
    });

    it('K1 → PA=-10', () => {
      const r = TaxCode.from('K1');
      expect(r.personalAllowance).toBe(-10);
    });
  });

  describe('parse — Scottish prefix (S)', () => {
    it('S1257L → prefix=S, PA=12570', () => {
      const r = TaxCode.from('S1257L');
      expect(r.prefix).toBe('S');
      expect(r.personalAllowance).toBe(12570);
      expect(r.strategy).toBe(
        TaxStrategy.Progressive,
      );
    });

    it('SBR → prefix=S, BasicRate', () => {
      const r = TaxCode.from('SBR');
      expect(r.prefix).toBe('S');
      expect(r.strategy).toBe(
        TaxStrategy.BasicRate,
      );
    });

    it('SK100 → prefix=S, PA=-1000', () => {
      const r = TaxCode.from('SK100');
      expect(r.prefix).toBe('S');
      expect(r.personalAllowance).toBe(-1000);
    });
  });

  describe('parse — Welsh prefix (C)', () => {
    it('C1257L → prefix=C, PA=12570', () => {
      const r = TaxCode.from('C1257L');
      expect(r.prefix).toBe('C');
      expect(r.personalAllowance).toBe(12570);
    });
  });

  describe('nation — prefix translated to a UK nation', () => {
    it.each([
      ['S1257L', 'scotland'],
      ['SBR', 'scotland'],
      ['SK100', 'scotland'],
      ['C1257L', 'wales'],
      ['CBR', 'wales'],
    ])('%s → nation=%s', (code, nation) => {
      expect(TaxCode.from(code).nation).toBe(nation);
    });

    it.each([
      ['1257L'],
      ['BR'],
      ['K100'],
      ['NT'],
    ])('%s → nation=null (no prefix)', (code) => {
      expect(TaxCode.from(code).nation).toBeNull();
    });
  });

  describe('parse — emergency suffixes', () => {
    it.each([
      {code: '1257L W1', suffix: 'W1'},
      {code: '1257L M1', suffix: 'M1'},
      {code: '1257LX', suffix: 'X'},
    ])('$code → strips $suffix', ({code}) => {
      const r = TaxCode.from(code);
      expect(r.personalAllowance).toBe(12570);
    });

    it('BR M1 → still BasicRate', () => {
      const r = TaxCode.from('BR M1');
      expect(r.strategy).toBe(
        TaxStrategy.BasicRate,
      );
    });
  });

  describe('parse — normalised code', () => {
    it('preserves original input as code', () => {
      const r = TaxCode.from('s1257l');
      expect(r.code).toBe('S1257L');
    });

    it('preserves whitespace-trimmed code', () => {
      const r = TaxCode.from('  1257L  ');
      expect(r.code).toBe('1257L');
    });
  });

  describe('parse — invalid inputs', () => {
    it.each([
      ['', 'empty string'],
      ['  ', 'whitespace only'],
      ['ABC', 'random letters'],
      ['12.5L', 'decimal number'],
      ['D2', 'no third rate above basic outside Scotland'],
      ['CD2', 'nor in Wales'],
      ['SD4', 'nor a fifth in Scotland'],
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
