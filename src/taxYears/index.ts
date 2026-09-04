import {
  TaxYear, TaxRegion, TAX_YEARS, YearLabel, taxYear,
} from '../types.js';
import type {TaxYearConfig} from '../TaxYearConfig.js';
import {
  TaxYear2023,
  TaxYear2023Scotland,
} from './TaxYear2023.js';
import {
  TaxYear2024,
  TaxYear2024Scotland,
} from './TaxYear2024.js';
import {
  TaxYear2025,
  TaxYear2025Scotland,
} from './TaxYear2025.js';
import {
  TaxYear2026,
  TaxYear2026Scotland,
} from './TaxYear2026.js';

// Keyed by YearLabel, not TaxYear: a total Record over the plain
// literal union is what makes adding a year a compile error here
// rather than a lookup that silently returns undefined. The branded
// TaxYear exists for signatures; it cannot key a table.
const taxYearConfigs: Record<
  YearLabel,
  Record<TaxRegion, TaxYearConfig>
> = {
  [TAX_YEARS.Y2023_24]: {
    rUK: TaxYear2023,
    scotland: TaxYear2023Scotland,
  },
  [TAX_YEARS.Y2024_25]: {
    rUK: TaxYear2024,
    scotland: TaxYear2024Scotland,
  },
  [TAX_YEARS.Y2025_26]: {
    rUK: TaxYear2025,
    scotland: TaxYear2025Scotland,
  },
  [TAX_YEARS.Y2026_27]: {
    rUK: TaxYear2026,
    scotland: TaxYear2026Scotland,
  },
};

/**
 * Get configuration for a specific tax year and
 * region.
 */
export function getTaxYearConfig(
  year: TaxYear,
  region: TaxRegion = 'rUK',
): TaxYearConfig {
  // The one place the brand comes off, and deliberately explicit: a
  // TaxYear is a label plus a claim about WHICH year it is, and the
  // table only knows labels. Narrowing here keeps that transition
  // visible instead of letting every caller do it implicitly.
  const key: YearLabel = year;
  return taxYearConfigs[key][region];
}

/** List of available tax years for UI selection */
export const availableTaxYears: TaxYear[] = [
  TAX_YEARS.Y2023_24,
  TAX_YEARS.Y2024_25,
  TAX_YEARS.Y2025_26,
  TAX_YEARS.Y2026_27,
].map(taxYear);

/** Tax years that are disabled (not yet announced) */
export const disabledTaxYears: TaxYear[] = [];
