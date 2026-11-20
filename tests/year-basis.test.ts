/**
 * The pay year / tax year distinction, proved at the TYPE level.
 *
 * These assertions are checked by `npm run typecheck`, not at runtime:
 * `tsconfig.json` includes `tests`, so an `@ts-expect-error` that stops
 * being an error fails the build. That is the whole point — the defect
 * this type split exists to stop is invisible at runtime, because both
 * years are the same string.
 *
 * Northern Ireland is the live case. Its latest published AfC scale is
 * 2025-26 while the tax year in force is 2026-27, so a value carrying
 * one meaning must not be usable as the other.
 *
 * WHY THE BRAND IS OPTIONAL ON THE TYPES.
 * A phantom brand that every label satisfies leaves one hole: the
 * two-step widening `PayYear` -> `YearLabel` -> `TaxYear`, which
 * compiles with no cast because narrowing to `YearLabel` is the same
 * idiom every label-keyed lookup uses to index a table. Closing it
 * completely means branding `YearLabel` itself and minting at roughly
 * 250 sites, most of them table keys where the basis is not in
 * question, for no defect these assertions do not already catch. So the
 * split is enforced HERE, by assertion, rather than by the type system
 * alone.
 *
 * The consumers hold the other half, and `docs/how-it-works.md` says
 * what they owe: a pay year and a tax year should AGREE unless a
 * nation is knowingly behind, so whichever package owns scale data
 * asserts that agreement by default and names its exceptions. A
 * difference nobody declared is a stale transcription, not a devolved
 * calendar.
 */

import {describe, expect, it} from 'vitest';
import {
  CURRENT_TAX_YEAR,
  payYear,
  taxYear,
  TAX_YEARS,
  getTaxYearConfig,
} from '../src/index.js';
import type {
  PayYear,
  TaxYear,
  YearLabel,
} from '../src/index.js';

declare const somePayYear: PayYear;
declare const someTaxYear: TaxYear;
declare const someLabel: YearLabel;

declare function deductionsAt(year: TaxYear): number;
declare function scaleAt(year: PayYear): number;

/**
 * Never called. Its body is the assertion — every line below either
 * compiles or fails `npm run typecheck`, and none of it may RUN,
 * because the declarations above have no implementations.
 */
function typeAssertions(): unknown[] {
  // A freshly-parsed or literal year has not yet been established as
  // one kind or the other, so it widens to both. `taxYear()` and
  // `payYear()` are available to say which is meant, but the brand is
  // OPTIONAL so the boundary where a label is first read needs no
  // ceremony.
  const asPay: PayYear = payYear(someLabel);
  const asTax: TaxYear = taxYear(someLabel);
  const bare: TaxYear = someLabel;

  // ── KNOWN LIMIT, deliberately asserted rather than left implicit ──
  //
  // An optional brand means a bare label assigns to BOTH bases, so a
  // value can be laundered from one to the other in two steps:
  //
  //     const key: YearLabel = somePayYear;   // narrowing, allowed
  //     deductionsAt(key);                    // and now it is a tax year
  //
  // The single-expression mistake IS caught, above. This two-step one
  // is not, and the widening it uses is the same idiom every table
  // lookup uses to narrow for indexing. Closing it means a REQUIRED
  // brand, and a mint at every year literal in every data table and
  // test. The hole is asserted here so it stays visible, and so a
  // future required brand shows up as a failure rather than a surprise.
  const laundered: YearLabel = somePayYear;
  deductionsAt(laundered);

  // Exhaustiveness is why the LABEL union is not itself branded: this
  // is what turns "a new tax year was added" into a compile error
  // rather than a lookup that silently returns undefined.
  const complete: Record<YearLabel, number> = {
    '2023-24': 1,
    '2024-25': 2,
    '2025-26': 3,
    '2026-27': 4,
  };

  const partial: Partial<Record<YearLabel, number>> = {
    // @ts-expect-error '2027-28' is not a published year
    '2027-28': 1,
  };

  return [
    // A scale's year passed where the tax year belongs prices an NI
    // reader's 2025-26 salary at 2025-26 deductions in the 2026-27 tax
    // year.
    // @ts-expect-error a PayYear is not a TaxYear
    deductionsAt(somePayYear),
    // @ts-expect-error a TaxYear is not a PayYear
    scaleAt(someTaxYear),
    asPay, asTax, complete, partial, bare, laundered,
  ];
}

describe('the pay year / tax year split', () => {
  it('is enforced by the compiler, not at runtime', () => {
    // Both years are the same string at runtime, which is exactly why
    // the guarantee has to be a type. The assertions live in
    // `typeAssertions` above and are checked by `npm run typecheck`.
    expect(typeof typeAssertions).toBe('function');
  });

  it('lets a literal stand as a tax year', () => {
    const literal: TaxYear = taxYear(TAX_YEARS.Y2026_27);
    expect(literal).toBe('2026-27');
  });

  it('resolves a config from CURRENT_TAX_YEAR', () => {
    expect(getTaxYearConfig(CURRENT_TAX_YEAR, 'rUK').year)
      .toBe(CURRENT_TAX_YEAR);
  });
});
