import type {
  TaxYearConfigUk,
  TaxYearConfigScotland,
} from '../TaxYearConfig.js';
import {
  TAX_YEARS,
  StudentLoanPlan,
} from '../types.js';

const YEAR = TAX_YEARS.Y2023_24;
const DISPLAY_NAME = '2023-24';
const PERSONAL_ALLOWANCE = 12570;
const PERSONAL_ALLOWANCE_TAPER_START = 100000;
const STANDARD_WEEKLY_HOURS = 37.5;

const NATIONAL_INSURANCE = {
  primaryThreshold: 12570,
  upperEarningsLimit: 50270,
  mainRate: 0.12,
  upperRate: 0.02,
} as const;

const QUALIFYING_EARNINGS = {
  lowerThreshold: 6240,
  upperThreshold: 50270,
} as const;

const STUDENT_LOANS = {
  [StudentLoanPlan.Plan1]: {
    annualThreshold: 22015, rate: 0.09,
  },
  [StudentLoanPlan.Plan2]: {
    annualThreshold: 27295, rate: 0.09,
  },
  [StudentLoanPlan.Plan4]: {
    annualThreshold: 27660, rate: 0.09,
  },
  [StudentLoanPlan.Plan5]: null,
  [StudentLoanPlan.Postgraduate]: {
    annualThreshold: 21000, rate: 0.06,
  },
} as const;

/** rUK tax year 2023-24. */
export const TaxYear2023: TaxYearConfigUk = {
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
  standardWeeklyHours: STANDARD_WEEKLY_HOURS,
};

/** Scottish tax year 2023-24 (5 bands). */
export const TaxYear2023Scotland: TaxYearConfigScotland =
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
        max: 2162,
      },
      {
        name: 'Basic Rate',
        rate: 0.2,
        min: 2162,
        max: 13118,
      },
      {
        name: 'Intermediate Rate',
        rate: 0.21,
        min: 13118,
        max: 31092,
      },
      {
        name: 'Higher Rate',
        rate: 0.42,
        min: 31092,
        max: 112570,
      },
      {
        name: 'Top Rate',
        rate: 0.47,
        min: 112570,
        max: Infinity,
      },
    ],
    nationalInsurance: NATIONAL_INSURANCE,
    qualifyingEarnings: QUALIFYING_EARNINGS,
    studentLoanThresholds: STUDENT_LOANS,
    standardWeeklyHours: STANDARD_WEEKLY_HOURS,
    };
