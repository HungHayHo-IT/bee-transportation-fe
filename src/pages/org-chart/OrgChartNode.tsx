import { useState } from 'react';
import type { ReactNode } from 'react';
import { Avatar, Box, Chip, Collapse, Paper, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { ROLE_LABEL_KEY, Role } from '@/constants/roles';
import type { DepartmentMember, DepartmentTreeNode } from '@/types/organisation';

export interface OrgChartNodeProps {
  node: DepartmentTreeNode;
}

/** Height of the vertical connector between a card and the bar above its children. */
const DROP = 22;

/**
 * Thứ bậc để xếp các hộp nhân sự. Xếp theo tên thì một trưởng phòng tên Ánh
 * đứng trước cả ban lãnh đạo, và sơ đồ tổ chức đọc ra thành một danh bạ.
 *
 * Admin đứng đầu vì đó là người quản trị hệ thống, không phải một bậc trong bộ
 * máy — nhưng để họ lẫn giữa nhân viên còn khó hiểu hơn.
 */
const RANK: Record<Role, number> = {
  [Role.Admin]: 0,
  [Role.Leader]: 1,
  [Role.Manager]: 2,
  [Role.Sale]: 3,
  [Role.Pricing]: 4,
  [Role.Dispatcher]: 5,
};

/** Cấp cao nhất mà một người đang giữ — người kiêm nhiệm xếp theo cấp cao nhất. */
function rankOf(member: DepartmentMember): number {
  return Math.min(...member.roles.map((r) => RANK[r]), RANK[Role.Dispatcher] + 1);
}

function byRank(a: DepartmentMember, b: DepartmentMember): number {
  return rankOf(a) - rankOf(b) || a.fullName.localeCompare(b.fullName, 'vi');
}

/**
 * Two letters for the avatar. Vietnamese names put the given name last, so the
 * last two words identify a person far better than the first two would.
 */
function initials(fullName: string): string {
  const words = fullName.trim().split(/\s+/u).slice(-2);
  return words.map((w) => w[0] ?? '').join('').toLocaleUpperCase();
}

/**
 * One box of the org chart, drawn as a real diagram: a card, a vertical drop, a
 * horizontal bar, and one drop per child.
 *
 * The connectors are CSS borders on the child wrappers rather than SVG — an SVG
 * would need measured coordinates, and those go wrong the moment a name wraps or
 * a card grows because someone expanded its staff list.
 */
function MemberBox({ member }: { member: DepartmentMember }): ReactNode {
  const { t } = useTranslation();
  return (
    <Paper
      variant="outlined"
      sx={{ width: 200, p: 1.25, borderRadius: 2.5, textAlign: 'left' }}
    >
      <Stack direction="row" spacing={1} alignItems="center">
        <Avatar sx={{ width: 30, height: 30, fontSize: 12, bgcolor: 'secondary.main' }}>
          {initials(member.fullName)}
        </Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" fontWeight={600} noWrap sx={{ lineHeight: 1.3 }}>
            {member.fullName}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap display="block">
            {member.roles.map((role: Role) => t(ROLE_LABEL_KEY[role])).join(', ')}
          </Typography>
        </Box>
      </Stack>
    </Paper>
  );
}

interface ChildEntry {
  key: string;
  render: () => ReactNode;
}

/**
 * Một hàng con: cuống nối xuống, thanh ngang, rồi mỗi ô một cuống rẽ vào.
 *
 * Tách ra vì một phòng giờ có thể có HAI hàng — ban lãnh đạo ở trên, nhân viên
 * ở dưới — và hàng thứ hai treo dưới hàng thứ nhất, đúng như cấp bậc đọc ra.
 */
function ChildRow({ entries }: { entries: ChildEntry[] }): ReactNode {
  if (!entries.length) return null;
  return (
    <>
      <Box sx={{ width: '2px', height: DROP, bgcolor: 'divider' }} />
      <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
        {entries.map((entry) => (
          <Box
            key={entry.key}
            sx={{
              position: 'relative',
              px: 1.5,
              pt: `${DROP}px`,
              // Drop from the horizontal bar into this child's card.
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: '50%',
                width: '2px',
                height: `${DROP}px`,
                bgcolor: 'divider',
              },
              // The bar itself, assembled from one segment per child. The
              // outermost children contribute only their inner half, so the
              // bar stops dead over the first and last card instead of
              // sticking out into empty space.
              '&::after': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '2px',
                bgcolor: 'divider',
              },
              '&:first-of-type::after': { left: '50%' },
              '&:last-of-type::after': { right: '50%' },
              '&:only-of-type::after': { display: 'none' },
            }}
          >
            {entry.render()}
          </Box>
        ))}
      </Box>
    </>
  );
}

