/**
 * Take-home pay as a pure function: a gross and the inputs that price
 * it give every figure at once. Nothing here holds state, so a probe at
 * another gross (the marginal rate, the net-to-gross search) reads the
 * same rules as the answer it is compared with, and a caller that needs
 * one figure need not build a calculator to get it.
 */

import {PensionBasis, PensionType} from './types.js';
import type {
  NIBreakdown,
  PensionChoice,
  StudentLoanBreakdown,
  StudentLoanPlan,
  TaxBandBreakdown,
} from './types.js';
import {charge, percentOf, sumPence} from './money.js';
import {loanAmounts, niAmounts} from './deductions.js';
import {incomeTaxRows, taxOf} from './incomeTax.js';
import {freePay} from './freePay.js';
import {PENSION_BASES, reliefAtSource} from './pensionBases.js';
import type {ContributionSplit} from './pensionBases.js';
import {calculateTaperedPersonalAllowance} from './TaxYearConfig.js';
import type {TaxYearConfig} from './TaxYearConfig.js';
import type {TaxCode} from './TaxCode.js';

/** Everything that prices a gross: the year's rates and the person's
 *  pension, loans and code. */
export interface PayInputs {
  readonly config: TaxYearConfig;
  readonly pension: PensionChoice;
  readonly studentLoans: ReadonlySet<StudentLoanPlan>;
  readonly taxCode: TaxCode | null;
}

/** Every figure one gross produces, each in £ a year. */
export interface PayFigures {
  readonly gross: number;
  /** The contribution to the pot; under relief at source, gross of the
   *  relief the provider claims. */
  readonly pensionContribution: number;
  /** The contribution as the annual-allowance tests count it. */
  readonly pensionSplit: ContributionSplit;
  /** Pay income tax is assessed on, after any pension taken before it. */
  readonly taxableGross: number;
  readonly freePay: number;
  /** The statutory allowance after the taper, or the code's. */
  readonly personalAllowance: number;
  /** Tax in each band; the allowance row is the façade's to show. */
  readonly taxRows: readonly TaxBandBreakdown[];
  readonly incomeTax: number;
  readonly niBreakdown: NIBreakdown;
  readonly loanRows: readonly StudentLoanBreakdown[];
  readonly studentLoanDeduction: number;
  /** Relief at source: the part of the contribution the member does not
   *  pay. Nil on every other basis. */
  readonly pensionTaxRelief: number;
  /** All that leaves pay: the member's share of the pension, tax, NI and
   *  loans. */
  readonly totalDeductions: number;
  readonly net: number;
}

/**
 * Net to gross is searched for, not solved, because the allowance taper
 * makes take-home pay non-linear in gross. Gross is never below the net
 * it leaves, and is under three times it while total deductions stay
 * under two thirds of gross, as tax, NI and an ordinary pension do; a
 * target beyond that bound throws rather than return a wrong gross.
 * Inside it the search halves the range until the net is within a penny.
 * Where the taper takes a whole pound, net jumps by up to 40p and some
 * targets are never hit exactly; the answer is then the least gross
 * found that leaves at least the target.
 */
const NET_TO_GROSS = {highestMultiple: 3, steps: 100, tolerance: 0.01};
const HALVES = 2;

/** Every figure for one gross. */
export function payAt(gross: number, inputs: PayInputs): PayFigures {
  const {config, pension, studentLoans, taxCode} = inputs;
  const basis = PENSION_BASES[pension.basis];
  const contribution = contributionOf(pension, basis.earningsBase(gross, config));
  const taxableGross = basis.beforeTax ? gross - contribution : gross;
  const earnings = basis.beforeNi ? gross - contribution : gross;
  const pensionSplit = basis.split(contribution);
  const relief = pensionSplit.reliefAtSource > 0
    ? reliefAtSource(pensionSplit.reliefAtSource, config.year)
    : 0;

  const taxRows = incomeTaxRows(taxableGross, config, taxCode);
  const incomeTax = taxOf(taxRows);
  const niBreakdown = nationalInsurance(earnings, config);
  const loanRows = loanAmounts(earnings, studentLoans, config.studentLoanThresholds)
    .map((loan) => ({...loan, deduction: charge(loan.amount, loan.rate)}));
  // Each plan is worked and rounded on its own, as HMRC's student-loan
  // test data does, and the deduction is their sum.
  const studentLoanDeduction = sumPence(loanRows.map((loan) => loan.deduction));
  const totalDeductions = contribution - relief + incomeTax
    + niBreakdown.total + studentLoanDeduction;

  return {
    gross,
    pensionContribution: contribution,
    pensionSplit,
    taxableGross,
    freePay: freePay(taxableGross, config, taxCode),
    personalAllowance: taxCode
      // A code states HMRC's adjusted figure, so it is not tapered again.
      ? taxCode.personalAllowance
      : calculateTaperedPersonalAllowance(taxableGross, config),
    taxRows,
    incomeTax,
    niBreakdown,
    loanRows,
    studentLoanDeduction,
    pensionTaxRelief: relief,
    totalDeductions,
    net: gross - totalDeductions,
  };
}

/** The least gross that leaves at least `targetNet`, by the search
 *  described at `NET_TO_GROSS`. */
export function grossForNet(targetNet: number, inputs: PayInputs): number {
  if (targetNet <= 0) return 0;
  const netAt = (gross: number) => payAt(gross, inputs).net;
  let low = targetNet;
  let high = targetNet * NET_TO_GROSS.highestMultiple;
  if (netAt(high) < targetNet) {
    throw new Error(
      `No gross up to £${high} leaves £${targetNet} net: deductions take`
      + ' more than two thirds of pay',
    );
  }
  for (let i = 0; i < NET_TO_GROSS.steps; i++) {
    const mid = (low + high) / HALVES;
    const net = netAt(mid);
    if (net < targetNet) {
      low = mid;
      continue;
    }
    high = mid;
    // Only from above: a gross a hair short of the target is not one
    // that leaves it.
    if (net - targetNet < NET_TO_GROSS.tolerance) break;
  }
  return high;
}

/** A pension's contribution on its earnings base: a percentage of it to
 *  the pound, or a fixed sum no larger than it. */
function contributionOf(pension: PensionChoice, base: number): number {
  if (pension.basis === PensionBasis.None) return 0;
  const {contribution} = pension;
  return contribution.type === PensionType.Percent
    ? Math.round(percentOf(base, contribution.percent))
    : Math.min(contribution.amount, base);
}

/** NI on earnings, by rate. */
function nationalInsurance(earnings: number, config: TaxYearConfig): NIBreakdown {
  const ni = config.nationalInsurance;
  const amounts = niAmounts(earnings, ni);
  const mainRateTax = charge(amounts.mainRateAmount, ni.mainRate);
  const upperRateTax = charge(amounts.upperRateAmount, ni.upperRate);
  return {
    ...amounts,
    mainRateTax,
    upperRateTax,
    total: sumPence([mainRateTax, upperRateTax]),
  };
}
