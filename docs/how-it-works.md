# How it works

The rules that govern this library: the definitions its behaviour turns
on, the assumptions it declares, and the reasoning behind any of them a
reader would otherwise reopen. What it does **not** hold is the export
list, or the evidence that the figures are right — see
[`verification.md`](verification.md) for the second.

A rule earns a section here when getting it wrong changes a number, or
when it is the survivor of an alternative that cost real work to reject.

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
