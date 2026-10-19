export interface QuotePayload {
  amount: number;
  scopeNote?: string;
  leadTime?: string;
  validUntil?: string;
}

/**
 * A won order the backend considers comparable to the one being quoted.
 * `matchScore` is the backend's own similarity number, not a percentage.
 */
export interface ReferencePrice {
  code: string;
  finalAmount: number;
  closedAt: string;
  originProvince: string | null;
  destinationProvince: string | null;
  weightKg: number | null;
  volumeCbm: number | null;
  packageCount: number | null;
  containerType: string | null;
  matchScore: number;
}

/**
 * A quote version that has been superseded. The current version is not repeated
 * here — it is the department's row on the order detail.
 */
export interface QuoteHistoryEntry {
  version: number;
  amount: number | null;
  scopeNote: string | null;
  leadTime: string | null;
  validUntil: string | null;
  sentByName: string | null;
  at: string | null;
}

export interface QuoteHistory {
  departmentId: number;
  departmentName: string;
  currentVersion: number;
  entries: QuoteHistoryEntry[];
}
