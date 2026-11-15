import React, { useState } from 'react';
import { ContractRecord, StaffRecord } from '../../types';
import { FileText, Plus, Search } from 'lucide-react';

export const HRContracts: React.FC<{
  contracts: ContractRecord[];
  setContracts: (c: ContractRecord[]) => void;
  allStaff: StaffRecord[];
}> = ({ contracts, setContracts, allStaff }) => {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-800">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-400" />
          <span>Hợp Đồng Lao Động Điện Tử</span>
        </h2>
        <p className="text-xs text-slate-400">Quản lý hồ sơ hợp đồng xác định thời hạn, không xác định thời hạn của người lao động.</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs">
        {contracts.length === 0 ? (
          <div className="py-8 text-center text-slate-500">Chưa có hợp đồng nào được tải lên.</div>
        ) : (
          <div className="divide-y divide-slate-800">
            {contracts.map(c => (
              <div key={c.id} className="py-2.5 flex justify-between text-slate-300">
                <div>
                  <span className="font-bold text-white">{c.employeeName}</span> ({c.employeeId})
                  <div className="text-[11px] text-slate-400">{c.fileName}</div>
                </div>
                <div className="font-mono text-slate-400">{c.uploadDate}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
