import {
  taxYear,
  TaxYear,
  TaxRegion,
  Period,
  Salary,
  SalaryType,
  TaxBandBreakdown,
  NIBreakdown,
  Pension,
  PensionType,
  PensionPercent,
  PensionBasis,
  StudentLoanPlan,
  StudentLoanBreakdown,
  TAX_BAND_NAMES,
  TAX_REGIONS,
} from './types.js';
import {asPercent, percentOf, roundPence, sumPence} from './money.js';
import {amountsByBand, loanAmounts, niAmounts} from './deductions.js';
import {allowanceIncomes, pensionInput} from './pensionInputs.js';
import {PENSION_BASES} from './pensionBases.js';
import type {BasisRules} from './pensionBases.js';
import type {PensionSaving} from './pensionInputs.js';
import {
  TaxYearConfig,
  calculateTaperedPersonalAllowance,
  calculateTaperedAnnualAllowance,
  calculateThresholdIncome,
  calculateAdjustedIncome,
  taxBandByName,
} from './TaxYearConfig.js';
import {getTaxYearConfig} from './taxYears/index.js';

import {
  TaxCode, TaxStrategy,
} from './TaxCode.js';
import {freePayWithoutCode} from './freePay.js';
import {flatRateBand} from './flatRate.js';

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

/** How many of each display period make a year. */
const PERIODS_PER_YEAR: Record<Period, number> = {
  [Period.Weekly]: 52,
  [Period.Monthly]: 12,
  [Period.Annual]: 1,
};

/**
 * TakeHomePay model - calculates UK PAYE take-home pay.
 *
 * Handles:
 * - Income tax with Personal Allowance taper
 * - National Insurance contributions
 * - Pension deductions (auto-enrolment, employer, salary sacrifice, personal)
 * - Student loan repayments, several plans at once
 * - HMRC tax codes (standard, K, BR, D, NT, 0T, and the S and C prefixes)
 * - The pension annual allowance and its taper
 * - Gross-to-net and net-to-gross calculations
 */
export class TakeHomePay {
  private _grossAnnual: number = 0;
  private _period: Period = Period.Annual;
  private _pension: Pension = PensionPercent(0);
  private _pensionBasis: PensionBasis =
    PensionBasis.AutoEnrolment;
  private _studentLoanPlans: Set<StudentLoanPlan> =
    new Set();
  private _taxCode: TaxCode | null = null;
  private _config: TaxYearConfig;
  private _region: TaxRegion;
  // Annual-allowance inputs — all default to neutral so
  // the AA getters are purely additive (take-home pay is
  // unaffected unless these are set).
  private _employerContribution: number = 0;
  private _dbAnnualAccrual: number = 0;
  private _otherTaxableIncome: number = 0;
  private _mpaaTriggered: boolean = false;

  /**
   * Creates a new TakeHomePay calculator.
   * @param taxYear - The tax year to use. Required: a year picks every
   *   rate the calculation reads, so none is assumed.
   * @param region - The tax region. Required for the same reason.
   */
  constructor(taxYear: TaxYear, region: TaxRegion) {
    this._region = region;
    this._config = getTaxYearConfig(taxYear, region);
  }

  // ─── Setters ─────────────────────────────────────

  /**
   * Sets the salary. Use GrossAnnual(amount) for direct
   * gross input, or NetAnnual(amount) to reverse-solve
   * from a target take-home.
   */
  setSalary(salary: Salary): void {
    if (salary.type === SalaryType.Gross) {
      this._grossAnnual = Math.max(0, salary.annual);
      return;
    }

    // Net target — binary search due to non-linear PA taper
    if (salary.annual <= 0) {
      this._grossAnnual = 0;
      return;
    }

    const target = salary.annual;
    let low = target;
    let high = target * NET_TO_GROSS.highestMultiple;
    if (this._netAtGross(high) < target) {
      throw new Error(
        `No gross up to £${high} leaves £${target} net: deductions take`
        + ' more than two thirds of pay',
      );
    }
    for (let i = 0; i < NET_TO_GROSS.steps; i++) {
      const mid = (low + high) / HALVES;
      const net = this._netAtGross(mid);
      if (Math.abs(net - target) < NET_TO_GROSS.tolerance) {
        high = mid;
        break;
      }
      if (net < target) low = mid;
      else high = mid;
    }
    this._grossAnnual = high;
  }

