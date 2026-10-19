import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { IconArrowDown, IconArrowUp, IconPlus, IconTrash } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { Service } from '@/types/organisation';

export interface MilestoneEditorDialogProps {
  service: Service | null;
  isSubmitting: boolean;
  errorMessage: string | null;
  onSubmit: (milestones: string[]) => void;
  onClose: () => void;
}

function moveItem(items: string[], index: number, offset: number): string[] {
  const target = index + offset;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  const [moved] = next.splice(index, 1);
  next.splice(target, 0, moved);
  return next;
}

/**
 * The array position is the milestone sequence, so reordering here is what the
 * backend stores. Saving replaces the whole template and only affects orders
 * closed afterwards — closed orders keep their own snapshot.
 */
export function MilestoneEditorDialog({
  service,
  isSubmitting,
  errorMessage,
  onSubmit,
  onClose,
}: MilestoneEditorDialogProps): ReactNode {
  const { t } = useTranslation();
  const [milestones, setMilestones] = useState<string[]>([]);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (service === null) return;
    setMilestones(service.milestones);
    setDraft('');
  }, [service]);

  const addMilestone = (): void => {
    const value = draft.trim();
    if (value === '') return;
    setMilestones([...milestones, value]);
    setDraft('');
  };

  return (
    <Dialog open={service !== null} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {t('admin.services.milestonesTitle', { service: service?.name ?? '' })}
      </DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 2 }}>
          {t('admin.services.milestonesNotice')}
        </Alert>
        {errorMessage ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errorMessage}
          </Alert>
        ) : null}

        <List dense disablePadding>
          {milestones.map((milestone, index) => (
            <ListItem
              key={`${milestone}-${String(index)}`}
              disableGutters
              secondaryAction={
                <Stack direction="row" spacing={0.25}>
                  <IconButton
                    size="small"
                    disabled={index === 0}
                    onClick={() => setMilestones(moveItem(milestones, index, -1))}
                  >
                    <IconArrowUp size={16} stroke={1.7} />
                  </IconButton>
                  <IconButton
                    size="small"
                    disabled={index === milestones.length - 1}
                    onClick={() => setMilestones(moveItem(milestones, index, 1))}
                  >
                    <IconArrowDown size={16} stroke={1.7} />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() =>
                      setMilestones(milestones.filter((_item, position) => position !== index))
                    }
                  >
                    <IconTrash size={16} stroke={1.7} />
                  </IconButton>
                </Stack>
              }
            >
              <Typography variant="body2" sx={{ pr: 12 }}>
                <Typography component="span" color="text.secondary" sx={{ mr: 1 }}>
                  {index + 1}.
                </Typography>
                {milestone}
              </Typography>
            </ListItem>
          ))}
        </List>

        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          <TextField
            label={t('admin.services.addMilestone')}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return;
              event.preventDefault();
              addMilestone();
            }}
            fullWidth
          />
          <Button startIcon={<IconPlus size={17} />} onClick={addMilestone} disabled={draft.trim() === ''}>
            {t('common.actions.add')}
          </Button>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit" disabled={isSubmitting}>
          {t('common.actions.cancel')}
        </Button>
        <Button
          variant="contained"
          onClick={() => onSubmit(milestones)}
          disabled={isSubmitting || milestones.length === 0}
        >
          {t('common.actions.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
