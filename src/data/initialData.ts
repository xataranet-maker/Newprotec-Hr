import { UserAccount, StaffRecord, HRAnnouncement } from '../types';

export const INITIAL_USERS: UserAccount[] = [
  { username: 'Newprotec', password: 'New123@', fullName: 'Ban Giám Đốc Newprotec', role: 'admin', employeeId: 'NP001', department: 'ADMIN' },
  { username: 'admin', password: '123', fullName: 'Quản Trị Viên Hệ Thống', role: 'admin', employeeId: 'NP002', department: 'ADMIN' },
  { username: 'multiauto', password: '123', fullName: 'Trưởng Ca Multi Auto', role: 'multiauto', employeeId: 'MA001', department: 'MULTI' },
  { username: 'hr', password: '123', fullName: 'Hành Chính Nhân Sự', role: 'hr', employeeId: 'HR001', department: 'HR' },
  { username: 'NV001', password: '123', fullName: 'Nguyễn Văn Quân', role: 'staff', employeeId: 'NV001', department: 'MULTI' },
  { username: 'QRCODE', password: '123', fullName: 'Trạm QR Chấm Công', role: 'qrcode', employeeId: 'QRCODE', department: 'ALL' },
];

export const INITIAL_STAFF: StaffRecord[] = [
  { id: 1, fullName: 'NGUYỄN VĂN QUÂN', employeeId: 'NV001', position: 'Trưởng nhóm Vận hành', dateJoined: '12/03/2021', dob: '15/08/1994', hometown: 'Bắc Ninh', phone: '0987123456', attendance: 'Đúng giờ', shift: 'DAY', department: 'MULTI', workUnit: 'Tổ 1' },
  { id: 2, fullName: 'TRẦN THỊ HƯƠNG', employeeId: 'NV002', position: 'Kỹ thuật viên Trạm 1', dateJoined: '05/06/2022', dob: '22/11/1996', hometown: 'Hà Nội', phone: '0976234567', attendance: 'Đúng giờ', shift: 'DAY', department: 'MULTI', workUnit: 'Tổ 1' },
  { id: 3, fullName: 'VŨ THỊ MAI', employeeId: 'NV007', position: 'Chuyên viên Nhân sự', dateJoined: '01/08/2021', dob: '25/12/1995', hometown: 'Hà Nam', phone: '0966889900', attendance: 'Đúng giờ', shift: 'DAY', department: 'HR', workUnit: 'HC-NS' },
];

export const INITIAL_ANNOUNCEMENTS: HRAnnouncement[] = [
  {
    id: 1,
    title: 'Kế hoạch chấm công & vận hành bộ phận Multi Auto và HC & NS',
    title_ko: '멀티 오토 및 인사총무부 근태·운영 안내',
    content: 'Yêu cầu các tổ trưởng kiểm tra chấm công ma trận hàng ngày, xác nhận giờ công chuẩn và tăng ca đúng quy định.',
    content_ko: '각 조장은 매일 매트릭스 근태표를 확인하고 정상 근무 및 연장 근무 시간을 정확히 기록하시기 바랍니다.',
    date: new Date().toLocaleDateString('vi-VN'),
    priority: 'URGENT',
    recipientType: 'DEPARTMENT',
    recipients: ['ALL'],
    allowResend: true,
    sender: 'Ban Quản Lý & HC-NS',
  },
];
