import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Sidebar } from './components/common/Sidebar';
import { TopBar } from './components/common/TopBar';
import { Dashboard } from './components/common/Dashboard';
import { Login } from './components/common/Login';
import { PWAPrompt } from './components/common/PWAPrompt';
import { ProductionPlanTab } from './components/common/ProductionPlanTab';
import { ProductionPlanningHub } from './components/common/ProductionPlanningHub';
import { BackupRestore } from './components/common/BackupRestore';
import { DepartmentTimekeepingMatrix } from './components/common/DepartmentTimekeepingMatrix';
import { EmployeeProfile } from './components/hr/EmployeeProfile';
import { AppQRModal } from './components/common/AppQRModal';
import { QrCode, ShieldOff, LogIn, Loader2 } from 'lucide-react';
import {
  parseStaffQrParamsFromUrl,
  clearStaffQrParamsFromUrl,
  isStaffQrEnabled,
  getStaffQrToken,
} from './lib/staffQr';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './lib/firebase';
import {
  MATRIX_UPDATED_EVENT,
  deleteEmployeeFromAllMatrixStorage,
  getAllStoredMatrixSnapshots,
  restoreStoredMatrixSnapshots,
  syncLeaveRegistrationToMatrices,
  removeLeaveRegistrationFromMatrices,
} from './lib/matrixTimekeeping';

// --- MULTI AUTO (NHÂN VIÊN & BẢNG CHẤM CÔNG) ---
import { MultiAutoStaff } from './components/multiauto/MultiAutoStaff';

// --- HC & NHÂN SỰ ---
import { HRAnnouncements } from './components/hr/HRAnnouncements';
import { HRStaffManagement } from './components/hr/HRStaffManagement';
import { HRAddStaff } from './components/hr/HRAddStaff';
import { HRContracts } from './components/hr/HRContracts';
import { HRAttendanceDiary } from './components/hr/HRAttendanceDiary';
import { HRTimekeeping } from './components/hr/HRTimekeeping';
import { HROvertime } from './components/hr/HROvertime';
import { HRLeaves } from './components/hr/HRLeaves';
import { HRPayroll } from './components/hr/HRPayroll';
import { HRSalarySlip } from './components/hr/HRSalarySlip';
import { HRAssets } from './components/hr/HRAssets';
import { HRDocuments } from './components/hr/HRDocuments';
import { HRTraining } from './components/hr/HRTraining';
import { HRAttendanceConfirmation } from './components/hr/HRAttendanceConfirmation';
import {
  LeaveRegistrationWorkbench,
  LEAVE_REGISTRATIONS_STORAGE_KEY,
  migrateLegacyEmployeeLeaves,
} from './components/hr/LeaveFormNPTFM007';

// --- ADMIN ---
import { AdminUserManagement } from './components/admin/AdminUserManagement';

import { ribbonData } from './data/ribbonData';
import {
  StaffRecord,
  UserAccount,
  Language,
  ContractRecord,
  OvertimeRecord,
  PayrollRecord,
  SalarySlipRecord,
  EmployeeSalaryConfig,
  HRAnnouncement,
  TimekeepingRecord,
  AssetRecord,
  TrainingRecord,
  DocumentRecord,
  AttendanceRecord,
  AttendanceCorrectionRequest,
  AttendanceConfirmationRecord,
  ProductionPlan,
  SalarySecurityConfig,
  LeaveRegistrationRecord,
} from './types';
import {
  SALARY_SECURITY_STORAGE_KEY,
  normalizeSalarySecurityConfig,
  canUserAccessSalarySlip,
} from './lib/salaryConfig';
import { translations } from './data/locales';
import { INITIAL_USERS, INITIAL_STAFF, INITIAL_ANNOUNCEMENTS } from './data/initialData';

const SYNC_API_URL = '/api/sync';

const loadFromStorage = (key: string, defaultValue: any) => {
  try {
    const saved = localStorage.getItem(key);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error('Storage Load Error', e);
  }
  return defaultValue;
};

