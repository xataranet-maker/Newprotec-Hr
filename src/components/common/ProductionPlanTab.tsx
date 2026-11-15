import React, { useState } from 'react';
import { ProductionPlan } from '../../types';
import { CalendarRange, CheckCircle, Clock, Search, Filter } from 'lucide-react';

interface ProductionPlanTabProps {
  plans: ProductionPlan[];
  departmentId?: string;
}

export const ProductionPlanTab: React.FC<ProductionPlanTabProps> = ({ plans, departmentId = 'ALL' }) => {
  const [filterDept, setFilterDept] = useState(departmentId);
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = plans.filter(p => {
    const matchDept = filterDept === 'ALL' || p.targetDept.toLowerCase().includes(filterDept.toLowerCase());
    const matchSearch = p.model.toLowerCase().includes(searchTerm.toLowerCase()) || p.content.toLowerCase().includes(searchTerm.toLowerCase());
    return matchDept && matchSearch;
  });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <CalendarRange className="w-5 h-5 text-cyan-400" />
            <span>Lịch Sử Kế Hoạch & Chỉ Thị Sản Xuất</span>
          </h2>
          <p className="text-xs text-slate-400">Danh sách các kế hoạch điều phối sản xuất từ ban điều hành</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            <input 
              type="text" 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              placeholder="Tìm model, chỉ thị..." 
              className="bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200"
            />
          </div>

          <select 
            value={filterDept} 
            onChange={e => setFilterDept(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300"
          >
            <option value="ALL">Tất cả bộ phận</option>
            <option value="Multi Auto">Multi Auto</option>
            <option value="Stiff">Stiff</option>
            <option value="Dập Tự Động">Dập Tự Động</option>
            <option value="Khuôn & Jig">Khuôn & Jig</option>
          </select>
        </div>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
            Chưa có kế hoạch nào được ghi nhận cho bộ phận này.
          </div>
        ) : (
          filtered.map(plan => (
            <div key={plan.id} className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-sm">{plan.model}</span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-cyan-400 text-[10px] font-mono">
                    {plan.targetDept}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">· {plan.timestamp}</span>
                </div>
                <p className="text-xs text-slate-300">{plan.content}</p>
                <div className="text-[11px] text-slate-500">Người gửi: {plan.sender}</div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {plan.status === 'CONFIRMED' ? (
                  <span className="flex items-center gap-1 text-emerald-400 text-xs font-semibold bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-800/40">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Đã xác nhận ({plan.confirmedAt})
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-amber-400 text-xs font-semibold bg-amber-950/40 px-2.5 py-1 rounded-lg border border-amber-800/40">
                    <Clock className="w-3.5 h-3.5" />
                    Chờ tiếp nhận
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
