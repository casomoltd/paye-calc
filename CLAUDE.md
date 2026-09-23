# paye-calc

UK PAYE take-home pay calculator library.

## Commands

- `npm run check` — the repo's full health gate; `check-gates`
  asserts its composition, so see `package.json` for the steps
- `npm run build` — compile to dist/
- `npm test` — run vitest

## Docs

- [`docs/how-it-works.md`](docs/how-it-works.md) — the MODEL: the rules
  that govern the library and the reasoning behind them. Partial today;
  the year basis and the pension-income inverse are written up.
- [`docs/verification.md`](docs/verification.md) — the EVIDENCE: how the
  figures are checked against HMRC's own tools and published sources.

## Architecture

- `src/TakeHomePay.ts` — main calculator class
- `src/grossFor.ts` — gross pension income for a net target, income
  tax alone
- `src/statePension.ts` — the full new State Pension rate, per tax
  year, each figure cited at its source
- `src/TaxCode.ts` — HMRC tax code parser
- `src/TaxYearConfig.ts` — tax year config types
- `src/taxYears/` — per-year config data
- `src/types.ts` — shared types and constants
- `src/chart-colors.ts` — chart colors from design tokens
- `tests/fixtures/` — regression test CSV fixtures

## Conventions

- Vitest for testing (not Jest)
- ESM-only (`"type": "module"`)
