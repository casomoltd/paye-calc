/**
 * The minimum pension age: the earliest a member of a registered pension
 * scheme may draw their benefits, other than on ill health.
 *
 * A UK-wide rule, the same for every scheme outside the uniformed services,
 * which is why it sits here rather than in any scheme's library. Two parts of
 * the Finance Act 2004 set it, each cited beside its data below:
 *
 * - the normal minimum pension age, s.279(1)(a), which rises to 57 on 6 April
 *   2028;
 * - the protected pension age that para 23ZB of Sch 36 keeps through that
 *   rise for a member whose scheme already gave them a right to draw before
 *   57.
 *
 * The scheme's rules decide whether a member had that right, and from what
 * age, so the caller states both and this module applies the Act. The
 * uniformed services' own ages, and the older protected ages of Sch 36 paras
 * 22 and 23, are not modelled.
 */

/** A day as the statute writes it: April is month 4. */
interface StatuteDay {
  readonly day: number;
  readonly month: number;
  readonly year: number;
}

/** A rise in the normal minimum pension age, and the day it applies from. */
export interface MinimumPensionAgeRise {
  readonly from: Date;
  readonly age: number;
}

/** s.279(1)(a) as the statute dates it: the age that applies from the
 *  beginning, and each rise, latest first. A rise list that cannot be
 *  empty is what makes the latest rise exist by type. */
interface Schedule {
  readonly base: number;
  readonly rises: readonly [StatuteRise, ...StatuteRise[]];
}

/** One rise of s.279(1)(a), dated as the statute dates it. */
interface StatuteRise {
  readonly from: StatuteDay;
  readonly age: number;
}

/** A member's right, under their scheme's rules, to draw a benefit from an
 *  age: what Sch 36 para 23ZB asks of the scheme. Both are the scheme's
 *  facts, which the caller states. */
export interface SchemeRight {
  /** The age from which the scheme's rules gave the member a right to a
   *  benefit: under its rules on 11 February 2021, para 23ZB(3)(b). */
  readonly rightFromAge: number;
  /** Whether the member held that right immediately before the cut-off,
   *  `protectedPensionAgeCutoff()`, para 23ZB(3)(a). */
  readonly heldBeforeCutoff: boolean;
}

/** Sch 36 para 23ZB as the Act dates and ages it. */
interface Protection {
  /** A right held immediately before this day is protected. */
  readonly cutoff: StatuteDay;
  /** Only a right from an age below this one is protected. */
  readonly rightBelow: number;
  /** The protected age is the higher of this and the right's age. */
  readonly floor: number;
}

/** April, as the statute and the calendar number it. */
const APRIL = 4;

/** November, as the statute and the calendar number it. */
const NOVEMBER = 11;

/** Finance Act 2004 s.279(1)(a), its words substituted by Finance Act 2022
 *  s.10(2): https://www.legislation.gov.uk/ukpga/2004/12/section/279, read 5
 *  Nov 2026, with no outstanding effects: "(i) before 6 April 2010, 50, (ii) on
 *  and after that date but before 6 April 2028, 55, and (iii) on and after
 *  6 April 2028, 57". */
const STATUTE: Schedule = {
  base: 50,
  rises: [
    {from: {day: 6, month: APRIL, year: 2028}, age: 57},
    {from: {day: 6, month: APRIL, year: 2010}, age: 55},
  ],
};

/** Each rise with its day as a local `Date`, compared against `on`. */
const RISES: readonly MinimumPensionAgeRise[] = STATUTE.rises.map(
  ({from, age}) => ({from: dateOf(from), age}),
);

/** Finance Act 2004 Sch 36 para 23ZB, inserted by Finance Act 2022 s.10(5):
 *  https://www.legislation.gov.uk/ukpga/2004/12/schedule/36/paragraph/23ZB,
 *  read 5 Nov 2026. (3)(a): "immediately before 4 November 2021 the member
 *  had an actual or prospective right ... to any benefit from an age of less
 *  than 57", under scheme rules as they stood on 11 February 2021 ((3)(b));
 *  (7): the protected pension age is "the higher of 55" and the age of that
 *  right. (8) holds it at 55 before 6 April 2028, which taking the lower of
 *  it and s.279's age, 55 until then, does too. */
const PROTECTION: Protection = {
  cutoff: {day: 4, month: NOVEMBER, year: 2021},
  rightBelow: 57,
  floor: 55,
};

/** The law's latest rise: the age and the day it applies from. A fresh date
 *  each call, since a caller setting one would move the rule for everyone. */
export function minimumPensionAgeRise(): MinimumPensionAgeRise {
  const [{from, age}] = STATUTE.rises;
  return {from: dateOf(from), age};
}

/** The normal minimum pension age on the day benefits are drawn. */
export function minimumPensionAge(on: Date): number {
  if (Number.isNaN(on.getTime())) {
    throw new RangeError('not a date to read the minimum pension age on');
  }
  return RISES.find(({from}) => on >= from)?.age ?? STATUTE.base;
}

/** The day para 23ZB(3)(a) asks for a right held immediately before: a
 *  fresh date each call, as `minimumPensionAgeRise` hands out. */
export function protectedPensionAgeCutoff(): Date {
  return dateOf(PROTECTION.cutoff);
}

/** The age para 23ZB(3)(a) asks a right to be below: only a right to draw
 *  from an age under this one is protected. A fact of the protection, not of
 *  s.279: that it equals the age s.279 rises to is the Act's choice. */
export const PROTECTED_RIGHT_BELOW_AGE: number = PROTECTION.rightBelow;

/** The minimum pension age on the day benefits are drawn, for a member
 *  with `right`: the protected age where para 23ZB keeps one and it is
 *  lower than the law's, else the law's. */
export function minimumPensionAgeFor(right: SchemeRight, on: Date): number {
  const law = minimumPensionAge(on);
  const isProtected = right.heldBeforeCutoff
    && isProtectedRight(right.rightFromAge);
  return isProtected ? Math.min(law, protectedPensionAge(right)) : law;
}

/** The protected pension age para 23ZB(7) gives a protected right: the
 *  higher of 55 and the right's age. Private because it holds only from 6
 *  April 2028: before then (8) caps it at 55, which `minimumPensionAgeFor`
 *  applies by taking the lower of it and s.279's age on the drawing date. */
function protectedPensionAge({rightFromAge}: SchemeRight): number {
  return Math.max(PROTECTION.floor, rightFromAge);
}

/** Whether para 23ZB(3)(a) protects a right from this age. */
function isProtectedRight(rightFromAge: number): boolean {
  if (!Number.isFinite(rightFromAge)) {
    throw new RangeError('not an age a scheme gives a right from');
  }
  return rightFromAge < PROTECTION.rightBelow;
}

/** A statute day as a local midnight `Date`, whose months count from
 *  nought. */
function dateOf({day, month, year}: StatuteDay): Date {
  return new Date(year, month - 1, day);
}
