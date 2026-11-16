import React, { useState } from 'react';
import { UserAccount, ProductionPlan } from '../../types';
import { CalendarRange, Send, CheckCircle } from 'lucide-react';

interface ProductionPlanningHubProps {
  onAddPlan: (plan: ProductionPlan) => void;
  currentUser: UserAccount;
}

export const ProductionPlanningHub: React.FC<ProductionPlanningHubProps> = ({
  onAddPlan,
  currentUser,
}) => {
  const [selectedDept, setSelectedDept] = useState('Multi Auto');
  const [planTitle, setPlanTitle] = useState('');
  const [targetCount, setTargetCount] = useState<number>(10);
  const [targetDate, setTargetDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!planTitle.trim()) return;

    const plan: ProductionPlan = {
      id: Date.now(),
      targetDept: selectedDept,
      model: planTitle.trim(),
      content: `Mục tiêu ${targetCount.toLocaleString()} trước ngày ${targetDate}. Ghi chú: ${notes || 'Tiêu chuẩn'}.`,
      status: 'PENDING',
      timestamp: new Date().toLocaleString('vi-VN'),
      sender: currentUser.fullName,
    };

    onAddPlan(plan);
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
    setNotes('');
    setPlanTitle('');
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-800 px-7 sm:px-0 text-center sm:text-left">
        <h2 className="text-base sm:text-lg font-bold text-white flex flex-wrap items-center justify-center sm:justify-start gap-2">
          <CalendarRange className="w-5 h-5 text-cyan-400 shrink-0" />
          <span>Trung Tâm Điều Phối Kế Hoạch</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Ban hành kế hoạch và chỉ thị công việc cho bộ phận Multi Auto và HC &amp; NS.
        </p>
      </div>

      {submitted && (
        <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>Kế hoạch đã được ban hành thành công!</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 bg-slate-900/90 border border-slate-800 rounded-xl p-5 text-xs">
        <div>
          <label className="block text-slate-300 font-semibold mb-1">1. Bộ phận tiếp nhận</label>
          <div className="grid grid-cols-2 gap-2">
            {['Multi Auto', 'HC & NS'].map((dept) => (
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
          <label className="block text-slate-300 font-semibold mb-1">2. Tiêu đề / Mã kế hoạch</label>
          <input
            type="text"
            value={planTitle}
            onChange={(e) => setPlanTitle(e.target.value)}
            placeholder="Ví dụ: Kế hoạch tăng ca tuần 3 / Lịch trực ngày lễ..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">3. Quân số / Chỉ tiêu</label>
            <input
              type="number"
              value={targetCount}
              onChange={(e) => setTargetCount(Number(e.target.value))}
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
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-slate-300 font-semibold mb-1">5. Ghi chú & Yêu cầu</label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Nội dung chi tiết, ca làm việc, lưu ý..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
          />
        </div>

        <button
          type="submit"
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold shadow-md transition-all cursor-pointer"
        >
          <Send className="w-4 h-4" />
          <span>Ban Hành Kế Hoạch</span>
        </button>
      </form>
    </div>
  );
};
