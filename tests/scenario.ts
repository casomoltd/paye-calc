// A take-home scenario: what a person earns and pays in (`given`), and
// the figures the model must report for it (`expect`). Every regression
// table of take-home cases is a list of these, so a case reads as the
// situation it describes, and the compiler is the table's schema.

import {expect} from 'vitest';
import {TakeHomePay} from '../src/TakeHomePay';
import {roundPence} from '../src/money';
import {
  GrossAnnual, PensionBasis, PensionFixed, PensionPercent, TAX_ROW_KINDS, taxYear,
} from '../src/types';
import type {StudentLoanPlan, TaxRegion, YearLabel} from '../src/types';

/** A pension contribution: a percentage of pay, or a fixed amount. */
type PensionGiven =
  | {readonly basis: PaidBasis; readonly percent: number}
  | {readonly basis: PaidBasis; readonly fixed: number};

/** A basis a contribution is paid on: every basis but none. */
type PaidBasis = Exclude<PensionBasis, PensionBasis.None>;

/** Each basis as a test title names it. */
export const BASIS_NAMES: Readonly<Record<PensionBasis, string>> = {
  [PensionBasis.None]: 'no pension',
  [PensionBasis.AutoEnrolment]: 'auto-enrolment',
  [PensionBasis.Employer]: 'employer pension',
  [PensionBasis.SalarySacrifice]: 'salary sacrifice',
  [PensionBasis.Personal]: 'personal pension',
};

/** A pension of `percent` of pay on each basis, or a fixed amount. */
export const employer = (percent: number): PensionGiven =>
  ({basis: PensionBasis.Employer, percent});
export const autoEnrolment = (percent: number): PensionGiven =>
  ({basis: PensionBasis.AutoEnrolment, percent});
export const sacrifice = (percent: number): PensionGiven =>
  ({basis: PensionBasis.SalarySacrifice, percent});
export const personal = (percent: number): PensionGiven =>
  ({basis: PensionBasis.Personal, percent});
export const sacrificeFixed = (fixed: number): PensionGiven =>
  ({basis: PensionBasis.SalarySacrifice, fixed});

/** The situation: one year's pay and what comes off it. */
export interface Given {
  readonly year: YearLabel;
  /** Whose rates apply; stated on every case, never assumed. */
  readonly region: TaxRegion;
  readonly gross: number;
  readonly pension?: PensionGiven;
  readonly loans?: readonly StudentLoanPlan[];
}

/**
 * The figures pinned for a scenario, each in £ a year. A case pins
 * only what it is about; an omitted figure is not checked.
 */
export interface Expected {
  readonly pension?: number;
  /** Pay the income tax is assessed on, after any pension. */
  readonly taxableGross?: number;
  readonly allowance?: number;
  /** Tax in each band above the allowance, in band order. */
  readonly bandTax?: readonly number[];
  readonly incomeTax?: number;
  /** NI at the main rate, then at the upper rate. */
  readonly niByRate?: readonly [number, number];
  readonly ni?: number;
  readonly studentLoan?: number;
  readonly taxRelief?: number;
  readonly net?: number;
}

export interface Scenario {
  readonly case: string;
  readonly given: Given;
  readonly expect: Expected;
}

/** The model a scenario describes. */
function modelFor(given: Given): TakeHomePay {
  const model = new TakeHomePay(taxYear(given.year), given.region);
  if (given.pension) {
    model.setPension({
      basis: given.pension.basis,
      contribution: 'fixed' in given.pension
        ? PensionFixed(given.pension.fixed)
        : PensionPercent(given.pension.percent),
    });
  }
  if (given.loans) model.setStudentLoanPlans(new Set(given.loans));
  model.setSalary(GrossAnnual(given.gross));
  return model;
}

/** A band list stops at the last band with tax in it. */
function withoutTrailingZeros(values: number[]): number[] {
  let end = values.length;
  while (end > 0 && values[end - 1] === 0) end--;
  return values.slice(0, end);
}

/** What the model reports, in the shape a scenario pins it. */
function reported(model: TakeHomePay): Required<Expected> {
  const ni = model.niBreakdown;
  return {
    pension: model.pensionDeduction,
    taxableGross: model.taxableGross,
    allowance: model.personalAllowance,
    bandTax: withoutTrailingZeros(
      model.taxBreakdown
        .filter((row) => row.kind === TAX_ROW_KINDS.Band)
        .map((band) => band.taxPaid),
    ),
    incomeTax: model.incomeTax,
    niByRate: [ni.mainRateTax, ni.upperRateTax],
    ni: model.nationalInsurance,
    studentLoan: model.studentLoanDeduction,
    taxRelief: model.pensionTaxRelief,
    net: model.net,
  };
}

/** Pennies: every pinned figure is to the penny. */
function round(value: unknown): unknown {
  if (typeof value === 'number') return roundPence(value);
  return Array.isArray(value) ? value.map(round) : value;
}

/** Check every figure the scenario pins, reporting all that miss. */
export function runScenario(scenario: Scenario): void {
  const actual = reported(modelFor(scenario.given));
  const pinned = Object.keys(scenario.expect) as (keyof Expected)[];
  const got = Object.fromEntries(
    pinned.map((key) => [key, round(actual[key])]),
  );
  expect(got).toEqual(round(scenario.expect));
}
