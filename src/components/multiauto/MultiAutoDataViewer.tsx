import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { ImportRecord } from '../../types';
import { FileSearch, Search, Download } from 'lucide-react';

interface MultiAutoDataViewerProps {
  data: ImportRecord[];
}

export const MultiAutoDataViewer: React.FC<MultiAutoDataViewerProps> = ({ data }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = data.filter(r =>
    r.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.lotNo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'SO_NHAP_TP');
    XLSX.writeFile(wb, `SO_NHAP_TP_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileSearch className="w-5 h-5 text-cyan-400" />
            <span>Sổ Nhập Thành Phẩm (Raw Data Multi Auto)</span>
          </h2>
          <p className="text-xs text-slate-400">
            Truy xuất toàn bộ sổ gốc dữ liệu nhập kho Thành phẩm đầu vào.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Tìm Model, Lot..."
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
                <th className="py-2.5 px-3">ID</th>
                <th className="py-2.5 px-3">Ngày Nhập</th>
                <th className="py-2.5 px-3">Thời Gian</th>
                <th className="py-2.5 px-3">Ca</th>
                <th className="py-2.5 px-3">Model</th>
                <th className="py-2.5 px-3">Code</th>
                <th className="py-2.5 px-3">Lot No</th>
                <th className="py-2.5 px-3 text-right">Số Lượng (PNL)</th>
                <th className="py-2.5 px-3">Công Đoạn</th>
                <th className="py-2.5 px-3">Kiểm Duyệt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-slate-500">
                    Không tìm thấy dữ liệu.
                  </td>
                </tr>
              ) : (
                filtered.map(r => (
                  <tr key={r.id} className="hover:bg-slate-800/40">
                    <td className="py-2 px-3 font-mono text-slate-500">{r.id}</td>
                    <td className="py-2 px-3 font-mono text-slate-400">{r.date}</td>
                    <td className="py-2 px-3 font-mono text-slate-400">{r.timestamp}</td>
                    <td className="py-2 px-3 text-slate-300">{r.shift}</td>
                    <td className="py-2 px-3 font-bold text-white font-mono">{r.model}</td>
                    <td className="py-2 px-3 font-mono text-cyan-400">{r.code}</td>
                    <td className="py-2 px-3 font-mono text-slate-300">{r.lotNo}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-emerald-400">{r.quantity.toLocaleString()}</td>
                    <td className="py-2 px-3 font-mono text-slate-400">{r.stage}</td>
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
