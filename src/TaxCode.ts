/**
 * HMRC tax code parser.
 *
 * Tax codes encode the Personal Allowance and the income tax
 * strategy HMRC expects an employer to apply. This model parses
 * the code string and exposes those values for calculation.
 *
 * @see https://www.gov.uk/tax-codes/what-your-tax-code-means
 */

import {NATION_KEYS} from './types.js';
import {freePayForCode} from './freePay.js';
import type {Nation} from './types.js';

/** How income tax should be calculated for this code. */
export enum TaxStrategy {
  /** Standard progressive bands (most codes). */
  Progressive = 'progressive',
  /** BR — all income taxed at basic rate (20%). */
  BasicRate = 'basic_rate',
  /**
   * D codes — all income at one rate above the basic rate; which
   * one is the code's `rule.band`.
   */
  FlatRate = 'flat_rate',
  /** NT — no tax charged on any income. */
  NoTax = 'no_tax',
}

/** Region prefix constants. */
export const TAX_CODE_PREFIX = {
  Scotland: 'S',
  Wales: 'C',
} as const;

/** Region prefix extracted from the code, if present. */
type TaxCodePrefix =
  | typeof TAX_CODE_PREFIX.Scotland
  | typeof TAX_CODE_PREFIX.Wales
  | null;

/**
 * How a code's tax is worked out. A D code carries the band it taxes
 * at, so a flat rate with no band, or a band on a progressive code,
 * cannot be built.
 */
export type TaxRule =
  | {readonly strategy: Exclude<TaxStrategy, TaxStrategy.FlatRate>}
  | {readonly strategy: TaxStrategy.FlatRate; readonly band: number};

/**
 * Special codes that map directly to a fixed strategy with zero
 * personal allowance. Partial because most strings are not one, which
 * the lookup has to be able to say.
 */
const SPECIAL_CODES: Partial<Record<
  string, Exclude<TaxStrategy, TaxStrategy.FlatRate>
>> = {
  BR: TaxStrategy.BasicRate,
  NT: TaxStrategy.NoTax,
  '0T': TaxStrategy.Progressive,
};

/** Region prefix characters. */
const PREFIXES: ReadonlySet<string> = new Set(Object.values(TAX_CODE_PREFIX));

/** Emergency suffix pattern (W1, M1, X at end). */
const EMERGENCY_SUFFIX = / ?(?:W1|M1|X)$/;

/** D code pattern — one flat rate above the basic rate. */
const D_CODE = /^D(\d)$/;

/**
 * The highest D code each prefix has (HMRC PAYE Manual PAYE11025):
 * rUK and Wales D0 to D1 (higher, additional), Scotland SD0 to SD3
 * (intermediate, higher, advanced, top). This is the most recent year's
 * ceiling; a year with fewer rates (Scotland had no advanced rate in
 * 2023-24) refuses the extra code when its tax is worked out.
 */
const LAST_D_CODE = {
  [TAX_CODE_PREFIX.Scotland]: 3,
  [TAX_CODE_PREFIX.Wales]: 1,
  none: 1,
} as const;

/** A code's number is its allowance in tens of pounds: 1257L is £12,570. */
const POUNDS_PER_CODE_UNIT = 10;

/** K code pattern — negative allowance. */
const K_CODE = /^K(\d+)$/;

/** Standard numeric code with optional suffix. */
const NUMERIC_CODE = /^(\d+)[LMNT]?$/;

/** What a parsed code holds. */
interface TaxCodeFields {
  code: string;
  personalAllowance: number;
  rule: TaxRule;
  prefix: TaxCodePrefix;
  isKCode: boolean;
}

/** The allowance a code's number stands for. */
function allowanceOf(digits: string): number {
  return Number(digits) * POUNDS_PER_CODE_UNIT;
}

/** Split a normalised code into its region prefix and the rest. */
function splitPrefix(raw: string): [TaxCodePrefix, string] {
  const first = raw[0];
  return PREFIXES.has(first)
    ? [first as TaxCodePrefix, raw.slice(1)]
    : [null, raw];
}

/**
 * Parsed HMRC tax code.
 *
 * Use `TaxCode.parse()` to create instances. Returns null for
 * codes that don't match any recognised HMRC format.
 */
export class TaxCode {
  /** Normalised code, e.g. "1257L". */
  readonly code: string;

