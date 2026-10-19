export const ORDER_DETAIL_TABS = [
  'overview',
  'departments',
  'milestones',
  'discussion',
  'files',
  'timeline',
] as const;

export type OrderDetailTab = (typeof ORDER_DETAIL_TABS)[number];

export function findOrderDetailTab(value: string | null): OrderDetailTab | undefined {
  if (value === null) return undefined;
  return ORDER_DETAIL_TABS.find((tab) => tab === value);
}
