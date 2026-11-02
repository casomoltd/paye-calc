/**
 * grossFor: the gross pension income that leaves a target after income
 * tax.
 *
 * Held two ways. Its definition — the smallest gross, in pence, whose
 * net reaches the target — is asserted across every published year and
 * region, through the personal allowance taper. And below the taper it
 * is held to the two-band closed form, which is reached by different
 * reasoning: `PA + (net - PA) / (1 - basic)`, then the same across the
 * higher band. Above the taper that form is wrong, and a figure worked
 * by hand pins the answer there.
 */
import {freePayOfAllowance} from '../src/freePay';
import {describe, expect, it} from 'vitest';
import {grossFor} from '../src/grossFor.js';
import {TakeHomePay} from '../src/TakeHomePay.js';
import {availableTaxYears, getTaxYearConfig} from '../src/taxYears/index.js';
import {GrossAnnual, TAX_REGIONS, taxYear} from '../src/types.js';
import type {TaxRegion, TaxYear} from '../src/types.js';

function net(gross: number, year: TaxYear, region: TaxRegion): number {
  const calc = new TakeHomePay(year, region);
  calc.setSalary(GrossAnnual(gross));
  return Math.round((gross - calc.incomeTax) * 100) / 100;
}

const TARGETS = [
  0.01, 5_000, 12_570, 12_571, 30_000, 42_000, 60_000, 80_000,
  95_000, 100_000, 110_000, 125_000, 150_000, 200_000,
];

describe('grossFor, by its definition', () => {
  for (const year of availableTaxYears) {
    for (const region of Object.values(TAX_REGIONS)) {
      it(`${year} ${region}`, () => {
        for (const target of TARGETS) {
          const gross = grossFor(target, year, region);
          expect(net(gross, year, region), `${target}`)
            .toBeGreaterThanOrEqual(target);
          const pennyLess = Math.round(gross * 100 - 1) / 100;
          expect(net(pennyLess, year, region), `${target}`)
            .toBeLessThan(target);
        }
      });
    }
  }

  it('is nothing for nothing', () => {
    expect(grossFor(0, taxYear('2026-27'), 'rUK')).toBe(0);
  });

  it('refuses a target that is not a number, or is negative', () => {
    expect(() => grossFor(Number.NaN, taxYear('2026-27'), 'rUK'))
      .toThrow(RangeError);
    expect(() => grossFor(-1, taxYear('2026-27'), 'rUK'))
      .toThrow(RangeError);
  });
});

describe('grossFor, against the two-band closed form', () => {
  const year = taxYear('2026-27');
  const config = getTaxYearConfig(year, 'rUK');
  // PAYE taxes pay above the free pay, £9 over the allowance: £12,579.
  const allowance = freePayOfAllowance(config.personalAllowance);
  const [basic, higher] = config.incomeTaxBands;
  const basicTop = allowance + basic.max;
  const twoBand = (target: number) => {
    const g = allowance + (target - allowance) / (1 - basic.rate);
    return g <= basicTop
      ? g
      : basicTop + (target - net(basicTop, year, 'rUK'))
        / (1 - higher.rate);
  };

  it('agrees to the penny below the taper', () => {
    for (const target of [20_000, 32_000, 45_000, 70_000]) {
      expect(grossFor(target, year, 'rUK'))
        .toBeCloseTo(twoBand(target), 1);
    }
  });

  it('asks for more gross than the two-band form inside the taper', () => {
    // The taper withdraws £1 of allowance for every £2 over its start,
    // so the marginal rate there is 60%, not 40%. A two-band inverse
    // does not know, and falls short of the target.
    const target = 80_000;
    const gross = grossFor(target, year, 'rUK');
    expect(gross).toBeGreaterThan(config.personalAllowanceTaperStart);
    expect(gross).toBeGreaterThan(twoBand(target) + 1_000);
    expect(net(twoBand(target), year, 'rUK')).toBeLessThan(target);
  });

  it('is £118,570.66 for £80,000 after tax, worked by hand', () => {
    // 2026-27, rest of UK: allowance £12,570, reduced by £1 for each whole
    // £2 over £100,000; PAYE frees the allowance left plus £9; 20% on the
    // first £37,700 taxed, 40% to £125,140. Near £118,570 the reduction is
    // £9,285, leaving £3,285 and freeing £3,294, so tax is
    // 7,540 + 40% of (gross − 3,294 − 37,700) = 0.4 × gross − 8,857.60.
    // Net is 0.6 × gross + 8,857.60, which reaches £80,000 at £118,570.66
    // once tax is rounded to the penny (38,570.664 → £38,570.66); a penny
    // less leaves £79,999.99.
    expect(grossFor(80_000, year, 'rUK')).toBeCloseTo(118_570.66, 9);
  });
});
