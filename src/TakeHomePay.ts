import {
  taxYear,
  TaxYear,
  TaxRegion,
  Salary,
  SalaryType,
  GrossAnnual,
  NO_PENSION,
  TaxBandBreakdown,
  NIBreakdown,
  PensionChoice,
  StudentLoanPlan,
  StudentLoanBreakdown,
} from './types.js';
import {asPercent} from './money.js';
import {grossForNet, payAt} from './pay.js';
import {allowanceRow} from './incomeTax.js';
import type {PayFigures, PayInputs} from './pay.js';
import {annualAllowance as allowanceFor} from './annualAllowance.js';
import type {AllowanceExtras, AnnualAllowance} from './annualAllowance.js';
import type {TaxYearConfig} from './TaxYearConfig.js';
import {getTaxYearConfig} from './taxYears/index.js';
import type {TaxCode} from './TaxCode.js';

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
 *
 * A façade over the pure calculation in `pay.ts`: the setters record
 * inputs and every figure is read from one `payAt` for the gross they
 * resolve to. A net salary is kept as the target it is, so a later
 * setter re-solves the gross rather than leave it stale.
 */
export class TakeHomePay {
  private _salary: Salary = GrossAnnual(0);
  private _pension: PensionChoice = NO_PENSION;
  private _studentLoanPlans: ReadonlySet<StudentLoanPlan> = new Set();
  private _taxCode: TaxCode | null = null;
  private _config: TaxYearConfig;
  /** The figures for the current inputs, worked once until one changes. */
  private _figures: PayFigures | null = null;

  /**
   * Creates a new TakeHomePay calculator.
   * @param taxYear - The tax year to use. Required: a year picks every
   *   rate the calculation reads, so none is assumed.
   * @param region - The tax region. Required for the same reason.
   */
  constructor(taxYear: TaxYear, region: TaxRegion) {
    this._config = getTaxYearConfig(taxYear, region);
  }

  // ─── Setters ─────────────────────────────────────

  /**
   * Sets the salary. Use GrossAnnual(amount) for direct gross input, or
   * NetAnnual(amount) for the gross that leaves that take-home, solved
   * against whatever else is set when a figure is read.
   */
  setSalary(salary: Salary): void {
    this._salary = salary;
    this._changed();
  }

  /**
   * Sets the pension: its basis and its contribution, e.g.
   * `{basis: PensionBasis.Employer, contribution: PensionPercent(5)}`,
   * or `NO_PENSION`.
   */
  setPension(pension: PensionChoice): void {
    this._pension = pension;
    this._changed();
  }

  /**
   * Sets the active student loan plans.
   * Multiple plans can be active simultaneously.
   */
  setStudentLoanPlans(plans: ReadonlySet<StudentLoanPlan>): void {
    this._studentLoanPlans = new Set(plans);
    this._changed();
  }

  /**
   * Sets a custom tax code, overriding the default PA
   * and potentially the income tax calculation strategy.
   */
  setTaxCode(taxCode: TaxCode | null): void {
    this._taxCode = taxCode;
    this._changed();
  }

  /** Changes the tax year for calculations. */
  setTaxYear(year: TaxYear): void {
    this._config = getTaxYearConfig(year, this._config.region);
    this._changed();
  }

  /** Changes the tax region for calculations. */
  setRegion(region: TaxRegion): void {
    this._config = getTaxYearConfig(this.taxYear, region);
    this._changed();
  }

  // ─── Figures ─────────────────────────────────────

  /** Gets the gross annual salary. */
  get gross(): number {
    return this._pay.gross;
  }

  /**
   * The annual pension contribution. Auto-enrolment applies it only to
   * qualifying earnings; other bases to the full gross. Under relief at
   * source it is the gross contribution, of which the member pays all
   * but `pensionTaxRelief`.
   */
  get pensionDeduction(): number {
    return this._pay.pensionContribution;
  }

  /**
   * Taxable income after pension deduction (before PA).
   * Pre-tax schemes reduce taxable income. Relief at
   * source (personal) does not.
   */
  get taxableGross(): number {
    return this._pay.taxableGross;
  }

