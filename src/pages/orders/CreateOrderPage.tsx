import { useEffect, useState } from 'react';
import type { ChangeEvent, ReactNode } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  LinearProgress,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { IconPaperclip, IconSend } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from 'notistack';
import { FIELD_GRID } from '@/components/form/fieldGrid';
import { FormActionBar } from '@/components/FormActionBar';
import { PageContainer } from '@/components/PageContainer';
import { SectionCard } from '@/components/SectionCard';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { ORDER_SOURCES, ORDER_SOURCE_LABEL_KEY } from '@/constants/provinces';
import { fetchServices } from '@/services/organisationService';
import type { Service } from '@/types/organisation';
import { OrderCustomerPicker } from './OrderCustomerPicker';
import type { CustomerSelection } from './OrderCustomerPicker';
import { CreateOrderSuccessPanel } from './CreateOrderSuccessPanel';
import { OrderCargoFields } from './OrderCargoFields';
import { OrderRouteFields } from './OrderRouteFields';
import { ServiceDataFields } from './ServiceDataFields';
import { EMPTY_ROUTE } from './orderRouteValues';
import type { OrderRouteValues } from './orderRouteValues';
import { EMPTY_CARGO, pruneCargo } from './orderCargoValues';
import type { CargoFigures } from './OrderCargoFields';
import { emptyServiceData, missingRequiredFields, toServiceDataPayload } from './serviceDataValues';
import type { ServiceDataDraft } from './serviceDataValues';
import { useServiceChildren } from './useServiceChildren';
import { useServiceSchema } from './useServiceSchema';
import { useCreateOrder } from './useCreateOrder';

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

const EMPTY_CUSTOMER: CustomerSelection = {
  existing: null,
  companyName: '',
  contactName: '',
  phone: '',
  email: '',
};

