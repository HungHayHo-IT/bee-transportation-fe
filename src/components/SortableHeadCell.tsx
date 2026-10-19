import type { ReactNode } from 'react';
import { Box, ButtonBase, TableCell } from '@mui/material';
import { IconCaretDownFilled, IconCaretUpFilled } from '@tabler/icons-react';
import type { TableCellProps } from '@mui/material';
import { nextSortState } from '@/utils/sortState';
import type { SortOrder, SortState } from '@/utils/sortState';

export interface SortableHeadCellProps<Column extends string> {
  column: Column;
  sort: SortState<Column> | null;
  onSortChange: (sort: SortState<Column> | null) => void;
  align?: TableCellProps['align'];
  width?: TableCellProps['width'];
  children: ReactNode;
}

/** The two stacked carets antd puts beside a sortable header; the lit one is the order. */
function SortCarets({ order }: { order: SortOrder | null }): ReactNode {
  const caretSx = (isLit: boolean) => ({
    display: 'block',
    color: isLit ? 'primary.main' : 'text.disabled',
    transition: 'color 120ms',
  });

  return (
    <Box
      component="span"
      aria-hidden
      sx={{ display: 'inline-flex', flexDirection: 'column', ml: 0.75, lineHeight: 0 }}
    >
      <Box component="span" sx={{ ...caretSx(order === 'asc'), mb: '-3px' }}>
        <IconCaretUpFilled size={11} />
      </Box>
      <Box component="span" sx={caretSx(order === 'desc')}>
        <IconCaretDownFilled size={11} />
      </Box>
    </Box>
  );
}

export function SortableHeadCell<Column extends string>({
  column,
  sort,
  onSortChange,
  align,
  width,
  children,
}: SortableHeadCellProps<Column>): ReactNode {
  const order = sort?.column === column ? sort.order : null;

  return (
    <TableCell align={align} width={width} sortDirection={order ?? false}>
      <ButtonBase
        disableRipple
        onClick={() => onSortChange(nextSortState(sort, column))}
        sx={{
          font: 'inherit',
          // A <button> resets these; the header row is uppercase and tracked.
          textTransform: 'inherit',
          letterSpacing: 'inherit',
          color: order === null ? 'inherit' : 'text.primary',
          maxWidth: '100%',
          '&:hover': { color: 'text.primary' },
          '&.Mui-focusVisible': {
            outline: '2px solid',
            outlineColor: 'primary.main',
            borderRadius: 0.5,
          },
        }}
      >
        <Box
          component="span"
          sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        >
          {children}
        </Box>
        <SortCarets order={order} />
      </ButtonBase>
    </TableCell>
  );
}
