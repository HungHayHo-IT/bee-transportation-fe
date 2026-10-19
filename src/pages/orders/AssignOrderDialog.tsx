import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Alert, MenuItem, TextField } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { fetchUsers } from '@/services/organisationService';
import type { OrganisationUser } from '@/types/organisation';
import type { QueueItem } from '@/types/queue';

/** A department is a handful of people; one page holds all of them. */
const MEMBER_LIMIT = 200;

export interface AssignOrderDialogProps {
  item: QueueItem | null;
  departmentId: number;
  isSubmitting: boolean;
  onConfirm: (assignee: OrganisationUser) => void;
  onClose: () => void;
}

/**
 * The member list comes from `GET /users`, which a manager may call for their own
 * department since 23/08/2026 — before that this action had to stay disabled.
 */
export function AssignOrderDialog({
  item,
  departmentId,
  isSubmitting,
  onConfirm,
  onClose,
}: AssignOrderDialogProps): ReactNode {
  const { t } = useTranslation();
  const [selectedId, setSelectedId] = useState('');

  const load = useCallback(
    () => fetchUsers({ departmentId, isActive: true, limit: MEMBER_LIMIT }),
    [departmentId],
  );
  const resource = useAsyncResource(load, [load]);
  const members = resource.data?.items ?? [];

  useEffect(() => {
    if (item === null) return;
    setSelectedId('');
  }, [item]);

  const selected = members.find((member) => String(member.id) === selectedId);

  return (
    <ConfirmDialog
      isOpen={item !== null}
      title={t('queue.assignDialog.title', { code: item?.code ?? '' })}
      description={t('queue.assignDialog.description')}
      confirmLabel={t('queue.assignDialog.confirm')}
      isSubmitting={isSubmitting}
      isConfirmDisabled={selected === undefined}
      onConfirm={() => {
        if (selected !== undefined) onConfirm(selected);
      }}
      onClose={onClose}
    >
      {resource.errorMessage === null ? null : (
        <Alert severity="error" sx={{ mt: 2 }}>
          {resource.errorMessage}
        </Alert>
      )}

      {!resource.isFirstLoad && members.length === 0 ? (
        <Alert severity="info" sx={{ mt: 2 }}>
          {t('queue.assignDialog.noMembers')}
        </Alert>
      ) : (
        <TextField
          select
          label={t('queue.assignDialog.member')}
          value={selectedId}
          onChange={(event) => setSelectedId(event.target.value)}
          disabled={resource.isFirstLoad}
          required
          fullWidth
          sx={{ mt: 2 }}
        >
          {members.map((member) => (
            <MenuItem key={member.id} value={String(member.id)}>
              {member.fullName}
            </MenuItem>
          ))}
        </TextField>
      )}
    </ConfirmDialog>
  );
}
