import {describe, it, expect} from 'vitest';
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import {TakeHomePay} from '../src/TakeHomePay';
import {
  GrossAnnual,
  PensionPercent,
  PensionFixed,
  PensionBasis,
  StudentLoanPlan,
} from '../src/types';
import type {TaxYear, TaxRegion} from '../src/types';
import {getTaxYearConfig} from '../src/taxYears';
import {
  higherRateBand,
  higherRateThreshold,
  hoursPerYear,
  calculateTaperedAnnualAllowance,
  calculateThresholdIncome,
  calculateAdjustedIncome,
} from '../src/TaxYearConfig';

// ─── CSV parsing ─────────────────────────────────

type CsvRow = Record<string, string>;

function parseCsv(filePath: string): CsvRow[] {
  const raw = fs
    .readFileSync(filePath, 'utf-8')
    .replace(/\r/g, '')
    .trim();
  const [headerLine, ...dataLines] = raw.split('\n');
  const headers = headerLine.split(',');

  return dataLines
    .filter((line: string) => line.trim() !== '')
    .map((line: string) => {
      const values = line.split(',');
      const row: CsvRow = {};
      headers.forEach((h: string, i: number) => {
        row[h.trim()] = (values[i] ?? '').trim();
      });
      return row;
    });
}

const __dirname = path.dirname(
  fileURLToPath(import.meta.url),
);
const FIXTURES = path.join(
  __dirname, 'fixtures',
);

// ─── Annual calculations ─────────────────────────

const annualCases = parseCsv(
  path.join(FIXTURES, 'annual-calculations.csv'),
);

describe('regression: annual calculations', () => {
  it.each(annualCases)('$label', (tc: CsvRow) => {
    const model = new TakeHomePay(
      tc.taxYear as TaxYear,
    );
    model.setPensionBasis(
      tc.pensionBasis as PensionBasis,
    );
    // A fixed sacrifice amount (e.g. exact £20,000)
    // can't be expressed as a clean percentage, so an
    // optional pensionFixed column overrides the percent.
    const fixed = (tc.pensionFixed ?? '').trim();
    if (fixed) {
      model.setPension(PensionFixed(Number(fixed)));
    } else {
      model.setPension(
        PensionPercent(Number(tc.pensionPercent)),
      );
    }

    const plansStr = (
      tc.studentLoanPlans ?? ''
    ).trim();
    if (plansStr) {
      model.setStudentLoanPlans(
        new Set(
          plansStr
            .split('|')
            .map(
              p => p.trim() as StudentLoanPlan,
            ),
        ),
      );
    }

    model.setSalary(GrossAnnual(Number(tc.gross)));

    const checks: [string, number, number][] = [
      [
        'pension',
        model.pensionDeduction,
        Number(tc.expectedPension),
      ],
      [
        'taxableGross',
        model.taxableGross,
        Number(tc.expectedTaxableGross),
      ],
      [
        'incomeTax',
        model.incomeTax,
        Number(tc.expectedIncomeTax),
      ],
      [
        'NI',
        model.nationalInsurance,
        Number(tc.expectedNI),
      ],
      [
        'studentLoan',
        model.studentLoanDeduction,
        Number(tc.expectedStudentLoan || 0),
      ],
      [
        'taxRelief',
        model.pensionTaxRelief,
        Number(tc.expectedTaxRelief),
      ],
      ['net', model.net, Number(tc.expectedNet)],
    ];

    const failures = checks
      .filter(
        ([, actual, expected]) =>
          Math.abs(actual - expected) >= 0.005,
      )
      .map(
        ([field, actual, expected]) =>
          `${field}: expected ${expected}` +
          `, got ${actual}`,
      );

    if (failures.length > 0) {
      throw new Error(
        `${tc.label}:\n  ${failures.join('\n  ')}`,
      );
    }
  });
});

// ─── NHS Pension calculations (employer basis) ──

const nhsCases = parseCsv(
  path.join(FIXTURES, 'nhs-pension-calculations.csv'),
);

