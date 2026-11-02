// Verbatim transcription of HMRC's NIC test data, category A, from the
// same packs as the PAYE tables: every row of the Cat_A sheet, weekly and
// monthly, with the employee NIC column as printed. HMRC's rows test the
// thresholds and stop just above the upper earnings limit, so the upper
// rate is pinned here only at its edge.
//
// 2025-26: "NIC test data v1.1", https://www.gov.uk/government/publications/software-developers-payroll-test-data-2025-to-2026
// 2026-27: "NIC test data v1.0", https://www.gov.uk/government/publications/software-developers-payroll-test-data-2026-to-2027
//
// ── Checked against the downloaded workbooks, 2 Nov 2026 ─

import type {YearLabel} from '../../../src/types';

/** One pay period: frequency, gross pay, period, employee NIC. */
type NiRow = readonly [
  frequency: 'Weekly' | 'Monthly',
  grossPay: number,
  period: number,
  employeeNic: number,
];

/** A year's category A sheet. */
interface NiSheet {
  readonly year: YearLabel;
  readonly rows: readonly NiRow[];
}

export const NI_CATEGORY_A = [
  {
    year: '2025-26',
    rows: [
      // frequency, gross pay, period, employee NIC
      ['Weekly', 96.03, 1, 0.00],
      ['Weekly', 96.04, 1, 0.00],
      ['Weekly', 125.00, 1, 0.00],
      ['Weekly', 125.01, 1, 0.00],
      ['Weekly', 242.07, 1, 0.00],
      ['Weekly', 242.08, 1, 0.01],
      ['Weekly', 242.31, 1, 0.02],
      ['Weekly', 242.32, 1, 0.02],
      ['Weekly', 481.03, 1, 19.12],
      ['Weekly', 481.04, 1, 19.12],
      ['Weekly', 966.64, 1, 57.97],
      ['Weekly', 966.65, 1, 57.97],
      ['Weekly', 967.04, 1, 58.00],
      ['Weekly', 967.05, 1, 58.00],
      ['Monthly', 417.03, 1, 0.00],
      ['Monthly', 417.04, 1, 0.00],
      ['Monthly', 542.00, 1, 0.00],
      ['Monthly', 542.01, 1, 0.00],
      ['Monthly', 1_048.07, 1, 0.00],
      ['Monthly', 1_048.08, 1, 0.01],
      ['Monthly', 1_048.31, 1, 0.02],
      ['Monthly', 1_048.32, 1, 0.02],
      ['Monthly', 2_083.05, 1, 82.80],
      ['Monthly', 2_083.06, 1, 82.80],
      ['Monthly', 4_188.53, 1, 251.24],
      ['Monthly', 4_188.54, 1, 251.24],
      ['Monthly', 4_189.04, 1, 251.28],
      ['Monthly', 4_189.05, 1, 251.28],
    ],
  },
  {
    year: '2026-27',
    rows: [
      // frequency, gross pay, period, employee NIC
      ['Weekly', 96.03, 1, 0.00],
      ['Weekly', 96.04, 1, 0.00],
      ['Weekly', 129.00, 1, 0.00],
      ['Weekly', 129.01, 1, 0.00],
      ['Weekly', 242.07, 1, 0.00],
      ['Weekly', 242.08, 1, 0.01],
      ['Weekly', 242.31, 1, 0.02],
      ['Weekly', 242.32, 1, 0.02],
      ['Weekly', 481.03, 1, 19.12],
      ['Weekly', 481.04, 1, 19.12],
      ['Weekly', 966.64, 1, 57.97],
      ['Weekly', 966.65, 1, 57.97],
      ['Weekly', 967.04, 1, 58.00],
      ['Weekly', 967.05, 1, 58.00],
      ['Monthly', 417.03, 1, 0.00],
      ['Monthly', 417.04, 1, 0.00],
      ['Monthly', 559.00, 1, 0.00],
      ['Monthly', 559.01, 1, 0.00],
      ['Monthly', 1_048.07, 1, 0.00],
      ['Monthly', 1_048.08, 1, 0.01],
      ['Monthly', 1_048.31, 1, 0.02],
      ['Monthly', 1_048.32, 1, 0.02],
      ['Monthly', 2_083.05, 1, 82.80],
      ['Monthly', 2_083.06, 1, 82.80],
      ['Monthly', 4_188.53, 1, 251.24],
      ['Monthly', 4_188.54, 1, 251.24],
      ['Monthly', 4_189.04, 1, 251.28],
      ['Monthly', 4_189.05, 1, 251.28],
    ],
  },
] as const satisfies readonly NiSheet[];
