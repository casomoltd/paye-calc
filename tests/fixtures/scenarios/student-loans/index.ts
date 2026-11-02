import type {Scenario} from '../../../scenario';
import {SINGLE_PLAN} from './single-plan';
import {TWO_PLANS} from './two-plans';

/** The tables by how many plans repay at once. */
export const STUDENT_LOANS: Readonly<Record<string, readonly Scenario[]>> = {
  'one plan': SINGLE_PLAN,
  'two plans': TWO_PLANS,
};
