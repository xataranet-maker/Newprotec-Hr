import React from 'react';
import { ProductionHistoryRecord, ExportRecord } from '../../types';
import { Package } from 'lucide-react';

export const StampingAccessoriesInventory: React.FC<{
  productionHistory: ProductionHistoryRecord[];
  exports: ExportRecord[];
}> = ({ productionHistory, exports }) => {
  const totalProducedPcs = productionHistory.reduce((acc, h) => acc + (h.totalPcs || h.quantity * 4 || 0), 0);
  const totalExportedPcs = exports.reduce((acc, e) => acc + (e.quantity || 0), 0);
  const stockPcs = totalProducedPcs - totalExportedPcs;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-800">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Package className="w-5 h-5 text-yellow-400" />
          <span>Tồn Kho Thành Phẩm Sau Dập (Pcs)</span>
        </h2>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs space-y-2">
        <div className="text-slate-400">Tồn kho thành phẩm linh kiện: <span className="font-mono text-yellow-400 font-bold text-base">{stockPcs.toLocaleString()} Pcs</span></div>
        <div className="text-slate-500 font-mono text-[11px]">(Đã dập: {totalProducedPcs.toLocaleString()} Pcs | Đã xuất: {totalExportedPcs.toLocaleString()} Pcs)</div>
      </div>
    </div>
  );
};
