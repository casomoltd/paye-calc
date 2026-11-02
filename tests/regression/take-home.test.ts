// Take-home pay end to end: a salary, pension and student loans in,
// pension, taxable gross, tax, NI, loan, relief and net out, per tax
// year and region.
//
// Two kinds of expectation, and they carry different weight:
// - Snapshots (rest of UK and Scotland by pension basis, student loans)
//   are this model's own figures. They catch an unintended change, not a
//   wrong rule, because a wrong rule produces them too; where a rule
//   changes, a row is re-derived by hand. The check on income tax itself
//   is `hmrc.test.ts`.
// - The higher-rate threshold is checked against the published
//   threshold, and against the engine's own marginal rate.

import {describe, it, expect} from 'vitest';
import {TakeHomePay} from '../../src/TakeHomePay';
import {
  higherRateBand,
  higherRateThreshold,
} from '../../src/TaxYearConfig';
import {getTaxYearConfig} from '../../src/taxYears';
import {GrossAnnual, taxYear} from '../../src/types';
import {runScenario} from '../scenario';
import {REST_OF_UK} from '../fixtures/scenarios/rest-of-uk';
import {SCOTLAND} from '../fixtures/scenarios/scotland';
import {STUDENT_LOANS} from '../fixtures/scenarios/student-loans';

// ─── Snapshots ───────────────────────────────────

// One table per region and pension basis; each runs down the incomes.
for (const [region, tables] of [
  ['rest of UK', REST_OF_UK],
  ['Scotland', SCOTLAND],
] as const) {
  for (const [basis, table] of Object.entries(tables)) {
    describe(`regression: ${region}, ${basis}`, () => {
      it.each([...table])('$case', runScenario);
    });
  }
}

for (const [plans, table] of Object.entries(STUDENT_LOANS)) {
  describe(`regression: student loans, ${plans}`, () => {
    it.each([...table])('$case', runScenario);
  });
}

// ─── Higher-rate threshold, by region ────────────
//
// Expectations are the published thresholds, not a re-derivation:
// Scotland's higher rate starts at £43,662 (gov.uk Scottish income
// tax) and rUK's at £50,270 (gov.uk income tax rates). The band is
// found by NAME because `incomeTaxBands[0]` is the basic rate in
// rUK and the STARTER rate in Scotland.

const FREE_PAY_TOP_UP = 9;

describe('regression: higher-rate threshold', () => {
  it.each([
    ['rUK', '2026-27', 50270],
    ['scotland', '2026-27', 43662],
  ] as const)('%s %s starts at %i', (region, year, expected) => {
    expect(
      higherRateThreshold(
        getTaxYearConfig(taxYear(year), region),
      ),
    ).toBe(expected);
  });

  // The throw has to be watched failing at least once, or it is a
  // guard nobody has seen work. TaxBand.name is a plain string, so
  // this fault is reachable by an ordinary typo.
  it('throws when no band carries the higher-rate name', () => {
    const cfg = getTaxYearConfig(taxYear('2026-27'), 'scotland');
    const renamed = {
      ...cfg,
      incomeTaxBands: cfg.incomeTaxBands.map((b) =>
        b.name === 'Higher Rate'
          ? {...b, name: 'Upper Rate'}
          : b),
    } as typeof cfg;
    expect(() => higherRateBand(renamed)).toThrow(
      /no Higher Rate/,
    );
  });

  // An INDEPENDENT route: walk the engine, not the band table. The
  // threshold is the gross at which the marginal rate first exceeds
  // the basic rate, which the table-reading implementation cannot
  // produce; re-spelling the lookup here would only restate it.
  it.each(['rUK', 'scotland'] as const)(
    '%s threshold is where the marginal rate first rises',
    (region) => {
      const cfg = getTaxYearConfig(taxYear('2026-27'), region);
      const t = higherRateThreshold(cfg);
      const taxAt = (gross: number) => {
        const thp = new TakeHomePay(taxYear('2026-27'), region);
        thp.setSalary(GrossAnnual(gross));
        return thp.incomeTax;
      };
      const higherRate = higherRateBand(cfg).rate;
      // PAYE frees £9 more than the allowance (1257L's £12,579), so the
      // rate first rises £9 past the published threshold. £100 below
      // that is taxed at the rate beneath (Scotland's intermediate rate,
      // the rest of the UK's basic); £100 above attracts the higher rate.
      // HMRC's pay adjustment tables: 1257L frees £9 above its allowance.
      const payeAt = t + FREE_PAY_TOP_UP;
      const below = taxAt(payeAt) - taxAt(payeAt - 100);
      const above = taxAt(payeAt + 100) - taxAt(payeAt);
      expect(above).toBeGreaterThan(below);
      expect(above / 100).toBeCloseTo(higherRate, 3);
    });
});
