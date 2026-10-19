import type { ReactNode } from 'react';
import { Box } from '@mui/material';
import { IconBuildingSkyscraper, IconUser, IconUsersGroup } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

export type ReportScope = 'company' | 'department' | 'personal';

const SCOPE_ICON = {
  company: IconBuildingSkyscraper,
  department: IconUsersGroup,
  personal: IconUser,
} as const;

/**
 * The tier a dashboard or report is scoped to. It states a fact, it is not
 * actionable — so it reads as a labelled tag (icon + caption + value) rather than
 * a solid button.
 */
export function ScopeBadge({ scope, label }: { scope: ReportScope; label: string }): ReactNode {
  const { t } = useTranslation();
  const Icon = SCOPE_ICON[scope];
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        py: 0.5,
        px: 1.25,
        borderRadius: 999,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'action.hover',
        whiteSpace: 'nowrap',
      }}
    >
      <Box sx={{ display: 'inline-flex', color: 'primary.main' }}>
        <Icon size={16} stroke={1.8} />
      </Box>
      <Box component="span" sx={{ fontSize: 12, color: 'text.secondary' }}>
        {t('dashboard.scope.label')}
      </Box>
      <Box component="span" sx={{ fontSize: 13, fontWeight: 600, color: 'text.primary' }}>
        {label}
      </Box>
    </Box>
  );
}
