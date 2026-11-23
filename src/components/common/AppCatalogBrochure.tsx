import React, { useMemo, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import {
  Printer,
  Download,
  CheckCircle2,
  Factory,
  Clock,
  Wallet,
  Shield,
  FileText,
  Sparkles,
  Loader2,
  QrCode,
  ScanFace,
  Users,
  Smartphone,
  LayoutGrid,
  ZoomIn,
  X,
  Lock,
  Share2,
  Copy,
  Check,
  Globe,
  ExternalLink,
  LogIn,
  Layers,
} from 'lucide-react';

interface AppCatalogBrochureProps {
  onClose?: () => void;
  isModal?: boolean;
  isPublicView?: boolean;
  onBackToLogin?: () => void;
}

interface CatalogTabItem {
  id: string;
  order: string;
  groupId: 'CORE' | 'HR' | 'EMPLOYEE' | 'KIOSK';
  tabPath: string;
  title: string;
  subtitle: string;
  accentHex: string;
  imageSrc: string;
  isPortrait?: boolean;
  functions: string[];
  utilities: string[];
}

interface CatalogGroupMeta {
  id: 'CORE' | 'HR' | 'EMPLOYEE' | 'KIOSK';
  code: string;
  title: string;
  description: string;
  accentHex: string;
}

const CATALOG_GROUPS: CatalogGroupMeta[] = [
  {
    id: 'CORE',
    code: 'PHẦN I',
    title: 'Hệ Thống Cốt Lõi, Báo Cáo Tổng Hợp & Quản Trị Bảo Mật',
    description:
      'Cổng đăng nhập đa phương thức, bảng điều khiển phân tích nhân sự nhà máy và trung tâm phân quyền bảo mật lương.',
    accentHex: '#22d3ee',
  },
  {
    id: 'HR',
    code: 'PHẦN II',
    title: 'Phân Hệ Hành Chính & Nhân Sự (HC & NS)',
    description:
      'Quản lý hồ sơ nhân viên, thẻ đeo điện tử, đối soát 3 nguồn dữ liệu công, bảng công ma trận, đơn phép song ngữ và tính lương tự động.',
    accentHex: '#34d399',
  },
  {
    id: 'EMPLOYEE',
    code: 'PHẦN III',
    title: 'Cổng Thông Tin Nhân Viên & Giao Diện Mobile',
    description:
      'Không gian cá nhân minh bạch cho từng công nhân viên tra cứu công, tự xác nhận công, giải trình bất thường và xem phiếu lương.',
    accentHex: '#a78bfa',
  },
  {
    id: 'KIOSK',
    code: 'PHẦN IV',
    title: 'Trạm Chấm Công Kiosk (QR / Khuôn Mặt) & An Ninh Cổng',
    description:
      'Thiết bị điểm danh chuyên dụng tại cửa xưởng không cần thao tác phức tạp và phân hệ kiểm soát ra vào dành riêng cho bảo vệ.',
    accentHex: '#38bdf8',
  },
];

const CATALOG_ITEMS: CatalogTabItem[] = [
  // PHẦN I: CORE
  {
    id: 'login',
    order: '01',
    groupId: 'CORE',
    tabPath: 'HỆ THỐNG › ĐĂNG NHẬP',
    title: 'Màn Hình Đăng Nhập Đa Phương Thức',
    subtitle: 'Phân quyền tự động theo vai trò Admin, HC&NS, Quản lý ca, Bảo vệ & Nhân viên',
    accentHex: '#22d3ee',
    imageSrc: '/assets/aistudio/__ng_Nh_p_a4aba978.png',
    functions: [
      'Đăng nhập bằng Tên tài khoản nội bộ hoặc trực tiếp bằng Mã Nhân Viên (Employee ID).',
      'Hỗ trợ Quét Mã QR Truy Cập Nhanh ngay trên thẻ nhân viên và đăng nhập Google (Firebase Auth).',
      'Tích hợp nút Mã QR App để nhân viên mở nhanh ứng dụng trên điện thoại di động.',
    ],
    utilities: [
      'Hỗ trợ chuyển đổi tức thì 3 ngôn ngữ: Tiếng Việt (VI), Tiếng Hàn (한국어) và Tiếng Anh (EN).',
      'Tự động định tuyến đúng giao diện làm việc tương ứng với từng cấp bậc quyền hạn.',
    ],
  },
  {
    id: 'home_dashboard',
    order: '02',
    groupId: 'CORE',
    tabPath: 'TRANG CHỦ › BÁO CÁO TỔNG HỢP',
    title: 'Dashboard HC & Nhân Sự Toàn Nhà Máy',
    subtitle: 'Bức tranh nhân lực theo thời gian thực toàn nhà máy',
    accentHex: '#38bdf8',
    imageSrc: '/assets/aistudio/Home_81a83f95.png',
    functions: [
      'Thống kê tức thời Tổng nhân lực, tỷ lệ Ca Ngày / Ca Đêm, số nhân viên đi làm và nghỉ phép trong tháng.',
      'Tự động xếp hạng và cảnh báo: Nhân viên tăng ca nhiều nhất, ít nhất, nghỉ phép nhiều và danh sách quên quét thẻ.',
      'Hiển thị Bảng thông báo nội bộ và các nút truy cập nhanh vào toàn bộ phân hệ trọng yếu.',
    ],
    utilities: [
      'Ban Giám Đốc và HC&NS nắm bắt ngay tình hình biến động quân số và giờ tăng ca chỉ trong 3 giây.',
      'Tự động đồng bộ trực tiếp từ dữ liệu bảng công ma trận và máy quẹt thẻ hàng ngày.',
    ],
  },
  {
    id: 'admin_salary_security',
    order: '03',
    groupId: 'CORE',
    tabPath: 'ADMIN › BẢO MẬT LƯƠNG',
    title: 'Quản Trị Bảo Mật Lương & Phân Quyền Sâu',
    subtitle: 'Kiểm soát chặt chẽ quyền xem dữ liệu thu nhập toàn công ty',
    accentHex: '#10b981',
    imageSrc: '/assets/aistudio/Admin_9978e672.png',
    functions: [
      'Bật/Tắt chế độ bảo mật bí mật lương nhân viên và chỉ định đích danh từng tài khoản được phép truy cập.',
      'Cấp quyền linh hoạt theo nhóm vai trò (Admin, HC&NS, Quản lý bộ phận...) và cấu hình Mã PIN lớp 2.',
      'Cấu hình tính năng Tự động che số tiền lương (●●●●●) khi mới mở tab để chống nhìn trộm.',
    ],
    utilities: [
      'Ngăn chặn tuyệt đối việc truy cập trái phép hoặc rò rỉ thông tin thu nhập cá nhân trên màn hình chung.',
      'Ghi nhận rõ thời gian cập nhật và người thực hiện cấu hình bảo mật cuối cùng.',
    ],
  },

  // PHẦN II: HC & NS
  {
    id: 'hr_staff_list',
    order: '04',
    groupId: 'HR',
    tabPath: 'HC & NS › DS NHÂN VIÊN',
    title: 'Danh Sách Nhân Viên, QR & Khuôn Mặt',
    subtitle: 'Quản lý tập trung hồ sơ, trạng thái điểm danh và sinh trắc học nhân viên',
    accentHex: '#34d399',
    imageSrc: '/assets/aistudio/DS_Nh_n_Vi_n_020f9ffe.png',
    functions: [
      'Hiển thị tổng quân số, thống kê Đúng giờ / Đi muộn / Về sớm và lọc đa điều kiện (Phòng ban, Trạng thái, Quyền QR, Khuôn mặt).',
      'Thao tác trực tiếp trên từng nhân viên: Khóa nhân sự, cập nhật điểm danh nhanh, Xem thẻ, In thẻ, Mở QR cá nhân.',
      'Tích hợp nút Cài khuôn mặt / Khuôn mặt ✓ cho từng nhân viên để đồng bộ ngay với máy chấm công khuôn mặt.',
    ],
    utilities: [
      'Quản lý trạng thái cấp thẻ đeo vật lý và bật/tắt quyền quét QR chỉ bằng một lần chạm.',
      'Đồng bộ hai chiều ngay lập tức với cổng bảo vệ, kiosk khuôn mặt và bảng công phòng ban.',
    ],
  },
  {
    id: 'staff_id_card',
    order: '05',
    groupId: 'HR',
    tabPath: 'HC & NS › THẺ NHÂN VIÊN',
    title: 'Thẻ Nhân Viên Điện Tử & In Thẻ Đeo Chuẩn CR80',
    subtitle: 'Chuẩn hóa nhận diện nhân sự nhà máy kết hợp QR cá nhân hóa',
    accentHex: '#22d3ee',
    imageSrc: '/assets/aistudio/Th__NV_ea743607.png',
    functions: [
      'Thiết kế khung thẻ chuyên nghiệp gồm Logo công ty, ảnh chân dung 3x4, mã QR riêng, Họ tên, Mã NV, Bộ phận và Chức vụ.',
      'Cho phép tải lên hoặc cập nhật ảnh 3x4 mới, in trực tiếp ra thẻ nhựa/giấy và tải về tệp ảnh PNG chất lượng cao.',
      'Quản lý nút "Xác nhận cấp thẻ đeo" giúp HC&NS theo dõi chính xác ai đã được phát thẻ vật lý.',
    ],
    utilities: [
      'Mã QR trên thẻ dùng chung cho cả 3 nghiệp vụ: Đăng nhập nhanh, Chấm công tại trạm và Soát vé cổng An Ninh.',
      'Tránh thất lạc hồ sơ thẻ đeo và giảm 90% thời gian làm thẻ nhân viên mới.',
    ],
  },
  {
    id: 'hr_timekeeping_compare',
    order: '06',
    groupId: 'HR',
    tabPath: 'HC & NS › DỮ LIỆU CÔNG',
    title: 'Dữ Liệu Công & Đối Soát Đa Nguồn (MQT / QR / Khuôn Mặt)',
    subtitle: 'Tự động phát hiện thiếu giờ vào/ra, đi muộn, về sớm và lệch tăng ca',
    accentHex: '#38bdf8',
    imageSrc: '/assets/aistudio/D__Li_u_c_ng_513b9f49.png',
    functions: [
      'Nạp file Excel từ Máy quẹt thẻ (MQT) để tự động quy chuẩn giờ làm theo quy tắc Ca Ngày (8:00) & Ca Đêm (20:00).',
      'Hiển thị song song 2 cột thao tác nhanh CỘT QR (VÀO / RA) và KHUÔN MẶT (VÀO / RA) cạnh nhau trên cùng một bảng.',
      'Bộ chuyển đổi 3 nguồn ngay trên tiêu đề bảng: Máy quẹt thẻ | Chấm công QR | Khuôn mặt để đối chiếu với Bảng công (BC).',
    ],
    utilities: [
      'Click trực tiếp vào ô QR hoặc Khuôn mặt để chỉnh sửa nhanh hoặc đồng bộ tạo phiếu giải trình bất thường NPT-FM-008.',
      'Thống kê tức thời tỷ lệ khớp (%) và tổng số lượt thiếu giờ vào/ra toàn xưởng, hỗ trợ xuất báo cáo Excel.',
    ],
  },
  {
    id: 'hr_matrix_attendance',
    order: '07',
    groupId: 'HR',
    tabPath: 'HC & NS › BẢNG CÔNG MA TRẬN',
    title: 'Bảng Chấm Công Ma Trận 31 Ngày',
    subtitle: 'Quản lý chi tiết từng ngày công, tăng ca ngày/đêm, Chủ Nhật & Ngày Lễ',
    accentHex: '#f59e0b',
    imageSrc: '/assets/aistudio/B_ng_C_ng_68e481ad.png',
    functions: [
      'Hiển thị lưới chi tiết từ ngày 01 đến ngày 30/31 hàng tháng với đầy đủ Giờ vào - Giờ ra và giờ tăng ca phân loại màu sắc.',
      'Tích hợp nút Điền Chuẩn, chuyển nhanh chế độ xem Bảng Công Thường / Đối Chiếu MQT-QR, Nhập & Xuất Excel.',
      'Chọn nhanh khung ca chuẩn: Ca ngày (8:00~17:00), Ca ngày (8:00~20:00)+3h, Ca đêm (20:00~5:00), Ca đêm (20:00~8:00)+3h.',
    ],
    utilities: [
      'Bảng 8 KPI tổng hợp tự động tính Tổng giờ làm, TC ngày, TC đêm, Ngày CN, Đêm CN, Ngày Lễ và Đêm Lễ.',
      'Hàng tổng hợp cuối bảng hiển thị chính xác số nhân viên đi làm Ca Ngày và Ca Đêm theo từng ngày.',
    ],
  },
  {
    id: 'hr_attendance_confirmation',
    order: '08',
    groupId: 'HR',
    tabPath: 'HC & NS › XÁC NHẬN CÔNG',
    title: 'Tổng Hợp & Theo Dõi Xác Nhận Đủ Công',
    subtitle: 'Đồng bộ trạng thái xác nhận từ từng hồ sơ nhân viên trước kỳ phát hành lương',
    accentHex: '#2dd4bf',
    imageSrc: '/assets/aistudio/X_c_Nh_n_c_ng_ffd0780c.png',
    functions: [
      'Tổng hợp đầy đủ Ngày công, Giờ công ngày/đêm và chi tiết 6 loại tăng ca của toàn bộ nhân viên trong tháng.',
      'Hiển thị trạng thái "Đã xác nhận" hay "Chưa xác nhận" đồng bộ theo thời gian thực từ tài khoản từng nhân viên.',
      'Nút "Gửi phiếu lương" giúp phát hành bảng lương chính thức ngay sau khi nhân viên đã xác nhận đủ công.',
    ],
    utilities: [
      'Giảm thiểu tối đa khiếu nại sai lệch ngày công sau khi phát lương.',
      'Xuất file Excel tổng hợp công hàng tháng chỉ với một cú nhấp chuột.',
    ],
  },
  {
    id: 'hr_leave_form',
    order: '09',
    groupId: 'HR',
    tabPath: 'HC & NS › ĐĂNG KÝ PHÉP',
    title: 'Đăng Ký Nghỉ Phép & Mẫu Đơn Song Ngữ Việt - Hàn',
    subtitle: 'Tự động điền biểu mẫu NPT-FM-007 (휴가신청서) chuẩn A4 sẵn sàng in ấn',
    accentHex: '#38bdf8',
    imageSrc: '/assets/aistudio/__ng_K__ph_p_94cb162e.png',
    functions: [
      'Hỗ trợ đầy đủ các loại nghỉ: Nghỉ phép năm, Nửa phép, Việc riêng, Nghỉ cưới, Về sớm, Nghỉ ốm và tự tính số ngày nghỉ.',
      'Khung Xem Trước Mẫu Đơn A4 song ngữ Việt - Hàn tự động điền thông tin bộ phận, chức vụ, mã NV và khung ký duyệt 4 cấp.',
      'Lưu lịch sử đồng bộ hai chiều giữa HC&NS và Hồ sơ nhân viên, cho phép xem lại & in lại đơn cũ bất cứ lúc nào.',
    ],
    utilities: [
      'Tích hợp chip chọn nhanh lý do phổ biến giúp lập đơn chỉ trong 10 giây.',
      'Thay thế hoàn toàn việc viết tay biểu mẫu giấy, lưu trữ số hóa lâu dài.',
    ],
  },
  {
    id: 'hr_annual_attendance',
    order: '10',
    groupId: 'HR',
    tabPath: 'HC & NS › BẢNG CÔNG',
    title: 'Bảng Chấm Công Tổng Hợp 12 Tháng',
    subtitle: 'Theo dõi dữ liệu công và tăng ca xuyên suốt cả năm tài chính',
    accentHex: '#10b981',
    imageSrc: '/assets/aistudio/B_ng_C_ng_bc_d2a1309f.png',
    functions: [
      'Hiển thị dữ liệu công & 6 cột tăng ca chi tiết cho từng nhân viên liên tục từ Tháng 1 đến Tháng 12.',
      'Thanh chọn nhanh từng tháng (T1–T12) hoặc nút "Cuộn tới tháng hiện tại", kèm ô lọc theo phòng ban và ca làm việc.',
      'Nút Xuất Excel trọn bộ 12 tháng phục vụ quyết toán cuối năm và thanh tra lao động.',
    ],
    utilities: [
      'Click trực tiếp vào tên nhân viên để mở nhanh hồ sơ chi tiết mà không cần chuyển tab.',
      'Tự động cộng dồn số công, tổng giờ tăng ca ngày/đêm và tổng giờ Chủ Nhật/Lễ cả năm.',
    ],
  },
  {
    id: 'hr_payroll_locked',
    order: '11',
    groupId: 'HR',
    tabPath: 'HC & NS › BẢNG LƯƠNG (BẢO MẬT)',
    title: 'Kiểm Soát Thẩm Quyền Mở Tab Bảng Lương',
    subtitle: 'Chặn truy cập tự động đối với tài khoản chưa được cấp quyền lương',
    accentHex: '#f43f5e',
    imageSrc: '/assets/aistudio/B_ng_L__ng_2befb07c.png',
    functions: [
      'Tự động kiểm tra danh sách phân quyền từ Admin trước khi hiển thị bất kỳ dữ liệu bảng lương nào.',
      'Hiển thị màn hình khóa an toàn kèm hướng dẫn liên hệ Quản trị viên để cấp thẩm quyền hợp lệ.',
    ],
    utilities: [
      'Bảo vệ dữ liệu nhạy cảm ngay cả khi sử dụng chung máy tính văn phòng hoặc phân quyền nhiều trưởng ca.',
    ],
  },
  {
    id: 'hr_payroll_pin',
    order: '12',
    groupId: 'HR',
    tabPath: 'HC & NS › BẢNG LƯƠNG (MÃ PIN)',
    title: 'Xác Thực Mã PIN Bảo Mật Lớp 2',
    subtitle: 'Lớp khóa bảo vệ thứ hai dành cho người có thẩm quyền xem lương',
    accentHex: '#f59e0b',
    imageSrc: '/assets/aistudio/B_ng_L__ng_hr_79869bbd.png',
    functions: [
      'Yêu cầu nhập mã PIN bảo mật riêng mỗi khi mở phân hệ Bảng Lương hoặc Phiếu Lương.',
      'Tích hợp nút khóa ngay tức thì khi người dùng rời khỏi vị trí làm việc.',
    ],
    utilities: [
      'Phòng ngừa tuyệt đối rủi ro lộ bảng lương khi người phụ trách quên đăng xuất khỏi trình duyệt.',
    ],
  },
  {
    id: 'hr_payroll_unlocked',
    order: '13',
    groupId: 'HR',
    tabPath: 'HC & NS › BẢNG LƯƠNG (12 THÁNG)',
    title: 'Bảng Lương Nhân Viên Tổng Hợp 12 Tháng',
    subtitle: 'Tra cứu thu nhập thực lĩnh theo từng tháng và mở nhanh phiếu lương',
    accentHex: '#10b981',
    imageSrc: '/assets/aistudio/B_ng_L__ng_M__b7b418c7.png',
    functions: [
      'Tổng hợp thực lĩnh 12 tháng (T1–T12) kèm số ngày công thực tế của toàn bộ nhân viên.',
      'Chế độ "Che số liệu" bằng ký tự ẩn trên màn hình và nút "Khóa Ngay" để khóa lại lớp PIN.',
      'Di chuột vào từng ô tháng để hiện nút "Xem" mở nhanh phiếu lương chi tiết và hỗ trợ Xuất Excel 12 tháng.',
    ],
    utilities: [
      'Đối chiếu nhanh biến động thu nhập qua các tháng của từng nhân sự trên một màn hình duy nhất.',
    ],
  },
  {
    id: 'hr_salary_config',
    order: '14',
    groupId: 'HR',
    tabPath: 'HC & NS › PHIẾU LƯƠNG',
    title: 'Cấu Hình Lương, Phụ Cấp & Công Thức OVT',
    subtitle: 'Tùy biến linh hoạt mọi khoản phụ cấp, ăn ca tăng ca và thuế TNCN',
    accentHex: '#06b6d4',
    imageSrc: '/assets/aistudio/Phi_u_L__ng_356c06ce.png',
    functions: [
      'Thiết lập chi tiết: Lương cơ bản, Phụ cấp nhà ở, đời sống, ngôn ngữ, thâm niên, chuyên cần, thu hút, phòng sạch, con nhỏ, điện thoại.',
      'Tự động tính Phụ cấp tiền ăn tăng ca theo số buổi làm trên 6h/ngày (ca ngày > 18:00, ca đêm > 06:00), cộng Hiếu Hỷ và tính Thuế TNCN 10% phần vượt ngưỡng.',
      'Tùy chỉnh Công thức tính OVT & BH, Nhập/Xuất cấu hình từ Excel và mở Xem Phiếu Lương từng nhân viên.',
    ],
    utilities: [
      'Tính toán chính xác tự động theo dữ liệu ngày công & giờ tăng ca từ Bảng công ma trận không cần tính tay Excel rời.',
    ],
  },

  // PHẦN III: EMPLOYEE PORTAL
  {
    id: 'emp_overview',
    order: '15',
    groupId: 'EMPLOYEE',
    tabPath: 'HỒ SƠ NV › TỔNG QUAN',
    title: 'Hồ Sơ Nhân Viên — Tab Tổng Quan & Chi Tiết Công',
    subtitle: 'Theo dõi ngày công, giờ tăng ca và đối chiếu chấm công QR / Khuôn mặt từng ngày',
    accentHex: '#38bdf8',
    imageSrc: '/assets/aistudio/NV_T_ng_Quan_bf53799e.png',
    functions: [
      'Cột trái hiển thị Thẻ Nhân Viên điện tử có QR cá nhân, nút In thẻ, Cấp thẻ đeo, Mở & Tải QR và nút CHẤM CÔNG QR.',
      '7 thẻ KPI tổng hợp: Tổng ngày công, TC ngày, TC đêm, Ngày CN, Đêm CN, Ngày Lễ, Đêm Lễ.',
      'Bảng chi tiết từng ngày hiển thị song song Giờ Vào/Ra (BC), QUÉT QR (VÀO - RA) và KHUÔN MẶT (VÀO - RA) kèm nút Giải trình.',
    ],
    utilities: [
      'Nhân viên chủ động kiểm soát minh bạch từng giờ làm và từng giờ tăng ca hàng ngày của bản thân.',
      'Nhấn trực tiếp vào ô QR hoặc Khuôn mặt trên bảng chi tiết để chuyển nhanh sang màn hình đối soát ngày bất thường.',
    ],
  },
  {
    id: 'emp_confirm',
    order: '16',
    groupId: 'EMPLOYEE',
    tabPath: 'HỒ SƠ NV › XÁC NHẬN CÔNG',
    title: 'Xác Nhận Công & Đối Soát Ngày Bất Thường',
    subtitle: 'Tự kiểm tra ngày thiếu giờ vào/ra và gửi đơn giải trình mẫu NPT-FM-008',
    accentHex: '#f59e0b',
    imageSrc: '/assets/aistudio/NV_X_c_Nh_n_c_ng_8ab9c701.png',
    functions: [
      'Lọc riêng những ngày phát sinh thiếu giờ hoặc sai lệch giữa Bảng chấm công (BC) và 3 nguồn (Quẹt thẻ | QR | Khuôn mặt).',
      'Nút "Xác Nhận Đủ Công Tháng" gửi trạng thái xác nhận trực tiếp về phân hệ tổng hợp của HC&NS.',
      'Cho phép lập trực tiếp Đơn Giải Trình Chấm Công Bất Thường (Mẫu NPT-FM-008) và lưu lịch sử in ấn.',
    ],
    utilities: [
      'Phát hiện sớm các ngày quên chấm công trước khi chốt bảng công cuối tháng.',
      'Loại bỏ quy trình rà soát thủ công giữa quản lý xưởng và công nhân.',
    ],
  },
  {
    id: 'emp_salary',
    order: '17',
    groupId: 'EMPLOYEE',
    tabPath: 'HỒ SƠ NV › LƯƠNG & PHIẾU',
    title: 'Tra Cứu Phiếu Lương & Cấu Hình Thu Nhập Cá Nhân',
    subtitle: 'Bảo mật riêng tư tuyệt đối theo từng tài khoản nhân viên',
    accentHex: '#10b981',
    imageSrc: '/assets/aistudio/NV_L__ng_5f37a375.png',
    functions: [
      'Hiển thị rõ Ngày công, Tổng thu nhập (I), Khấu trừ (II+III+IV) và Thực lĩnh (V) đồng bộ với bảng công tháng.',
      'Liệt kê đầy đủ bảng cấu hình mức lương cơ bản, các khoản phụ cấp, trợ cấp, công đoàn phí và thuế TNCN.',
      'Nút "Xem Phiếu Lương" mở phiếu lương chi tiết đầy đủ từng khoản cộng/trừ và lưu lịch sử phiếu lương đã phát hành.',
    ],
    utilities: [
      'Mỗi nhân viên đăng nhập bằng mã NV hoặc QR cá nhân chỉ xem được duy nhất thu nhập của chính mình.',
    ],
  },
  {
    id: 'emp_mobile',
    order: '18',
    groupId: 'EMPLOYEE',
    tabPath: 'MOBILE APP › NHÂN VIÊN',
    title: 'Giao Diện Di Động Tối Ưu Cho Công Nhân Viên',
    subtitle: 'Trải nghiệm mượt mà như ứng dụng di động thực thụ trên mọi smartphone',
    accentHex: '#22d3ee',
    imageSrc: '/assets/aistudio/App_NV_3a26e3b2.jpg',
    isPortrait: true,
    functions: [
      'Hiển thị trọn vẹn Thẻ Nhân Viên điện tử cỡ lớn kèm ảnh 3x4, mã QR, nút CHẤM CÔNG QR và SỬA THÔNG TIN ngay màn hình chính.',
      'Thanh điều hướng cố định dưới đáy màn hình giúp chuyển 1 chạm giữa: Tổng quan, Xác nhận, ĐK Phép, Lương, Tăng ca, Hợp đồng.',
    ],
    utilities: [
      'Thao tác thuận tiện bằng một tay ngay tại cổng nhà máy hoặc khu vực sản xuất.',
      'Hỗ trợ cài đặt dạng Web App PWA lên màn hình chính điện thoại.',
    ],
  },

  // PHẦN IV: KIOSK & SECURITY
  {
    id: 'kiosk_qr',
    order: '19',
    groupId: 'KIOSK',
    tabPath: 'QRCODE › MÃ QR CHẤM CÔNG',
    title: 'Trạm Kiosk — Chế Độ Mã QR Chấm Công',
    subtitle: 'Điểm quét QR chuyên dụng cố định đặt tại sảnh nhà máy',
    accentHex: '#10b981',
    imageSrc: '/assets/aistudio/QR_Code_bef04dda.png',
    functions: [
      'Hiển thị mã QR chấm công kích thước lớn kèm đồng hồ thời gian thực và trạng thái ca làm việc hiện tại (Ca Ngày / Ca Đêm).',
      'Cho phép Tải ảnh poster QR chất lượng cao, In trực tiếp ra giấy và phóng to Toàn màn hình Kiosk.',
      'Hướng dẫn trực quan 3 bước quét mã giúp nhân viên tự chấm Giờ Vào / Giờ Ra qua điện thoại.',
    ],
    utilities: [
      'Dữ liệu quét được ghi riêng vào cột QR để đối chiếu chéo với bảng chấm công thường, không gây ghi đè sai lệch.',
    ],
  },
  {
    id: 'kiosk_face',
    order: '20',
    groupId: 'KIOSK',
    tabPath: 'QRCODE › CHẤM CÔNG KHUÔN MẶT',
    title: 'Trạm Kiosk — Chế Độ Chấm Công Khuôn Mặt',
    subtitle: 'Nhận diện khuôn mặt tự động qua camera đồng bộ dữ liệu nhân sự',
    accentHex: '#38bdf8',
    imageSrc: '/assets/aistudio/Khu_n_m_t_57a5326f.png',
    functions: [
      'Khung camera dọc chuẩn máy chấm công với khung góc bám khuôn mặt động, đồng hồ thực, ngày hệ thống và ảnh badge nhận diện.',
      'Hỗ trợ bật/tắt camera, đổi camera trước/sau, quét thử bằng ảnh tĩnh và chọn chế độ (Tự động Vào/Ra | Chỉ Giờ Vào | Chỉ Giờ Ra).',
      'Ghi nhận tự động vào cột Khuôn Mặt trong Dữ liệu công và hiển thị danh sách nhân viên đã điểm danh trong ngày.',
    ],
    utilities: [
      'Chống chấm trùng liên tiếp trong vài giây, đồng bộ tức thời danh sách khuôn mặt đã đăng ký từ tab Danh sách nhân viên.',
    ],
  },
  {
    id: 'security_gate',
    order: '21',
    groupId: 'KIOSK',
    tabPath: 'AN NINH › KIỂM SOÁT RA / VÀO',
    title: 'Phân Hệ An Ninh & Kiểm Soát Cổng Nhà Máy',
    subtitle: 'Quét QR thẻ nhân viên kiểm soát lượt ra vào bảo mật tuyệt đối',
    accentHex: '#06b6d4',
    imageSrc: '/assets/aistudio/An_Ninh_094a3b22.png',
    functions: [
      'Ghi nhận danh sách chi tiết từng lượt nhân viên VÀO / RA cổng kèm giờ chính xác và bộ lọc theo ngày, trạng thái hoặc tên.',
      'Nút "QUÉT MÃ QR NHÂN VIÊN" tích hợp bộ chọn VÀO / RA trực tiếp qua camera của nhân viên an ninh.',
      'Sau khi quét thành công, hệ thống chỉ hiển thị Thẻ Nhân Viên kèm thông tin thẻ (ảnh, tên, mã NV, bộ phận, chức vụ).',
    ],
    utilities: [
      'Thẻ nhân viên đồng bộ tự động từ hồ sơ gốc; tuyệt đối không để lộ thông tin lương hay hợp đồng tại chốt bảo vệ.',
    ],
  },
];

export const AppCatalogBrochure: React.FC<AppCatalogBrochureProps> = ({
  onClose,
  isModal = false,
  isPublicView = false,
  onBackToLogin,
}) => {
  const fullCatalogRef = useRef<HTMLDivElement | null>(null);
  const groupRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [exportingKey, setExportingKey] = useState<string | null>(null);
  const [activeGroupFilter, setActiveGroupFilter] = useState<'ALL' | 'CORE' | 'HR' | 'EMPLOYEE' | 'KIOSK'>('ALL');
  const [previewItem, setPreviewItem] = useState<CatalogTabItem | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const promoUrl = useMemo(() => {
    if (typeof window === 'undefined') return 'https://newprotec-vina.app/?catalog=1';
    return `${window.location.origin}${window.location.pathname}?catalog=1`;
  }, []);

  const shareText =
    'Khám phá Catalog tính năng Newprotec Vina Smart MES V2.0 — Quản trị Sản xuất, HC&NS, Chấm công QR/Khuôn mặt, Bảng lương bảo mật & Cổng nhân viên Mobile.';

  const handleCopyPromoLink = async () => {
    try {
      await navigator.clipboard.writeText(promoUrl);
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // Fallback copy via temporary input
      const input = document.createElement('input');
      input.value = promoUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const visibleGroups = useMemo(() => {
    if (activeGroupFilter === 'ALL') return CATALOG_GROUPS;
    return CATALOG_GROUPS.filter((g) => g.id === activeGroupFilter);
  }, [activeGroupFilter]);

  const waitForImagesReady = async (root: HTMLElement) => {
    const imgs = Array.from(root.querySelectorAll('img'));
    await Promise.all(
      imgs.map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete && img.naturalWidth > 0) {
              resolve();
              return;
            }
            const done = () => resolve();
            img.addEventListener('load', done, { once: true });
            img.addEventListener('error', done, { once: true });
            window.setTimeout(done, 4000);
          })
      )
    );
  };

  const sanitizeClonedStylesForHtml2Canvas = (clonedDoc: Document) => {
    // Prevent html2canvas from crashing when encountering Tailwind v4 oklab()/oklch() functions in page stylesheets
    const styleEls = Array.from(clonedDoc.querySelectorAll('style'));
    styleEls.forEach((styleEl) => {
      try {
        const txt = styleEl.textContent || '';
        if (txt.includes('oklab(') || txt.includes('oklch(')) {
          styleEl.textContent = txt
            .replace(/oklch\([^)]*\)/gi, 'rgba(148, 163, 184, 0.25)')
            .replace(/oklab\([^)]*\)/gi, 'rgba(148, 163, 184, 0.25)');
        }
      } catch {
        // ignore read-only sheets
      }
    });
  };

  const exportElementToPng = async (el: HTMLElement | null, key: string, filename: string) => {
    if (!el || exportingKey) return;
    setExportingKey(key);
    setExportError(null);
    try {
      await waitForImagesReady(el);
      const rect = el.getBoundingClientRect();
      // Keep canvas well under mobile/desktop GPU height limit (16,384px)
      const safeScale = rect.height > 8500 ? 1 : rect.height > 4800 ? 1.35 : 1.75;
      const canvas = await html2canvas(el, {
        scale: safeScale,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#020617',
        logging: false,
        onclone: sanitizeClonedStylesForHtml2Canvas,
      });
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('Catalog PNG Export Error:', err);
      setExportError(
        'Không thể tạo ảnh PNG toàn trang quá dài trên thiết bị này. Vui lòng chọn tải theo từng Chương (Chương 1 → 4) hoặc bấm "In / Lưu PDF".'
      );
    } finally {
      setExportingKey(null);
    }
  };

  const chapterFilenameMap: Record<'CORE' | 'HR' | 'EMPLOYEE' | 'KIOSK', string> = {
    CORE: 'Catalog-Newprotec-Chuong-1-He-Thong-Cot-Loi.png',
    HR: 'Catalog-Newprotec-Chuong-2-Hanh-Chinh-Nhan-Su.png',
    EMPLOYEE: 'Catalog-Newprotec-Chuong-3-Cong-Nhan-Vien-Mobile.png',
    KIOSK: 'Catalog-Newprotec-Chuong-4-Tram-Kiosk-An-Ninh.png',
  };

  const handleExportChapter = async (groupId: 'CORE' | 'HR' | 'EMPLOYEE' | 'KIOSK') => {
    if (exportingKey) return;
    if (activeGroupFilter !== 'ALL' && activeGroupFilter !== groupId) {
      setActiveGroupFilter('ALL');
      await new Promise((r) => window.setTimeout(r, 150));
    }
    const targetEl = groupRefs.current[groupId];
    await exportElementToPng(targetEl, `CH_${groupId}`, chapterFilenameMap[groupId]);
  };

  const handleExportAllChaptersSequentially = async () => {
    if (exportingKey) return;
    if (activeGroupFilter !== 'ALL') {
      setActiveGroupFilter('ALL');
      await new Promise((r) => window.setTimeout(r, 150));
    }
    setExportError(null);
    setExportingKey('ALL_CHAPTERS');
    try {
      for (const grp of CATALOG_GROUPS) {
        const el = groupRefs.current[grp.id];
        if (!el) continue;
        await waitForImagesReady(el);
        const rect = el.getBoundingClientRect();
        const safeScale = rect.height > 8500 ? 1 : rect.height > 4800 ? 1.35 : 1.75;
        const canvas = await html2canvas(el, {
          scale: safeScale,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#020617',
          logging: false,
          onclone: sanitizeClonedStylesForHtml2Canvas,
        });
        const dataUrl = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = chapterFilenameMap[grp.id];
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        await new Promise((r) => window.setTimeout(r, 300));
      }
    } catch (err) {
      console.error('Sequential Chapter PNG Export Error:', err);
      setExportError('Có lỗi xảy ra khi tải tự động từng chương. Vui lòng thử bấm tải lẻ từng Chương.');
    } finally {
      setExportingKey(null);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const renderTabCard = (item: CatalogTabItem) => {
    return (
      <div
        key={item.id}
        style={{
          backgroundColor: '#0a1222',
          border: '1px solid #1e293b',
          borderTop: `3px solid ${item.accentHex}`,
          borderRadius: '14px',
          padding: '18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          boxShadow: '0 10px 24px rgba(0, 0, 0, 0.35)',
        }}
      >
        {/* Card Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: '10px',
                  fontFamily: 'monospace',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(15, 23, 42, 0.95)',
                  border: `1px solid ${item.accentHex}`,
                  color: item.accentHex,
                  letterSpacing: '0.04em',
                }}
              >
                TAB {item.order} · {item.tabPath}
              </span>
            </div>
            <h4
              style={{
                margin: '4px 0 0 0',
                fontSize: '15px',
                fontWeight: 800,
                color: '#ffffff',
                lineHeight: 1.3,
              }}
            >
              {item.title}
            </h4>
            <p
              style={{
                margin: 0,
                fontSize: '11.5px',
                color: '#94a3b8',
                lineHeight: 1.4,
              }}
            >
              {item.subtitle}
            </p>
          </div>
        </div>

        {/* Real Proof Screenshot Container */}
        <div
          onClick={() => setPreviewItem(item)}
          title="Nhấn để phóng to ảnh chứng minh thực tế"
          style={{
            position: 'relative',
            backgroundColor: '#020617',
            border: '1px solid #1e293b',
            borderRadius: '10px',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: item.isPortrait ? '10px' : '0px',
            height: '250px',
            cursor: 'pointer',
          }}
        >
          <img
            src={item.imageSrc}
            alt={item.title}
            style={{
              width: item.isPortrait ? 'auto' : '100%',
              height: '100%',
              maxWidth: '100%',
              objectFit: item.isPortrait ? 'contain' : 'cover',
              objectPosition: 'top center',
              display: 'block',
            }}
          />
          <div
            style={{
              position: 'absolute',
              right: '8px',
              bottom: '8px',
              backgroundColor: 'rgba(2, 6, 23, 0.84)',
              border: '1px solid rgba(34, 211, 238, 0.45)',
              color: '#e2e8f0',
              fontSize: '10px',
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: '6px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <ZoomIn style={{ width: '11px', height: '11px', color: '#22d3ee' }} />
            <span>Ảnh thực tế</span>
          </div>
        </div>

        {/* Functions & Utilities Details */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: '10px',
          }}
        >
          {/* Functions Box */}
          <div
            style={{
              backgroundColor: '#060d1b',
              border: '1px solid #1e293b',
              borderRadius: '10px',
              padding: '10px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div
              style={{
                fontSize: '10px',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: item.accentHex,
              }}
            >
              Chức năng chính của Tab
            </div>
            {item.functions.map((fn, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '7px',
                  fontSize: '11.5px',
                  color: '#cbd5e1',
                  lineHeight: 1.45,
                }}
              >
                <CheckCircle2
                  style={{
                    width: '13px',
                    height: '13px',
                    color: '#34d399',
                    flexShrink: 0,
                    marginTop: '3px',
                  }}
                />
                <span>{fn}</span>
              </div>
            ))}
          </div>

          {/* Utilities Box */}
          <div
            style={{
              backgroundColor: 'rgba(8, 47, 73, 0.25)',
              border: '1px solid rgba(14, 116, 144, 0.4)',
              borderRadius: '10px',
              padding: '10px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div
              style={{
                fontSize: '10px',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: '#fbbf24',
              }}
            >
              Tiện ích &amp; Hiệu quả vận hành
            </div>
            {item.utilities.map((ut, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '7px',
                  fontSize: '11.5px',
                  color: '#e2e8f0',
                  lineHeight: 1.45,
                }}
              >
                <Sparkles
                  style={{
                    width: '13px',
                    height: '13px',
                    color: '#fbbf24',
                    flexShrink: 0,
                    marginTop: '3px',
                  }}
                />
                <span>{ut}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const catalogContent = (
    <div
      ref={fullCatalogRef}
      style={{
        backgroundColor: '#020617',
        color: '#f8fafc',
        borderRadius: '18px',
        border: '1px solid rgba(6, 182, 212, 0.35)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75)',
        overflow: 'hidden',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        padding: '32px',
        maxWidth: '1220px',
        minWidth: '880px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '28px',
      }}
    >
      {/* 1. Cover Header */}
      <div
        style={{
          position: 'relative',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, #040b18 0%, #0a1f3d 55%, #040b18 100%)',
          border: '1.5px solid rgba(34, 211, 238, 0.45)',
          padding: '28px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '24px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '5px 14px',
              borderRadius: '999px',
              backgroundColor: 'rgba(6, 182, 212, 0.16)',
              border: '1px solid rgba(34, 211, 238, 0.35)',
              color: '#67e8f9',
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.07em',
              textTransform: 'uppercase',
              width: 'fit-content',
            }}
          >
            <Factory style={{ width: '14px', height: '14px', color: '#22d3ee' }} />
            <span>CATALOG TÍNH NĂNG TOÀN DIỆN THEO TỪNG TAB · NEWPROTEC VINA</span>
          </div>

          <h1
            style={{
              fontSize: '28px',
              fontWeight: 900,
              color: '#ffffff',
              letterSpacing: '-0.02em',
              textTransform: 'uppercase',
              margin: 0,
            }}
          >
            NEWPROTEC VINA <span style={{ color: '#22d3ee' }}>SMART MES V2.0</span>
          </h1>

          <p
            style={{
              fontSize: '13px',
              color: '#cbd5e1',
              maxWidth: '720px',
              lineHeight: 1.55,
              margin: 0,
            }}
          >
            Tài liệu giới thiệu chi tiết 21 phân hệ &amp; tab chức năng thực tế của hệ thống Quản trị Sản xuất, Nhân sự (HC&amp;NS),
            Chấm công đa phương thức (Bảng công ma trận · Máy quẹt thẻ · QR Code · Khuôn mặt), Tiền lương bảo mật đa lớp,
            Cổng nhân viên Mobile PWA và Kiểm soát An Ninh cổng nhà máy — kèm đầy đủ hình ảnh vận hành thực tế.
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px 22px',
            borderRadius: '14px',
            backgroundColor: '#0b1426',
            border: '1px solid rgba(34, 211, 238, 0.4)',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              fontSize: '24px',
              fontWeight: 900,
              color: '#22d3ee',
              fontFamily: 'monospace',
              lineHeight: 1,
            }}
          >
            21 TAB
          </div>
          <div
            style={{
              fontSize: '10px',
              fontWeight: 800,
              color: '#e2e8f0',
              textTransform: 'uppercase',
              marginTop: '6px',
            }}
          >
            ẢNH THỰC TẾ 100%
          </div>
          <div
            style={{
              fontSize: '9px',
              fontFamily: 'monospace',
              color: '#94a3b8',
              marginTop: '3px',
            }}
          >
            DESKTOP &amp; MOBILE
          </div>
        </div>
      </div>

      {/* 2. Quick System Highlights Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
        {[
          {
            icon: <Users style={{ width: '16px', height: '16px', color: '#34d399' }} />,
            label: 'NHÂN SỰ & THẺ ĐEO',
            value: 'Thẻ QR + CR80',
            sub: 'Ảnh 3x4, Cấp thẻ, Khóa NV',
            color: '#34d399',
          },
          {
            icon: <QrCode style={{ width: '16px', height: '16px', color: '#22d3ee' }} />,
            label: 'ĐỐI SOÁT 3 NGUỒN',
            value: 'MQT · QR · Mặt',
            sub: 'Song song cạnh cột QR',
            color: '#22d3ee',
          },
          {
            icon: <ScanFace style={{ width: '16px', height: '16px', color: '#38bdf8' }} />,
            label: 'TRẠM KIOSK KÉP',
            value: 'QR & Khuôn Mặt',
            sub: 'Camera trực tiếp 24/7',
            color: '#38bdf8',
          },
          {
            icon: <Wallet style={{ width: '16px', height: '16px', color: '#fbbf24' }} />,
            label: 'LƯƠNG & PIN LỚP 2',
            value: 'Bảo Mật Kép',
            sub: 'Phân quyền + Che số liệu',
            color: '#fbbf24',
          },
          {
            icon: <Shield style={{ width: '16px', height: '16px', color: '#a78bfa' }} />,
            label: 'CỔNG AN NINH',
            value: 'Soát Vào / Ra',
            sub: 'Chỉ hiện Thẻ NV bảo mật',
            color: '#a78bfa',
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            style={{
              padding: '12px 14px',
              borderRadius: '12px',
              backgroundColor: '#0b1324',
              border: '1px solid #1e293b',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {kpi.icon}
              <span
                style={{
                  fontSize: '9.5px',
                  fontWeight: 800,
                  color: kpi.color,
                  letterSpacing: '0.04em',
                }}
              >
                {kpi.label}
              </span>
            </div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#ffffff' }}>{kpi.value}</div>
            <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* 3. Groups & Detailed Tab Cards with Actual Proof Screenshots */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
        {visibleGroups.map((group) => {
          const groupItems = CATALOG_ITEMS.filter((item) => item.groupId === group.id);
          return (
            <div
              key={group.id}
              ref={(el) => {
                groupRefs.current[group.id] = el;
              }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                backgroundColor: '#040a16',
                border: '1px solid #1e293b',
                borderRadius: '16px',
                padding: '20px',
              }}
            >
              {/* Section Banner with Branded Chapter Stamp for Standalone Chapter PNG Exports */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  borderBottom: '1px solid #1e293b',
                  paddingBottom: '12px',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 900,
                        fontFamily: 'monospace',
                        padding: '2px 9px',
                        borderRadius: '999px',
                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                        border: `1px solid ${group.accentHex}`,
                        color: group.accentHex,
                      }}
                    >
                      {group.code} · {groupItems.length} TAB
                    </span>
                    <span
                      style={{
                        fontSize: '10px',
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        color: '#64748b',
                      }}
                    >
                      NEWPROTEC VINA SMART MES V2.0
                    </span>
                  </div>
                  <h2
                    style={{
                      margin: '4px 0 0 0',
                      fontSize: '17px',
                      fontWeight: 900,
                      color: '#ffffff',
                      textTransform: 'uppercase',
                    }}
                  >
                    {group.title}
                  </h2>
                  <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>
                    {group.description}
                  </p>
                </div>
              </div>

              {/* 2-column grid of Tab Cards */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: '18px',
                }}
              >
                {groupItems.map((item) => renderTabCard(item))}
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Security & Footer Strip */}
      <div
        style={{
          borderTop: '1px solid #1e293b',
          paddingTop: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          fontSize: '11px',
          color: '#94a3b8',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Lock style={{ width: '14px', height: '14px', color: '#34d399' }} />
          <span>
            <strong style={{ color: '#ffffff' }}>NEWPROTEC VINA INDUSTRIAL SYSTEM V2.0</strong> · Dữ liệu đồng bộ Cloud thời gian thực · Không hiển thị thông tin mật khẩu trên tài liệu quảng bá.
          </span>
        </div>
        <div style={{ fontFamily: 'monospace', color: '#22d3ee', fontWeight: 700 }}>
          WEB APP PWA · DESKTOP &amp; MOBILE READY
        </div>
      </div>
    </div>
  );

  const encodedUrl = encodeURIComponent(promoUrl);
  const encodedText = encodeURIComponent(shareText);

  const toolbarControls = (
    <div className="space-y-3 bg-slate-900/95 border border-slate-800 p-4 rounded-2xl shadow-lg">
      {/* Row 1: Filter Chapters + Full/Print Export */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveGroupFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeGroupFilter === 'ALL'
                ? 'bg-cyan-600 text-white shadow'
                : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Tất Cả ({CATALOG_ITEMS.length} Tab)</span>
          </button>

          {CATALOG_GROUPS.map((g, idx) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setActiveGroupFilter(g.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeGroupFilter === g.id
                  ? 'bg-slate-800 border border-cyan-500/60 text-cyan-300 shadow'
                  : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Chương {idx + 1} ({g.code})
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() =>
              exportElementToPng(
                activeGroupFilter === 'ALL'
                  ? fullCatalogRef.current
                  : groupRefs.current[activeGroupFilter] || fullCatalogRef.current,
                'MAIN',
                activeGroupFilter === 'ALL'
                  ? 'Catalog-Newprotec-Vina-21-Tabs.png'
                  : chapterFilenameMap[activeGroupFilter]
              )
            }
            disabled={Boolean(exportingKey)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 shadow-lg shadow-cyan-950/40"
          >
            {exportingKey === 'MAIN' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang tạo PNG...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>
                  {activeGroupFilter === 'ALL'
                    ? 'Tải PNG Toàn Bộ (21 Tab)'
                    : `Tải PNG ${activeGroupFilter}`}
                </span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4 text-cyan-400" />
            <span>In Catalog</span>
          </button>

          {isModal && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              title="Đóng"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Row 2: Direct Chapter-by-Chapter PNG Download Buttons */}
      <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-300">
          <Layers className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>Tải File PNG Chia Theo Từng Chương:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {CATALOG_GROUPS.map((g, idx) => {
            const count = CATALOG_ITEMS.filter((item) => item.groupId === g.id).length;
            const key = `CH_${g.id}`;
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => handleExportChapter(g.id)}
                disabled={Boolean(exportingKey)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-700/80 hover:border-cyan-500/50 text-slate-200 text-[11px] font-semibold transition-colors cursor-pointer disabled:opacity-50"
                title={`Tải PNG riêng ${g.code}: ${g.title}`}
              >
                {exportingKey === key ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                ) : (
                  <Download className="w-3.5 h-3.5 text-cyan-400" />
                )}
                <span>
                  Chương {idx + 1} ({count} Tab)
                </span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={handleExportAllChaptersSequentially}
            disabled={Boolean(exportingKey)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/35 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold transition-colors cursor-pointer disabled:opacity-50"
          >
            {exportingKey === 'ALL_CHAPTERS' ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Đang tải 4 chương...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Tải Cả 4 Chương (4 PNG)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Row 3: Promotional Link & Social Media Sharing Bar */}
      <div className="pt-3 border-t border-slate-800/80 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Public Promo URL + Copy */}
        <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-cyan-300 shrink-0">
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <span>Link Quảng Bá Công Khai:</span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 min-w-0 flex-1 max-w-md">
            <input
              type="text"
              readOnly
              value={promoUrl}
              onClick={(e) => (e.target as HTMLInputElement).select()}
              className="bg-transparent text-[11px] font-mono text-cyan-300 w-full outline-none truncate"
              aria-label="Đường link quảng bá ứng dụng không cần đăng nhập"
            />
            <button
              type="button"
              onClick={handleCopyPromoLink}
              className={`shrink-0 flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                copiedLink
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              }`}
            >
              {copiedLink ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              <span>{copiedLink ? 'Đã chép' : 'Sao chép'}</span>
            </button>
          </div>
          {!isPublicView && (
            <a
              href={promoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[11px] font-semibold transition-colors"
              title="Mở thử đường link xem công khai không cần đăng nhập"
            >
              <ExternalLink className="w-3 h-3 text-cyan-400" />
              <span>Xem thử link công khai</span>
            </a>
          )}
        </div>

        {/* Social Media Share Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1">
            <Share2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Chia sẻ:</span>
          </span>

          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#1877F2]/20 hover:bg-[#1877F2]/35 border border-[#1877F2]/50 text-blue-300 text-[11px] font-bold transition-colors"
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z" />
            </svg>
            <span>Facebook</span>
          </a>

          <a
            href={`https://zalo.me/share?url=${encodedUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              handleCopyPromoLink();
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/35 border border-sky-400/50 text-sky-300 text-[11px] font-bold transition-colors"
          >
            <span className="font-black text-[10px] px-1 rounded bg-sky-500 text-white leading-tight">Z</span>
            <span>Zalo</span>
          </a>

          <a
            href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0A66C2]/20 hover:bg-[#0A66C2]/35 border border-[#0A66C2]/50 text-sky-200 text-[11px] font-bold transition-colors"
          >
            <span className="font-black text-[10px] px-1 rounded bg-[#0A66C2] text-white leading-tight">in</span>
            <span>LinkedIn</span>
          </a>

          <a
            href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-100 text-[11px] font-bold transition-colors"
          >
            <span className="font-black text-[11px]">𝕏</span>
            <span>X / Twitter</span>
          </a>

          <a
            href={`https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-400/50 text-cyan-200 text-[11px] font-bold transition-colors"
          >
            <span>Telegram</span>
          </a>
        </div>
      </div>
    </div>
  );

  const previewModal = previewItem ? (
    <div
      className="fixed inset-0 z-[150] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={() => setPreviewItem(null)}
    >
      <div
        className="w-full max-w-6xl bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-mono font-bold text-cyan-400">
              TAB {previewItem.order} · {previewItem.tabPath}
            </div>
            <div className="text-sm font-bold text-white">{previewItem.title}</div>
          </div>
          <button
            type="button"
            onClick={() => setPreviewItem(null)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="bg-slate-950 p-3 flex items-center justify-center max-h-[82vh] overflow-auto">
          <img
            src={previewItem.imageSrc}
            alt={previewItem.title}
            className="max-w-full max-h-[76vh] object-contain rounded-lg border border-slate-800"
          />
        </div>
      </div>
    </div>
  ) : null;

  if (isModal) {
    return (
      <div
        className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6"
        onClick={(e) => {
          if (e.target === e.currentTarget && onClose) onClose();
        }}
      >
        <div className="relative w-full max-w-7xl max-h-[92dvh] overflow-y-auto custom-scrollbar space-y-4">
          <div className="sticky top-0 z-20">{toolbarControls}</div>
          {exportError && (
            <div className="px-4 py-2.5 rounded-xl bg-rose-950/70 border border-rose-500/40 text-rose-200 text-xs">
              {exportError}
            </div>
          )}
          <div className="overflow-x-auto pb-4">{catalogContent}</div>
        </div>
        {previewModal}
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-[1320px] mx-auto space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white uppercase tracking-wide flex flex-wrap items-center gap-2">
              <span>Catalog Ứng Dụng Theo Từng Tab ({CATALOG_ITEMS.length} Tab)</span>
              {isPublicView && (
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold">
                  CHẾ ĐỘ XEM CÔNG KHAI
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-400">
              Trình bày chi tiết chức năng, tiện ích từng tab kèm 21 ảnh chụp màn hình vận hành thực tế — hỗ trợ chia sẻ &amp; tải PNG theo từng chương.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-cyan-400" />
            <span>Desktop &amp; Mobile App</span>
            <span className="text-slate-700">|</span>
            <Clock className="w-4 h-4 text-emerald-400" />
            <span>Newprotec Vina V2.0</span>
          </div>
          {isPublicView && onBackToLogin && (
            <button
              type="button"
              onClick={onBackToLogin}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-sans text-xs font-bold transition-colors cursor-pointer shadow"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Đăng Nhập Hệ Thống</span>
            </button>
          )}
        </div>
      </div>

      {toolbarControls}

      {exportError && (
        <div className="px-4 py-2.5 rounded-xl bg-rose-950/70 border border-rose-500/40 text-rose-200 text-xs">
          {exportError}
        </div>
      )}

      <div className="overflow-x-auto pb-4">{catalogContent}</div>
      {previewModal}
    </div>
  );
};
