import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { BeeLoader } from '@/components/BeeLoader';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  FormControlLabel,
  Stack,
  Switch,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from 'notistack';
import { PageContainer } from '@/components/PageContainer';
import { SectionCard } from '@/components/SectionCard';
import { NOTIFICATION_TYPES, NOTIFICATION_TYPE_REGISTRY } from '@/constants/notificationTypes';
import type { NotificationType } from '@/constants/notificationTypes';
import { ROLE_LABEL_KEY } from '@/constants/roles';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import {
  fetchNotificationPreferences,
  saveNotificationPreferences,
} from '@/services/notificationService';
import { useCurrentUser } from '@/store/sessionContext';
import type { NotificationPreferences } from '@/types/notification';
import { describeError } from '@/services/apiClient';
import { ChangePasswordButton } from './ChangePasswordButton';

function ProfileField({ label, value }: { label: string; value: ReactNode }): ReactNode {
  return (
    <Stack spacing={0.5} sx={{ minWidth: 200 }}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      {typeof value === 'string' ? <Typography variant="body2">{value}</Typography> : value}
    </Stack>
  );
}

export function ProfilePage(): ReactNode {
  const { t } = useTranslation();
  const { enqueueSnackbar } = useSnackbar();
  const user = useCurrentUser();

  const resource = useAsyncResource<NotificationPreferences>(fetchNotificationPreferences);
  const [emailOff, setEmailOff] = useState<NotificationType[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const loaded = resource.data;
  useEffect(() => {
    if (loaded === null) return;
    setEmailOff(loaded.emailOff);
  }, [loaded]);

  const toggleEmail = (type: NotificationType, isEmailOn: boolean): void => {
    setEmailOff((current) =>
      isEmailOn ? current.filter((value) => value !== type) : [...current, type],
    );
  };

  const handleSave = async (): Promise<void> => {
    setIsSaving(true);
    try {
      await saveNotificationPreferences(emailOff);
      resource.reload();
      enqueueSnackbar(t('common.states.saved'), { variant: 'success' });
    } catch (error) {
      enqueueSnackbar(describeError(error), { variant: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  if (user === null) return null;

  return (
    <PageContainer
      title={t('nav.profile')}
      description={t('profile.description')}
      action={<ChangePasswordButton />}
    >
      <Stack spacing={2}>
        <SectionCard title={t('profile.identity')}>
          <Stack direction="row" flexWrap="wrap" useFlexGap spacing={4}>
            <ProfileField label={t('admin.users.fullName')} value={user.fullName} />
            <ProfileField label={t('auth.fields.email')} value={user.email} />
            <ProfileField
              label={t('admin.routing.department')}
              value={user.departmentName ?? '—'}
            />
            <ProfileField
              label={t('admin.users.roles')}
              value={
                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                  {user.roles.map((role) => (
                    <Chip key={role} size="small" label={t(ROLE_LABEL_KEY[role])} />
                  ))}
                </Stack>
              }
            />
            <ProfileField
              label={t('admin.users.companyReportShort')}
              value={
                <Chip
                  size="small"
                  color={user.canViewCompanyReport ? 'success' : 'default'}
                  variant="outlined"
                  label={t(user.canViewCompanyReport ? 'common.states.active' : 'common.states.inactive')}
                />
              }
            />
          </Stack>
        </SectionCard>

        <SectionCard
          title={t('profile.emailPreferences')}
          subtitle={t('profile.emailPreferencesHint')}
          action={
            <Button variant="contained" disabled={isSaving} onClick={() => void handleSave()}>
              {t('common.actions.save')}
            </Button>
          }
        >
          {resource.isFirstLoad ? (
            <BeeLoader />
          ) : (
            <Stack spacing={1.5}>
              {resource.errorMessage === null ? null : (
                <Alert severity="error" onClose={resource.clearError}>
                  {resource.errorMessage}
                </Alert>
              )}
              <Alert severity="info">{t('profile.inAppAlwaysOn')}</Alert>
              <Divider />
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    sm: 'repeat(2, minmax(0, 1fr))',
                    md: 'repeat(3, minmax(0, 1fr))',
                  },
                  columnGap: 2,
                  rowGap: 0.5,
                }}
              >
                {NOTIFICATION_TYPES.map((type) => (
                  <FormControlLabel
                    key={type}
                    control={
                      <Switch
                        checked={!emailOff.includes(type)}
                        onChange={(event) => toggleEmail(type, event.target.checked)}
                      />
                    }
                    label={t(NOTIFICATION_TYPE_REGISTRY[type].labelKey)}
                  />
                ))}
              </Box>
            </Stack>
          )}
        </SectionCard>
      </Stack>
    </PageContainer>
  );
}
