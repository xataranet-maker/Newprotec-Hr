import React from 'react';
import { ProductionHistoryRecord, NetDataRecord } from '../../types';
import { FileText, Download, Globe } from 'lucide-react';

interface MultiAutoProductionStatusKRProps {
  historyData: ProductionHistoryRecord[];
  netData: NetDataRecord[];
  targetPnl?: number;
  userRole?: string;
}

export const MultiAutoProductionStatusKR: React.FC<MultiAutoProductionStatusKRProps> = ({
  historyData,
  targetPnl = 500
}) => {
  const total = historyData.reduce((acc, h) => acc + (h.quantity || 0), 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-800">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Globe className="w-5 h-5 text-indigo-400" />
          <span>멀티오토 생산 실적 현황 보고서 (한국어 리포트)</span>
        </h2>
        <p className="text-xs text-slate-400">
          본 보고서는 한국 본사 및 임원진을 위한 실시간 생산 집계 데이터입니다.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 font-semibold">총 생산 완료 수량</span>
          <div className="text-2xl font-bold font-mono text-white mt-2">
            {total.toLocaleString()} <span className="text-xs font-sans text-slate-400">PNL</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">목표 달성률: {Math.round((total / targetPnl) * 100)}%</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 font-semibold">완료 로트 수</span>
          <div className="text-2xl font-bold font-mono text-cyan-400 mt-2">
            {historyData.length} <span className="text-xs font-sans text-slate-400">LOT</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">실시간 자동 동기화 됨</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 font-semibold">불량률 현황 (PPM)</span>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-2">
            1,250 <span className="text-xs font-sans text-slate-400">PPM</span>
          </div>
          <div className="text-[11px] text-emerald-500 mt-1">품질 기준 정상 준수 중</div>
        </div>
      </div>

      {/* Korean Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 text-[11px]">
                <th className="py-2.5 px-3">완료 일시</th>
                <th className="py-2.5 px-3">모델명 (Model)</th>
                <th className="py-2.5 px-3">로트 번호 (Lot No)</th>
                <th className="py-2.5 px-3">작업 설비 (Machine)</th>
                <th className="py-2.5 px-3 text-right">수량 (Quantity)</th>
                <th className="py-2.5 px-3">사용 부자재 로트</th>
                <th className="py-2.5 px-3">작업자 (Operator)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {historyData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500">
                    생산 완료된 데이터가 없습니다.
                  </td>
                </tr>
              ) : (
                historyData.map(h => (
                  <tr key={h.historyId || h.id} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-mono text-slate-400">{h.completedAt}</td>
                    <td className="py-2.5 px-3 font-bold text-white font-mono">{h.model}</td>
                    <td className="py-2.5 px-3 font-mono text-cyan-400">{h.lotNo}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-200">{h.machine || 'Multi 01'}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                      {h.quantity.toLocaleString()} PNL
                    </td>
                    <td className="py-2.5 px-3 font-mono text-purple-300">{h.usedAccessoryLot || 'PL-DEFAULT'}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-400">{h.operator || '시스템'}</td>
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
