import { useState } from 'react';
import type { ReactNode } from 'react';
import { Alert, Button, Chip, Stack, TextField, Typography } from '@mui/material';
import { IconSend } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from 'notistack';
import dayjs from 'dayjs';
import { CurrencyAmountField } from '@/components/CurrencyAmountField';
import { BangGiaNiemYet } from './BangGiaNiemYet';
import { DateField } from '@/components/form/DateField';
import { SectionCard } from '@/components/SectionCard';
import { submitQuote } from '@/services/quoteService';
import { formatDate } from '@/utils/formatters';
import type { OrderDepartment, OrderDetail } from '@/types/order';
import { describeError } from '@/services/apiClient';
import { QuoteHistoryList } from './QuoteHistoryList';
import { ReferencePriceTable } from './ReferencePriceTable';
import { useGiaNiemYet } from './useGiaNiemYet';

export interface DepartmentQuotePanelProps {
  order: OrderDetail;
  departmentRow: OrderDepartment;
  onSubmitted: () => void;
}

/** `<input type="date">` accepts only `YYYY-MM-DD`, while the API returns a full timestamp. */
function toDateInputValue(value: string | null): string {
  if (value === null) return '';
  return value.slice(0, 10);
}

export function DepartmentQuotePanel({
  order,
  departmentRow,
  onSubmitted,
}: DepartmentQuotePanelProps): ReactNode {
  const { t } = useTranslation();
  const { enqueueSnackbar } = useSnackbar();

  const [amount, setAmount] = useState<number | null>(departmentRow.amount);
  const [scopeNote, setScopeNote] = useState(departmentRow.scopeNote ?? '');
  const [leadTime, setLeadTime] = useState(departmentRow.leadTime ?? '');
  const [validUntil, setValidUntil] = useState(toDateInputValue(departmentRow.validUntil));
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Giá niêm yết của tuyến này — chỉ là GỢI Ý, không điền sẵn.
   *
   * Trước đây ô tiền tự điền con số niêm yết. Bỏ hẳn: bảng giá là một cái mốc
   * chung, còn mỗi đơn có lý do riêng — điền sẵn là đẩy người báo giá về phía
   * một con số họ chưa kịp cân nhắc, và không ai biết con số cuối là họ chọn
   * hay hệ thống chọn hộ.
   *
   * Tra theo CẶP ĐỊA ĐIỂM, và chỉ khi ĐỦ CẢ HAI ĐẦU.
   *
   * Trước đây tra theo cặp TỈNH, vì đơn khai tỉnh còn bảng giá khoá theo địa
   * điểm. Cách đó hỏng hẳn sau sáp nhập 2025: Quảng Nam đã nhập vào Đà Nẵng,
   * nên "Đà Nẵng → Tam Kỳ" thành tuyến nội tỉnh và một cặp tỉnh gộp luôn cả
   * miền Trung — khoảng giá trả về rộng tới mức vô nghĩa. Giờ đơn chọn địa
   * điểm hai cấp (tỉnh rồi địa chỉ) nên hỏi thẳng được đúng cặp.
   *
   * MỘT tuyến có nhiều mức giá, mỗi đơn vị tính một mức. Hiện cả bảng chứ
   * không chọn hộ một con số: người báo giá mới là người biết lô này đi loại
   * xe nào.
   *
   * Bảng giá không có tuyến này thì KHÔNG hiện gì cả — im lặng đúng hơn là một
   * dòng "không có giá niêm yết" mà người đọc chẳng làm gì được.
   *
   * NHƯNG chưa chọn địa chỉ thì KHÁC, và phải nói ra. Ô địa chỉ không bắt
   * buộc, nên thực tế đo được là 24/25 đơn bỏ trống nó — và vì tra giá cần đủ
   * cả cặp, cả tính năng gợi ý im lặng suốt, trông y như hỏng. Ở đây người đọc
   * làm được một việc rõ ràng: mở "Sửa đơn" rồi chọn địa chỉ.
   *
   * Tra hỏng cũng im lặng: không có gợi ý vẫn nhập tay bình thường, còn chặn ô
   * nhập vì một danh mục phụ là mất việc chính.
   */
  const goiY = useGiaNiemYet(order.id);

  // A field left out of the request keeps its stored value, but the form still
  // prefills every field: the department is editing its quote, not patching it.
  const hasExistingQuote = departmentRow.quoteVersion > 0;
  const nextVersion = departmentRow.quoteVersion + 1;

  const handleSubmit = async (): Promise<void> => {
    if (amount === null || amount < 1) {
      enqueueSnackbar(t('quotes.form.amountRequired'), { variant: 'warning' });
      return;
    }
    setIsSubmitting(true);
    try {
      await submitQuote(order.id, departmentRow.departmentId, {
        amount,
        ...(scopeNote.trim() === '' ? {} : { scopeNote: scopeNote.trim() }),
        ...(leadTime.trim() === '' ? {} : { leadTime: leadTime.trim() }),
        ...(validUntil === '' ? {} : { validUntil }),
      });
      onSubmitted();
      enqueueSnackbar(t('quotes.form.submitted', { version: nextVersion }), {
        variant: 'success',
      });
    } catch (error) {
      enqueueSnackbar(describeError(error), { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SectionCard
      title={t('quotes.form.title', { department: departmentRow.departmentName })}
      subtitle={
        hasExistingQuote
          ? t('quotes.form.updateHint', {
              current: departmentRow.quoteVersion,
              next: nextVersion,
            })
          : t('quotes.form.firstHint')
      }
      action={
        hasExistingQuote ? <Chip size="small" label={`v${departmentRow.quoteVersion}`} /> : null
      }
    >
      <Stack spacing={2.5}>
        <Stack spacing={1}>
          <Typography variant="subtitle2">{t('quotes.reference.title')}</Typography>
          <ReferencePriceTable orderId={order.id} />
        </Stack>

        {hasExistingQuote ? (
          <Stack spacing={1}>
            <Alert severity="info">
              {t('quotes.form.currentVersion', {
                version: departmentRow.quoteVersion,
                validUntil: formatDate(departmentRow.validUntil),
              })}
            </Alert>
            <QuoteHistoryList
              orderId={order.id}
              departmentId={departmentRow.departmentId}
              currentVersion={departmentRow.quoteVersion}
            />
          </Stack>
        ) : null}

        <CurrencyAmountField
          label={t('quotes.form.amount')}
          value={amount}
          onChange={setAmount}
          helperText={t('quotes.form.amountHint')}
          isRequired
          isDisabled={isSubmitting}
        />

        {/* Giá đề xuất của ĐÚNG tuyến này, ngay dưới ô tiền. Không nhét vào
            helperText: một tuyến có tới 8 mức, không đọc nổi trong một dòng
            chữ nhỏ. Không điền sẵn vào ô: bấm một mức thì mới điền, để con số
            cuối cùng luôn là người báo giá chọn. */}
        {order.originLocationId === null || order.destinationLocationId === null ? (
          <Typography variant="caption" color="text.secondary">
            {t('quotes.form.listedNeedsAddress')}
          </Typography>
        ) : (
          <BangGiaNiemYet gia={goiY} onChon={setAmount} />
        )}

        <TextField
          label={t('orders.detail.scopeNote')}
          value={scopeNote}
          onChange={(event) => setScopeNote(event.target.value)}
          helperText={t('quotes.form.scopeNoteHint')}
          multiline
          minRows={2}
          fullWidth
          disabled={isSubmitting}
        />

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            label={t('orders.detail.leadTime')}
            value={leadTime}
            onChange={(event) => setLeadTime(event.target.value)}
            placeholder={t('quotes.form.leadTimePlaceholder')}
            fullWidth
            disabled={isSubmitting}
          />
          <DateField
            label={t('orders.detail.validUntil')}
            value={validUntil}
            onChange={setValidUntil}
            minDate={dayjs().format('YYYY-MM-DD')}
            isDisabled={isSubmitting}
          />
        </Stack>

        <Stack direction="row">
          <Button
            variant="contained"
            startIcon={<IconSend size={18} />}
            disabled={isSubmitting}
            onClick={() => void handleSubmit()}
          >
            {hasExistingQuote ? t('quotes.form.resubmit') : t('quotes.form.submit')}
          </Button>
        </Stack>
      </Stack>
    </SectionCard>
  );
}