describe('regression: NHS pension (employer)', () => {
  it.each(nhsCases)('$label', (tc: CsvRow) => {
    const model = new TakeHomePay(
      tc.taxYear as TaxYear,
      tc.region as TaxRegion,
    );
    model.setPensionBasis(
      tc.pensionBasis as PensionBasis,
    );
    model.setPension(
      PensionPercent(Number(tc.pensionPercent)),
    );
    model.setSalary(GrossAnnual(Number(tc.gross)));

    const checks: [string, number, number][] = [
      [
        'pension',
        model.pensionDeduction,
        Number(tc.expectedPension),
      ],
      [
        'taxableGross',
        model.taxableGross,
        Number(tc.expectedTaxableGross),
      ],
      [
        'incomeTax',
        model.incomeTax,
        Number(tc.expectedIncomeTax),
      ],
      [
        'NI',
        model.nationalInsurance,
        Number(tc.expectedNI),
      ],
      ['net', model.net, Number(tc.expectedNet)],
    ];

    const failures = checks
      .filter(
        ([, actual, expected]) =>
          Math.abs(actual - expected) >= 0.005,
      )
      .map(
        ([field, actual, expected]) =>
          `${field}: expected ${expected}` +
          `, got ${actual}`,
      );

    if (failures.length > 0) {
      throw new Error(
        `${tc.label}:\n  ${failures.join('\n  ')}`,
      );
    }
  });
});

// ─── Student loan calculations ───────────────────

const studentLoanCases = parseCsv(
  path.join(
    FIXTURES,
    'student-loan-calculations.csv',
  ),
);

describe('regression: student loans', () => {
  it.each(studentLoanCases)(
    '$label',
    (tc: CsvRow) => {
      const model = new TakeHomePay(
        tc.taxYear as TaxYear,
      );

      const plansStr = (
        tc.studentLoanPlans ?? ''
      ).trim();
      if (plansStr) {
        model.setStudentLoanPlans(
          new Set(
            plansStr
              .split('|')
              .map(
                p => p.trim() as StudentLoanPlan,
              ),
          ),
        );
      }

      model.setSalary(
        GrossAnnual(Number(tc.gross)),
      );

      const checks: [string, number, number][] = [
        [
          'studentLoan',
          model.studentLoanDeduction,
          Number(tc.expectedStudentLoan),
        ],
        ['net', model.net, Number(tc.expectedNet)],
      ];

      const failures = checks
        .filter(
          ([, actual, expected]) =>
            Math.abs(actual - expected) >= 0.005,
        )
        .map(
          ([field, actual, expected]) =>
            `${field}: expected ${expected}` +
            `, got ${actual}`,
        );

      if (failures.length > 0) {
        throw new Error(
          `${tc.label}:\n  ` +
          `${failures.join('\n  ')}`,
        );
      }
    },
  );
});

// ─── Scottish income tax calculations ────────────

const scottishCases = parseCsv(
  path.join(FIXTURES, 'scottish-calculations.csv'),
);

describe('regression: Scottish income tax', () => {
  it.each(scottishCases)('$label', (tc: CsvRow) => {
    const model = new TakeHomePay(
      tc.taxYear as TaxYear,
      tc.region as TaxRegion,
    );
    model.setPensionBasis(
      tc.pensionBasis as PensionBasis,
    );
    model.setPension(
      PensionPercent(Number(tc.pensionPercent)),
    );
    model.setSalary(GrossAnnual(Number(tc.gross)));

    const checks: [string, number, number][] = [
      [
        'pension',
        model.pensionDeduction,
        Number(tc.expectedPension),
      ],
      [
        'taxableGross',
        model.taxableGross,
        Number(tc.expectedTaxableGross),
      ],
      [
        'incomeTax',
        model.incomeTax,
        Number(tc.expectedIncomeTax),
      ],
      [
        'NI',
        model.nationalInsurance,
        Number(tc.expectedNI),
      ],
      [
        'taxRelief',
        model.pensionTaxRelief,
        Number(tc.expectedTaxRelief),
      ],
      ['net', model.net, Number(tc.expectedNet)],
    ];

    const failures = checks
      .filter(
        ([, actual, expected]) =>
          Math.abs(actual - expected) >= 0.005,
      )
      .map(
        ([field, actual, expected]) =>
          `${field}: expected ${expected}` +
          `, got ${actual}`,
      );

    if (failures.length > 0) {
      throw new Error(
        `${tc.label}:\n  ${failures.join('\n  ')}`,
      );
    }
  });
});

