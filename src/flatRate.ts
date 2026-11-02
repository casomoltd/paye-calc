/**
 * The one band a flat-rate code (BR or a D code) charges all income at.
 * BR is the basic rate; Dn is the nth rate above it in the taxpayer's own
 * nation (HMRC PAYE Manual PAYE11025), read from the year's band list, so
 * Scotland's advanced rate and a year without it both answer correctly.
 */

import {TAX_BAND_NAMES, TAX_REGIONS} from './types.js';
import type {TaxBand, TaxRegion} from './types.js';
import {TAX_CODE_PREFIX, TaxStrategy} from './TaxCode.js';
import type {TaxCode} from './TaxCode.js';
import {taxBandByName} from './TaxYearConfig.js';
import type {TaxYearConfig} from './TaxYearConfig.js';

/** The band a BR or D code charges at; any other code is an error here. */
export function flatRateBand(config: TaxYearConfig, code: TaxCode): TaxBand {
  // Anchored on the basic rate by NAME: `bands[0]` is the basic rate in
  // rUK but the 19% starter rate in Scotland.
  const bands = config.incomeTaxBands;
  const basic = bands.indexOf(taxBandByName(config, TAX_BAND_NAMES.basicRate));
  const {rule} = code;
  if (rule.strategy === TaxStrategy.BasicRate) return bands[basic];
  if (rule.strategy !== TaxStrategy.FlatRate) {
    throw new Error(`${code.code} does not charge one flat rate`);
  }
  assertFitsRegion(code, config.region);
  const band = bands.at(basic + 1 + rule.band);
  if (!band) {
    throw new Error(
      `${code.code} names no band above the basic rate in`
      + ` ${config.displayName} (${config.region})`,
    );
  }
  return band;
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