  /** Sets the display period for amounts. */
  setPeriod(period: Period): void {
    this._period = period;
  }

  /**
   * Sets pension contribution.
   * Use PensionPercent(5) or PensionFixed(3000).
   */
  setPension(pension: Pension): void {
    this._pension = pension;
  }

  /**
   * Sets the pension scheme basis, which determines how
   * contributions interact with tax and NI.
   */
  setPensionBasis(basis: PensionBasis): void {
    this._pensionBasis = basis;
  }

  /**
   * Sets the active student loan plans.
   * Multiple plans can be active simultaneously.
   */
  setStudentLoanPlans(
    plans: Set<StudentLoanPlan>,
  ): void {
    this._studentLoanPlans = new Set(plans);
  }

  /**
   * Sets a custom tax code, overriding the default PA
   * and potentially the income tax calculation strategy.
   */
  setTaxCode(taxCode: TaxCode | null): void {
    this._taxCode = taxCode;
  }

  /** Changes the tax year for calculations. */
  setTaxYear(year: TaxYear): void {
    this._config = getTaxYearConfig(
      year, this._region,
    );
  }

  /** Changes the tax region for calculations. */
  setRegion(region: TaxRegion): void {
    this._region = region;
    this._config = getTaxYearConfig(
      taxYear(this._config.year),
      region,
    );
  }

  /**
   * Sets the annual employer pension contribution (for a
   * defined-contribution scheme), used only for the
   * annual-allowance adjusted income and pension input.
   * Does not affect take-home pay.
   */
  setEmployerContribution(amount: number): void {
    this._employerContribution = Math.max(0, amount);
  }

  /**
   * Sets the annual defined-benefit pension accrual. The
   * pension input feeding adjusted income is 16× this
   * figure (DB_PENSION_INPUT_MULTIPLIER). Does not affect
   * take-home pay.
   */
  setDbAnnualAccrual(amount: number): void {
    this._dbAnnualAccrual = Math.max(0, amount);
  }

  /**
   * Sets other taxable income (e.g. self-employment,
   * savings, dividends) added to net income for the
   * annual-allowance tests. Does not affect PAYE
   * take-home pay on the employment.
   */
  setOtherTaxableIncome(amount: number): void {
    this._otherTaxableIncome = Math.max(0, amount);
  }

  /**
   * Flags that the Money Purchase Annual Allowance applies
   * (defined-contribution benefits flexibly accessed),
   * which caps the available allowance at the MPAA.
   */
  setMpaaTriggered(triggered: boolean): void {
    this._mpaaTriggered = triggered;
  }

  // ─── Getters ─────────────────────────────────────

  /** Gets the gross annual salary. */
  get gross(): number {
    return this._grossAnnual;
  }

  /**
   * Gets the annual pension deduction amount.
   * Auto-enrolment applies contributions only to
   * qualifying earnings. Other schemes use full gross.
   */
  get pensionDeduction(): number {
    const earningsBase = this._pensionEarningsBase;

    if (this._pension.type === PensionType.Percent) {
      return Math.round(
        percentOf(earningsBase, this._pension.percent),
      );
    }
    return Math.min(this._pension.amount, earningsBase);
  }

  private get _basis(): BasisRules {
    return PENSION_BASES[this._pensionBasis];
  }

  private get _pensionEarningsBase(): number {
    return this._basis.earningsBase(this._grossAnnual, this._config);
  }

  /**
   * Taxable income after pension deduction (before PA).
   * Pre-tax schemes reduce taxable income. Relief at
   * source (personal) does not.
   */
  get taxableGross(): number {
    return this._basis.beforeTax
      ? this._grossAnnual - this.pensionDeduction
      : this._grossAnnual;
  }

  /**
   * The pay PAYE leaves untaxed, on which tax is worked: the code's free
   * pay, or with no code the tapered allowance plus £9 (`freePay.ts`).
   * `personalAllowance` stays the statutory figure a payslip shows.
   */
  get freePay(): number {
    return this._taxCode
      ? this._taxCode.freePay
      : freePayWithoutCode(this.taxableGross, this._config);
  }

  /** Effective Personal Allowance after taper. */
  get personalAllowance(): number {
    if (this._taxCode) {
      // Custom code overrides standard PA — no taper,
      // the code already encodes HMRC's adjusted figure.
      return this._taxCode.personalAllowance;
    }
    return calculateTaperedPersonalAllowance(
      this.taxableGross, this._config,
    );
  }

