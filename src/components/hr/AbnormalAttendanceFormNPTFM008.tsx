import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal, flushSync } from 'react-dom';
import {
  AttendanceCorrectionRequest,
  StaffRecord,
} from '../../types';
import {
  AlertTriangle,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  History,
  Lock,
  Printer,
  RefreshCw,
  Search,
  Send,
  X,
  AlertCircle,
} from 'lucide-react';

export interface NPTFM008FormData {
  employeeId: string;
  fullName: string;
  department?: string;
  dateStr: string; // "DD/MM/YYYY" or "YYYY-MM-DD"
  checkInChecked: boolean;
  inTime: string;
  checkOutChecked: boolean;
  outTime: string;
  reasonCategory: 'SYSTEM' | 'PERSONAL';
  reason: string;
  monthlyCount: number;
}

export interface AbnormalAttendanceSourceContext {
  staff: StaffRecord;
  dateStr: string; // "DD/MM/YYYY"
  dayOfWeek: string;
  shift: 'DAY' | 'NIGHT';
  bcInTime: string;
  bcOutTime: string;
  bcOtHours: number;
  rawInTime: string;
  rawOutTime: string;
  mqtInTime: string;
  mqtOutTime: string;
  discrepancyType: string;
  discrepancyLabel: string;
  discrepancyDetail: string;
  sourceMode?: 'MQT' | 'QR' | 'FACE';
}

function formatDateDisplayVN(dateVal?: string): string {
  if (!dateVal) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateVal)) {
    const [y, m, d] = dateVal.split('-');
    return `${d}/${m}/${y}`;
  }
  return dateVal;
}

export function getMonthKeyFromDate(dateVal?: string): string {
  if (!dateVal) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateVal)) {
    return dateVal.slice(0, 7); // YYYY-MM
  }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateVal)) {
    const [d, m, y] = dateVal.split('/');
    void d;
    return `${y}-${m}`;
  }
  return '';
}

