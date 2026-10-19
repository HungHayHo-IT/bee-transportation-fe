import { useState } from 'react';
import type { KeyboardEvent, MouseEvent, ReactNode } from 'react';
import { Box, Popover, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { MentionableUser } from '@/types/order';
import { splitBodyByMentions } from './mentionHighlight';

/** Thẻ thông tin hiện ra khi bấm vào một cái tên được nhắc tới. */
function MentionCard({ user }: { user: MentionableUser }): ReactNode {
  const { t } = useTranslation();
  // Một người có thể mang nhiều vai; ghép lại thay vì chỉ lấy cái đầu tiên,
  // không thì Sale kiêm trưởng phòng sẽ hiện thiếu mất một nửa.
  const roleLabel = user.roles.map((role) => t(`roles.${role}`)).join(' · ');

  return (
    <Stack spacing={0.25} sx={{ px: 2, py: 1.5, maxWidth: 260 }}>
      <Typography variant="subtitle2">{user.fullName}</Typography>
      {roleLabel === '' ? null : (
        <Typography variant="body2" color="text.secondary">
          {roleLabel}
        </Typography>
      )}
      <Typography variant="body2" color="text.secondary">
        {user.departmentName ?? t('orders.detail.mentionNoDepartment')}
      </Typography>
    </Stack>
  );
}

export interface CommentBodyProps {
  body: string;
  /** Id những người thật sự đã được thông báo về bình luận này. */
  mentions: readonly number[];
  /** Những người tab này tra được tên — dùng để đối chiếu id sang tên. */
  known: readonly MentionableUser[];
}

/**
 * Nội dung một bình luận, có tô sáng người được nhắc tới.
 *
 * `whiteSpace: pre-wrap` giữ nguyên cách người viết xuống dòng — trước đây cả
 * khối là một Typography nên thuộc tính đó nằm sẵn ở ngoài; giờ tách thành
 * nhiều mẩu thì vẫn phải giữ ở khối bao, không thì mọi xuống dòng biến mất.
 */
export function CommentBody({ body, mentions, known }: CommentBodyProps): ReactNode {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [picked, setPicked] = useState<MentionableUser | null>(null);

  const segments = splitBodyByMentions(body, mentions, known);

  // Nhận thẳng phần tử neo thay vì cả sự kiện: bàn phím và chuột cùng gọi được
  // mà không phải ép kiểu sự kiện này thành sự kiện kia.
  const open = (target: HTMLElement, user: MentionableUser): void => {
    setAnchor(target);
    setPicked(user);
  };

  const close = (): void => {
    setAnchor(null);
    setPicked(null);
  };

  return (
    <>
      <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>
        {segments.map((segment, position) => {
          const { user } = segment;
          // Vị trí làm khoá: các mẩu chữ không có gì để định danh, mà thứ tự
          // của chúng trong một bình luận đã lưu thì không bao giờ đổi.
          if (user === null) return <span key={position}>{segment.text}</span>;

          return (
            <Box
              key={position}
              component="span"
              role="button"
              tabIndex={0}
              onClick={(event: MouseEvent<HTMLElement>) => open(event.currentTarget, user)}
              onKeyDown={(event: KeyboardEvent<HTMLElement>) => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                // Space cuộn trang nếu để nguyên, mà ở đây nó là một cái nút.
                event.preventDefault();
                open(event.currentTarget, user);
              }}
              sx={{
                color: 'primary.main',
                fontWeight: 600,
                cursor: 'pointer',
                borderRadius: 0.5,
                '&:hover': { textDecoration: 'underline' },
                '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main' },
              }}
            >
              {segment.text}
            </Box>
          );
        })}
      </Typography>

      <Popover
        open={anchor !== null && picked !== null}
        anchorEl={anchor}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        {picked === null ? null : <MentionCard user={picked} />}
      </Popover>
    </>
  );
}
