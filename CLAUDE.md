# paye-calc

UK PAYE take-home pay calculator library.

## Commands

- `npm run check` — lint + typecheck + test
- `npm run build` — compile to dist/
- `npm test` — run vitest

## Architecture

- `src/TakeHomePay.ts` — main calculator class
- `src/TaxCode.ts` — HMRC tax code parser
- `src/TaxYearConfig.ts` — tax year config types
- `src/taxYears/` — per-year config data
- `src/types.ts` — shared types and constants
- `src/chart-colors.ts` — chart colors from design tokens
- `tests/fixtures/*.csv` — regression test golden data

## Conventions

- Vitest for testing (not Jest)
- ESM-only (`"type": "module"`)
