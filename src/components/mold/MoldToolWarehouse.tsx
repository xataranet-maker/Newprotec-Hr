import React from 'react';
import { ImportRecord, ProductionHistoryRecord } from '../../types';

export const MoldToolWarehouse: React.FC<{
  importData: ImportRecord[];
  stampingHistory?: ProductionHistoryRecord[];
  onDeleteTool?: (id: number) => void;
  onUpdateTool?: (t: any) => void;
  language?: any;
}> = ({ importData }) => {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h2 className="text-lg font-bold text-white">Kho Công Cụ Khuôn & Phụ Kiện Gá</h2>
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs text-slate-300">
        Tổng số bộ công cụ: {importData.length} bộ
      </div>
    </div>
  );
};
