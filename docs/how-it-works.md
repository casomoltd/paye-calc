# How it works

The rules that govern this library: the definitions its behaviour turns on, the assumptions it declares, and the reasoning behind any of them a reader would otherwise reopen. What it does **not** hold is the export list, or the evidence that the figures are right — see [`verification.md`](verification.md) for the second.

A rule earns a section here when getting it wrong changes a number, or when it is the survivor of an alternative that cost real work to reject.

**Partial, and knowingly so.** The rules not written up here — the order deductions are applied in, what a salary sacrifice reduces, how the personal-allowance taper is applied to an earner, what is rounded and when — are stated only in code, which is where to read them.

## The year basis

A salary and its deductions answer to two different years, and here they are the same string at runtime. The types are in `src/types.ts`; the assertions are in `tests/year-basis.test.ts`.

### Two years, not one

**`TaxYear`** is the year whose tax rules apply: bands, thresholds, NI rates, pension tiers. It is a UK-wide fact fixed by the calendar.

**`PayYear`** is the year whose pay scale a salary was published on. It is the employer's pay round, per nation, and it is not fixed by the calendar at all.

They agree whenever a pay round lands inside its own year, which is why one value carried both for as long as it did. They come apart the moment a round runs late: somebody paid last year's salary this year still pays this year's tax. Northern Ireland is the live case — its latest published Agenda for Change scale is a year behind the tax year in force — and a single value used for both silently misprices every deduction on the page.

This package publishes no pay scales. It names both `TaxYear` and `PayYear` because it owns the year vocabulary, and because one of them alone means nothing.

### Tax year ends

**`TaxYearEnd`** names a tax year by the calendar year it ends in: 2027 is 2026-27. `TaxYear` names only the years whose rates are published, and a pension input is read year by year to a leaving date years ahead, so a projected year needs a name that `TaxYear` cannot give.

Its brand is required on the type itself, so a bare number does not assign to it, unlike `TaxYear`'s brand, which is [optional on the type](#the-brand-is-optional-on-the-type-and-required-at-the-mint). A scheme year ending 31 March is also a plain number, five days off a tax year ending 5 April, and a type that took any number would take one for the other. `taxYearEnd()` mints one from a number, and `taxYearEndFor()` from a date.

### The brand is optional on the type and required at the mint

`TaxYear` and `PayYear` are both `YearLabel` plus a phantom brand, so a bare literal or a freshly parsed label still assigns to either. That is deliberate: a parse boundary needs no ceremony. What the brand stops is a value that has *already* been established as one kind of year being used as the other.

`taxYear()` and `payYear()` are the only ways to mint one, and the brand they apply is required rather than optional. With an optional brand a label assigned to both, which left a two-step hole: `PayYear` → `YearLabel` → `TaxYear` compiled with no cast and no error. The single-expression mistake was caught; the two-step one was not.

### Why `YearLabel` itself is not branded

Branding the label type closes that two-step hole completely. It also requires minting at roughly 250 sites, most of them table keys where the basis was never in question — narrowing to `YearLabel` to index a label-keyed table is the same idiom every lookup uses.

That change was built, measured and reverted. It caught no defect the assertions in `tests/year-basis.test.ts` do not catch, and it put ceremony on every lookup in both consuming packages. **So the split is enforced by assertion rather than by the type system alone, and this section is the record of that decision.** If closing the hole is proposed again, the answer is here rather than in a fresh discussion.

### What a consumer owes

A consumer that resolves pay scales holds the other half of the rule, and it is the half that catches a real defect.

**Agreement is the default, and every exception is named.** A pay year should equal the tax year in force unless a named publisher is knowingly behind. A difference that nobody declared is not a devolved calendar; it is a table that did not get updated, and from the inside the two look identical.

So a consumer asserts, per nation, that the published pay year equals the tax year in force, with an explicit list of the nations known to lag, and asserts in turn that every nation on that list genuinely does lag. A nation that silently falls behind then fails a test instead of quietly joining the exception list.

## Tax is worked on PAYE free pay

Income tax is worked as PAYE deducts it, on pay above the tax code's free pay, not on pay above the allowance. The code is in `src/freePay.ts`; the evidence is in [`verification.md`](verification.md).

