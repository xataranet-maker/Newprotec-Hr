import React, { useState } from 'react';
import { 
  ImportRecord, MachineSetup, AccessoryRecord, NetDataRecord, 
  Language, FaultRecord 
} from '../../types';
import { 
  Factory, Play, Pause, CheckCircle2, Link, Clock, 
  AlertTriangle, Filter, Search, ShieldCheck 
} from 'lucide-react';

interface MultiAutoProductionProps {
  data: ImportRecord[];
  onUpdateStatus: (id: number, status: any, stopReason?: string, stage?: string, extra?: any) => void;
  onUpdateMachine: (id: number, machine: string, stage?: string) => void;
  onLinkAccessory: (id: number, lot: string, qty: number, stage?: string) => void;
  onUpdateMpsBatch?: (batch: any[]) => void;
  machineStatuses: MachineSetup[];
  accessoriesData: AccessoryRecord[];
  netData: NetDataRecord[];
  language?: Language;
  faultRecords?: FaultRecord[];
}

export const MultiAutoProduction: React.FC<MultiAutoProductionProps> = ({
  data,
  onUpdateStatus,
  onUpdateMachine,
  onLinkAccessory,
  machineStatuses,
  accessoriesData,
  netData
}) => {
  const [filterMachine, setFilterMachine] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Accessory link modal state
  const [linkingRecordId, setLinkingRecordId] = useState<number | null>(null);
  const [selectedAccLot, setSelectedAccLot] = useState('');
  const [accQty, setAccQty] = useState<number>(100);

  // Stop reason modal state
  const [stoppingRecordId, setStoppingRecordId] = useState<number | null>(null);
  const [stopReason, setStopReason] = useState('Hết phụ liệu / Chờ cuộn');

  const filtered = data.filter(r => {
    const stage = r.stage || '1L-1';
    const prog = r.productionProgress?.[stage] || { status: r.productionStatus || 'PENDING' };
    const mach = prog.machine || 'Chưa gán';

    const matchMachine = filterMachine === 'ALL' || mach === filterMachine;
    const matchStatus = filterStatus === 'ALL' || prog.status === filterStatus;
    const matchSearch = r.model.toLowerCase().includes(searchTerm.toLowerCase()) || r.lotNo.toLowerCase().includes(searchTerm.toLowerCase());

    return matchMachine && matchStatus && matchSearch;
  });

  const handleOpenLinkModal = (recordId: number) => {
    setLinkingRecordId(recordId);
    if (accessoriesData.length > 0) {
      setSelectedAccLot(accessoriesData[0].lotNo);
    }
  };

  const handleConfirmLink = () => {
    if (!linkingRecordId || !selectedAccLot) return;
    const record = data.find(r => r.id === linkingRecordId);
    const stage = record?.stage || '1L-1';
    onLinkAccessory(linkingRecordId, selectedAccLot, accQty, stage);
    setLinkingRecordId(null);
  };

  const handleConfirmStop = () => {
    if (!stoppingRecordId) return;
    const record = data.find(r => r.id === stoppingRecordId);
    const stage = record?.stage || '1L-1';
    onUpdateStatus(stoppingRecordId, 'STOPPED', stopReason, stage);
    setStoppingRecordId(null);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Factory className="w-5 h-5 text-blue-400" />
            <span>Trạm Sản Xuất Multi Auto (Điều Phối Máy & Gắn Phụ Liệu)</span>
          </h2>
          <p className="text-xs text-slate-400">
            Giám sát thời gian thực, phân bổ máy gia công và gắn lô phụ liệu (Tape/Film) cho từng lô PNL.
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2">
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

          <select
            value={filterMachine}
            onChange={e => setFilterMachine(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300"
          >
            <option value="ALL">Tất cả máy</option>
            {machineStatuses.map(m => (
              <option key={m.id} value={m.name}>{m.name}</option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="PENDING">Chờ chạy (PENDING)</option>
            <option value="RUNNING">Đang chạy (RUNNING)</option>
            <option value="STOPPED">Tạm dừng (STOPPED)</option>
            <option value="COMPLETED">Hoàn thành (COMPLETED)</option>
          </select>
        </div>
      </div>

      {/* Cards list */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-full p-12 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
            Không tìm thấy lệnh sản xuất nào phù hợp với bộ lọc hiện tại.
          </div>
        ) : (
          filtered.map(record => {
            const stage = record.stage || '1L-1';
            const prog = record.productionProgress?.[stage] || { status: record.productionStatus || 'PENDING' };
            const currentStatus = prog.status || 'PENDING';
            const net = netData.find(n => n.model === record.model && n.code === record.code);
            const machine = prog.machine || 'Chưa gán máy';
            const accLot = prog.accessoryLot;

            return (
              <div
                key={record.id}
                className={`p-4 rounded-xl border transition-all space-y-3 ${
                  currentStatus === 'RUNNING'
                    ? 'bg-slate-900/90 border-cyan-500/50 shadow-md shadow-cyan-950/20'
                    : currentStatus === 'STOPPED'
                    ? 'bg-slate-900/90 border-amber-500/40'
                    : 'bg-slate-900/70 border-slate-800'
                }`}
              >
                {/* Header */}
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold text-white text-sm">{record.model}</div>
                    <div className="text-[11px] text-cyan-400 font-mono">LOT: {record.lotNo}</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                    currentStatus === 'RUNNING'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : currentStatus === 'STOPPED'
                      ? 'bg-amber-950 text-amber-400 border border-amber-800'
                      : 'bg-slate-800 text-slate-400'
                  }`}>
                    {currentStatus}
                  </span>
                </div>

                {/* Specs */}
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Sản Lượng:</span>
                    <span className="font-mono font-bold text-white">{record.quantity.toLocaleString()} PNL</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Công Đoạn:</span>
                    <span className="font-mono text-cyan-400">{stage}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Máy Gia Công:</span>
                    <span className="font-semibold text-slate-200">{machine}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Lô Phụ Liệu:</span>
                    <span className="font-mono text-purple-300 truncate block">
                      {accLot || 'Chưa gắn cuộn'}
                    </span>
                  </div>
                </div>

                {/* Machine Selection Dropdown if not assigned */}
                <div className="flex gap-2 text-xs">
                  <select
                    value={prog.machine || ''}
                    onChange={e => onUpdateMachine(record.id, e.target.value, stage)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-slate-300 text-xs"
                  >
                    <option value="">-- Chọn Máy --</option>
                    {machineStatuses.map(m => (
                      <option key={m.id} value={m.name}>{m.name}</option>
                    ))}
                  </select>

                  <button
                    onClick={() => handleOpenLinkModal(record.id)}
                    className="px-2.5 py-1.5 rounded-lg bg-purple-950/50 hover:bg-purple-900/60 text-purple-300 border border-purple-800/40 text-xs font-medium cursor-pointer transition-colors flex items-center gap-1"
                    title="Gắn mã lô phụ liệu"
                  >
                    <Link className="w-3.5 h-3.5" />
                    <span>Gắn PL</span>
                  </button>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
                  {currentStatus === 'RUNNING' ? (
                    <button
                      onClick={() => setStoppingRecordId(record.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs cursor-pointer shadow-sm transition-colors"
                    >
                      <Pause className="w-3.5 h-3.5" />
                      <span>Tạm Dừng</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => onUpdateStatus(record.id, 'RUNNING', undefined, stage)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs cursor-pointer shadow-sm transition-colors"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>{currentStatus === 'STOPPED' ? 'Tiếp Tục' : 'Bắt Đầu Chạy'}</span>
                    </button>
                  )}

                  <button
                    onClick={() => onUpdateStatus(record.id, 'COMPLETED', undefined, stage)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs cursor-pointer shadow-sm transition-colors flex items-center gap-1"
                    title="Hoàn thành sản xuất"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Xong</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal 1: Gắn Lô Phụ Liệu */}
      {linkingRecordId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-sm w-full p-5 space-y-4 text-xs">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Link className="w-4 h-4 text-purple-400" />
              <span>Gắn Lô Phụ Liệu (Tape/Film)</span>
            </h3>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Chọn Lô Phụ Liệu Sẵn Có</label>
              <select
                value={selectedAccLot}
                onChange={e => setSelectedAccLot(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
              >
                {accessoriesData.map(a => (
                  <option key={a.id} value={a.lotNo}>
                    {a.lotNo} ({a.model} - Còn: {a.quantity})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Số Lượng Sử Dụng Ước Tính</label>
              <input
                type="number"
                value={accQty}
                onChange={e => setAccQty(Number(e.target.value))}
                min={1}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setLinkingRecordId(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmLink}
                className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold cursor-pointer"
              >
                Xác Nhận Gắn
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Tạm Dừng & Chọn Lý Do */}
      {stoppingRecordId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-sm w-full p-5 space-y-4 text-xs">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Ghi Nhận Lý Do Tạm Dừng Máy</span>
            </h3>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Lý do dừng máy</label>
              <select
                value={stopReason}
                onChange={e => setStopReason(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
              >
                <option value="Hết phụ liệu / Chờ cuộn">Hết phụ liệu / Chờ cuộn</option>
                <option value="Kẹt phôi / Lỗi nạp liệu">Kẹt phôi / Lỗi nạp liệu</option>
                <option value="Lỗi nhiệt bàn ép">Lỗi nhiệt bàn ép</option>
                <option value="Chờ kỹ thuật kiểm tra">Chờ kỹ thuật kiểm tra</option>
                <option value="Giao ca / Nghỉ giữa ca">Giao ca / Nghỉ giữa ca</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStoppingRecordId(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmStop}
                className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold cursor-pointer"
              >
                Xác Nhận Dừng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
