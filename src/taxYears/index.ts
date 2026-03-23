import {TaxYear, TaxRegion, TAX_YEARS} from '../types';
import type {TaxYearConfig} from '../TaxYearConfig';
import {
  TaxYear2023,
  TaxYear2023Scotland,
} from './TaxYear2023';
import {
  TaxYear2024,
  TaxYear2024Scotland,
} from './TaxYear2024';
import {
  TaxYear2025,
  TaxYear2025Scotland,
} from './TaxYear2025';

const taxYearConfigs: Record<
  TaxYear,
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
};

/**
 * Get configuration for a specific tax year and
 * region.
 */
export function getTaxYearConfig(
  year: TaxYear,
  region: TaxRegion = 'rUK',
): TaxYearConfig {
  return taxYearConfigs[year][region];
}

/** List of available tax years for UI selection */
export const availableTaxYears: TaxYear[] = [
  TAX_YEARS.Y2023_24,
  TAX_YEARS.Y2024_25,
  TAX_YEARS.Y2025_26,
];

/** Tax years that are disabled (not yet announced) */
export const disabledTaxYears: TaxYear[] = [];
