import React from 'react';
import { ComputedSalarySlipData, formatVnd } from '../../lib/salaryConfig';
import { X, Printer, Banknote } from 'lucide-react';

interface SalarySlipModalProps {
  data: ComputedSalarySlipData;
  onClose: () => void;
}

const fmtQty = (n: number): string => {
  if (!n || n <= 0) return '-';
  return n.toLocaleString('vi-VN', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
};

const fmtAmt = (n: number): string => {
  if (!n || n === 0) return '-';
  return formatVnd(n);
};

export const SalarySlipModal: React.FC<SalarySlipModalProps> = ({ data, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-[660px] max-h-[92vh] flex flex-col overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Modal Action Bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-slate-800 shrink-0 print:hidden">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-white">
            <Banknote className="w-4 h-4 text-emerald-400" />
            <span>
              Phiếu Lương Tháng {data.month}/{data.year} · {data.fullName} ({data.employeeId})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>In phiếu lương</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              title="Đóng"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Official Slip Sheet */}
        <div className="flex-1 overflow-y-auto overflow-x-auto p-3 sm:p-5 bg-slate-900/60 custom-scrollbar">
          <div className="bg-white text-black mx-auto w-full min-w-[490px] border-2 border-black shadow-xl font-times text-[12px] leading-snug print:shadow-none">
            <table className="w-full border-collapse table-fixed">
              <colgroup>
                <col className="w-[54%]" />
                <col className="w-[21%]" />
                <col className="w-[25%]" />
              </colgroup>
              <tbody>
                {/* Title Row */}
                <tr className="border-b-2 border-black">
                  <td colSpan={3} className="py-2 px-3 text-center font-bold text-[15px] tracking-wide uppercase">
                    BẢNG LƯƠNG THÁNG {data.month}
                  </td>
                </tr>

                {/* Info Rows */}
                <tr className="border-b border-black">
                  <td colSpan={2} className="py-1 px-2 border-r border-black font-bold text-[13px]">
                    Họ và tên/Name:&nbsp;&nbsp;{data.fullName}
                  </td>
                  <td className="py-1 px-2 text-center font-bold text-[13px]">
                    {data.employeeId}
                  </td>
                </tr>
                <tr className="border-b border-black">
                  <td className="py-1 px-2 border-r border-black">Bộ phận/ ca làm việc</td>
                  <td className="py-1 px-2 border-r border-black text-center font-bold">
                    {data.departmentLabel}
                  </td>
                  <td className="py-1 px-2 text-center font-bold">{data.shiftLabel}</td>
                </tr>
                <tr className="border-b-2 border-black">
                  <td className="py-1 px-2 border-r border-black">
                    Tổng lương/ Lương tính bảo hiểm và tăng ca
                  </td>
                  <td className="py-1 px-2 border-r border-black text-right font-bold tabular-nums">
                    {fmtAmt(data.totalSalary)}
                  </td>
                  <td className="py-1 px-2 text-right font-bold tabular-nums">
                    {fmtAmt(data.ovtInsuranceBase)}
                  </td>
                </tr>

                {/* Column Headers */}
                <tr className="border-b border-black font-bold bg-slate-100">
                  <td className="py-1 px-2 border-r border-black">Diễn giải</td>
                  <td className="py-1 px-2 border-r border-black text-center">ĐVT : Số ngày</td>
                  <td className="py-1 px-2 text-right">Thành tiền</td>
                </tr>

                {/* Section I */}
                <tr className="border-b border-black font-bold bg-slate-50">
                  <td className="py-1 px-2 border-r border-black">
                    I/ THU NHẬP TỪ TIỀN CÔNG ( I = 1+2+3)
                  </td>
                  <td className="py-1 px-2 border-r border-black text-right" />
                  <td className="py-1 px-2 text-right tabular-nums">{fmtAmt(data.sectionITotal)}</td>
                </tr>

                {/* Subsection 1 */}
                <tr className="border-b border-black font-bold italic">
                  <td className="py-1 px-2 border-r border-black">
                    1. Thu nhập theo hợp đồng lao động
                  </td>
                  <td className="py-1 px-2 border-r border-black text-right" />
                  <td className="py-1 px-2 text-right tabular-nums not-italic">
                    {fmtAmt(data.section1Total)}
                  </td>
                </tr>

                <tr className="border-b border-black">
                  <td className="py-0.5 px-2 border-r border-black">Lương ngày công</td>
                  <td className="py-0.5 px-2 border-r border-black text-right tabular-nums">
                    {fmtQty(data.workDaysCount)}
                  </td>
                  <td className="py-0.5 px-2 text-right tabular-nums">
                    {fmtAmt(data.workDaySalaryAmount)}
                  </td>
                </tr>
                <tr className="border-b border-black">
                  <td className="py-0.5 px-2 border-r border-black">Lương ngày nghỉ 70%</td>
                  <td className="py-0.5 px-2 border-r border-black text-right tabular-nums">
                    {fmtQty(data.leave70DayCount)}
                  </td>
                  <td className="py-0.5 px-2 text-right tabular-nums">
                    {fmtAmt(data.leave70DayAmount)}
                  </td>
                </tr>
                <tr className="border-b border-black">
                  <td className="py-0.5 px-2 border-r border-black">Trợ cấp chuyên cần</td>
                  <td className="py-0.5 px-2 border-r border-black text-right">
                    {data.isDiligentAchieved
                      ? 'Đạt'
                      : data.workDaysCount > 0
                        ? 'Chưa đạt'
                        : '-'}
                  </td>
                  <td className="py-0.5 px-2 text-right tabular-nums">
                    {fmtAmt(data.attendanceAllowanceAmount)}
                  </td>
                </tr>
                <tr className="border-b border-black">
                  <td className="py-0.5 px-2 border-r border-black">Phụ cấp nhà ở</td>
                  <td className="py-0.5 px-2 border-r border-black text-right tabular-nums">
                    {fmtQty(data.housingAllowanceAmount > 0 ? data.workDaysCount : 0)}
                  </td>
                  <td className="py-0.5 px-2 text-right tabular-nums">
                    {fmtAmt(data.housingAllowanceAmount)}
                  </td>
                </tr>
                <tr className="border-b border-black">
                  <td className="py-0.5 px-2 border-r border-black">Phụ cấp đời sống</td>
                  <td className="py-0.5 px-2 border-r border-black text-right tabular-nums">
                    {fmtQty(data.livingAllowanceAmount > 0 ? data.workDaysCount : 0)}
                  </td>
                  <td className="py-0.5 px-2 text-right tabular-nums">
                    {fmtAmt(data.livingAllowanceAmount)}
                  </td>
                </tr>
                <tr className="border-b border-black">
                  <td className="py-0.5 px-2 border-r border-black">Phụ cấp ngôn ngữ</td>
                  <td className="py-0.5 px-2 border-r border-black text-right tabular-nums">
                    {fmtQty(data.languageAllowanceAmount > 0 ? data.workDaysCount : 0)}
                  </td>
                  <td className="py-0.5 px-2 text-right tabular-nums">
                    {fmtAmt(data.languageAllowanceAmount)}
                  </td>
                </tr>
                <tr className="border-b border-black">
                  <td className="py-0.5 px-2 border-r border-black">Phụ cấp chức vụ</td>
                  <td className="py-0.5 px-2 border-r border-black text-right tabular-nums">
                    {fmtQty(data.positionAllowanceAmount > 0 ? data.workDaysCount : 0)}
                  </td>
                  <td className="py-0.5 px-2 text-right tabular-nums">
                    {fmtAmt(data.positionAllowanceAmount)}
                  </td>
                </tr>
                <tr className="border-b border-black">
                  <td className="py-0.5 px-2 border-r border-black">Phụ cấp thâm niên</td>
                  <td className="py-0.5 px-2 border-r border-black text-right tabular-nums">
                    {fmtQty(data.seniorityAllowanceAmount > 0 ? data.workDaysCount : 0)}
                  </td>
                  <td className="py-0.5 px-2 text-right tabular-nums">
                    {fmtAmt(data.seniorityAllowanceAmount)}
                  </td>
                </tr>
                <tr className="border-b border-black">
                  <td className="py-0.5 px-2 border-r border-black">Trợ cấp công đoạn</td>
                  <td className="py-0.5 px-2 border-r border-black text-right tabular-nums">
                    {fmtQty(data.processAllowanceAmount > 0 ? data.workDaysCount : 0)}
                  </td>
                  <td className="py-0.5 px-2 text-right tabular-nums">
                    {fmtAmt(data.processAllowanceAmount)}
                  </td>
                </tr>
                <tr className="border-b border-black">
                  <td className="py-0.5 px-2 border-r border-black">Trợ cấp thu hút</td>
                  <td className="py-0.5 px-2 border-r border-black text-right tabular-nums">
                    {fmtQty(data.attractionAllowanceAmount > 0 ? data.workDaysCount : 0)}
                  </td>
                  <td className="py-0.5 px-2 text-right tabular-nums">
                    {fmtAmt(data.attractionAllowanceAmount)}
                  </td>
                </tr>
                <tr className="border-b border-black">
                  <td className="py-0.5 px-2 border-r border-black">Trợ cấp phòng sạch</td>
                  <td className="py-0.5 px-2 border-r border-black text-right tabular-nums">
                    {fmtQty(data.cleanroomAllowanceAmount > 0 ? data.workDaysCount : 0)}
                  </td>
                  <td className="py-0.5 px-2 text-right tabular-nums">
                    {fmtAmt(data.cleanroomAllowanceAmount)}
                  </td>
                </tr>
                <tr className="border-b border-black">
                  <td className="py-0.5 px-2 border-r border-black">Trợ cấp điện thoại</td>
                  <td className="py-0.5 px-2 border-r border-black text-right tabular-nums">
                    {fmtQty(data.phoneAllowanceAmount > 0 ? data.workDaysCount : 0)}
                  </td>
                  <td className="py-0.5 px-2 text-right tabular-nums">
                    {fmtAmt(data.phoneAllowanceAmount)}
                  </td>
                </tr>
                <tr className="border-b border-black">
                  <td className="py-0.5 px-2 border-r border-black">
                    Ngày nghỉ nguyên lương (phép,lễ,hiếu,hỷ)
                  </td>
                  <td className="py-0.5 px-2 border-r border-black text-right tabular-nums">
                    {fmtQty(data.paidLeaveDays)}
                  </td>
                  <td className="py-0.5 px-2 text-right tabular-nums">
                    {fmtAmt(data.paidLeaveAmount)}
                  </td>
                </tr>
                <tr className="border-b border-black">
                  <td className="py-0.5 px-2 border-r border-black">Số ngày phép còn lại</td>
                  <td className="py-0.5 px-2 border-r border-black text-right tabular-nums">
                    {fmtQty(data.remainingLeaveDays)}
                  </td>
                  <td className="py-0.5 px-2 text-right tabular-nums">-</td>
                </tr>
                <tr className="border-b border-black">
                  <td className="py-0.5 px-2 border-r border-black">Nghỉ không hưởng lương</td>
                  <td className="py-0.5 px-2 border-r border-black text-right tabular-nums">
                    {fmtQty(data.unpaidLeaveDays)}
                  </td>
                  <td className="py-0.5 px-2 text-right tabular-nums">-</td>
                </tr>
                <tr className="border-b border-black">
                  <td className="py-0.5 px-2 border-r border-black">
                    Thanh toán phép tồn khi nghỉ việc
                  </td>
                  <td className="py-0.5 px-2 border-r border-black text-right tabular-nums">-</td>
                  <td className="py-0.5 px-2 text-right tabular-nums">
                    {fmtAmt(data.unusedLeaveSettlementAmount)}
                  </td>
                </tr>

                {/* Subsection 2 */}
                <tr className="border-b border-black font-bold">
                  <td className="py-1 px-2 border-r border-black italic">
                    2. Tăng ca + PC ca đêm
                  </td>
                  <td className="py-1 px-2 border-r border-black text-center">ĐVT : Số giờ</td>
                  <td className="py-1 px-2 text-right tabular-nums">{fmtAmt(data.section2Total)}</td>
                </tr>

                <tr className="border-b border-black">
                  <td className="py-0.5 px-2 border-r border-black">Nghỉ 70% lương</td>
                  <td className="py-0.5 px-2 border-r border-black text-right tabular-nums">
                    {fmtQty(data.leave70Hours)}
                  </td>
                  <td className="py-0.5 px-2 text-right tabular-nums">
                    {fmtAmt(data.leave70HoursAmount)}
                  </td>
                </tr>
                <tr className="border-b border-black">
                  <td className="py-0.5 px-2 border-r border-black">Trợ cấp ca đêm 30%</td>
                  <td className="py-0.5 px-2 border-r border-black text-right tabular-nums">
                    {fmtQty(data.regularNightHours)}
                  </td>
                  <td className="py-0.5 px-2 text-right tabular-nums">
                    {fmtAmt(data.nightShift30Amount)}
                  </td>
                </tr>
                <tr className="border-b border-black">
                  <td className="py-0.5 px-2 border-r border-black">Tăng ca đêm (195%)</td>
                  <td className="py-0.5 px-2 border-r border-black text-right tabular-nums">
                    {fmtQty(data.otNight195Hours)}
                  </td>
                  <td className="py-0.5 px-2 text-right tabular-nums">
                    {fmtAmt(data.otNight195Amount)}
                  </td>
                </tr>
                <tr className="border-b border-black">
                  <td className="py-0.5 px-2 border-r border-black">Tăng ca đêm (215%)</td>
                  <td className="py-0.5 px-2 border-r border-black text-right tabular-nums">
                    {fmtQty(data.otNightHours)}
                  </td>
                  <td className="py-0.5 px-2 text-right tabular-nums">
                    {fmtAmt(data.otNight215Amount)}
                  </td>
                </tr>
                <tr className="border-b border-black">
                  <td className="py-0.5 px-2 border-r border-black">Tăng ca 150%</td>
                  <td className="py-0.5 px-2 border-r border-black text-right tabular-nums">
                    {fmtQty(data.otDayHours)}
                  </td>
                  <td className="py-0.5 px-2 text-right tabular-nums">
                    {fmtAmt(data.otDay150Amount)}
                  </td>
                </tr>
                <tr className="border-b border-black">
                  <td className="py-0.5 px-2 border-r border-black">Ngày chủ nhật (200%)</td>
                  <td className="py-0.5 px-2 border-r border-black text-right tabular-nums">
                    {fmtQty(data.otSundayDayHours)}
                  </td>
                  <td className="py-0.5 px-2 text-right tabular-nums">
                    {fmtAmt(data.otSundayDay200Amount)}
                  </td>
                </tr>
                <tr className="border-b border-black">
                  <td className="py-0.5 px-2 border-r border-black">Đêm chủ nhật (270%)</td>
                  <td className="py-0.5 px-2 border-r border-black text-right tabular-nums">
                    {fmtQty(data.otSundayNightHours)}
                  </td>
                  <td className="py-0.5 px-2 text-right tabular-nums">
                    {fmtAmt(data.otSundayNight270Amount)}
                  </td>
                </tr>
                <tr className="border-b border-black">
                  <td className="py-0.5 px-2 border-r border-black">Ngày lễ (300%)</td>
                  <td className="py-0.5 px-2 border-r border-black text-right tabular-nums">
                    {fmtQty(data.otHolidayDayHours)}
                  </td>
                  <td className="py-0.5 px-2 text-right tabular-nums">
                    {fmtAmt(data.otHolidayDay300Amount)}
                  </td>
                </tr>
                <tr className="border-b border-black">
                  <td className="py-0.5 px-2 border-r border-black">Đêm ngày lễ (390%)</td>
                  <td className="py-0.5 px-2 border-r border-black text-right tabular-nums">
                    {fmtQty(data.otHolidayNightHours)}
                  </td>
                  <td className="py-0.5 px-2 text-right tabular-nums">
                    {fmtAmt(data.otHolidayNight390Amount)}
                  </td>
                </tr>

                {/* Subsection 3 */}
                <tr className="border-b border-black font-bold italic">
                  <td className="py-1 px-2 border-r border-black">
                    3. Thu nhập ngoài hợp đồng lao động (Ngoài lương chính)
                  </td>
                  <td className="py-1 px-2 border-r border-black text-right" />
                  <td className="py-1 px-2 text-right tabular-nums not-italic">
                    {fmtAmt(data.section3Total)}
                  </td>
                </tr>
                <tr className="border-b border-black">
                  <td className="py-0.5 px-2 border-r border-black">
                    {data.otMealUnitRate > 0
                      ? `Trợ cấp tiền ăn tăng ca (${formatVnd(data.otMealUnitRate)}đ/buổi sau 6h)`
                      : 'Trợ cấp tiền ăn tăng ca (theo cấu hình lương)'}
                  </td>
                  <td className="py-0.5 px-2 border-r border-black text-right tabular-nums">
                    {data.otMealDays > 0 ? `${fmtQty(data.otMealDays)} buổi` : '-'}
                  </td>
                  <td className="py-0.5 px-2 text-right tabular-nums">
                    {fmtAmt(data.otMealAllowanceAmount)}
                  </td>
                </tr>
                <tr className="border-b border-black">
                  <td className="py-0.5 px-2 border-r border-black">
                    Phụ cấp hiếu hỷ ({data.hasBereavementOrWeddingCase ? data.bereavementWeddingCaseLabel : 'Nghỉ cưới / Người nhà mất'})
                  </td>
                  <td className="py-0.5 px-2 border-r border-black text-right tabular-nums">
                    {data.hasBereavementOrWeddingCase
                      ? `${fmtQty(data.bereavementWeddingDays)} ngày`
                      : data.bereavementWeddingConfiguredAmount > 0
                        ? 'Chưa phát sinh'
                        : '-'}
                  </td>
                  <td className="py-0.5 px-2 text-right tabular-nums">
                    {fmtAmt(data.bereavementWeddingAmount)}
                  </td>
                </tr>
                <tr className="border-b border-black">
                  <td className="py-0.5 px-2 border-r border-black">Trợ cấp con nhỏ</td>
                  <td className="py-0.5 px-2 border-r border-black text-right" />
                  <td className="py-0.5 px-2 text-right tabular-nums">
                    {fmtAmt(data.childcareAllowanceAmount)}
                  </td>
                </tr>
                <tr className="border-b border-black">
                  <td className="py-0.5 px-2 border-r border-black">
                    Thưởng năng suất,cải tiến
                  </td>
                  <td className="py-0.5 px-2 border-r border-black text-right" />
                  <td className="py-0.5 px-2 text-right tabular-nums">
                    {fmtAmt(data.productivityBonusAmount)}
                  </td>
                </tr>
                <tr className="border-b border-black">
                  <td className="py-0.5 px-2 border-r border-black">
                    Trợ cấp soi kính và setting máy
                  </td>
                  <td className="py-0.5 px-2 border-r border-black text-right" />
                  <td className="py-0.5 px-2 text-right tabular-nums">
                    {fmtAmt(data.scopeSettingAllowanceAmount)}
                  </td>
                </tr>

                {/* Section II */}
                <tr className="border-b border-black font-bold bg-slate-50">
                  <td className="py-1 px-2 border-r border-black">
                    II/ BẢO HIỂM ,CÔNG ĐOÀN CÁ NHÂN ĐÓNG
                  </td>
                  <td className="py-1 px-2 border-r border-black text-right" />
                  <td className="py-1 px-2 text-right tabular-nums">{fmtAmt(data.sectionIITotal)}</td>
                </tr>
                <tr className="border-b border-black">
                  <td className="py-0.5 px-2 border-r border-black">
                    BHXH + BHYT + BHTN (10.5%)
                  </td>
                  <td className="py-0.5 px-2 border-r border-black text-right" />
                  <td className="py-0.5 px-2 text-right tabular-nums">
                    {fmtAmt(data.socialInsuranceAmount)}
                  </td>
                </tr>
                <tr className="border-b border-black">
                  <td className="py-0.5 px-2 border-r border-black">Công đoàn phí</td>
                  <td className="py-0.5 px-2 border-r border-black text-right" />
                  <td className="py-0.5 px-2 text-right tabular-nums">
                    {fmtAmt(data.unionFeeAmount)}
                  </td>
                </tr>

                {/* Section III */}
                <tr className="border-b border-black font-bold bg-slate-50">
                  <td className="py-1 px-2 border-r border-black">
                    {data.pitThreshold > 0 ? 'III. THUẾ TNCN (10%)' : 'III. THUẾ TNCN'}
                  </td>
                  <td className="py-1 px-2 border-r border-black text-right" />
                  <td className="py-1 px-2 text-right tabular-nums">
                    {fmtAmt(data.personalIncomeTaxAmount)}
                  </td>
                </tr>

                {/* Section IV */}
                <tr className="border-b border-black font-bold bg-slate-50">
                  <td className="py-1 px-2 border-r border-black">IV: CÁC KHOẢN TRỪ</td>
                  <td className="py-1 px-2 border-r border-black text-center">ĐVT : Số giờ</td>
                  <td className="py-1 px-2 text-right tabular-nums">{fmtAmt(data.sectionIVTotal)}</td>
                </tr>
                <tr className="border-b border-black">
                  <td className="py-0.5 px-2 border-r border-black">
                    Đi muộn,về sớm, ra ngoài
                  </td>
                  <td className="py-0.5 px-2 border-r border-black text-right tabular-nums">
                    {fmtQty(data.lateEarlyHours)}
                  </td>
                  <td className="py-0.5 px-2 text-right tabular-nums">
                    {fmtAmt(data.lateEarlyAmount)}
                  </td>
                </tr>
                <tr className="border-b border-black">
                  <td className="py-0.5 px-2 border-r border-black">&nbsp;Phạt nghỉ không phép</td>
                  <td className="py-0.5 px-2 border-r border-black text-right tabular-nums">
                    {fmtQty(data.unexcusedFineHours)}
                  </td>
                  <td className="py-0.5 px-2 text-right tabular-nums">
                    {fmtAmt(data.unexcusedFineAmount)}
                  </td>
                </tr>
                <tr className="border-b border-black">
                  <td className="py-0.5 px-2 border-r border-black">Làm mất, rách đồng phục</td>
                  <td className="py-0.5 px-2 border-r border-black text-right" />
                  <td className="py-0.5 px-2 text-right tabular-nums">
                    {fmtAmt(data.uniformDeductionAmount)}
                  </td>
                </tr>
                <tr className="border-b border-black">
                  <td className="py-0.5 px-2 border-r border-black">Vi phạm hợp đồng</td>
                  <td className="py-0.5 px-2 border-r border-black text-right" />
                  <td className="py-0.5 px-2 text-right tabular-nums">
                    {fmtAmt(data.contractViolationAmount)}
                  </td>
                </tr>

                {/* Section V */}
                <tr className="border-b border-black font-bold bg-emerald-50">
                  <td className="py-1.5 px-2 border-r border-black">
                    V/ THỰC LĨNH ( V = I - II - III - IV )
                  </td>
                  <td className="py-1.5 px-2 border-r border-black text-right" />
                  <td className="py-1.5 px-2 text-right tabular-nums text-[13px] text-emerald-900">
                    {fmtAmt(data.netSalaryAmount)}
                  </td>
                </tr>

                {/* Business Trip */}
                <tr className="border-b border-black font-bold">
                  <td className="py-1 px-2 border-r border-black">Công tác</td>
                  <td className="py-1 px-2 border-r border-black text-right" />
                  <td className="py-1 px-2 text-right tabular-nums">
                    {fmtAmt(data.businessTripAmount)}
                  </td>
                </tr>

                {/* Bottom Note */}
                <tr>
                  <td colSpan={3} className="py-1.5 px-2 italic text-[11px] leading-snug">
                    Ghi chú: Không tiết lộ lương của mình. CBCNV có vấn đề thắc mắc về giờ công,
                    tiền lương xin liên hệ về phòng nhân sự trước 12h ngày {data.deadlineDateText}.
                    Sau thời gian trên phòng nhân sự sẽ không giải quyết
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
