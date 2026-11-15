import React, { useState } from 'react';
import { ExportRecord } from '../../types';
import { Mail, Send, Copy, CheckCircle, FileText } from 'lucide-react';

interface MultiAutoSendMailProps {
  exportData: ExportRecord[];
}

export const MultiAutoSendMail: React.FC<MultiAutoSendMailProps> = ({ exportData }) => {
  const [recipient, setRecipient] = useState('manager.newprotec@gmail.com');
  const [subject, setSubject] = useState(`[NEWPROTEC V2.0] Báo Cáo Xuất Hàng Multi Auto Ngày ${new Date().toLocaleDateString('vi-VN')}`);
  const [copied, setCopied] = useState(false);

  const totalExported = exportData.reduce((acc, r) => acc + (r.quantity || 0), 0);

  const mailBody = `Kính gửi Ban Giám Đốc và các bộ phận liên quan,

Hệ thống Newprotec V2.0 xin gửi báo cáo tổng hợp xuất hàng phân xưởng Multi Auto ngày ${new Date().toLocaleDateString('vi-VN')}:
--------------------------------------------------
Tổng số lượng xuất: ${totalExported.toLocaleString()} PNL
Tổng số lô: ${exportData.length} lô

Chi tiết các lô xuất xưởng:
${exportData.map((r, i) => `${i + 1}. Model: ${r.model} | LOT: ${r.lotNo} | SL: ${r.quantity.toLocaleString()} PNL | Giờ: ${r.timestamp}`).join('\n')}

Trân trọng,
Trưởng ca Multi Auto Newprotec Vina.`;

  const handleCopy = () => {
    navigator.clipboard.writeText(mailBody);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendMail = () => {
    const mailtoUrl = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(mailBody)}`;
    window.location.href = mailtoUrl;
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-800">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Mail className="w-5 h-5 text-indigo-400" />
          <span>Gửi Báo Cáo Xuất Hàng Qua Email (Multi Auto Dispatch)</span>
        </h2>
        <p className="text-xs text-slate-400">
          Soạn và gửi báo cáo sản lượng xuất hàng hàng ngày cho Ban Quản Lý và khách hàng.
        </p>
      </div>

      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4 text-xs">
        <div>
          <label className="block text-slate-300 font-semibold mb-1">Người nhận (Email To):</label>
          <input
            type="email"
            value={recipient}
            onChange={e => setRecipient(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200"
          />
        </div>

        <div>
          <label className="block text-slate-300 font-semibold mb-1">Tiêu đề (Subject):</label>
          <input
            type="text"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200"
          />
        </div>

        <div>
          <label className="block text-slate-300 font-semibold mb-1">Nội dung báo cáo tự động:</label>
          <textarea
            rows={10}
            value={mailBody}
            readOnly
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-300 font-mono text-[11px] leading-relaxed"
          />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition-colors cursor-pointer"
          >
            {copied ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Đã Sao Chép!' : 'Sao Chép Nội Dung'}</span>
          </button>

          <button
            type="button"
            onClick={handleSendMail}
            className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-md cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>Mở Trình Gửi Mail</span>
          </button>
        </div>
      </div>
    </div>
  );
};
