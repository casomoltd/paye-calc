/**
 * The normal minimum pension age: the earliest a member of a registered
 * pension scheme may draw their benefits, other than on ill health or under
 * a protected pension age.
 *
 * A UK-wide rule, the same for every scheme outside the uniformed services,
 * which is why it sits here rather than in any scheme's library. Finance Act
 * 2004 s.279(1), as substituted by Finance Act 2022 s.10(2):
 * https://www.legislation.gov.uk/ukpga/2004/12/section/279, read 23 Sep
 * 2026, with no outstanding effects: "(i) before 6 April 2010, 50, (ii) on
 * and after that date but before 6 April 2028, 55, and (iii) on and after
 * 6 April 2028, 57". The uniformed services' own ages, and any member's
 * protected pension age, are not modelled.
 */

/** Each age and the day it applies from, latest first; the last applies
 *  from the beginning, so every date finds one. */
const STEPS: readonly {readonly from: Date | null; readonly age: number}[] = [
  {from: new Date(2028, 3, 6), age: 57},
  {from: new Date(2010, 3, 6), age: 55},
  {from: null, age: 50},
];

/** The normal minimum pension age on the day benefits are drawn. */
export function minimumPensionAge(on: Date): number {
  if (Number.isNaN(on.getTime())) {
    throw new RangeError('not a date to read the minimum pension age on');
  }
  const step = STEPS.find(({from}) => from === null || on >= from);
  if (step === undefined) throw new Error('the steps cover every date');
  return step.age;
}
