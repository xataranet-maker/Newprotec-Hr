import React, { useState } from 'react';
import { NetDataRecord, UserAccount, ProductionPlan } from '../../types';
import { CalendarRange, Send, Database, CheckCircle, Info } from 'lucide-react';

interface ProductionPlanningHubProps {
  allNetData: NetDataRecord[];
  onAddPlan: (plan: ProductionPlan) => void;
  currentUser: UserAccount;
}

export const ProductionPlanningHub: React.FC<ProductionPlanningHubProps> = ({
  allNetData,
  onAddPlan,
  currentUser
}) => {
  const [selectedDept, setSelectedDept] = useState('Multi Auto');
  const [selectedModel, setSelectedModel] = useState('');
  const [lotCount, setLotCount] = useState<number>(1000);
  const [targetDate, setTargetDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const matchedNet = allNetData.find(n => n.model === selectedModel);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModel) return;

    const plan: ProductionPlan = {
      id: Date.now(),
      targetDept: selectedDept,
      model: selectedModel,
      content: `Kế hoạch SX ${lotCount.toLocaleString()} PNL/Pcs trước ngày ${targetDate}. Lưu ý: ${notes || 'Tiến độ tiêu chuẩn'}.`,
      status: 'PENDING',
      timestamp: new Date().toLocaleString('vi-VN'),
      sender: currentUser.fullName
    };

    onAddPlan(plan);
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
    setNotes('');
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-800">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <CalendarRange className="w-5 h-5 text-cyan-400" />
          <span>Trung Tâm Điều Phối Kế Hoạch Sản Xuất</span>
        </h2>
        <p className="text-xs text-slate-400">
          Chỉ đạo và phân bổ mục tiêu sản xuất cho các phân xưởng Multi Auto, Stiff, Dập Tự Động.
        </p>
      </div>

      {submitted && (
        <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>Kế hoạch sản xuất đã được ban hành thành công và gửi tới trưởng ca!</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <form onSubmit={handleSubmit} className="md:col-span-2 space-y-4 bg-slate-900/90 border border-slate-800 rounded-xl p-5 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">1. Phân xưởng tiếp nhận</label>
            <div className="grid grid-cols-3 gap-2">
              {['Multi Auto', 'Stiff', 'Dập Tự Động'].map(dept => (
                <button
                  type="button"
                  key={dept}
                  onClick={() => setSelectedDept(dept)}
                  className={`py-2 px-3 rounded-lg font-medium border text-center transition-all cursor-pointer ${
                    selectedDept === dept
                      ? 'bg-cyan-600/20 border-cyan-500 text-cyan-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {dept}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">2. Chọn Model từ Data Net</label>
            <select
              value={selectedModel}
              onChange={e => setSelectedModel(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200"
              required
            >
              <option value="">-- Chọn Model Sản Phẩm --</option>
              {allNetData.map(n => (
                <option key={n.id} value={n.model}>
                  {n.model} ({n.code}) - {n.customer || 'Khách hàng'}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">3. Sản lượng mục tiêu</label>
              <input
                type="number"
                value={lotCount}
                onChange={e => setLotCount(Number(e.target.value))}
                min={1}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">4. Hạn hoàn thành</label>
              <input
                type="date"
                value={targetDate}
                onChange={e => setTargetDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">5. Ghi chú & Yêu cầu kỹ thuật</label>
            <textarea
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Yêu cầu kiểm tra ngoại quan, nhiệt độ bàn ép, thứ tự ưu tiên..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
            />
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold shadow-md transition-all cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>Ban Hành Kế Hoạch Cho Phân Xưởng</span>
          </button>
        </form>

        {/* Model Spec Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 text-xs space-y-3">
          <div className="font-bold text-slate-200 flex items-center gap-2 pb-2 border-b border-slate-800">
            <Database className="w-4 h-4 text-cyan-400" />
            <span>Thông Số Kỹ Thuật (Data Net)</span>
          </div>

          {matchedNet ? (
            <div className="space-y-2 text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Model:</span>
                <span className="font-bold text-white font-mono">{matchedNet.model}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Mã hàng:</span>
                <span className="font-mono text-cyan-400">{matchedNet.code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Khách hàng:</span>
                <span>{matchedNet.customer || 'Samsung'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Công đoạn:</span>
                <span>{matchedNet.stage} ({matchedNet.stage1Points} điểm)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Nhiệt bàn / Pad:</span>
                <span className="font-mono">{matchedNet.tableTemp || 145}°C / {matchedNet.padTemp || 130}°C</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Áp suất khí:</span>
                <span className="font-mono">{matchedNet.airPressure || 0.55} MPa</span>
              </div>
              <div className="p-2 rounded bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
                {matchedNet.workingCondition || 'Tiêu chuẩn nhiệt độ 22-26°C'}
              </div>
            </div>
          ) : (
            <div className="text-slate-500 text-center py-8">
              <Info className="w-6 h-6 mx-auto mb-1 text-slate-600" />
              Chọn một model để xem thông số định mức kỹ thuật.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
