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
  Period,
} from '@casomoltd/paye-calc';

const calc = new TakeHomePay('2025-26', 'rUK');
calc.setSalary(GrossAnnual(55000));
calc.setPension(PensionPercent(5));
calc.setPensionBasis(PensionBasis.AutoEnrolment);
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

// Period-adjusted values
calc.setPeriod(Period.Monthly);
calc.displayNet;           // monthly take-home
calc.displayIncomeTax;     // monthly income tax

// Reverse calculation — find gross from target net
calc.setSalary(NetAnnual(35000));
calc.gross;                // gross needed for £35k net
```

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
- **Tax codes** — standard, K codes, BR/D0/D1, NT, 0T, and
  Scottish prefixes.
- **Net-to-gross** — binary search reverse calculation.
- **Breakdowns** — `taxBreakdown`, `niBreakdown`, and
  `studentLoanBreakdown` for detailed output.

## Tax years

| Year    | rUK | Scotland |
| ------- | --- | -------- |
| 2023-24 | Yes | Yes      |
| 2024-25 | Yes | Yes      |
| 2025-26 | Yes | Yes      |
| 2026-27 | Yes | Yes      |

## Development

```bash
npm run check       # lint + typecheck + test
npm run build       # compile to dist/
npm test            # vitest
npm run test:watch  # vitest watch mode
```

## License

LGPL-3.0-only
