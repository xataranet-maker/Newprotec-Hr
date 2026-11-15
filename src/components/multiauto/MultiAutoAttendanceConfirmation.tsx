import React, { useState } from 'react';
import { AttendanceConfirmationRecord, UserAccount, Language } from '../../types';
import { FileBadge, CheckCircle, Search, Clock } from 'lucide-react';

interface MultiAutoAttendanceConfirmationProps {
  data: AttendanceConfirmationRecord[];
  onUpdate: (data: AttendanceConfirmationRecord[]) => void;
  currentUser: UserAccount;
  language?: Language;
}

export const MultiAutoAttendanceConfirmation: React.FC<MultiAutoAttendanceConfirmationProps> = ({
  data,
  onUpdate,
  currentUser
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const handleConfirm = (id: number) => {
    onUpdate(data.map(item => item.id === id ? {
      ...item,
      isConfirmed: true,
      confirmedAt: new Date().toLocaleString('vi-VN'),
      confirmedBy: currentUser.fullName
    } : item));
  };

  const filtered = data.filter(d =>
    d.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.employeeId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileBadge className="w-5 h-5 text-emerald-400" />
            <span>Bảng Xác Nhận Công & Tăng Ca Nhân Viên Hàng Tháng</span>
          </h2>
          <p className="text-xs text-slate-400">
            Công nhân viên ký nhận hoặc phản hồi số ngày công thực tế trước khi chốt bảng lương.
          </p>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Tìm tên, mã NV..."
            className="bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200"
          />
        </div>
      </div>

      <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 text-[11px] uppercase">
                <th className="py-2.5 px-3">Mã NV</th>
                <th className="py-2.5 px-3">Họ Và Tên</th>
                <th className="py-2.5 px-3">Tổ / Nhóm</th>
                <th className="py-2.5 px-3">Tháng</th>
                <th className="py-2.5 px-3 text-right">Nghỉ Phép Còn</th>
                <th className="py-2.5 px-3 text-right">Nghỉ Không Lương</th>
                <th className="py-2.5 px-3 text-center">Trạng Thái Ký Nhận</th>
                <th className="py-2.5 px-3 text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-500">
                    Chưa có bảng xác nhận công nào được phát hành cho tháng này.
                  </td>
                </tr>
              ) : (
                filtered.map(row => (
                  <tr key={row.id} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-mono text-cyan-400 font-bold">{row.employeeId}</td>
                    <td className="py-2.5 px-3 font-bold text-white">{row.fullName}</td>
                    <td className="py-2.5 px-3 text-slate-300">{row.shiftGroup}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-400">{row.month}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-400">{row.remainingLeave} ngày</td>
                    <td className="py-2.5 px-3 text-right font-mono text-amber-400">{row.unexcusedAbsence} ngày</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                        row.isConfirmed ? 'bg-emerald-950 text-emerald-400' : 'bg-amber-950 text-amber-400'
                      }`}>
                        {row.isConfirmed ? 'ĐÃ KÝ XÁC NHẬN' : 'CHỜ KÝ'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {!row.isConfirmed ? (
                        <button
                          onClick={() => handleConfirm(row.id)}
                          className="px-3 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold cursor-pointer transition-colors"
                        >
                          Ký Xác Nhận
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-500 font-mono">
                          {row.confirmedAt}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
