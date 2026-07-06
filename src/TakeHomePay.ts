import {
  TaxYear,
  TaxRegion,
  TAX_REGIONS,
  Period,
  Salary,
  SalaryType,
  TaxBandBreakdown,
  NIBreakdown,
  TAX_BAND_NAMES,
  Pension,
  PensionType,
  PensionPercent,
  PensionBasis,
  StudentLoanPlan,
  StudentLoanBreakdown,
  DB_PENSION_INPUT_MULTIPLIER,
} from './types.js';
import {
  TaxYearConfig,
  AnnualAllowanceIncomeInputs,
  calculateTaperedPersonalAllowance,
  calculateTaperedAnnualAllowance,
  calculateThresholdIncome,
  calculateAdjustedIncome,
} from './TaxYearConfig.js';
import {getTaxYearConfig} from './taxYears/index.js';
import {TaxCode, TaxStrategy} from './TaxCode.js';

/**
 * TakeHomePay model - calculates UK PAYE take-home pay.
 *
 * Handles:
 * - Income tax with Personal Allowance taper
 * - National Insurance contributions
 * - Pension deductions (auto-enrolment, employer, salary sacrifice, personal)
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
   * @param taxYear - The tax year to use.
   * @param region - The tax region (defaults to rUK).
   */
  constructor(
    taxYear: TaxYear = '2024-25',
    region: TaxRegion = 'rUK',
  ) {
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

    let low = salary.annual;
    let high = salary.annual * 3;
    const tolerance = 0.01;

    for (let i = 0; i < 100; i++) {
      const mid = (low + high) / 2;
      this._grossAnnual = mid;
      const calculatedNet = this.net;

      if (
        Math.abs(calculatedNet - salary.annual) <
        tolerance
      ) {
        return;
      }

      if (calculatedNet < salary.annual) {
        low = mid;
      } else {
        high = mid;
      }
    }
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
      this._config.year as TaxYear,
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
        (earningsBase * this._pension.percent) / 100,
      );
    }
    return Math.min(this._pension.amount, earningsBase);
  }

  private get _pensionEarningsBase(): number {
    if (
      this._pensionBasis === PensionBasis.AutoEnrolment
    ) {
      const {lowerThreshold, upperThreshold} =
        this._config.qualifyingEarnings;
      return Math.max(
        0,
        Math.min(this._grossAnnual, upperThreshold) -
          lowerThreshold,
      );
    }
    return this._grossAnnual;
  }

  /**
   * Taxable income after pension deduction (before PA).
   * Pre-tax schemes reduce taxable income. Relief at
   * source (personal) does not.
   */
  get taxableGross(): number {
    if (this._pensionBasis === PensionBasis.Personal) {
      return this._grossAnnual;
    }
    return this._grossAnnual - this.pensionDeduction;
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
    const strategy = this._taxCode?.strategy;

    // NT — no tax charged
    if (strategy === TaxStrategy.NoTax) {
      return 0;
    }

    // K codes can have negative PA, increasing taxable
    const taxable = Math.max(
      0,
      this.taxableGross - this.personalAllowance,
    );

    // Flat-rate codes bypass progressive bands
    const isFlatRate =
      strategy === TaxStrategy.BasicRate ||
      strategy === TaxStrategy.HigherRate ||
      strategy === TaxStrategy.AdditionalRate;

    if (isFlatRate) {
      const rate = this.flatTaxRate(strategy);
      return Math.round(taxable * rate * 100) / 100;
    }

    // Progressive bands (standard codes, K, 0T, null)
    let totalTax = 0;
    let remaining = taxable;

    for (const band of this._config.incomeTaxBands) {
      const bandWidth = band.max - band.min;
      const amountInBand = Math.min(
        remaining, bandWidth,
      );

      if (amountInBand > 0) {
        totalTax += amountInBand * band.rate;
        remaining -= amountInBand;
      }

      if (remaining <= 0) break;
    }

    return Math.round(totalTax * 100) / 100;
  }

  private flatTaxRate(strategy: TaxStrategy): number {
    const bands = this._config.incomeTaxBands;

    if (strategy === TaxStrategy.BasicRate) {
      const band = bands.find(
        b => b.name === TAX_BAND_NAMES.basicRate,
      );
      return band?.rate ?? bands[0].rate;
    }

    if (strategy === TaxStrategy.HigherRate) {
      const band = bands.find(
        b => b.name === TAX_BAND_NAMES.higherRate,
      );
      return (
        band?.rate ?? bands[bands.length - 1].rate
      );
    }

    // AdditionalRate → last band
    return bands[bands.length - 1].rate;
  }

  /**
   * Contractual pay — gross reduced by any salary
   * sacrifice. Salary sacrifice lowers the earnings on
   * which both NI and student loan are assessed; every
   * other pension basis leaves the full gross intact.
   */
  private get _contractualEarnings(): number {
    return this._pensionBasis ===
      PensionBasis.SalarySacrifice
      ? this._grossAnnual - this.pensionDeduction
      : this._grossAnnual;
  }

  /**
   * Total annual National Insurance contributions.
   * Salary sacrifice reduces contractual gross, so NI
   * is calculated on the lower amount.
   */
  get nationalInsurance(): number {
    const ni = this._config.nationalInsurance;
    const earnings = this._contractualEarnings;

    if (earnings <= ni.primaryThreshold) {
      return 0;
    }

    let total = 0;

    const mainRateEarnings = Math.min(
      earnings, ni.upperEarningsLimit,
    );
    const mainRateAmount =
      mainRateEarnings - ni.primaryThreshold;
    total += mainRateAmount * ni.mainRate;

    if (earnings > ni.upperEarningsLimit) {
      const upperRateAmount =
        earnings - ni.upperEarningsLimit;
      total += upperRateAmount * ni.upperRate;
    }

    return Math.round(total * 100) / 100;
  }

  /**
   * Basic-rate tax relief reclaimed by the pension
   * provider for relief-at-source (personal) pensions.
   */
  get pensionTaxRelief(): number {
    if (this._pensionBasis !== PensionBasis.Personal) {
      return 0;
    }
    return (
      Math.round(
        this.pensionDeduction * 0.25 * 100,
      ) / 100
    );
  }

  /**
   * Total annual student loan deductions across all
   * active plans.
   */
  get studentLoanDeduction(): number {
    let total = 0;
    const earnings = this._contractualEarnings;

    for (const plan of this._studentLoanPlans) {
      const config =
        this._config.studentLoanThresholds[plan];
      if (
        config !== null &&
        earnings > config.annualThreshold
      ) {
        total +=
          (earnings - config.annualThreshold) *
          config.rate;
      }
    }

    return Math.round(total * 100) / 100;
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
    return (totalDeductions / this._grossAnnual) * 100;
  }

  /** Marginal tax rate (rate on next £1 of income). */
  get marginalTaxRate(): number {
    const currentNet = this.net;
    const originalGross = this._grossAnnual;

    this._grossAnnual = originalGross + 1;
    const newNet = this.net;
    this._grossAnnual = originalGross;

    return (1 - (newNet - currentNet)) * 100;
  }

  // ─── Annual allowance ────────────────────────────

  /**
   * Member pension contributions added back for adjusted
   * income — net-pay schemes only. Relief-at-source
   * (personal) affects threshold income instead, and
   * salary sacrifice is treated as an employer
   * contribution; neither is a member add-back here.
   */
  private get _aaMemberContributions(): number {
    const isNetPay =
      this._pensionBasis === PensionBasis.Employer ||
      this._pensionBasis === PensionBasis.AutoEnrolment;
    return isNetPay ? this.pensionDeduction : 0;
  }

  private get _aaIncomeInputs(): AnnualAllowanceIncomeInputs {
    const dbInput =
      this._dbAnnualAccrual * DB_PENSION_INPUT_MULTIPLIER;
    const member = this._aaMemberContributions;

    const ras =
      this._pensionBasis === PensionBasis.Personal
        ? this.pensionDeduction
        : 0;
    const salarySacrifice =
      this._pensionBasis === PensionBasis.SalarySacrifice
        ? this.pensionDeduction
        : 0;

    // Employer element = explicit employer contribution
    // + salary sacrifice (an employer contribution) + the
    // DB employer element (DB input − member contribution).
    const employer =
      this._employerContribution +
      salarySacrifice +
      Math.max(0, dbInput - member);

    return {
      netIncome:
        this.taxableGross + this._otherTaxableIncome,
      memberContributions: member,
      employerContributions: employer,
      reliefAtSourceContributions: ras,
      newSalarySacrifice: salarySacrifice,
    };
  }

  /** Threshold income for the annual-allowance taper. */
  get thresholdIncome(): number {
    return calculateThresholdIncome(this._aaIncomeInputs);
  }

  /** Adjusted income for the annual-allowance taper. */
  get adjustedIncome(): number {
    return calculateAdjustedIncome(this._aaIncomeInputs);
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
    const dbInput =
      this._dbAnnualAccrual * DB_PENSION_INPUT_MULTIPLIER;
    if (dbInput > 0) {
      return dbInput;
    }
    const member =
      this._pensionBasis === PensionBasis.None
        ? 0
        : this.pensionDeduction;
    return member + this._employerContribution;
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
    switch (this._period) {
      case Period.Weekly:
        return 52;
      case Period.Monthly:
        return 12;
      case Period.Annual:
        return 1;
    }
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

  /** Income tax breakdown by band. */
  get taxBreakdown(): TaxBandBreakdown[] {
    const pa = this.personalAllowance;
    const taxable = Math.max(
      0, this.taxableGross - pa,
    );
    const breakdown: TaxBandBreakdown[] = [];

    const paUsed = Math.min(pa, this.taxableGross);
    breakdown.push({
      name: 'Personal Allowance',
      rate: 0,
      taxableAmount: paUsed,
      taxPaid: 0,
    });

    let remaining = taxable;

    for (const band of this._config.incomeTaxBands) {
      const bandWidth = band.max - band.min;
      const amountInBand = Math.min(
        remaining, bandWidth,
      );

      breakdown.push({
        name: band.name,
        rate: band.rate,
        taxableAmount: amountInBand,
        taxPaid:
          Math.round(
            amountInBand * band.rate * 100,
          ) / 100,
      });

      remaining -= amountInBand;
      if (remaining <= 0) break;
    }

    return breakdown;
  }

  /** National Insurance breakdown. */
  get niBreakdown(): NIBreakdown {
    const ni = this._config.nationalInsurance;
    const earnings = this._contractualEarnings;

    const belowThreshold = Math.min(
      earnings, ni.primaryThreshold,
    );

    let mainRateAmount = 0;
    let mainRateTax = 0;
    let upperRateAmount = 0;
    let upperRateTax = 0;

    if (earnings > ni.primaryThreshold) {
      mainRateAmount =
        Math.min(earnings, ni.upperEarningsLimit) -
        ni.primaryThreshold;
      mainRateTax =
        Math.round(
          mainRateAmount * ni.mainRate * 100,
        ) / 100;
    }

    if (earnings > ni.upperEarningsLimit) {
      upperRateAmount =
        earnings - ni.upperEarningsLimit;
      upperRateTax =
        Math.round(
          upperRateAmount * ni.upperRate * 100,
        ) / 100;
    }

    return {
      belowThreshold,
      mainRateAmount,
      mainRateTax,
      upperRateAmount,
      upperRateTax,
      total: mainRateTax + upperRateTax,
    };
  }

  /** Student loan breakdown by plan. */
  get studentLoanBreakdown(): StudentLoanBreakdown[] {
    const breakdown: StudentLoanBreakdown[] = [];
    const earnings = this._contractualEarnings;

    for (const plan of this._studentLoanPlans) {
      const config =
        this._config.studentLoanThresholds[plan];
      if (config === null) continue;

      const amount = Math.max(
        0,
        earnings - config.annualThreshold,
      );
      const deduction =
        amount > 0
          ? Math.round(amount * config.rate * 100) /
            100
          : 0;

      breakdown.push({
        plan,
        threshold: config.annualThreshold,
        rate: config.rate,
        amount,
        deduction,
      });
    }

    return breakdown;
  }

  /** List of calculation assumptions. */
  get assumptions(): string[] {
    const pensionAssumptions: Record<
      PensionBasis,
      string
    > = {
      [PensionBasis.None]:
        'No pension contributions',
      [PensionBasis.AutoEnrolment]:
        'Auto-enrolment pension ' +
        '(contributions on qualifying earnings only)',
      [PensionBasis.Employer]:
        'Employer pension / NET pay arrangement ' +
        '(pension reduces tax but not NI)',
      [PensionBasis.SalarySacrifice]:
        'Salary sacrifice ' +
        '(pension reduces both tax and NI)',
      [PensionBasis.Personal]:
        'Personal pension / relief at source ' +
        '(provider reclaims basic-rate relief)',
    };

    const STUDENT_LOAN_LABELS: Record<
      StudentLoanPlan,
      string
    > = {
      [StudentLoanPlan.Plan1]: 'Plan 1',
      [StudentLoanPlan.Plan2]: 'Plan 2',
      [StudentLoanPlan.Plan4]: 'Plan 4',
      [StudentLoanPlan.Plan5]: 'Plan 5',
      [StudentLoanPlan.Postgraduate]: 'Postgraduate',
    };

    const studentLoanText =
      this._studentLoanPlans.size === 0
        ? 'No student loan deductions'
        : 'Student loan repayment: ' +
          Array.from(this._studentLoanPlans)
            .map(p => STUDENT_LOAN_LABELS[p])
            .join(', ');

    return [
      this._region === TAX_REGIONS.scotland
        ? 'Scottish income tax rates'
        : 'England, Wales, or Northern Ireland ' +
          'tax rates',
      'Single PAYE employment',
      studentLoanText,
      pensionAssumptions[this._pensionBasis],
      this._taxCode
        ? `Tax code: ${this._taxCode.code}`
        : 'Standard tax code (1257L) ' +
          '– no special circumstances',
      'No additional taxable benefits',
    ];
  }

  /** Current tax year. */
  get taxYear(): string {
    return this._config.year;
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
