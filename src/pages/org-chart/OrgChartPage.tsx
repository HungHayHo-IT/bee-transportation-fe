import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { BeeLoader } from '@/components/BeeLoader';
import {
  Alert, Box, List, ListItemButton, ListItemText, Stack, Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { PageContainer } from '@/components/PageContainer';
import { SectionCard } from '@/components/SectionCard';
import { EmptyState } from '@/components/EmptyState';
import { Role } from '@/constants/roles';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { usePermissions } from '@/hooks/usePermissions';
import { useCurrentUser } from '@/store/sessionContext';
import { fetchDepartmentTree } from '@/services/organisationService';
import type { DepartmentTreeNode } from '@/types/organisation';
import { OrgChartNode } from './OrgChartNode';

interface FlatEntry {
  id: number;
  name: string;
  depth: number;
  isActive: boolean;
}

function flatten(nodes: readonly DepartmentTreeNode[], depth = 0): FlatEntry[] {
  return nodes.flatMap((n) => [
    { id: n.id, name: n.name, depth, isActive: n.isActive },
    ...flatten(n.children, depth + 1),
  ]);
}

function findNode(
  nodes: readonly DepartmentTreeNode[],
  id: number,
): DepartmentTreeNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    const hit = findNode(n.children, id);
    if (hit) return hit;
  }
  return null;
}

function countMembers(nodes: readonly DepartmentTreeNode[]): number {
  return nodes.reduce((sum, n) => sum + n.members.length + countMembers(n.children), 0);
}

/** Read-only org chart: every logged-in role can reach it, nobody edits from here. */
export function OrgChartPage(): ReactNode {
  const { t } = useTranslation();
  const resource = useAsyncResource<DepartmentTreeNode[]>(fetchDepartmentTree);
  const nodes = useMemo(() => resource.data ?? [], [resource.data]);
  const { hasRole } = usePermissions();
  const user = useCurrentUser();
  // Only Admin sees the department picker. Everyone else is locked to their own
  // department — the picker would let them jump to other subtrees, which is
  // exactly what the read-only view is meant to prevent.
  const canFilter = hasRole(Role.Admin);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const flat = useMemo(() => flatten(nodes), [nodes]);
  const effectiveSelectedId = canFilter ? selectedId : user?.departmentId ?? null;
  const shown = useMemo(() => {
    if (effectiveSelectedId === null) return nodes;
    const hit = findNode(nodes, effectiveSelectedId);
    return hit ? [hit] : [];
  }, [nodes, effectiveSelectedId]);
  const totalMembers = useMemo(() => countMembers(shown), [shown]);

  return (
    <PageContainer title={t('orgChart.title')}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="stretch">
        {canFilter ? (
          <Box sx={{ width: { xs: '100%', md: 260 }, flexShrink: 0 }}>
            <SectionCard disableContentPadding>
              <Typography variant="subtitle2" sx={{ px: 2, pt: 2 }}>
                {t('orgChart.filterTitle')}
              </Typography>
              <List dense sx={{ maxHeight: 520, overflowY: 'auto' }}>
                <ListItemButton
                  selected={selectedId === null}
                  onClick={() => setSelectedId(null)}
                >
                  <ListItemText
                    primary={t('orgChart.all')}
                    primaryTypographyProps={{ fontWeight: 600 }}
                  />
                </ListItemButton>
                {flat.map((entry) => (
                  <ListItemButton
                    key={entry.id}
                    selected={selectedId === entry.id}
                    onClick={() => setSelectedId(entry.id)}
                    sx={{ pl: 2 + entry.depth * 2 }}
                  >
                    <ListItemText
                      primary={entry.name}
                      primaryTypographyProps={{
                        noWrap: true,
                        fontSize: 13,
                        color: entry.isActive ? 'text.primary' : 'text.disabled',
                      }}
                    />
                  </ListItemButton>
                ))}
              </List>
            </SectionCard>
          </Box>
        ) : null}

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <SectionCard disableContentPadding>
            {shown.length > 0 && !resource.isFirstLoad ? (
              <Box sx={{ px: 3, pt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                <Typography variant="body2" color="text.secondary" fontWeight={600}>
                  {t('orgChart.memberCount', { count: totalMembers })}
                </Typography>
              </Box>
            ) : null}

            {resource.isFirstLoad ? (
              <BeeLoader />
            ) : null}

            {resource.errorMessage === null ? null : (
              <Alert severity="error" onClose={resource.clearError} sx={{ m: 2 }}>
                {t('orgChart.loadFailed')}
              </Alert>
            )}

            {!resource.isFirstLoad && nodes.length === 0 && resource.errorMessage === null ? (
              <EmptyState title={t('orgChart.empty')} />
            ) : null}

            {shown.length > 0 ? (
              <Box sx={{ overflowX: 'auto', p: 3 }}>
                <Stack
                  direction="row"
                  spacing={4}
                  alignItems="flex-start"
                  justifyContent="center"
                  sx={{ minWidth: 'min-content' }}
                >
                  {shown.map((node) => (
                    <OrgChartNode key={node.id} node={node} />
                  ))}
                </Stack>
              </Box>
            ) : null}
          </SectionCard>
        </Box>
      </Stack>
    </PageContainer>
  );
}
