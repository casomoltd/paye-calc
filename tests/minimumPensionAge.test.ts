/**
 * The minimum pension age on a drawing date: the law's, and a member's
 * protected one.
 *
 * The ages and dates are retyped from Finance Act 2004 s.279(1) and Sch 36
 * para 23ZB, the sources the library cites, so a mistyped step in either
 * place fails.
 */
import {describe, expect, it} from 'vitest';
import {
  minimumPensionAge,
  minimumPensionAgeFor,
  minimumPensionAgeRise,
  protectedPensionAgeCutoff,
  PROTECTED_RIGHT_BELOW_AGE,
} from '../src/index.js';

describe('minimumPensionAge', () => {
  it('is 50 before 6 April 2010', () => {
    // s.279(1)(a)(i): "before 6 April 2010, 50"
    expect(minimumPensionAge(new Date(2010, 3, 5))).toBe(50);
  });

  it('is 55 from 6 April 2010 until 5 April 2028', () => {
    // s.279(1)(a)(ii): "on and after that date but before 6 April 2028, 55"
    expect(minimumPensionAge(new Date(2010, 3, 6))).toBe(55);
    expect(minimumPensionAge(new Date(2028, 3, 5))).toBe(55);
  });

  it('is 57 from 6 April 2028', () => {
    // s.279(1)(a)(iii): "on and after 6 April 2028, 57"
    expect(minimumPensionAge(new Date(2028, 3, 6))).toBe(57);
    expect(minimumPensionAge(new Date(2048, 2, 31))).toBe(57);
  });

  it('names the latest rise', () => {
    // s.279(1)(a)(iii): "on and after 6 April 2028, 57"
    expect(minimumPensionAgeRise()).toEqual({from: new Date(2028, 3, 6), age: 57});
  });

  it('hands out a date no caller can move the rule with', () => {
    minimumPensionAgeRise().from.setFullYear(2000);
    expect(minimumPensionAge(new Date(2028, 3, 5))).toBe(55);
  });

  it('refuses something that is not a date', () => {
    expect(() => minimumPensionAge(new Date('not a date'))).toThrow(RangeError);
  });
});

describe('the protection', () => {
  it('protects only a right from an age below 57', () => {
    // para 23ZB(3)(a): "from an age of less than 57"
    expect(PROTECTED_RIGHT_BELOW_AGE).toBe(57);
  });

  it('names its cut-off, and hands out a date no caller can move', () => {
    // para 23ZB(3)(a): "immediately before 4 November 2021"
    expect(protectedPensionAgeCutoff()).toEqual(new Date(2021, 10, 4));
    protectedPensionAgeCutoff().setFullYear(2000);
    expect(protectedPensionAgeCutoff()).toEqual(new Date(2021, 10, 4));
  });
});

describe('minimumPensionAgeFor', () => {
  const AFTER_RISE = new Date(2028, 3, 6);
  const BEFORE_RISE = new Date(2028, 3, 5);

  it('keeps a protected age through the rise', () => {
    // para 23ZB(7): "the higher of 55" and the age of the right
    const right = {rightFromAge: 55, heldBeforeCutoff: true};
    expect(minimumPensionAgeFor(right, AFTER_RISE)).toBe(55);
    expect(minimumPensionAgeFor({...right, rightFromAge: 50}, AFTER_RISE))
      .toBe(55);
    expect(minimumPensionAgeFor({...right, rightFromAge: 56}, AFTER_RISE))
      .toBe(56);
  });

  it('holds a protected age at 55 before the rise', () => {
    // para 23ZB(8): no protected age above 55 before 6 April 2028
    const right = {rightFromAge: 56, heldBeforeCutoff: true};
    expect(minimumPensionAgeFor(right, BEFORE_RISE)).toBe(55);
  });

  it('is the law\'s age for a right not held before the cut-off', () => {
    const right = {rightFromAge: 55, heldBeforeCutoff: false};
    expect(minimumPensionAgeFor(right, BEFORE_RISE)).toBe(55);
    expect(minimumPensionAgeFor(right, AFTER_RISE)).toBe(57);
  });

  it('is the law\'s age for a right from 57, which is not protected', () => {
    const right = {rightFromAge: 57, heldBeforeCutoff: true};
    expect(minimumPensionAgeFor(right, AFTER_RISE)).toBe(57);
  });

  it('never lifts the law\'s lower age before 6 April 2010', () => {
    const right = {rightFromAge: 55, heldBeforeCutoff: true};
    expect(minimumPensionAgeFor(right, new Date(2010, 3, 5))).toBe(50);
  });

  it('refuses an age that is not a number', () => {
    const right = {rightFromAge: Number.NaN, heldBeforeCutoff: true};
    expect(() => minimumPensionAgeFor(right, AFTER_RISE)).toThrow(RangeError);
  });
});