  /** Total annual income tax. */
  get incomeTax(): number {
    // The sum of the breakdown's rows, whatever the code, so the two
    // cannot disagree by a penny.
    return sumPence(this._bandRows.map((row) => row.taxPaid));
  }

  /**
   * Contractual pay — gross reduced by any salary
   * sacrifice. Salary sacrifice lowers the earnings on
   * which both NI and student loan are assessed; every
   * other pension basis leaves the full gross intact.
   */
  private get _contractualEarnings(): number {
    return this._basis.beforeNi
      ? this._grossAnnual - this.pensionDeduction
      : this._grossAnnual;
  }

  /**
   * Total annual National Insurance contributions.
   * Salary sacrifice reduces contractual gross, so NI
   * is calculated on the lower amount.
   */
  get nationalInsurance(): number {
    return this.niBreakdown.total;
  }

  /**
   * Basic-rate tax relief reclaimed by the pension
   * provider for relief-at-source (personal) pensions.
   */
  get pensionTaxRelief(): number {
    const {reliefAtSource} = this._basis.split(this.pensionDeduction);
    if (reliefAtSource === 0) return 0;
    // Relief at source is at the rest of the UK's basic rate even for a
    // Scottish taxpayer, grossing a net contribution up by b / (1 − b).
    const basic = taxBandByName(
      getTaxYearConfig(taxYear(this._config.year), TAX_REGIONS.rUK),
      TAX_BAND_NAMES.basicRate,
    ).rate;
    return roundPence(reliefAtSource * basic / (1 - basic));
  }

  /**
   * Total annual student loan deductions across all
   * active plans.
   */
  get studentLoanDeduction(): number {
    // Each plan is worked and rounded on its own, as HMRC's
    // student-loan test data does, and the deduction is their sum.
    return sumPence(this.studentLoanBreakdown.map((loan) => loan.deduction));
  }

  private get _loanAmounts() {
    return loanAmounts(
      this._contractualEarnings,
      this._studentLoanPlans,
      this._config.studentLoanThresholds,
    );
  }

  /** Annual net (take-home) pay. */
  get net(): number {
    return (
      this._grossAnnual -
      this.pensionDeduction -
      this.incomeTax -
      this.nationalInsurance -
      this.studentLoanDeduction +
      this.pensionTaxRelief
    );
  }

  /** Effective tax rate as a percentage of gross. */
  get effectiveTaxRate(): number {
    if (this._grossAnnual === 0) return 0;
    const totalDeductions =
      this.incomeTax +
      this.nationalInsurance +
      this.pensionDeduction +
      this.studentLoanDeduction;
    return asPercent(totalDeductions / this._grossAnnual);
  }

  /** Marginal tax rate (rate on next £1 of income). */
  get marginalTaxRate(): number {
    const currentNet = this.net;
    const newNet = this._netAtGross(
      this._grossAnnual + 1,
    );
    return asPercent(1 - (newNet - currentNet));
  }

  /**
   * Net take-home at a hypothetical gross, restoring the
   * original gross afterwards even on error. The class
   * probes gross transiently in a couple of places (here
   * and the net-to-gross solver); this keeps that probe in
   * one exception-safe place rather than inline mutation.
   */
  private _netAtGross(gross: number): number {
    const originalGross = this._grossAnnual;
    this._grossAnnual = gross;
    try {
      return this.net;
    } finally {
      this._grossAnnual = originalGross;
    }
  }

  // ─── Annual allowance ────────────────────────────

  private get _pensionSaving(): PensionSaving {
    return {
      split: this._basis.split(this.pensionDeduction),
      taxableGross: this.taxableGross,
      otherTaxableIncome: this._otherTaxableIncome,
      employerContribution: this._employerContribution,
      dbAnnualAccrual: this._dbAnnualAccrual,
    };
  }

  /** Threshold income for the annual-allowance taper. */
  get thresholdIncome(): number {
    return calculateThresholdIncome(allowanceIncomes(this._pensionSaving));
  }

  /** Adjusted income for the annual-allowance taper. */
  get adjustedIncome(): number {
    return calculateAdjustedIncome(allowanceIncomes(this._pensionSaving));
  }

