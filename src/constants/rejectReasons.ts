/**
 * The backend validates `rejectReason` against this exact enum, so the values are
 * part of the contract and travel as-is. Only the label is translated, and the
 * list is shared with the dashboard so win-rate analysis groups on the same keys.
 */
export const REJECT_REASONS = [
  'Giá cao',
  'Thời gian không đáp ứng',
  'Khách chọn đối thủ',
  'Khách hủy nhu cầu',
  'Khác',
] as const;

export type RejectReason = (typeof REJECT_REASONS)[number];

export const REJECT_REASON_LABEL_KEY: Record<RejectReason, string> = {
  'Giá cao': 'orders.reject.reasonPrice',
  'Thời gian không đáp ứng': 'orders.reject.reasonLeadTime',
  'Khách chọn đối thủ': 'orders.reject.reasonCompetitor',
  'Khách hủy nhu cầu': 'orders.reject.reasonDropped',
  'Khác': 'orders.reject.reasonOther',
};

export function findRejectReason(value: string): RejectReason | undefined {
  return REJECT_REASONS.find((reason) => reason === value);
}
