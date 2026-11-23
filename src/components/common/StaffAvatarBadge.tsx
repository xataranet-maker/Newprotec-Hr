import React, { useEffect, useState } from 'react';

interface StaffAvatarBadgeProps {
  staff: {
    fullName: string;
    avatarUrl?: string;
  };
  sizeClass?: string;
}

export const StaffAvatarBadge: React.FC<StaffAvatarBadgeProps> = ({
  staff,
  sizeClass = 'w-9 h-9 rounded-lg',
}) => {
  const avatarSrc = (staff.avatarUrl || '').trim();
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [avatarSrc]);

  const initial = (staff.fullName || 'N').trim().charAt(0).toUpperCase() || 'N';

  if (avatarSrc && !imgError) {
    return (
      <div
        className={`${sizeClass} shrink-0 overflow-hidden border border-cyan-500/50 bg-slate-950 shadow-inner`}
      >
        <img
          src={avatarSrc}
          alt={staff.fullName}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover object-top block"
        />
      </div>
    );
  }

  return (
    <div
      className={`${sizeClass} shrink-0 bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-inner`}
    >
      {initial}
    </div>
  );
};
