import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { createPortal, flushSync } from 'react-dom';
import {
  LeaveRegistrationRecord,
  LeaveRegistrationType,
  StaffRecord,
} from '../../types';
import {
  FileText,
  Printer,
  RotateCcw,
  Eye,
  Search,
  History,
  Trash2,
  Check,
  AlertCircle,
  CheckCircle2,
  X,
  Calendar,
  Download,
} from 'lucide-react';

export const LEAVE_TYPE_OPTIONS: {
  value: LeaveRegistrationType;
  vi: string;
  ko: string;
  fullLabel: string;
  activeClass: string;
  idleClass: string;
  badgeClass: string;
}[] = [
  {
    value: 'Nghỉ phép',
    vi: 'Nghỉ phép',
    ko: '연차',
    fullLabel: 'Nghỉ phép / 연차',
    activeClass: 'bg-cyan-600/90 border-cyan-400 text-white shadow-[0_0_16px_rgba(6,182,212,0.35)]',
    idleClass: 'bg-[#081020] border-cyan-500/35 text-cyan-200 hover:border-cyan-400/70 hover:bg-cyan-950/30',
    badgeClass: 'bg-cyan-950/90 text-cyan-300 border-cyan-500/40',
  },
  {
    value: 'Nghỉ nửa phép',
    vi: 'Nghỉ nửa phép',
    ko: '반차',
    fullLabel: 'Nghỉ nửa phép / 반차',
    activeClass: 'bg-indigo-600/90 border-indigo-400 text-white shadow-[0_0_16px_rgba(99,102,241,0.35)]',
    idleClass: 'bg-[#081020] border-indigo-500/35 text-indigo-200 hover:border-indigo-400/70 hover:bg-indigo-950/30',
    badgeClass: 'bg-indigo-950/90 text-indigo-300 border-indigo-500/40',
  },
  {
    value: 'Nghỉ việc riêng',
    vi: 'Nghỉ việc riêng',
    ko: '결근',
    fullLabel: 'Nghỉ việc riêng / 결근',
    activeClass: 'bg-amber-600/90 border-amber-400 text-white shadow-[0_0_16px_rgba(245,158,11,0.35)]',
    idleClass: 'bg-[#081020] border-amber-500/35 text-amber-200 hover:border-amber-400/70 hover:bg-amber-950/30',
    badgeClass: 'bg-amber-950/90 text-amber-300 border-amber-500/40',
  },
  {
    value: 'Nghỉ cưới',
    vi: 'Nghỉ cưới',
    ko: '결혼',
    fullLabel: 'Nghỉ cưới / 결혼',
    activeClass: 'bg-pink-600/90 border-pink-400 text-white shadow-[0_0_16px_rgba(236,72,153,0.35)]',
    idleClass: 'bg-[#081020] border-pink-500/35 text-pink-200 hover:border-pink-400/70 hover:bg-pink-950/30',
    badgeClass: 'bg-pink-950/90 text-pink-300 border-pink-500/40',
  },
  {
    value: 'Về sớm',
    vi: 'Về sớm',
    ko: '조퇴',
    fullLabel: 'Về sớm / 조퇴',
    activeClass: 'bg-purple-600/90 border-purple-400 text-white shadow-[0_0_16px_rgba(168,85,247,0.35)]',
    idleClass: 'bg-[#081020] border-purple-500/35 text-purple-200 hover:border-purple-400/70 hover:bg-purple-950/30',
    badgeClass: 'bg-purple-950/90 text-purple-300 border-purple-500/40',
  },
  {
    value: 'Nghỉ ốm',
    vi: 'Nghỉ ốm',
    ko: '병가',
    fullLabel: 'Nghỉ ốm / 병가',
    activeClass: 'bg-rose-600/90 border-rose-400 text-white shadow-[0_0_16px_rgba(244,63,94,0.35)]',
    idleClass: 'bg-[#081020] border-rose-500/35 text-rose-200 hover:border-rose-400/70 hover:bg-rose-950/30',
    badgeClass: 'bg-rose-950/90 text-rose-300 border-rose-500/40',
  },
];

const QUICK_REASONS = [
  'Giải quyết việc gia đình',
  'Đi khám bệnh',
  'Việc cá nhân',
  'Nghỉ phép năm',
  'Đăng ký kết hôn',
];

export const LEAVE_REGISTRATIONS_STORAGE_KEY = 'app_leave_registrations';

export function normalizeLegacyLeaveType(raw?: string): LeaveRegistrationType {
  const s = String(raw || '').trim().toLowerCase();
  if (s.includes('nửa') || s.includes('반차')) return 'Nghỉ nửa phép';
  if (s.includes('về sớm') || s.includes('조퇴')) return 'Về sớm';
  if (s.includes('cưới') || s.includes('결혼')) return 'Nghỉ cưới';
  if (s.includes('ốm') || s.includes('병가')) return 'Nghỉ ốm';
  if (s.includes('việc riêng') || s.includes('không lương') || s.includes('tang') || s.includes('결근')) {
    return 'Nghỉ việc riêng';
  }
  return 'Nghỉ phép';
}

export function computeAnnualLeaveUsed(
  records: LeaveRegistrationRecord[],
  employeeId: string
): number {
  const norm = employeeId.trim().toLowerCase();
  if (!norm) return 0;
  return records.reduce((sum, rec) => {
    if (rec.employeeId.trim().toLowerCase() !== norm) return sum;
    if (rec.leaveType === 'Nghỉ phép' || rec.leaveType === 'Nghỉ nửa phép') {
      const d = Number(rec.days);
      return sum + (Number.isFinite(d) && d > 0 ? d : rec.leaveType === 'Nghỉ nửa phép' ? 0.5 : 1);
    }
    return sum;
  }, 0);
}

export function migrateLegacyEmployeeLeaves(
  existing: LeaveRegistrationRecord[],
  allStaff: StaffRecord[]
): LeaveRegistrationRecord[] {
  if (typeof window === 'undefined') return existing;
  const seenIds = new Set<number>(existing.map((r) => r.id));
  const staffMap = new Map<string, StaffRecord>();
  allStaff.forEach((s) => staffMap.set(s.employeeId.trim().toLowerCase(), s));

  const migrated: LeaveRegistrationRecord[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith('app_employee_leaves_')) continue;
      const empIdFromKey = key.replace('app_employee_leaves_', '').trim();
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) continue;

      parsed.forEach((item: any, idx: number) => {
        const recId = Number(item?.id) || Date.now() + idx;
        if (seenIds.has(recId)) return;
        seenIds.add(recId);
        const empId = String(item?.employeeId || empIdFromKey).trim();
        const staff = staffMap.get(empId.toLowerCase());
        const startDate = String(item?.startDate || new Date().toISOString().split('T')[0]);
        const leaveType = normalizeLegacyLeaveType(item?.leaveType);
        const days = Number(item?.days) > 0 ? Number(item.days) : leaveType === 'Nghỉ nửa phép' ? 0.5 : 1;

        migrated.push({
          id: recId,
          employeeId: empId,
          fullName: staff?.fullName || empId,
          department: staff?.department || 'MULTI',
          position: staff?.position || 'Nhân viên',
          leaveType,
          fromDate: startDate,
          toDate: startDate,
          fromTime: staff?.shift === 'NIGHT' ? '20:00' : '08:00',
          toTime: staff?.shift === 'NIGHT' ? '05:00' : '17:00',
          days,
          reason: String(item?.reason || item?.leaveType || 'Xin nghỉ phép'),
          status: item?.status === 'APPROVED' ? 'APPROVED' : 'REGISTERED',
          createdAt: String(item?.createdAt || new Date().toLocaleDateString('vi-VN')),
          createdBy: 'Hồ sơ NV',
        });
      });
    }
  } catch {
    // ignore migration failure
  }
  return migrated.length > 0 ? [...existing, ...migrated] : existing;
}

