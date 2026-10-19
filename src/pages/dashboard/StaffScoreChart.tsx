import type { ReactNode } from 'react';
import type { ApexOptions } from 'apexcharts';
import Chart from 'react-apexcharts';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/components/EmptyState';
import { brandColors } from '@/theme';
import type { StaffScore } from '@/types/pricing';

const TIEN = new Intl.NumberFormat('vi-VN');

/**
 * MỘT màu cho cả hai biểu đồ, không phải mỗi biểu đồ một màu.
 *
 * Mỗi biểu đồ chỉ có một chuỗi số liệu, tức là nó đo ĐỘ LỚN chứ không phân
 * biệt danh tính — việc của màu ở đây chỉ là làm cái cột hiện lên. Tô hai màu
 * khác nhau là ngầm nói hai biểu đồ thuộc hai loại khác nhau, trong khi thứ
 * phân biệt chúng đã là tiêu đề và đơn vị trên trục.
 *
 * #FF5A00 đã chạy qua bộ kiểm màu: đủ tương phản với nền trắng, nằm trong dải
 * sáng cho phép, đủ độ bão hoà.
 */
const MAU = brandColors.orange;

export type ChiSo = 'revenue' | 'conversionRate';

export interface StaffScoreChartProps {
  rows: StaffScore[];
  /** Vẽ cột theo chỉ số nào. Hai chỉ số khác đơn vị nên KHÔNG chung một trục. */
  chiSo: ChiSo;
  emptyTitle: string;
}

/**
 * Cột ngang so sánh từng người theo MỘT chỉ số.
 *
 * Vì sao tách thành hai biểu đồ thay vì một biểu đồ hai trục: doanh thu tính
 * bằng đồng, tỷ lệ chuyển đổi tính bằng phần trăm. Nhét hai thang đo lên cùng
 * một khung là cách nhanh nhất để đọc ra một mối liên hệ không có thật — hai
 * đường cắt nhau ở đâu là do người vẽ chọn thang, không phải do số liệu.
 *
 * Cột NGANG chứ không dọc: nhãn là tên người, và tên người viết ngang thì đọc
 * được, còn xoay nghiêng 45° thì không.
 */
export function StaffScoreChart({ rows, chiSo, emptyTitle }: StaffScoreChartProps): ReactNode {
  const { t } = useTranslation();
  if (rows.length === 0) return <EmptyState title={emptyTitle} />;

  const laTien = chiSo === 'revenue';
  const soLieu = rows.map((r) => (laTien ? r.revenue : r.conversionRate));

  const options: ApexOptions = {
    chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit' },
    colors: [MAU],
    // ĐỘ MỜ 1, không để mặc định 0.85 của ApexCharts: pha 15% nền trắng vào
    // #FF5A00 ra #FF7326, và tương phản với nền tụt từ 3,4:1 xuống 2,72:1 —
    // dưới ngưỡng đọc được. Màu đã kiểm thì phải tô đúng màu đó.
    fill: { opacity: 1 },
    plotOptions: {
      bar: {
        horizontal: true,
        // Cột mảnh, đầu cột bo 4px. Dày và đặc thì cả khối đọc ra ồn ào.
        barHeight: '52%',
        borderRadius: 4,
        borderRadiusApplication: 'end',
        dataLabels: { position: 'top' },
      },
    },
    dataLabels: {
      enabled: true,
      // Nhãn nằm NGOÀI đầu cột: để bên trong thì cột ngắn sẽ cắt mất chữ, và
      // chữ trắng trên nền trắng thì biến mất hẳn.
      offsetX: 34,
      textAnchor: 'start',
      style: { fontSize: '12px', fontWeight: 600, colors: [brandColors.ink] },
      formatter: (v: number) => (v === null ? '' : laTien ? TIEN.format(v) : `${v}%`),
    },
    // Lưới kẻ liền, một sắc độ so với nền. Kẻ đứt đọc ra như một ngưỡng nào đó.
    grid: {
      borderColor: brandColors.lineSoft,
      strokeDashArray: 0,
      xaxis: { lines: { show: true } },
      yaxis: { lines: { show: false } },
      // Chừa chỗ cho nhãn ở đầu cột, nếu không nó tràn ra ngoài khung.
      padding: { right: 72 },
    },
    xaxis: {
      categories: rows.map((r) => r.fullName),
      max: laTien ? undefined : 100,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        style: { fontSize: '12px', colors: brandColors.muted },
        formatter: (v: string) => {
          const n = Number(v);
          if (!Number.isFinite(n)) return v;
          if (!laTien) return `${Math.round(n)}%`;
          // Trục tiền rút gọn: '1,2 tỷ' đọc nhanh hơn '1.200.000.000'.
          if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(1)} tỷ`;
          if (Math.abs(n) >= 1e6) return `${Math.round(n / 1e6)} tr`;
          return TIEN.format(n);
        },
      },
    },
    yaxis: { labels: { style: { fontSize: '13px', colors: brandColors.ink } } },
    legend: { show: false },
    states: { active: { filter: { type: 'none' } } },
    tooltip: {
      // Tooltip nói ĐỦ sáu con số, không chỉ con số đang vẽ: người xem bảng
      // đánh giá bao giờ cũng hỏi tiếp "bao nhiêu đơn" ngay sau khi thấy cột.
      custom: ({ dataPointIndex }: { dataPointIndex: number }) => {
        const r = rows[dataPointIndex];
        if (r === undefined) return '';
        const dong = (nhan: string, gt: string): string =>
          `<div style="display:flex;gap:12px;justify-content:space-between">
             <span style="color:${brandColors.muted}">${nhan}</span>
             <b>${gt}</b>
           </div>`;
        return `<div style="padding:10px 12px;font-size:12px;min-width:200px">
          <div style="font-weight:700;margin-bottom:6px">${r.fullName}</div>
          ${dong(t('scorecard.orderCount'), String(r.orderCount))}
          ${dong(t('scorecard.decidedCount'), String(r.decidedCount))}
          ${dong(t('scorecard.closedCount'), String(r.closedCount))}
          ${dong(t('scorecard.quotedTotal'), TIEN.format(r.quotedTotal))}
          ${dong(t('scorecard.revenue'), TIEN.format(r.revenue))}
          ${dong(
            t('scorecard.conversionRate'),
            r.conversionRate === null ? t('scorecard.noRate') : `${r.conversionRate}%`,
          )}
        </div>`;
      },
    },
  };

  return (
    <Chart
      type="bar"
      // Chiều cao theo số dòng, cộng dải nhãn trục dưới. Cố định một con số
      // thì khung sinh ra một thanh cuộn tí hon khi đủ người.
      height={Math.max(180, rows.length * 46 + 56)}
      options={options}
      series={[{ name: laTien ? t('scorecard.revenue') : t('scorecard.conversionRate'), data: soLieu }]}
    />
  );
}