**What frees what.** An L code N frees ten times N plus £9: 1257L frees £12,579, against an allowance of £12,570. A K code N adds exactly ten times N to pay. 0T frees nothing, and BR, the D codes and NT charge one flat rate, or none, on everything. With no code given, free pay is the allowance the taper leaves, before it is held at nil, plus £9, and never below nothing: an allowance tapered to exactly nil still frees £9, one tapered a pound past it frees £8, and further past it nothing.

**Why PAYE's figure and not the year's liability.** A take-home figure is what a payslip shows, and a payslip is worked from the code's free pay. The year's legal liability, which Self Assessment would charge, uses the £12,570 itself, and so runs £9 at the taxpayer's top rate higher: £1.71 to £4.32 a year. HMRC's own take-home estimator works from free pay, and so does this library.

**What it moves.** The allowance a caller reads, and the allowance row of a tax breakdown, stay the statutory figure, as a payslip and HMRC's estimator show them; the bands are worked £9 further on. So the higher rate starts at £50,279 of pay in practice, though the published threshold is £50,270.

**A K code adds pay; it is not a negative allowance.** A K code's allowance is negative, and `personalAllowance` reports it so. The tax breakdown opens instead with a row of kind `k-code-addition` (`TAX_ROW_KINDS.KCodeAddition`) whose taxable amount is the positive pay the code adds, as HMRC's estimator prints it beside an allowance of nil. Every other breakdown opens with an `allowance` row, and each band row is of kind `band`, so a caller tells them apart by type, not by name.

## One calculation behind every figure

Every take-home figure comes from one pure function, `payAt(gross, inputs)` in `src/pay.ts`; `TakeHomePay` only records inputs and reads that result. Income tax inside it comes from `incomeTaxRows` in `src/incomeTax.ts`, which `grossFor` reads too.

**Why it matters for a net salary.** `NetAnnual(x)` is kept as the target it is, and the gross is solved when a figure is read, against everything set by then. A gross solved once and stored would go stale the moment a pension, code or year was set after it, with no error. The solved gross is the least that leaves at least the target, never a penny short. A target below nil, or not a finite number, throws when it is set, as `grossFor`'s does: no take-home is below nil.

**Why the effective rate always agrees with net.** Net is gross less one total of what leaves pay, and `effectiveTaxRate` is that total over gross, so it is `1 − net / gross` on every pension basis. It counts the member's pension share with the tax, as the deductions a payslip shows do.

## Relief at source is on the gross contribution

A pension on the personal basis (relief at source) is stated as the gross contribution the pot receives, as auto-enrolment schemes quote it. The member pays it less the basic rate, which the provider claims from HMRC. The basic rate is the rest of the UK's for the year, even for a Scottish taxpayer. The pension input the annual-allowance tests see is the whole contribution.

**Why gross.** A contribution quoted net and then grossed up would add the provider's relief to take-home pay, but the relief goes into the pot, not the member's pay.

## The annual allowance's pension input

A relief-at-source contribution and an employer's money purchase payment each count as paid, since each goes to a pot of its own. Net-pay and salary-sacrifice contributions are taken as paid into the defined benefit scheme, so where it accrues a benefit they sit inside its input, worked [in one place](#a-defined-benefit-input-is-worked-in-one-place) as [PTM053301](https://www.gov.uk/hmrc-internal-manuals/pensions-tax-manual/ptm053301) states it. A net-pay AVC alongside that scheme is therefore not counted. The employer's share in adjusted income is that input less the member's own contributions, so a sacrifice is counted in it once.

### A defined benefit input is worked in one place

`definedBenefitInput` is the one function that works a defined benefit's pension input, so `DB_PENSION_INPUT_MULTIPLIER`, the CPI uplift and the floor on each arrangement are applied in one place. The calculator's `dbAnnualAccrual` goes through it too, in its own tax year, as one arrangement whose pension starts at nil and ends at the accrual, in today's money.

It takes a `PensionInputPeriod`: its tax year, each arrangement's pension and lump sum at the start and the end of the period, as the caller values them, and the CPI that uplifts the opening values. The library knows no scheme's rules: which of a member's rights make up one arrangement, and what each is worth, are the caller's.

