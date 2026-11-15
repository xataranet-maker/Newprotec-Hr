import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { AccessoryRecord } from '../../types';
import { FileSearch, Search, Download } from 'lucide-react';

interface MultiAutoAccessoriesDataViewerProps {
  data: AccessoryRecord[];
}

export const MultiAutoAccessoriesDataViewer: React.FC<MultiAutoAccessoriesDataViewerProps> = ({ data }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = data.filter(r =>
    r.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.lotNo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'SO_NHAP_PL');
    XLSX.writeFile(wb, `SO_NHAP_PL_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileSearch className="w-5 h-5 text-purple-400" />
            <span>Sổ Nhập Phụ Liệu (Raw Data Tape/Film)</span>
          </h2>
          <p className="text-xs text-slate-400">
            Truy xuất toàn bộ dữ liệu gốc của các đợt nhập phụ liệu vào phân xưởng.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Tìm Model, Lot PL..."
              className="bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200"
            />
          </div>

          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Xuất Excel</span>
          </button>
        </div>
      </div>

      <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 text-[11px] uppercase">
                <th className="py-2.5 px-3">Thời Gian</th>
                <th className="py-2.5 px-3">Ca</th>
                <th className="py-2.5 px-3">Model</th>
                <th className="py-2.5 px-3">Mã Hàng</th>
                <th className="py-2.5 px-3">Lot PL</th>
                <th className="py-2.5 px-3 text-right">Số Lượng</th>
                <th className="py-2.5 px-3">Hạn Sử Dụng</th>
                <th className="py-2.5 px-3">Trạng Thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-500">
                    Không có bản ghi phụ liệu nào.
                  </td>
                </tr>
              ) : (
                filtered.map(r => (
                  <tr key={r.id} className="hover:bg-slate-800/40">
                    <td className="py-2 px-3 font-mono text-slate-400">{r.date} {r.timestamp}</td>
                    <td className="py-2 px-3 text-slate-300">{r.shift}</td>
                    <td className="py-2 px-3 font-bold text-white font-mono">{r.model}</td>
                    <td className="py-2 px-3 font-mono text-cyan-400">{r.code}</td>
                    <td className="py-2 px-3 font-mono text-purple-400 font-bold">{r.lotNo}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-emerald-400">{r.quantity.toLocaleString()}</td>
                    <td className="py-2 px-3 font-mono text-slate-400">{r.expirationDate || 'N/A'}</td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                        r.isVerified ? 'bg-emerald-950 text-emerald-400' : 'bg-amber-950 text-amber-400'
                      }`}>
                        {r.isVerified ? 'VERIFIED' : 'PENDING'}
                      </span>
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
