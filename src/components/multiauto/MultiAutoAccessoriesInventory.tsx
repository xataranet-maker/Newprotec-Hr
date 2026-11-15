import React, { useState } from 'react';
import { AccessoryRecord, AccessoryUsageRecord, NetDataRecord, Language } from '../../types';
import { ArchiveRestore, Search, Trash2 } from 'lucide-react';

interface MultiAutoAccessoriesInventoryProps {
  imports: AccessoryRecord[];
  usage: AccessoryUsageRecord[];
  returns?: any[];
  onReturn?: (ret: any) => void;
  language?: Language;
  netData?: NetDataRecord[];
  historyData?: any[];
  productionData?: any[];
  userRole?: string;
  onDelete?: (lot: string) => void;
}

export const MultiAutoAccessoriesInventory: React.FC<MultiAutoAccessoriesInventoryProps> = ({
  imports,
  usage,
  returns = [],
  onDelete
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Group by Lot PL
  const accMap = new Map<string, { model: string; code: string; lotNo: string; stage: string; importedQty: number; usedQty: number; returnedQty: number; stockQty: number }>();

  imports.forEach(acc => {
    if (!accMap.has(acc.lotNo)) {
      accMap.set(acc.lotNo, {
        model: acc.model,
        code: acc.code,
        lotNo: acc.lotNo,
        stage: acc.stage,
        importedQty: 0,
        usedQty: 0,
        returnedQty: 0,
        stockQty: 0
      });
    }
    accMap.get(acc.lotNo)!.importedQty += acc.quantity;
  });

  usage.forEach(u => {
    if (accMap.has(u.accessoryLotNo)) {
      accMap.get(u.accessoryLotNo)!.usedQty += u.quantity;
    }
  });

  returns.forEach(r => {
    if (accMap.has(r.lotNo)) {
      accMap.get(r.lotNo)!.returnedQty += r.quantity;
    }
  });

  const list = Array.from(accMap.values()).map(item => ({
    ...item,
    stockQty: item.importedQty - item.usedQty + item.returnedQty
  }));

  const filtered = list.filter(i =>
    i.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.lotNo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalStock = filtered.reduce((acc, i) => acc + i.stockQty, 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ArchiveRestore className="w-5 h-5 text-amber-400" />
            <span>Tồn Kho Phụ Liệu (Tape, Film, Cuộn Ép)</span>
          </h2>
          <p className="text-xs text-slate-400">
            Theo dõi lượng tồn thực tế của các lô cuộn phụ liệu sau khi gắn vào các trạm sản xuất.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 flex items-center gap-2 text-xs">
            <span className="text-slate-400">Tổng tồn PL:</span>
            <span className="font-mono font-bold text-amber-400 text-sm">
              {totalStock.toLocaleString()} Cuộn/Pcs
            </span>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Tìm LOT PL, model..."
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
                <th className="py-2.5 px-3">Model Sử Dụng</th>
                <th className="py-2.5 px-3">Mã Hàng (Code)</th>
                <th className="py-2.5 px-3">Mã Lô PL (Lot No)</th>
                <th className="py-2.5 px-3">Công Đoạn</th>
                <th className="py-2.5 px-3 text-right">Tổng Nhập</th>
                <th className="py-2.5 px-3 text-right">Đã Dùng</th>
                <th className="py-2.5 px-3 text-right">Trả Lại</th>
                <th className="py-2.5 px-3 text-right">Tồn Thực Tế</th>
                <th className="py-2.5 px-3 text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    Không tìm thấy dữ liệu tồn kho phụ liệu nào.
                  </td>
                </tr>
              ) : (
                filtered.map(item => (
                  <tr key={item.lotNo} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-bold text-white font-mono">{item.model}</td>
                    <td className="py-2.5 px-3 font-mono text-cyan-400">{item.code}</td>
                    <td className="py-2.5 px-3 font-mono text-purple-400 font-bold">{item.lotNo}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-400">{item.stage}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-400">{item.importedQty.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-amber-400">{item.usedQty.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-blue-400">{item.returnedQty.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-300 text-sm">
                      {item.stockQty.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {onDelete && (
                        <button
                          onClick={() => onDelete(item.lotNo)}
                          className="p-1 rounded text-red-400 hover:bg-red-950/40 cursor-pointer"
                          title="Xóa lô tồn"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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
