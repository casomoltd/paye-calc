// Income tax and NI against HMRC's own figures: the only tests here
// whose answers come from HMRC rather than from this model.
// - PAYE: every row of HMRC's payroll test data for 2025-26 and 2026-27,
//   the years gov.uk carries a pack for ("Software developers payroll
//   test data").
// - NI: the category A sheet of HMRC's NIC test data, same years.
// - Take-home: runs of HMRC's own estimator, by hand.
// A band, rate or tax code that drifts from HMRC's fails here even when
// every snapshot still agrees.

import {TaxCode} from '../../src/TaxCode';
import {describe, it, expect} from 'vitest';
import {TakeHomePay} from '../../src/TakeHomePay';
import {
  GrossAnnual, Period, PERIODS_PER_YEAR, TAX_ROW_KINDS, taxYear,
} from '../../src/types';
import type {YearLabel} from '../../src/types';
import {ESTIMATOR_RUNS} from '../fixtures/hmrc/estimator';
import {NI_CATEGORY_A} from '../fixtures/hmrc/ni';
import {PAYE_2025_26} from '../fixtures/hmrc/paye-2025-26';
import {PAYE_2026_27} from '../fixtures/hmrc/paye-2026-27';
import {WORKBOOK_RATES} from '../fixtures/hmrc/paye-sheet';
import type {PayeRow, PayeSheet} from '../fixtures/hmrc/paye-sheet';

// HMRC's rows are pay periods and the library is annual, so each row is
// scaled to a year and back. A cumulative row's pay to date over n of P
// periods is a year at P/n of it, because cumulative PAYE pro-rates the
// free pay and every band by n/P; a W1/M1 row is one period, a year at
// P times it.

// HMRC rounds taxable pay, and each pro-rated band limit, to whole
// pounds every period; together those move the scaled-back tax by up to
// half a pound (the largest, Scotland's weekly cumulative row 6, is
// 50p), and HMRC accepts a payroll within a penny. A band edge, rate or
// allowance a pound out misses by more. A row priced within a penny of a
// rounding step (HMRC's 39.24 / 39.25 pairs) cannot fail at this bound;
// the cumulative rows are what pin the bands.
const PAYE_TOLERANCE = 0.51;

// HMRC works NI on period thresholds rounded up to the pound (£1,048 a
// month for £12,570 a year): half a pound at 8% is 4p, plus a penny of
// rounding either side. The largest gap seen is 6.6p.
const NI_TOLERANCE = 0.07;

/** Each fixture frequency as the library's period. */
const FREQUENCY_PERIOD = {Weekly: Period.Weekly, Monthly: Period.Monthly} as const;

/** Each workbook's nation, as a case name says it. */
const WORKBOOK_NAMES = {rUK: 'rest of UK', scotland: 'Scotland', wales: 'Wales'};

/** A sheet and row in words: who, how often paid, and on what basis. */
function caseName(sheet: PayeSheet, row: PayeRow, line: number): string {
  const often = sheet.periodsPerYear === PERIODS_PER_YEAR[Period.Monthly]
    ? 'monthly' : 'weekly';
  const basis = sheet.basis === 'cumulative'
    ? `cumulative, period ${row[1]}`
    : `each period on its own, line ${line}`;
  return `${WORKBOOK_NAMES[sheet.region]}, ${often} pay, ${basis},`
    + ` code ${row[0]}, £${row[2]} paid`;
}

/** The years gov.uk carries a pack for, each with its sheets. */
const PAYE: readonly (readonly [YearLabel, readonly PayeSheet[]])[] = [
  ['2025-26', PAYE_2025_26],
  ['2026-27', PAYE_2026_27],
];

interface PayeCase {
  readonly label: string;
  readonly year: YearLabel;
  readonly sheet: PayeSheet;
  readonly row: PayeRow;
}

const cases: PayeCase[] = PAYE.flatMap(([year, sheets]) =>
  sheets.flatMap((sheet) => sheet.rows.map((row, i) => ({
    label: `${year}, ${caseName(sheet, row, i + 1)}`,
    year, sheet, row,
  }))));

/** The model's tax over the row's span, and HMRC's for the same span. */
function compare({year, sheet, row}: PayeCase) {
  const [code, period, grossPay, payToDate, taxDue, taxToDate] = row;
  const cumulative = sheet.basis === 'cumulative';
  const share = (cumulative ? period : 1) / sheet.periodsPerYear;
  const model = new TakeHomePay(taxYear(year), WORKBOOK_RATES[sheet.region]);
  model.setTaxCode(TaxCode.from(code));
  const pay = cumulative ? payToDate : grossPay;
  model.setSalary(GrossAnnual(pay / share));
  return {ours: model.incomeTax * share, hmrc: cumulative ? taxToDate : taxDue};
}

describe('regression: HMRC PAYE test data', () => {
  it.each(cases)('$label', (tc) => {
    const {ours, hmrc} = compare(tc);
    expect(Math.abs(ours - hmrc)).toBeLessThanOrEqual(PAYE_TOLERANCE);
  });
});

const niCases = NI_CATEGORY_A.flatMap(({year, rows}) =>
  rows.map(([frequency, pay, , nic]) => ({
    year, frequency, pay, nic,
    label: `${year}, category A, £${pay} paid ${frequency.toLowerCase()}`,
  })));

describe('regression: HMRC NI test data', () => {
  it.each(niCases)('$label', ({year, frequency, pay, nic}) => {
    const periods = PERIODS_PER_YEAR[FREQUENCY_PERIOD[frequency]];
    const model = new TakeHomePay(taxYear(year), 'rUK');
    model.setSalary(GrossAnnual(pay * periods));
    expect(Math.abs(model.nationalInsurance / periods - nic))
      .toBeLessThanOrEqual(NI_TOLERANCE);
  });
});

describe('regression: HMRC take-home estimator', () => {
  it.each(ESTIMATOR_RUNS)('$case', ({given, printed}) => {
    const model = new TakeHomePay(taxYear(given.year), given.region);
    if ('code' in given) model.setTaxCode(TaxCode.from(given.code));
    model.setSalary(GrossAnnual(given.gross));
    const taxByRate = model.taxBreakdown
      .filter((row) => row.kind === TAX_ROW_KINDS.Band)
      .map(({taxPaid}) => taxPaid);
    // HMRC prints a K code's negative allowance as a pay adjustment and
    // shows the allowance as nil; the breakdown's opening row says which.
    const [opening] = model.taxBreakdown;
    const kCode = opening.kind === TAX_ROW_KINDS.KCodeAddition;
    const reported: Record<string, unknown> = {
      personalAllowance: kCode ? 0 : model.personalAllowance,
      kCodePayAdjustment: kCode ? opening.taxableAmount : undefined,
      taxByRate,
      ni: model.nationalInsurance,
      takeHome: Math.round(model.net * 100) / 100,
    };
    // A run states only what it printed, and only that is compared.
    const compared = Object.fromEntries(
      Object.keys(printed).map((key) => [key, reported[key]]),
    );
    expect(compared).toEqual(printed);
  });
});
