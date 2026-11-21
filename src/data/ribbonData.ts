import { RibbonTab } from '../types';
import {
  Package,
  Users,
  Timer,
  History,
  FileText,
  CalendarDays,
  LayoutDashboard,
  Megaphone,
  CalendarRange,
  Clock,
  ScrollText,
  Plane,
  Banknote,
  UserPlus,
  StickyNote,
  GraduationCap,
  ClipboardCheck,
  UserCheck,
  HardDriveDownload,
  CalendarCheck2,
  ShieldCheck,
  CalendarPlus,
  Wallet,
  QrCode,
} from 'lucide-react';

export const ribbonData: RibbonTab[] = [
  {
    id: 'home',
    label: 'HOME',
    allowedRoles: ['admin', 'multiauto', 'hr', 'report_viewer', 'user', 'staff', 'view_all', 'qrcode'],
    groups: [
      {
        id: 'home_overview',
        label: 'TỔNG QUAN',
        items: [
          { id: 'dashboard_home', label: 'BÁO CÁO TỔNG HỢP', icon: LayoutDashboard, isLarge: true, color: 'text-blue-500' },
          { id: 'personal_profile', label: 'HỒ SƠ CÁ NHÂN', icon: UserCheck, isLarge: true, color: 'text-cyan-500' },
          { id: 'qr_attendance_kiosk', label: 'MÃ QR CHẤM CÔNG', icon: QrCode, isLarge: true, color: 'text-emerald-400' },
          { id: 'home_announcements', label: 'THÔNG BÁO', icon: Megaphone, isLarge: true, color: 'text-red-500' },
        ],
      },
    ],
  },
  {
    id: 'Multi',
    label: 'MULTI AUTO',
    allowedRoles: ['admin', 'multiauto', 'report_viewer', 'view_all'],
    groups: [
      {
        id: 'Multi_menu',
        label: 'NHÂN SỰ & CHẤM CÔNG',
        items: [
          { id: 'multi_staff', label: 'NHÂN VIÊN', icon: Users, isLarge: true, color: 'text-blue-400' },
          { id: 'multi_matrix_timekeeping', label: 'BẢNG CHẤM CÔNG', icon: CalendarDays, isLarge: true, color: 'text-amber-400' },
        ],
      },
    ],
  },
  {
    id: 'hr_admin',
    label: 'HC & NS',
    allowedRoles: ['admin', 'hr', 'report_viewer', 'view_all'],
    groups: [
      {
        id: 'hr_staff_mgmt',
        label: 'QUẢN LÝ NHÂN SỰ',
        items: [
          { id: 'staff_list', label: 'DS NHÂN VIÊN', icon: Users, isLarge: true, color: 'text-blue-400' },
          { id: 'hr_add_staff', label: 'THÊM MỚI', icon: UserPlus, isLarge: true, color: 'text-emerald-400' },
          { id: 'hr_contracts', label: 'HỢP ĐỒNG', icon: FileText, isLarge: true, color: 'text-indigo-400' },
          { id: 'hr_diary', label: 'NHẬT KÝ Đ.DANH', icon: StickyNote, isLarge: true, color: 'text-purple-400' },
        ],
      },
      {
        id: 'hr_timekeeping_grp',
        label: 'CHẤM CÔNG & LƯƠNG',
        items: [
          { id: 'timekeeping', label: 'DỮ LIỆU CÔNG', icon: Clock, isLarge: true, color: 'text-blue-400' },
          { id: 'hr_matrix_timekeeping', label: 'BẢNG CÔNG MA TRẬN', icon: CalendarDays, isLarge: true, color: 'text-amber-400' },
          { id: 'hr_attendance_confirm', label: 'XÁC NHẬN CÔNG', icon: CalendarCheck2, isLarge: true, color: 'text-cyan-400' },
          { id: 'hr_overtime', label: 'ĐK TĂNG CA', icon: Timer, isLarge: false, color: 'text-orange-400' },
          { id: 'hr_leave_register', label: 'ĐĂNG KÝ PHÉP', icon: CalendarPlus, isLarge: true, color: 'text-cyan-400' },
          { id: 'hr_leaves', label: 'NGHỈ PHÉP', icon: Plane, isLarge: false, color: 'text-cyan-400' },
          { id: 'hr_payroll', label: 'BẢNG CÔNG', icon: ClipboardCheck, isLarge: false, color: 'text-emerald-400' },
          { id: 'hr_salary_table', label: 'BẢNG LƯƠNG', icon: Wallet, isLarge: true, color: 'text-emerald-400' },
          { id: 'hr_salary_slip', label: 'PHIẾU LƯƠNG', icon: Banknote, isLarge: true, color: 'text-emerald-400' },
        ],
      },
      {
        id: 'hr_admin_ops',
        label: 'HÀNH CHÍNH',
        items: [
          { id: 'hr_assets', label: 'TÀI SẢN', icon: Package, isLarge: true, color: 'text-amber-400' },
          { id: 'hr_documents', label: 'CÔNG VĂN', icon: ScrollText, isLarge: true, color: 'text-teal-400' },
          { id: 'hr_training', label: 'ĐÀO TẠO', icon: GraduationCap, isLarge: true, color: 'text-blue-400' },
          { id: 'hr_backup', label: 'SAO LƯU', icon: HardDriveDownload, isLarge: true, color: 'text-teal-400' },
        ],
      },
    ],
  },
  {
    id: 'admin',
    label: 'ADMIN',
    allowedRoles: ['admin'],
    groups: [
      {
        id: 'admin_users',
        label: 'HỆ THỐNG',
        items: [
          { id: 'users', label: 'TÀI KHOẢN', icon: Users, isLarge: true, color: 'text-blue-400' },
          { id: 'admin_salary_security', label: 'BẢO MẬT LƯƠNG', icon: ShieldCheck, isLarge: true, color: 'text-emerald-400' },
        ],
      },
    ],
  },
];
