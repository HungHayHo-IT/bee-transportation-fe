import type { MentionableUser } from '@/types/order';

/**
 * Một mẩu của nội dung bình luận. `user` khác null nghĩa là mẩu này là một lời
 * nhắc tới đúng người đó; null là chữ thường.
 */
export interface BodySegment {
  text: string;
  user: MentionableUser | null;
}

/** Chữ hoặc số — dùng để đòi ranh giới từ ở hai đầu tên. */
const WORDISH = /[\p{L}\p{N}]/u;

function isBoundary(char: string | undefined): boolean {
  return char === undefined || !WORDISH.test(char);
}

/**
 * Tách nội dung bình luận thành các mẩu để tô sáng người được nhắc tới.
 *
 * Nguồn sự thật là `mentionedIds` — những người THẬT SỰ đã được thông báo — chứ
 * không phải mọi chuỗi `@...` có trong nội dung. Ai đó gõ tay "@abc" mà không
 * chọn từ danh sách gợi ý thì không ai được báo cả; tô nó lên là nói với người
 * đọc một điều không có thật.
 *
 * Người được nhắc nhưng không còn trong `known` (đổi phòng, nghỉ việc) thì để
 * nguyên chữ thường. Không tô nghĩa là "không xác nhận được danh tính" — thà
 * nhạt còn hơn chỉ sai người.
 */
export function splitBodyByMentions(
  body: string,
  mentionedIds: readonly number[],
  known: readonly MentionableUser[],
): BodySegment[] {
  const ids = new Set(mentionedIds);
  // Tên dài xếp trước: "@Nguyễn Văn An" phải được thử trước "@Nguyễn Văn A",
  // không thì cái tên ngắn nuốt mất phần đầu của cái tên dài.
  const candidates = known
    .filter((user) => ids.has(user.id))
    .sort((a, b) => b.fullName.length - a.fullName.length);

  if (candidates.length === 0) return body === '' ? [] : [{ text: body, user: null }];

  const segments: BodySegment[] = [];
  let plain = '';
  let index = 0;

  const flushPlain = (): void => {
    if (plain === '') return;
    segments.push({ text: plain, user: null });
    plain = '';
  };

  while (index < body.length) {
    const matched =
      body[index] === '@' && isBoundary(body[index - 1])
        ? candidates.find((user) => {
            const token = `@${user.fullName}`;
            if (!body.startsWith(token, index)) return false;
            // Đòi ranh giới cả ở cuối: nếu chỉ "Nguyễn Văn A" được nhắc mà nội
            // dung viết "@Nguyễn Văn An" (một người khác, không được nhắc) thì
            // không được tô nửa cái tên rồi bỏ lại chữ "n" lạc lõng.
            return isBoundary(body[index + token.length]);
          })
        : undefined;

    if (matched === undefined) {
      plain += body[index];
      index += 1;
      continue;
    }

    flushPlain();
    segments.push({ text: `@${matched.fullName}`, user: matched });
    index += matched.fullName.length + 1;
  }

  flushPlain();
  return segments;
}
