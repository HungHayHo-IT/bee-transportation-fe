import apiClient from './apiClient';
import { QUOTE_ENDPOINTS } from './apiEndpoints';
import type { QuoteHistory, QuotePayload, ReferencePrice } from '@/types/quote';
import type { ApiPage } from './pageAdapter';

interface ApiReferencePrice {
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

interface ApiQuoteHistoryEntry {
  version: number;
  amount: number | null;
  scopeNote: string | null;
  leadTime: string | null;
  validUntil: string | null;
  sentById: number | null;
  sentByName: string | null;
  at: string | null;
}

interface ApiQuoteHistory {
  departmentId: number;
  departmentName: string;
  currentVersion: number;
  history: ApiQuoteHistoryEntry[];
}

function adaptReferencePrice(api: ApiReferencePrice): ReferencePrice {
  return {
    code: api.code,
    finalAmount: api.finalAmount,
    closedAt: api.closedAt,
    originProvince: api.originProvince,
    destinationProvince: api.destinationProvince,
    weightKg: api.weightKg,
    volumeCbm: api.volumeCbm,
    packageCount: api.packageCount,
    containerType: api.containerType,
    matchScore: api.matchScore,
  };
}

/**
 * Submitting again is an update: the backend increments the quote version, keeps
 * the department's single row and files the previous version in the history.
 * A field left out keeps its stored value; only an explicit `null` clears it.
 */
export async function submitQuote(
  orderId: number,
  departmentId: number,
  payload: QuotePayload,
): Promise<void> {
  await apiClient.post(QUOTE_ENDPOINTS.QUOTE(orderId, departmentId), payload);
}

/**
 * The versions this department has already superseded, newest first. The current
 * version is not repeated here — it is the department's row on the order detail.
 * Sealed quoting applies: another department's history answers `403`.
 */
export async function fetchQuoteHistory(
  orderId: number,
  departmentId: number,
): Promise<QuoteHistory> {
  const response = await apiClient.get<ApiQuoteHistory>(
    QUOTE_ENDPOINTS.QUOTE_HISTORY(orderId, departmentId),
  );
  return {
    departmentId: response.data.departmentId,
    departmentName: response.data.departmentName,
    currentVersion: response.data.currentVersion,
    entries: response.data.history.map((entry) => ({
      version: entry.version,
      amount: entry.amount,
      scopeNote: entry.scopeNote,
      leadTime: entry.leadTime,
      validUntil: entry.validUntil,
      sentByName: entry.sentByName,
      at: entry.at,
    })),
  };
}

export async function fetchReferencePrices(orderId: number): Promise<ReferencePrice[]> {
  const response = await apiClient.get<ApiPage<ApiReferencePrice>>(
    QUOTE_ENDPOINTS.REFERENCE_PRICES(orderId),
  );
  return response.data.items.map(adaptReferencePrice);
}

/** Reopens quoting for every department listed and posts a revision-request comment. */
export async function requestQuoteRevision(
  orderId: number,
  departmentIds: number[],
  reason: string,
): Promise<void> {
  await apiClient.post(QUOTE_ENDPOINTS.REQUEST_REVISION(orderId), { departmentIds, reason });
}

/**
 * Selecting a winner moves the order to "awaiting customer". It does not record
 * revenue — that happens when the order is closed.
 */
export async function selectWinningQuote(
  orderId: number,
  departmentId: number,
  reason?: string,
): Promise<void> {
  await apiClient.post(QUOTE_ENDPOINTS.SELECT_QUOTE(orderId), {
    departmentId,
    ...(reason === undefined || reason === '' ? {} : { reason }),
  });
}

/** Đơn landing: giá Sale chốt riêng với khách, không thấp hơn giá phòng thắng. */
export async function setSalePrice(orderId: number, salePrice: number): Promise<void> {
  await apiClient.post(QUOTE_ENDPOINTS.SALE_PRICE(orderId), { salePrice });
}
