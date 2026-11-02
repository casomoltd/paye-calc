# How it works

The rules that govern this library: the definitions its behaviour turns
on, the assumptions it declares, and the reasoning behind any of them a
reader would otherwise reopen. What it does **not** hold is the export
list, or the evidence that the figures are right — see
[`verification.md`](verification.md) for the second.

A rule earns a section here when getting it wrong changes a number, or
when it is the survivor of an alternative that cost real work to reject.

**Partial, and knowingly so.** The rules not written up here — the order
deductions are applied in, what a salary sacrifice reduces, how the
personal-allowance taper is applied to an earner, what is rounded and
when — are stated only in code, which is where to read them.

## The year basis

A salary and its deductions answer to two different years, and here they
are the same string at runtime. The types are in `src/types.ts`; the
assertions are in `tests/year-basis.test.ts`.

### Two years, not one

**`TaxYear`** is the year whose tax rules apply: bands, thresholds, NI
rates, pension tiers. It is a UK-wide fact fixed by the calendar.

**`PayYear`** is the year whose pay scale a salary was published on. It
is the employer's pay round, per nation, and it is not fixed by the
calendar at all.

They agree whenever a pay round lands inside its own year, which is why
one value carried both for as long as it did. They come apart the moment
a round runs late: somebody paid last year's salary this year still pays
this year's tax. Northern Ireland is the live case — its latest
published Agenda for Change scale is a year behind the tax year in
force — and a single value used for both silently misprices every
deduction on the page.

This package publishes no pay scales. It names both types because it
owns the year vocabulary, and because one of them alone means nothing.

### The brand is optional on the type and required at the mint

Both types are `YearLabel` plus a phantom brand, so a bare literal or a
freshly parsed label still assigns to either. That is deliberate: a
parse boundary needs no ceremony. What the brand stops is a value that
has *already* been established as one kind of year being used as the
other.

`taxYear()` and `payYear()` are the only ways to mint one, and the brand
they apply is required rather than optional. With an optional brand a
label assigned to both, which left a two-step hole: `PayYear` →
`YearLabel` → `TaxYear` compiled with no cast and no error. The
single-expression mistake was caught; the two-step one was not.

### Why `YearLabel` itself is not branded

Branding the label type closes that two-step hole completely. It also
requires minting at roughly 250 sites, most of them table keys where the
basis was never in question — narrowing to `YearLabel` to index a
label-keyed table is the same idiom every lookup uses.

That change was built, measured and reverted. It caught no defect the
assertions in `tests/year-basis.test.ts` do not catch, and it put
ceremony on every lookup in both consuming packages. **So the split is
enforced by assertion rather than by the type system alone, and this
section is the record of that decision.** If closing the hole is
proposed again, the answer is here rather than in a fresh discussion.

### What a consumer owes

A consumer that resolves pay scales holds the other half of the rule,
and it is the half that catches a real defect.

**Agreement is the default, and every exception is named.** A pay year
should equal the tax year in force unless a named publisher is knowingly
behind. A difference that nobody declared is not a devolved calendar; it
is a table that did not get updated, and from the inside the two look
identical.

So a consumer asserts, per nation, that the published pay year equals
the tax year in force, with an explicit list of the nations known to
lag, and asserts in turn that every nation on that list genuinely does
lag. A nation that silently falls behind then fails a test instead of
quietly joining the exception list.

## Tax is worked on PAYE free pay

Income tax is worked as PAYE deducts it, on pay above the tax code's free
pay, not on pay above the allowance. The code is in `src/freePay.ts`;
the evidence is in [`verification.md`](verification.md).

**What frees what.** An L code N frees ten times N plus £9: 1257L frees
£12,579, against an allowance of £12,570. A K code N adds exactly ten
times N to pay. 0T frees nothing, and BR, the D codes and NT charge one
flat rate, or none, on everything. With no code given, free pay is the
allowance the taper leaves, before it is held at nil, plus £9, and never
below nothing: an allowance tapered to exactly nil still frees £9, one
tapered a pound past it frees £8, and further past it nothing.

**Why PAYE's figure and not the year's liability.** A take-home figure is
what a payslip shows, and a payslip is worked from the code's free pay.
The year's legal liability, which Self Assessment would charge, uses the
£12,570 itself, and so runs £9 at the taxpayer's top rate higher: £1.71
to £4.32 a year. HMRC's own
take-home estimator works from free pay, and so does this library.

**What it moves.** The allowance a caller reads, and the allowance row of
a tax breakdown, stay the statutory figure, as a payslip and HMRC's
estimator show them; the bands are worked £9 further on. So the higher
rate starts at £50,279 of pay in practice, though the published
threshold is £50,270.

## One calculation behind every figure

Every take-home figure comes from one pure function, `payAt(gross,
inputs)` in `src/pay.ts`; `TakeHomePay` only records inputs and reads
that result. Income tax inside it comes from `incomeTaxRows` in
`src/incomeTax.ts`, which `grossFor` reads too.

**Why it matters for a net salary.** `NetAnnual(x)` is kept as the target
it is, and the gross is solved when a figure is read, against everything
set by then. A gross solved once and stored would go stale the moment a
pension, code or year was set after it, with no error. The solved gross
is the least that leaves at least the target, never a penny short.

**Why the effective rate always agrees with net.** Net is gross less one
total of what leaves pay, and `effectiveTaxRate` is that total over gross,
so it is `1 − net / gross` on every pension basis. It counts the member's pension share with the tax, as the
deductions a payslip shows do.

## Relief at source is on the gross contribution

A pension on the personal basis (relief at source) is stated as the gross
contribution the pot receives, as auto-enrolment schemes quote it. The
member pays it less the basic rate, which the provider claims from HMRC.
The basic rate is the rest of the UK's for the year, even for a Scottish
taxpayer. The pension input the annual-allowance tests see is the whole
contribution.

**Why gross.** A contribution quoted net and then grossed up would add
the provider's relief to take-home pay, but the relief goes into the
pot, not the member's pay.

## Gross pension income for a net target

`grossFor` answers a pensioner's question: what gross income leaves a
given amount once income tax is taken? Income tax is the only
deduction on a pension in payment, so it is not `TakeHomePay`'s
`NetAnnual` inverse, which inverts an earner's whole take-home pay.

**It is exact, and defined in pence.** The answer is the smallest
gross, to the penny, whose net reaches the target. Income tax is
linear in gross between the points where the marginal rate changes —
the Personal Allowance, each band edge, and the two ends of the
allowance taper — so the inverse is found on the piece that contains
the target and then settled to the penny against this library's own
tax figure, because the taper withdraws the allowance in whole pounds
and tax is rounded to pence.

**The taper is included.** Between its start and the income at which
the allowance is gone, each extra pound of gross loses fifty pence of
allowance, so the marginal rate is 60% at the higher rate rather than
40%. A two-band inverse is exact below the taper and asks for too
little gross above its start; the tests pin a figure worked by hand
there.
