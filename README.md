# @casomoltd/paye-calc

UK PAYE take-home pay calculator. Handles income tax, National Insurance, pensions, and student loans for 2023-24 through 2026-27.

## Install

```bash
npm install @casomoltd/paye-calc
```

Public on the npm registry — no auth or `.npmrc` config needed.

## Usage

```ts
import {
  TakeHomePay,
  GrossAnnual,
  NetAnnual,
  PensionPercent,
  PensionBasis,
  StudentLoanPlan,
} from '@casomoltd/paye-calc';

const calc = new TakeHomePay('2025-26', 'rUK');
calc.setSalary(GrossAnnual(55000));
calc.setPension({
  basis: PensionBasis.AutoEnrolment,
  contribution: PensionPercent(5),
});
calc.setStudentLoanPlans(
  new Set([StudentLoanPlan.Plan2]),
);

calc.net;                  // annual take-home
calc.incomeTax;            // annual income tax
calc.nationalInsurance;    // annual NI
calc.pensionDeduction;     // annual pension contribution
calc.studentLoanDeduction; // annual student loan repayment
calc.effectiveTaxRate;     // total deductions as % of gross
calc.marginalTaxRate;      // tax rate on next £1
calc.annualAllowance();    // the pension annual allowance and any excess

// Reverse calculation — find gross from target net
calc.setSalary(NetAnnual(35000));
calc.gross;                // gross needed for £35k net
```

