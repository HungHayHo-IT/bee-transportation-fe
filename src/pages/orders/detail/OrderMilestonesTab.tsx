import { useCallback, useState } from 'react';
import type { ChangeEvent, ReactNode } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Stack,
  Step,
  StepContent,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from '@mui/material';
import {
  IconCheck,
  IconCircleCheck,
  IconPaperclip,
  IconPlayerSkipForward,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from 'notistack';
import { EmptyState } from '@/components/EmptyState';
import { MilestoneStatus } from '@/constants/orderStatus';
import { PermissionAction } from '@/constants/permissions';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { usePermissions } from '@/hooks/usePermissions';
import { useCurrentUser } from '@/store/sessionContext';
import { updateMilestone } from '@/services/milestoneService';
import { downloadOrderFile, fetchOrderFiles } from '@/services/collabService';
import { uploadOrderFile } from '@/services/orderService';
import { formatDateTime } from '@/utils/formatters';
import type { OrderDetail, OrderFile, OrderMilestone } from '@/types/order';
import { describeError } from '@/services/apiClient';

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

export interface OrderMilestonesTabProps {
  order: OrderDetail;
  onUpdated: () => void;
}

function findFirstPending(milestones: OrderMilestone[]): OrderMilestone | undefined {
  return milestones.find((milestone) => milestone.status === MilestoneStatus.Pending);
}

export function OrderMilestonesTab({ order, onUpdated }: OrderMilestonesTabProps): ReactNode {
  const { t } = useTranslation();
  const { enqueueSnackbar } = useSnackbar();
  const { can } = usePermissions();
  const user = useCurrentUser();

  const [note, setNote] = useState('');
  const [busyMilestoneId, setBusyMilestoneId] = useState<number | null>(null);

  // Files attached to a milestone come back in the order's file list with their
  // `milestoneId`; each step shows its own so the evidence sits beside the note.
  const loadFiles = useCallback((): Promise<OrderFile[]> => fetchOrderFiles(order.id), [order.id]);
  const files = useAsyncResource<OrderFile[]>(loadFiles, [loadFiles]);
  const filesOf = (milestoneId: number): OrderFile[] =>
    (files.data ?? []).filter((file) => file.milestoneId === milestoneId);

  // The order detail carries the whole milestone set, `doneByName` included.
  const milestones = order.milestones;

  if (milestones.length === 0) {
    return (
      <EmptyState
        title={t('orders.detail.noMilestones')}
        description={t('orders.detail.noMilestonesHint')}
      />
    );
  }

  // Only the department carrying the order may update it, and the backend is the
  // authority — this check merely avoids rendering a control that would 403.
  const isResponsibleDepartment =
    user?.departmentName !== null && user?.departmentName === order.departmentName;
  const canUpdate = can(PermissionAction.UpdateMilestone) && isResponsibleDepartment;

  const nextPending = findFirstPending(milestones);
  // The backend always ends the set with "Nghiệm thu" and refuses to skip it.
  const acceptanceMilestone = milestones[milestones.length - 1];

  const handleUpdate = async (
    milestone: OrderMilestone,
    status: MilestoneStatus,
  ): Promise<void> => {
    if (status === MilestoneStatus.Skipped && note.trim() === '') {
      enqueueSnackbar(t('orders.detail.skipNeedsNote'), { variant: 'warning' });
      return;
    }
    setBusyMilestoneId(milestone.id);
    try {
      await updateMilestone(order.id, milestone.id, status, note);
      setNote('');
      onUpdated();
      enqueueSnackbar(t('common.states.saved'), { variant: 'success' });
    } catch (error) {
      enqueueSnackbar(describeError(error), { variant: 'error' });
    } finally {
      setBusyMilestoneId(null);
    }
  };

  const handleAttach = async (
    milestone: OrderMilestone,
    event: ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = '';
    setBusyMilestoneId(milestone.id);
    try {
      for (const file of selected) {
        if (file.size > MAX_FILE_SIZE_BYTES) {
          enqueueSnackbar(t('orders.create.fileTooLarge', { name: file.name }), {
            variant: 'error',
          });
          continue;
        }
        await uploadOrderFile(order.id, file, milestone.id);
      }
      files.reload();
    } catch (error) {
      enqueueSnackbar(describeError(error), { variant: 'error' });
    } finally {
      setBusyMilestoneId(null);
    }
  };

  const handleDownload = async (file: OrderFile): Promise<void> => {
    try {
      await downloadOrderFile(order.id, file);
    } catch (error) {
      enqueueSnackbar(describeError(error), { variant: 'error' });
    }
  };

  const activeStep = milestones.findIndex((milestone) => milestone.id === nextPending?.id);

  return (
    <Stack spacing={2}>
      {/* The status stays "Đã chốt" after the last milestone (one closed state since
          migration 023); completedAt is what says the work is finished. */}
      {order.completedAt === null ? null : (
        <Alert severity="success" icon={<IconCircleCheck size={22} />}>
          {t('orders.detail.completedAt', { at: formatDateTime(order.completedAt) })}
        </Alert>
      )}
      {canUpdate || order.completedAt !== null ? null : (
        <Alert severity="info">{t('orders.detail.milestonesReadOnly')}</Alert>
      )}

      <Stepper
        orientation="vertical"
        activeStep={activeStep === -1 ? milestones.length : activeStep}
      >
        {milestones.map((milestone) => {
          const isNext = milestone.id === nextPending?.id;
          const isBusy = busyMilestoneId === milestone.id;
          const isAcceptance = milestone.id === acceptanceMilestone.id;
          const attached = filesOf(milestone.id);
          // Acceptance is the handover: it needs proof — a photo or the signed
          // record — not just a line of text. The backend does not check this yet
          // (QA-34), so the button is the only guard for now.
          const needsEvidence = isAcceptance && attached.length === 0;

          return (
            // `expanded` keeps every step's note and files readable once done:
            // a vertical Stepper otherwise opens only the active step, and after
            // the last milestone there is none — the notes vanished for everyone.
            <Step
              key={milestone.id}
              completed={milestone.status !== MilestoneStatus.Pending}
              expanded
            >
              <StepLabel
                optional={
                  <Stack direction="row" spacing={1} alignItems="center">
                    {milestone.status === MilestoneStatus.Skipped ? (
                      <Chip size="small" color="warning" label={t('orders.detail.skipped')} />
                    ) : null}
                    {milestone.doneAt === null ? null : (
                      <Typography variant="caption" color="text.secondary">
                        {formatDateTime(milestone.doneAt)} · {milestone.doneByName ?? '—'}
                      </Typography>
                    )}
                  </Stack>
                }
              >
                {milestone.name}
              </StepLabel>
              <StepContent>
                {milestone.note === null ? null : (
                  <Typography variant="body2" sx={{ mb: 1, whiteSpace: 'pre-line' }}>
                    {milestone.note}
                  </Typography>
                )}

                {attached.length === 0 ? null : (
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
                    {attached.map((file) => (
                      <Chip
                        key={file.id}
                        size="small"
                        variant="outlined"
                        icon={<IconPaperclip size={14} />}
                        label={file.name}
                        onClick={() => void handleDownload(file)}
                      />
                    ))}
                  </Stack>
                )}

                {canUpdate && isNext ? (
                  <Stack spacing={1.5} sx={{ mt: 1 }}>
                    <TextField
                      label={t('orders.detail.milestoneNote')}
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      helperText={
                        isAcceptance
                          ? t('orders.detail.acceptanceHint')
                          : t('orders.detail.skipNeedsNote')
                      }
                      multiline
                      minRows={2}
                      fullWidth
                    />
                    <Box>
                      <Button
                        component="label"
                        size="small"
                        color="inherit"
                        variant="outlined"
                        startIcon={<IconPaperclip size={16} />}
                        disabled={isBusy}
                      >
                        {isAcceptance
                          ? t('orders.detail.attachAcceptance')
                          : t('orders.detail.attachMilestone')}
                        <input
                          type="file"
                          hidden
                          multiple
                          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                          onChange={(event) => void handleAttach(milestone, event)}
                        />
                      </Button>
                    </Box>
                    {needsEvidence ? (
                      <Alert severity="warning">{t('orders.detail.acceptanceNeedsFile')}</Alert>
                    ) : null}
                    <Stack direction="row" spacing={1}>
                      <Button
                        variant="contained"
                        startIcon={<IconCheck size={17} />}
                        disabled={isBusy || needsEvidence || files.isFirstLoad}
                        onClick={() => void handleUpdate(milestone, MilestoneStatus.Done)}
                      >
                        {t('orders.detail.markDone')}
                      </Button>
                      {/* The backend refuses to skip acceptance, so it has no skip button. */}
                      {isAcceptance ? null : (
                        <Button
                          color="inherit"
                          startIcon={<IconPlayerSkipForward size={17} />}
                          disabled={isBusy}
                          onClick={() => void handleUpdate(milestone, MilestoneStatus.Skipped)}
                        >
                          {t('orders.detail.markSkipped')}
                        </Button>
                      )}
                    </Stack>
                  </Stack>
                ) : null}
              </StepContent>
            </Step>
          );
        })}
      </Stepper>
    </Stack>
  );
}
