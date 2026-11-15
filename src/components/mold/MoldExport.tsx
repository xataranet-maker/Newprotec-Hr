import React from 'react';
import { ImportRecord, ExportRecord } from '../../types';
import { Upload } from 'lucide-react';

export const MoldExport: React.FC<{
  importData: ImportRecord[];
  exportData: ExportRecord[];
  onAddBatch: (records: any[]) => void;
  language?: any;
}> = ({ exportData }) => {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-800">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Upload className="w-5 h-5 text-blue-400" />
          <span>Lệnh Xuất Khuôn / Jig Vào Xưởng Sản Xuất</span>
        </h2>
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs">
        <div className="divide-y divide-slate-800">
          {exportData.map(e => (
            <div key={e.id} className="py-2 flex justify-between text-slate-300">
              <span className="font-mono text-slate-400">{e.date}</span>
              <span className="font-bold text-white">{e.model}</span>
              <span className="font-mono text-cyan-400">{e.lotNo}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
