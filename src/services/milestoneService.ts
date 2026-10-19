import apiClient from './apiClient';
import { MILESTONE_ENDPOINTS } from './apiEndpoints';
import type { MilestoneStatus } from '@/constants/orderStatus';

/** Skipping a milestone requires a note; the backend rejects it otherwise. */
export async function updateMilestone(
  orderId: number,
  milestoneId: number,
  status: MilestoneStatus,
  note?: string,
): Promise<void> {
  await apiClient.patch(MILESTONE_ENDPOINTS.UPDATE(orderId, milestoneId), {
    status,
    ...(note === undefined || note.trim() === '' ? {} : { note: note.trim() }),
  });
}
