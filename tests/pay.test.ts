// The pure take-home core: the net-to-gross search and the allowance's
// own checks on its inputs.

import {describe, expect, it} from 'vitest';
import {grossForNet, payAt} from '../src/pay';
import type {PayInputs} from '../src/pay';
import {annualAllowance} from '../src/annualAllowance';
import {getTaxYearConfig} from '../src/taxYears';
import {
  NO_PENSION, PensionBasis, PensionPercent, StudentLoanPlan, taxYear,
} from '../src/types';

const config = getTaxYearConfig(taxYear('2025-26'), 'rUK');
const INPUTS: readonly PayInputs[] = [
  {config, pension: NO_PENSION, studentLoans: new Set(), taxCode: null},
  {
    config,
    pension: {basis: PensionBasis.Employer, contribution: PensionPercent(5)},
    studentLoans: new Set([StudentLoanPlan.Plan2]),
    taxCode: null,
  },
];

// Targets either side of each band and through the allowance taper,
// where net jumps by up to 40p as the taper takes whole pounds.
const TARGETS = [
  0.01, 9_000, 12_570, 30_000, 45_000, 60_000, 65_000, 70_000, 75_000,
  80_000, 100_000,
];

describe('grossForNet', () => {
  it.each(INPUTS.flatMap((inputs, i) => TARGETS.map((t) => [i, t] as const)))(
    'inputs %i: leaves at least £%d, and not a jump more', (i, target) => {
      const inputs = INPUTS[i];
      const net = payAt(grossForNet(target, inputs), inputs).net;
      // Never short of the target: a gross a penny short does not
      // leave it.
      expect(net).toBeGreaterThanOrEqual(target);
      // Above it by no more than the taper's largest jump.
      expect(net - target).toBeLessThan(0.41);
    },
  );
});

describe('annualAllowance', () => {
  const pay = payAt(80_000, INPUTS[0]);

  it('takes an extra not given as nil', () => {
    expect(annualAllowance(pay, {}, config).pensionInput).toBe(0);
  });

  it('refuses a negative extra rather than read it as nil', () => {
    expect(() => annualAllowance(pay, {employerContribution: -1}, config))
      .toThrow(RangeError);
  });
});
