import type { ReactNode, RefObject } from 'react';
import {
  ListItemText,
  MenuItem,
  MenuList,
  Paper,
  Popper,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { findRoles, ROLE_LABEL_KEY } from '@/constants/roles';
import type { MentionableUser } from '@/types/order';

export interface MentionPickerProps {
  anchorEl: RefObject<HTMLElement | null>;
  users: readonly MentionableUser[];
  activeIndex: number;
  onPick: (user: MentionableUser) => void;
  onHover: (index: number) => void;
}

/**
 * Renders under the composer while an `@token` is being typed. Keyboard handling
 * lives in the composer — this only draws the list, so both stay easy to follow.
 */
export function MentionPicker({
  anchorEl,
  users,
  activeIndex,
  onPick,
  onHover,
}: MentionPickerProps): ReactNode {
  const { t } = useTranslation();

  return (
    <Popper
      open={users.length > 0}
      anchorEl={anchorEl.current}
      placement="top-start"
      sx={{ zIndex: (theme) => theme.zIndex.modal }}
    >
      <Paper elevation={8} sx={{ maxHeight: 260, overflowY: 'auto', minWidth: 280 }}>
        <MenuList dense>
          {users.map((user, index) => (
            <MenuItem
              key={user.id}
              selected={index === activeIndex}
              onMouseEnter={() => onHover(index)}
              // mousedown, not click: the composer must not lose focus first.
              onMouseDown={(event) => {
                event.preventDefault();
                onPick(user);
              }}
            >
              <ListItemText
                primary={user.fullName}
                secondary={
                  <Typography variant="caption" color="text.secondary">
                    {[
                      ...findRoles(user.roles).map((role) => t(ROLE_LABEL_KEY[role])),
                      user.departmentName ?? t('orders.detail.noDepartment'),
                    ].join(' · ')}
                  </Typography>
                }
              />
            </MenuItem>
          ))}
        </MenuList>
      </Paper>
    </Popper>
  );
}
