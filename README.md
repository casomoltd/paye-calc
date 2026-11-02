# @casomoltd/paye-calc

UK PAYE take-home pay calculator. Handles income tax, National
Insurance, pensions, and student loans for 2023-24 through 2026-27.

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

`payAt(gross, inputs)` gives the same figures as a pure function, for a
caller that needs one figure without a calculator
([how it works](docs/how-it-works.md#one-calculation-behind-every-figure)).

## Features

- **Income tax** — progressive bands with Personal Allowance
  taper above £100k. Supports Scottish rates.
- **National Insurance** — primary threshold, main and upper
  rates.
- **Pensions** — auto-enrolment (qualifying earnings only),
  employer/NET pay, salary sacrifice, personal/relief at
  source, and NHS tiered contributions.
- **Student loans** — Plans 1, 2, 4, 5 and Postgraduate,
  with multiple concurrent plans.
- **Tax codes** — standard, K codes, BR, NT, 0T, the D codes as
  HMRC's PAYE Manual (PAYE11025) defines them (D0 and D1; SD0 to SD3
  in Scotland), and the Scottish and Welsh prefixes.
- **Net-to-gross** — binary search reverse calculation, re-solved
  whenever another input changes
  ([why](docs/how-it-works.md#one-calculation-behind-every-figure)).
- **Pension income** — `grossFor(targetNet, year, region)`: the
  gross pension income that leaves a target after income tax alone,
  with the Personal Allowance taper included. Not the take-home
  inverse: a pension in payment carries no National Insurance,
  student loan or contribution.
- **State Pension** — `fullNewStatePension(year)`: the full rate of
  the new State Pension for a tax year, weekly and yearly; and
  `statePensionYearly(weekly)` for a forecast's weekly figure. The full
  rate only; what a person is due depends on their National Insurance
  record.
- **Minimum pension age** — `minimumPensionAge(on)`: the normal minimum
  pension age on a drawing date, 55 until 5 April 2028 and 57 from 6 April
  2028, as the Finance Act 2004 sets it for any scheme outside the
  uniformed services.
- **Breakdowns** — `taxBreakdown`, `niBreakdown`, and
  `studentLoanBreakdown` for detailed output.

## Tax years

| Year    | rUK | Scotland |
| ------- | --- | -------- |
| 2023-24 | Yes | Yes      |
| 2024-25 | Yes | Yes      |
| 2025-26 | Yes | Yes      |
| 2026-27 | Yes | Yes      |

## Documentation

- [`docs/how-it-works.md`](docs/how-it-works.md) — the rules that govern
  the library, starting with the pay year / tax year split and what a
  consumer resolving pay scales owes.
- [`docs/verification.md`](docs/verification.md) — how the figures are
  checked against the published sources.

## Development

```bash
npm run check       # lint + typecheck + test
npm run build       # compile to dist/
npm test            # vitest
npm run test:watch  # vitest watch mode
```

## License

AGPL-3.0-only — see [LICENSE](LICENSE).
Copyright © 2026 Casomo Ltd.

There is no linking exception: combine this library with your
own code and the combined work is AGPL too, and letting people
use that work over a network obliges you to offer them its
source. Charging money is not what triggers this, and not
charging is no exemption. A commercial licence is available for
use that needs to stay closed — enquire via
[casomoltd.com](https://casomoltd.com).
