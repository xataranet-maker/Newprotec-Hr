import React, { useState } from 'react';
import { StaffRecord } from '../../types';
import { UserPlus, CheckCircle } from 'lucide-react';

interface HRAddStaffProps {
  multiStaff: StaffRecord[];
  setMultiStaff: (s: StaffRecord[]) => void;
  stiffStaff: StaffRecord[];
  setStiffStaff: (s: StaffRecord[]) => void;
  moldStaff: StaffRecord[];
  setMoldStaff: (s: StaffRecord[]) => void;
  stampingStaff: StaffRecord[];
  setStampingStaff: (s: StaffRecord[]) => void;
  equipmentStaff: StaffRecord[];
  setEquipmentStaff: (s: StaffRecord[]) => void;
}

export const HRAddStaff: React.FC<HRAddStaffProps> = ({
  multiStaff,
  setMultiStaff,
  stiffStaff,
  setStiffStaff,
  moldStaff,
  setMoldStaff,
  stampingStaff,
  setStampingStaff,
  equipmentStaff,
  setEquipmentStaff
}) => {
  const [fullName, setFullName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [department, setDepartment] = useState('MULTI');
  const [position, setPosition] = useState('Công nhân vận hành');
  const [phone, setPhone] = useState('');
  const [shift, setShift] = useState<'DAY' | 'NIGHT'>('DAY');
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !employeeId) return;

    const newStaff: StaffRecord = {
      id: Date.now(),
      fullName,
      employeeId,
      position,
      dateJoined: new Date().toLocaleDateString('vi-VN'),
      dob: '01/01/1998',
      hometown: 'Việt Nam',
      phone: phone || '0987-xxx-xxx',
      attendance: 'Đúng giờ',
      shift,
      department
    };

    if (department === 'MULTI') setMultiStaff([...multiStaff, newStaff]);
    else if (department === 'STIFF') setStiffStaff([...stiffStaff, newStaff]);
    else if (department === 'STAMPING') setStampingStaff([...stampingStaff, newStaff]);
    else if (department === 'MOLD') setMoldStaff([...moldStaff, newStaff]);
    else if (department === 'EQUIPMENT') setEquipmentStaff([...equipmentStaff, newStaff]);

    setSuccess(true);
    setFullName('');
    setEmployeeId('');
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <div className="p-6 max-w-xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-800">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-emerald-400" />
          <span>Thêm Nhân Viên Mới Vào Nhà Máy</span>
        </h2>
        <p className="text-xs text-slate-400">Tạo hồ sơ và gán nhân viên vào đúng phân xưởng sản xuất.</p>
      </div>

      {success && (
        <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>Đã tạo hồ sơ nhân viên thành công!</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 text-xs">
        <div>
          <label className="block text-slate-300 mb-1">Phòng Ban / Phân Xưởng</label>
          <select
            value={department}
            onChange={e => setDepartment(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
          >
            <option value="MULTI">Multi Auto</option>
            <option value="STIFF">Stiff (Dán Tấm Cứng)</option>
            <option value="STAMPING">Dập Tự Động</option>
            <option value="MOLD">Khuôn & Jig</option>
            <option value="EQUIPMENT">Thiết Bị</option>
          </select>
        </div>

        <div>
          <label className="block text-slate-300 mb-1">Họ Và Tên</label>
          <input
            type="text"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            placeholder="VD: Trần Văn Nam"
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
            required
          />
        </div>

        <div>
          <label className="block text-slate-300 mb-1">Mã Nhân Viên</label>
          <input
            type="text"
            value={employeeId}
            onChange={e => setEmployeeId(e.target.value)}
            placeholder="VD: NV025"
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-300 mb-1">Chức Vụ</label>
            <input
              type="text"
              value={position}
              onChange={e => setPosition(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
              required
            />
          </div>
          <div>
            <label className="block text-slate-300 mb-1">Ca Làm Việc</label>
            <select
              value={shift}
              onChange={e => setShift(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
            >
              <option value="DAY">Ca Ngày (08:00 - 20:00)</option>
              <option value="NIGHT">Ca Đêm (20:00 - 08:00)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-slate-300 mb-1">Số Điện Thoại</label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="VD: 0987123456"
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono"
          />
        </div>

        <button
          type="submit"
          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg cursor-pointer shadow-md"
        >
          Lưu Nhân Viên Mới
        </button>
      </form>
    </div>
  );
};
