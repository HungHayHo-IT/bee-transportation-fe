import { useState, type ReactNode } from 'react';
import {
  Box, Card, CardContent, Collapse, Divider, IconButton, Stack, Tooltip, Typography,
} from '@mui/material';
import { IconChevronDown, IconInfoCircle } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

export interface SectionCardProps {
  title?: string;
  subtitle?: string;
  /**
   * Lời giải thích dài, cất sau dấu (i) cạnh tiêu đề thay vì trải thành hai
   * dòng chữ xám.
   *
   * Khác `subtitle` ở chỗ ai cũng đọc được `subtitle` mỗi lần mở màn, kể cả
   * lần thứ một trăm. Một quy tắc đọc một lần là nhớ — "giá 2 chiều = 1 chiều
   * + 50%" chẳng hạn — thì để nguyên trên màn chỉ còn là chữ chiếm chỗ của
   * bảng, và mắt người ta bỏ qua nó từ lần thứ hai.
   */
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
  disableContentPadding?: boolean;
  /**
   * Cho gấp thẻ lại. Form tạo đơn có sáu thẻ nối nhau thành một trang dài hơn
   * ba màn hình; gấp được thì người nhập giữ phần đang làm trong tầm mắt.
   *
   * Mặc định TẮT: hầu hết màn chỉ có một thẻ, thêm một cái nút gấp ở đó là
   * thêm một thứ để bấm nhầm.
   */
  isCollapsible?: boolean;
  /** Mở sẵn hay không. Chỉ xét lúc dựng — sau đó người dùng làm chủ. */
  defaultExpanded?: boolean;
}

/**
 * The one card every screen is built from. The header keeps a fixed hierarchy —
 * title, then one line of purpose, then the action on the right — so a page made
 * of five cards still reads as one page.
 */
export function SectionCard({
  title,
  subtitle,
  hint,
  action,
  children,
  disableContentPadding = false,
  isCollapsible = false,
  defaultExpanded = true,
}: SectionCardProps): ReactNode {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(defaultExpanded);
  const hasHeader = Boolean(title ?? action);
  /* Gấp được thì CẢ tiêu đề là chỗ bấm, không chỉ mỗi mũi tên: một mũi tên
     24px là đích bấm tệ, nhất là trên điện thoại. */
  const moDuoc = isCollapsible && hasHeader;
  const than = disableContentPadding ? children : <CardContent sx={{ px: 2.5 }}>{children}</CardContent>;

  return (
    <Card>
      {hasHeader ? (
        <>
          <CardContent
            sx={{
              py: 2,
              px: 2.5,
              '&:last-child': { pb: 2 },
              ...(moDuoc ? { cursor: 'pointer' } : {}),
            }}
            onClick={moDuoc ? () => setIsOpen((v) => !v) : undefined}
          >
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              justifyContent="space-between"
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              spacing={1.5}
            >
              <Stack spacing={0.25} sx={{ minWidth: 0 }}>
                {title === undefined ? null : (
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <Typography variant="h5">{title}</Typography>
                    {hint === undefined ? null : (
                      <Tooltip title={hint} enterTouchDelay={0} leaveTouchDelay={6000}>
                        {/* Nằm trong vùng bấm để gấp thẻ, nên chặn cú bấm lại:
                            chạm vào dấu (i) là muốn đọc, không phải muốn gấp. */}
                        <IconButton
                          size="small"
                          aria-label={hint}
                          onClick={(e) => e.stopPropagation()}
                          sx={{ color: 'text.secondary' }}
                        >
                          <IconInfoCircle size={17} />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Stack>
                )}
                {subtitle === undefined ? null : (
                  <Typography variant="body2" color="text.secondary">
                    {subtitle}
                  </Typography>
                )}
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center">
                {/* Nút trong tiêu đề không được kéo theo cú bấm gấp thẻ. */}
                {action === undefined ? null : (
                  <Box onClick={(e) => e.stopPropagation()}>{action}</Box>
                )}
                {moDuoc ? (
                  <IconButton
                    size="small"
                    aria-label={t(isOpen ? 'common.actions.collapse' : 'common.actions.expand')}
                    sx={{
                      transition: 'transform .2s',
                      transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                    }}
                  >
                    <IconChevronDown size={18} />
                  </IconButton>
                ) : null}
              </Stack>
            </Stack>
          </CardContent>
          <Divider />
        </>
      ) : null}
      {moDuoc ? <Collapse in={isOpen} unmountOnExit={false}>{than}</Collapse> : than}
    </Card>
  );
}