function parseDateParts(isoDate?: string): { day: string; month: string; year: string } {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    return { day: '', month: '', year: String(new Date().getFullYear()) };
  }
  const [y, m, d] = isoDate.split('-');
  return { day: d, month: m, year: y };
}

function parseTimeParts(hhmm?: string): { hour: string; minute: string } {
  if (!hhmm || !hhmm.includes(':')) return { hour: '', minute: '' };
  const [h, m] = hhmm.split(':');
  return { hour: h.padStart(2, '0'), minute: m.padStart(2, '0') };
}

function formatDisplayDate(isoDate?: string): string {
  if (!isoDate) return '-';
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    const [y, m, d] = isoDate.split('-');
    return `${d}/${m}/${y}`;
  }
  return isoDate;
}

function calcCalendarDaysInclusive(fromIso: string, toIso: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fromIso) || !/^\d{4}-\d{2}-\d{2}$/.test(toIso)) return 1;
  const [fy, fm, fd] = fromIso.split('-').map(Number);
  const [ty, tm, td] = toIso.split('-').map(Number);
  const start = new Date(fy, fm - 1, fd).getTime();
  const end = new Date(ty, tm - 1, td).getTime();
  if (end < start) return 1;
  return Math.floor((end - start) / 86400000) + 1;
}