export function CreateOrderPage(): ReactNode {
  const { t } = useTranslation();
  const { enqueueSnackbar } = useSnackbar();
  const services = useAsyncResource<Service[]>(fetchServices);

  const [customer, setCustomer] = useState<CustomerSelection>(EMPTY_CUSTOMER);
  const [serviceId, setServiceId] = useState('');
  const [serviceChildId, setServiceChildId] = useState('');
  const [route, setRoute] = useState<OrderRouteValues>(EMPTY_ROUTE);
  const [cargo, setCargo] = useState<CargoFigures>(EMPTY_CARGO);
  const [serviceData, setServiceData] = useState<ServiceDataDraft>({});
  const [goodsName, setGoodsName] = useState('');
  const [note, setNote] = useState('');
  const [source, setSource] = useState('');
  const [files, setFiles] = useState<File[]>([]);

  const { isSubmitting, submitError, createdOrder, uploadWarning, submit, clear } =
    useCreateOrder();

  const schemaState = useServiceSchema(
    serviceId === '' ? null : Number(serviceId),
    serviceChildId === '' ? null : Number(serviceChildId),
  );
  const { children: serviceChildren } = useServiceChildren(
    serviceId === '' ? null : Number(serviceId),
  );
  const { schema } = schemaState;
  const fields = schema?.fields ?? [];
  const cargoKeys = schema?.cargoFields ?? [];

  // A service change swaps the whole lower half of the form. Its own boxes start
  // blank, and figures the new service does not use are cleared — leaving them
  // would send a value the API rejects with no box on screen to clear it in.
  // Đổi dịch vụ thì bỏ dịch vụ con đã chọn: nó thuộc dịch vụ TRƯỚC, và gửi lên
  // thì backend từ chối bằng một câu mà người dùng không hiểu vì sao.
  useEffect(() => {
    setServiceChildId('');
  }, [serviceId]);

  useEffect(() => {
    if (schema === null) return;
    setServiceData(emptyServiceData(schema.fields));
    setCargo((current) => pruneCargo(current, schema.cargoFields));
  }, [schema]);

  const selectedService = (services.data ?? []).find((service) => String(service.id) === serviceId);
  const missingRequired = missingRequiredFields(fields, serviceData);

  /* Đầu nào nằm ngoài nước thì không có ô, nên cũng không được đòi — nếu không
     nút Lưu mờ vĩnh viễn vì một ô không hiện trên màn hình.

     Tính theo DỊCH VỤ CON: hàng xuất ẩn đầu đến, hàng nhập ẩn đầu đi. */
  const hasDomesticOrigin = schema?.hasDomesticOrigin ?? true;
  const hasDomesticDest = schema?.hasDomesticDestination ?? true;

  const canSubmit =
    customer.companyName.trim() !== '' &&
    // The public form requires a phone number; if admin allowed a blank one, the
    // same customer arriving through the two routes would end up with two
    // different data qualities.
    customer.phone.trim() !== '' &&
    serviceId !== '' &&
    // Chỉ không đòi dịch vụ con khi dịch vụ không chia nhỏ (tư vấn, hải quan,
    // cho thuê thiết bị). Dịch vụ đã chia nhỏ thì phải chọn: mã TMS nằm ở dịch
    // vụ con, bỏ trống là đơn sang OF1 không mang mode nào.
    (serviceChildren.length === 0 || serviceChildId !== '') &&
    (!hasDomesticOrigin || route.originProvince !== '') &&
    (!hasDomesticDest || route.destinationProvince !== '') &&
    schema !== null &&
    missingRequired.length === 0;

  const handleSelectFiles = (event: ChangeEvent<HTMLInputElement>): void => {
    const selected = Array.from(event.target.files ?? []);
    const tooLarge = selected.filter((file) => file.size > MAX_FILE_SIZE_BYTES);
    if (tooLarge.length > 0) {
      enqueueSnackbar(t('orders.create.fileTooLarge', { name: tooLarge[0].name }), {
        variant: 'error',
      });
    }
    setFiles(selected.filter((file) => file.size <= MAX_FILE_SIZE_BYTES));
    event.target.value = '';
  };

  const resetForm = (): void => {
    setCustomer(EMPTY_CUSTOMER);
    setServiceId('');
    setRoute(EMPTY_ROUTE);
    setCargo(EMPTY_CARGO);
    setServiceData({});
    setGoodsName('');
    setNote('');
    setSource('');
    setFiles([]);
    clear();
  };

  const handleSubmit = async (): Promise<void> => {
    await submit({
      customer,
      serviceId,
      serviceChildId,
      route,
      cargo,
      visibleCargoKeys: cargoKeys,
      serviceData: toServiceDataPayload(fields, serviceData),
      goodsName,
      note,
      source,
      files,
    });
  };

  if (createdOrder !== null) {
    return (
      <PageContainer title={t('nav.createOrder')}>
        <CreateOrderSuccessPanel
          order={createdOrder}
          uploadWarning={uploadWarning}
          onCreateAnother={resetForm}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer title={t('nav.createOrder')} description={t('orders.create.description')}>
      <Stack spacing={2}>
        {submitError === null ? null : (
          <Alert severity="error" onClose={clear}>
            {submitError}
          </Alert>
        )}

        <SectionCard title={t('orders.create.customerSection')} isCollapsible>
          <OrderCustomerPicker value={customer} onChange={setCustomer} />
        </SectionCard>

        <SectionCard title={t('orders.create.serviceSection')} isCollapsible>
          <Stack spacing={1}>
            <Box sx={FIELD_GRID}>
              <TextField
                select
                label={t('orders.fields.service')}
                value={serviceId}
                onChange={(event) => setServiceId(event.target.value)}
                required
                fullWidth
              >
                {(services.data ?? [])
                  .filter((service) => service.isActive)
                  .map((service) => (
                    <MenuItem key={service.id} value={String(service.id)}>
                      {service.code} · {service.name}
                    </MenuItem>
                  ))}
              </TextField>
            </Box>
            {serviceChildren.length === 0 ? null : (
              <Box sx={FIELD_GRID}>
                <TextField
                  select
                  label={t('admin.services.children')}
                  value={serviceChildId}
                  onChange={(event) => setServiceChildId(event.target.value)}
                  required
                  fullWidth
                  helperText={t('admin.services.childrenNotice')}
                >
                  {serviceChildren.map((con) => (
                    <MenuItem key={con.id} value={String(con.id)}>
                      {con.name}
                      {con.tmsMode === null ? '' : ` · ${con.tmsMode}`}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>
            )}
            {selectedService === undefined ? null : (
              <Typography variant="caption" color="text.secondary">
                {t('orders.create.codePrefixHint', { prefix: selectedService.code })}
              </Typography>
            )}
          </Stack>
        </SectionCard>

        {/* Every block below depends on the chosen service, so none of it is shown
            until one is picked. */}
        {serviceId === '' ? null : (
          <>
            {schemaState.isLoading ? <LinearProgress /> : null}
            {schemaState.errorMessage === null ? null : (
              <Alert severity="error">{schemaState.errorMessage}</Alert>
            )}

            <SectionCard title={t('orders.create.routeSection')} isCollapsible>
              <OrderRouteFields
                value={route}
                onChange={setRoute}
                isProvinceRequired
                hasDomesticOrigin={hasDomesticOrigin}
                hasDomesticDestination={hasDomesticDest}
              />
            </SectionCard>

            {/* Both blocks below belong to the chosen service, so neither exists before
                one is chosen — and a service with no figures of its own hides the block
                rather than showing an empty card. */}
            {schema === null || cargoKeys.length === 0 ? null : (
              <SectionCard title={t('orders.create.cargoSection')} isCollapsible>
                <OrderCargoFields value={cargo} onChange={setCargo} visibleKeys={cargoKeys} />
              </SectionCard>
            )}

            {schema === null || fields.length === 0 ? null : (
              <SectionCard
                title={t('orders.create.serviceFieldsSection', { service: schema.serviceCode })}
                isCollapsible
              >
                <Stack spacing={2}>
                  <Typography variant="body2" color="text.secondary">
                    {t('orders.create.serviceFieldsHint')}
                  </Typography>
                  <ServiceDataFields
                    fields={fields}
                    value={serviceData}
                    onChange={setServiceData}
                    isDisabled={isSubmitting}
                  />
                </Stack>
              </SectionCard>
            )}

            <SectionCard title={t('orders.create.otherSection')} isCollapsible>
              <Stack spacing={2}>
                <Box sx={FIELD_GRID}>
                  <TextField
                    label={t('orders.fields.goodsName')}
                    value={goodsName}
                    onChange={(event) => setGoodsName(event.target.value)}
                    fullWidth
                  />
                  <TextField
                    select
                    label={t('orders.fields.source')}
                    value={source}
                    onChange={(event) => setSource(event.target.value)}
                    fullWidth
                  >
                    <MenuItem value="">{t('common.actions.all')}</MenuItem>
                    {ORDER_SOURCES.map((option) => (
                      <MenuItem key={option} value={option}>
                        {t(ORDER_SOURCE_LABEL_KEY[option])}
                      </MenuItem>
                    ))}
                  </TextField>
                </Box>
                <TextField
                  label={t('orders.fields.note')}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  helperText={t('orders.create.noteHint')}
                  multiline
                  minRows={2}
                  fullWidth
                />
                <Box>
                  <Button component="label" startIcon={<IconPaperclip size={18} />} color="inherit">
                    {t('orders.create.attachFiles')}
                    <input type="file" hidden multiple onChange={handleSelectFiles} />
                  </Button>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                    {files.map((file) => (
                      <Chip
                        key={file.name}
                        label={file.name}
                        size="small"
                        onDelete={() => setFiles(files.filter((item) => item.name !== file.name))}
                      />
                    ))}
                  </Stack>
                </Box>
              </Stack>
            </SectionCard>

          </>
        )}
      </Stack>

      <FormActionBar
        start={
          missingRequired.length === 0 ? undefined : (
            <Typography variant="body2" color="warning.main" noWrap>
              {t('orders.create.missingRequired', { fields: missingRequired.join(', ') })}
            </Typography>
          )
        }
      >
        <Button
          variant="contained"
          startIcon={<IconSend size={18} />}
          disabled={!canSubmit || isSubmitting}
          onClick={() => void handleSubmit()}
        >
          {t('orders.create.submit')}
        </Button>
      </FormActionBar>
    </PageContainer>
  );
}
