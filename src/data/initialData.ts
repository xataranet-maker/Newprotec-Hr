import { 
  UserAccount, StaffRecord, NetDataRecord, ImportRecord, ExportRecord, 
  AccessoryRecord, HRAnnouncement, ToolRecord, SparePartRecord,
  AccessoryParameter
} from '../types';

export const INITIAL_USERS: UserAccount[] = [
  { username: 'Newprotec', password: 'New123@', fullName: 'Ban Giám Đốc Newprotec', role: 'admin', employeeId: 'NP001', department: 'ADMIN' },
  { username: 'admin', password: '123', fullName: 'Quản Trị Viên Hệ Thống', role: 'admin', employeeId: 'NP002', department: 'ADMIN' },
  { username: 'multiauto', password: '123', fullName: 'Trưởng Ca Multi Auto', role: 'multiauto', employeeId: 'MA001', department: 'MULTI' },
  { username: 'stiff', password: '123', fullName: 'Quản Lý Stiff', role: 'stiff', employeeId: 'ST001', department: 'STIFF' },
  { username: 'stamping', password: '123', fullName: 'Trưởng Ca Dập Tự Động', role: 'stamping', employeeId: 'AS001', department: 'STAMPING' },
  { username: 'mold', password: '123', fullName: 'Quản Lý Khuôn & Jig', role: 'mold', employeeId: 'MJ001', department: 'MOLD' },
  { username: 'equipment', password: '123', fullName: 'Kỹ Thuật Thiết Bị', role: 'equipment', employeeId: 'EQ001', department: 'EQUIPMENT' },
  { username: 'hr', password: '123', fullName: 'Hành Chính Nhân Sự', role: 'hr', employeeId: 'HR001', department: 'HR' },
  { username: 'NV001', password: '123', fullName: 'Nguyễn Văn Quân', role: 'staff', employeeId: 'NV001', department: 'MULTI' }
];

export const INITIAL_STAFF: StaffRecord[] = [
  { id: 1, fullName: 'NGUYỄN VĂN QUÂN', employeeId: 'NV001', position: 'Trưởng nhóm Vận hành', dateJoined: '12/03/2021', dob: '15/08/1994', hometown: 'Bắc Ninh', phone: '0987123456', attendance: 'Đúng giờ', shift: 'DAY', department: 'MULTI', workUnit: 'Tổ 1' },
  { id: 2, fullName: 'TRẦN THỊ HƯƠNG', employeeId: 'NV002', position: 'Kỹ thuật viên Trạm 1', dateJoined: '05/06/2022', dob: '22/11/1996', hometown: 'Hà Nội', phone: '0976234567', attendance: 'Đúng giờ', shift: 'DAY', department: 'MULTI', workUnit: 'Tổ 1' },
  { id: 3, fullName: 'LÊ VĂN MINH', employeeId: 'NV003', position: 'Vận hành Máy Dập', dateJoined: '10/01/2023', dob: '04/02/1995', hometown: 'Hải Phòng', phone: '0912345678', attendance: 'Đúng giờ', shift: 'DAY', department: 'STAMPING', workUnit: 'Tổ Dập' },
  { id: 4, fullName: 'PHẠM VĂN ĐỨC', employeeId: 'NV004', position: 'Bảo trì Khuôn', dateJoined: '18/09/2020', dob: '30/07/1992', hometown: 'Vĩnh Phúc', phone: '0988776655', attendance: 'Đúng giờ', shift: 'DAY', department: 'MOLD', workUnit: 'Khuôn' },
  { id: 5, fullName: 'HOÀNG THỊ LAN', employeeId: 'NV005', position: 'Thao tác Stiff SUS', dateJoined: '02/11/2022', dob: '14/05/1997', hometown: 'Phú Thọ', phone: '0933221100', attendance: 'Đúng giờ', shift: 'DAY', department: 'STIFF', workUnit: 'SUS Auto' },
  { id: 6, fullName: 'ĐẶNG TIẾN DŨNG', employeeId: 'NV006', position: 'Kỹ thuật Thiết bị', dateJoined: '15/04/2019', dob: '19/09/1990', hometown: 'Bắc Giang', phone: '0944556677', attendance: 'Đúng giờ', shift: 'DAY', department: 'EQUIPMENT', workUnit: 'Bảo trì' },
  { id: 7, fullName: 'VŨ THỊ MAI', employeeId: 'NV007', position: 'Chuyên viên Nhân sự', dateJoined: '01/08/2021', dob: '25/12/1995', hometown: 'Hà Nam', phone: '0966889900', attendance: 'Đúng giờ', shift: 'DAY', department: 'HR', workUnit: 'HC-NS' }
];

