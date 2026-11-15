import React, { useState } from 'react';
import { HRAnnouncement, StaffRecord, Language, UserRole } from '../../types';
import { Megaphone, Plus, Search, Calendar, Bell, Shield } from 'lucide-react';

interface HRAnnouncementsProps {
  announcements: HRAnnouncement[];
  setAnnouncements: (data: HRAnnouncement[]) => void;
  allStaff?: StaffRecord[];
  language?: Language;
  userRole?: UserRole;
}

export const HRAnnouncements: React.FC<HRAnnouncementsProps> = ({
  announcements,
  setAnnouncements
}) => {
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<'NORMAL' | 'URGENT'>('NORMAL');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) return;
    const newAnn: HRAnnouncement = {
      id: Date.now(),
      title,
      content,
      date: new Date().toLocaleDateString('vi-VN'),
      priority,
      recipientType: 'DEPARTMENT',
      recipients: ['ALL'],
      allowResend: true,
      sender: 'Phòng Hành Chính Nhân Sự'
    };
    setAnnouncements([newAnn, ...announcements]);
    setShowAdd(false);
    setTitle('');
    setContent('');
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-red-400" />
            <span>Bảng Thông Báo Nội Bộ Nhà Máy (Announcements)</span>
          </h2>
          <p className="text-xs text-slate-400">Các thông báo chỉ đạo, kế hoạch ca, an toàn lao động và 5S.</p>
        </div>

        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Đăng Thông Báo</span>
        </button>
      </div>

      <div className="space-y-4">
        {announcements.map(ann => (
          <div key={ann.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2 text-xs">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                  ann.priority === 'URGENT' ? 'bg-red-950 text-red-400 border border-red-800/40' : 'bg-slate-800 text-slate-400'
                }`}>
                  {ann.priority}
                </span>
                <span className="font-bold text-white text-sm">{ann.title}</span>
              </div>
              <span className="font-mono text-slate-500">{ann.date}</span>
            </div>

            <p className="text-slate-300 leading-relaxed">{ann.content}</p>

            <div className="pt-2 border-t border-slate-800/60 text-[11px] text-slate-500 flex justify-between">
              <span>Người phát hành: {ann.sender || 'Ban Quản Lý'}</span>
              <span>Đối tượng: Toàn nhà máy</span>
            </div>
          </div>
        ))}
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-5 space-y-4 text-xs">
            <h3 className="text-base font-bold text-white">Đăng Thông Báo Mới</h3>
            <form onSubmit={handleAdd} className="space-y-3">
              <div>
                <label className="block text-slate-300 mb-1">Mức độ ưu tiên</label>
                <select
                  value={priority}
                  onChange={e => setPriority(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
                >
                  <option value="NORMAL">Bình Thường (NORMAL)</option>
                  <option value="URGENT">Khẩn Cấp (URGENT)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Tiêu đề thông báo</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Nội dung chi tiết</label>
                <textarea
                  rows={4}
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-red-600 text-white font-bold"
                >
                  Phát Hành
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