export function OrgChartNode({ node }: OrgChartNodeProps): ReactNode {
  const { t } = useTranslation();
  const [showMembers, setShowMembers] = useState(false);
  const hasChildDepts = node.children.length > 0;
  const appointed = node.members.find((m) => m.id === node.managerId) ?? null;
  /**
   * Chưa ai được chỉ định thì lấy luôn người mang vai trò Trưởng phòng trong
   * phòng đó.
   *
   * Hai ô dữ liệu khác nhau và trước đây sơ đồ chỉ đọc một: departments
   * .manager_id là người được CHỈ ĐỊNH, còn users.roles là QUYỀN. Gán vai trò
   * Trưởng phòng cho ai đó rồi mà thẻ vẫn ghi "chưa có trưởng phòng" thì đọc
   * ra như hệ thống bỏ sót — trong khi về quyền hạn người đó đã là trưởng
   * phòng thật: phân quyền chạy trên roles + department_id, manager_id không
   * tham gia. Suy ra như vậy KHÔNG ghi gì xuống DB và không đè lên người đã
   * được chỉ định; nhãn bên dưới nói rõ đây là suy ra.
   *
   * Nhiều người cùng vai trò thì hiện hết, không tự chọn một: chọn hộ là đoán,
   * và đoán sai thì người đọc sơ đồ tin vào một cái tên không ai đặt.
   */
  const derived = appointed === null
    ? node.members.filter((m) => m.roles.includes(Role.Manager))
    : [];
  const heads = appointed === null ? derived : [appointed];
  const isDerived = appointed === null && derived.length > 0;
  const headIds = new Set(heads.map((m) => m.id));
  // Members-as-boxes only on leaf departments; a dept with sub-depts keeps the
  // structural view uncluttered. Exclude whoever heads it: they already show in
  // the card header, drawing them again as a child duplicates the person.
  const memberBoxes = hasChildDepts
    ? []
    : node.members.filter((m) => !headIds.has(m.id)).slice().sort(byRank);
  /**
   * Leader tách thành một hàng riêng NẰM TRÊN hàng nhân viên.
   *
   * Vẽ chung một hàng là nói rằng ban lãnh đạo ngang cấp với nhân viên, trong
   * khi họ đọc được báo cáo toàn công ty. Sơ đồ tổ chức mà xếp sai cấp thì
   * người mới vào đọc sai cả bộ máy.
   */
  const leaderBoxes = memberBoxes.filter((m) => m.roles.includes(Role.Leader));
  const restBoxes = memberBoxes.filter((m) => !m.roles.includes(Role.Leader));
  const deptRow: ChildEntry[] = node.children.map((c) => ({
    key: `d-${c.id}`,
    render: () => <OrgChartNode node={c} />,
  }));
  const boxRow = (list: DepartmentMember[]): ChildEntry[] =>
    list.map((m) => ({ key: `m-${m.id}`, render: () => <MemberBox member={m} /> }));
  // Phòng có phòng con thì giữ khung cấu trúc cho gọn, không vẽ nhân sự.
  const rows: ChildEntry[][] = hasChildDepts
    ? [deptRow]
    : [boxRow(leaderBoxes), boxRow(restBoxes)].filter((r) => r.length > 0);
  const hasMembers = node.members.length > 0;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Paper
        variant="outlined"
        onClick={() => hasChildDepts && hasMembers && setShowMembers((v) => !v)}
        sx={{
          width: 232,
          p: 1.5,
          borderRadius: 2.5,
          textAlign: 'left',
          cursor: hasChildDepts && hasMembers ? 'pointer' : 'default',
          opacity: node.isActive ? 1 : 0.5,
          borderColor: showMembers ? 'primary.main' : 'divider',
          transition: 'border-color .15s, box-shadow .15s',
          '&:hover':
            hasChildDepts && hasMembers ? { boxShadow: 2, borderColor: 'primary.light' } : undefined,
        }}
      >
        {/* The name gets the full width. Sharing the row with the status chip
            squeezed both — the name wrapped mid-phrase and the chip label was
            clipped. */}
        <Typography variant="body2" fontWeight={700} sx={{ lineHeight: 1.35 }}>
          {node.name}
        </Typography>
        {node.isActive ? null : (
          <Chip
            size="small"
            variant="outlined"
            label={t('orgChart.inactive')}
            sx={{ mt: 0.75, height: 20, '& .MuiChip-label': { px: 0.75, fontSize: 11 } }}
          />
        )}

        {heads.length === 0 ? (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
            <Avatar
              sx={{
                width: 26, height: 26, fontSize: 11, fontWeight: 700,
                bgcolor: 'action.disabledBackground', color: 'text.disabled',
              }}
            >
              —
            </Avatar>
            <Typography variant="caption" color="text.secondary" fontWeight={600} noWrap>
              {t('orgChart.noManager')}
            </Typography>
          </Stack>
        ) : (
          <Stack spacing={0.75} sx={{ mt: 1 }}>
            {heads.map((head) => (
              <Stack key={head.id} direction="row" spacing={1} alignItems="center">
                <Avatar
                  sx={{
                    width: 26, height: 26, fontSize: 11, fontWeight: 700,
                    bgcolor: 'primary.main', color: 'primary.contrastText',
                  }}
                >
                  {initials(head.fullName)}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="caption" display="block" fontWeight={600} noWrap>
                    {head.fullName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" noWrap>
                    {head.roles.map((role: Role) => t(ROLE_LABEL_KEY[role])).join(', ')}
                  </Typography>
                </Box>
              </Stack>
            ))}
            {isDerived ? (
              <Typography variant="caption" color="text.secondary" fontStyle="italic" noWrap>
                {t('orgChart.derivedManager')}
              </Typography>
            ) : null}
          </Stack>
        )}

        {/* Parent departments keep members folded — leaf departments render
            them as boxes below the card, so this collapse never fires there. */}
        {hasChildDepts ? (
          <Collapse in={showMembers} unmountOnExit>
            <Stack spacing={0.75} sx={{ mt: 1 }}>
              {node.members.filter((m) => !headIds.has(m.id)).map((member) => (
                <Stack key={member.id} direction="row" spacing={1} alignItems="center">
                  <Avatar sx={{ width: 22, height: 22, fontSize: 10, bgcolor: 'secondary.main' }}>
                    {initials(member.fullName)}
                  </Avatar>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="caption" display="block" noWrap fontWeight={600}>
                      {member.fullName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" noWrap>
                      {member.roles.map((role: Role) => t(ROLE_LABEL_KEY[role])).join(', ')}
                    </Typography>
                  </Box>
                </Stack>
              ))}
            </Stack>
          </Collapse>
        ) : null}
      </Paper>

      {rows.map((row, i) => (
        <ChildRow key={`row-${i}`} entries={row} />
      ))}
    </Box>
  );
}
