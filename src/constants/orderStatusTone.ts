import { OrderStatus } from './orderStatus';
import { brandColors } from '@/theme';

export interface StatusTone {
  color: string;
  background: string;
}

/**
 * One colour per lifecycle state, shared by the status chip and the Kanban
 * column headers so the same state is never two different colours. Grey while
 * the order waits, orange while it is worked, green once it carries revenue,
 * and a distinct tone for each way it can end.
 */
export const ORDER_STATUS_TONE: Record<OrderStatus, StatusTone> = {
  [OrderStatus.AwaitingInfo]: { color: '#696D77', background: '#F5F5F7' },
  [OrderStatus.New]: { color: '#5A5E67', background: brandColors.slateWash },
  [OrderStatus.Distributed]: { color: '#4A5568', background: '#EDF0F4' },
  [OrderStatus.Quoting]: { color: brandColors.orangeStrong, background: brandColors.orangeWash },
  [OrderStatus.AwaitingSelection]: {
    color: brandColors.orangeStrong,
    background: brandColors.orangeWash,
  },
  [OrderStatus.Closed]: { color: brandColors.success, background: brandColors.successWash },
  [OrderStatus.Cancelled]: { color: brandColors.danger, background: brandColors.dangerWash },
};