  /**
   * The pay PAYE leaves untaxed, on which tax is worked: the code's free
   * pay, or with no code the tapered allowance plus £9 (`freePay.ts`).
   * `personalAllowance` stays the statutory figure a payslip shows.
   */
  get freePay(): number {
    return this._pay.freePay;
  }

  /** Effective Personal Allowance after taper, or the code's. */
  get personalAllowance(): number {
    return this._pay.personalAllowance;
  }

  /** Total annual income tax: the sum of the breakdown's band rows. */
  get incomeTax(): number {
    return this._pay.incomeTax;
  }

  /**
   * Total annual National Insurance contributions.
   * Salary sacrifice reduces contractual gross, so NI
   * is calculated on the lower amount.
   */
  get nationalInsurance(): number {
    return this._pay.niBreakdown.total;
  }

  /** Relief at source: the basic-rate share of a personal pension's
   *  gross contribution, which the provider claims. */
  get pensionTaxRelief(): number {
    return this._pay.pensionTaxRelief;
  }

  /** Total annual student loan deductions across all active plans. */
  get studentLoanDeduction(): number {
    return this._pay.studentLoanDeduction;
  }

  /** Annual net (take-home) pay. */
  get net(): number {
    return this._pay.net;
  }

  /** Everything that leaves pay, as a percentage of gross: so it is
   *  always `1 − net / gross`, whatever the pension basis. */
  get effectiveTaxRate(): number {
    const {gross, totalDeductions} = this._pay;
    return gross === 0 ? 0 : asPercent(totalDeductions / gross);
  }

  /** Marginal tax rate (rate on next £1 of income). */
  get marginalTaxRate(): number {
    const {gross, net} = this._pay;
    return asPercent(1 - (payAt(gross + 1, this._inputs).net - net));
  }

  /**
   * The pension annual allowance this year's saving meets. None of it
   * changes take-home pay; `extras` adds what the allowance tests read
   * beyond the pay, such as a defined-benefit accrual.
   */
  annualAllowance(extras: AllowanceExtras = {}): AnnualAllowance {
    return allowanceFor(this._pay, extras, this._config);
  }

  // ─── Breakdowns ──────────────────────────────────

  /**
   * Income tax breakdown by band. The allowance row shows the statutory
   * allowance, as a payslip and HMRC's estimator do; the bands are worked
   * on pay after free pay, £9 more (see `freePay`).
   */
  get taxBreakdown(): TaxBandBreakdown[] {
    const {personalAllowance, taxableGross, taxRows} = this._pay;
    return [allowanceRow(personalAllowance, taxableGross), ...taxRows];
  }

  /** National Insurance breakdown. */
  get niBreakdown(): NIBreakdown {
    return {...this._pay.niBreakdown};
  }

  /** Student loan breakdown by plan. */
  get studentLoanBreakdown(): StudentLoanBreakdown[] {
    return [...this._pay.loanRows];
  }

  // ─── Inputs ──────────────────────────────────────

  /** Current tax year. */
  get taxYear(): TaxYear {
    return taxYear(this._config.year);
  }

  /** Current pension. */
  get pension(): PensionChoice {
    return this._pension;
  }

  /** Active student loan plans. */
  get studentLoanPlans(): Set<StudentLoanPlan> {
    return new Set(this._studentLoanPlans);
  }

  // ─── Internals ───────────────────────────────────

  private get _inputs(): PayInputs {
    return {
      config: this._config,
      pension: this._pension,
      studentLoans: this._studentLoanPlans,
      taxCode: this._taxCode,
    };
  }

  /** The figures for the salary as set: a gross as given, never below
   *  nil, or the gross the net target needs under today's inputs. */
  private get _pay(): PayFigures {
    if (!this._figures) {
      const inputs = this._inputs;
      const {annual} = this._salary;
      const gross = this._salary.type === SalaryType.Gross
        ? Math.max(0, annual)
        : grossForNet(annual, inputs);
      this._figures = payAt(gross, inputs);
    }
    return this._figures;
  }

  private _changed(): void {
    this._figures = null;
  }
}