// ─── Hourly rate crosscheck ─────────────────────

const hourlyCases = parseCsv(
  path.join(
    FIXTURES, 'hourly-rate-crosscheck.csv',
  ),
);

// The National Living Wage in `expectedHourlyGross` is the one
// externally-knowable figure here, and it is cited per row: the rest
// of the fixture is circular by construction (gross == rate x hours),
// so only that column and `expectedWeeklyHours` can fail on their own.
// Rates are the NLW for the year the row is LABELLED with — they were
// a year stale until 2 Sep 2026, which nothing caught.
describe('regression: hourly rate', () => {
  it.each(hourlyCases)(
    '$label',
    (tc: CsvRow) => {
      const cfg = getTaxYearConfig(
        tc.taxYear as TaxYear,
        tc.region as TaxRegion,
      );
      const hpy = hoursPerYear(cfg);
      const hourly = Number(tc.gross) / hpy;

      const checks: [string, number, number][] = [
        [
          'weeklyHours',
          cfg.standardWeeklyHours,
          Number(tc.expectedWeeklyHours),
        ],
        [
          'hoursPerYear',
          hpy,
          Number(tc.expectedHoursPerYear),
        ],
        [
          'hourlyGross',
          hourly,
          Number(tc.expectedHourlyGross),
        ],
      ];

      const failures = checks
        .filter(
          ([, actual, expected]) =>
            Math.abs(actual - expected) >= 0.005,
        )
        .map(
          ([field, actual, expected]) =>
            `${field}: expected ${expected}` +
            `, got ${actual}`,
        );

      if (failures.length > 0) {
        throw new Error(
          `${tc.label}:\n  ` +
          `${failures.join('\n  ')}`,
        );
      }
    },
  );
});

// ─── Annual allowance taper ──────────────────────

const aaCases = parseCsv(
  path.join(FIXTURES, 'annual-allowance-taper.csv'),
);

describe('regression: annual allowance taper', () => {
  it.each(aaCases)('$label', (tc: CsvRow) => {
    const cfg = getTaxYearConfig(tc.taxYear as TaxYear);

    let adjusted = Number(tc.adjustedIncome);
    let threshold = Number(tc.thresholdIncome);
    const checks: [string, number, number][] = [];

    if (tc.inputMode === 'components') {
      const inputs = {
        netIncome: Number(tc.netIncome),
        memberContributions:
          Number(tc.memberContributions),
        employerContributions:
          Number(tc.employerContributions),
        reliefAtSourceContributions:
          Number(tc.rasContributions),
        newSalarySacrifice:
          Number(tc.newSalarySacrifice),
      };
      threshold = calculateThresholdIncome(inputs);
      adjusted = calculateAdjustedIncome(inputs);
      checks.push(
        [
          'thresholdIncome',
          threshold,
          Number(tc.expectedThresholdIncome),
        ],
        [
          'adjustedIncome',
          adjusted,
          Number(tc.expectedAdjustedIncome),
        ],
      );
    }

    checks.push([
      'availableAA',
      calculateTaperedAnnualAllowance(
        adjusted, threshold, cfg,
      ),
      Number(tc.expectedAvailableAA),
    ]);

    const failures = checks
      .filter(
        ([, actual, expected]) =>
          Math.abs(actual - expected) >= 0.005,
      )
      .map(
        ([field, actual, expected]) =>
          `${field}: expected ${expected}` +
          `, got ${actual}`,
      );

    if (failures.length > 0) {
      throw new Error(
        `${tc.label}:\n  ${failures.join('\n  ')}`,
      );
    }
  });
});

