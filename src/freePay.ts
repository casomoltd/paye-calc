/**
 * Free pay: the pay PAYE leaves untaxed, on which income tax is worked
 * in place of the allowance. HMRC's take-home estimator works the same
 * way (`tests/fixtures/hmrc/estimator.ts`), and `docs/how-it-works.md`
 * states the rule.
 */

import {allowanceLeft} from './TaxYearConfig.js';
import type {TaxYearConfig} from './TaxYearConfig.js';
import type {TaxCode} from './TaxCode.js';

/** The pounds PAYE frees above an allowance (10N + 9). */
const FREE_PAY_TOP_UP = 9;

/**
 * Free pay under a code, from the allowance the code states. An L code N
 * frees 10N + 9 (£12,579 for 1257L); a K code N adds exactly 10N to pay;
 * 0T frees nothing. HMRC's estimator agrees on 1256L and K100.
 */
export function freePayForCode(codeAllowance: number): number {
  return codeAllowance > 0 ? codeAllowance + FREE_PAY_TOP_UP : codeAllowance;
}

/**
 * Free pay with no code given: the allowance the taper leaves, before it
 * is held at nil, plus £9, never below nothing. So £12,570 frees
 * £12,579, an allowance tapered to exactly nil still frees £9, one
 * tapered a pound past it frees £8, and further past it nothing. Every
 * estimator run fits this and none fits rounding to a code first; no
 * published table states it.
 */
function freePayWithoutCode(
  taxableGross: number,
  config: TaxYearConfig,
): number {
  return Math.max(0, allowanceLeft(taxableGross, config) + FREE_PAY_TOP_UP);
}

/**
 * The pay PAYE leaves untaxed, on which tax is worked: the code's free
 * pay, or with no code the tapered allowance plus £9.
 */
export function freePay(
  taxableGross: number,
  config: TaxYearConfig,
  code: TaxCode | null,
): number {
  return code ? code.freePay : freePayWithoutCode(taxableGross, config);
}

/** Free pay for an allowance before any taper: what £12,570 frees. */
export function freePayOfAllowance(allowance: number): number {
  return allowance + FREE_PAY_TOP_UP;
}