`payAt(gross, inputs)` gives the same figures as a pure function, for a caller that needs one figure without a calculator ([how it works](docs/how-it-works.md#one-calculation-behind-every-figure)).

## Features

- **Income tax** — progressive bands with Personal Allowance taper above £100k. Supports Scottish rates.
- **National Insurance** — primary threshold, main and upper rates.
- **Pensions** — auto-enrolment (qualifying earnings only), employer/NET pay, salary sacrifice, personal/relief at source, and NHS tiered contributions.
- **Student loans** — Plans 1, 2, 4, 5 and Postgraduate, with multiple concurrent plans.
- **Tax codes** — standard, K codes, BR, NT, 0T, the D codes as HMRC's PAYE Manual (PAYE11025) defines them (D0 and D1; SD0 to SD3 in Scotland), and the Scottish and Welsh prefixes.
- **Net-to-gross** — binary search reverse calculation, re-solved whenever another input changes ([why](docs/how-it-works.md#one-calculation-behind-every-figure)).
- **Pension income** — `grossFor(targetNet, year, region)`: the gross pension income that leaves a target after income tax alone, with the Personal Allowance taper included. Not the take-home inverse: a pension in payment carries no National Insurance, student loan or contribution. `netFor(gross, year, region)` goes the other way, gross to net. `grossEquivalent(taxable, untaxed, year, region)` gives an untaxed sum, such as savings spent beside a pension, as more taxable income ([how](docs/how-it-works.md#pension-income-gross-and-net)).
- **State Pension** — `fullNewStatePension(year)`: the full rate of the new State Pension for a tax year, weekly and yearly; and `statePensionYearly(weekly)` for a forecast's weekly figure. The full rate only; what a person is due depends on their National Insurance record.
- **Tax-Free Childcare** — `taxFreeChildcare(year)`: the adjusted net income limit above which a parent loses it outright, and the yearly top-up caps per child and per disabled child.
- **Free childcare for working parents, England** — `freeChildcareEngland(year)`: the adjusted net income limit above which a parent, or their partner, does not qualify. A scheme apart from Tax-Free Childcare, cited to its own regulations.
- **Minimum pension age** — `minimumPensionAge(on)`: the normal minimum pension age on a drawing date, 55 until 5 April 2028 and 57 from 6 April 2028, as the Finance Act 2004 sets it for any scheme outside the uniformed services. `minimumPensionAgeRise()` names that rise's age and day. `minimumPensionAgeFor(right, on)` is a member's own minimum, given the right their scheme gave them, with the protected age through the rise ([rule](docs/how-it-works.md#the-minimum-pension-age)).
- **Annual allowance** — `annualAllowance()` on the calculator: the allowance after the taper, the year's pension input and any excess ([what counts](docs/how-it-works.md#the-annual-allowances-pension-input)). A defined benefit's input for a period of its own is under *Pension input periods*.
- **Tax year ends** — `TaxYearEnd` names any tax year, published or not, by the calendar year it ends in; `taxYearEndFor(date)` turns a date into one, `taxYearStartDate(end)` and `taxYearEndDate(end)` give its opening 6 April and closing 5 April, and `taxYearEndOf(year)` and `taxYearLabel(end)` cross to and from a `TaxYear` label ([why](docs/how-it-works.md#tax-year-ends)).
- **Pension input periods** — `definedBenefitInput(period)` is HMRC's pension input for a `PensionInputPeriod`: its tax year as a `TaxYearEnd`, and its defined benefit arrangements (`ArrangementValues`), each floored at nought on its own ([PTM053301](https://www.gov.uk/hmrc-internal-manuals/pensions-tax-manual/ptm053301)). A period before 2016-17, `FIRST_TAX_YEAR_PENSION_INPUT_PERIOD`, is refused; `refuseBeforePensionInputPeriods` is the same refusal for a caller reading its own periods ([why](docs/how-it-works.md#a-defined-benefit-input-is-worked-in-one-place)). `totalPensionInput(period, contributions)` adds a year's money purchase contributions to it, and `allowanceExceeded(period, {contributions, allowance})` says whether the total exceeds an allowance ([how](docs/how-it-works.md#the-annual-allowances-pension-input)).
- **Breakdowns** — `taxBreakdown`, `niBreakdown`, and `studentLoanBreakdown` for detailed output. Each tax row carries a `kind`: the allowance, a K code's added pay ([why](docs/how-it-works.md#tax-is-worked-on-paye-free-pay)), or a band; only a band row carries a `rate` and `taxPaid`. The opening row is a `TaxOpeningRow`, named from `TAX_OPENING_ROW_NAMES`; a band is named from `TAX_BAND_NAMES`, and `taxBandByName`, `basicRateBand` and `higherRateBand` find one in a year's config. `TaxCode.isKCode` says whether a code is a K code.
- **The allowance taper** — `personalAllowanceTaperEnd` is the income at which the allowance has gone, `personalAllowanceTaperBand` the band the taper sits in, and `personalAllowanceTaperRate` income tax's effective rate inside it; `INCOME_PER_POUND_WITHDRAWN` is the income that withdraws a pound.
- **Periods** — `PERIODS_PER_YEAR` says how many of each `Period` make a year, and `PERIOD_LABELS` names each.
- **Salary** — a negative or non-finite `GrossAnnual` or `NetAnnual` throws a `RangeError`, as `grossFor` does for its target; a net target of nil is a gross of nil.
- **Money** — `roundPence` rounds to the penny, and `uplift(amount, rate)` raises an amount by a decimal rate.

## Tax years

| Year    | rUK | Scotland |
| ------- | --- | -------- |
| 2023-24 | Yes | Yes      |
| 2024-25 | Yes | Yes      |
| 2025-26 | Yes | Yes      |
| 2026-27 | Yes | Yes      |

## Documentation

- [`docs/how-it-works.md`](docs/how-it-works.md) — the rules that govern the library, starting with the pay year / tax year split and what a consumer resolving pay scales owes.
- [`docs/verification.md`](docs/verification.md) — how the figures are checked against the published sources.

## Development

```bash
npm run check       # lint + typecheck + test
npm run build       # compile to dist/
npm test            # vitest
npm run test:watch  # vitest watch mode
```

## License

AGPL-3.0-only — see [LICENSE](LICENSE). Copyright © 2026 Casomo Ltd.

There is no linking exception: combine this library with your own code and the combined work is AGPL too, and letting people use that work over a network obliges you to offer them its source. Charging money is not what triggers this, and not charging is no exemption. A commercial licence is available for use that needs to stay closed — enquire via [casomoltd.com](https://casomoltd.com).
