import type {
  TaxYearConfigUk,
  TaxYearConfigScotland,
} from '../TaxYearConfig.js';
import {
  TAX_YEARS,
  StudentLoanPlan,
} from '../types.js';

const YEAR = TAX_YEARS.Y2026_27;
const DISPLAY_NAME = '2026-27';
const PERSONAL_ALLOWANCE = 12570;
const PERSONAL_ALLOWANCE_TAPER_START = 100000;

const NATIONAL_INSURANCE = {
  primaryThreshold: 12570,
  upperEarningsLimit: 50270,
  mainRate: 0.08,
  upperRate: 0.02,
} as const;

const QUALIFYING_EARNINGS = {
  lowerThreshold: 6240,
  upperThreshold: 50270,
} as const;

const STUDENT_LOANS = {
  [StudentLoanPlan.Plan1]: {
    annualThreshold: 26900, rate: 0.09,
  },
  [StudentLoanPlan.Plan2]: {
    annualThreshold: 29385, rate: 0.09,
  },
  [StudentLoanPlan.Plan4]: {
    annualThreshold: 33795, rate: 0.09,
  },
  [StudentLoanPlan.Plan5]: {
    annualThreshold: 25000, rate: 0.09,
  },
  [StudentLoanPlan.Postgraduate]: {
    annualThreshold: 21000, rate: 0.06,
  },
} as const;

// Pension annual allowance — gov.uk, HMRC PTM057100.
// £60k standard, £10k MPAA, £260k adjusted-income limit,
// £200k threshold-income gate, £10k floor — unchanged
// across 2023-24 to 2026-27.
const ANNUAL_ALLOWANCE = {
  standard: 60000,
  moneyPurchase: 10000,
  adjustedIncomeLimit: 260000,
  thresholdIncomeLimit: 200000,
  taperFloor: 10000,
} as const;

/** rUK tax year 2026-27. */
export const TaxYear2026: TaxYearConfigUk = {
  region: 'rUK',
  year: YEAR,
  displayName: DISPLAY_NAME,
  personalAllowance: PERSONAL_ALLOWANCE,
  personalAllowanceTaperStart:
    PERSONAL_ALLOWANCE_TAPER_START,
  incomeTaxBands: [
    {
      name: 'Basic Rate',
      rate: 0.2,
      min: 0,
      max: 37700,
    },
    {
      name: 'Higher Rate',
      rate: 0.4,
      min: 37700,
      max: 112570,
    },
    {
      name: 'Additional Rate',
      rate: 0.45,
      min: 112570,
      max: Infinity,
    },
  ],
  nationalInsurance: NATIONAL_INSURANCE,
  qualifyingEarnings: QUALIFYING_EARNINGS,
  studentLoanThresholds: STUDENT_LOANS,
  standardWeeklyHours: 37.5,
  annualAllowance: ANNUAL_ALLOWANCE,
};

/** Scottish tax year 2026-27 (6 bands). */
export const TaxYear2026Scotland: TaxYearConfigScotland =
  {
    region: 'scotland',
    year: YEAR,
    displayName: DISPLAY_NAME,
    personalAllowance: PERSONAL_ALLOWANCE,
    personalAllowanceTaperStart:
      PERSONAL_ALLOWANCE_TAPER_START,
    incomeTaxBands: [
      {
        name: 'Starter Rate',
        rate: 0.19,
        min: 0,
        max: 3967,
      },
      {
        name: 'Basic Rate',
        rate: 0.2,
        min: 3967,
        max: 16956,
      },
      {
        name: 'Intermediate Rate',
        rate: 0.21,
        min: 16956,
        max: 31092,
      },
      {
        name: 'Higher Rate',
        rate: 0.42,
        min: 31092,
        max: 62430,
      },
      {
        name: 'Advanced Rate',
        rate: 0.45,
        min: 62430,
        max: 112570,
      },
      {
        name: 'Top Rate',
        rate: 0.48,
        min: 112570,
        max: Infinity,
      },
    ],
    nationalInsurance: NATIONAL_INSURANCE,
    qualifyingEarnings: QUALIFYING_EARNINGS,
    // 36 hours — see the schedule on `standardWeeklyHours`.
    standardWeeklyHours: 36,
    studentLoanThresholds: STUDENT_LOANS,
    annualAllowance: ANNUAL_ALLOWANCE,
    };
