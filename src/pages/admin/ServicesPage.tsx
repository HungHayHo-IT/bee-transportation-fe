import { useState } from 'react';
import type { ReactNode } from 'react';
import { Fragment } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Collapse,
  IconButton,
  Stack,
  TableCell,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import { IconChevronDown, IconChevronRight, IconForms, IconListNumbers, IconPlus } from '@tabler/icons-react';
import { NumberField } from '@/components/form/NumberField';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from 'notistack';
import { PageContainer } from '@/components/PageContainer';
import { SectionCard } from '@/components/SectionCard';
import { DataTableShell } from '@/components/DataTableShell';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import {
  fetchServices,
  fetchUnroutedServices,
  setServiceMilestones,
  updateService,
} from '@/services/organisationService';
import type { Service } from '@/types/organisation';
import { describeError } from '@/services/apiClient';
import { MilestoneEditorDialog } from './MilestoneEditorDialog';
import { ServiceChildrenPanel } from './ServiceChildrenPanel';
import { ServiceCreateDialog } from './ServiceCreateDialog';
import { ServiceFieldsDialog } from './ServiceFieldsDialog';

interface ServicesPageData {
  services: Service[];
  unrouted: Service[];
}

async function loadPageData(): Promise<ServicesPageData> {
  const [services, unrouted] = await Promise.all([fetchServices(), fetchUnroutedServices()]);
  return { services, unrouted };
}

