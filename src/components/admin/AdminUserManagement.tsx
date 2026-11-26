import React, { useState, useEffect } from 'react';
import { SalarySecurityConfig, UserAccount, UserRole } from '../../types';
import {
  Users,
  Plus,
  ShieldCheck,
  Lock,
  Unlock,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  Save,
  ShieldAlert,
  Download,
  Link2,
  Sparkles,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import {
  DEFAULT_SALARY_SECURITY_CONFIG,
  canUserAccessSalarySlip,
  normalizeSalarySecurityConfig,
} from '../../lib/salaryConfig';
import {
  InstallerDownloadLinks,
  buildGithubReleaseShortcutUrls,
  getEnvDefaultInstallerLinks,
  normalizeInstallerLinks,
  sanitizeDownloadUrl,
} from '../../lib/installerLinks';

interface AdminUserManagementProps {
  users: UserAccount[];
  onUpdateUsers: (users: UserAccount[]) => void;
  currentUser?: UserAccount | null;
  salarySecurity?: SalarySecurityConfig;
  onUpdateSalarySecurity?: (cfg: SalarySecurityConfig) => void;
  installerLinks?: InstallerDownloadLinks;
  onUpdateInstallerLinks?: (links: InstallerDownloadLinks) => void;
  initialTab?: 'users' | 'security' | 'downloads';
}

const ROLE_OPTIONS: { role: UserRole; label: string; desc: string }[] = [
  { role: 'admin', label: 'Quản Trị Viên (Admin)', desc: 'Toàn quyền quản trị hệ thống' },
  { role: 'hr', label: 'HC & Nhân Sự (HR)', desc: 'Bộ phận nhân sự & tiền lương' },
  { role: 'multiauto', label: 'Trưởng ca / Multi Auto', desc: 'Quản lý sản xuất & chấm công' },
  { role: 'report_viewer', label: 'Xem Báo Cáo (Report Viewer)', desc: 'Chỉ xem báo cáo tổng hợp' },
  { role: 'view_all', label: 'Xem Toàn Bộ (View All)', desc: 'Quyền xem đa phân hệ' },
  { role: 'qrcode', label: 'Trạm QR Chấm Công (QRCODE)', desc: 'Hiển thị mã QR chấm công tại trang chủ' },
  { role: 'security', label: 'An Ninh / Bảo Vệ Cổng (AN NINH)', desc: 'Quét QR kiểm soát nhân viên ra / vào' },
];

export const AdminUserManagement: React.FC<AdminUserManagementProps> = ({
  users,
  onUpdateUsers,
  currentUser,
  salarySecurity,
  onUpdateSalarySecurity,
  installerLinks,
  onUpdateInstallerLinks,
  initialTab = 'users',
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'users' | 'security' | 'downloads'>(initialTab);
  const [showAdd, setShowAdd] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('multiauto');
  const [department, setDepartment] = useState('MULTI');

  // Local draft for Salary Security Config
  const [draftSecurity, setDraftSecurity] = useState<SalarySecurityConfig>(() =>
    normalizeSalarySecurityConfig(salarySecurity || DEFAULT_SALARY_SECURITY_CONFIG)
  );
  const [showPin, setShowPin] = useState(false);
  const [securityToast, setSecurityToast] = useState<string | null>(null);

  // Local draft for Installer Download Links
  const [draftLinks, setDraftLinks] = useState<InstallerDownloadLinks>(() =>
    normalizeInstallerLinks(installerLinks || getEnvDefaultInstallerLinks())
  );
  const [repoInput, setRepoInput] = useState('');
  const [linkError, setLinkError] = useState<string | null>(null);

  useEffect(() => {
    setActiveSubTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (salarySecurity) {
      setDraftSecurity(normalizeSalarySecurityConfig(salarySecurity));
    }
  }, [salarySecurity]);

  useEffect(() => {
    if (installerLinks) {
      setDraftLinks(normalizeInstallerLinks(installerLinks));
    }
  }, [installerLinks]);

  const showToast = (msg: string) => {
    setSecurityToast(msg);
    window.setTimeout(() => {
      setSecurityToast((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password || !fullName) return;

    if (users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
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
        department,
      },
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
      onUpdateUsers(users.filter((u) => u.username.toLowerCase() !== uName.toLowerCase()));
    }
  };

  const persistSecurity = (nextCfg: SalarySecurityConfig, toastText?: string) => {
    const normalized = normalizeSalarySecurityConfig({
      ...nextCfg,
      updatedAt: new Date().toLocaleString('vi-VN'),
      updatedBy: currentUser?.fullName || currentUser?.username || 'Admin',
    });
    setDraftSecurity(normalized);
    onUpdateSalarySecurity?.(normalized);
    if (toastText) showToast(toastText);
  };

  const updateSecurityField = <K extends keyof SalarySecurityConfig>(
    field: K,
    val: SalarySecurityConfig[K]
  ) => {
    const nextCfg: SalarySecurityConfig = {
      ...draftSecurity,
      [field]: val,
    };
    persistSecurity(nextCfg);
  };

  const toggleAllowedUser = (uName: string) => {
    if (uName.trim().toLowerCase() === 'newprotec') return;
    const exists = draftSecurity.allowedUsernames.some(
      (u) => u.trim().toLowerCase() === uName.trim().toLowerCase()
    );
    const nextAllowed = exists
      ? draftSecurity.allowedUsernames.filter(
          (u) => u.trim().toLowerCase() !== uName.trim().toLowerCase()
        )
      : [...draftSecurity.allowedUsernames, uName];

    const nextCfg: SalarySecurityConfig = {
      ...draftSecurity,
      allowedUsernames: nextAllowed,
    };
    persistSecurity(
      nextCfg,
      exists
        ? `Đã khóa quyền xem Phiếu Lương của tài khoản @${uName}.`
        : `Đã cấp quyền xem Phiếu Lương cho tài khoản @${uName}.`
    );
  };

  const toggleAllowedRole = (targetRole: UserRole) => {
    const exists = draftSecurity.allowedRoles.includes(targetRole);
    const nextRoles = exists
      ? draftSecurity.allowedRoles.filter((r) => r !== targetRole)
      : [...draftSecurity.allowedRoles, targetRole];
    const nextCfg: SalarySecurityConfig = {
      ...draftSecurity,
      allowedRoles: nextRoles,
    };
    persistSecurity(nextCfg, 'Đã cập nhật nhóm vai trò xem lương.');
  };

  const handleSaveSecurity = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (draftSecurity.requirePasscode && draftSecurity.passcode.trim().length < 4) {
      alert('Mã PIN bảo mật Phiếu Lương phải có ít nhất 4 ký tự!');
      return;
    }
    persistSecurity(
      draftSecurity,
      'Đã lưu cấu hình bảo mật Tab Phiếu Lương thành công!'
    );
    alert('Đã lưu cấu hình bảo mật Tab Phiếu Lương thành công!');
  };

  const handleApplyGithubRepo = () => {
    setLinkError(null);
    const shortcut = buildGithubReleaseShortcutUrls(repoInput);
    if (!shortcut) {
      setLinkError(
        'Vui lòng nhập đúng định dạng repo GitHub (ví dụ: xataranet-maker/newprotec-hrm hoặc https://github.com/owner/repo).'
      );
      return;
    }
    setDraftLinks((prev) => ({
      ...prev,
      ...shortcut,
    }));
    showToast('Đã tự điền 4 link tải trực tiếp từ GitHub Releases. Nhấn Lưu để áp dụng.');
  };

  const handleSaveInstallerLinks = (e: React.FormEvent) => {
    e.preventDefault();
    setLinkError(null);

    const fields: Array<{ key: keyof Pick<InstallerDownloadLinks, 'windowsUrl' | 'androidUrl' | 'macosUrl' | 'iosUrl'>; label: string }> = [
      { key: 'windowsUrl', label: 'Windows (.exe / .zip)' },
      { key: 'androidUrl', label: 'Android (.apk / .zip)' },
      { key: 'macosUrl', label: 'macOS (.dmg / .zip)' },
      { key: 'iosUrl', label: 'iOS (.ipa / .zip)' },
    ];

    for (const f of fields) {
      const rawVal = (draftLinks[f.key] || '').trim();
      if (rawVal && !sanitizeDownloadUrl(rawVal)) {
        setLinkError(
          `Link tải ${f.label} không hợp lệ. Chỉ chấp nhận đường dẫn bắt đầu bằng https:// hoặc http://.`
        );
        return;
      }
    }

    const nextLinks: InstallerDownloadLinks = {
      windowsUrl: sanitizeDownloadUrl(draftLinks.windowsUrl),
      androidUrl: sanitizeDownloadUrl(draftLinks.androidUrl),
      macosUrl: sanitizeDownloadUrl(draftLinks.macosUrl),
      iosUrl: sanitizeDownloadUrl(draftLinks.iosUrl),
      releaseVersion: (draftLinks.releaseVersion || '').trim().slice(0, 32) || undefined,
      updatedAt: new Date().toLocaleString('vi-VN'),
      updatedBy: currentUser?.fullName || currentUser?.username || 'Admin',
    };

    setDraftLinks(nextLinks);
    onUpdateInstallerLinks?.(nextLinks);
    showToast('Đã lưu & đồng bộ link tải bộ cài đặt cho toàn bộ nhân viên!');
  };

  const liveSecurity = salarySecurity || draftSecurity;

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="w-full lg:w-auto px-7 sm:px-0 text-center lg:text-left">
          <h2 className="text-base sm:text-lg font-bold text-white flex flex-wrap items-center justify-center lg:justify-start gap-2">
            {activeSubTab === 'security' ? (
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : activeSubTab === 'downloads' ? (
              <Download className="w-5 h-5 text-cyan-400 shrink-0" />
            ) : (
              <Users className="w-5 h-5 text-blue-400 shrink-0" />
            )}
            <span>
              {activeSubTab === 'security'
                ? 'Cấu Hình Bảo Mật Tab Phiếu Lương'
                : activeSubTab === 'downloads'
                ? 'Quản Lý Link Tải Bộ Cài Đặt (Windows / Android / Apple)'
                : 'Quản Trị Người Dùng & Phân Quyền Hệ Thống'}
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 text-center lg:text-left">
            {activeSubTab === 'security'
              ? 'Kiểm soát nghiêm ngặt tài khoản được phép xem lương nhân viên, khóa mã PIN lớp 2 và che số liệu.'
              : activeSubTab === 'downloads'
              ? 'Gắn link GitHub Releases, Cloudflare R2 hoặc Google Drive để nhân viên bấm tải trực tiếp từ trang đăng nhập mà không tốn dung lượng server.'
              : 'Quản lý tài khoản đăng nhập và phân quyền truy cập theo vai trò (Admin, HC & NS, Trưởng ca).'}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center lg:justify-end gap-2 shrink-0">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-1 flex flex-wrap text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveSubTab('users')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                activeSubTab === 'users'
                  ? 'bg-cyan-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Tài Khoản</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('security')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                activeSubTab === 'security'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Bảo Mật Lương</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('downloads')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                activeSubTab === 'downloads'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Link Tải App</span>
            </button>
          </div>

          {activeSubTab === 'users' && (
            <button
              type="button"
              onClick={() => setShowAdd(true)}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold cursor-pointer shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo Tài Khoản Mới</span>
            </button>
          )}
        </div>
      </div>

      {securityToast && (
        <div className="bg-emerald-950/90 border border-emerald-500/60 text-emerald-200 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{securityToast}</span>
        </div>
      )}

      {activeSubTab === 'users' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map((u) => {
            const isRoot = u.username.trim().toLowerCase() === 'newprotec';
            const canViewSalary = canUserAccessSalarySlip(u, liveSecurity);
            return (
              <div
                key={u.username}
                className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs space-y-3"
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
                      {u.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-white text-sm truncate">{u.fullName}</div>
                      <div className="text-[11px] text-cyan-400 font-mono truncate">@{u.username}</div>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800/40 uppercase shrink-0">
                    {u.role}
                  </span>
                </div>

                <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 text-slate-300 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Phòng ban:</span>
                    <span>{u.department || 'HỆ THỐNG'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Mật khẩu:</span>
                    <span className="font-mono text-slate-400">••••••</span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-slate-800/80">
                    <span className="text-slate-500">Quyền xem Lương:</span>
                    {canViewSalary ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-700/50 text-[10px] font-semibold">
                        <Unlock className="w-3 h-3" />
                        <span>Được phép xem</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-950/70 text-rose-300 border border-rose-800/50 text-[10px] font-semibold">
                        <Lock className="w-3 h-3" />
                        <span>Đang khóa</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  {!isRoot && onUpdateSalarySecurity && (
                    <button
                      type="button"
                      onClick={() => toggleAllowedUser(u.username)}
                      className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
                        draftSecurity.allowedUsernames.some(
                          (x) => x.trim().toLowerCase() === u.username.trim().toLowerCase()
                        )
                          ? 'bg-emerald-950/50 hover:bg-emerald-900/50 border-emerald-700/50 text-emerald-300'
                          : 'bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-300'
                      }`}
                    >
                      {draftSecurity.allowedUsernames.some(
                        (x) => x.trim().toLowerCase() === u.username.trim().toLowerCase()
                      )
                        ? 'Thu hồi quyền Lương'
                        : 'Cấp quyền Lương'}
                    </button>
                  )}

                  {u.username.toLowerCase() !== 'newprotec' &&
                    u.username.toLowerCase() !== 'admin' && (
                      <button
                        type="button"
                        onClick={() => handleDelete(u.username)}
                        className="px-3 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/50 border border-red-900/30 text-red-400 text-xs font-semibold cursor-pointer transition-colors"
                      >
                        Xóa
                      </button>
                    )}
                </div>
              </div>
            );
          })}
        </div>
      ) : activeSubTab === 'security' ? (
        /* TAB BẢO MẬT LƯƠNG */
        <form onSubmit={handleSaveSecurity} className="space-y-5 text-xs">
          {/* Master Switch Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                  draftSecurity.enabled
                    ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-400'
                    : 'bg-amber-600/20 border-amber-500/40 text-amber-400'
                }`}
              >
                {draftSecurity.enabled ? (
                  <ShieldCheck className="w-5 h-5" />
                ) : (
                  <ShieldAlert className="w-5 h-5" />
                )}
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  Chế Độ Bảo Mật Bí Mật Lương Nhân Viên
                </h3>
                <p className="text-slate-400 mt-0.5 leading-relaxed">
                  Khi bật, chỉ những tài khoản hoặc vai trò được Admin đánh dấu bên dưới mới được phép mở Tab{' '}
                  <span className="text-emerald-300 font-semibold">Phiếu Lương</span> và xem chi tiết lương trong hồ sơ nhân viên.
                </p>
                {liveSecurity.updatedAt && (
                  <p className="text-[11px] text-slate-500 font-mono mt-1">
                    Cập nhật gần nhất: {liveSecurity.updatedAt} · Bởi: {liveSecurity.updatedBy || 'Admin'}
                  </p>
                )}
              </div>
            </div>

            <label className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer shrink-0 select-none">
              <input
                type="checkbox"
                checked={draftSecurity.enabled}
                onChange={(e) => updateSecurityField('enabled', e.target.checked)}
                className="w-4 h-4 accent-emerald-500 cursor-pointer"
              />
              <span
                className={`font-bold ${
                  draftSecurity.enabled ? 'text-emerald-300' : 'text-amber-300'
                }`}
              >
                {draftSecurity.enabled ? 'Đang BẬT bảo mật' : 'Đang TẮT bảo mật'}
              </span>
            </label>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Per-user Explicit Permissions */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2 font-bold text-sm text-white">
                  <Users className="w-4 h-4 text-cyan-400" />
                  <span>Tài Khoản Có Thẩm Quyền Xem Lương</span>
                </div>
                <span className="text-[11px] font-mono text-emerald-300 bg-emerald-950/60 border border-emerald-700/50 px-2 py-0.5 rounded">
                  {draftSecurity.allowedUsernames.length} tài khoản
                </span>
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar pr-1">
                {users.map((u) => {
                  const isRoot = u.username.trim().toLowerCase() === 'newprotec';
                  const isUserChecked =
                    isRoot ||
                    draftSecurity.allowedUsernames.some(
                      (x) => x.trim().toLowerCase() === u.username.trim().toLowerCase()
                    );
                  const isRoleChecked = draftSecurity.allowedRoles.includes(u.role);
                  const effectiveAllowed = !draftSecurity.enabled || isUserChecked || isRoleChecked;

                  return (
                    <label
                      key={u.username}
                      className={`flex items-center justify-between gap-3 p-2.5 rounded-lg border transition-colors ${
                        isRoot ? 'cursor-not-allowed' : 'cursor-pointer'
                      } ${
                        isUserChecked
                          ? 'bg-emerald-950/30 border-emerald-600/50'
                          : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={isUserChecked}
                          disabled={isRoot}
                          onChange={() => toggleAllowedUser(u.username)}
                          className="w-4 h-4 accent-emerald-500 cursor-pointer shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="font-bold text-white truncate">
                            {u.fullName}{' '}
                            <span className="text-cyan-400 font-mono text-[11px] font-normal">
                              (@{u.username})
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Vai trò: <span className="uppercase font-mono">{u.role}</span> · Bộ phận:{' '}
                            {u.department || 'HỆ THỐNG'}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        {isRoot ? (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/50 font-semibold">
                            Admin gốc
                          </span>
                        ) : effectiveAllowed ? (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/50 font-semibold">
                            Được xem
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800/50 font-semibold">
                            Bị chặn
                          </span>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-400">
                Lưu ý: Tài khoản <span className="font-mono text-cyan-300">@Newprotec</span> là Quản trị viên gốc nên luôn có quyền truy cập để cấu hình bảo mật.
              </p>
            </div>

            {/* Role Grants + PIN + Masking */}
            <div className="space-y-5">
              {/* Role-based Access */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-3">
                <div className="font-bold text-sm text-white border-b border-slate-800 pb-2">
                  Cấp Quyền Theo Nhóm Vai Trò (Tùy Chọn)
                </div>
                <p className="text-[11px] text-slate-400">
                  Mặc định để trống để chỉ cấp quyền theo từng tài khoản cụ thể ở cột bên trái. Nếu chọn vai trò ở đây, mọi tài khoản thuộc vai trò đó đều xem được lương.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ROLE_OPTIONS.map((item) => {
                    const checked = draftSecurity.allowedRoles.includes(item.role);
                    return (
                      <label
                        key={item.role}
                        className={`flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                          checked
                            ? 'bg-cyan-950/35 border-cyan-600/50 text-cyan-200'
                            : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleAllowedRole(item.role)}
                          className="mt-0.5 accent-cyan-500 cursor-pointer"
                        />
                        <div>
                          <div className="font-semibold text-[11px]">{item.label}</div>
                          <div className="text-[10px] text-slate-400">{item.desc}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Layer 2 PIN & Screen Privacy */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-4">
                <div className="flex items-center gap-2 font-bold text-sm text-white border-b border-slate-800 pb-2">
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  <span>Bảo Vệ Lớp 2 &amp; Che Số Liệu Trên Màn Hình</span>
                </div>

                <label className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-950/70 border border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draftSecurity.requirePasscode}
                    onChange={(e) => updateSecurityField('requirePasscode', e.target.checked)}
                    className="mt-0.5 accent-amber-500 cursor-pointer"
                  />
                  <div>
                    <div className="font-semibold text-white">
                      Yêu cầu nhập Mã PIN bảo mật khi mở Tab Phiếu Lương
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Ngay cả người có thẩm quyền vẫn phải nhập thêm mã PIN riêng này để mở khóa bảng lương (phòng trường hợp quên đăng xuất).
                    </div>
                  </div>
                </label>

                {draftSecurity.requirePasscode && (
                  <div className="space-y-1.5 pl-1">
                    <label className="block text-slate-300 font-semibold">
                      Mã PIN / Mật khẩu mở khóa Tab Phiếu Lương (tối thiểu 4 ký tự)
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type={showPin ? 'text' : 'password'}
                        value={draftSecurity.passcode}
                        onChange={(e) => updateSecurityField('passcode', e.target.value)}
                        placeholder="Nhập mã PIN bảo mật lương..."
                        className="w-full bg-slate-950 border border-amber-600/50 focus:border-amber-400 rounded-lg pl-3 pr-10 py-2 text-slate-100 font-mono focus:outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPin((v) => !v)}
                        className="absolute right-2.5 text-slate-400 hover:text-white cursor-pointer"
                        title={showPin ? 'Ẩn mã PIN' : 'Hiện mã PIN'}
                      >
                        {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                <label className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-950/70 border border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draftSecurity.maskValuesByDefault}
                    onChange={(e) => updateSecurityField('maskValuesByDefault', e.target.checked)}
                    className="mt-0.5 accent-emerald-500 cursor-pointer"
                  />
                  <div>
                    <div className="font-semibold text-white">
                      Tự động che số tiền lương (••••••) khi mới vào Tab Phiếu Lương
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Tránh lộ thông tin lương qua màn hình; nhấn nút &quot;Hiện số liệu&quot; trong Tab Phiếu Lương khi cần xem hoặc chỉnh sửa.
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleSaveSecurity}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg cursor-pointer transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Lưu Cấu Hình Bảo Mật</span>
            </button>
          </div>
        </form>
      ) : (
        /* TAB LINK TẢI BỘ CÀI ĐẶT */
        <form onSubmit={handleSaveInstallerLinks} className="space-y-5 text-xs">
          {/* Quick fill GitHub Releases */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white">Điền Nhanh Link Từ GitHub Releases</h3>
                <p className="text-slate-400 leading-relaxed">
                  Nếu bạn đã chạy workflow <span className="font-mono text-cyan-300">publish-release</span> (bằng cách gắn tag{' '}
                  <span className="font-mono text-slate-200">v1.0.0</span> hoặc tạo Release trên GitHub), nhập tên repo bên dưới để tự tạo 4 link tải trực tiếp.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={repoInput}
                onChange={(e) => {
                  setRepoInput(e.target.value);
                  if (linkError) setLinkError(null);
                }}
                placeholder="VD: xataranet-maker/newprotec-hrm hoặc https://github.com/owner/repo"
                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
              />
              <button
                type="button"
                onClick={handleApplyGithubRepo}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold cursor-pointer transition-colors shrink-0"
              >
                <Link2 className="w-4 h-4" />
                <span>Tự Điền Link GitHub Releases</span>
              </button>
            </div>
          </div>

          {linkError && (
            <div className="bg-rose-950/70 border border-rose-600/60 text-rose-200 px-4 py-2.5 rounded-xl text-xs font-semibold">
              {linkError}
            </div>
          )}

          {/* Version + 4 Platform Links */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-white">Đường Dẫn Tải Trực Tiếp Theo Hệ Điều Hành</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Để trống nếu chưa phát hành cho hệ điều hành đó. Chỉ chấp nhận link https:// hoặc http://.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-slate-400">Phiên bản:</span>
                <input
                  type="text"
                  value={draftLinks.releaseVersion || ''}
                  onChange={(e) =>
                    setDraftLinks((prev) => ({ ...prev, releaseVersion: e.target.value }))
                  }
                  placeholder="VD: v2.1.0"
                  maxLength={32}
                  className="w-28 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100 font-mono text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(
                [
                  {
                    key: 'windowsUrl',
                    label: 'Windows (PC / Laptop)',
                    hint: 'Newprotec-Vina-HRM-Windows-Installer.zip hoặc file .exe',
                  },
                  {
                    key: 'androidUrl',
                    label: 'Android (Điện thoại / Máy chấm công)',
                    hint: 'Newprotec-Vina-HRM-Android-APK.zip hoặc file .apk',
                  },
                  {
                    key: 'macosUrl',
                    label: 'Apple macOS (MacBook / iMac)',
                    hint: 'Newprotec-Vina-HRM-macOS-Installer.zip hoặc file .dmg',
                  },
                  {
                    key: 'iosUrl',
                    label: 'Apple iOS (iPhone / iPad)',
                    hint: 'Link TestFlight, OTA hoặc Newprotec-Vina-HRM-iOS-Package.zip',
                  },
                ] as const
              ).map((item) => {
                const value = draftLinks[item.key] || '';
                const safeHref = sanitizeDownloadUrl(value);
                return (
                  <div
                    key={item.key}
                    className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <label className="font-bold text-slate-200">{item.label}</label>
                      <div className="flex items-center gap-1.5">
                        {safeHref && (
                          <a
                            href={safeHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[10px] font-semibold"
                            title="Mở thử liên kết"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Thử</span>
                          </a>
                        )}
                        {value && (
                          <button
                            type="button"
                            onClick={() => {
                              setDraftLinks((prev) => ({ ...prev, [item.key]: '' }));
                              if (linkError) setLinkError(null);
                            }}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-300 text-[10px] cursor-pointer"
                            title="Xóa link"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Xóa</span>
                          </button>
                        )}
                      </div>
                    </div>
                    <input
                      type="url"
                      value={value}
                      onChange={(e) => {
                        setDraftLinks((prev) => ({ ...prev, [item.key]: e.target.value }));
                        if (linkError) setLinkError(null);
                      }}
                      placeholder="https://github.com/.../releases/latest/download/..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 font-mono text-[11px]"
                    />
                    <div className="text-[10px] text-slate-500">{item.hint}</div>
                  </div>
                );
              })}
            </div>

            {draftLinks.updatedAt && (
              <div className="text-[11px] text-slate-400 pt-1">
                Cập nhật gần nhất: <span className="text-slate-200">{draftLinks.updatedAt}</span>
                {draftLinks.updatedBy ? (
                  <>
                    {' '}bởi <span className="text-cyan-300">{draftLinks.updatedBy}</span>
                  </>
                ) : null}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 pt-1">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg cursor-pointer transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Lưu &amp; Đồng Bộ Link Tải</span>
            </button>
          </div>
        </form>
      )}

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
                  onChange={(e) => setUsername(e.target.value)}
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
                  onChange={(e) => setPassword(e.target.value)}
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
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="VD: Nguyễn Văn A"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Vai trò (Role)</label>
                <select
                  value={role}
                  onChange={(e) => {
                    const nextRole = e.target.value as UserRole;
                    setRole(nextRole);
                    setDepartment(
                      nextRole === 'multiauto'
                        ? 'MULTI'
                        : nextRole === 'hr'
                        ? 'HR'
                        : nextRole === 'admin'
                        ? 'ADMIN'
                        : nextRole === 'security'
                        ? 'SECURITY'
                        : 'MULTI'
                    );
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
                >
                  <option value="multiauto">Multi Auto</option>
                  <option value="hr">HC &amp; NS</option>
                  <option value="admin">Quản Trị Viên (Admin)</option>
                  <option value="staff">Công Nhân / Nhân Viên</option>
                  <option value="qrcode">Trạm QR Chấm Công (QRCODE)</option>
                  <option value="security">An Ninh / Bảo Vệ (AN NINH)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-cyan-600 text-white font-bold cursor-pointer"
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

