import React, { useState } from 'react';
import { NetDataRecord, ImportRecord, AccessoryRecord, ApprovalHistoryRecord } from '../../types';
import { CheckCircle2, ShieldCheck, AlertCircle, History, Filter } from 'lucide-react';

interface CheckMaterialProps {
  moduleName?: string;
  netData: NetDataRecord[];
  importData: ImportRecord[];
  accessoryData: AccessoryRecord[];
  approvalHistory: ApprovalHistoryRecord[];
  onConfirmImport: (tpIds: number[], plIds: number[]) => void;
}

export const CheckMaterial: React.FC<CheckMaterialProps> = ({
  moduleName = 'Multi Auto',
  netData,
  importData,
  accessoryData,
  approvalHistory,
  onConfirmImport
}) => {
  const [selectedTpIds, setSelectedTpIds] = useState<number[]>([]);
  const [selectedPlIds, setSelectedPlIds] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');

  const pendingTp = importData.filter(r => !r.isVerified);
  const pendingPl = accessoryData.filter(r => !r.isVerified);

  const handleToggleTp = (id: number) => {
    setSelectedTpIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleTogglePl = (id: number) => {
    setSelectedPlIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleSelectAllTp = () => {
    if (selectedTpIds.length === pendingTp.length) setSelectedTpIds([]);
    else setSelectedTpIds(pendingTp.map(r => r.id));
  };

  const handleSelectAllPl = () => {
    if (selectedPlIds.length === pendingPl.length) setSelectedPlIds([]);
    else setSelectedPlIds(pendingPl.map(r => r.id));
  };

  const handleApprove = () => {
    if (selectedTpIds.length === 0 && selectedPlIds.length === 0) return;
    onConfirmImport(selectedTpIds, selectedPlIds);
    setSelectedTpIds([]);
    setSelectedPlIds([]);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
            <span>Kiểm Soát & Duyệt Nhập Kho ({moduleName})</span>
          </h2>
          <p className="text-xs text-slate-400">
            Đối chiếu thông tin Thành Phẩm (TP) và Phụ Liệu (PL) với Data Net trước khi đưa vào sản xuất.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              activeTab === 'pending'
                ? 'bg-cyan-600 text-white'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Chờ Duyệt ({pendingTp.length + pendingPl.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              activeTab === 'history'
                ? 'bg-cyan-600 text-white'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Lịch Sử Duyệt
          </button>
          {activeTab === 'pending' && (
            <button
              onClick={handleApprove}
              disabled={selectedTpIds.length === 0 && selectedPlIds.length === 0}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition-all shadow-md cursor-pointer ml-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Duyệt Lô Đã Chọn ({selectedTpIds.length + selectedPlIds.length})</span>
            </button>
          )}
        </div>
      </div>

      {activeTab === 'pending' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cột 1: Thành Phẩm Chờ Duyệt */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="font-bold text-xs text-slate-200 uppercase tracking-wider">
                1. Thành Phẩm Chờ Duyệt ({pendingTp.length})
              </span>
              {pendingTp.length > 0 && (
                <button
                  onClick={handleSelectAllTp}
                  className="text-xs text-cyan-400 hover:underline cursor-pointer"
                >
                  {selectedTpIds.length === pendingTp.length ? 'Bỏ chọn' : 'Chọn tất cả'}
                </button>
              )}
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar">
              {pendingTp.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  Không có lô Thành Phẩm nào đang chờ duyệt.
                </div>
              ) : (
                pendingTp.map(tp => {
                  const net = netData.find(n => n.model === tp.model && n.code === tp.code);
                  const isChecked = selectedTpIds.includes(tp.id);
                  return (
                    <div
                      key={tp.id}
                      onClick={() => handleToggleTp(tp.id)}
                      className={`p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-cyan-950/30 border-cyan-500/50'
                          : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="rounded text-cyan-600"
                          />
                          <span className="font-bold text-white">{tp.model}</span>
                        </div>
                        <span className="font-mono text-cyan-400 font-bold">{tp.quantity.toLocaleString()} PNL</span>
                      </div>
                      <div className="mt-1 flex justify-between text-slate-400 font-mono text-[11px]">
                        <span>LOT: {tp.lotNo}</span>
                        <span>C.Đoạn: {tp.stage}</span>
                      </div>
                      {net ? (
                        <div className="mt-1.5 text-[10px] text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Khớp Data Net ({net.stage1Points} điểm dập, TPP: {net.timePerPoint}s)</span>
                        </div>
                      ) : (
                        <div className="mt-1.5 text-[10px] text-amber-400 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          <span>Chưa có Data Net</span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Cột 2: Phụ Liệu Chờ Duyệt */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="font-bold text-xs text-slate-200 uppercase tracking-wider">
                2. Phụ Liệu Chờ Duyệt ({pendingPl.length})
              </span>
              {pendingPl.length > 0 && (
                <button
                  onClick={handleSelectAllPl}
                  className="text-xs text-cyan-400 hover:underline cursor-pointer"
                >
                  {selectedPlIds.length === pendingPl.length ? 'Bỏ chọn' : 'Chọn tất cả'}
                </button>
              )}
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar">
              {pendingPl.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  Không có lô Phụ Liệu nào đang chờ duyệt.
                </div>
              ) : (
                pendingPl.map(pl => {
                  const isChecked = selectedPlIds.includes(pl.id);
                  return (
                    <div
                      key={pl.id}
                      onClick={() => handleTogglePl(pl.id)}
                      className={`p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-cyan-950/30 border-cyan-500/50'
                          : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="rounded text-cyan-600"
                          />
                          <span className="font-bold text-white">{pl.model}</span>
                        </div>
                        <span className="font-mono text-purple-400 font-bold">{pl.quantity.toLocaleString()} Cuộn/Pcs</span>
                      </div>
                      <div className="mt-1 flex justify-between text-slate-400 font-mono text-[11px]">
                        <span>LOT PL: {pl.lotNo}</span>
                        <span>HSD: {pl.expirationDate || 'Không có'}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Lịch Sử Duyệt */
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="font-bold text-sm text-white flex items-center gap-2">
            <History className="w-4 h-4 text-cyan-400" />
            <span>Nhật Ký Duyệt Nhập Kho Gần Đây</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[11px] uppercase">
                  <th className="py-2 px-3">Thời Gian</th>
                  <th className="py-2 px-3">Bộ Phận</th>
                  <th className="py-2 px-3">Số Lượng TP</th>
                  <th className="py-2 px-3">Số Lượng PL</th>
                  <th className="py-2 px-3">Nội Dung</th>
                  <th className="py-2 px-3">Người Duyệt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {approvalHistory.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      Chưa có lịch sử duyệt nào được ghi lại.
                    </td>
                  </tr>
                ) : (
                  approvalHistory.map(log => (
                    <tr key={log.id} className="hover:bg-slate-800/40">
                      <td className="py-2 px-3 font-mono text-slate-400">{log.date} {log.timestamp}</td>
                      <td className="py-2 px-3 font-semibold text-cyan-400">{log.moduleName}</td>
                      <td className="py-2 px-3 font-mono text-emerald-400">{log.tpCount} lô</td>
                      <td className="py-2 px-3 font-mono text-purple-400">{log.plCount} lô</td>
                      <td className="py-2 px-3">{log.details}</td>
                      <td className="py-2 px-3 font-mono text-slate-400">{log.operator}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
