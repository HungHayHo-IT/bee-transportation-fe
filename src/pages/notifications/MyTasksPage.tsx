import { BeeLoader } from '@/components/BeeLoader';
import type { ReactNode } from 'react';
import {
  Alert,
  Chip,
  LinearProgress,
  List,
  ListItemButton,
  Stack,
  Typography,
} from '@mui/material';
import { IconArrowRight } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/components/EmptyState';
import { PageContainer } from '@/components/PageContainer';
import { SectionCard } from '@/components/SectionCard';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { fetchMyTasks } from '@/services/notificationService';
import { formatRelativeTime } from '@/utils/formatters';
import { buildOrderDetailPath } from '@/routes/routePaths';
import type { MyTask } from '@/types/notification';

interface TaskSection {
  reason: string;
  tasks: MyTask[];
}

/**
 * The backend already words each reason for the caller's role, so sections are
 * grouped on it: a role that produces no tasks of a kind simply has no section.
 */
function groupByReason(tasks: MyTask[]): TaskSection[] {
  const sections: TaskSection[] = [];
  for (const task of tasks) {
    const existing = sections.find((section) => section.reason === task.reason);
    if (existing === undefined) {
      sections.push({ reason: task.reason, tasks: [task] });
      continue;
    }
    existing.tasks.push(task);
  }
  return sections;
}

export function MyTasksPage(): ReactNode {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const resource = useAsyncResource<MyTask[]>(fetchMyTasks);
  const tasks = resource.data ?? [];
  const sections = groupByReason(tasks);

  if (resource.isFirstLoad) {
    return (
      <BeeLoader />
    );
  }

  return (
    <PageContainer title={t('nav.myTasks')} description={t('myTasks.description')}>
      <Stack spacing={2}>
        {resource.isRefetching ? <LinearProgress /> : null}

        {resource.errorMessage === null ? null : (
          <Alert severity="error" onClose={resource.clearError}>
            {resource.errorMessage}
          </Alert>
        )}

        {sections.length === 0 ? (
          <SectionCard>
            <EmptyState title={t('myTasks.empty')} description={t('myTasks.emptyHint')} />
          </SectionCard>
        ) : null}

        {sections.map((section) => (
          <SectionCard
            key={section.reason}
            title={section.reason}
            action={<Chip size="small" label={section.tasks.length} />}
            disableContentPadding
          >
            <List disablePadding>
              {section.tasks.map((task) => (
                <ListItemButton
                  key={task.orderId}
                  onClick={() => navigate(buildOrderDetailPath(task.orderId))}
                >
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{ width: '100%' }}
                    spacing={2}
                  >
                    <Typography variant="body2" fontWeight={700} noWrap>
                      {task.code}
                    </Typography>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Typography variant="caption" color="text.secondary">
                        {t('myTasks.waitingFor', {
                          duration: formatRelativeTime(task.since, i18n.language),
                        })}
                      </Typography>
                      <IconArrowRight size={16} />
                    </Stack>
                  </Stack>
                </ListItemButton>
              ))}
            </List>
          </SectionCard>
        ))}
      </Stack>
    </PageContainer>
  );
}
