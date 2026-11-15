import React, { useState } from 'react';
import { ImportRecord, ExportRecord, Language, UserRole } from '../../types';
import { Package, Search, ArrowDownRight, Edit3, Trash2, RotateCcw } from 'lucide-react';

interface MultiAutoInventoryProps {
  imports: ImportRecord[];
  exports: ExportRecord[];
  returns?: any[];
  onReturn?: (ret: any) => void;
  language?: Language;
  userRole?: UserRole;
  onDelete?: (lot: string) => void;
  onFixStock?: (lot: string, qty: number) => void;
}

export const MultiAutoInventory: React.FC<MultiAutoInventoryProps> = ({
  imports,
  exports,
  returns = [],
  onReturn,
  onDelete,
  onFixStock
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingLot, setEditingLot] = useState<string | null>(null);
  const [newStockQty, setNewStockQty] = useState<number>(0);

  // Group inventory by Model and Lot
  const inventoryMap = new Map<string, { model: string; code: string; lotNo: string; stage: string; importedQty: number; exportedQty: number; returnedQty: number; stockQty: number }>();

  imports.forEach(imp => {
    const key = `${imp.model}_${imp.lotNo}`;
    if (!inventoryMap.has(key)) {
      inventoryMap.set(key, {
        model: imp.model,
        code: imp.code,
        lotNo: imp.lotNo,
        stage: imp.stage || '1L-1',
        importedQty: 0,
        exportedQty: 0,
        returnedQty: 0,
        stockQty: 0
      });
    }
    const item = inventoryMap.get(key)!;
    item.importedQty += imp.quantity;
  });

  exports.forEach(exp => {
    const key = `${exp.model}_${exp.lotNo}`;
    if (inventoryMap.has(key)) {
      inventoryMap.get(key)!.exportedQty += exp.quantity;
    }
  });

  returns.forEach(ret => {
    const key = `${ret.model}_${ret.lotNo}`;
    if (inventoryMap.has(key)) {
      inventoryMap.get(key)!.returnedQty += ret.quantity;
    }
  });

  // Calculate stock = imported - exported + returned
  const inventoryList = Array.from(inventoryMap.values()).map(item => ({
    ...item,
    stockQty: item.importedQty - item.exportedQty + item.returnedQty
  }));

  const filtered = inventoryList.filter(item =>
    item.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.lotNo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalStock = filtered.reduce((acc, i) => acc + i.stockQty, 0);

  const handleSaveStock = (lotNo: string) => {
    if (onFixStock) onFixStock(lotNo, newStockQty);
    setEditingLot(null);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-yellow-400" />
            <span>Tồn Kho Thành Phẩm PNL (Multi Auto)</span>
          </h2>
          <p className="text-xs text-slate-400">
            Theo dõi lượng tồn kho thực tế của từng mã hàng và số lô sau quá trình xuất nhập xưởng.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 flex items-center gap-2 text-xs">
            <span className="text-slate-400">Tổng tồn:</span>
            <span className="font-mono font-bold text-yellow-400 text-sm">
              {totalStock.toLocaleString()} PNL
            </span>
          </div>

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
        </div>
      </div>

      <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 text-[11px] uppercase">
                <th className="py-2.5 px-3">Model</th>
                <th className="py-2.5 px-3">Mã Hàng (Code)</th>
                <th className="py-2.5 px-3">Mã Lô (Lot No)</th>
                <th className="py-2.5 px-3">Công Đoạn</th>
                <th className="py-2.5 px-3 text-right">Tổng Nhập</th>
                <th className="py-2.5 px-3 text-right">Đã Xuất</th>
                <th className="py-2.5 px-3 text-right">Trả Về</th>
                <th className="py-2.5 px-3 text-right">Tồn Thực Tế</th>
                <th className="py-2.5 px-3 text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    Kho thành phẩm trống hoặc không tìm thấy kết quả phù hợp.
                  </td>
                </tr>
              ) : (
                filtered.map(item => (
                  <tr key={item.lotNo} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-bold text-white font-mono">{item.model}</td>
                    <td className="py-2.5 px-3 font-mono text-cyan-400">{item.code}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-300 font-semibold">{item.lotNo}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-400">{item.stage}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-400">{item.importedQty.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-amber-400">{item.exportedQty.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-purple-400">{item.returnedQty.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-yellow-300 text-sm">
                      {editingLot === item.lotNo ? (
                        <input
                          type="number"
                          value={newStockQty}
                          onChange={e => setNewStockQty(Number(e.target.value))}
                          className="w-24 bg-slate-950 border border-cyan-500 rounded px-1.5 py-0.5 text-right font-mono"
                        />
                      ) : (
                        item.stockQty.toLocaleString()
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {editingLot === item.lotNo ? (
                          <button
                            onClick={() => handleSaveStock(item.lotNo)}
                            className="px-2 py-0.5 bg-cyan-600 text-white rounded text-[10px] font-bold cursor-pointer"
                          >
                            Lưu
                          </button>
                        ) : (
                          <button
                            onClick={() => { setEditingLot(item.lotNo); setNewStockQty(item.stockQty); }}
                            className="p-1 rounded text-cyan-400 hover:bg-cyan-950/40 cursor-pointer"
                            title="Chỉnh sửa tồn kho"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {onDelete && (
                          <button
                            onClick={() => onDelete(item.lotNo)}
                            className="p-1 rounded text-red-400 hover:bg-red-950/40 cursor-pointer"
                            title="Xóa lô tồn"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
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
