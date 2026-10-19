import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Alert, Box, Button, Chip, IconButton, MenuItem, Stack, Switch, Table, TableBody,
  TableCell, TableHead, TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import { IconCheck, IconEdit, IconTrash, IconX } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from 'notistack';
import { describeError } from '@/services/apiClient';
import {
  createServiceChild, deleteServiceChild, fetchServiceChildren, fetchTmsModes,
  updateServiceChild,
} from '@/services/organisationService';
import type { Service, ServiceChild } from '@/types/organisation';

export interface ServiceChildrenPanelProps {
  /** Dịch vụ đang mở. null = không dòng nào mở, panel không dựng gì cả. */
  service: Service | null;
  /** Gọi sau mỗi thay đổi mà bảng bên ngoài đang hiện (mã TMS của dịch vụ cha). */
}

/** Giá trị trong ô chọn khi chưa gắn mã — chuỗi rỗng, vì `null` làm Select về uncontrolled. */
const CHUA_CO_MA = '';

interface BanNhap {
  name: string;
  tmsMode: string;
}

/**
 * Nơi admin chia một dịch vụ lớn thành các dịch vụ con, mỗi dịch vụ con mang
 * một mã phương thức vận chuyển của OF1-TMS.
 *
 * Nằm NGAY DƯỚI dòng dịch vụ trong bảng chứ không phải một hộp thoại: bấm vào
 * dòng là xổ ra, dịch vụ con là một phần của dịch vụ chứ không phải một màn
 * khác — mở hộp thoại thì che mất chính cái dòng vừa bấm.
 *
 * Danh sách 18 mã lấy từ backend chứ không chép vào đây: cùng một nguồn với
 * CHECK trong cơ sở dữ liệu, nên không bao giờ có chuyện người dùng chọn được
 * một mã rồi bị từ chối lúc lưu.
 */