export default function App() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const isInitialized = useRef(false);

  const [userAccounts, setUserAccounts] = useState<UserAccount[]>(() => {
    const saved = loadFromStorage('app_users', null);
    if (saved && saved.length > 0) return saved;
    return INITIAL_USERS;
  });

  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [qrRouteParams, setQrRouteParams] = useState<{ employeeId: string; token: string } | null>(() =>
    parseStaffQrParamsFromUrl()
  );
  const [initialSyncDone, setInitialSyncDone] = useState(false);
  const [viewingProfileStaff, setViewingProfileStaff] = useState<StaffRecord | null>(null);
  const [activeTab, setActiveTab] = useState<string>('home');
  const [activeItem, setActiveItem] = useState<string>('dashboard_home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showAppQR, setShowAppQR] = useState(false);
  const [autoHideMenu, setAutoHideMenu] = useState<boolean>(() => loadFromStorage('app_auto_hide_menu', true));
  const [isMenuPinned, setIsMenuPinned] = useState<boolean>(() => loadFromStorage('app_menu_pinned', false));
  const [language, setLanguage] = useState<Language>(() => loadFromStorage('app_lang', 'vi'));

  // --- PERSISTENT STATES (HOME, MULTI AUTO STAFF/TIMEKEEPING, HC & NS, ADMIN) ---
  const [staffRecords, setStaffRecords] = useState<StaffRecord[]>(() =>
    loadFromStorage('app_staff_records', INITIAL_STAFF.filter((s) => s.department === 'MULTI'))
  );
  const [hrStaff, setHrStaff] = useState<StaffRecord[]>(() =>
    loadFromStorage('app_hr_staff', INITIAL_STAFF.filter((s) => s.department === 'HR'))
  );
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>(() =>
    loadFromStorage('app_attendance_history', [])
  );
  const [attendanceConfirmations, setAttendanceConfirmations] = useState<AttendanceConfirmationRecord[]>(() =>
    loadFromStorage('app_att_confirmations', [])
  );
  const [contracts, setContracts] = useState<ContractRecord[]>(() => loadFromStorage('app_contracts', []));
  const [overtimeRecords, setOvertimeRecords] = useState<OvertimeRecord[]>(() =>
    loadFromStorage('app_overtime_records', [])
  );
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>(() =>
    loadFromStorage('app_payroll_records', [])
  );
  const [salarySlipRecords, setSalarySlipRecords] = useState<SalarySlipRecord[]>(() =>
    loadFromStorage('app_salary_slips', [])
  );
  const [salaryConfigs, setSalaryConfigs] = useState<EmployeeSalaryConfig[]>(() =>
    loadFromStorage('app_salary_configs', [])
  );
  const [timekeepingRecords, setTimekeepingRecords] = useState<TimekeepingRecord[]>(() =>
    loadFromStorage('app_timekeeping_records', [])
  );
  const [announcements, setAnnouncements] = useState<HRAnnouncement[]>(() =>
    loadFromStorage('app_announcements', INITIAL_ANNOUNCEMENTS)
  );
  const [hrAssets, setHrAssets] = useState<AssetRecord[]>(() => loadFromStorage('app_hr_assets', []));
  const [trainingRecords, setTrainingRecords] = useState<TrainingRecord[]>(() =>
    loadFromStorage('app_training_records', [])
  );
  const [documentRecords, setDocumentRecords] = useState<DocumentRecord[]>(() =>
    loadFromStorage('app_document_records', [])
  );
  const [attendanceRequests, setAttendanceRequests] = useState<AttendanceCorrectionRequest[]>(() =>
    loadFromStorage('app_attendance_requests', [])
  );
  const [productionPlans, setProductionPlans] = useState<ProductionPlan[]>(() =>
    loadFromStorage('app_production_plans', [])
  );
  const [salarySecurity, setSalarySecurity] = useState<SalarySecurityConfig>(() =>
    normalizeSalarySecurityConfig(loadFromStorage(SALARY_SECURITY_STORAGE_KEY, null))
  );
  const [leaveRecords, setLeaveRecords] = useState<LeaveRegistrationRecord[]>(() => {
    const existing = loadFromStorage(LEAVE_REGISTRATIONS_STORAGE_KEY, []) as LeaveRegistrationRecord[];
    const initialMulti = loadFromStorage(
      'app_staff_records',
      INITIAL_STAFF.filter((s) => s.department === 'MULTI')
    ) as StaffRecord[];
    const initialHr = loadFromStorage(
      'app_hr_staff',
      INITIAL_STAFF.filter((s) => s.department === 'HR')
    ) as StaffRecord[];
    return migrateLegacyEmployeeLeaves(
      Array.isArray(existing) ? existing : [],
      [...initialMulti, ...initialHr]
    );
  });
  const [matrixVersion, setMatrixVersion] = useState(0);

  useEffect(() => {
    const onMatrixUpdated = () => setMatrixVersion((v) => v + 1);
    window.addEventListener(MATRIX_UPDATED_EVENT, onMatrixUpdated);
    return () => window.removeEventListener(MATRIX_UPDATED_EVENT, onMatrixUpdated);
  }, []);

  // --- AUTOMATIC PERSISTENCE INTO LOCALSTORAGE ---
  useEffect(() => {
    localStorage.setItem('app_users', JSON.stringify(userAccounts));
    localStorage.setItem('app_lang', JSON.stringify(language));
    localStorage.setItem('app_staff_records', JSON.stringify(staffRecords));
    localStorage.setItem('app_hr_staff', JSON.stringify(hrStaff));
    localStorage.setItem('app_attendance_history', JSON.stringify(attendanceHistory));
    localStorage.setItem('app_att_confirmations', JSON.stringify(attendanceConfirmations));
    localStorage.setItem('app_contracts', JSON.stringify(contracts));
    localStorage.setItem('app_overtime_records', JSON.stringify(overtimeRecords));
    localStorage.setItem('app_payroll_records', JSON.stringify(payrollRecords));
    localStorage.setItem('app_salary_slips', JSON.stringify(salarySlipRecords));
    localStorage.setItem('app_salary_configs', JSON.stringify(salaryConfigs));
    localStorage.setItem('app_timekeeping_records', JSON.stringify(timekeepingRecords));
    localStorage.setItem('app_announcements', JSON.stringify(announcements));
    localStorage.setItem('app_hr_assets', JSON.stringify(hrAssets));
    localStorage.setItem('app_training_records', JSON.stringify(trainingRecords));
    localStorage.setItem('app_document_records', JSON.stringify(documentRecords));
    localStorage.setItem('app_attendance_requests', JSON.stringify(attendanceRequests));
    localStorage.setItem('app_production_plans', JSON.stringify(productionPlans));
    localStorage.setItem(SALARY_SECURITY_STORAGE_KEY, JSON.stringify(salarySecurity));
    localStorage.setItem(LEAVE_REGISTRATIONS_STORAGE_KEY, JSON.stringify(leaveRecords));
  }, [
    userAccounts,
    language,
    staffRecords,
    hrStaff,
    attendanceHistory,
    attendanceConfirmations,
    contracts,
    overtimeRecords,
    payrollRecords,
    salarySlipRecords,
    salaryConfigs,
    timekeepingRecords,
    announcements,
    hrAssets,
    trainingRecords,
    documentRecords,
    attendanceRequests,
    productionPlans,
    salarySecurity,
    leaveRecords,
  ]);

  const allStaff = useMemo(() => [...staffRecords, ...hrStaff], [staffRecords, hrStaff]);

  const matchedQrStaff = useMemo(() => {
    if (!qrRouteParams) return null;
    const normEmp = qrRouteParams.employeeId.trim().toLowerCase();
    return allStaff.find((s) => s.employeeId.trim().toLowerCase() === normEmp) || null;
  }, [qrRouteParams, allStaff]);

  const isQrAuthorized = useMemo(() => {
    if (!qrRouteParams || !matchedQrStaff) return false;
    return (
      isStaffQrEnabled(matchedQrStaff) &&
      getStaffQrToken(matchedQrStaff) === qrRouteParams.token
    );
  }, [qrRouteParams, matchedQrStaff]);

  const visibleTabs = useMemo(() => {
    return ribbonData
      .filter((tab) => {
        const roleAllowed = !tab.allowedRoles || (currentUser && tab.allowedRoles.includes(currentUser.role));
        if (tab.id === 'admin' && currentUser?.username.toLowerCase() === 'admin') return false;
        return roleAllowed;
      })
      .map((tab) => {
        if (currentUser?.role === 'staff' && tab.id === 'home') {
          return {
            ...tab,
            groups: tab.groups.map((grp) => ({
              ...grp,
              items: grp.items.filter((item) => item.id === 'personal_profile' || item.id === 'home_announcements'),
            })),
          };
        }
        return tab;
      });
  }, [currentUser]);

  const currentTab = useMemo(() => visibleTabs.find((t) => t.id === activeTab), [visibleTabs, activeTab]);
  const currentItem = useMemo(() => {
    if (!currentTab) return null;
    for (const group of currentTab.groups) {
      const item = group.items.find((i) => i.id === activeItem);
      if (item) return item;
    }
    return null;
  }, [currentTab, activeItem]);

  const handleNavigate = useCallback(
    (itemId: string) => {
      for (const tab of visibleTabs) {
        for (const group of tab.groups) {
          if (group.items.some((i) => i.id === itemId)) {
            setActiveTab(tab.id);
            setActiveItem(itemId);
            return;
          }
        }
      }
      setActiveItem(itemId);
    },
    [visibleTabs]
  );

  const hasPulledInitial = useRef(false);
  const skipNextAutoPush = useRef(false);
  const isSyncingRef = useRef(false);

  const buildCurrentState = useCallback(
    () => ({
      userAccounts,
      staffRecords,
      hrStaff,
      attendanceHistory,
      attendanceConfirmations,
      contracts,
      overtimeRecords,
      payrollRecords,
      salarySlipRecords,
      salaryConfigs,
      timekeepingRecords,
      announcements,
      hrAssets,
      trainingRecords,
      documentRecords,
      attendanceRequests,
      productionPlans,
      salarySecurity,
      leaveRecords,
      matrixSnapshots: getAllStoredMatrixSnapshots(),
      language,
    }),
    [
      userAccounts,
      staffRecords,
      hrStaff,
      attendanceHistory,
      attendanceConfirmations,
      contracts,
      overtimeRecords,
      payrollRecords,
      salarySlipRecords,
      salaryConfigs,
      timekeepingRecords,
      announcements,
      hrAssets,
      trainingRecords,
      documentRecords,
      attendanceRequests,
      productionPlans,
      salarySecurity,
      leaveRecords,
      matrixVersion,
      language,
    ]
  );

  const latestStateRef = useRef(buildCurrentState());
  useEffect(() => {
    latestStateRef.current = buildCurrentState();
  }, [buildCurrentState]);

  const applySyncedState = useCallback((s: Record<string, any>) => {
    if (!s || typeof s !== 'object') return;
    skipNextAutoPush.current = true;
    if (Array.isArray(s.userAccounts) && s.userAccounts.length > 0) setUserAccounts(s.userAccounts);
    if (s.language) setLanguage(s.language);
    if (Array.isArray(s.staffRecords)) setStaffRecords(s.staffRecords);
    if (Array.isArray(s.hrStaff)) setHrStaff(s.hrStaff);
    if (Array.isArray(s.attendanceHistory)) setAttendanceHistory(s.attendanceHistory);
    if (Array.isArray(s.attendanceConfirmations)) setAttendanceConfirmations(s.attendanceConfirmations);
    if (Array.isArray(s.contracts)) setContracts(s.contracts);
    if (Array.isArray(s.overtimeRecords)) setOvertimeRecords(s.overtimeRecords);
    if (Array.isArray(s.payrollRecords)) setPayrollRecords(s.payrollRecords);
    if (Array.isArray(s.salarySlipRecords)) setSalarySlipRecords(s.salarySlipRecords);
    if (Array.isArray(s.salaryConfigs)) setSalaryConfigs(s.salaryConfigs);
    if (Array.isArray(s.timekeepingRecords)) setTimekeepingRecords(s.timekeepingRecords);
    if (Array.isArray(s.announcements)) setAnnouncements(s.announcements);
    if (Array.isArray(s.hrAssets)) setHrAssets(s.hrAssets);
    if (Array.isArray(s.trainingRecords)) setTrainingRecords(s.trainingRecords);
    if (Array.isArray(s.documentRecords)) setDocumentRecords(s.documentRecords);
    if (Array.isArray(s.attendanceRequests)) setAttendanceRequests(s.attendanceRequests);
    if (Array.isArray(s.productionPlans)) setProductionPlans(s.productionPlans);
    if (Array.isArray(s.leaveRecords)) setLeaveRecords(s.leaveRecords);
    if (s.salarySecurity && typeof s.salarySecurity === 'object') {
      setSalarySecurity(normalizeSalarySecurityConfig(s.salarySecurity));
    }
    if (s.matrixSnapshots && typeof s.matrixSnapshots === 'object') {
      restoreStoredMatrixSnapshots(s.matrixSnapshots);
    }
  }, []);

  // --- SYNC ENGINE (VERCEL TURSO PRIMARY + FIRESTORE SECONDARY FALLBACK) ---
  const performSync = useCallback(
    async (isPush: boolean) => {
      if (isSyncingRef.current) return;
      isSyncingRef.current = true;
      setIsSyncing(true);
      try {
        const state = latestStateRef.current;
        const actor = currentUser?.fullName || currentUser?.username || 'system';
        let tursoSynced = false;

        try {
          const res = await fetch(SYNC_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: isPush ? 'PUSH' : 'PULL',
              actor,
              data: isPush ? state : undefined,
            }),
          });

          if (res.ok) {
            const result = await res.json();
            if (result.success) {
              tursoSynced = true;
              if (!isPush) {
                if (!result.empty && result.data && Object.keys(result.data).length > 0) {
                  applySyncedState(result.data);
                } else if (result.empty) {
                  await fetch(SYNC_API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      action: 'PUSH',
                      actor: 'initial-seed',
                      data: state,
                    }),
                  }).catch(() => null);
                }
              }
            }
          }
        } catch (tursoErr) {
          console.warn('Turso API sync fallback:', tursoErr);
        }

        if (!tursoSynced) {
          const docRef = doc(db, 'app_state', 'factory_data');
          if (isPush) {
            try {
              await setDoc(docRef, { ...state, updatedAt: new Date().toISOString() });
            } catch (fsErr) {
              console.warn('Firestore write fallback', fsErr);
            }
          } else {
            try {
              const docSnap = await getDoc(docRef);
              if (docSnap && docSnap.exists()) {
                applySyncedState(docSnap.data());
              }
            } catch (fsErr) {
              console.warn('Firestore get fallback', fsErr);
            }
          }
        }

        setLastSyncTime(new Date().toLocaleTimeString('vi-VN'));
      } catch (e) {
        console.warn('Sync offline fallback active', e);
      } finally {
        if (!isPush) {
          hasPulledInitial.current = true;
          setInitialSyncDone(true);
        }
        isSyncingRef.current = false;
        setIsSyncing(false);
      }
    },
    [applySyncedState, currentUser]
  );

  useEffect(() => {
    if (!isInitialized.current) {
      isInitialized.current = true;
      performSync(false);
    }
    const fallbackTimer = window.setTimeout(() => {
      setInitialSyncDone(true);
    }, 3500);
    return () => window.clearTimeout(fallbackTimer);
  }, [performSync]);

  useEffect(() => {
    if (!hasPulledInitial.current || (!currentUser && !isQrAuthorized)) return;
    if (skipNextAutoPush.current) {
      skipNextAutoPush.current = false;
      return;
    }

    const timer = window.setTimeout(() => {
      performSync(true);
    }, 2500);

    return () => window.clearTimeout(timer);
  }, [buildCurrentState, currentUser, isQrAuthorized, performSync]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (e.key === 'm' || e.key === 'M') {
        setIsSidebarOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    localStorage.setItem('app_auto_hide_menu', JSON.stringify(autoHideMenu));
  }, [autoHideMenu]);

  useEffect(() => {
    localStorage.setItem('app_menu_pinned', JSON.stringify(isMenuPinned));
  }, [isMenuPinned]);

  const handleUpdateStaffInfo = useCallback(
    (updatedStaff: StaffRecord) => {
      const dept = updatedStaff.department?.toUpperCase();
      const updater = (prev: StaffRecord[]) =>
        prev.map((s) => (s.employeeId === updatedStaff.employeeId ? updatedStaff : s));

      if (dept === 'MULTI') {
        setStaffRecords(updater);
      } else if (dept === 'HR' || dept === 'HC & NS') {
        setHrStaff(updater);
      } else {
        setStaffRecords(updater);
        setHrStaff(updater);
      }
    },
    []
  );

  const handleUpdateAvatar = useCallback(
    (newUrl: string) => {
      if (!currentUser?.employeeId) return;
      const staff = allStaff.find((s) => s.employeeId === currentUser.employeeId);
      if (staff) handleUpdateStaffInfo({ ...staff, avatarUrl: newUrl });
    },
    [currentUser, allStaff, handleUpdateStaffInfo]
  );

  const handleDeleteStaffCompletely = useCallback((staff: StaffRecord) => {
    const normId = staff.employeeId.trim().toLowerCase();
    const targetNumericId = staff.id;

    setStaffRecords((prev) =>
      prev.filter((s) => s.employeeId.trim().toLowerCase() !== normId && s.id !== targetNumericId)
    );
    setHrStaff((prev) =>
      prev.filter((s) => s.employeeId.trim().toLowerCase() !== normId && s.id !== targetNumericId)
    );
    setAttendanceHistory((prev) =>
      prev.filter((r) => r.employeeId.trim().toLowerCase() !== normId)
    );
    setOvertimeRecords((prev) =>
      prev.filter((r) => r.employeeId.trim().toLowerCase() !== normId && r.staffId !== targetNumericId)
    );
    setAttendanceConfirmations((prev) =>
      prev.filter((c) => c.employeeId.trim().toLowerCase() !== normId)
    );
    setContracts((prev) =>
      prev.filter((c) => c.employeeId.trim().toLowerCase() !== normId)
    );
    setSalarySlipRecords((prev) =>
      prev.filter((s) => s.employeeId.trim().toLowerCase() !== normId)
    );
    setSalaryConfigs((prev) =>
      prev.filter((c) => c.employeeId.trim().toLowerCase() !== normId)
    );
    setTimekeepingRecords((prev) =>
      prev.filter((t) => t.employeeId.trim().toLowerCase() !== normId)
    );
    setAttendanceRequests((prev) =>
      prev.filter((req) => req.employeeId.trim().toLowerCase() !== normId)
    );
    setLeaveRecords((prev) =>
      prev.filter((r) => r.employeeId.trim().toLowerCase() !== normId)
    );
    try {
      localStorage.removeItem(`app_employee_leaves_${staff.employeeId}`);
    } catch {
      // ignore
    }
    setUserAccounts((prev) =>
      prev.filter(
        (u) =>
          u.username.toLowerCase() === 'admin' ||
          !u.employeeId ||
          u.employeeId.trim().toLowerCase() !== normId
      )
    );
    setViewingProfileStaff((prev) =>
      prev && prev.employeeId.trim().toLowerCase() === normId ? null : prev
    );

    deleteEmployeeFromAllMatrixStorage(staff.employeeId);
  }, []);

  const handleAddLeaveRecord = useCallback(
    (record: LeaveRegistrationRecord) => {
      setLeaveRecords((prev) => [record, ...prev]);
      syncLeaveRegistrationToMatrices(record, allStaff);
    },
    [allStaff]
  );

  const handleDeleteLeaveRecord = useCallback(
    (id: number) => {
      setLeaveRecords((prev) => prev.filter((r) => r.id !== id));
      removeLeaveRegistrationFromMatrices(id, allStaff);
    },
    [allStaff]
  );

  const handleLogin = useCallback((user: UserAccount) => {
    setViewingProfileStaff(null);
    setCurrentUser(user);
    if (user.role === 'staff') {
      setActiveTab('home');
      setActiveItem('personal_profile');
    } else {
      setActiveTab('home');
      setActiveItem('dashboard_home');
    }
  }, []);

  if (!currentUser) {
    if (qrRouteParams) {
      if (!initialSyncDone && !matchedQrStaff) {
        return (
          <div className="min-h-dvh bg-[#020617] text-slate-100 flex items-center justify-center p-4">
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 max-w-sm w-full text-center space-y-3 shadow-2xl">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Đang tải hồ sơ qua Mã QR...
              </h2>
              <p className="text-xs text-slate-400">
                Đang đồng bộ và xác thực quyền truy cập cho mã nhân viên{' '}
                <span className="font-mono text-cyan-300 font-bold">{qrRouteParams.employeeId}</span>.
              </p>
            </div>
          </div>
        );
      }

      if (isQrAuthorized && matchedQrStaff) {
        const qrUser: UserAccount = {
          username: matchedQrStaff.employeeId,
          fullName: matchedQrStaff.fullName,
          role: 'staff',
          employeeId: matchedQrStaff.employeeId,
          department: matchedQrStaff.department || 'MULTI',
        };

        return (
          <div className="min-h-dvh bg-[#020617] text-slate-100 flex flex-col">
            <header className="h-14 bg-slate-950/95 border-b border-slate-800/90 px-4 sm:px-6 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
                  <QrCode className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-extrabold text-white tracking-wider uppercase truncate">
                    NEWPROTEC V2.0 · TRUY CẬP NHANH HỒ SƠ QR
                  </div>
                  <div className="text-[11px] text-cyan-400 font-mono truncate">
                    {matchedQrStaff.fullName} · {matchedQrStaff.employeeId}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  clearStaffQrParamsFromUrl();
                  setQrRouteParams(null);
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors"
              >
                <LogIn className="w-3.5 h-3.5 text-cyan-400" />
                <span>Đăng Nhập Hệ Thống</span>
              </button>
            </header>

            <main className="flex-1 overflow-y-auto custom-scrollbar">
              <EmployeeProfile
                currentUser={qrUser}
                staffInfo={matchedQrStaff}
                allStaff={allStaff}
                contracts={contracts}
                salarySlips={salarySlipRecords}
                payrollRecords={payrollRecords}
                overtimeRecords={overtimeRecords}
                announcements={announcements}
                timekeepingRecords={timekeepingRecords}
                attendanceRequests={attendanceRequests}
                onRequestCorrection={(req) => setAttendanceRequests([req, ...attendanceRequests])}
                attendanceConfirmations={attendanceConfirmations}
                onUpdateAttendanceConfirmation={setAttendanceConfirmations}
                salaryConfigs={salaryConfigs}
                leaveRecords={leaveRecords}
                onAddLeaveRecord={handleAddLeaveRecord}
                onDeleteLeaveRecord={handleDeleteLeaveRecord}
                onUpdateStaffInfo={handleUpdateStaffInfo}
                onUpdateAvatar={(newUrl) => handleUpdateStaffInfo({ ...matchedQrStaff, avatarUrl: newUrl })}
                viewerHasSalaryAccess={canUserAccessSalarySlip(qrUser, salarySecurity)}
                isQrDirectAccess={true}
                canManageQr={false}
              />
            </main>
            <PWAPrompt />
          </div>
        );
      }

      const deniedReason = !matchedQrStaff
        ? `Không tìm thấy hồ sơ nhân viên với mã "${qrRouteParams.employeeId}".`
        : !isStaffQrEnabled(matchedQrStaff)
        ? `Quyền truy cập nhanh qua Mã QR cho nhân viên ${matchedQrStaff.fullName} (${matchedQrStaff.employeeId}) hiện đang bị TẮT bởi quản trị viên HC & NS.`
        : `Mã QR của nhân viên ${matchedQrStaff.fullName} (${matchedQrStaff.employeeId}) đã hết hạn hoặc đã bị thu hồi để cấp lại mã mới.`;

      return (
        <div className="min-h-dvh bg-[#020617] text-slate-100 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-800/70 rounded-2xl p-6 max-w-md w-full text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-950 border border-rose-700/70 flex items-center justify-center text-rose-400">
              <ShieldOff className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-base font-bold text-white">Không Thể Truy Cập Hồ Sơ Qua Mã QR</h2>
              <p className="text-xs text-slate-300 leading-relaxed">{deniedReason}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                clearStaffQrParamsFromUrl();
                setQrRouteParams(null);
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <LogIn className="w-4 h-4" />
              <span>Quay Về Trang Đăng Nhập</span>
            </button>
          </div>
        </div>
      );
    }

    return (
      <Login
        users={userAccounts}
        allStaff={allStaff}
        onLogin={handleLogin}
        language={language}
        onLanguageChange={setLanguage}
      />
    );
  }

  const renderContent = () => {
    const id = activeItem.toLowerCase();

    if (currentUser.role === 'staff' && id !== 'home_announcements') {
      return (
        <EmployeeProfile
          currentUser={currentUser}
          staffInfo={allStaff.find((s) => s.employeeId === currentUser.employeeId)}
          allStaff={allStaff}
          contracts={contracts}
          salarySlips={salarySlipRecords}
          payrollRecords={payrollRecords}
          overtimeRecords={overtimeRecords}
          announcements={announcements}
          timekeepingRecords={timekeepingRecords}
          attendanceRequests={attendanceRequests}
          onRequestCorrection={(req) => setAttendanceRequests([req, ...attendanceRequests])}
          attendanceConfirmations={attendanceConfirmations}
          onUpdateAttendanceConfirmation={setAttendanceConfirmations}
          salaryConfigs={salaryConfigs}
          leaveRecords={leaveRecords}
          onAddLeaveRecord={handleAddLeaveRecord}
          onDeleteLeaveRecord={handleDeleteLeaveRecord}
          onUpdateStaffInfo={handleUpdateStaffInfo}
          onUpdateAvatar={handleUpdateAvatar}
        />
      );
    }

    switch (id) {
      // --- TAB TRANG CHỦ ---
      case 'dashboard_home':
        return (
          <Dashboard
            multiStaff={staffRecords}
            hrStaff={hrStaff}
            allStaffData={allStaff}
            attendanceHistory={attendanceHistory}
            overtimeRecords={overtimeRecords}
            leaveRecords={leaveRecords}
            attendanceRequests={attendanceRequests}
            announcements={announcements}
            onNavigate={handleNavigate}
            onAddPlan={(p) => setProductionPlans([p, ...productionPlans])}
            currentUser={currentUser}
          />
        );
      case 'personal_profile':
        return (
          <EmployeeProfile
            currentUser={currentUser}
            staffInfo={allStaff.find((s) => s.employeeId === currentUser.employeeId)}
            allStaff={allStaff}
            contracts={contracts}
            salarySlips={salarySlipRecords}
            payrollRecords={payrollRecords}
            overtimeRecords={overtimeRecords}
            announcements={announcements}
            timekeepingRecords={timekeepingRecords}
            attendanceRequests={attendanceRequests}
            onRequestCorrection={(req) => setAttendanceRequests([req, ...attendanceRequests])}
            attendanceConfirmations={attendanceConfirmations}
            onUpdateAttendanceConfirmation={setAttendanceConfirmations}
            salaryConfigs={salaryConfigs}
            leaveRecords={leaveRecords}
            onAddLeaveRecord={handleAddLeaveRecord}
            onDeleteLeaveRecord={handleDeleteLeaveRecord}
            onUpdateStaffInfo={handleUpdateStaffInfo}
            onUpdateAvatar={handleUpdateAvatar}
          />
        );
      case 'planning_hub':
        return (
          <ProductionPlanningHub
            onAddPlan={(p) => setProductionPlans([p, ...productionPlans])}
            currentUser={currentUser}
          />
        );
      case 'home_announcements':
        return (
          <HRAnnouncements
            announcements={announcements}
            setAnnouncements={setAnnouncements}
            allStaff={allStaff}
            language={language}
            userRole={currentUser.role}
          />
        );
      case 'production_plans':
        return <ProductionPlanTab plans={productionPlans} departmentId="ALL" />;

      // --- TAB MULTI AUTO (NHÂN VIÊN & BẢNG CHẤM CÔNG) ---
      case 'multi_staff':
        return (
          <MultiAutoStaff
            data={staffRecords}
            onUpdate={setStaffRecords}
            attendanceHistory={attendanceHistory}
            onUpdateAttendanceHistory={setAttendanceHistory}
            overtimeRecords={overtimeRecords}
            onUpdateOvertime={setOvertimeRecords}
            onViewProfile={setViewingProfileStaff}
          />
        );
      case 'multi_matrix_timekeeping':
        return (
          <DepartmentTimekeepingMatrix
            department="MULTI"
            departmentTitle="Multi Auto"
            staffList={staffRecords}
            allStaff={allStaff}
            attendanceHistory={attendanceHistory}
            overtimeRecords={overtimeRecords}
            leaveRecords={leaveRecords}
            onViewProfile={setViewingProfileStaff}
          />
        );

      // --- TAB HC & NS ---
      case 'staff_list':
        return (
          <HRStaffManagement
            multiStaff={staffRecords}
            setMultiStaff={setStaffRecords}
            hrStaff={hrStaff}
            setHrStaff={setHrStaff}
            attendanceHistory={attendanceHistory}
            onUpdateAttendanceHistory={setAttendanceHistory}
            overtimeRecords={overtimeRecords}
            onUpdateOvertime={setOvertimeRecords}
            contracts={contracts}
            salarySlips={salarySlipRecords}
            payrollRecords={payrollRecords}
            announcements={announcements}
            timekeepingRecords={timekeepingRecords}
            attendanceRequests={attendanceRequests}
            onRequestCorrection={(req) => setAttendanceRequests([req, ...attendanceRequests])}
            attendanceConfirmations={attendanceConfirmations}
            onUpdateAttendanceConfirmation={setAttendanceConfirmations}
            onViewProfile={setViewingProfileStaff}
            onDeleteStaff={handleDeleteStaffCompletely}
          />
        );
      case 'hr_add_staff':
        return (
          <HRAddStaff
            multiStaff={staffRecords}
            setMultiStaff={setStaffRecords}
            hrStaff={hrStaff}
            setHrStaff={setHrStaff}
          />
        );
      case 'hr_contracts':
        return <HRContracts contracts={contracts} setContracts={setContracts} allStaff={allStaff} />;
      case 'hr_diary':
        return (
          <HRAttendanceDiary
            allStaff={allStaff}
            attendanceHistory={attendanceHistory}
            onUpdateHistory={setAttendanceHistory}
          />
        );
      case 'timekeeping':
        return (
          <HRTimekeeping
            data={timekeepingRecords}
            allStaff={allStaff}
            onUpdate={setTimekeepingRecords}
            attendanceRequests={attendanceRequests}
            onUpdateRequest={setAttendanceRequests}
            attendanceHistory={attendanceHistory}
            onViewProfile={setViewingProfileStaff}
          />
        );
      case 'hr_matrix_timekeeping':
        return (
          <DepartmentTimekeepingMatrix
            department="ALL"
            departmentTitle="Toàn Nhà Máy (HC & NS)"
            staffList={allStaff}
            allStaff={allStaff}
            attendanceHistory={attendanceHistory}
            overtimeRecords={overtimeRecords}
            leaveRecords={leaveRecords}
            onViewProfile={setViewingProfileStaff}
          />
        );
      case 'hr_attendance_confirm':
        return (
          <HRAttendanceConfirmation
            allStaff={allStaff}
            attendanceConfirmations={attendanceConfirmations}
            onUpdateAttendanceConfirmation={setAttendanceConfirmations}
            salarySlips={salarySlipRecords}
            onUpdateSalarySlips={setSalarySlipRecords}
            salaryConfigs={salaryConfigs}
            onViewProfile={setViewingProfileStaff}
            userRole={currentUser?.role}
          />
        );
      case 'hr_overtime':
        return (
          <HROvertime
            allStaff={allStaff}
            overtimeRecords={overtimeRecords}
            onUpdateOvertime={setOvertimeRecords}
          />
        );
      case 'hr_leave_register':
        return (
          <LeaveRegistrationWorkbench
            allStaff={allStaff}
            leaveRecords={leaveRecords}
            onAddLeaveRecord={handleAddLeaveRecord}
            onDeleteLeaveRecord={handleDeleteLeaveRecord}
            createdByLabel="HC & NS"
          />
        );
      case 'hr_leaves':
        return (
          <HRLeaves
            allStaff={allStaff}
            leaveRecords={leaveRecords}
            onUpdateStaffInfo={handleUpdateStaffInfo}
            onNavigateToRegister={() => setActiveItem('hr_leave_register')}
          />
        );
      case 'hr_payroll':
        return (
          <HRPayroll
            payrollRecords={payrollRecords}
            setPayrollRecords={setPayrollRecords}
            allStaff={allStaff}
          />
        );
      case 'hr_salary_slip':
        return (
          <HRSalarySlip
            salarySlips={salarySlipRecords}
            setSalarySlips={setSalarySlipRecords}
            allStaff={allStaff}
            salaryConfigs={salaryConfigs}
            setSalaryConfigs={setSalaryConfigs}
            attendanceConfirmations={attendanceConfirmations}
            currentUser={currentUser}
            salarySecurity={salarySecurity}
          />
        );
      case 'hr_assets':
        return <HRAssets data={hrAssets} onUpdate={setHrAssets} />;
      case 'hr_documents':
        return <HRDocuments data={documentRecords} onUpdate={setDocumentRecords} />;
      case 'hr_training':
        return <HRTraining data={trainingRecords} onUpdate={setTrainingRecords} />;
      case 'hr_backup':
        return (
          <BackupRestore
            moduleName="HC & NS"
            language={language}
            staffRecords={staffRecords}
            hrStaff={hrStaff}
            onRestoreStaff={(multi, hr) => {
              setStaffRecords(multi);
              setHrStaff(hr);
            }}
            attendanceHistory={attendanceHistory}
            onRestoreAttendance={setAttendanceHistory}
            customData={{
              HR_CONTRACTS: { data: contracts, setter: setContracts },
              HR_PAYROLLS: { data: payrollRecords, setter: setPayrollRecords },
              HR_SLIPS: { data: salarySlipRecords, setter: setSalarySlipRecords },
              HR_SALARY_CONFIGS: { data: salaryConfigs, setter: setSalaryConfigs },
              HR_LEAVES: { data: leaveRecords, setter: setLeaveRecords },
              HR_ANN_GRP: { data: announcements, setter: setAnnouncements },
              HR_ASSETS: { data: hrAssets, setter: setHrAssets },
              HR_TRAINING: { data: trainingRecords, setter: setTrainingRecords },
              HR_DOCS: { data: documentRecords, setter: setDocumentRecords },
              HR_ATT_REQ: { data: attendanceRequests, setter: setAttendanceRequests },
              MULTI_STAFF: { data: staffRecords, setter: setStaffRecords },
              HR_STAFF: { data: hrStaff, setter: setHrStaff },
            }}
          />
        );

      // --- TAB ADMIN ---
      case 'users':
      case 'admin_salary_security':
        return (
          <AdminUserManagement
            users={userAccounts}
            onUpdateUsers={setUserAccounts}
            currentUser={currentUser}
            salarySecurity={salarySecurity}
            onUpdateSalarySecurity={setSalarySecurity}
            initialTab={id === 'admin_salary_security' ? 'security' : 'users'}
          />
        );

      default:
        return (
          <div className="p-20 text-center text-slate-500 font-bold uppercase tracking-widest text-xs">
            Mô đun {id} đang được thiết lập
          </div>
        );
    }
  };

  return (
    <div className="flex h-dvh bg-[#020617] overflow-hidden text-slate-100 relative">
      <Sidebar
        tabs={visibleTabs}
        activeTabId={activeTab}
        activeItemId={activeItem}
        onTabChange={(id) => {
          setActiveTab(id);
        }}
        onItemClick={(id) => {
          setActiveItem(id);
        }}
        language={language}
        userRole={currentUser?.role}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        autoHide={autoHideMenu}
        setAutoHide={setAutoHideMenu}
        isPinned={isMenuPinned}
        setIsPinned={setIsMenuPinned}
      />
      <div className="flex-1 flex flex-col h-full overflow-hidden w-full min-w-0">
        <TopBar
          currentUser={currentUser}
          activeTabLabel={currentTab ? translations[language][currentTab.label] || currentTab.label : ''}
          activeItemLabel={currentItem ? translations[language][currentItem.label] || currentItem.label : ''}
          toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          isSidebarOpen={isSidebarOpen}
          isSyncing={isSyncing}
          onSync={() => performSync(true)}
          lastSyncTime={lastSyncTime}
          onOpenQR={() => setShowAppQR(true)}
        />

        {/* Horizontal Quick Sub-Nav Ribbon */}
        {currentTab && currentTab.groups.length > 0 && (
          <div className="h-10 bg-slate-950/80 border-b border-slate-800/80 px-4 flex items-center overflow-x-auto custom-scrollbar shrink-0 select-none">
            <div className="flex items-center gap-1.5 mx-auto">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1 hidden sm:inline">
                {translations[language][currentTab.label] || currentTab.label}:
              </span>
              {currentTab.groups
                .flatMap((g) => g.items)
                .map((item) => {
                  const isItemActive = item.id === activeItem;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveItem(item.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium shrink-0 transition-colors cursor-pointer ${
                        isItemActive
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-xs font-semibold'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
                      }`}
                      title={translations[language][item.label] || item.label}
                    >
                      <span className="truncate">{translations[language][item.label] || item.label}</span>
                    </button>
                  );
                })}
            </div>
          </div>
        )}

        <main className="flex-1 min-w-0 min-h-0 overflow-y-auto overflow-x-hidden relative bg-[#020617] custom-scrollbar">{renderContent()}</main>
      </div>

      {/* Modal Hồ Sơ Nhân Viên khi nhấn vào nhân viên bất kỳ */}
      {viewingProfileStaff && (() => {
        const resolvedStaff =
          allStaff.find((s) => s.employeeId === viewingProfileStaff.employeeId) || viewingProfileStaff;
        return (
          <EmployeeProfile
            isModal
            onClose={() => setViewingProfileStaff(null)}
            currentUser={{
              username: resolvedStaff.employeeId,
              fullName: resolvedStaff.fullName,
              role: 'staff',
              employeeId: resolvedStaff.employeeId,
              department: resolvedStaff.department || 'MULTI',
            }}
            staffInfo={resolvedStaff}
            allStaff={allStaff}
            contracts={contracts}
            salarySlips={salarySlipRecords}
            payrollRecords={payrollRecords}
            overtimeRecords={overtimeRecords}
            announcements={announcements}
            timekeepingRecords={timekeepingRecords}
            attendanceRequests={attendanceRequests}
            onRequestCorrection={(req) => setAttendanceRequests([req, ...attendanceRequests])}
            attendanceConfirmations={attendanceConfirmations}
            onUpdateAttendanceConfirmation={setAttendanceConfirmations}
            salaryConfigs={salaryConfigs}
            leaveRecords={leaveRecords}
            onAddLeaveRecord={handleAddLeaveRecord}
            onDeleteLeaveRecord={handleDeleteLeaveRecord}
            onUpdateStaffInfo={handleUpdateStaffInfo}
            onUpdateAvatar={(newUrl) => handleUpdateStaffInfo({ ...resolvedStaff, avatarUrl: newUrl })}
            viewerHasSalaryAccess={canUserAccessSalarySlip(currentUser, salarySecurity)}
            canManageQr={currentUser.role !== 'staff'}
          />
        );
      })()}

      <PWAPrompt />
      <AppQRModal isOpen={showAppQR} onClose={() => setShowAppQR(false)} />
    </div>
  );
}
