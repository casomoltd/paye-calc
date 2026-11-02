/**
 * The one band a flat-rate code (BR or a D code) charges all income at.
 * BR is the basic rate; Dn is the nth rate above it in the taxpayer's own
 * nation (HMRC PAYE Manual PAYE11025), read from the year's band list, so
 * Scotland's advanced rate and a year without it both answer correctly.
 */

import {TAX_BAND_NAMES, TAX_REGIONS} from './types.js';
import type {TaxBand, TaxRegion} from './types.js';
import {TAX_CODE_PREFIX} from './TaxCode.js';
import type {TaxCode} from './TaxCode.js';
import {taxBandByName} from './TaxYearConfig.js';
import type {TaxYearConfig} from './TaxYearConfig.js';

/** The band BR charges at: the basic rate, found by name, since
 *  `bands[0]` is the basic rate in rUK but the 19% starter rate in
 *  Scotland. */
export function basicRateBand(config: TaxYearConfig): TaxBand {
  return taxBandByName(config, TAX_BAND_NAMES.basicRate);
}

/** The band a D code charges at: `band` places above the basic rate. */
export function dCodeBand(
  config: TaxYearConfig,
  code: TaxCode,
  band: number,
): TaxBand {
  assertFitsRegion(code, config.region);
  const bands = config.incomeTaxBands;
  const found = bands.at(bands.indexOf(basicRateBand(config)) + 1 + band);
  if (!found) {
    throw new Error(
      `${code.code} names no band above the basic rate in`
      + ` ${config.year} (${config.region})`,
    );
  }
  return found;
}

/**
 * A D code's number means a different rate in Scotland, so the code and
 * the region must name the same regime: SD codes with Scottish rates, D
 * and CD codes with the rest of the UK's. Anything else would quietly
 * charge the other nation's rate.
 */
function assertFitsRegion(code: TaxCode, region: TaxRegion): void {
  const scottishCode = code.prefix === TAX_CODE_PREFIX.Scotland;
  if (scottishCode !== (region === TAX_REGIONS.scotland)) {
    throw new Error(
      `${code.code} is a ${scottishCode ? 'Scottish' : 'rest-of-UK'} D code,`
      + ` but the rates are ${region}'s`,
    );
  }
}