  /**
   * Derived Personal Allowance in £.
   * Negative for K codes (increases taxable income).
   */
  readonly personalAllowance: number;

  /**
   * How income tax should be calculated. For a D code, `band` is its
   * number: Dn taxes all income at the nth rate above the basic rate in
   * the taxpayer's nation, so SD0 is Scotland's 21% intermediate rate
   * where D0 is the 40% higher rate.
   */
  readonly rule: TaxRule;

  /** Region prefix (S = Scotland, C = Wales). */
  readonly prefix: TaxCodePrefix;

  /**
   * Whether this is a K code, whose number is pay added to the taxed pay
   * rather than an allowance taken off it. Read from the K the code is
   * written with, so a caller need not infer it from the allowance's sign.
   */
  readonly isKCode: boolean;

  private constructor(fields: TaxCodeFields) {
    this.code = fields.code;
    this.personalAllowance = fields.personalAllowance;
    this.rule = fields.rule;
    this.prefix = fields.prefix;
    this.isKCode = fields.isKCode;
  }

  /** The pay PAYE leaves untaxed under this code (see `freePay.ts`). */
  get freePay(): number {
    return freePayForCode(this.personalAllowance);
  }

  /** The rule's strategy, for a caller that only needs to branch on it. */
  get strategy(): TaxStrategy {
    return this.rule.strategy;
  }

  /**
   * The UK nation this code's prefix declares: Scotland for
   * an `S` prefix, Wales for a `C` prefix. Null when the
   * code carries no prefix — England and Northern Ireland
   * share rUK with no prefix, so the code names no single
   * nation. Translating the prefix is the code's own job;
   * callers compare this against a chosen region rather than
   * re-deriving the mapping from the raw letter.
   */
  get nation(): Nation | null {
    switch (this.prefix) {
      case TAX_CODE_PREFIX.Scotland:
        return NATION_KEYS.scotland;
      case TAX_CODE_PREFIX.Wales:
        return NATION_KEYS.wales;
      case null:
        return null;
    }
  }

  /**
   * Parse an HMRC tax code string.
   * @param input - Raw tax code (case-insensitive).
   * @returns A TaxCode instance, or null if unrecognised.
   */
  static parse(input: string): TaxCode | null {
    if (!input || typeof input !== 'string') {
      return null;
    }

    const raw = input.trim().toUpperCase();
    if (raw.length === 0) return null;

    const [prefix, coded] = splitPrefix(raw);
    // Strip emergency suffixes (W1, M1, X)
    const body = coded.replace(EMERGENCY_SUFFIX, '');
    const make = (personalAllowance: number, rule: TaxRule, isKCode = false) =>
      new TaxCode({code: raw, personalAllowance, rule, prefix, isKCode});
    const progressive = {strategy: TaxStrategy.Progressive} as const;

    // Special flat-rate / no-allowance codes
    const specialStrategy = SPECIAL_CODES[body];
    if (specialStrategy !== undefined) {
      return make(0, {strategy: specialStrategy});
    }

    // D codes — one flat rate above the basic rate, as far as the
    // prefix's nation has rates
    const dMatch = D_CODE.exec(body);
    if (dMatch) {
      const band = Number(dMatch[1]);
      return band > LAST_D_CODE[prefix ?? 'none']
        ? null
        : make(0, {strategy: TaxStrategy.FlatRate, band});
    }

    // K codes — negative allowance; standard codes — digits plus an
    // optional suffix
    const kMatch = K_CODE.exec(body);
    if (kMatch) return make(-allowanceOf(kMatch[1]), progressive, true);
    const numMatch = NUMERIC_CODE.exec(body);
    if (numMatch) return make(allowanceOf(numMatch[1]), progressive);

    // Unrecognised format
    return null;
  }

  /**
   * Parse a code the caller holds to be valid, failing loud if it is not:
   * the throwing twin of `parse`, for input that is not the user's.
   */
  static from(input: string): TaxCode {
    const parsed = TaxCode.parse(input);
    if (!parsed) throw new Error(`Not an HMRC tax code: ${input}`);
    return parsed;
  }

  /**
   * Check whether a string is a valid tax code.
   * @param input - Raw tax code string.
   * @returns True if the code can be parsed.
   */
  static isValid(input: string): boolean {
    return TaxCode.parse(input) !== null;
  }
}