  /**
   * Available annual allowance after taper. Capped at the
   * MPAA when flexibly-accessed benefits are flagged.
   */
  get availableAnnualAllowance(): number {
    if (this._mpaaTriggered) {
      return this._config.annualAllowance.moneyPurchase;
    }
    return calculateTaperedAnnualAllowance(
      this.adjustedIncome,
      this.thresholdIncome,
      this._config,
    );
  }

  /**
   * Total pension input for the year. A defined-benefit
   * accrual is measured as 16× the accrual; otherwise it
   * is member plus employer contributions.
   */
  get pensionInput(): number {
    return pensionInput(this._pensionSaving);
  }

  /**
   * Pension savings above the available annual allowance,
   * which attract the annual-allowance charge (0 if within
   * allowance).
   */
  get annualAllowanceExcess(): number {
    return Math.max(
      0,
      this.pensionInput - this.availableAnnualAllowance,
    );
  }

  // ─── Display Values (adjusted for period) ────────

  private get _periodDivisor(): number {
    return PERIODS_PER_YEAR[this._period];
  }

  get displayGross(): number {
    return this._grossAnnual / this._periodDivisor;
  }

  get displayNet(): number {
    return this.net / this._periodDivisor;
  }

  get displayIncomeTax(): number {
    return this.incomeTax / this._periodDivisor;
  }

  get displayNationalInsurance(): number {
    return this.nationalInsurance / this._periodDivisor;
  }

  get displayPension(): number {
    return this.pensionDeduction / this._periodDivisor;
  }

  get displayStudentLoan(): number {
    return (
      this.studentLoanDeduction / this._periodDivisor
    );
  }

  // ─── Breakdowns ──────────────────────────────────

  /**
   * Income tax breakdown by band. The allowance row shows the statutory
   * allowance, as a payslip and HMRC's estimator do; the bands are worked
   * on pay after free pay, £9 more (see `freePay`).
   */
  get taxBreakdown(): TaxBandBreakdown[] {
    const pa = this.personalAllowance;
    return [
      {
        name: 'Personal Allowance',
        rate: 0,
        taxableAmount: Math.min(pa, this.taxableGross),
        taxPaid: 0,
      },
      ...this._bandRows,
    ];
  }

  /** Tax in each band the taxable income reaches, to the penny. */
  private get _bandRows(): TaxBandBreakdown[] {
    // K codes give negative free pay, increasing taxable.
    const taxable = Math.max(0, this.taxableGross - this.freePay);
    const code = this._taxCode;
    const strategy = code?.strategy;
    if (strategy === TaxStrategy.NoTax) return [];
    const chargesOneRate = strategy === TaxStrategy.BasicRate
      || strategy === TaxStrategy.FlatRate;
    if (code && chargesOneRate) {
      const band = flatRateBand(this._config, code);
      return [{
        name: band.name,
        rate: band.rate,
        taxableAmount: taxable,
        taxPaid: roundPence(taxable * band.rate),
      }];
    }
    return amountsByBand(taxable, this._config.incomeTaxBands)
      .map(({band, amount}) => ({
        name: band.name,
        rate: band.rate,
        taxableAmount: amount,
        taxPaid: roundPence(amount * band.rate),
      }));
  }

  /** National Insurance breakdown. */
  get niBreakdown(): NIBreakdown {
    const ni = this._config.nationalInsurance;
    const amounts = niAmounts(this._contractualEarnings, ni);
    const mainRateTax = roundPence(amounts.mainRateAmount * ni.mainRate);
    const upperRateTax = roundPence(amounts.upperRateAmount * ni.upperRate);
    return {
      ...amounts,
      mainRateTax,
      upperRateTax,
      total: sumPence([mainRateTax, upperRateTax]),
    };
  }

  /** Student loan breakdown by plan. */
  get studentLoanBreakdown(): StudentLoanBreakdown[] {
    return this._loanAmounts.map((loan) => ({
      ...loan,
      deduction: roundPence(loan.amount * loan.rate),
    }));
  }

  /** Current tax year. */
  get taxYear(): TaxYear {
    return taxYear(this._config.year);
  }

  /** Current pension basis. */
  get pensionBasis(): PensionBasis {
    return this._pensionBasis;
  }

  /** Current display period. */
  get period(): Period {
    return this._period;
  }

  /** Active student loan plans. */
  get studentLoanPlans(): Set<StudentLoanPlan> {
    return new Set(this._studentLoanPlans);
  }
}
