# Verification

How `paye-calc` results are cross-checked against HMRC's own tools.

## Income tax & National Insurance

The core take-home engine is regression-tested against HMRC figures in
`tests/fixtures/` (e.g. `hmrc-ni-crosscheck.csv`). For manual spot-checks
use HMRC's **PAYE tax calculator** or **Basic PAYE Tools** (HMRC's own
payroll engine) — see the workspace TODO for the BPT cross-check fixture
plan.

## Pension annual-allowance taper

No single HMRC calculator takes a salary and returns the reduced
allowance, so the taper is verified two ways.

### 1. Formula + income construction (automated)

Golden unit tests in `tests/AnnualAllowance.test.ts` assert HMRC's
published worked examples from the Pensions Tax Manual (PTM057200): the
£35,000 and £26,011 simple tapers, the £10,000 floor, and the full "Jon"
example (threshold income £139,100, adjusted income £178,500 → £25,750).
Those use the historical £150k/£40k regime the manual still documents;
the arithmetic is identical to the current £260k/£60k limits, which the
`tests/fixtures/annual-allowance-taper.csv` rows cover.

### 2. HMRC live tool — PAAC (manual)

The **Pension annual allowance tool** (the "Pension annual allowance
tool" on https://www.gov.uk/guidance/hmrc-tools-and-calculators, which
opens https://www.tax.service.gov.uk/paac) applies the taper once given
adjusted income, threshold income and pension savings.

**Confirmed run — 2026-06-22, tax year 2025-26.** Inputs: adjusted income
£300,000, threshold income £210,000, pension savings £60,000, not
flexibly accessed, no prior-year carry-forward. PAAC returned:

| PAAC result | Amount |
| --- | --- |
| Available annual allowance | **£40,000** |
| Pension savings | £60,000 |
| Amount on which tax is due | **£20,000** |
| Unused annual allowance | £0 |

This matches the `mid-taper-300k` row in
`tests/fixtures/annual-allowance-taper.csv` and the
`availableAnnualAllowance` (£40,000) / `annualAllowanceExcess` (£20,000)
getters exactly.

#### Caveats when using PAAC

- PAAC carries unused allowance forward up to 3 years; `paye-calc` models
  a single year, so compare only with no prior unused allowance.
- It excludes hybrid (mixed DB/DC) schemes.
- It is interactive (a manual spot-check), not automatable.
