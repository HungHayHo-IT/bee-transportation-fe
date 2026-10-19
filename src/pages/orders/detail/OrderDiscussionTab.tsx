import { useCallback, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { Box, Button, Chip, Divider, Stack, TextField, Typography } from '@mui/material';
import { IconSend } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from 'notistack';
import { EmptyState } from '@/components/EmptyState';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { fetchComments, fetchMentionables, postComment } from '@/services/collabService';
import { formatDateTime } from '@/utils/formatters';
import type { MentionableUser, OrderComment } from '@/types/order';
import type { Page } from '@/types/pagination';
import { describeError } from '@/services/apiClient';
import { useCurrentUser } from '@/store/sessionContext';
import { CommentBody } from './CommentBody';
import { MentionPicker } from './MentionPicker';
import {
  findMentionQuery,
  insertMention,
  matchesTerm,
  survivingMentions,
} from './mentionDraft';

const REVISION_REQUEST_KIND = 'revision_request';

/** Threads are split per department by the backend; a caller sees only its own. */
export function OrderDiscussionTab({ orderId }: { orderId: number }): ReactNode {
  const { t } = useTranslation();
  const { enqueueSnackbar } = useSnackbar();
  const load = useCallback((): Promise<Page<OrderComment>> => fetchComments(orderId), [orderId]);
  const resource = useAsyncResource<Page<OrderComment>>(load, [load]);

  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Everyone the caller may mention here; the backend already filtered it to the
  // thread they write into, so the list is safe to show as-is.
  const [mentionables, setMentionables] = useState<readonly MentionableUser[]>([]);
  const [picked, setPicked] = useState<MentionableUser[]>([]);
  const [query, setQuery] = useState<ReturnType<typeof findMentionQuery>>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const anchorRef = useRef<HTMLDivElement | null>(null);

  const comments = resource.data?.items ?? [];
  const hiddenComments = (resource.data?.total ?? 0) - comments.length;

  // Bảng tra cứu để TÔ SÁNG, rộng hơn danh sách của picker đúng một người:
  // chính mình. Không ai tự nhắc mình nên backend loại mình khỏi mentionables,
  // hậu quả là khi người khác nhắc tôi thì tôi lại là người duy nhất thấy tên
  // mình trơ chữ đen — đúng cái lần cần nổi bật nhất.
  const me = useCurrentUser();
  const nameable: readonly MentionableUser[] =
    me === null
      ? mentionables
      : [
          ...mentionables,
          {
            id: me.id,
            fullName: me.fullName,
            roles: me.roles,
            departmentName: me.departmentName,
          },
        ];

  useEffect(() => {
    let cancelled = false;
    // A failure here must not break commenting: without the list, @ is just a
    // character again, which is exactly the old behaviour.
    void fetchMentionables(orderId)
      .then((users) => {
        if (!cancelled) setMentionables(users);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  const suggestions = query === null ? [] : mentionables.filter((u) => matchesTerm(u, query.term));

  const syncQuery = (text: string, caret: number): void => {
    setQuery(findMentionQuery(text, caret));
    setActiveIndex(0);
  };

  const choose = (user: MentionableUser): void => {
    if (query === null) return;
    const next = insertMention(draft, query, user);
    setDraft(next.text);
    setPicked((current) => (current.some((u) => u.id === user.id) ? current : [...current, user]));
    setQuery(null);
    // Put the caret back after the inserted name rather than at the end of the box.
    window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(next.caret, next.caret);
    });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (suggestions.length === 0) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : suggestions.length - 1;
      setActiveIndex((index) => (index + step) % suggestions.length);
      return;
    }
    if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault();
      choose(suggestions[activeIndex]);
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      setQuery(null);
    }
  };

  const handleSend = async (): Promise<void> => {
    const body = draft.trim();
    setIsSending(true);
    try {
      await postComment(orderId, body, { mentions: survivingMentions(body, picked) });
      setDraft('');
      setPicked([]);
      setQuery(null);
      resource.reload();
    } catch (error) {
      enqueueSnackbar(describeError(error), { variant: 'error' });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Stack spacing={2}>
      {comments.length === 0 ? (
        <EmptyState
          title={t('orders.detail.noComments')}
          description={t('orders.detail.noCommentsHint')}
        />
      ) : (
        <Stack spacing={2}>
          {hiddenComments > 0 ? (
            <Typography variant="caption" color="text.secondary">
              {t('orders.detail.commentsTruncated', { count: hiddenComments })}
            </Typography>
          ) : null}
          {comments.map((comment) => (
            <Box key={comment.id}>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <Typography variant="subtitle2">{comment.authorName}</Typography>
                {comment.departmentName === null ? (
                  <Chip size="small" variant="outlined" label={t('orders.detail.generalThread')} />
                ) : (
                  <Chip size="small" variant="outlined" label={comment.departmentName} />
                )}
                {comment.kind === REVISION_REQUEST_KIND ? (
                  <Chip size="small" color="warning" label={t('orders.detail.revisionRequest')} />
                ) : null}
                <Typography variant="caption" color="text.secondary">
                  {formatDateTime(comment.createdAt)}
                </Typography>
              </Stack>
              <CommentBody
                body={comment.body}
                mentions={comment.mentions}
                known={nameable}
              />
              <Divider sx={{ mt: 2 }} />
            </Box>
          ))}
        </Stack>
      )}

      <Stack direction="row" spacing={1} alignItems="flex-start" ref={anchorRef}>
        <TextField
          label={t('orders.detail.writeComment')}
          placeholder={t('orders.detail.mentionHint')}
          value={draft}
          inputRef={inputRef}
          onChange={(event) => {
            setDraft(event.target.value);
            syncQuery(event.target.value, event.target.selectionStart ?? event.target.value.length);
          }}
          onKeyDown={handleKeyDown}
          onBlur={() => setQuery(null)}
          multiline
          minRows={2}
          fullWidth
        />
        <MentionPicker
          anchorEl={anchorRef}
          users={suggestions}
          activeIndex={activeIndex}
          onPick={choose}
          onHover={setActiveIndex}
        />
        <Button
          variant="contained"
          startIcon={<IconSend size={17} />}
          disabled={isSending || draft.trim() === ''}
          onClick={() => void handleSend()}
          sx={{ mt: 1 }}
        >
          {t('orders.detail.send')}
        </Button>
      </Stack>
    </Stack>
  );
}