export function ServicesPage(): ReactNode {
  const { t } = useTranslation();
  const { enqueueSnackbar } = useSnackbar();
  const resource = useAsyncResource(loadPageData);

  const [editingMilestones, setEditingMilestones] = useState<Service | null>(null);
  const [editingFields, setEditingFields] = useState<Service | null>(null);
  // Chỉ MỘT dòng mở một lúc: mở nhiều thì bảng dài ra và người đọc mất dấu
  // dòng mình đang xem. null = không dòng nào mở.
  const [dongMo, setDongMo] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [slaDrafts, setSlaDrafts] = useState<Record<number, string>>({});

  const handleSaveMilestones = async (milestones: string[]): Promise<void> => {
    if (editingMilestones === null) return;
    setIsSubmitting(true);
    setDialogError(null);
    try {
      await setServiceMilestones(editingMilestones.id, milestones);
      setEditingMilestones(null);
      resource.reload();
      enqueueSnackbar(t('common.states.saved'), { variant: 'success' });
    } catch (error) {
      setDialogError(describeError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCommitSla = async (service: Service): Promise<void> => {
    const draft = slaDrafts[service.id];
    if (draft === undefined) return;
    const slaHours = Number(draft);
    setSlaDrafts((drafts) => {
      const next = { ...drafts };
      delete next[service.id];
      return next;
    });
    if (!Number.isInteger(slaHours) || slaHours <= 0 || slaHours === service.slaHours) return;
    try {
      await updateService(service.id, { slaHours });
      resource.reload();
      enqueueSnackbar(t('common.states.saved'), { variant: 'success' });
    } catch (error) {
      enqueueSnackbar(describeError(error), { variant: 'error' });
    }
  };

  const services = resource.data?.services ?? [];
  const unrouted = resource.data?.unrouted ?? [];

  return (
    <PageContainer
      title={t('nav.services')}
      description={t('admin.services.description')}
      action={(
        <Button
          variant="contained"
          startIcon={<IconPlus size={17} stroke={1.8} />}
          onClick={() => setIsCreating(true)}
        >
          {t('admin.services.create')}
        </Button>
      )}
    >
      {unrouted.length > 0 ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {t('admin.services.unroutedWarning', {
            services: unrouted.map((service) => service.code).join(', '),
          })}
        </Alert>
      ) : null}

      <SectionCard disableContentPadding>
        <DataTableShell
          isFirstLoad={resource.isFirstLoad}
          isRefetching={resource.isRefetching}
          errorMessage={resource.errorMessage}
          onDismissError={resource.clearError}
          isEmpty={services.length === 0}
          totalRows={services.length}
          minWidth={900}
          head={
            <TableRow>
              <TableCell>{t('admin.services.code')}</TableCell>
              <TableCell>{t('admin.services.name')}</TableCell>
              <TableCell align="right">{t('admin.services.sla')}</TableCell>
              <TableCell>{t('admin.services.milestones')}</TableCell>
              <TableCell align="right">{t('admin.services.inputFields')}</TableCell>
              <TableCell align="right">{t('admin.services.departments')}</TableCell>
              <TableCell align="right">{t('common.actions.actions')}</TableCell>
            </TableRow>
          }
        >
          {services.map((service) => (
            <Fragment key={service.id}>
            <TableRow
              hover
              onClick={() => setDongMo(dongMo === service.id ? null : service.id)}
              sx={{ cursor: 'pointer' }}
            >
              <TableCell>
                <Stack direction="row" spacing={1} alignItems="center">
                  {dongMo === service.id
                    ? <IconChevronDown size={16} stroke={2} />
                    : <IconChevronRight size={16} stroke={2} />}
                  <Chip size="small" color="primary" variant="outlined" label={service.code} />
                </Stack>
              </TableCell>
              <TableCell>{service.name}</TableCell>
              {/* Ô SLA là ô NHẬP nằm trong một dòng bấm-để-mở: không chặn nổi bọt
                  thì mỗi lần bấm vào ô số là dòng đóng/mở theo, gõ không nổi. */}
              <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                <Box
                  sx={{ width: 128, ml: 'auto' }}
                  onBlur={() => void handleCommitSla(service)}
                >
                  <NumberField
                    label={t('admin.services.sla')}
                    isLabelHidden
                    unit={t('admin.services.hourUnit')}
                    value={Number(slaDrafts[service.id] ?? String(service.slaHours))}
                    onChange={(next) =>
                      setSlaDrafts({
                        ...slaDrafts,
                        [service.id]: next === null ? '' : String(next),
                      })
                    }
                    min={1}
                    max={8760}
                  />
                </Box>
              </TableCell>
              <TableCell>
                <Typography variant="body2" color="text.secondary">
                  {service.milestones.length > 0
                    ? service.milestones.join(' → ')
                    : t('common.states.empty')}
                </Typography>
              </TableCell>
              <TableCell align="right">
                {service.cargoFields.length}
              </TableCell>
              <TableCell align="right">
                {service.departmentIds.length === 0 ? (
                  <Chip size="small" color="warning" label={0} />
                ) : (
                  service.departmentIds.length
                )}
              </TableCell>
              {/* Hai nút này mở hộp thoại riêng — bấm vào chúng mà dòng cũng
                  đóng/mở theo thì mỗi lần sửa bộ mốc lại kéo panel ra sau lưng. */}
              <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                <Tooltip title={t('admin.services.editMilestones')}>
                  <IconButton
                    size="small"
                    onClick={() => {
                      setDialogError(null);
                      setEditingMilestones(service);
                    }}
                  >
                    <IconListNumbers size={17} stroke={1.7} />
                  </IconButton>
                </Tooltip>
                <Tooltip title={t('admin.services.editFields')}>
                  <IconButton size="small" onClick={() => setEditingFields(service)}>
                    <IconForms size={17} stroke={1.7} />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>

            {/* Dòng panel: colSpan phủ hết bảng, không viền, không đệm — nền và
                viền trái do chính panel vẽ. unmountOnExit để dòng chưa mở không
                gọi API lấy dịch vụ con. */}
            <TableRow>
              <TableCell colSpan={7} sx={{ p: 0, border: 0 }}>
                <Collapse in={dongMo === service.id} timeout="auto" unmountOnExit>
                  <ServiceChildrenPanel
                    service={dongMo === service.id ? service : null}
                  />
                </Collapse>
              </TableCell>
            </TableRow>
            </Fragment>
          ))}
        </DataTableShell>
      </SectionCard>

      <ServiceFieldsDialog
        service={editingFields}
        onClose={() => setEditingFields(null)}
        onServiceChanged={resource.reload}
      />

      <ServiceCreateDialog
        isOpen={isCreating}
        onClose={() => setIsCreating(false)}
        onCreated={resource.reload}
      />

      <MilestoneEditorDialog
        service={editingMilestones}
        isSubmitting={isSubmitting}
        errorMessage={dialogError}
        onSubmit={(milestones) => void handleSaveMilestones(milestones)}
        onClose={() => setEditingMilestones(null)}
      />
    </PageContainer>
  );
}