A period names its tax year by a [`TaxYearEnd`](#tax-year-ends), and `definedBenefitInput` refuses one before 2016-17, `FIRST_TAX_YEAR_PENSION_INPUT_PERIOD`: the tax years are pension input periods only from then (Finance Act 2004 s.238ZA(3)), and an earlier period ran on rules not modelled here. An arrangement begun on or after 9 July 2015 has a first period from its own start to the next 5 April (s.238ZB(1)). `refuseBeforePensionInputPeriods` is the same refusal, for a caller that reads its periods itself.

## Where a salary range sits

`taxBandsSpanned` and `taperPosition` answer where a gross salary range sits against the income tax bands and the personal allowance taper, for a consumer describing a pay band rather than a single salary.

**The bands are read on taxable income, after the taper.** Each end of the range is reduced by the allowance the taper leaves it, not the statutory allowance, so a range above the taper's start lands in the band it is charged at. The additional rate therefore begins at £125,140 gross, the taper's end, rather than at the statutory allowance plus the band's lower bound. Taxable income rises with gross throughout, so the range's two ends bound every band between them.

**The taper's position is read on gross.** The taper is defined on gross income, from `personalAllowanceTaperStart` to the income at which the allowance is gone, so `taperPosition` compares the range with those two figures directly.

## Pension income, gross and net

`grossFor` answers a pensioner's question: what gross income leaves a given amount once income tax is taken? Income tax is the only deduction on a pension in payment, so it is not `TakeHomePay`'s `NetAnnual` inverse, which inverts an earner's whole take-home pay.

**`grossFor` is exact, and defined in pence.** Its answer is the smallest gross, to the penny, whose net reaches the target. Income tax is linear in gross between the points where the marginal rate changes — the Personal Allowance, each band edge, and the two ends of the allowance taper — so the inverse is found on the piece that contains the target and then settled to the penny against this library's own tax figure, because the taper withdraws the allowance in whole pounds and tax is rounded to pence.

**The taper is included.** Between its start and the income at which the allowance is gone, each extra pound of gross loses fifty pence of allowance, so the marginal rate is 60% at the higher rate rather than 40%. A two-band inverse is exact below the taper and asks for too little gross above its start; the tests pin a figure worked by hand there.

**`netFor` is the forward direction**: what a gross pension income leaves once income tax is taken. It charges tax exactly as `grossFor` does, so a caller comparing incomes after tax, such as a gap that tax-free savings fill, reads both directions from one figure.

**`grossEquivalent` composes the two**: what an untaxed sum is worth as more taxable income. £5,000 of savings spent beside a £30,000 pension adds £5,000 after tax; `grossEquivalent(30_000, 5_000, …)` is the extra pension that, taxed with the £30,000, would add the same, so more than £5,000. It is how savings spent beside a pension count against a target set before tax.

All three throw a `RangeError` for an amount that is negative or not a finite number.

## The minimum pension age

`minimumPensionAge(on)` is the normal minimum pension age on a drawing date, as Finance Act 2004 s.279(1)(a) sets it: 55 until 5 April 2028, then
57. `minimumPensionAgeFor(right, on)` is a member's own minimum, which the protected pension age of Sch 36 para 23ZB can hold below the law's.

**Para 23ZB keeps a lower age through the 2028 rise.** A member keeps one if, immediately before 4 November 2021, they had a right to a benefit from an age below 57 (`PROTECTED_RIGHT_BELOW_AGE`), under scheme rules as they stood on 11 February 2021. That 57 is the protection's own threshold, a separate fact from the age s.279 rises to. The age they keep is the higher of 55 and the age of that right. The member's minimum is the lower of that age and the law's, so before 6 April 2028 it is 55, as para 23ZB(8) holds it.

**Why there is no protected age on its own.** Para 23ZB(7)'s age holds only from 6 April 2028, so a figure without a drawing date would be wrong before then. The library gives the age only through `minimumPensionAgeFor(right, on)`, which reads the date.

**The scheme's facts are the caller's.** Whether a member had the right, and from what age, turns on their scheme's rules, which this library does not hold. So a `SchemeRight` states both, and `protectedPensionAgeCutoff()` gives the day a scheme's library tests its members' joining dates against. The uniformed services' own ages, and the older protected ages of Sch 36 paras 22 and 23, are not modelled.
