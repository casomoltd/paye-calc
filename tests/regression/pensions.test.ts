// Pensions inside the take-home calculation: the NHS scheme's
// contribution on the employer basis, and the tapered annual allowance
// for high earners.
//
// The NHS pension rows are snapshots of this model's own figures; they
// catch an unintended change. The annual-allowance rows follow the
// taper rules in HMRC's Pensions Tax Manual (PTM057100), and the case
// "Adjusted income of £300,000 takes £20,000 off" is confirmed against
// HMRC's own PAAC tool (`docs/verification.md`).

import {describe, it, expect} from 'vitest';
import {
  calculateAdjustedIncome,
  calculateTaperedAnnualAllowance,
  calculateThresholdIncome,
} from '../../src/annualAllowance';
import {getTaxYearConfig} from '../../src/taxYears';
import {taxYear} from '../../src/types';
import {runScenario} from '../scenario';
import {NHS_PENSION} from '../fixtures/scenarios/nhs-pension';
import {TAPER} from '../fixtures/annual-allowance-taper';
import type {TaperCase} from '../fixtures/annual-allowance-taper';

describe('regression: NHS pension (employer)', () => {
  it.each(NHS_PENSION)('$case', runScenario);
});

/** The two incomes the taper reads, built from components if given so. */
function incomesOf(given: TaperCase['given']) {
  if ('adjusted' in given) return given;
  return {
    threshold: calculateThresholdIncome(given),
    adjusted: calculateAdjustedIncome(given),
  };
}

describe('regression: annual allowance taper', () => {
  it.each(TAPER)('$case', (tc: TaperCase) => {
    const {adjusted, threshold} = incomesOf(tc.given);
    const allowance = calculateTaperedAnnualAllowance(
      adjusted, threshold, getTaxYearConfig(taxYear(tc.year), 'rUK'),
    );
    const got = 'adjusted' in tc.given
      ? {allowance} : {threshold, adjusted, allowance};
    expect(got).toEqual(tc.expect);
  });
});
