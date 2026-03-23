import {palette} from '@casomoltd/design-tokens';

/** Chart colors for salary breakdown visualization. */
export const CHART_COLORS = {
  takeHome: palette.primary,
  incomeTax: palette.accent,
  nationalInsurance: palette.secondary,
  studentLoans: palette.tertiary,
  pension: palette.highlight,
} as const;