// ─── HMRC NI crosscheck ─────────────────────────

const niCases = parseCsv(
  path.join(FIXTURES, 'hmrc-ni-crosscheck.csv'),
);

describe('regression: HMRC NI crosscheck', () => {
  it.each(niCases)('$label', (tc: CsvRow) => {
    const annualGross = Number(tc.annualGross);
    const expectedAnnualNI = Number(
      tc.expectedAnnualEmployeeNI,
    );

    const model = new TakeHomePay(
      tc.taxYear as TaxYear,
    );
    model.setSalary(GrossAnnual(annualGross));

    // HMRC data is monthly x 12, allow tolerance
    const tolerance = 12;
    const diff = Math.abs(
      model.nationalInsurance - expectedAnnualNI,
    );

    if (diff > tolerance) {
      throw new Error(
        `${tc.label}: annual NI expected ` +
        `~${expectedAnnualNI}, ` +
        `got ${model.nationalInsurance}, ` +
        `diff ${diff.toFixed(2)} exceeds ` +
        `${tolerance} tolerance`,
      );
    }
  });
});

// ─── Higher-rate threshold, by region ────────────
//
// Expectations are the published thresholds, not a re-derivation:
// Scotland's higher rate starts at £43,662 (gov.uk Scottish income
// tax) and rUK's at £50,270 (gov.uk income tax rates). The band is
// found by NAME because `incomeTaxBands[0]` is the basic rate in
// rUK and the STARTER rate in Scotland — reading position returned
// £16,537 for Scotland, the top of the starter band.

describe('regression: higher-rate threshold', () => {
  it.each([
    ['rUK', '2026-27', 50270],
    ['scotland', '2026-27', 43662],
  ] as const)('%s %s starts at %i', (region, year, expected) => {
    expect(
      higherRateThreshold(
        getTaxYearConfig(year as TaxYear, region as TaxRegion),
      ),
    ).toBe(expected);
  });

  // The throw has to be watched failing at least once, or it is a
  // guard nobody has seen work. TaxBand.name is a plain string, so
  // this fault is reachable by an ordinary typo.
  it('throws when no band carries the higher-rate name', () => {
    const cfg = getTaxYearConfig('2026-27', 'scotland');
    const renamed = {
      ...cfg,
      incomeTaxBands: cfg.incomeTaxBands.map((b) =>
        b.name === 'Higher Rate'
          ? {...b, name: 'Upper Rate'}
          : b),
    } as typeof cfg;
    expect(() => higherRateBand(renamed)).toThrow(
      /no Higher Rate/,
    );
  });

  // An INDEPENDENT route: walk the engine, not the band table. The
  // threshold is the gross at which the marginal rate first exceeds
  // the basic rate, which the table-reading implementation cannot
  // produce. The earlier version of this test re-spelled the lookup
  // and asserted t >= pa + higher.min — exactly what the function
  // returns — so it passed with the threshold shifted £5,000.
  it.each(['rUK', 'scotland'] as const)(
    '%s threshold is where the marginal rate first rises',
    (region) => {
      const cfg = getTaxYearConfig('2026-27', region);
      const t = higherRateThreshold(cfg);
      const taxAt = (gross: number) => {
        const thp = new TakeHomePay('2026-27', region);
        thp.setSalary(GrossAnnual(gross));
        return thp.incomeTax;
      };
      const basic = higherRateBand(cfg).rate;
      // £100 just below the threshold is taxed under the basic rate;
      // £100 just above it attracts the higher rate.
      const below = taxAt(t) - taxAt(t - 100);
      const above = taxAt(t + 100) - taxAt(t);
      expect(above).toBeGreaterThan(below);
      expect(above / 100).toBeCloseTo(basic, 3);
    });
});