export const INITIAL_NET_DATA: NetDataRecord[] = [
  { id: 1, model: 'SM-S928B', code: 'NP-S928-01', customer: 'Samsung Electronics', layer: 'INNER', stage: '1L-1', stage1Points: 12, stage2: '1L-2', stage2Points: 8, pitchDistance: 25.4, pcsPerStroke: 4, pieceLength: 120, tableTemp: 145, padTemp: 130, airPressure: 0.55, timePerPoint: 1.2, pressingTime: 3.5, status: 'OK', department: 'MULTI', workingCondition: 'Nhiệt độ 22-26°C, độ ẩm 45-60%' },
  { id: 2, model: 'IPHONE-16PM', code: 'NP-IP16-PRO', customer: 'Foxconn / Luxshare', layer: 'OUTER', stage: '2L-1', stage1Points: 16, stage2: '2L-2', stage2Points: 16, pitchDistance: 32.0, pcsPerStroke: 2, pieceLength: 180, tableTemp: 150, padTemp: 135, airPressure: 0.60, timePerPoint: 1.5, pressingTime: 4.0, status: 'OK', department: 'MULTI', workingCondition: 'Phòng sạch Class 1000' },
  { id: 3, model: 'PIXEL-9PRO', code: 'NP-PX09-P1', customer: 'Compal Tech', layer: 'INNER', stage: 'SUS AUTO', stage1Points: 8, pitchDistance: 20.0, pcsPerStroke: 6, pieceLength: 95, tableTemp: 140, padTemp: 125, airPressure: 0.50, timePerPoint: 1.0, pressingTime: 3.0, status: 'OK', department: 'STIFF', workingCondition: 'Tiêu chuẩn ESD' },
  { id: 4, model: 'XIAOMI-15U', code: 'NP-XM15-02', customer: 'DBG Tech', layer: 'OUTER', stage: 'DẬP CUỘN', stage1Points: 24, pitchDistance: 18.5, pcsPerStroke: 8, pieceLength: 85, tableTemp: 135, padTemp: 120, airPressure: 0.55, timePerPoint: 0.8, pressingTime: 2.5, status: 'OK', department: 'STAMPING', workingCondition: 'Dầu dập bay hơi tự nhiên' },
  { id: 5, model: 'MOLD-S928-BASE', code: 'MD-S928-B', customer: 'Newprotec In-house', stage: 'KHUÔN DẬP', stage1Points: 1, timePerPoint: 1, status: 'OK', department: 'MOLD' }
];

export const INITIAL_IMPORT_RECORDS: ImportRecord[] = [
  {
    id: 1,
    timestamp: '08:15:20',
    date: new Date().toLocaleDateString('vi-VN'),
    shift: 'Ca Ngày',
    model: 'SM-S928B',
    code: 'NP-S928-01',
    lotNo: 'LOT-202611-001',
    quantity: 1200,
    stage: '1L-1',
    isVerified: true,
    verifiedAt: '08:20:00',
    productionStatus: 'RUNNING',
    productionProgress: {
      '1L-1': {
        status: 'RUNNING',
        machine: 'Multi 01',
        moldNo: 'M-01',
        startTime: '08:30:00',
        accumulatedTime: 1420,
        lastStartTimestamp: Date.now() - 1420000,
        accessoryLot: 'PL-TAPE-092'
      }
    },
    note: 'Lô ưu tiên xuất xưởng'
  },
  {
    id: 2,
    timestamp: '09:05:10',
    date: new Date().toLocaleDateString('vi-VN'),
    shift: 'Ca Ngày',
    model: 'IPHONE-16PM',
    code: 'NP-IP16-PRO',
    lotNo: 'LOT-202611-002',
    quantity: 850,
    stage: '2L-1',
    isVerified: true,
    verifiedAt: '09:10:00',
    productionStatus: 'PENDING',
    productionProgress: {
      '2L-1': {
        status: 'PENDING',
        machine: 'Multi 02',
        moldNo: 'M-02',
        accessoryLot: 'PL-FILM-115'
      }
    },
    note: 'Kiểm tra độ bám dính'
  },
  {
    id: 3,
    timestamp: '10:00:00',
    date: new Date().toLocaleDateString('vi-VN'),
    shift: 'Ca Ngày',
    model: 'PIXEL-9PRO',
    code: 'NP-PX09-P1',
    lotNo: 'LOT-202611-003',
    quantity: 600,
    stage: '1L-1',
    isVerified: false,
    productionStatus: 'PENDING',
    note: 'Chờ đối chiếu phụ liệu'
  }
];

export const INITIAL_ACCESSORY_RECORDS: AccessoryRecord[] = [
  { id: 1, timestamp: '08:00:15', date: new Date().toLocaleDateString('vi-VN'), shift: 'Ca Ngày', model: 'SM-S928B', code: 'NP-S928-01', lotNo: 'PL-TAPE-092', stage: '1L-1', quantity: 2500, expirationDate: '2027-12-31', isVerified: true, verifiedAt: '08:10:00' },
  { id: 2, timestamp: '08:45:00', date: new Date().toLocaleDateString('vi-VN'), shift: 'Ca Ngày', model: 'IPHONE-16PM', code: 'NP-IP16-PRO', lotNo: 'PL-FILM-115', stage: '2L-1', quantity: 1800, expirationDate: '2027-06-30', isVerified: true, verifiedAt: '09:00:00' },
  { id: 3, timestamp: '09:30:20', date: new Date().toLocaleDateString('vi-VN'), shift: 'Ca Ngày', model: 'PIXEL-9PRO', code: 'NP-PX09-P1', lotNo: 'PL-SUS-043', stage: 'SUS AUTO', quantity: 3000, expirationDate: '2028-01-15', isVerified: false }
];

