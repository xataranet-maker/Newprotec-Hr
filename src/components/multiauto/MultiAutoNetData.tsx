import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { NetDataRecord } from '../../types';
import { Database, Plus, Search, Trash2, Edit2, Download, Upload, CheckCircle } from 'lucide-react';

interface MultiAutoNetDataProps {
  data: NetDataRecord[];
  onDataUpdate: (records: NetDataRecord[]) => void;
}

export const MultiAutoNetData: React.FC<MultiAutoNetDataProps> = ({
  data,
  onDataUpdate
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [model, setModel] = useState('');
  const [code, setCode] = useState('');
  const [customer, setCustomer] = useState('');
  const [stage, setStage] = useState('1L-1');
  const [stage1Points, setStage1Points] = useState(12);
  const [timePerPoint, setTimePerPoint] = useState(1.2);
  const [tableTemp, setTableTemp] = useState(145);
  const [padTemp, setPadTemp] = useState(130);
  const [airPressure, setAirPressure] = useState(0.55);

  const filtered = data.filter(n =>
    n.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
    n.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (n.customer && n.customer.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!model || !code) return;

    if (editingId) {
      onDataUpdate(data.map(item => item.id === editingId ? {
        ...item,
        model,
        code,
        customer,
        stage,
        stage1Points,
        timePerPoint,
        tableTemp,
        padTemp,
        airPressure
      } : item));
      setEditingId(null);
    } else {
      const newItem: NetDataRecord = {
        id: Date.now(),
        model,
        code,
        customer,
        stage,
        stage1Points,
        timePerPoint,
        tableTemp,
        padTemp,
        airPressure,
        status: 'OK',
        department: 'MULTI'
      };
      onDataUpdate([newItem, ...data]);
    }

    setShowAddModal(false);
    resetForm();
  };

  const resetForm = () => {
    setModel('');
    setCode('');
    setCustomer('');
    setStage('1L-1');
    setStage1Points(12);
    setTimePerPoint(1.2);
    setTableTemp(145);
    setPadTemp(130);
    setAirPressure(0.55);
  };

  const handleEdit = (item: NetDataRecord) => {
    setEditingId(item.id);
    setModel(item.model);
    setCode(item.code);
    setCustomer(item.customer || '');
    setStage(item.stage || '1L-1');
    setStage1Points(item.stage1Points || 1);
    setTimePerPoint(item.timePerPoint || 1.2);
    setTableTemp(item.tableTemp || 145);
    setPadTemp(item.padTemp || 130);
    setAirPressure(item.airPressure || 0.55);
    setShowAddModal(true);
  };

  const handleDelete = (id: number) => {
    if (confirm('Bạn có chắc muốn xóa thông số model này khỏi Data Net?')) {
      onDataUpdate(data.filter(n => n.id !== id));
    }
  };

  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'DATA_NET');
    XLSX.writeFile(wb, `DATA_NET_MULTI_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const b = new Uint8Array(evt.target?.result as ArrayBuffer);
        const wb = XLSX.read(b, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws);
        if (json.length > 0) {
          onDataUpdate(json as NetDataRecord[]);
          alert(`Đã nạp thành công ${json.length} bản ghi Data Net!`);
        }
      } catch (err: any) {
        alert('Lỗi đọc file Excel: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-cyan-400" />
            <span>Quản Trị Định Mức Kỹ Thuật (Data Net Multi Auto)</span>
          </h2>
          <p className="text-xs text-slate-400">
            Cấu hình số điểm dập, nhiệt độ bàn ép, áp suất khí nén và thời gian chu kỳ cho từng mã hàng.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Tìm Model, Code, Khách hàng..."
              className="bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200"
            />
          </div>

          <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold cursor-pointer">
            <Upload className="w-3.5 h-3.5 text-cyan-400" />
            <span>Nhập Excel</span>
            <input type="file" accept=".xlsx, .xls" onChange={handleImportExcel} className="hidden" />
          </label>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Xuất Excel</span>
          </button>

          <button
            onClick={() => { resetForm(); setEditingId(null); setShowAddModal(true); }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Model Mới</span>
          </button>
        </div>
      </div>

      {/* Bảng danh sách Data Net */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 text-[11px] uppercase">
                <th className="py-2.5 px-3">Model</th>
                <th className="py-2.5 px-3">Mã Hàng (Code)</th>
                <th className="py-2.5 px-3">Khách Hàng</th>
                <th className="py-2.5 px-3">Công Đoạn</th>
                <th className="py-2.5 px-3 text-right">Số Điểm Dập</th>
                <th className="py-2.5 px-3 text-right">Thời Gian/Điểm</th>
                <th className="py-2.5 px-3 text-center">Nhiệt Bàn / Pad</th>
                <th className="py-2.5 px-3 text-right">Áp Suất (MPa)</th>
                <th className="py-2.5 px-3 text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    Không tìm thấy bản ghi Data Net nào.
                  </td>
                </tr>
              ) : (
                filtered.map(item => (
                  <tr key={item.id} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-bold text-white font-mono">{item.model}</td>
                    <td className="py-2.5 px-3 font-mono text-cyan-400">{item.code}</td>
                    <td className="py-2.5 px-3">{item.customer || 'Samsung'}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-400">{item.stage}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">{item.stage1Points}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{item.timePerPoint}s</td>
                    <td className="py-2.5 px-3 text-center font-mono">{item.tableTemp || 145}° / {item.padTemp || 130}°</td>
                    <td className="py-2.5 px-3 text-right font-mono">{item.airPressure || 0.55}</td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-1 rounded text-cyan-400 hover:bg-cyan-950/40 cursor-pointer"
                          title="Sửa"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1 rounded text-red-400 hover:bg-red-950/40 cursor-pointer"
                          title="Xóa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Thêm / Sửa Model */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-5 space-y-4 text-xs">
            <h3 className="text-base font-bold text-white">
              {editingId ? 'Cập Nhật Thông Số Data Net' : 'Thêm Model Data Net Mới'}
            </h3>

            <form onSubmit={handleSave} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Model Sản Phẩm</label>
                  <input
                    type="text"
                    value={model}
                    onChange={e => setModel(e.target.value)}
                    placeholder="VD: SM-S928B"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Mã Sản Phẩm (Code)</label>
                  <input
                    type="text"
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    placeholder="VD: NP-S928-01"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Khách Hàng</label>
                  <input
                    type="text"
                    value={customer}
                    onChange={e => setCustomer(e.target.value)}
                    placeholder="VD: Samsung Electronics"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Công Đoạn</label>
                  <input
                    type="text"
                    value={stage}
                    onChange={e => setStage(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Số Điểm Dập (Points)</label>
                  <input
                    type="number"
                    value={stage1Points}
                    onChange={e => setStage1Points(Number(e.target.value))}
                    min={1}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Thời Gian / Điểm (Giây)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={timePerPoint}
                    onChange={e => setTimePerPoint(Number(e.target.value))}
                    min={0.1}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Nhiệt Bàn (°C)</label>
                  <input
                    type="number"
                    value={tableTemp}
                    onChange={e => setTableTemp(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Nhiệt Pad (°C)</label>
                  <input
                    type="number"
                    value={padTemp}
                    onChange={e => setPadTemp(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Áp Suất (MPa)</label>
                  <input
                    type="number"
                    step="0.05"
                    value={airPressure}
                    onChange={e => setAirPressure(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold cursor-pointer shadow-md"
                >
                  Lưu Thông Số
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