function escapeHtml(val?: string | number): string {
  return String(val ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function downloadPrintableHtmlNPTFM007(data: NPTFM007PreviewData): void {
  const fromD = parseDateParts(data.fromDate);
  const toD = parseDateParts(data.toDate || data.fromDate);
  const fromT = parseTimeParts(data.fromTime);
  const toT = parseTimeParts(data.toTime);
  const tick = (t: LeaveRegistrationType) => (data.leaveType === t ? '✓' : '');

  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <title>Đơn Xin Phép - ${escapeHtml(data.fullName || data.employeeId || 'NPT-FM-007')}</title>
  <style>
    @page { size: A4 portrait; margin: 14mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 20px;
      background: #fff;
      color: #000;
      font-family: "Times New Roman", Times, serif;
      font-size: 13px;
    }
    .sheet { max-width: 740px; margin: 0 auto; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    td { border: 1px solid #000; padding: 4px 6px; vertical-align: middle; }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .title-box { text-align: center; padding: 12px 0 8px; border-bottom: 3px double #000; }
    .title-box h1 { margin: 0; font-size: 21px; font-weight: bold; letter-spacing: 0.5px; }
    .cb-wrap { padding: 12px 0; border-bottom: 3px double #000; }
    .cb-cell { text-align: center; font-size: 16px; font-weight: bold; height: 28px; }
    .info { padding: 16px 0 12px; line-height: 1.6; }
    .row-grid { display: flex; gap: 12px; margin-bottom: 10px; }
    .field { display: flex; align-items: baseline; gap: 4px; flex: 1; }
    .dots { flex: 1; border-bottom: 1px dotted #000; padding: 0 4px; min-height: 19px; font-weight: bold; }
    .dots-italic { flex: 1; border-bottom: 1px dotted #000; padding: 0 4px; min-height: 19px; font-style: italic; }
    .time-dots { display: inline-block; min-width: 24px; border-bottom: 1px dotted #000; text-align: center; font-weight: bold; }
    .approval-wrap { padding-top: 16px; display: flex; justify-content: flex-end; }
    .approval-tbl { width: 76%; }
    .sig-space { height: 68px; }
  </style>
</head>
<body>
  <div class="sheet">
    <table>
      <colgroup><col style="width:46%" /><col style="width:29%" /><col style="width:25%" /></colgroup>
      <tr>
        <td rowspan="3" class="center">
          <svg width="64" height="34" viewBox="0 0 100 52" xmlns="http://www.w3.org/2000/svg">
            <polygon points="50,3 5,26 50,49" fill="#24338f" />
            <polygon points="50,3 95,26 50,49" fill="#ff6600" />
            <text x="37" y="33" text-anchor="middle" fill="#fff" font-size="22" font-family="Times New Roman, serif" font-weight="bold">P</text>
            <text x="63" y="33" text-anchor="middle" fill="#fff" font-size="22" font-family="Times New Roman, serif" font-weight="bold">T</text>
          </svg>
          <div class="bold" style="font-size:12px;margin-top:4px;">CÔNG TY TNHH NEWPROTECVINA</div>
        </td>
        <td class="center bold">Form No.</td>
        <td class="center">NPT-FM-007</td>
      </tr>
      <tr>
        <td class="center bold">Date issued form</td>
        <td class="center">01/12/2019</td>
      </tr>
      <tr>
        <td class="center bold">Revision</td>
        <td class="center">001</td>
      </tr>
    </table>

    <div class="title-box">
      <h1>ĐƠN XIN PHÉP&nbsp;&nbsp;&nbsp;휴 가 신 청 서</h1>
    </div>

    <div class="cb-wrap">
      <table>
        <colgroup><col style="width:7%" /><col style="width:26%" /><col style="width:7%" /><col style="width:27%" /><col style="width:7%" /><col style="width:26%" /></colgroup>
        <tr>
          <td class="cb-cell">${tick('Nghỉ phép')}</td>
          <td class="bold">Nghỉ phép/ 연차</td>
          <td class="cb-cell">${tick('Nghỉ nửa phép')}</td>
          <td class="bold">Nghỉ nửa phép/ 반차</td>
          <td class="cb-cell">${tick('Nghỉ việc riêng')}</td>
          <td class="bold">Nghỉ việc riêng/ 결근</td>
        </tr>
        <tr>
          <td class="cb-cell">${tick('Nghỉ cưới')}</td>
          <td class="bold">Nghỉ cưới/ 결혼</td>
          <td class="cb-cell">${tick('Về sớm')}</td>
          <td class="bold">Về sớm/ 조퇴</td>
          <td class="cb-cell">${tick('Nghỉ ốm')}</td>
          <td class="bold">Nghỉ ốm/ 병가</td>
        </tr>
      </table>
    </div>

    <div class="info">
      <div class="row-grid">
        <div class="field"><span class="bold">Bộ phận 부서 :</span><span class="dots">${escapeHtml(data.department)}</span></div>
        <div class="field"><span class="bold">Chức vụ 직위 :</span><span class="dots">${escapeHtml(data.position)}</span></div>
        <div class="field"><span class="bold">Mã NV :</span><span class="dots">${escapeHtml(data.employeeId)}</span></div>
      </div>
      <div class="row-grid">
        <div class="field"><span class="bold">Họ và tên 성 명 :</span><span class="dots" style="text-transform:uppercase">${escapeHtml(data.fullName)}</span></div>
      </div>
      <div class="row-grid">
        <div class="field"><span class="bold">Lý do 사유 :</span><span class="dots-italic">${escapeHtml(data.reason)}</span></div>
      </div>
      <div style="border-bottom:1px dotted #000;height:18px;margin-bottom:8px;"></div>
    </div>

    <table>
      <colgroup><col style="width:17%" /><col style="width:57%" /><col style="width:15%" /><col style="width:11%" /></colgroup>
      <tr>
        <td rowspan="2" class="center bold">Thời gian từ<br/>기간</td>
        <td>
          <span class="time-dots">${escapeHtml(fromT.hour)}</span> giờ시
          <span class="time-dots">${escapeHtml(fromT.minute)}</span> phút분&nbsp;&nbsp;&nbsp;
          Ngày일 <span class="time-dots">${escapeHtml(fromD.day)}</span>
          tháng월 <span class="time-dots">${escapeHtml(fromD.month)}</span>
          Năm년 <b>${escapeHtml(fromD.year)}</b>
        </td>
        <td rowspan="2" class="center bold">số ngày nghỉ<br/>일수</td>
        <td rowspan="2" class="center bold">${data.days ? `${escapeHtml(data.days)} ngày` : ''}</td>
      </tr>
      <tr>
        <td>
          <span class="time-dots">${escapeHtml(toT.hour)}</span> giờ시
          <span class="time-dots">${escapeHtml(toT.minute)}</span> phút분&nbsp;&nbsp;&nbsp;
          Ngày일 <span class="time-dots">${escapeHtml(toD.day)}</span>
          tháng월 <span class="time-dots">${escapeHtml(toD.month)}</span>
          Năm년 <b>${escapeHtml(toD.year)}</b>
        </td>
      </tr>
    </table>

    <div class="approval-wrap">
      <table class="approval-tbl">
        <colgroup><col style="width:14%" /><col style="width:21.5%" /><col style="width:21.5%" /><col style="width:21.5%" /><col style="width:21.5%" /></colgroup>
        <tr>
          <td rowspan="3" class="center bold">결재<br/>phê<br/>Duyệt</td>
          <td class="center bold">작성<br/>Người viết</td>
          <td class="center bold">검토<br/>Kiểm tra</td>
          <td class="center bold">승인<br/>Xác nhận</td>
          <td class="center bold">인사<br/>Nhân sự</td>
        </tr>
        <tr>
          <td class="sig-space"></td><td class="sig-space"></td><td class="sig-space"></td><td class="sig-space"></td>
        </tr>
        <tr>
          <td class="center" style="font-size:11px">...../...../.....</td>
          <td class="center" style="font-size:11px">...../...../.....</td>
          <td class="center" style="font-size:11px">...../...../.....</td>
          <td class="center" style="font-size:11px">...../...../.....</td>
        </tr>
      </table>
    </div>
  </div>
  <script>window.onload = function() { setTimeout(function() { window.print(); }, 120); };</script>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `DonXinPhep_NPT-FM-007_${(data.employeeId || 'NV').replace(/[^a-zA-Z0-9_-]/g, '')}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export interface NPTFM007PreviewData {
  employeeId: string;
  fullName: string;
  department: string;
  position: string;
  leaveType: LeaveRegistrationType;
  fromDate: string;
  toDate: string;
  fromTime: string;
  toTime: string;
  days: number | string;
  reason: string;
}

export const NPTFM007Sheet: React.FC<{ data: NPTFM007PreviewData; isPrintMode?: boolean }> = ({
  data,
  isPrintMode = false,
}) => {
  const fromD = parseDateParts(data.fromDate);
  const toD = parseDateParts(data.toDate || data.fromDate);
  const fromT = parseTimeParts(data.fromTime);
  const toT = parseTimeParts(data.toTime);

  const isSelected = (t: LeaveRegistrationType) => data.leaveType === t;

  return (
    <div
      className={`bg-white text-black font-times select-text ${
        isPrintMode ? 'w-full p-0 shadow-none' : 'w-full rounded-sm p-5 sm:p-7 shadow-2xl'
      }`}
      style={{ fontFamily: "'Times New Roman', 'Tinos', Times, serif" }}
    >
      {/* HEADER TABLE */}
      <table className="w-full border-collapse table-fixed">
        <colgroup>
          <col className="w-[46%]" />
          <col className="w-[29%]" />
          <col className="w-[25%]" />
        </colgroup>
        <tbody>
          <tr>
            <td
              rowSpan={3}
              className="border border-black px-3 py-2 text-center align-middle"
            >
              <div className="flex flex-col items-center justify-center gap-1">
                {/* Newprotec PT Diamond Logo matching NPT-FM-007 */}
                <svg
                  width="64"
                  height="34"
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
                <div className="text-[11px] sm:text-[12px] font-bold tracking-tight uppercase leading-tight text-black">
                  CÔNG TY TNHH NEWPROTECVINA
                </div>
              </div>
            </td>
            <td className="border border-black px-2 py-1 text-center font-bold text-[11px] sm:text-[12px]">
              Form No.
            </td>
            <td className="border border-black px-2 py-1 text-center text-[11px] sm:text-[12px]">
              NPT-FM-007
            </td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-1 text-center font-bold text-[11px] sm:text-[12px]">
              Date issued form
            </td>
            <td className="border border-black px-2 py-1 text-center text-[11px] sm:text-[12px]">
              01/12/2019
            </td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-1 text-center font-bold text-[11px] sm:text-[12px]">
              Revision
            </td>
            <td className="border border-black px-2 py-1 text-center text-[11px] sm:text-[12px]">
              001
            </td>
          </tr>
        </tbody>
      </table>

      {/* DOCUMENT TITLE + DOUBLE BORDER */}
      <div className="pt-3 pb-2 text-center border-b-[3px] border-double border-black">
        <h1 className="text-[19px] sm:text-[22px] font-bold tracking-wide text-black leading-tight">
          ĐƠN XIN PHÉP&nbsp;&nbsp;&nbsp;휴 가 신 청 서
        </h1>
      </div>

      {/* CHECKBOX TYPE TABLE */}
      <div className="py-3 border-b-[3px] border-double border-black">
        <table className="w-full border-collapse table-fixed text-[11px] sm:text-[12px]">
          <colgroup>
            <col className="w-[7%]" />
            <col className="w-[26%]" />
            <col className="w-[7%]" />
            <col className="w-[27%]" />
            <col className="w-[7%]" />
            <col className="w-[26%]" />
          </colgroup>
          <tbody>
            <tr>
              <td className="border border-black text-center font-bold text-[15px] h-7 align-middle">
                {isSelected('Nghỉ phép') ? '✓' : ''}
              </td>
              <td className="border border-black px-2 py-1 font-bold align-middle">
                Nghỉ phép/ 연차
              </td>
              <td className="border border-black text-center font-bold text-[15px] h-7 align-middle">
                {isSelected('Nghỉ nửa phép') ? '✓' : ''}
              </td>
              <td className="border border-black px-2 py-1 font-bold align-middle">
                Nghỉ nửa phép/ 반차
              </td>
              <td className="border border-black text-center font-bold text-[15px] h-7 align-middle">
                {isSelected('Nghỉ việc riêng') ? '✓' : ''}
              </td>
              <td className="border border-black px-2 py-1 font-bold align-middle">
                Nghỉ việc riêng/ 결근
              </td>
            </tr>
            <tr>
              <td className="border border-black text-center font-bold text-[15px] h-7 align-middle">
                {isSelected('Nghỉ cưới') ? '✓' : ''}
              </td>
              <td className="border border-black px-2 py-1 font-bold align-middle">
                Nghỉ cưới/ 결혼
              </td>
              <td className="border border-black text-center font-bold text-[15px] h-7 align-middle">
                {isSelected('Về sớm') ? '✓' : ''}
              </td>
              <td className="border border-black px-2 py-1 font-bold align-middle">
                Về sớm/ 조퇴
              </td>
              <td className="border border-black text-center font-bold text-[15px] h-7 align-middle">
                {isSelected('Nghỉ ốm') ? '✓' : ''}
              </td>
              <td className="border border-black px-2 py-1 font-bold align-middle">
                Nghỉ ốm/ 병가
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* EMPLOYEE INFO LINES */}
      <div className="pt-4 pb-3 space-y-3 text-[12px] sm:text-[13px] text-black">
        <div className="grid grid-cols-12 gap-2 items-baseline">
          <div className="col-span-4 flex items-baseline gap-1 min-w-0">
            <span className="shrink-0 font-bold">Bộ phận 부서 :</span>
            <span className="flex-1 border-b border-dotted border-black px-1 font-bold truncate">
              {data.department || ''}
            </span>
          </div>
          <div className="col-span-4 flex items-baseline gap-1 min-w-0">
            <span className="shrink-0 font-bold">Chức vụ 직위 :</span>
            <span className="flex-1 border-b border-dotted border-black px-1 font-bold truncate">
              {data.position || ''}
            </span>
          </div>
          <div className="col-span-4 flex items-baseline gap-1 min-w-0">
            <span className="shrink-0 font-bold">Mã NV :</span>
            <span className="flex-1 border-b border-dotted border-black px-1 font-bold truncate">
              {data.employeeId || ''}
            </span>
          </div>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="shrink-0 font-bold">Họ và tên 성 명 :</span>
          <span className="flex-1 border-b border-dotted border-black px-1.5 font-bold uppercase tracking-wide text-[13px]">
            {data.fullName || ''}
          </span>
        </div>

        <div className="space-y-2.5">
          <div className="flex items-baseline gap-2">
            <span className="shrink-0 font-bold">Lý do 사유 :</span>
            <span className="flex-1 border-b border-dotted border-black px-1.5 italic min-h-[20px]">
              {data.reason || ''}
            </span>
          </div>
          <div className="border-b border-dotted border-black h-4 w-full" />
        </div>
      </div>

      {/* TIME RANGE & DURATION TABLE */}
      <div className="pt-1 pb-5">
        <table className="w-full border-collapse text-[11px] sm:text-[12px] text-black">
          <colgroup>
            <col className="w-[17%]" />
            <col className="w-[57%]" />
            <col className="w-[15%]" />
            <col className="w-[11%]" />
          </colgroup>
          <tbody>
            <tr>
              <td
                rowSpan={2}
                className="border border-black px-2 py-2 text-center font-bold align-middle leading-snug"
              >
                <div>Thời gian từ</div>
                <div>기간</div>
              </td>
              <td className="border border-black px-2.5 py-1.5 align-middle whitespace-nowrap">
                <span className="inline-block min-w-[22px] border-b border-dotted border-black text-center font-bold">
                  {fromT.hour}
                </span>
                <span> giờ시 </span>
                <span className="inline-block min-w-[22px] border-b border-dotted border-black text-center font-bold">
                  {fromT.minute}
                </span>
                <span> phút분&nbsp;&nbsp;&nbsp;Ngày일 </span>
                <span className="inline-block min-w-[22px] border-b border-dotted border-black text-center font-bold">
                  {fromD.day}
                </span>
                <span> tháng월 </span>
                <span className="inline-block min-w-[22px] border-b border-dotted border-black text-center font-bold">
                  {fromD.month}
                </span>
                <span> Năm년 </span>
                <span className="font-bold">{fromD.year || '2026'}</span>
              </td>
              <td
                rowSpan={2}
                className="border border-black px-1.5 py-2 text-center font-bold align-middle leading-snug"
              >
                <div>số ngày nghỉ</div>
                <div>일수</div>
              </td>
              <td
                rowSpan={2}
                className="border border-black px-1.5 py-2 text-center font-bold align-middle text-[13px]"
              >
                {data.days ? `${data.days} ngày` : ''}
              </td>
            </tr>
            <tr>
              <td className="border border-black px-2.5 py-1.5 align-middle whitespace-nowrap">
                <span className="inline-block min-w-[22px] border-b border-dotted border-black text-center font-bold">
                  {toT.hour}
                </span>
                <span> giờ시 </span>
                <span className="inline-block min-w-[22px] border-b border-dotted border-black text-center font-bold">
                  {toT.minute}
                </span>
                <span> phút분&nbsp;&nbsp;&nbsp;Ngày일 </span>
                <span className="inline-block min-w-[22px] border-b border-dotted border-black text-center font-bold">
                  {toD.day}
                </span>
                <span> tháng월 </span>
                <span className="inline-block min-w-[22px] border-b border-dotted border-black text-center font-bold">
                  {toD.month}
                </span>
                <span> Năm년 </span>
                <span className="font-bold">{toD.year || '2026'}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* APPROVAL SIGNATURES TABLE */}
      <div className="pt-2 flex justify-end">
        <table className="w-[82%] sm:w-[76%] border-collapse table-fixed text-[11px] sm:text-[12px] text-black">
          <colgroup>
            <col className="w-[14%]" />
            <col className="w-[21.5%]" />
            <col className="w-[21.5%]" />
            <col className="w-[21.5%]" />
            <col className="w-[21.5%]" />
          </colgroup>
          <tbody>
            <tr>
              <td
                rowSpan={3}
                className="border border-black px-1 py-2 text-center font-bold align-middle leading-snug"
              >
                <div>결재</div>
                <div>phê</div>
                <div>Duyệt</div>
              </td>
              <td className="border border-black px-1 py-1 text-center font-bold leading-tight">
                <div>작성</div>
                <div>Người viết</div>
              </td>
              <td className="border border-black px-1 py-1 text-center font-bold leading-tight">
                <div>검토</div>
                <div>Kiểm tra</div>
              </td>
              <td className="border border-black px-1 py-1 text-center font-bold leading-tight">
                <div>승인</div>
                <div>Xác nhận</div>
              </td>
              <td className="border border-black px-1 py-1 text-center font-bold leading-tight">
                <div>인사</div>
                <div>Nhân sự</div>
              </td>
            </tr>
            <tr>
              <td className="border border-black h-16" />
              <td className="border border-black h-16" />
              <td className="border border-black h-16" />
              <td className="border border-black h-16" />
            </tr>
            <tr>
              <td className="border border-black py-1 text-center text-[10px] text-black">
                ...../...../.....
              </td>
              <td className="border border-black py-1 text-center text-[10px] text-black">
                ...../...../.....
              </td>
              <td className="border border-black py-1 text-center text-[10px] text-black">
                ...../...../.....
              </td>
              <td className="border border-black py-1 text-center text-[10px] text-black">
                ...../...../.....
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export interface LeaveRegistrationWorkbenchProps {
  allStaff: StaffRecord[];
  leaveRecords: LeaveRegistrationRecord[];
  onAddLeaveRecord: (record: LeaveRegistrationRecord) => void;
  onDeleteLeaveRecord?: (id: number) => void;
  lockedEmployee?: StaffRecord;
  createdByLabel?: string;
  compact?: boolean;
}

export const LeaveRegistrationWorkbench: React.FC<LeaveRegistrationWorkbenchProps> = ({
  allStaff,
  leaveRecords,
  onAddLeaveRecord,
  onDeleteLeaveRecord,
  lockedEmployee,
  createdByLabel = 'HC & NS',
  compact = false,
}) => {
  const todayIso = useMemo(() => new Date().toISOString().split('T')[0], []);
  const previewTopRef = useRef<HTMLDivElement>(null);

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(
    lockedEmployee?.employeeId || ''
  );
  const [leaveType, setLeaveType] = useState<LeaveRegistrationType>('Nghỉ phép');
  const [fromDate, setFromDate] = useState<string>(todayIso);
  const [toDate, setToDate] = useState<string>(todayIso);
  const [fromTime, setFromTime] = useState<string>(
    lockedEmployee?.shift === 'NIGHT' ? '20:00' : '08:00'
  );
  const [toTime, setToTime] = useState<string>(
    lockedEmployee?.shift === 'NIGHT' ? '05:00' : '17:00'
  );
  const [days, setDays] = useState<number>(1);
  const [manualDaysEdited, setManualDaysEdited] = useState<boolean>(false);
  const [reason, setReason] = useState<string>('');

  // Viewing historical record in right-side preview (READ ONLY - never adds to history!)
  const [viewingHistoryRecord, setViewingHistoryRecord] =
    useState<LeaveRegistrationRecord | null>(null);

  // Print portal state
  const [printTarget, setPrintTarget] = useState<NPTFM007PreviewData | null>(null);
  const [portalEl, setPortalEl] = useState<HTMLDivElement | null>(null);

  // Feedback & validation banners
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // History filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterMonth, setFilterMonth] = useState<string>('');

  useEffect(() => {
    if (lockedEmployee?.employeeId) {
      setSelectedEmployeeId(lockedEmployee.employeeId);
      setFromTime(lockedEmployee.shift === 'NIGHT' ? '20:00' : '08:00');
      setToTime(lockedEmployee.shift === 'NIGHT' ? '05:00' : '17:00');
    }
  }, [lockedEmployee]);

  // Setup isolated print portal container once
  useEffect(() => {
    if (typeof document === 'undefined') return;
    let el = document.getElementById('npt-fm007-print-root') as HTMLDivElement | null;
    let created = false;
    if (!el) {
      el = document.createElement('div');
      el.id = 'npt-fm007-print-root';
      document.body.appendChild(el);
      created = true;
    }
    setPortalEl(el);
    return () => {
      document.body.classList.remove('printing-npt-fm007');
      if (created && el && el.parentNode) {
        el.parentNode.removeChild(el);
      }
    };
  }, []);

  const showFeedback = useCallback((type: 'success' | 'error', text: string) => {
    setFeedback({ type, text });
    window.setTimeout(() => {
      setFeedback((prev) => (prev?.text === text ? null : prev));
    }, 4000);
  }, []);

  const triggerPrintSheet = useCallback(
    (sheetData: NPTFM007PreviewData) => {
      // Commit printable portal DOM synchronously to preserve browser user-activation gesture
      flushSync(() => {
        setPrintTarget(sheetData);
      });
      document.body.classList.add('printing-npt-fm007');

      let beforePrintFired = false;
      const onBeforePrint = () => {
        beforePrintFired = true;
      };
      const cleanup = () => {
        document.body.classList.remove('printing-npt-fm007');
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
        downloadPrintableHtmlNPTFM007(sheetData);
        showFeedback(
          'success',
          'Trình duyệt nhúng chặn hộp thoại in trực tiếp — đã tự động tải xuống bản in A4 (.html). Bạn hãy mở file vừa tải và nhấn Ctrl+P để in!'
        );
      }
    },
    [showFeedback]
  );

  const sortedStaff = useMemo(() => {
    return [...allStaff]
      .filter((s) => !s.isLocked)
      .sort((a, b) => a.fullName.localeCompare(b.fullName, 'vi'));
  }, [allStaff]);

  const activeEmployee = useMemo(() => {
    if (lockedEmployee) return lockedEmployee;
    if (!selectedEmployeeId) return undefined;
    const norm = selectedEmployeeId.trim().toLowerCase();
    return allStaff.find((s) => s.employeeId.trim().toLowerCase() === norm);
  }, [lockedEmployee, selectedEmployeeId, allStaff]);

  const handleSelectEmployee = (empId: string) => {
    setSelectedEmployeeId(empId);
    setViewingHistoryRecord(null);
    const found = allStaff.find(
      (s) => s.employeeId.trim().toLowerCase() === empId.trim().toLowerCase()
    );
    if (found) {
      if (found.shift === 'NIGHT') {
        setFromTime('20:00');
        setToTime('05:00');
      } else {
        setFromTime('08:00');
        setToTime('17:00');
      }
    }
  };

  const handleSelectLeaveType = (nextType: LeaveRegistrationType) => {
    setLeaveType(nextType);
    setViewingHistoryRecord(null);
    setManualDaysEdited(false);
    if (nextType === 'Nghỉ nửa phép' || nextType === 'Về sớm') {
      setToDate(fromDate);
      setDays(0.5);
      if (nextType === 'Nghỉ nửa phép') {
        setToTime(activeEmployee?.shift === 'NIGHT' ? '00:00' : '12:00');
      } else {
        setToTime(activeEmployee?.shift === 'NIGHT' ? '03:00' : '15:00');
      }
    } else {
      setDays(calcCalendarDaysInclusive(fromDate, toDate));
      setFromTime(activeEmployee?.shift === 'NIGHT' ? '20:00' : '08:00');
      setToTime(activeEmployee?.shift === 'NIGHT' ? '05:00' : '17:00');
    }
  };

  const handleFromDateChange = (val: string) => {
    setFromDate(val);
    setViewingHistoryRecord(null);
    let nextTo = toDate;
    if (!nextTo || nextTo < val || leaveType === 'Nghỉ nửa phép' || leaveType === 'Về sớm') {
      nextTo = val;
      setToDate(val);
    }
    if (!manualDaysEdited) {
      if (leaveType === 'Nghỉ nửa phép' || leaveType === 'Về sớm') {
        setDays(0.5);
      } else {
        setDays(calcCalendarDaysInclusive(val, nextTo));
      }
    }
  };

  const handleToDateChange = (val: string) => {
    const safeTo = val < fromDate ? fromDate : val;
    setToDate(safeTo);
    setViewingHistoryRecord(null);
    if (!manualDaysEdited) {
      if (leaveType === 'Nghỉ nửa phép' || leaveType === 'Về sớm') {
        setDays(0.5);
      } else {
        setDays(calcCalendarDaysInclusive(fromDate, safeTo));
      }
    }
  };

  const handleResetForm = () => {
    if (!lockedEmployee) setSelectedEmployeeId('');
    setLeaveType('Nghỉ phép');
    setFromDate(todayIso);
    setToDate(todayIso);
    setFromTime(lockedEmployee?.shift === 'NIGHT' ? '20:00' : '08:00');
    setToTime(lockedEmployee?.shift === 'NIGHT' ? '05:00' : '17:00');
    setDays(1);
    setManualDaysEdited(false);
    setReason('');
    setViewingHistoryRecord(null);
  };

  // Current draft data displayed in A4 preview when NOT viewing history
  const draftPreviewData: NPTFM007PreviewData = useMemo(
    () => ({
      employeeId: activeEmployee?.employeeId || '',
      fullName: activeEmployee?.fullName || '',
      department: activeEmployee?.department || '',
      position: activeEmployee?.position || '',
      leaveType,
      fromDate,
      toDate,
      fromTime,
      toTime,
      days,
      reason: reason.trim(),
    }),
    [activeEmployee, leaveType, fromDate, toDate, fromTime, toTime, days, reason]
  );

  // Active preview data: either read-only history record OR live form draft
  const activePreviewData: NPTFM007PreviewData = viewingHistoryRecord
    ? {
        employeeId: viewingHistoryRecord.employeeId,
        fullName: viewingHistoryRecord.fullName,
        department: viewingHistoryRecord.department,
        position: viewingHistoryRecord.position,
        leaveType: viewingHistoryRecord.leaveType,
        fromDate: viewingHistoryRecord.fromDate,
        toDate: viewingHistoryRecord.toDate,
        fromTime: viewingHistoryRecord.fromTime,
        toTime: viewingHistoryRecord.toTime,
        days: viewingHistoryRecord.days,
        reason: viewingHistoryRecord.reason,
      }
    : draftPreviewData;

  const handleSaveAndPrint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEmployee) {
      showFeedback('error', 'Vui lòng chọn nhân viên trước khi lưu & in đơn xin phép.');
      return;
    }
    if (!reason.trim()) {
      showFeedback('error', 'Vui lòng nhập lý do xin nghỉ.');
      return;
    }

    const newRecord: LeaveRegistrationRecord = {
      id: Date.now(),
      employeeId: activeEmployee.employeeId,
      fullName: activeEmployee.fullName,
      department: activeEmployee.department || 'MULTI',
      position: activeEmployee.position || 'Nhân viên',
      leaveType,
      fromDate,
      toDate: toDate || fromDate,
      fromTime,
      toTime,
      days: Number(days) > 0 ? Number(days) : 1,
      reason: reason.trim(),
      status: 'REGISTERED',
      createdAt: new Date().toLocaleString('vi-VN'),
      createdBy: createdByLabel,
    };

    onAddLeaveRecord(newRecord);
    setViewingHistoryRecord(null);
    showFeedback(
      'success',
      `Đã lưu đơn xin phép (${newRecord.leaveType}) của ${newRecord.fullName} vào lịch sử và mở bản in NPT-FM-007.`
    );
    triggerPrintSheet(newRecord);
    setReason('');
  };

  // Viewing or reprinting a historical item ONLY views/prints, NEVER saves a new entry
  const handleViewHistory = (rec: LeaveRegistrationRecord) => {
    setViewingHistoryRecord(rec);
    previewTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleReprintHistory = (rec: LeaveRegistrationRecord) => {
    setViewingHistoryRecord(rec);
    triggerPrintSheet(rec);
  };

  // Filtered history list (lockedEmployee restricts automatically to that employee)
  const scopedHistory = useMemo(() => {
    const base = lockedEmployee
      ? leaveRecords.filter(
          (r) =>
            r.employeeId.trim().toLowerCase() ===
            lockedEmployee.employeeId.trim().toLowerCase()
        )
      : leaveRecords;

    const q = searchQuery.trim().toLowerCase();
    return base
      .filter((r) => {
        if (filterType !== 'ALL' && r.leaveType !== filterType) return false;
        if (filterMonth && !r.fromDate.startsWith(filterMonth)) return false;
        if (q) {
          const hay = `${r.fullName} ${r.employeeId} ${r.department} ${r.reason} ${r.leaveType}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => b.id - a.id);
  }, [leaveRecords, lockedEmployee, searchQuery, filterType, filterMonth]);

  const annualLeaveRemaining = useMemo(() => {
    if (!activeEmployee) return null;
    const used = computeAnnualLeaveUsed(leaveRecords, activeEmployee.employeeId);
    return Math.max(0, 12 - used);
  }, [activeEmployee, leaveRecords]);

  return (
    <div className={compact ? 'space-y-5' : 'p-4 sm:p-6 max-w-[1600px] mx-auto space-y-6'}>
      {/* Toast / Feedback */}
      {feedback && (
        <div
          className={`flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border text-xs font-medium shadow-lg ${
            feedback.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
              : 'bg-rose-950/90 border-rose-500/50 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* TOP WORKBENCH: LEFT FORM + RIGHT A4 PREVIEW */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* LEFT PANEL: THÔNG TIN ĐĂNG KÝ NGHỈ */}
        <form
          onSubmit={handleSaveAndPrint}
          noValidate
          className="xl:col-span-5 bg-[#080f1e] border border-slate-800/90 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2 text-cyan-400 font-extrabold text-sm tracking-wide uppercase">
              <FileText className="w-4 h-4 shrink-0" />
              <span>THÔNG TIN ĐĂNG KÝ NGHỈ</span>
            </div>
            <span className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-700 text-[11px] font-mono text-slate-300">
              Form NPT-FM-007
            </span>
          </div>

          {/* 1. CHỌN NHÂN VIÊN */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                1. CHỌN NHÂN VIÊN <span className="text-rose-400">*</span>
              </label>
              {annualLeaveRemaining !== null && (
                <span className="text-[11px] font-mono text-cyan-300 bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded">
                  Phép năm còn: {annualLeaveRemaining} / 12 ngày
                </span>
              )}
            </div>

            {lockedEmployee ? (
              <div className="w-full bg-[#040a16] border border-cyan-500/40 rounded-xl px-3.5 py-2.5 text-xs flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-white uppercase">
                    {lockedEmployee.fullName}
                  </span>
                  <span className="ml-2 font-mono text-cyan-400">
                    ({lockedEmployee.employeeId})
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">
                  {lockedEmployee.department || 'MULTI'} · {lockedEmployee.position || 'Nhân viên'}
                </span>
              </div>
            ) : (
              <select
                value={selectedEmployeeId}
                onChange={(e) => handleSelectEmployee(e.target.value)}
                className="w-full bg-[#040a16] border border-cyan-500/50 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white font-medium outline-none cursor-pointer"
              >
                <option value="">-- Vui lòng chọn nhân viên --</option>
                {sortedStaff.map((s) => (
                  <option key={s.id} value={s.employeeId}>
                    {s.fullName} ({s.employeeId}) — {s.department || 'MULTI'} / {s.position || 'Nhân viên'}
                  </option>
                ))}
              </select>
            )}

            {!activeEmployee && (
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs italic text-slate-400">
                * Chưa chọn nhân viên. Vui lòng chọn nhân viên để tự động điền đơn xin phép.
              </div>
            )}
          </div>

          {/* 2. LOẠI NGHỈ (NGHỈ GÌ) */}
          <div className="space-y-2">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">
              2. LOẠI NGHỈ (NGHỈ GÌ) <span className="text-rose-400">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {LEAVE_TYPE_OPTIONS.map((opt) => {
                const active = leaveType === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelectLeaveType(opt.value)}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer text-left ${
                      active ? opt.activeClass : opt.idleClass
                    }`}
                  >
                    <span>{opt.fullLabel}</span>
                    {active && <Check className="w-4 h-4 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. THỜI GIAN DỰ KIẾN NGHỈ */}
          <div className="bg-[#050b18] border border-slate-800 rounded-xl p-3.5 space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">
              3. THỜI GIAN DỰ KIẾN NGHỈ:
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Từ Ngày:</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => handleFromDateChange(e.target.value)}
                  className="w-full bg-[#081020] border border-slate-700 focus:border-cyan-400 rounded-lg px-3 py-2 text-xs text-white font-mono outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Đến Ngày:</label>
                <input
                  type="date"
                  value={toDate}
                  min={fromDate}
                  onChange={(e) => handleToDateChange(e.target.value)}
                  className="w-full bg-[#081020] border border-slate-700 focus:border-cyan-400 rounded-lg px-3 py-2 text-xs text-white font-mono outline-none"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Giờ vào:</label>
                <input
                  type="time"
                  value={fromTime}
                  onChange={(e) => {
                    setFromTime(e.target.value);
                    setViewingHistoryRecord(null);
                  }}
                  className="w-full bg-[#081020] border border-slate-700 focus:border-cyan-400 rounded-lg px-2.5 py-2 text-xs text-white font-mono outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Giờ ra:</label>
                <input
                  type="time"
                  value={toTime}
                  onChange={(e) => {
                    setToTime(e.target.value);
                    setViewingHistoryRecord(null);
                  }}
                  className="w-full bg-[#081020] border border-slate-700 focus:border-cyan-400 rounded-lg px-2.5 py-2 text-xs text-white font-mono outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] text-amber-400 font-bold mb-1">
                  Số ngày nghỉ:
                </label>
                <input
                  type="number"
                  min={0.5}
                  max={60}
                  step={0.5}
                  value={days}
                  onChange={(e) => {
                    setManualDaysEdited(true);
                    setDays(Number(e.target.value));
                    setViewingHistoryRecord(null);
                  }}
                  className="w-full bg-[#081020] border border-amber-500/60 focus:border-amber-400 rounded-lg px-2.5 py-2 text-xs text-amber-300 font-bold font-mono text-center outline-none"
                  required
                />
              </div>
            </div>
          </div>

          {/* 4. LÝ DO NGHỈ (사유) */}
          <div className="space-y-2">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">
              4. LÝ DO NGHỈ (사유) <span className="text-rose-400">*</span>
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setViewingHistoryRecord(null);
              }}
              placeholder="Nhập lý do xin nghỉ phép..."
              className="w-full bg-[#040a16] border border-slate-700 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none resize-none"
              required
            />
            <div className="flex flex-wrap gap-1.5">
              {QUICK_REASONS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => {
                    setReason(chip);
                    setViewingHistoryRecord(null);
                  }}
                  className="px-2.5 py-1 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-[11px] text-slate-300 hover:text-cyan-300 transition-colors cursor-pointer"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={handleResetForm}
              className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold uppercase tracking-wide text-slate-200 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>LÀM MỚI FORM</span>
            </button>
            <button
              type="submit"
              className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 text-xs font-extrabold uppercase tracking-wide shadow-[0_0_20px_rgba(20,184,166,0.35)] transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>LƯU &amp; IN ĐƠN</span>
            </button>
          </div>
        </form>

        {/* RIGHT PANEL: XEM TRƯỚC MẪU ĐƠN IN (A4 FORM PREVIEW) */}
        <div ref={previewTopRef} className="xl:col-span-7 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-300">
                <Eye className="w-4 h-4" />
                <span>XEM TRƯỚC MẪU ĐƠN IN (A4 FORM PREVIEW)</span>
              </div>
              {viewingHistoryRecord && (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-950/80 border border-amber-500/50 text-[11px] font-semibold text-amber-300">
                  Chế độ Xem Lịch Sử · Chỉ xem &amp; in lại (không lưu trùng)
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {viewingHistoryRecord && (
                <button
                  type="button"
                  onClick={() => setViewingHistoryRecord(null)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 cursor-pointer transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Quay lại đơn mới</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => downloadPrintableHtmlNPTFM007(activePreviewData)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold cursor-pointer transition-colors"
                title="Tải file bản in A4 (.html) để mở & in trên trình duyệt ngoài"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải bản in</span>
              </button>
              <button
                type="button"
                onClick={() => triggerPrintSheet(activePreviewData)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md cursor-pointer transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{viewingHistoryRecord ? 'In Lại Mẫu Này' : 'In Mẫu Này'}</span>
              </button>
            </div>
          </div>

          {/* Paper Container */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-2 sm:p-4 overflow-x-auto custom-scrollbar">
            <div className="min-w-[600px] max-w-[780px] mx-auto">
              <NPTFM007Sheet data={activePreviewData} />
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION: LỊCH SỬ NHÂN VIÊN ĐÃ ĐĂNG KÝ PHÉP */}
      <div className="bg-[#080f1e] border border-slate-800/90 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white uppercase tracking-wide">
                {lockedEmployee
                  ? `Lịch Sử Đăng Ký Phép Của ${lockedEmployee.fullName} (${scopedHistory.length})`
                  : `Danh Sách Lịch Sử Nhân Viên Đã Đăng Ký Phép (${scopedHistory.length})`}
              </h3>
              <p className="text-[11px] text-slate-400">
                Đồng bộ 2 chiều giữa HC &amp; NS và Hồ sơ nhân viên · Xem lại &amp; In lại trực tiếp không lưu thêm vào lịch sử.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!lockedEmployee && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm tên, mã NV, lý do..."
                  className="bg-[#040a16] border border-slate-700 focus:border-cyan-400 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white outline-none w-48 sm:w-56"
                />
              </div>
            )}

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-[#040a16] border border-slate-700 focus:border-cyan-400 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 outline-none cursor-pointer"
            >
              <option value="ALL">Tất cả loại nghỉ</option>
              {LEAVE_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.vi} ({opt.ko})
                </option>
              ))}
            </select>

            <div className="flex items-center gap-1.5 bg-[#040a16] border border-slate-700 rounded-lg px-2.5 py-1">
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

        {scopedHistory.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-500">
            Chưa có đơn đăng ký phép nào phù hợp điều kiện lọc.
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 bg-slate-900/60">
                  <th className="py-2.5 px-3">STT</th>
                  {!lockedEmployee && <th className="py-2.5 px-3">Nhân Viên</th>}
                  {!lockedEmployee && <th className="py-2.5 px-3">Bộ Phận / Chức Vụ</th>}
                  <th className="py-2.5 px-3">Loại Nghỉ</th>
                  <th className="py-2.5 px-3">Thời Gian Nghỉ</th>
                  <th className="py-2.5 px-3 text-center">Số Ngày</th>
                  <th className="py-2.5 px-3">Lý Do</th>
                  <th className="py-2.5 px-3">Nguồn / Ngày ĐK</th>
                  <th className="py-2.5 px-3 text-right">Thao Tác (Không lưu thêm)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {scopedHistory.map((rec, index) => {
                  const typeMeta =
                    LEAVE_TYPE_OPTIONS.find((t) => t.value === rec.leaveType) ||
                    LEAVE_TYPE_OPTIONS[0];
                  const isViewingThis = viewingHistoryRecord?.id === rec.id;

                  return (
                    <tr
                      key={rec.id}
                      className={`transition-colors ${
                        isViewingThis
                          ? 'bg-cyan-950/40'
                          : 'hover:bg-slate-900/50'
                      }`}
                    >
                      <td className="py-2.5 px-3 font-mono text-slate-400">
                        {index + 1}
                      </td>

                      {!lockedEmployee && (
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-white uppercase">
                            {rec.fullName}
                          </div>
                          <div className="text-[11px] font-mono text-cyan-400">
                            {rec.employeeId}
                          </div>
                        </td>
                      )}

                      {!lockedEmployee && (
                        <td className="py-2.5 px-3 text-slate-300">
                          <div>{rec.department || '-'}</div>
                          <div className="text-[11px] text-slate-400">
                            {rec.position || '-'}
                          </div>
                        </td>
                      )}

                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md border text-[11px] font-semibold whitespace-nowrap ${typeMeta.badgeClass}`}
                        >
                          {typeMeta.fullLabel}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 font-mono whitespace-nowrap text-slate-200">
                        <div>
                          {formatDisplayDate(rec.fromDate)}
                          {rec.toDate && rec.toDate !== rec.fromDate
                            ? ` → ${formatDisplayDate(rec.toDate)}`
                            : ''}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {rec.fromTime} - {rec.toTime}
                        </div>
                      </td>

                      <td className="py-2.5 px-3 text-center font-mono font-bold text-amber-300 whitespace-nowrap">
                        {rec.days} ngày
                      </td>

                      <td className="py-2.5 px-3 text-slate-300 max-w-[260px]">
                        <div className="line-clamp-2" title={rec.reason}>
                          {rec.reason}
                        </div>
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="text-[11px] text-cyan-300 font-medium">
                          {rec.createdBy || 'HC & NS'}
                        </div>
                        <div className="text-[10px] font-mono text-slate-500">
                          {rec.createdAt}
                        </div>
                      </td>

                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleViewHistory(rec)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold cursor-pointer transition-colors ${
                              isViewingThis
                                ? 'bg-cyan-600 border-cyan-400 text-white'
                                : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-cyan-300'
                            }`}
                            title="Xem lại mẫu đơn NPT-FM-007 (không lưu thêm)"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Xem</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleReprintHistory(rec)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-teal-950/80 hover:bg-teal-900 border border-teal-500/40 text-teal-200 text-[11px] font-semibold cursor-pointer transition-colors"
                            title="In lại đơn này (không lưu thêm vào lịch sử)"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>In lại</span>
                          </button>

                          {onDeleteLeaveRecord && (
                            deleteConfirmId === rec.id ? (
                              <span className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    onDeleteLeaveRecord(rec.id);
                                    if (viewingHistoryRecord?.id === rec.id) {
                                      setViewingHistoryRecord(null);
                                    }
                                    setDeleteConfirmId(null);
                                  }}
                                  className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold cursor-pointer"
                                >
                                  Xác nhận
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmId(null)}
                                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] cursor-pointer"
                                >
                                  Hủy
                                </button>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmId(rec.id)}
                                className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950/70 border border-slate-700 hover:border-rose-500/50 text-slate-400 hover:text-rose-300 cursor-pointer transition-colors"
                                title="Xóa khỏi lịch sử"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* HIDDEN PORTAL FOR CLEAN A4 PORTRAIT PRINTING (NO window.open) */}
      {portalEl &&
        printTarget &&
        createPortal(<NPTFM007Sheet data={printTarget} isPrintMode />, portalEl)}
    </div>
  );
};
