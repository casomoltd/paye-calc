/**
 * HMRC tax code parser.
 *
 * Tax codes encode the Personal Allowance and the income tax
 * strategy HMRC expects an employer to apply. This model parses
 * the code string and exposes those values for calculation.
 *
 * @see https://www.gov.uk/tax-codes/what-your-tax-code-means
 */

/** How income tax should be calculated for this code. */
export enum TaxStrategy {
  /** Standard progressive bands (most codes). */
  Progressive = 'progressive',
  /** BR — all income taxed at basic rate (20%). */
  BasicRate = 'basic_rate',
  /** D0 — all income taxed at higher rate (40%). */
  HigherRate = 'higher_rate',
  /** D1 — all income taxed at additional rate (45%). */
  AdditionalRate = 'additional_rate',
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
 * Special codes that map directly to a fixed strategy
 * with zero personal allowance.
 */
const SPECIAL_CODES: Record<string, TaxStrategy> = {
  BR: TaxStrategy.BasicRate,
  D0: TaxStrategy.HigherRate,
  D1: TaxStrategy.AdditionalRate,
  NT: TaxStrategy.NoTax,
  '0T': TaxStrategy.Progressive,
};

/** Region prefix characters. */
const PREFIXES = new Set(['S', 'C']);

/** Emergency suffix pattern (W1, M1, X at end). */
const EMERGENCY_SUFFIX = / ?(?:W1|M1|X)$/;

/** K code pattern — negative allowance. */
const K_CODE = /^K(\d+)$/;

/** Standard numeric code with optional suffix. */
const NUMERIC_CODE = /^(\d+)[LMNT]?$/;

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

  /** How income tax should be calculated. */
  readonly strategy: TaxStrategy;

  /** Region prefix (S = Scotland, C = Wales). */
  readonly prefix: TaxCodePrefix;

  private constructor(
    code: string,
    personalAllowance: number,
    strategy: TaxStrategy,
    prefix: TaxCodePrefix,
  ) {
    this.code = code;
    this.personalAllowance = personalAllowance;
    this.strategy = strategy;
    this.prefix = prefix;
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

    // Extract region prefix (S = Scotland, C = Wales)
    let prefix: TaxCodePrefix = null;
    let body = raw;
    const first = body[0];
    if (PREFIXES.has(first)) {
      prefix = first as TaxCodePrefix;
      body = body.slice(1);
    }

    // Strip emergency suffixes (W1, M1, X)
    body = body.replace(EMERGENCY_SUFFIX, '');

    // Special flat-rate / no-allowance codes
    const specialStrategy = SPECIAL_CODES[body];
    if (specialStrategy !== undefined) {
      return new TaxCode(
        raw, 0, specialStrategy, prefix,
      );
    }

    // K codes — negative allowance
    const kMatch = body.match(K_CODE);
    if (kMatch) {
      const pa = -parseInt(kMatch[1], 10) * 10;
      return new TaxCode(
        raw, pa, TaxStrategy.Progressive, prefix,
      );
    }

    // Standard numeric codes: digits + optional suffix
    const numMatch = body.match(NUMERIC_CODE);
    if (numMatch) {
      const pa = parseInt(numMatch[1], 10) * 10;
      return new TaxCode(
        raw, pa, TaxStrategy.Progressive, prefix,
      );
    }

    // Unrecognised format
    return null;
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
