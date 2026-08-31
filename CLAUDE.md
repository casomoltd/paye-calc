# paye-calc

UK PAYE take-home pay calculator library.

## Commands

- `npm run check` — the repo's full health gate; `check-gates`
  asserts its composition, so see `package.json` for the steps
- `npm run build` — compile to dist/
- `npm test` — run vitest

## Architecture

- `src/TakeHomePay.ts` — main calculator class
- `src/TaxCode.ts` — HMRC tax code parser
- `src/TaxYearConfig.ts` — tax year config types
- `src/taxYears/` — per-year config data
- `src/types.ts` — shared types and constants
- `src/chart-colors.ts` — chart colors from design tokens
- `tests/fixtures/` — regression test CSV fixtures

## Conventions

- Vitest for testing (not Jest)
- ESM-only (`"type": "module"`)