export function ServiceChildrenPanel({ service }: ServiceChildrenPanelProps): ReactNode {
  const { t } = useTranslation();
  const { enqueueSnackbar } = useSnackbar();

  const [children, setChildren] = useState<ServiceChild[]>([]);
  const [modes, setModes] = useState<string[]>([]);
  const [suaId, setSuaId] = useState<number | null>(null);
  const [nhap, setNhap] = useState<BanNhap>({ name: '', tmsMode: CHUA_CO_MA });
  const [them, setThem] = useState<BanNhap>({ name: '', tmsMode: CHUA_CO_MA });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (service === null) return;
    setSuaId(null);
    setErrorMessage(null);
    setThem({ name: '', tmsMode: CHUA_CO_MA });
    fetchServiceChildren(service.id).then(setChildren).catch((error: unknown) => {
      setErrorMessage(describeError(error));
    });
    fetchTmsModes().then(setModes).catch((error: unknown) => {
      setErrorMessage(describeError(error));
    });
  }, [service]);

  if (service === null) return null;
  const serviceId = service.id;

  const chay = async (viec: () => Promise<void>): Promise<void> => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await viec();
      setChildren(await fetchServiceChildren(serviceId));
      enqueueSnackbar(t('common.states.saved'), { variant: 'success' });
    } catch (error) {
      setErrorMessage(describeError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const oChonMa = (giaTri: string, doi: (v: string) => void): ReactNode => (
    <TextField
      select
      size="small"
      fullWidth
      label={t('admin.services.tmsMode')}
      value={giaTri}
      onChange={(e) => doi(e.target.value)}
    >
      <MenuItem value={CHUA_CO_MA}>
        <em>{t('admin.services.noTmsMode')}</em>
      </MenuItem>
      {modes.map((m) => (
        <MenuItem key={m} value={m}>{m}</MenuItem>
      ))}
    </TextField>
  );

  return (
    /* Nền xám nhạt + viền trái: panel phải tự tách khỏi các dòng trắng xung
       quanh, không thì người đọc không biết nó thuộc dòng nào. */
    <Box sx={{
      px: 3, py: 2.5,
      bgcolor: 'action.hover',
      borderLeft: 3, borderColor: 'primary.main',
    }}>
    <Alert severity="info" sx={{ mb: 2 }}>
      {t('admin.services.childrenNotice')}
    </Alert>
      {errorMessage !== null ? (
        <Alert severity="error" sx={{ mb: 2 }}>{errorMessage}</Alert>
      ) : null}


      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>{t('admin.services.childName')}</TableCell>
            <TableCell sx={{ width: 220 }}>{t('admin.services.tmsMode')}</TableCell>
            <TableCell align="right" sx={{ width: 110 }}>
              {t('admin.services.ordersUsing')}
            </TableCell>
            <TableCell align="center" sx={{ width: 90 }}>
              {t('common.states.active')}
            </TableCell>
            <TableCell align="right" sx={{ width: 110 }}>
              {t('common.actions.actions')}
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {children.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5}>
                <Typography variant="body2" color="text.secondary">
                  {t('admin.services.noChildren')}
                </Typography>
              </TableCell>
            </TableRow>
          ) : null}

          {children.map((con) => (
            <TableRow key={con.id} hover>
              <TableCell>
                {suaId === con.id ? (
                  <TextField
                    size="small"
                    fullWidth
                    label={t('admin.services.childName')}
                    value={nhap.name}
                    onChange={(e) => setNhap({ ...nhap, name: e.target.value })}
                  />
                ) : con.name}
              </TableCell>
              <TableCell>
                {suaId === con.id
                  ? oChonMa(nhap.tmsMode, (v) => setNhap({ ...nhap, tmsMode: v }))
                  : (
                    <Chip
                      size="small"
                      variant="outlined"
                      color={con.tmsMode === null ? 'default' : 'primary'}
                      label={con.tmsMode ?? t('admin.services.noTmsMode')}
                    />
                  )}
              </TableCell>
              <TableCell align="right">{con.orderCount}</TableCell>
              <TableCell align="center">
                <Switch
                  size="small"
                  checked={con.isActive}
                  disabled={isSubmitting}
                  onChange={(e) => void chay(() =>
                    updateServiceChild(serviceId, con.id, { isActive: e.target.checked })
                      .then(() => undefined))}
                />
              </TableCell>
              <TableCell align="right">
                {suaId === con.id ? (
                  <>
                    <IconButton
                      size="small"
                      disabled={isSubmitting || nhap.name.trim() === ''}
                      onClick={() => void chay(async () => {
                        await updateServiceChild(serviceId, con.id, {
                          name: nhap.name.trim(),
                          tmsMode: nhap.tmsMode === CHUA_CO_MA ? null : nhap.tmsMode,
                        });
                        setSuaId(null);
                      })}
                    >
                      <IconCheck size={17} stroke={1.7} />
                    </IconButton>
                    <IconButton size="small" onClick={() => setSuaId(null)}>
                      <IconX size={17} stroke={1.7} />
                    </IconButton>
                  </>
                ) : (
                  <>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setSuaId(con.id);
                        setNhap({ name: con.name, tmsMode: con.tmsMode ?? CHUA_CO_MA });
                      }}
                    >
                      <IconEdit size={17} stroke={1.7} />
                    </IconButton>
                    {/* Đơn đang dùng thì khoá nút xoá ngay tại đây, kèm lời giải
                        thích — để người bấm biết trước, thay vì bấm rồi mới nhận
                        409 từ máy chủ. */}
                    <Tooltip
                      title={con.orderCount > 0 ? t('admin.services.cannotDelete') : ''}
                    >
                      <span>
                        <IconButton
                          size="small"
                          color="error"
                          disabled={isSubmitting || con.orderCount > 0}
                          onClick={() => void chay(() =>
                            deleteServiceChild(serviceId, con.id))}
                        >
                          <IconTrash size={17} stroke={1.7} />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ mt: 2.5 }}>
        <TextField
          size="small"
          fullWidth
          label={t('admin.services.childName')}
          value={them.name}
          onChange={(e) => setThem({ ...them, name: e.target.value })}
        />
        <Stack sx={{ width: 220, flexShrink: 0 }}>
          {oChonMa(them.tmsMode, (v) => setThem({ ...them, tmsMode: v }))}
        </Stack>
        <Button
          variant="contained"
          // Không co lại và không xuống dòng: Stack chia đều thì chữ dài như
          // "Thêm dịch vụ con" bị cắt mất vài pixel cuối — đo được 114 trên
          // 110, nhìn thì tưởng là bóng chữ.
          sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}
          disabled={isSubmitting || them.name.trim() === ''}
          onClick={() => void chay(async () => {
            await createServiceChild(serviceId, {
              name: them.name.trim(),
              tmsMode: them.tmsMode === CHUA_CO_MA ? null : them.tmsMode,
              sortOrder: children.length + 1,
            });
            setThem({ name: '', tmsMode: CHUA_CO_MA });
          })}
        >
          {t('admin.services.addChild')}
        </Button>
    </Stack>
    </Box>
  );
}
