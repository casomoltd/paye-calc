# paye-calc

UK PAYE take-home pay calculator library.

## Commands

- `npm run check` — the repo's full health gate; `check-gates`
  asserts its composition, so see `package.json` for the steps
- `npm run build` — compile to dist/
- `npm test` — run vitest

## Docs

- [`docs/how-it-works.md`](docs/how-it-works.md) — the MODEL: the rules
  that govern the library and the reasoning behind them.
- [`docs/verification.md`](docs/verification.md) — the EVIDENCE: how the
  figures are checked against HMRC's own tools and published sources.

## Architecture

- `src/TakeHomePay.ts` — the calculator: a façade that records inputs
  and reads `pay.ts`
- `src/pay.ts` — take-home pay as a pure function of a gross and its
  inputs, and the net-to-gross search
- `src/incomeTax.ts` — income tax rows for taxable pay and a code
- `src/grossFor.ts` — gross pension income for a net target, income
  tax alone
- `src/statePension.ts` — the full new State Pension rate, per tax
  year, each figure cited at its source
- `src/minimumPensionAge.ts` — the normal minimum pension age on a
  date, cited to the Finance Act
- `src/TaxCode.ts` — HMRC tax code parser
- `src/TaxYearConfig.ts` — tax year config types, the band lookups
  and the personal allowance taper
- `src/money.ts` — pence rounding, the one `charge` producer, and
  percentages
- `src/deductions.ts` — the pay each deduction falls on: by band, by NI
  rate, by loan plan
- `src/flatRate.ts` — the one band a BR or D code charges at
- `src/freePay.ts` — PAYE free pay, on which income tax is worked
- `src/pensionBases.ts` — what each pension basis does to pay, and
  relief at source
- `src/annualAllowance.ts` — the pension annual allowance: a year's
  saving, the taper's two incomes, the allowance and any excess
- `src/taxYears/` — per-year config data
- `src/types.ts` — shared types and constants
- `tests/fixtures/` — regression tables, typed TS: `hmrc/` (HMRC's
  transcribed test data), `scenarios/` (the model's own take-home
  figures), and small published tables beside them

## Conventions

- Vitest for testing (not Jest)
- ESM-only (`"type": "module"`)
