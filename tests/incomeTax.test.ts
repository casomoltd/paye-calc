// Income tax as a pure function of taxable pay, the year and the code:
// one case per kind of code, on £30,000 of taxable pay in 2025-26 in the
// rest of the UK. Each figure is worked by hand from the published
// bands (basic 20% to £37,700 of taxable pay, higher 40%) and HMRC's
// free pay (1257L frees £12,579; K100 adds £1,000).

import {describe, expect, it} from 'vitest';
import {incomeTaxRows, taxOf} from '../src/incomeTax';
import {TaxCode} from '../src/TaxCode';
import {getTaxYearConfig} from '../src/taxYears';
import {taxYear} from '../src/types';

const config = getTaxYearConfig(taxYear('2025-26'), 'rUK');
const PAY = 30_000;

describe('incomeTaxRows', () => {
  it.each([
    ['no code: (30,000 − 12,579) × 20%', null, [3484.2]],
    ['1257L: the same as no code below the taper', '1257L', [3484.2]],
    ['K100: 31,000 × 20%', 'K100', [6200]],
    ['0T: nothing free, 30,000 × 20%', '0T', [6000]],
    ['BR: all of it at 20%', 'BR', [6000]],
    ['D0: all of it at 40%', 'D0', [12000]],
    ['NT: no tax', 'NT', []],
  ] as const)('%s', (_, code, taxByRow) => {
    const rows = incomeTaxRows(PAY, config, code ? TaxCode.from(code) : null);
    expect(rows.map((row) => row.taxPaid)).toEqual(taxByRow);
    expect(taxOf(rows)).toBe(taxByRow.reduce((a: number, b) => a + b, 0));
  });

  it('refuses a Scottish D code on the rest of the UK\'s rates', () => {
    expect(() => incomeTaxRows(PAY, config, TaxCode.from('SD0'))).toThrow();
  });
});