function escapeHtml(val?: string | number): string {
  return String(val ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function downloadPrintableHtmlNPTFM008(data: NPTFM008FormData): void {
  const displayDate = formatDateDisplayVN(data.dateStr);
  const inChecked = data.checkInChecked ? '✓' : '';
  const outChecked = data.checkOutChecked ? '✓' : '';
  const sysChecked = data.reasonCategory === 'SYSTEM' ? '✓' : '';
  const perChecked = data.reasonCategory === 'PERSONAL' ? '✓' : '';
  const countText = data.monthlyCount > 0 ? `${data.monthlyCount} lần` : '';

  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <title>Phiếu Xác Nhận Chấm Công Bất Thường - ${escapeHtml(data.fullName || data.employeeId || 'NPT-FM-008')}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 16px;
      background: #fff;
      color: #000;
      font-family: "Times New Roman", Times, serif;
      font-size: 12px;
    }
    .sheet { max-width: 760px; margin: 0 auto; border: 1.5px solid #000; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    td, th { border: 1px solid #000; padding: 4px 6px; vertical-align: middle; }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .cb {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 15px;
      height: 15px;
      border: 1.5px solid #000;
      font-size: 12px;
      font-weight: bold;
      margin-right: 6px;
      vertical-align: middle;
    }
    .diag {
      position: relative;
      height: 32px;
      overflow: hidden;
    }
    .diag svg {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
    }
    .sig-row { height: 74px; vertical-align: bottom; text-align: center; font-size: 11px; }
    .notes { padding: 6px 8px; font-size: 11px; line-height: 1.45; }
  </style>
</head>
<body>
  <div class="sheet">
    <table>
      <colgroup>
        <col style="width:17%" />
        <col style="width:13%" />
        <col style="width:20%" />
        <col style="width:18%" />
        <col style="width:14%" />
        <col style="width:18%" />
      </colgroup>
      <tbody>
        <!-- HEADER -->
        <tr>
          <td rowspan="3" class="center">
            <svg width="80" height="44" viewBox="0 0 100 52" xmlns="http://www.w3.org/2000/svg">
              <polygon points="50,3 5,26 50,49" fill="#24338f" />
              <polygon points="50,3 95,26 50,49" fill="#ff6600" />
              <text x="37" y="33" text-anchor="middle" fill="#fff" font-size="22" font-family="Times New Roman, serif" font-weight="bold">P</text>
              <text x="63" y="33" text-anchor="middle" fill="#fff" font-size="22" font-family="Times New Roman, serif" font-weight="bold">T</text>
            </svg>
          </td>
          <td rowspan="3" colspan="3" class="center bold" style="font-size:15px;line-height:1.35;">
            <div>PHIẾU XÁC NHẬN CHẤM CÔNG BẤT THƯỜNG</div>
            <div>근태 오류 확인 신청서</div>
          </td>
          <td class="bold" style="font-size:11px;">Form No.</td>
          <td class="center" style="font-size:11px;">NPT-FM-008</td>
        </tr>
        <tr>
          <td class="bold" style="font-size:11px;">Dated</td>
          <td class="center" style="font-size:11px;">01/06/2020</td>
        </tr>
        <tr>
          <td class="bold" style="font-size:11px;">Revision</td>
          <td class="center" style="font-size:11px;">001</td>
        </tr>

        <!-- HỌ TÊN & MÃ NV -->
        <tr>
          <td class="bold">Họ tên/성명</td>
          <td colspan="2" class="bold center" style="text-transform:uppercase;font-size:13px;">${escapeHtml(data.fullName)}</td>
          <td class="bold">Mã NV/사원 번호</td>
          <td colspan="2" class="bold center" style="font-size:13px;">${escapeHtml(data.employeeId)}</td>
        </tr>

        <!-- NGÀY THÁNG / GIỜ VÀO / GIỜ RA -->
        <tr>
          <td class="bold" style="line-height:1.3;">
            <div>Ngày tháng:</div>
            <div>오류 발생일</div>
          </td>
          <td class="center bold" style="font-size:12.5px;">${escapeHtml(displayDate)}</td>
          <td class="center bold" style="line-height:1.3;">
            <div><span class="cb">${inChecked}</span>Giờ vào</div>
            <div>출근 시간</div>
          </td>
          <td class="center bold" style="font-size:13px;">${escapeHtml(data.checkInChecked ? data.inTime || '' : '')}</td>
          <td class="center bold" style="line-height:1.3;">
            <div><span class="cb">${outChecked}</span>Giờ ra</div>
            <div>근 시간</div>
          </td>
          <td class="center bold" style="font-size:13px;">${escapeHtml(data.checkOutChecked ? data.outTime || '' : '')}</td>
        </tr>

        <!-- LÝ DO / GIẢI TRÌNH / SỐ LẦN THÁNG HEADER -->
        <tr>
          <td colspan="2" class="center bold">Lý do 이유</td>
          <td colspan="3" class="center bold">Giải trình 설명</td>
          <td class="center bold" style="line-height:1.25;">
            <div>Số lần / tháng</div>
            <div>(차/월)</div>
          </td>
        </tr>

        <!-- LỖI HỆ THỐNG -->
        <tr>
          <td colspan="2" style="padding:7px 8px;">
            <span class="cb">${sysChecked}</span><span class="bold">Lỗi hệ thống/ 시스템 오류</span>
          </td>
          <td colspan="3" style="padding:4px 8px;">
            ${
              data.reasonCategory === 'SYSTEM'
                ? `<div style="border-bottom:1px dotted #000;min-height:18px;font-style:italic;">${escapeHtml(data.reason)}</div>`
                : `<div class="diag"><svg viewBox="0 0 100 100" preserveAspectRatio="none"><line x1="0" y1="0" x2="100" y2="100" stroke="#000" stroke-width="1.5"/></svg></div>`
            }
          </td>
          <td class="center">
            <div style="border-bottom:1px dotted #000;min-height:18px;font-weight:bold;">
              ${data.reasonCategory === 'SYSTEM' ? escapeHtml(countText) : ''}
            </div>
          </td>
        </tr>

        <!-- LỖI CÁ NHÂN -->
        <tr>
          <td colspan="2" style="padding:7px 8px;">
            <span class="cb">${perChecked}</span><span class="bold">Lỗi cá nhân/ 개인 실수</span>
          </td>
          <td colspan="3" style="padding:6px 8px;">
            <div style="border-bottom:1px dotted #000;min-height:18px;font-style:italic;">
              ${data.reasonCategory === 'PERSONAL' ? escapeHtml(data.reason) : ''}
            </div>
          </td>
          <td class="center">
            <div style="border-bottom:1px dotted #000;min-height:18px;font-weight:bold;">
              ${data.reasonCategory === 'PERSONAL' ? escapeHtml(countText) : ''}
            </div>
          </td>
        </tr>

        <!-- APPROVAL HEADERS -->
        <tr>
          <td colspan="2" class="center bold" style="line-height:1.3;">
            <div>Người xin xác nhận</div>
            <div>신청자</div>
          </td>
          <td colspan="2" class="center bold" style="line-height:1.3;">
            <div>Tổ trưởng/ Quản lý</div>
            <div>조장/ 매니저</div>
          </td>
          <td colspan="2" class="center bold" style="line-height:1.3;">
            <div>Phòng HR</div>
            <div>인사팀</div>
          </td>
        </tr>
        <tr>
          <td colspan="2" class="sig-row">.............../.............../...............</td>
          <td colspan="2" class="sig-row">.............../.............../...............</td>
          <td colspan="2" class="sig-row">.............../.............../...............</td>
        </tr>

        <!-- FOOTER NOTES -->
        <tr>
          <td colspan="6" class="notes">
            <div>1. Yêu cầu điền đầy đủ thông tin và chữ ký theo mẫu, nộp lên phòng nhân sự trong ngày để làm cơ sở tính ngày công và lương</div>
            <div style="margin-bottom:4px;">신청 양식에 따라 해당 정보를 기재하여 당일에 즉시 인사에 제출하도록 한다.</div>
            <div>2. Nhân viên nào không có đầy đủ dữ liệu chấm công (ra/vào) mà không có <b>PHIẾU XÁC NHẬN CHẤM CÔNG BẤT THƯỜNG</b> trong ngày sẽ coi như vắng mặt ngày hôm đó.</div>
            <div style="margin-bottom:4px;">만일 당일에 근태 데이터 없으며 근태 오류 확인 신청서를 제출하지 않는 경우 그 날을 결근으로 처리하도록 한다.</div>
            <div>3. Sau khi nhận được <b>PHIẾU XÁC NHẬN CHẤM CÔNG BẤT THƯỜNG</b> nếu do lỗi hệ thống gây ra, phòng HR sẽ kiểm tra hệ thống để xác nhận lỗi</div>
            <div>근태 오류 확인 신청서 접수 후에 시스템 오류일 경우 인사팀은 시스템 재확인하도록 한다.</div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
  <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 120); };</script>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `PhieuXacNhanCongBatThuong_NPT-FM-008_${(data.employeeId || 'NV').replace(/[^a-zA-Z0-9_-]/g, '')}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function requestToNPTFM008Data(
  req: AttendanceCorrectionRequest,
  allRequests: AttendanceCorrectionRequest[] = []
): NPTFM008FormData {
  const monthKey = getMonthKeyFromDate(req.date);
  const countInMonth = allRequests.filter(
    (r) =>
      r.employeeId.trim().toLowerCase() === req.employeeId.trim().toLowerCase() &&
      getMonthKeyFromDate(r.date) === monthKey
  ).length;

  return {
    employeeId: req.employeeId,
    fullName: req.fullName,
    department: req.department || 'MULTI',
    dateStr: req.date,
    checkInChecked:
      req.checkInChecked !== undefined ? req.checkInChecked : Boolean(req.inTime),
    inTime: req.inTime || '',
    checkOutChecked:
      req.checkOutChecked !== undefined ? req.checkOutChecked : Boolean(req.outTime),
    outTime: req.outTime || '',
    reasonCategory: req.reasonCategory || 'PERSONAL',
    reason: req.reason || '',
    monthlyCount: req.monthlyCount || Math.max(1, countInMonth),
  };
}

export const NPTFM008Sheet: React.FC<{ data: NPTFM008FormData; isPrintMode?: boolean }> = ({
  data,
  isPrintMode = false,
}) => {
  const displayDate = formatDateDisplayVN(data.dateStr);
  const countText = data.monthlyCount > 0 ? `${data.monthlyCount} lần` : '';

  return (
    <div
      className={`bg-white text-black font-times select-text border-[1.5px] border-black ${
        isPrintMode ? 'w-full shadow-none' : 'w-full shadow-2xl'
      }`}
      style={{ fontFamily: "'Times New Roman', 'Tinos', Times, serif" }}
    >
      <table className="w-full border-collapse table-fixed text-[11px] sm:text-[12px] text-black">
        <colgroup>
          <col className="w-[17%]" />
          <col className="w-[14%]" />
          <col className="w-[19%]" />
          <col className="w-[18%]" />
          <col className="w-[14%]" />
          <col className="w-[18%]" />
        </colgroup>
        <tbody>
          {/* TOP HEADER */}
          <tr>
            <td rowSpan={3} className="border border-black p-1.5 text-center align-middle">
              <div className="flex items-center justify-center">
                <svg
                  width="74"
                  height="40"
                  viewBox="0 0 100 52"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-label="PT Logo"
                >
                  <polygon points="50,3 5,26 50,49" fill="#24338f" />
                  <polygon points="50,3 95,26 50,49" fill="#ff6600" />
                  <text
                    x="37"
                    y="33"
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="22"
                    fontFamily="Times New Roman, serif"
                    fontWeight="bold"
                  >
                    P
                  </text>
                  <text
                    x="63"
                    y="33"
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="22"
                    fontFamily="Times New Roman, serif"
                    fontWeight="bold"
                  >
                    T
                  </text>
                </svg>
              </div>
            </td>
            <td
              rowSpan={3}
              colSpan={3}
              className="border border-black px-2 py-2 text-center font-bold align-middle leading-snug"
            >
              <div className="text-[13px] sm:text-[15px] uppercase tracking-tight">
                PHIẾU XÁC NHẬN CHẤM CÔNG BẤT THƯỜNG
              </div>
              <div className="text-[13px] sm:text-[15px] mt-0.5">근태 오류 확인 신청서</div>
            </td>
            <td className="border border-black px-2 py-1 font-bold text-[11px]">Form No.</td>
            <td className="border border-black px-2 py-1 text-center text-[11px]">NPT-FM-008</td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-1 font-bold text-[11px]">Dated</td>
            <td className="border border-black px-2 py-1 text-center text-[11px]">01/06/2020</td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-1 font-bold text-[11px]">Revision</td>
            <td className="border border-black px-2 py-1 text-center text-[11px]">001</td>
          </tr>

          {/* ROW 2: HỌ TÊN / MÃ NV */}
          <tr>
            <td className="border border-black px-2 py-1.5 font-bold">Họ tên/성명</td>
            <td
              colSpan={2}
              className="border border-black px-2 py-1.5 text-center font-bold uppercase text-[12px] sm:text-[13px]"
            >
              {data.fullName}
            </td>
            <td className="border border-black px-2 py-1.5 font-bold">Mã NV/사원 번호</td>
            <td
              colSpan={2}
              className="border border-black px-2 py-1.5 text-center font-bold text-[12px] sm:text-[13px]"
            >
              {data.employeeId}
            </td>
          </tr>

          {/* ROW 3: NGÀY THÁNG / GIỜ VÀO / GIỜ RA */}
          <tr>
            <td className="border border-black px-2 py-1.5 font-bold leading-tight">
              <div>Ngày tháng:</div>
              <div>오류 발생일</div>
            </td>
            <td className="border border-black px-1.5 py-1.5 text-center font-bold text-[12px]">
              {displayDate}
            </td>
            <td className="border border-black px-1.5 py-1.5 text-center font-bold leading-tight">
              <div className="inline-flex items-center justify-center gap-1.5">
                <span className="inline-flex items-center justify-center w-3.5 h-3.5 border-[1.5px] border-black text-[11px] leading-none">
                  {data.checkInChecked ? '✓' : ''}
                </span>
                <span>Giờ vào</span>
              </div>
              <div>출근 시간</div>
            </td>
            <td className="border border-black px-1.5 py-1.5 text-center font-bold text-[13px]">
              {data.checkInChecked ? data.inTime || '' : ''}
            </td>
            <td className="border border-black px-1.5 py-1.5 text-center font-bold leading-tight">
              <div className="inline-flex items-center justify-center gap-1.5">
                <span className="inline-flex items-center justify-center w-3.5 h-3.5 border-[1.5px] border-black text-[11px] leading-none">
                  {data.checkOutChecked ? '✓' : ''}
                </span>
                <span>Giờ ra</span>
              </div>
              <div>근 시간</div>
            </td>
            <td className="border border-black px-1.5 py-1.5 text-center font-bold text-[13px]">
              {data.checkOutChecked ? data.outTime || '' : ''}
            </td>
          </tr>

          {/* ROW 4: LÝ DO / GIẢI TRÌNH / SỐ LẦN THÁNG HEADER */}
          <tr>
            <td colSpan={2} className="border border-black px-2 py-1.5 text-center font-bold">
              Lý do 이유
            </td>
            <td colSpan={3} className="border border-black px-2 py-1.5 text-center font-bold">
              Giải trình 설명
            </td>
            <td className="border border-black px-1 py-1.5 text-center font-bold leading-tight">
              <div>Số lần / tháng</div>
              <div>(차/월)</div>
            </td>
          </tr>

          {/* ROW 5: LỖI HỆ THỐNG */}
          <tr>
            <td colSpan={2} className="border border-black px-2 py-2 align-middle">
              <div className="inline-flex items-center gap-2 font-bold">
                <span className="inline-flex items-center justify-center w-4 h-4 border-[1.5px] border-black text-[12px] leading-none shrink-0">
                  {data.reasonCategory === 'SYSTEM' ? '✓' : ''}
                </span>
                <span>Lỗi hệ thống/ 시스템 오류</span>
              </div>
            </td>
            <td colSpan={3} className="border border-black p-0 align-middle">
              {data.reasonCategory === 'SYSTEM' ? (
                <div className="px-2.5 py-2">
                  <div className="border-b border-dotted border-black min-h-[18px] italic">
                    {data.reason}
                  </div>
                </div>
              ) : (
                <div className="relative h-8 w-full overflow-hidden">
                  <svg
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    className="absolute inset-0 w-full h-full"
                  >
                    <line x1="0" y1="0" x2="100" y2="100" stroke="#000" strokeWidth="1.4" />
                  </svg>
                </div>
              )}
            </td>
            <td className="border border-black px-2 py-1.5 text-center align-middle">
              <div className="border-b border-dotted border-black min-h-[18px] font-bold">
                {data.reasonCategory === 'SYSTEM' ? countText : ''}
              </div>
            </td>
          </tr>

          {/* ROW 6: LỖI CÁ NHÂN */}
          <tr>
            <td colSpan={2} className="border border-black px-2 py-2 align-middle">
              <div className="inline-flex items-center gap-2 font-bold">
                <span className="inline-flex items-center justify-center w-4 h-4 border-[1.5px] border-black text-[12px] leading-none shrink-0">
                  {data.reasonCategory === 'PERSONAL' ? '✓' : ''}
                </span>
                <span>Lỗi cá nhân/ 개인 실수</span>
              </div>
            </td>
            <td colSpan={3} className="border border-black px-2.5 py-2 align-middle">
              <div className="border-b border-dotted border-black min-h-[18px] italic">
                {data.reasonCategory === 'PERSONAL' ? data.reason : ''}
              </div>
            </td>
            <td className="border border-black px-2 py-1.5 text-center align-middle">
              <div className="border-b border-dotted border-black min-h-[18px] font-bold">
                {data.reasonCategory === 'PERSONAL' ? countText : ''}
              </div>
            </td>
          </tr>

          {/* APPROVAL SIGNATURES */}
          <tr>
            <td colSpan={2} className="border border-black px-2 py-1.5 text-center font-bold leading-tight">
              <div>Người xin xác nhận</div>
              <div>신청자</div>
            </td>
            <td colSpan={2} className="border border-black px-2 py-1.5 text-center font-bold leading-tight">
              <div>Tổ trưởng/ Quản lý</div>
              <div>조장/ 매니저</div>
            </td>
            <td colSpan={2} className="border border-black px-2 py-1.5 text-center font-bold leading-tight">
              <div>Phòng HR</div>
              <div>인사팀</div>
            </td>
          </tr>
          <tr>
            <td
              colSpan={2}
              className="border border-black h-16 px-2 pb-1.5 align-bottom text-center text-[10px]"
            >
              ............../............../..............
            </td>
            <td
              colSpan={2}
              className="border border-black h-16 px-2 pb-1.5 align-bottom text-center text-[10px]"
            >
              ............../............../..............
            </td>
            <td
              colSpan={2}
              className="border border-black h-16 px-2 pb-1.5 align-bottom text-center text-[10px]"
            >
              ............../............../..............
            </td>
          </tr>

          {/* FOOTER NOTES */}
          <tr>
            <td colSpan={6} className="border border-black px-2.5 py-2 text-[10.5px] sm:text-[11px] leading-snug space-y-1">
              <div>
                1. Yêu cầu điền đầy đủ thông tin và chữ ký theo mẫu, nộp lên phòng nhân sự trong ngày để làm cơ sở tính ngày công và lương
              </div>
              <div className="pb-0.5">
                신청 양식에 따라 해당 정보를 기재하여 당일에 즉시 인사에 제출하도록 한다.
              </div>
              <div>
                2. Nhân viên nào không có đầy đủ dữ liệu chấm công (ra/vào) mà không có{' '}
                <strong className="font-bold">PHIẾU XÁC NHẬN CHẤM CÔNG BẤT THƯỜNG</strong> trong ngày sẽ coi như vắng mặt ngày hôm đó.
              </div>
              <div className="pb-0.5">
                만일 당일에 근태 데이터 없으며 근태 오류 확인 신청서를 제출하지 않는 경우 그 날을 결근으로 처리하도록 한다.
              </div>
              <div>
                3. Sau khi nhận được{' '}
                <strong className="font-bold">PHIẾU XÁC NHẬN CHẤM CÔNG BẤT THƯỜNG</strong> nếu do lỗi hệ thống gây ra, phòng HR sẽ kiểm tra hệ thống để xác nhận lỗi
              </div>
              <div>
                근태 오류 확인 신청서 접수 후에 시스템 오류일 경우 인사팀은 시스템 재확인하도록 한다.
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

const QUICK_ABNORMAL_REASONS = [
  'Quên quẹt thẻ giờ vào ca',
  'Quên quẹt thẻ giờ tan ca',
  'Máy quẹt thẻ không nhận vân tay / thẻ',
  'Đi làm đầy đủ, được tổ trưởng xác nhận',
];

export interface AbnormalAttendanceModalProps {
  mode: 'explain' | 'view';
  sourceContext?: AbnormalAttendanceSourceContext;
  existingRequest?: AttendanceCorrectionRequest;
  existingRequests: AttendanceCorrectionRequest[];
  onClose: () => void;
  onSubmitExplanation?: (payload: {
    request: AttendanceCorrectionRequest;
    applyFixToMachine: boolean;
    confirmedInTime: string;
    confirmedOutTime: string;
    andPrint?: boolean;
  }) => void;
}

export const AbnormalAttendanceModal: React.FC<AbnormalAttendanceModalProps> = ({
  mode,
  sourceContext,
  existingRequest,
  existingRequests,
  onClose,
  onSubmitExplanation,
}) => {
  const isViewOnly = mode === 'view';

  // Derive defaults from attendance source context (or existing request)
  const initialData = useMemo((): NPTFM008FormData => {
    if (existingRequest) {
      return requestToNPTFM008Data(existingRequest, existingRequests);
    }

    if (sourceContext) {
      const shiftDefaultIn = sourceContext.shift === 'NIGHT' ? '20:00' : '08:00';
      const shiftDefaultOut = sourceContext.shift === 'NIGHT' ? '05:00' : '17:00';

      const isMissingIn =
        sourceContext.discrepancyType === 'MISSING_IN' ||
        sourceContext.discrepancyType === 'MISSING_BOTH' ||
        !sourceContext.rawInTime;
      const isMissingOut =
        sourceContext.discrepancyType === 'MISSING_OUT' ||
        sourceContext.discrepancyType === 'MISSING_BOTH' ||
        !sourceContext.rawOutTime;

      const needIn =
        isMissingIn ||
        sourceContext.discrepancyType === 'LATE_IN' ||
        sourceContext.discrepancyType === 'LATE_AND_EARLY';
      const needOut =
        isMissingOut ||
        sourceContext.discrepancyType === 'EARLY_OUT' ||
        sourceContext.discrepancyType === 'LATE_AND_EARLY';

      // Chỉ tự động điền số giờ bị thiếu/sai lệch theo dữ liệu chấm công; giờ đã ghi nhận để trống
      const resolvedIn = needIn
        ? sourceContext.bcInTime || sourceContext.mqtInTime || shiftDefaultIn
        : '';
      const resolvedOut = needOut
        ? sourceContext.bcOutTime || sourceContext.mqtOutTime || shiftDefaultOut
        : '';

      const monthKey = getMonthKeyFromDate(sourceContext.dateStr);
      const priorCount = existingRequests.filter(
        (r) =>
          r.employeeId.trim().toLowerCase() ===
            sourceContext.staff.employeeId.trim().toLowerCase() &&
          getMonthKeyFromDate(r.date) === monthKey
      ).length;

      return {
        employeeId: sourceContext.staff.employeeId,
        fullName: sourceContext.staff.fullName,
        department: sourceContext.staff.department || 'MULTI',
        dateStr: sourceContext.dateStr,
        checkInChecked: needIn,
        inTime: resolvedIn,
        checkOutChecked: needOut,
        outTime: resolvedOut,
        reasonCategory: 'PERSONAL',
        reason: sourceContext.discrepancyDetail || '',
        monthlyCount: priorCount + 1,
      };
    }

    return {
      employeeId: '',
      fullName: '',
      department: 'MULTI',
      dateStr: new Date().toLocaleDateString('vi-VN'),
      checkInChecked: true,
      inTime: '08:00',
      checkOutChecked: true,
      outTime: '17:00',
      reasonCategory: 'PERSONAL',
      reason: '',
      monthlyCount: 1,
    };
  }, [existingRequest, sourceContext, existingRequests]);

  const [checkInChecked, setCheckInChecked] = useState(initialData.checkInChecked);
  const [inTime, setInTime] = useState(initialData.inTime);
  const [checkOutChecked, setCheckOutChecked] = useState(initialData.checkOutChecked);
  const [outTime, setOutTime] = useState(initialData.outTime);
  const [reasonCategory, setReasonCategory] = useState<'SYSTEM' | 'PERSONAL'>(
    initialData.reasonCategory
  );
  const [reason, setReason] = useState(initialData.reason);
  const [monthlyCount, setMonthlyCount] = useState<number>(initialData.monthlyCount);
  const [applyFixToMachine, setApplyFixToMachine] = useState<boolean>(true);
  const [hasPrintedInSession, setHasPrintedInSession] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [noticeMsg, setNoticeMsg] = useState<string | null>(null);

  // Print portal state
  const [portalEl, setPortalEl] = useState<HTMLDivElement | null>(null);
  const [printData, setPrintData] = useState<NPTFM008FormData | null>(null);

  useEffect(() => {
    setCheckInChecked(initialData.checkInChecked);
    setInTime(initialData.inTime);
    setCheckOutChecked(initialData.checkOutChecked);
    setOutTime(initialData.outTime);
    setReasonCategory(initialData.reasonCategory);
    setReason(initialData.reason);
    setMonthlyCount(initialData.monthlyCount);
  }, [initialData]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    let el = document.getElementById('npt-fm008-print-root') as HTMLDivElement | null;
    let created = false;
    if (!el) {
      el = document.createElement('div');
      el.id = 'npt-fm008-print-root';
      document.body.appendChild(el);
      created = true;
    }
    setPortalEl(el);
    return () => {
      document.body.classList.remove('printing-npt-fm008');
      if (created && el && el.parentNode) {
        el.parentNode.removeChild(el);
      }
    };
  }, []);

  const currentFormData: NPTFM008FormData = useMemo(
    () => ({
      employeeId: initialData.employeeId,
      fullName: initialData.fullName,
      department: initialData.department,
      dateStr: initialData.dateStr,
      checkInChecked,
      inTime,
      checkOutChecked,
      outTime,
      reasonCategory,
      reason: reason.trim(),
      monthlyCount,
    }),
    [
      initialData.employeeId,
      initialData.fullName,
      initialData.department,
      initialData.dateStr,
      checkInChecked,
      inTime,
      checkOutChecked,
      outTime,
      reasonCategory,
      reason,
      monthlyCount,
    ]
  );

  const triggerPrint = useCallback(
    (sheet: NPTFM008FormData) => {
      if (!isViewOnly) {
        setHasPrintedInSession(true);
      }
      flushSync(() => {
        setPrintData(sheet);
      });
      document.body.classList.add('printing-npt-fm008');

      let beforePrintFired = false;
      const onBeforePrint = () => {
        beforePrintFired = true;
      };
      const cleanup = () => {
        document.body.classList.remove('printing-npt-fm008');
        setPrintData(null);
        window.removeEventListener('beforeprint', onBeforePrint);
        window.removeEventListener('afterprint', cleanup);
      };

      window.addEventListener('beforeprint', onBeforePrint);
      window.addEventListener('afterprint', cleanup);

      const startedAt = performance.now();
      try {
        window.print();
      } catch {
        // Blocked inside restricted iframe
      }
      const elapsed = performance.now() - startedAt;

      if (beforePrintFired || elapsed >= 40) {
        window.setTimeout(cleanup, 1200);
      } else {
        cleanup();
        downloadPrintableHtmlNPTFM008(sheet);
        setNoticeMsg(
          'Trình duyệt nhúng chặn in trực tiếp — đã tự động tải xuống bản in A4 (.html). Mở file và nhấn Ctrl+P để in!'
        );
      }
    },
    [isViewOnly]
  );

  const handleResetToScheduleTimes = () => {
    if (!sourceContext) return;
    const shiftDefaultIn = sourceContext.shift === 'NIGHT' ? '20:00' : '08:00';
    const shiftDefaultOut = sourceContext.shift === 'NIGHT' ? '05:00' : '17:00';
    setInTime(checkInChecked ? sourceContext.bcInTime || shiftDefaultIn : '');
    setOutTime(checkOutChecked ? sourceContext.bcOutTime || shiftDefaultOut : '');
  };

  const handleConfirmSubmit = (andPrint: boolean) => {
    setErrorMsg(null);
    if (!checkInChecked && !checkOutChecked) {
      setErrorMsg('Vui lòng tích chọn ít nhất Giờ vào hoặc Giờ ra cần xác nhận.');
      return;
    }
    if (!reason.trim()) {
      setErrorMsg('Vui lòng nhập nội dung giải trình.');
      return;
    }
    if (!onSubmitExplanation) return;

    const finalInTime = checkInChecked ? inTime : '';
    const finalOutTime = checkOutChecked ? outTime : '';
    const nowDisplay = new Date().toLocaleString('vi-VN');
    const printedFlag = andPrint || hasPrintedInSession;

    const builtRequest: AttendanceCorrectionRequest = {
      id: Date.now(),
      employeeId: currentFormData.employeeId,
      fullName: currentFormData.fullName,
      department: currentFormData.department,
      date: formatDateDisplayVN(currentFormData.dateStr),
      inTime: finalInTime,
      outTime: finalOutTime,
      reason: reason.trim(),
      status: applyFixToMachine ? 'APPROVED' : 'PENDING',
      requestDate: new Date().toLocaleDateString('vi-VN'),
      checkInChecked,
      checkOutChecked,
      reasonCategory,
      monthlyCount,
      isPrinted: printedFlag,
      printedAt: printedFlag ? nowDisplay : undefined,
      confirmedAt: applyFixToMachine ? nowDisplay : undefined,
      adminResponse: applyFixToMachine
        ? 'Đã xác nhận theo phiếu NPT-FM-008 & cập nhật giờ máy chấm công'
        : undefined,
    };

    if (andPrint) {
      triggerPrint({
        ...currentFormData,
        inTime: finalInTime,
        outTime: finalOutTime,
      });
    }

    onSubmitExplanation({
      request: builtRequest,
      applyFixToMachine,
      confirmedInTime: finalInTime,
      confirmedOutTime: finalOutTime,
      andPrint,
    });
  };

  return (
    <div
      className="fixed inset-0 z-[75] bg-black/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className={`bg-[#080f1e] border border-slate-700 rounded-2xl w-full ${
          isViewOnly ? 'max-w-[820px]' : 'max-w-[1180px]'
        } max-h-[94vh] flex flex-col overflow-hidden shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Modal Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-[#050b16] border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-600/20 border border-rose-500/40 text-rose-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-extrabold text-white uppercase tracking-wide">
                {isViewOnly
                  ? 'Xem & In Phiếu Xác Nhận Chấm Công Bất Thường (NPT-FM-008)'
                  : 'Giải Trình & Phiếu Xác Nhận Chấm Công Bất Thường (NPT-FM-008)'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {currentFormData.fullName} ({currentFormData.employeeId}) · Ngày{' '}
                <span className="font-mono text-cyan-300 font-semibold">
                  {formatDateDisplayVN(currentFormData.dateStr)}
                </span>
                {sourceContext ? ` (${sourceContext.dayOfWeek}) · ${sourceContext.discrepancyLabel}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (!isViewOnly) setHasPrintedInSession(true);
                downloadPrintableHtmlNPTFM008(currentFormData);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold cursor-pointer transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tải bản in</span>
            </button>
            <button
              type="button"
              onClick={() => triggerPrint(currentFormData)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold cursor-pointer transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{isViewOnly ? 'In lại phiếu' : 'In phiếu'}</span>
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

        {noticeMsg && (
          <div className="mx-4 mt-3 px-3.5 py-2 rounded-xl bg-emerald-950/90 border border-emerald-500/40 text-emerald-200 text-xs flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{noticeMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setNoticeMsg(null)}
              className="text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-5">
          <div
            className={`grid grid-cols-1 ${
              isViewOnly ? '' : 'lg:grid-cols-12'
            } gap-5 items-start`}
          >
            {/* LEFT FORM CONTROLS (ONLY IN EXPLAIN MODE) */}
            {!isViewOnly && (
              <div className="lg:col-span-5 space-y-3.5 text-xs">
                {errorMsg && (
                  <div className="px-3 py-2 rounded-lg bg-rose-950/90 border border-rose-500/50 text-rose-200 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Attendance Comparison Summary */}
                {sourceContext && (
                  <div className="p-3 rounded-xl bg-[#040a16] border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Dữ Liệu Đối Soát Ngày {sourceContext.dateStr}</span>
                      </span>
                      <button
                        type="button"
                        onClick={handleResetToScheduleTimes}
                        className="inline-flex items-center gap-1 text-[10px] text-amber-300 hover:text-amber-200 underline cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Lấy giờ theo Bảng Công</span>
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                      <div className="p-2 rounded-lg bg-amber-950/25 border border-amber-700/40">
                        <div className="text-[10px] font-sans font-bold text-amber-300 uppercase mb-0.5">
                          Bảng Chấm Công (BC)
                        </div>
                        <div className="text-white font-bold">
                          Vào: {sourceContext.bcInTime || '—'} · Ra: {sourceContext.bcOutTime || '—'}
                        </div>
                      </div>
                      <div
                        className={`p-2 rounded-lg border ${
                          sourceContext.sourceMode === 'FACE'
                            ? 'bg-sky-950/25 border-sky-700/40'
                            : sourceContext.sourceMode === 'QR'
                            ? 'bg-emerald-950/25 border-emerald-700/40'
                            : 'bg-rose-950/25 border-rose-700/40'
                        }`}
                      >
                        <div
                          className={`text-[10px] font-sans font-bold uppercase mb-0.5 ${
                            sourceContext.sourceMode === 'FACE'
                              ? 'text-sky-300'
                              : sourceContext.sourceMode === 'QR'
                              ? 'text-emerald-300'
                              : 'text-rose-300'
                          }`}
                        >
                          {sourceContext.sourceMode === 'FACE'
                            ? 'Chấm Công Khuôn Mặt'
                            : sourceContext.sourceMode === 'QR'
                            ? 'Chấm Công Bằng QR'
                            : 'Máy Quẹt Thẻ (MQT)'}
                        </div>
                        <div className="text-white font-bold">
                          Vào: {sourceContext.rawInTime || 'Thiếu'} · Ra:{' '}
                          {sourceContext.rawOutTime || 'Thiếu'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Confirmed Check-in / Check-out Boxes */}
                <div className="p-3.5 rounded-xl bg-[#040a16] border border-slate-800 space-y-3">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                    1. Mục Bất Thường &amp; Giờ Xác Nhận Thực Tế
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div
                      className={`p-2.5 rounded-xl border transition-colors ${
                        checkInChecked
                          ? 'bg-cyan-950/35 border-cyan-500/50'
                          : 'bg-slate-900/50 border-slate-800'
                      }`}
                    >
                      <label className="flex items-center gap-2 font-bold text-slate-200 mb-1.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={checkInChecked}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setCheckInChecked(checked);
                            if (checked && !inTime && sourceContext) {
                              setInTime(
                                sourceContext.bcInTime ||
                                  (sourceContext.shift === 'NIGHT' ? '20:00' : '08:00')
                              );
                            } else if (!checked) {
                              setInTime('');
                            }
                          }}
                          className="accent-cyan-500 w-3.5 h-3.5 cursor-pointer"
                        />
                        <span>Giờ vào (출근 시간)</span>
                      </label>
                      <input
                        type="time"
                        value={inTime}
                        disabled={!checkInChecked}
                        onChange={(e) => setInTime(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-lg px-2.5 py-1.5 font-mono text-white text-xs outline-none disabled:opacity-45"
                      />
                    </div>

                    <div
                      className={`p-2.5 rounded-xl border transition-colors ${
                        checkOutChecked
                          ? 'bg-cyan-950/35 border-cyan-500/50'
                          : 'bg-slate-900/50 border-slate-800'
                      }`}
                    >
                      <label className="flex items-center gap-2 font-bold text-slate-200 mb-1.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={checkOutChecked}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setCheckOutChecked(checked);
                            if (checked && !outTime && sourceContext) {
                              setOutTime(
                                sourceContext.bcOutTime ||
                                  (sourceContext.shift === 'NIGHT' ? '05:00' : '17:00')
                              );
                            } else if (!checked) {
                              setOutTime('');
                            }
                          }}
                          className="accent-cyan-500 w-3.5 h-3.5 cursor-pointer"
                        />
                        <span>Giờ ra (근 시간)</span>
                      </label>
                      <input
                        type="time"
                        value={outTime}
                        disabled={!checkOutChecked}
                        onChange={(e) => setOutTime(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-lg px-2.5 py-1.5 font-mono text-white text-xs outline-none disabled:opacity-45"
                      />
                    </div>
                  </div>
                </div>

                {/* Reason Category & Monthly Count */}
                <div className="p-3.5 rounded-xl bg-[#040a16] border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                      2. Lý Do &amp; Giải Trình (이유 / 설명)
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-400">Số lần/tháng:</span>
                      <input
                        type="number"
                        min={1}
                        max={31}
                        value={monthlyCount}
                        onChange={(e) => setMonthlyCount(Math.max(1, Number(e.target.value) || 1))}
                        className="w-14 bg-slate-950 border border-slate-700 rounded-md px-2 py-1 text-center font-mono font-bold text-amber-300 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setReasonCategory('PERSONAL')}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl border font-bold cursor-pointer transition-colors ${
                        reasonCategory === 'PERSONAL'
                          ? 'bg-cyan-600/90 border-cyan-400 text-white'
                          : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      <span>Lỗi cá nhân / 개인 실수</span>
                      {reasonCategory === 'PERSONAL' && <Check className="w-3.5 h-3.5 shrink-0" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setReasonCategory('SYSTEM')}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl border font-bold cursor-pointer transition-colors ${
                        reasonCategory === 'SYSTEM'
                          ? 'bg-amber-600/90 border-amber-400 text-white'
                          : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      <span>Lỗi hệ thống / 시스템 오류</span>
                      {reasonCategory === 'SYSTEM' && <Check className="w-3.5 h-3.5 shrink-0" />}
                    </button>
                  </div>

                  <textarea
                    rows={2}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Nhập chi tiết giải trình chấm công bất thường..."
                    className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-xl p-2.5 text-slate-100 outline-none resize-none"
                  />

                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_ABNORMAL_REASONS.map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => setReason(chip)}
                        className="px-2.5 py-1 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10.5px] text-slate-300 hover:text-cyan-300 cursor-pointer transition-colors"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Auto-apply swipe confirmation option */}
                <label className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-950/30 border border-emerald-700/40 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={applyFixToMachine}
                    onChange={(e) => setApplyFixToMachine(e.target.checked)}
                    className="mt-0.5 accent-emerald-500 w-4 h-4 cursor-pointer shrink-0"
                  />
                  <div className="space-y-0.5">
                    <div className="font-bold text-emerald-300">
                      Xác nhận sửa &amp; cập nhật giờ vào/ra vào Dữ liệu{' '}
                      {sourceContext?.sourceMode === 'FACE'
                        ? 'Khuôn Mặt'
                        : sourceContext?.sourceMode === 'QR'
                        ? 'Chấm Công QR'
                        : 'Máy Quẹt Thẻ'}{' '}
                      ngay
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {checkInChecked && !checkOutChecked
                        ? `Chỉ bổ sung Giờ vào còn thiếu (${inTime || '--:--'}), giữ nguyên Giờ ra đã ghi nhận (${sourceContext?.rawOutTime || '--:--'}).`
                        : !checkInChecked && checkOutChecked
                        ? `Chỉ bổ sung Giờ ra còn thiếu (${outTime || '--:--'}), giữ nguyên Giờ vào đã ghi nhận (${sourceContext?.rawInTime || '--:--'}).`
                        : `Tự động bổ sung giờ còn thiếu (${inTime || '--:--'} - ${outTime || '--:--'}) để xóa cảnh báo thiếu giờ vào/ra.`}
                    </div>
                  </div>
                </label>

                {/* Action Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => handleConfirmSubmit(false)}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold uppercase tracking-wide cursor-pointer transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{applyFixToMachine ? 'Xác Nhận Sửa & Lưu' : 'Gửi Giải Trình'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleConfirmSubmit(true)}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-extrabold uppercase tracking-wide cursor-pointer transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Lưu &amp; In Phiếu</span>
                  </button>
                </div>
              </div>
            )}

            {/* RIGHT PANEL: LIVE NPT-FM-008 SHEET PREVIEW */}
            <div className={isViewOnly ? 'w-full' : 'lg:col-span-7'}>
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-2 sm:p-4 overflow-x-auto custom-scrollbar">
                <div className="min-w-[620px] max-w-[760px] mx-auto">
                  <NPTFM008Sheet data={currentFormData} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* HIDDEN PORTAL FOR CLEAN A4 PRINTING */}
      {portalEl &&
        printData &&
        createPortal(<NPTFM008Sheet data={printData} isPrintMode />, portalEl)}
    </div>
  );
};

// ============================================================================
// READ-ONLY HISTORY SECTION BELOW DỮ LIỆU CÔNG (CHỈ XEM & IN LẠI)
// ============================================================================

export interface AbnormalAttendanceHistorySectionProps {
  attendanceRequests: AttendanceCorrectionRequest[];
}

export const AbnormalAttendanceHistorySection: React.FC<
  AbnormalAttendanceHistorySectionProps
> = ({ attendanceRequests }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<
    'CONFIRMED_OR_PRINTED' | 'CONFIRMED_AND_PRINTED' | 'ALL'
  >('CONFIRMED_OR_PRINTED');
  const [filterMonth, setFilterMonth] = useState(''); // YYYY-MM
  const [viewingRequest, setViewingRequest] =
    useState<AttendanceCorrectionRequest | null>(null);
  const [printNotice, setPrintNotice] = useState<string | null>(null);

  const [portalEl, setPortalEl] = useState<HTMLDivElement | null>(null);
  const [printData, setPrintData] = useState<NPTFM008FormData | null>(null);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    let el = document.getElementById('npt-fm008-print-root') as HTMLDivElement | null;
    let created = false;
    if (!el) {
      el = document.createElement('div');
      el.id = 'npt-fm008-print-root';
      document.body.appendChild(el);
      created = true;
    }
    setPortalEl(el);
    return () => {
      document.body.classList.remove('printing-npt-fm008');
      if (created && el && el.parentNode && el.childElementCount === 0) {
        el.parentNode.removeChild(el);
      }
    };
  }, []);

  const triggerDirectReprint = useCallback(
    (req: AttendanceCorrectionRequest) => {
      const sheet = requestToNPTFM008Data(req, attendanceRequests);
      flushSync(() => {
        setPrintData(sheet);
      });
      document.body.classList.add('printing-npt-fm008');

      let beforePrintFired = false;
      const onBeforePrint = () => {
        beforePrintFired = true;
      };
      const cleanup = () => {
        document.body.classList.remove('printing-npt-fm008');
        setPrintData(null);
        window.removeEventListener('beforeprint', onBeforePrint);
        window.removeEventListener('afterprint', cleanup);
      };

      window.addEventListener('beforeprint', onBeforePrint);
      window.addEventListener('afterprint', cleanup);

      const startedAt = performance.now();
      try {
        window.print();
      } catch {
        // Blocked inside restricted sandboxed iframe
      }
      const elapsed = performance.now() - startedAt;

      if (beforePrintFired || elapsed >= 40) {
        window.setTimeout(cleanup, 1200);
      } else {
        cleanup();
        downloadPrintableHtmlNPTFM008(sheet);
        setPrintNotice(
          `Trình duyệt nhúng chặn in trực tiếp — đã tự động tải bản in A4 (.html) của ${req.fullName} (ngày ${req.date}).`
        );
      }
    },
    [attendanceRequests]
  );

  const confirmedOrPrintedCount = useMemo(
    () =>
      attendanceRequests.filter((r) => r.status === 'APPROVED' || r.isPrinted === true)
        .length,
    [attendanceRequests]
  );

  const confirmedAndPrintedCount = useMemo(
    () =>
      attendanceRequests.filter((r) => r.status === 'APPROVED' && r.isPrinted === true)
        .length,
    [attendanceRequests]
  );

  const filteredHistory = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return attendanceRequests
      .filter((r) => {
        if (filterMode === 'CONFIRMED_AND_PRINTED') {
          if (!(r.status === 'APPROVED' && r.isPrinted === true)) return false;
        } else if (filterMode === 'CONFIRMED_OR_PRINTED') {
          if (!(r.status === 'APPROVED' || r.isPrinted === true)) return false;
        }

        if (filterMonth) {
          if (getMonthKeyFromDate(r.date) !== filterMonth) return false;
        }

        if (q) {
          const hay = `${r.fullName} ${r.employeeId} ${r.department || ''} ${r.date} ${r.reason}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => b.id - a.id);
  }, [attendanceRequests, filterMode, filterMonth, searchQuery]);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-4 shadow-2xl">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/35 text-rose-400 flex items-center justify-center shrink-0">
            <History className="w-4 h-4" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-extrabold text-white uppercase tracking-wide">
                Lịch Sử Nhân Viên Đã Xác Nhận Giải Trình Công &amp; Đã In (NPT-FM-008)
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 text-[11px] font-mono font-bold">
                {confirmedOrPrintedCount} phiếu đã xác nhận
              </span>
              {confirmedAndPrintedCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/35 text-cyan-300 text-[11px] font-mono font-bold">
                  {confirmedAndPrintedCount} đã in
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
              <Lock className="w-3 h-3 text-amber-400 shrink-0" />
              <span>
                Chế độ chỉ đọc: chỉ được phép <strong className="text-slate-200">Xem</strong> và{' '}
                <strong className="text-slate-200">In lại</strong> phiếu xác nhận công bất thường, không chỉnh sửa hoặc lưu trùng lịch sử.
              </span>
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm tên, mã NV, lý do..."
              className="bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white outline-none w-48 sm:w-56"
            />
          </div>

          <select
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value as any)}
            className="bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-semibold outline-none cursor-pointer"
          >
            <option value="CONFIRMED_OR_PRINTED">Đã xác nhận &amp; Đã in</option>
            <option value="CONFIRMED_AND_PRINTED">Chỉ phiếu đã xác nhận &amp; có in</option>
            <option value="ALL">Tất cả phiếu ({attendanceRequests.length})</option>
          </select>

          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="month"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="bg-transparent text-xs text-slate-200 outline-none font-mono"
              title="Lọc theo tháng"
            />
            {filterMonth && (
              <button
                type="button"
                onClick={() => setFilterMonth('')}
                className="text-slate-400 hover:text-white cursor-pointer"
                title="Xóa lọc tháng"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {printNotice && (
        <div className="px-3.5 py-2 rounded-xl bg-emerald-950/90 border border-emerald-500/40 text-emerald-200 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{printNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setPrintNotice(null)}
            className="text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* History Table */}
      {filteredHistory.length === 0 ? (
        <div className="py-10 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl bg-slate-950/40">
          Chưa có nhân viên nào đã xác nhận giải trình công và in phiếu phù hợp điều kiện lọc.
        </div>
      ) : (
        <div className="overflow-x-auto custom-scrollbar border border-slate-800 rounded-xl">
          <table className="w-full min-w-[980px] text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-800 text-[10.5px] uppercase tracking-wider text-slate-400">
                <th className="py-2.5 px-3 text-center w-12">STT</th>
                <th className="py-2.5 px-3">Nhân Viên</th>
                <th className="py-2.5 px-3 text-center">Ngày Bất Thường</th>
                <th className="py-2.5 px-3 text-center">Giờ Vào Xác Nhận</th>
                <th className="py-2.5 px-3 text-center">Giờ Ra Xác Nhận</th>
                <th className="py-2.5 px-3">Phân Loại &amp; Lý Do Giải Trình</th>
                <th className="py-2.5 px-3 text-center">Trạng Thái Xác Nhận / In</th>
                <th className="py-2.5 px-3 text-right">Thao Tác (Chỉ Xem &amp; In Lại)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredHistory.map((req, index) => {
                const showIn =
                  req.checkInChecked !== undefined ? req.checkInChecked : Boolean(req.inTime);
                const showOut =
                  req.checkOutChecked !== undefined ? req.checkOutChecked : Boolean(req.outTime);

                return (
                  <tr key={req.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3 text-center font-mono text-slate-400">
                      {index + 1}
                    </td>

                    <td className="py-2.5 px-3">
                      <div className="font-bold text-white uppercase">{req.fullName}</div>
                      <div className="text-[11px] font-mono text-cyan-400">
                        {req.employeeId}
                        {req.department ? (
                          <span className="text-slate-500 font-sans ml-1.5">
                            · {req.department}
                          </span>
                        ) : null}
                      </div>
                    </td>

                    <td className="py-2.5 px-3 text-center font-mono font-bold text-amber-300 whitespace-nowrap">
                      {formatDateDisplayVN(req.date)}
                    </td>

                    <td className="py-2.5 px-3 text-center font-mono whitespace-nowrap">
                      {showIn && req.inTime ? (
                        <span className="px-2 py-0.5 rounded bg-cyan-950/70 border border-cyan-600/40 text-cyan-200 font-bold">
                          {req.inTime}
                        </span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-center font-mono whitespace-nowrap">
                      {showOut && req.outTime ? (
                        <span className="px-2 py-0.5 rounded bg-cyan-950/70 border border-cyan-600/40 text-cyan-200 font-bold">
                          {req.outTime}
                        </span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 max-w-[300px]">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                            req.reasonCategory === 'SYSTEM'
                              ? 'bg-amber-950/60 border-amber-700/50 text-amber-300'
                              : 'bg-slate-800 border-slate-700 text-slate-300'
                          }`}
                        >
                          {req.reasonCategory === 'SYSTEM' ? 'Lỗi hệ thống' : 'Lỗi cá nhân'}
                        </span>
                        {req.monthlyCount ? (
                          <span className="text-[10px] font-mono text-slate-400">
                            Lần {req.monthlyCount}/tháng
                          </span>
                        ) : null}
                      </div>
                      <div className="text-slate-300 line-clamp-2" title={req.reason}>
                        {req.reason}
                      </div>
                    </td>

                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <div className="flex flex-col items-center gap-1">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            req.status === 'APPROVED'
                              ? 'bg-emerald-950/80 border-emerald-600/50 text-emerald-300'
                              : 'bg-amber-950/80 border-amber-600/50 text-amber-300'
                          }`}
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          <span>
                            {req.status === 'APPROVED' ? 'Đã xác nhận công' : 'Chờ xác nhận'}
                          </span>
                        </span>

                        {req.isPrinted ? (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-950/70 border border-cyan-600/40 text-cyan-300"
                            title={req.printedAt ? `In lúc: ${req.printedAt}` : 'Đã in phiếu NPT-FM-008'}
                          >
                            <Printer className="w-2.5 h-2.5" />
                            <span>Đã in{req.printedAt ? ` · ${req.printedAt}` : ''}</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500 font-mono">
                            {req.confirmedAt || req.requestDate}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setViewingRequest(req)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-300 text-[11px] font-semibold cursor-pointer transition-colors"
                          title="Xem lại phiếu NPT-FM-008 (chỉ đọc)"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Xem</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => triggerDirectReprint(req)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-teal-950/90 hover:bg-teal-900 border border-teal-500/40 text-teal-200 text-[11px] font-bold cursor-pointer transition-colors"
                          title="In lại phiếu NPT-FM-008 (không lưu thêm vào lịch sử)"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>In lại</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Read-only Modal for Viewing & Reprinting */}
      {viewingRequest && (
        <AbnormalAttendanceModal
          mode="view"
          existingRequest={viewingRequest}
          existingRequests={attendanceRequests}
          onClose={() => setViewingRequest(null)}
        />
      )}

      {/* Isolated A4 Print Portal for Direct Row Reprint */}
      {portalEl &&
        printData &&
        createPortal(<NPTFM008Sheet data={printData} isPrintMode />, portalEl)}
    </div>
  );
};
