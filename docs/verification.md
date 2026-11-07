# Verification

How `paye-calc` results are checked against HMRC's own data, tools and published examples.

## Income tax & National Insurance

Income tax is tested against HMRC's own figures: every row of HMRC's payroll test data for 2025-26 and 2026-27 ([Software developers payroll test data](https://www.gov.uk/government/collections/software-developers-payroll-test-data)), transcribed in `tests/fixtures/hmrc/` and run by `tests/regression/hmrc.test.ts`. HMRC's rows are pay periods and the library is annual, so each row is scaled to a year and back; the test says how. NI is checked against the category A sheet of the NIC test data in the same collection (`tests/fixtures/hmrc/ni.ts`). HMRC's NI rows test the thresholds and stop just above the upper earnings limit, so the 2% upper rate is checked against HMRC only at its edge.

Tax is worked on PAYE free pay, as [`how-it-works.md`](how-it-works.md#tax-is-worked-on-paye-free-pay) states, so these rows need no adjustment for it. The model differs from HMRC's packs in one respect: it works a year, not a pay period, so it does not round taxable pay to whole pounds each period; the test states the bound it allows.

Take-home itself is checked against runs of HMRC's own [take-home estimator](https://www.tax.service.gov.uk/estimate-paye-take-home-pay), transcribed as printed in `tests/fixtures/hmrc/estimator.ts`, which records when they were run. They settle what the payroll packs leave open: how a K code adjusts pay, and the free pay of an allowance tapered to nil or a pound past it.

The take-home scenarios in `tests/fixtures/scenarios/` are this model's own figures. They catch an unintended change, not a wrong rule, so a rule is only verified once an HMRC row covers it. For manual spot-checks use HMRC's **PAYE tax calculator** or **Basic PAYE Tools** (HMRC's own payroll engine).

The rules being verified are stated in [`how-it-works.md`](how-it-works.md); this document is the evidence that the implementation matches them.

## Pension annual-allowance taper

No single HMRC calculator takes a salary and returns the reduced allowance, so the taper is verified two ways.

### 1. Formula + income construction (automated)

Golden unit tests in `tests/AnnualAllowance.test.ts` assert HMRC's published worked examples from the Pensions Tax Manual (PTM057200): the £35,000 and £26,011 simple tapers, the £10,000 floor, and the full "Jon" example (threshold income £139,100, adjusted income £178,500 → £25,750). Those use the historical £150k/£40k regime the manual still documents; the arithmetic is identical to the current £260k/£60k limits, which the `tests/fixtures/annual-allowance-taper.ts` rows cover.

### 2. HMRC live tool — PAAC (manual)

The **Pension annual allowance tool** (the "Pension annual allowance tool" on https://www.gov.uk/guidance/hmrc-tools-and-calculators, which opens https://www.tax.service.gov.uk/paac) applies the taper once given adjusted income, threshold income and pension savings.

**Confirmed run — 2026-06-22, tax year 2025-26.** Inputs: adjusted income £300,000, threshold income £210,000, pension savings £60,000, not flexibly accessed, no prior-year carry-forward. PAAC returned:

| PAAC result | Amount |
| --- | --- |
| Available annual allowance | **£40,000** |
| Pension savings | £60,000 |
| Amount on which tax is due | **£20,000** |
| Unused annual allowance | £0 |

This matches the case "Adjusted income of £300,000 takes £20,000 off" in `tests/fixtures/annual-allowance-taper.ts` and the `annualAllowance().available` (£40,000) and `.excess` (£20,000) exactly.

#### Caveats when using PAAC

- PAAC carries unused allowance forward up to 3 years; `paye-calc` models a single year, so compare only with no prior unused allowance.
- It excludes hybrid (mixed DB/DC) schemes.
- It is interactive (a manual spot-check), not automatable.
