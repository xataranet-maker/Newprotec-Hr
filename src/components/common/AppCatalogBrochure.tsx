import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import {
  Users,
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
} from 'lucide-react';

interface AppCatalogBrochureProps {
  onClose?: () => void;
  isModal?: boolean;
}

export const AppCatalogBrochure: React.FC<AppCatalogBrochureProps> = ({
  onClose,
  isModal = false,
}) => {
  const catalogRef = useRef<HTMLDivElement | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleDownloadPng = async () => {
    if (!catalogRef.current || isExporting) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(catalogRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#020617',
        logging: false,
      });
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `Catalog-Newprotec-Vina-Smart-MES-V2.0.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('Catalog PNG Export Error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const catalogContent = (
    <div
      ref={catalogRef}
      style={{
        backgroundColor: '#020617',
        color: '#f8fafc',
        borderRadius: '16px',
        border: '1px solid rgba(6, 182, 212, 0.35)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
        overflow: 'hidden',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        padding: '36px',
        maxWidth: '960px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '28px',
        minWidth: '780px',
        userSelect: 'none',
      }}
    >
      {/* 1. Header / Cover Banner */}
      <div
        style={{
          position: 'relative',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, #020617 0%, #091a33 50%, #020617 100%)',
          border: '1.5px solid rgba(6, 182, 212, 0.45)',
          padding: '32px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '24px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', zIndex: 1, flex: 1 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: '999px',
              backgroundColor: 'rgba(6, 182, 212, 0.15)',
              border: '1px solid rgba(6, 182, 212, 0.3)',
              color: '#67e8f9',
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              width: 'fit-content',
            }}
          >
            <Sparkles style={{ width: '14px', height: '14px', color: '#22d3ee' }} />
            <span>HỆ THỐNG QUẢN TRỊ SẢN XUẤT &amp; NHÂN SỰ TOÀN DIỆN</span>
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
              maxWidth: '560px',
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            Catalog giới thiệu cấu hình chức năng, tiện ích thông minh, thẻ nhân viên điện tử, chấm công QR code, ma trận thời gian và kiểm soát an ninh cổng nhà máy.
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '18px 24px',
            borderRadius: '12px',
            backgroundColor: '#0f172a',
            border: '1px solid rgba(6, 182, 212, 0.4)',
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.6)',
            zIndex: 1,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '10px',
              backgroundColor: 'rgba(8, 145, 178, 0.25)',
              border: '1px solid rgba(6, 182, 212, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#22d3ee',
              fontWeight: 900,
              fontSize: '18px',
            }}
          >
            NP
          </div>
          <span
            style={{
              fontSize: '10px',
              fontFamily: 'monospace',
              color: '#22d3ee',
              fontWeight: 800,
              textTransform: 'uppercase',
              marginTop: '6px',
            }}
          >
            NEWPROTEC VINA
          </span>
          <span
            style={{
              fontSize: '8.5px',
              fontFamily: 'monospace',
              color: '#94a3b8',
              letterSpacing: '0.1em',
            }}
          >
            INDUSTRIAL V2.0
          </span>
        </div>
      </div>

      {/* 2. Key Metrics & Core Highlights */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: '#0f172a', border: '1px solid #1e293b' }}>
          <div style={{ fontSize: '10px', fontFamily: 'monospace', fontWeight: 800, color: '#22d3ee', textTransform: 'uppercase', marginBottom: '4px' }}>
            SẢN XUẤT &amp; KẾ HOẠCH
          </div>
          <div style={{ fontSize: '14px', fontWeight: 800, color: '#ffffff', marginBottom: '4px' }}>Điều Độ Tự Động</div>
          <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>Quản lý định mức Net Data, lịch trình &amp; lệnh sản xuất</p>
        </div>

        <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: '#0f172a', border: '1px solid #1e293b' }}>
          <div style={{ fontSize: '10px', fontFamily: 'monospace', fontWeight: 800, color: '#34d399', textTransform: 'uppercase', marginBottom: '4px' }}>
            CHẤM CÔNG QR &amp; MQT
          </div>
          <div style={{ fontSize: '14px', fontWeight: 800, color: '#ffffff', marginBottom: '4px' }}>Quét Trực Tiếp</div>
          <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>Ca ngày (8-17h, 8-20h), Ca đêm +3h, đối chiếu dữ liệu</p>
        </div>

        <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: '#0f172a', border: '1px solid #1e293b' }}>
          <div style={{ fontSize: '10px', fontFamily: 'monospace', fontWeight: 800, color: '#c084fc', textTransform: 'uppercase', marginBottom: '4px' }}>
            THẺ NHÂN VIÊN
          </div>
          <div style={{ fontSize: '14px', fontWeight: 800, color: '#ffffff', marginBottom: '4px' }}>In Thẻ &amp; Đeo Thẻ</div>
          <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>Ảnh 3x4, QR cá nhân, xác nhận cấp thẻ đeo &amp; in ấn</p>
        </div>

        <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: '#0f172a', border: '1px solid #1e293b' }}>
          <div style={{ fontSize: '10px', fontFamily: 'monospace', fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', marginBottom: '4px' }}>
            AN NINH CỔNG
          </div>
          <div style={{ fontSize: '14px', fontWeight: 800, color: '#ffffff', marginBottom: '4px' }}>Kiểm Soát VÀO/RA</div>
          <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>Tab AN NINH quét QR hiển thị thẻ nhân viên bảo mật</p>
        </div>
      </div>

      {/* 3. Detailed Functional Modules & Configurations */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ borderBottom: '1px solid #1e293b', paddingBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff', textTransform: 'uppercase', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Factory style={{ width: '20px', height: '20px', color: '#22d3ee' }} />
            <span>Chi Tiết Các Phân Hệ &amp; Cấu Hình Chức Năng</span>
          </h2>
          <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#22d3ee' }}>Mã nguồn mở &amp; Bảo mật cao</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
          {/* Module A */}
          <div style={{ padding: '20px', borderRadius: '16px', backgroundColor: '#0f172a', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa' }}>
                <Users style={{ width: '20px', height: '20px' }} />
              </div>
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#ffffff', margin: 0 }}>1. Quản Lý Nhân Sự &amp; Hồ Sơ (HC &amp; NS)</h3>
                <p style={{ fontSize: '11px', fontFamily: 'monospace', color: '#38bdf8', margin: '2px 0 0 0' }}>Nhân viên Multi Auto &amp; HC &amp; NS</p>
              </div>
            </div>
            <ul style={{ margin: 0, paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', color: '#cbd5e1' }}>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <CheckCircle2 style={{ width: '15px', height: '15px', color: '#34d399', flexShrink: 0, marginTop: '2px' }} />
                <span>Thẻ Nhân Viên đóng khung riêng: Ảnh đại diện 3x4 có thể cập nhật, mã QR cá nhân, thông tin chức vụ, bộ phận.</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <CheckCircle2 style={{ width: '15px', height: '15px', color: '#34d399', flexShrink: 0, marginTop: '2px' }} />
                <span>Hỗ trợ nút **In thẻ** (khuôn chuẩn CR80) và quản lý trạng thái **Cấp thẻ đeo** cho từng nhân viên.</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <CheckCircle2 style={{ width: '15px', height: '15px', color: '#34d399', flexShrink: 0, marginTop: '2px' }} />
                <span>Quản lý hợp đồng lao động, bảo hiểm, nhật ký điểm danh và các quyết định thuyên chuyển.</span>
              </li>
            </ul>
          </div>

          {/* Module B */}
          <div style={{ padding: '20px', borderRadius: '16px', backgroundColor: '#0f172a', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34d399' }}>
                <Clock style={{ width: '20px', height: '20px' }} />
              </div>
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#ffffff', margin: 0 }}>2. Chấm Công Mã QR &amp; Đối Chiếu Dữ Liệu</h3>
                <p style={{ fontSize: '11px', fontFamily: 'monospace', color: '#34d399', margin: '2px 0 0 0' }}>Trạm QR &amp; Quẹt thẻ máy</p>
              </div>
            </div>
            <ul style={{ margin: 0, paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', color: '#cbd5e1' }}>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <CheckCircle2 style={{ width: '15px', height: '15px', color: '#34d399', flexShrink: 0, marginTop: '2px' }} />
                <span>Tab đăng nhập **QRCODE** mở trạm quét mã QR chuyên dụng trực tiếp qua camera (không cho phép chọn ảnh có sẵn).</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <CheckCircle2 style={{ width: '15px', height: '15px', color: '#34d399', flexShrink: 0, marginTop: '2px' }} />
                <span>Cấu hình thời gian làm việc chuẩn: Ca ngày (8:00~17:00), Ca ngày (8:00~20:00)+3h, Ca đêm (20:00~5:00), Ca đêm (20:00~8:00)+3h.</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <CheckCircle2 style={{ width: '15px', height: '15px', color: '#34d399', flexShrink: 0, marginTop: '2px' }} />
                <span>Đối chiếu song song giữa dữ liệu quét QR và dữ liệu máy quẹt thẻ (MQT) trong bảng công ma trận chi tiết.</span>
              </li>
            </ul>
          </div>

          {/* Module C */}
          <div style={{ padding: '20px', borderRadius: '16px', backgroundColor: '#0f172a', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: 'rgba(6, 182, 212, 0.15)', border: '1px solid rgba(6, 182, 212, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#22d3ee' }}>
                <Shield style={{ width: '20px', height: '20px' }} />
              </div>
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#ffffff', margin: 0 }}>3. Phân Hệ An Ninh Cổng (AN NINH)</h3>
                <p style={{ fontSize: '11px', fontFamily: 'monospace', color: '#22d3ee', margin: '2px 0 0 0' }}>Kiểm soát an ninh ra vào bảo mật</p>
              </div>
            </div>
            <ul style={{ margin: 0, paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', color: '#cbd5e1' }}>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <CheckCircle2 style={{ width: '15px', height: '15px', color: '#34d399', flexShrink: 0, marginTop: '2px' }} />
                <span>Kiểm soát lượt nhân viên **VÀO** và **RA** cổng nhà máy kèm thời gian thực cập nhật từ Thẻ Nhân Viên.</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <CheckCircle2 style={{ width: '15px', height: '15px', color: '#34d399', flexShrink: 0, marginTop: '2px' }} />
                <span>Nút **Quét Mã QR Nhân Viên** tích hợp bộ chọn VÀO/RA. Khi quét xong, **chỉ hiển thị Thẻ Nhân Viên kèm thông tin thẻ** (tuyệt đối bảo mật thông tin lương).</span>
              </li>
            </ul>
          </div>

          {/* Module D */}
          <div style={{ padding: '20px', borderRadius: '16px', backgroundColor: '#0f172a', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: 'rgba(168, 85, 247, 0.15)', border: '1px solid rgba(168, 85, 247, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c084fc' }}>
                <Wallet style={{ width: '20px', height: '20px' }} />
              </div>
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#ffffff', margin: 0 }}>4. Tiền Lương, Phiếu Lương &amp; Bảo Mật PIN</h3>
                <p style={{ fontSize: '11px', fontFamily: 'monospace', color: '#c084fc', margin: '2px 0 0 0' }}>Phân quyền lương theo nhân viên</p>
              </div>
            </div>
            <ul style={{ margin: 0, paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', color: '#cbd5e1' }}>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <CheckCircle2 style={{ width: '15px', height: '15px', color: '#34d399', flexShrink: 0, marginTop: '2px' }} />
                <span>Nhân viên khi đăng nhập bằng mã nhân viên hoặc quét QR cá nhân được phép **xem bảng lương &amp; phiếu lương của chính mình**.</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <CheckCircle2 style={{ width: '15px', height: '15px', color: '#34d399', flexShrink: 0, marginTop: '2px' }} />
                <span>Hệ thống bảo mật PIN lương trung tâm do Quản trị viên cấu hình, ngăn chặn truy cập trái phép.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* 4. Footer Brochure Info */}
      <div style={{ borderTop: '1px solid #1e293b', paddingTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8' }}>
        <div>
          <span style={{ fontWeight: 800, color: '#ffffff' }}>NEWPROTEC VINA INDUSTRIAL SYSTEM</span> · Bản quyền © 2026
        </div>
        <div style={{ fontFamily: 'monospace', color: '#22d3ee' }}>
          WEB APP PWA · CLOUD FIRESTORE &amp; TURSO READY
        </div>
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div
        className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6"
        onClick={(e) => {
          if (e.target === e.currentTarget && onClose) onClose();
        }}
      >
        <div className="relative w-full max-w-4xl max-h-[92dvh] overflow-y-auto custom-scrollbar space-y-4">
          <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-3 rounded-xl sticky top-0 z-20 shadow-lg">
            <div className="flex items-center gap-2 font-bold text-white text-sm">
              <FileText className="w-4 h-4 text-cyan-400" />
              <span>Catalog Giới Thiệu Ứng Dụng Newprotec Vina MES V2.0</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadPng}
                disabled={isExporting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang xuất PNG...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    <span>Tải xuống PNG</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-cyan-400" />
                <span>In Catalog</span>
              </button>

              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">{catalogContent}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white uppercase tracking-wide">
            Catalog Giới Thiệu Ứng Dụng
          </h2>
          <p className="text-xs text-slate-400">
            Tài liệu quảng bá, cấu hình chức năng &amp; tiện ích hệ thống Newprotec Vina MES V2.0
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadPng}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 shadow-lg shadow-cyan-950/40"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang tạo ảnh PNG...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Tải xuống file PNG</span>
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
        </div>
      </div>

      <div className="overflow-x-auto">{catalogContent}</div>
    </div>
  );
};