export const INITIAL_EXPORT_RECORDS: ExportRecord[] = [
  { id: 1, timestamp: '07:45:00', date: new Date().toLocaleDateString('vi-VN'), shift: 'Ca Ngày', model: 'SM-S928B', code: 'NP-S928-01', lotNo: 'LOT-202611-000', stage: '1L-1', quantity: 1000, note: 'Giao ca sớm' }
];

export const INITIAL_ACCESSORY_PARAMS: AccessoryParameter[] = [
  { id: 1, model: 'SM-S928B', code: 'NP-S928-01', stage: '1L-1', thickness: '0.05mm', width: 45, length: 150, capableMachines: [1, 2, 3], updatedAt: new Date().toLocaleDateString('vi-VN') },
  { id: 2, model: 'IPHONE-16PM', code: 'NP-IP16-PRO', stage: '2L-1', thickness: '0.075mm', width: 55, length: 180, capableMachines: [2, 4, 5], updatedAt: new Date().toLocaleDateString('vi-VN') }
];

export const INITIAL_ANNOUNCEMENTS: HRAnnouncement[] = [
  {
    id: 1,
    title: 'Kế hoạch sản xuất cao điểm quý 4 và quy định 5S tại xưởng',
    title_ko: '4분기 생산 성수기 계획 및 현장 5S 규정 안내',
    content: 'Yêu cầu các trưởng ca kiểm tra nghiêm ngặt thiết bị, bảo hộ lao động và đối chiếu lô phụ liệu trước khi nhấn nút khởi động máy.',
    content_ko: '모든 조장은 장비, 작업 안전용품을 철저히 점검하고 설비 가동 전 부자재 로트를 대조하시기 바랍니다.',
    date: new Date().toLocaleDateString('vi-VN'),
    priority: 'URGENT',
    recipientType: 'DEPARTMENT',
    recipients: ['ALL'],
    allowResend: true,
    sender: 'Ban Quản Lý Sản Xuất'
  },
  {
    id: 2,
    title: 'Lịch bảo dưỡng định kỳ hệ thống máy dập tự động và khí nén',
    title_ko: '자동 프레스 및 공압 시스템 정기 유지보수 일정',
    content: 'Thứ 7 tuần này bộ phận Thiết Bị sẽ bảo trì cụm van khí và kiểm tra áp suất bàn dập từ 13:00 đến 17:00.',
    content_ko: '이번 주 토요일 13:00~17:00에 설비팀에서 공압 밸브 및 프레스 압력을 점검할 예정입니다.',
    date: new Date().toLocaleDateString('vi-VN'),
    priority: 'NORMAL',
    recipientType: 'DEPARTMENT',
    recipients: ['STAMPING', 'EQUIPMENT'],
    allowResend: false,
    sender: 'Bộ Phận Thiết Bị'
  }
];

export const INITIAL_TOOLS: ToolRecord[] = [
  { id: 1, code: 'TL-HEX-01', name: 'Bộ lục giác Nhật Bản Tone 1.5-10mm', type: 'Dụng cụ cầm tay', quantity: 5, status: 'GOOD', importDate: '10/01/2024' },
  { id: 2, code: 'TL-CALIPER-02', name: 'Thước cặp điện tử Mitutoyo 0-150mm', type: 'Đo lường', quantity: 3, status: 'GOOD', importDate: '15/03/2024' },
  { id: 3, code: 'TL-TORQUE-03', name: 'Cần siết lực Kanon 5-25Nm', type: 'Siết lực', quantity: 2, status: 'GOOD', importDate: '01/05/2024' }
];

export const INITIAL_SPARE_PARTS: SparePartRecord[] = [
  { id: 1, code: 'SP-CYL-SMC', name: 'Xy lanh khí nén SMC CDQ2B32-25DZ', quantity: 14, unit: 'Cái', manufacturer: 'SMC Japan', importDate: '12/02/2024', compatibleMachines: ['Multi 01', 'Multi 02', 'Multi 03'], minStock: 5 },
  { id: 2, code: 'SP-SENSOR-KEY', name: 'Cảm biến quang sợi Keyence FS-N41N', quantity: 22, unit: 'Bộ', manufacturer: 'Keyence', importDate: '10/03/2024', compatibleMachines: ['Stamp 01', 'Stamp 02', 'Multi 01'], minStock: 8 },
  { id: 3, code: 'SP-HEATER-100', name: 'Thanh nhiệt bàn ép 220V 500W', quantity: 9, unit: 'Cây', manufacturer: 'Hakko', importDate: '20/04/2024', compatibleMachines: ['SUS AUTO 01', 'SUS AUTO 02'], minStock: 4 }
];
