import type { ReactNode } from 'react';
import {
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Typography,
} from '@mui/material';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { railColors } from '@/theme';
import { useMenuItems } from './useMenuItems';
import { Logo } from './Logo';

export interface SidebarItemsProps {
  isExpanded: boolean;
}

/**
 * The active entry is the one whose href is the longest prefix of the current
 * path. A detail route therefore keeps its list entry lit, while a nested route
 * that owns a menu entry of its own — /orders/kanban, /orders/new — takes the
 * highlight away from /orders instead of lighting both.
 */
function findActiveHref(currentPath: string, hrefs: string[]): string | null {
  const matches = hrefs.filter(
    (href) => currentPath === href || currentPath.startsWith(`${href}/`),
  );
  if (matches.length === 0) return null;
  return matches.reduce((longest, href) => (href.length > longest.length ? href : longest));
}

export function SidebarItems({ isExpanded }: SidebarItemsProps): ReactNode {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const groups = useMenuItems();
  const activeHref = findActiveHref(
    pathname,
    groups.flatMap((group) => group.items.map((item) => item.href)),
  );

  return (
    <Box sx={{ backgroundColor: railColors.background, minHeight: '100%', pb: 3 }}>
      <Logo isExpanded={isExpanded} />

      {groups.map((group) => (
        <Box key={group.key} sx={{ mt: 2 }}>
          {isExpanded ? (
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                px: 3,
                pb: 0.5,
                color: railColors.textMuted,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                fontWeight: 600,
              }}
            >
              {t(group.labelKey)}
            </Typography>
          ) : (
            <Box sx={{ height: 12 }} />
          )}

          <List disablePadding>
            {group.items.map((item) => {
              const isActive = item.href === activeHref;
              const ItemIcon = item.icon;
              const label = t(item.labelKey);

              return (
                <Tooltip
                  key={item.key}
                  title={isExpanded ? '' : label}
                  placement="right"
                  disableHoverListener={isExpanded}
                >
                  <ListItemButton
                    component={Link}
                    to={item.href}
                    sx={{
                      mx: 1,
                      mb: 0.25,
                      minHeight: 38,
                      borderRadius: 2,
                      px: isExpanded ? 1.5 : 0,
                      justifyContent: isExpanded ? 'flex-start' : 'center',
                      color: isActive ? railColors.textActive : railColors.text,
                      backgroundColor: isActive ? railColors.backgroundActive : 'transparent',
                      '&:hover': {
                        backgroundColor: isActive
                          ? railColors.backgroundActiveHover
                          : railColors.backgroundHover,
                      },
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 0,
                        mr: isExpanded ? 1.5 : 0,
                        justifyContent: 'center',
                        color: 'inherit',
                      }}
                    >
                      <ItemIcon size={19} stroke={1.7} />
                    </ListItemIcon>
                    {isExpanded ? (
                      <ListItemText
                        primary={label}
                        slotProps={{ primary: { fontSize: 14, fontWeight: isActive ? 600 : 500 } }}
                      />
                    ) : null}
                  </ListItemButton>
                </Tooltip>
              );
            })}
          </List>
        </Box>
      ))}
    </Box>
  );
}
