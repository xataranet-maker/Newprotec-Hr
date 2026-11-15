import { RibbonTab } from '../types';
import { 
  Download, Upload, Package, Database, Mail, Users, 
  BarChart3, Settings, Factory, Activity, 
  Timer, History, LineChart, FileCheck, Calculator,
  FileText, CalendarDays, ArchiveRestore, 
  LayoutDashboard, Layers, Monitor, HardDriveDownload,
  Zap as ZapIcon, Megaphone, Disc, GitCompare, 
  CalendarRange, Cpu, Clock, Hammer, Nut, Siren, ScrollText, 
  Inbox, Plus, Plane, Banknote, UserPlus, StickyNote, 
  GraduationCap, ClipboardCheck, FileSearch, Ruler, ClipboardList, 
  UserCheck, FileBadge, Trash2
} from 'lucide-react';

export const ribbonData: RibbonTab[] = [
  {
    id: 'home',
    label: 'HOME',
    allowedRoles: ['admin', 'multiauto', 'stiff', 'mold', 'stamping', 'hr', 'equipment', 'quality', 'report_viewer', 'user', 'staff', 'warehouse', 'view_all'],
    groups: [
      {
        id: 'home_overview',
        label: 'TỔNG QUAN',
        items: [
           { id: 'dashboard_home', label: 'BÁO CÁO TỔNG HỢP', icon: LayoutDashboard, isLarge: true, color: 'text-blue-500' },
           { id: 'personal_profile', label: 'HỒ SƠ CÁ NHÂN', icon: UserCheck, isLarge: true, color: 'text-cyan-500' },
           { id: 'home_announcements', label: 'THÔNG BÁO', icon: Megaphone, isLarge: true, color: 'text-red-500' },
           { id: 'planning_hub', label: 'ĐIỀU PHỐI KẾ HOẠCH', icon: CalendarRange, isLarge: false, color: 'text-cyan-400' },
           { id: 'production_plans', label: 'LỊCH SỬ KẾ HOẠCH', icon: History, isLarge: false, color: 'text-indigo-400' },
        ]
      }
    ]
  },
  {
    id: 'Multi',
    label: 'MULTI AUTO',
    allowedRoles: ['admin', 'multiauto', 'report_viewer', 'view_all', 'quality'],
    groups: [
      {
        id: 'report',
        label: 'PHÂN TÍCH & BÁO CÁO',
        items: [
            { id: 'model_tracking', label: 'HIỆU SUẤT MÁY (LIVE)', icon: Activity, isLarge: true, color: 'text-blue-400' },
            { id: 'prod_report', label: 'BÁO CÁO TỔNG HỢP', icon: BarChart3, isLarge: true, color: 'text-emerald-400' },
            { id: 'quality_report', label: 'HIỆU SUẤT THÁNG', icon: CalendarDays, isLarge: true, color: 'text-amber-400' },
            { id: 'prod_report_kr', label: 'BÁO CÁO KR', icon: FileText, isLarge: true, color: 'text-indigo-400' },
        ]
      },
      {
        id: 'Multi_menu',
        label: 'VẬN HÀNH SẢN XUẤT',
        items: [
          { id: 'production', label: 'TRẠM SẢN XUẤT', icon: Factory, isLarge: true, color: 'text-blue-500' },
          { id: 'multi_staff', label: 'NHÂN VIÊN', icon: Users, isLarge: true, color: 'text-blue-400' },
          { id: 'multi_matrix_timekeeping', label: 'BẢNG CHẤM CÔNG', icon: CalendarDays, isLarge: true, color: 'text-amber-400' },
          { id: 'att_confirm', label: 'XÁC NHẬN CÔNG', icon: FileBadge, isLarge: true, color: 'text-emerald-400' },
          { id: 'import', label: 'NHẬP TP', icon: Download, isLarge: false, color: 'text-emerald-500' },
          { id: 'machine_book', label: 'NHẬP PL', icon: Layers, isLarge: false, color: 'text-cyan-400' },
          { id: 'acc_check_sheet', label: 'PHIẾU KT PL', icon: ClipboardList, isLarge: false, color: 'text-emerald-400' },
          { id: 'export', label: 'XUẤT KHO', icon: Upload, isLarge: false, color: 'text-amber-500' },
          { id: 'completed_production', label: 'LỊCH SỬ SX', icon: FileCheck, isLarge: false, color: 'text-indigo-400' },
          { id: 'machine_history', label: 'NHẬT KÝ MÁY', icon: History, isLarge: false, color: 'text-orange-400' },
        ]
      },
      {
        id: 'management',
        label: 'QUẢN TRỊ HỆ THỐNG',
        items: [
          { id: 'dk_may', label: 'DK MÁY', icon: Settings, isLarge: true, color: 'text-slate-400' },
          { id: 'data_net', label: 'DATA NET', icon: Database, isLarge: true, color: 'text-cyan-400' },
          { id: 'accessory_params', label: 'THÔNG SỐ PL', icon: Ruler, isLarge: true, color: 'text-amber-400' },
          { id: 'send_mail', label: 'GỬI MAIL', icon: Mail, isLarge: true, color: 'text-indigo-400' },
          { id: 'multi_backup', label: 'SAO LƯU DỮ LIỆU', icon: HardDriveDownload, isLarge: true, color: 'text-teal-400' },
        ]
      },
      {
        id: 'acc_warehouse',
        label: 'QUẢN LÝ KHO',
        items: [
            { id: 'acc_inventory', label: 'TỒN P.LIỆU', icon: ArchiveRestore, isLarge: true, color: 'text-amber-400' },
            { id: 'inventory', label: 'TỒN TP', icon: Package, isLarge: true, color: 'text-yellow-400' },
            { id: 'check_pl', label: 'CHECK PL', icon: Calculator, isLarge: true, color: 'text-indigo-400' },
            { id: 'multi_compare', label: 'ĐỐI CHIẾU NHẬP', icon: GitCompare, isLarge: true, color: 'text-blue-400' },
        ]
      },
      {
        id: 'multi_data_raw',
        label: 'TRUY XUẤT DỮ LIỆU',
        items: [
            { id: 'multi_data_view', label: 'SỔ NHẬP TP', icon: FileSearch, isLarge: true, color: 'text-slate-400' },
            { id: 'multi_acc_data_view', label: 'SỔ NHẬP PL', icon: FileSearch, isLarge: true, color: 'text-slate-400' },
            { id: 'multi_export_view', label: 'DỮ LIỆU XUẤT', icon: FileSearch, isLarge: true, color: 'text-slate-400' },
        ]
      }
    ]
  },
  {
    id: 'stiff',
    label: 'STIFF',
    allowedRoles: ['admin', 'stiff', 'report_viewer', 'view_all', 'quality'],
    groups: [
      {
        id: 'stiff_sections',
        label: 'KHU VỰC SẢN XUẤT',
        items: [
            { id: 'stiff_sus_auto', label: 'SUS AUTO', icon: Cpu, isLarge: true, color: 'text-orange-400' },
            { id: 'stiff_sus_semi', label: 'SUS SEMI', icon: ZapIcon, isLarge: true, color: 'text-purple-400' },
            { id: 'stiff_tape_auto', label: 'TAPE AUTO', icon: ZapIcon, isLarge: true, color: 'text-blue-400' },
            { id: 'stiff_tape_jig', label: 'TAPE JIG', icon: Disc, isLarge: true, color: 'text-cyan-400' },
        ]
      },
      {
        id: 'stiff_mgmt',
        label: 'QUẢN TRỊ',
        items: [
            { id: 'stiff_data_net', label: 'DATA NET', icon: Database, isLarge: true, color: 'text-blue-400' },
            { id: 'stiff_staff', label: 'NHÂN SỰ', icon: Users, isLarge: true, color: 'text-emerald-400' },
            { id: 'stiff_matrix_timekeeping', label: 'BẢNG CHẤM CÔNG', icon: CalendarDays, isLarge: true, color: 'text-amber-400' },
            { id: 'stiff_backup', label: 'SAO LƯU', icon: HardDriveDownload, isLarge: true, color: 'text-teal-400' },
        ]
      }
    ]
  },
  {
    id: 'auto_stamping',
    label: 'DẬP TỰ ĐỘNG',
    allowedRoles: ['admin', 'stamping', 'report_viewer', 'view_all', 'quality'],
    groups: [
      {
        id: 'as_report',
        label: 'BÁO CÁO & GIÁM SÁT',
        items: [
            { id: 'as_prod_rpt', label: 'TỔNG HỢP', icon: LineChart, isLarge: true, color: 'text-emerald-400' },
            { id: 'as_machine', label: 'MÁY DẬP (LIVE)', icon: Activity, isLarge: true, color: 'text-purple-400' },
        ]
      },
      {
        id: 'as_menu',
        label: 'VẬN HÀNH',
        items: [
          { id: 'as_import', label: 'NHẬP CUỘN', icon: Download, isLarge: true, color: 'text-emerald-400' },
          { id: 'as_production', label: 'SẢN XUẤT', icon: Factory, isLarge: true, color: 'text-slate-300' },
          { id: 'as_export', label: 'XUẤT KHO', icon: Upload, isLarge: true, color: 'text-blue-400' },
          { id: 'as_completed', label: 'LỊCH SỬ SX', icon: FileCheck, isLarge: false, color: 'text-indigo-400' },
          { id: 'as_history', label: 'NHẬT KÝ MÁY', icon: History, isLarge: false, color: 'text-orange-400' },
        ]
      },
      {
        id: 'as_stock',
        label: 'KHO',
        items: [
          { id: 'as_inventory_tp', label: 'TỒN TP (PCS)', icon: Package, isLarge: true, color: 'text-yellow-400' },
          { id: 'as_inventory_cuon', label: 'TỒN CUỘN (M)', icon: ArchiveRestore, isLarge: true, color: 'text-amber-400' },
          { id: 'as_check_material', label: 'DUYỆT KHO', icon: Calculator, isLarge: true, color: 'text-indigo-400' },
        ]
      },
      {
        id: 'as_admin_grp',
        label: 'QUẢN TRỊ',
        items: [
            { id: 'as_machine_setup', label: 'DK MÁY', icon: Settings, isLarge: true, color: 'text-slate-400' },
            { id: 'as_net_data', label: 'DATA NET', icon: Database, isLarge: true, color: 'text-cyan-400' },
            { id: 'as_staff', label: 'NHÂN SỰ', icon: Users, isLarge: true, color: 'text-blue-400' },
            { id: 'as_matrix_timekeeping', label: 'BẢNG CHẤM CÔNG', icon: CalendarDays, isLarge: true, color: 'text-amber-400' },
            { id: 'as_backup', label: 'SAO LƯU', icon: HardDriveDownload, isLarge: true, color: 'text-teal-400' },
        ]
      }
    ]
  },
  {
    id: 'mold_jig',
    label: 'KHUÔN & JIG',
    allowedRoles: ['admin', 'mold', 'report_viewer', 'view_all', 'quality'],
    groups: [
      {
        id: 'mj_assets',
        label: 'QUẢN LÝ TÀI SẢN',
        items: [
          { id: 'mj_import', label: 'ĐĂNG KÝ MỚI', icon: Plus, isLarge: true, color: 'text-orange-400' },
          { id: 'mj_export', label: 'XUẤT LỆNH', icon: Upload, isLarge: true, color: 'text-blue-400' },
          { id: 'mj_stock_mold', label: 'KHO KHUÔN', icon: Inbox, isLarge: false, color: 'text-orange-400' },
          { id: 'mj_stock_jig', label: 'KHO JIG', icon: Cpu, isLarge: false, color: 'text-cyan-400' },
        ]
      },
      {
        id: 'mj_tracking',
        label: 'NHẬT KÝ',
        items: [
          { id: 'mj_history', label: 'NHẬT KÝ NHẬP', icon: History, isLarge: true, color: 'text-emerald-400' },
          { id: 'mj_scrap', label: 'DANH SÁCH PHẾ', icon: Trash2, isLarge: true, color: 'text-red-400' },
        ]
      },
      {
        id: 'mj_admin',
        label: 'HỆ THỐNG',
        items: [
          { id: 'mj_net_data', label: 'ĐỊNH MỨC', icon: Database, isLarge: true, color: 'text-slate-400' },
          { id: 'mj_staff', label: 'NHÂN SỰ', icon: Users, isLarge: true, color: 'text-blue-400' },
          { id: 'mj_matrix_timekeeping', label: 'BẢNG CHẤM CÔNG', icon: CalendarDays, isLarge: true, color: 'text-amber-400' },
          { id: 'mj_backup', label: 'SAO LƯU', icon: HardDriveDownload, isLarge: true, color: 'text-teal-400' },
        ]
      }
    ]
  },
  {
    id: 'equipment_dept',
    label: 'THIẾT BỊ',
    allowedRoles: ['admin', 'equipment', 'report_viewer', 'view_all'],
    groups: [
      {
        id: 'eq_monitor',
        label: 'GIÁM SÁT',
        items: [
          { id: 'device_machine_setup', label: 'TRẠNG THÁI MÁY', icon: Monitor, isLarge: true, color: 'text-blue-400' },
        ]
      },
      {
        id: 'eq_management',
        label: 'KHO & BẢO TRÌ',
        items: [
          { id: 'device_tool_registry', label: 'DK CÔNG CỤ', icon: Hammer, isLarge: true, color: 'text-orange-400' },
          { id: 'device_spare_parts', label: 'KHO PHỤ TÙNG', icon: Nut, isLarge: true, color: 'text-blue-400' },
          { id: 'device_repair_history', label: 'LỊCH SỬ SỬA', icon: ScrollText, isLarge: false, color: 'text-emerald-400' },
          { id: 'device_fault_registry', label: 'DANH MỤC LỖI', icon: Siren, isLarge: false, color: 'text-red-400' },
        ]
      },
      {
        id: 'eq_hr_grp',
        label: 'QUẢN TRỊ',
        items: [
          { id: 'device_staff', label: 'NHÂN SỰ TB', icon: Users, isLarge: true, color: 'text-blue-400' },
          { id: 'device_matrix_timekeeping', label: 'BẢNG CHẤM CÔNG', icon: CalendarDays, isLarge: true, color: 'text-amber-400' },
          { id: 'eq_backup', label: 'SAO LƯU', icon: HardDriveDownload, isLarge: true, color: 'text-teal-400' },
        ]
      }
    ]
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
        ]
      },
      {
        id: 'hr_timekeeping_grp',
        label: 'CHẤM CÔNG & LƯƠNG',
        items: [
          { id: 'timekeeping', label: 'DỮ LIỆU CÔNG', icon: Clock, isLarge: true, color: 'text-blue-400' },
          { id: 'hr_matrix_timekeeping', label: 'BẢNG CÔNG MA TRẬN', icon: CalendarDays, isLarge: true, color: 'text-amber-400' },
          { id: 'hr_overtime', label: 'ĐK TĂNG CA', icon: Timer, isLarge: false, color: 'text-orange-400' },
          { id: 'hr_leaves', label: 'NGHỈ PHÉP', icon: Plane, isLarge: false, color: 'text-cyan-400' },
          { id: 'hr_payroll', label: 'BẢNG CÔNG', icon: ClipboardCheck, isLarge: false, color: 'text-emerald-400' },
          { id: 'hr_salary_slip', label: 'PHIẾU LƯƠNG', icon: Banknote, isLarge: true, color: 'text-emerald-400' },
        ]
      },
      {
        id: 'hr_admin_ops',
        label: 'HÀNH CHÍNH',
        items: [
          { id: 'hr_assets', label: 'TÀI SẢN', icon: Package, isLarge: true, color: 'text-amber-400' },
          { id: 'hr_documents', label: 'CÔNG VĂN', icon: ScrollText, isLarge: true, color: 'text-teal-400' },
          { id: 'hr_training', label: 'ĐÀO TẠO', icon: GraduationCap, isLarge: true, color: 'text-blue-400' },
          { id: 'hr_backup', label: 'SAO LƯU', icon: HardDriveDownload, isLarge: true, color: 'text-teal-400' },
        ]
      }
    ]
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
        ]
      }
    ]
  }
];
