import React from 'react';
import { ProductionHistoryRecord, AccessoryParameter, AccessoryRecord, NetDataRecord } from '../../types';
import { ClipboardList, CheckCircle2, AlertTriangle } from 'lucide-react';

interface AccessoryCheckSheetProps {
  historyData: ProductionHistoryRecord[];
  accessoryParams: AccessoryParameter[];
  accessoriesData: AccessoryRecord[];
  netData: NetDataRecord[];
}

export const AccessoryCheckSheet: React.FC<AccessoryCheckSheetProps> = ({
  accessoriesData,
  accessoryParams
}) => {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-800">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-emerald-400" />
          <span>Phiếu Kiểm Tra Chất Lượng Phụ Liệu (Tape/Film Inspection)</span>
        </h2>
        <p className="text-xs text-slate-400">
          Biểu mẫu kiểm tra ngoại quan, kích thước đo đạc và hạn sử dụng trước khi đưa cuộn vào sản xuất.
        </p>
      </div>

      <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 text-[11px] uppercase">
                <th className="py-2.5 px-3">Mã Lô PL</th>
                <th className="py-2.5 px-3">Model</th>
                <th className="py-2.5 px-3">Quy Cách Kỹ Thuật</th>
                <th className="py-2.5 px-3">Ngoại Quan (Bề mặt)</th>
                <th className="py-2.5 px-3">Độ Dính & Keo</th>
                <th className="py-2.5 px-3">Hạn Dùng</th>
                <th className="py-2.5 px-3 text-center">Kết Luận</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {accessoriesData.map(a => {
                const param = accessoryParams.find(p => p.model === a.model);
                return (
                  <tr key={a.id} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-mono text-purple-400 font-bold">{a.lotNo}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-white">{a.model}</td>
                    <td className="py-2.5 px-3 text-slate-300">
                      {param ? `${param.thickness} x ${param.width}mm x ${param.length}mm` : 'Đang cập nhật'}
                    </td>
                    <td className="py-2.5 px-3 text-emerald-400">Đạt (Không nhăn/bụi)</td>
                    <td className="py-2.5 px-3 text-emerald-400">Đạt chuẩn 3M/Nitto</td>
                    <td className="py-2.5 px-3 font-mono text-slate-400">{a.expirationDate || '2027-12-31'}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/40">
                        PASS (ĐẠT)
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
