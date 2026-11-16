import React, { useState } from 'react';
import { UserAccount, UserRole } from '../../types';
import { Users, Plus, Trash2, Key, Shield, UserCheck } from 'lucide-react';

interface AdminUserManagementProps {
  users: UserAccount[];
  onUpdateUsers: (users: UserAccount[]) => void;
}

export const AdminUserManagement: React.FC<AdminUserManagementProps> = ({
  users,
  onUpdateUsers
}) => {
  const [showAdd, setShowAdd] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('multiauto');
  const [department, setDepartment] = useState('MULTI');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password || !fullName) return;

    if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
      alert('Tên tài khoản này đã tồn tại!');
      return;
    }

    onUpdateUsers([
      ...users,
      {
        username,
        password,
        fullName,
        role,
        department
      }
    ]);

    setShowAdd(false);
    setUsername('');
    setPassword('');
    setFullName('');
  };

  const handleDelete = (uName: string) => {
    if (uName.toLowerCase() === 'newprotec' || uName.toLowerCase() === 'admin') {
      alert('Không thể xóa tài khoản Quản trị viên gốc!');
      return;
    }
    if (confirm(`Bạn có chắc muốn xóa tài khoản ${uName}?`)) {
      onUpdateUsers(users.filter(u => u.username.toLowerCase() !== uName.toLowerCase()));
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" />
            <span>Quản Trị Người Dùng & Phân Quyền Hệ Thống</span>
          </h2>
          <p className="text-xs text-slate-400">
            Quản lý tài khoản đăng nhập và phân quyền truy cập theo vai trò (Admin, Trưởng ca, Kỹ thuật viên).
          </p>
        </div>

        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold cursor-pointer shadow-md"
        >
          <Plus className="w-4 h-4" />
          <span>Tạo Tài Khoản Mới</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map(u => (
          <div key={u.username} className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs space-y-3">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white font-bold text-xs">
                  {u.fullName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-bold text-white text-sm">{u.fullName}</div>
                  <div className="text-[11px] text-cyan-400 font-mono">@{u.username}</div>
                </div>
              </div>

              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800/40 uppercase">
                {u.role}
              </span>
            </div>

            <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 text-slate-300 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Phòng ban:</span>
                <span>{u.department || 'HỆ THỐNG'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Mật khẩu:</span>
                <span className="font-mono text-slate-400">••••••</span>
              </div>
            </div>

            {u.username.toLowerCase() !== 'newprotec' && u.username.toLowerCase() !== 'admin' && (
              <button
                onClick={() => handleDelete(u.username)}
                className="w-full py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/50 border border-red-900/30 text-red-400 text-xs font-semibold cursor-pointer transition-colors"
              >
                Xóa Tài Khoản
              </button>
            )}
          </div>
        ))}
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-sm w-full p-5 space-y-4 text-xs">
            <h3 className="text-base font-bold text-white">Tạo Tài Khoản Mới</h3>
            <form onSubmit={handleAdd} className="space-y-3">
              <div>
                <label className="block text-slate-300 mb-1">Tên đăng nhập</label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="VD: user01"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Mật khẩu</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Mật khẩu"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Họ và tên hiển thị</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="VD: Nguyễn Văn A"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Vai trò (Role)</label>
                <select
                  value={role}
                  onChange={e => {
                    const nextRole = e.target.value as UserRole;
                    setRole(nextRole);
                    setDepartment(nextRole === 'multiauto' ? 'MULTI' : nextRole === 'hr' ? 'HR' : nextRole === 'admin' ? 'ADMIN' : 'MULTI');
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
                >
                  <option value="multiauto">Multi Auto</option>
                  <option value="hr">HC &amp; NS</option>
                  <option value="admin">Quản Trị Viên (Admin)</option>
                  <option value="staff">Công Nhân / Nhân Viên</option>
                </select>
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
                  className="px-4 py-1.5 rounded-lg bg-cyan-600 text-white font-bold"
                >
                  Tạo Tài Khoản
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
