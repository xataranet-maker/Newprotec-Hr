import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Sidebar } from './components/common/Sidebar'; 
import { TopBar } from './components/common/TopBar'; 
import { Dashboard } from './components/common/Dashboard';
import { Login } from './components/common/Login';
import { Assistant } from './components/common/Assistant';
import { PWAPrompt } from './components/common/PWAPrompt';
import { ProductionPlanTab } from './components/common/ProductionPlanTab';
import { ProductionPlanningHub } from './components/common/ProductionPlanningHub';
import { EmployeeProfile } from './components/hr/EmployeeProfile';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './lib/firebase';

// --- IMPORT MULTI AUTO ---
import { MultiAutoImport } from './components/multiauto/MultiAutoImport';
import { MultiAutoProduction } from './components/multiauto/MultiAutoProduction';
import { MultiAutoNetData } from './components/multiauto/MultiAutoNetData';
import { MultiAutoInventory } from './components/multiauto/MultiAutoInventory';
import { MultiAutoMachineSetup } from './components/multiauto/MultiAutoMachineSetup';
import { MultiAutoStaff } from './components/multiauto/MultiAutoStaff';
import { MultiAutoAccessoriesImport } from './components/multiauto/MultiAutoAccessoriesImport';
import { MultiAutoAccessoriesInventory } from './components/multiauto/MultiAutoAccessoriesInventory';
import { MultiAutoCompletedProduction } from './components/multiauto/MultiAutoCompletedProduction';
import { MultiAutoBackupRestore } from './components/multiauto/MultiAutoBackupRestore';
import { MultiAutoMachineHistory } from './components/multiauto/MultiAutoMachineHistory';
import { MultiAutoSummaryReport } from './components/multiauto/MultiAutoSummaryReport';
import { MultiAutoPerformanceReport } from './components/multiauto/MultiAutoPerformanceReport';
import { MultiAutoMonthlyReport } from './components/multiauto/MultiAutoMonthlyReport';
import { MultiAutoProductionStatusKR } from './components/multiauto/MultiAutoProductionStatusKR';
import { MultiAutoDataViewer } from './components/multiauto/MultiAutoDataViewer';
import { MultiAutoDataExportViewer } from './components/multiauto/MultiAutoDataExportViewer';
import { MultiAutoAccessoriesDataViewer } from './components/multiauto/MultiAutoAccessoriesDataViewer';
import { MultiAutoExport } from './components/multiauto/MultiAutoExport';
import { MultiAutoSendMail } from './components/multiauto/MultiAutoSendMail';
import { MultiAutoMachines } from './components/multiauto/MultiAutoMachines';
import { AccessoryImportComparison } from './components/multiauto/AccessoryImportComparison';
import { AccessoryParamsManagement } from './components/multiauto/AccessoryParamsManagement';
import { AccessoryCheckSheet } from './components/multiauto/AccessoryCheckSheet';
import { MultiAutoAttendanceConfirmation } from './components/multiauto/MultiAutoAttendanceConfirmation';

// --- IMPORT STIFF ---
import { StiffSubDeptManager } from './components/stiff/StiffSubDeptManager';
import { StiffNetData } from './components/stiff/StiffNetData';
import { StiffMachines } from './components/stiff/StiffMachines';
import { StiffStaff } from './components/stiff/StiffStaff';
import { StiffMachineHistory } from './components/stiff/StiffMachineHistory';

// --- IMPORT MOLD & JIG ---
import { MoldImport } from './components/mold/MoldImport';
import { MoldExport } from './components/mold/MoldExport';
import { MoldToolWarehouse } from './components/mold/MoldToolWarehouse';
import { MoldStockInventory } from './components/mold/MoldStockInventory';
import { JigStockInventory } from './components/mold/JigStockInventory';
import { MoldStaff } from './components/mold/MoldStaff';
import { MoldImportLedger } from './components/mold/MoldImportLedger';
import { MoldScrapList } from './components/mold/MoldScrapList';
import { MoldNetData } from './components/mold/MoldNetData';

// --- IMPORT STAMPING ---
import { StampingSummaryReport } from './components/stamping/StampingSummaryReport';
import { StampingMachines } from './components/stamping/StampingMachines';
import { StampingImport } from './components/stamping/StampingImport';
import { StampingExport } from './components/stamping/StampingExport';
import { StampingAccessoriesImport } from './components/stamping/StampingAccessoriesImport';
import { StampingNetData } from './components/stamping/StampingNetData';
import { StampingInventory } from './components/stamping/StampingInventory';
import { StampingCompletedProduction } from './components/stamping/StampingCompletedProduction';
import { StampingCheckMaterial } from './components/stamping/StampingCheckMaterial';
import { StampingMachineHistory } from './components/stamping/StampingMachineHistory';
import { StampingMachineSetup } from './components/stamping/StampingMachineSetup';
import { StampingProduction } from './components/stamping/StampingProduction';
import { StampingAccessoriesInventory } from './components/stamping/StampingAccessoriesInventory';
import { StampingStaff } from './components/stamping/StampingStaff';
import { StampingDataViewer } from './components/stamping/StampingDataViewer';
import { StampingDataExportViewer } from './components/stamping/StampingDataExportViewer';

// --- COMMON & EQUIPMENT COMPONENTS ---
import { CheckMaterial } from './components/common/CheckMaterial';
import { DepartmentTimekeepingMatrix } from './components/common/DepartmentTimekeepingMatrix';
import { FaultRegistry } from './components/equipment/FaultRegistry';
import { DeviceMachineMonitor } from './components/equipment/DeviceMachineMonitor';
import { DeviceToolManagement } from './components/equipment/DeviceToolManagement';
import { SparePartsInventory } from './components/equipment/SparePartsInventory';
import { RepairHistoryViewer } from './components/equipment/RepairHistoryViewer';
import { DeviceStaff } from './components/equipment/DeviceStaff';

// --- IMPORT HR ---
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

import { AdminUserManagement } from './components/admin/AdminUserManagement';
import { ribbonData } from './data/ribbonData';
import { 
  ImportRecord, ExportRecord, NetDataRecord, MachineSetup, StaffRecord, AccessoryRecord, 
  AccessoryUsageRecord, ProductionHistoryRecord, UserAccount, Language, 
  ContractRecord, OvertimeRecord, PayrollRecord, SalarySlipRecord, HRAnnouncement, 
  TimekeepingRecord, AssetRecord, TrainingRecord, DocumentRecord, MachineActivityLog, RepairRecord, FaultRecord, AttendanceRecord,
  AttendanceCorrectionRequest, ScrapRecord, ToolRecord, SparePartRecord, AccessoryParameter, AttendanceConfirmationRecord, ApprovalHistoryRecord
} from './types';
import { translations } from './data/locales';
import { 
  INITIAL_USERS, INITIAL_STAFF, INITIAL_NET_DATA, INITIAL_IMPORT_RECORDS, 
  INITIAL_ACCESSORY_RECORDS, INITIAL_EXPORT_RECORDS, INITIAL_ACCESSORY_PARAMS, 
  INITIAL_ANNOUNCEMENTS, INITIAL_TOOLS, INITIAL_SPARE_PARTS 
} from './data/initialData';

const SYNC_API_URL = '/api/sync';

const generateMachines = (prefix: string) => Array.from({ length: 8 }, (_, i) => ({
  id: i + 1, name: `${prefix} 0${i + 1}`, note: 'NORMAL' as const, description: '', updatedAt: new Date().toLocaleTimeString('vi-VN'), staffDay: '', staffNight: ''
}));

const generateDefaultStiffMachines = (): MachineSetup[] => {
    let id = 1;
    const machines: MachineSetup[] = [];
    const groups = ['SUS AUTO', 'SUS SEMI', 'TAPE AUTO', 'TAPE JIG'];
    groups.forEach(g => {
        for(let i=1; i<=3; i++) { 
            machines.push({
                id: id++,
                name: `${g} 0${i}`,
                note: 'NORMAL',
                description: `Máy ${g} #${i}`,
                updatedAt: new Date().toLocaleTimeString('vi-VN'),
                staffDay: '',
                staffNight: ''
            });
        }
    });
    return machines;
};

const loadFromStorage = (key: string, defaultValue: any) => {
    try {
        const saved = localStorage.getItem(key);
        if (saved) return JSON.parse(saved);
    } catch (e) { console.error("Storage Load Error", e); }
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
  const [activeTab, setActiveTab] = useState<string>('home');
  const [activeItem, setActiveItem] = useState<string>('dashboard_home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); 
  const [autoHideMenu, setAutoHideMenu] = useState<boolean>(() => loadFromStorage('app_auto_hide_menu', true));
  const [isMenuPinned, setIsMenuPinned] = useState<boolean>(() => loadFromStorage('app_menu_pinned', false));
  const [language, setLanguage] = useState<Language>(() => loadFromStorage('app_lang', 'vi'));
  const [deptTargets, setDeptTargets] = useState<Record<string, number>>(() => loadFromStorage('app_dept_targets', { 'Multi Auto': 500, 'Stiff': 500, 'Khuôn & Jig': 100, 'Dập Tự Động': 500 }));

  // --- PERSISTENT FACTORY STATES (SEEDED BY DEFAULT, PERSISTED IN LOCALSTORAGE) ---
  const [importedRecords, setImportedRecords] = useState<ImportRecord[]>(() => loadFromStorage('app_imported_records', INITIAL_IMPORT_RECORDS));
  const [exportedRecords, setExportedRecords] = useState<ExportRecord[]>(() => loadFromStorage('app_exported_records', INITIAL_EXPORT_RECORDS));
  const [accessoriesRecords, setAccessoriesRecords] = useState<AccessoryRecord[]>(() => loadFromStorage('app_accessories_records', INITIAL_ACCESSORY_RECORDS));
  const [accessoriesUsage, setAccessoriesUsage] = useState<AccessoryUsageRecord[]>(() => loadFromStorage('app_accessories_usage', []));
  const [netDataRecords, setNetDataRecords] = useState<NetDataRecord[]>(() => loadFromStorage('app_net_data', INITIAL_NET_DATA));
  const [accessoryParams, setAccessoryParams] = useState<AccessoryParameter[]>(() => loadFromStorage('app_accessory_params', INITIAL_ACCESSORY_PARAMS));
  const [machineStatuses, setMachineStatuses] = useState<MachineSetup[]>(() => loadFromStorage('app_multi_machines', generateMachines("Multi")));
  const [staffRecords, setStaffRecords] = useState<StaffRecord[]>(() => loadFromStorage('app_staff_records', INITIAL_STAFF.filter(s => s.department === 'MULTI')));
  const [multiHistory, setMultiHistory] = useState<ProductionHistoryRecord[]>(() => loadFromStorage('app_multi_history', []));
  const [machineActivityLogs, setMachineActivityLogs] = useState<MachineActivityLog[]>(() => loadFromStorage('app_machine_logs', []));
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>(() => loadFromStorage('app_attendance_history', []));
  const [attendanceConfirmations, setAttendanceConfirmations] = useState<AttendanceConfirmationRecord[]>(() => loadFromStorage('app_att_confirmations', []));
  const [approvalHistory, setApprovalHistory] = useState<ApprovalHistoryRecord[]>(() => loadFromStorage('app_approval_history', []));
  
  const [stiffImportRecords, setStiffImportRecords] = useState<ImportRecord[]>(() => loadFromStorage('app_stiff_import', []));
  const [stiffExportRecords, setStiffExportRecords] = useState<ExportRecord[]>(() => loadFromStorage('app_stiff_export', []));
  const [stiffNetData, setStiffNetData] = useState<NetDataRecord[]>(() => loadFromStorage('app_stiff_net_data', INITIAL_NET_DATA.filter(n => n.department === 'STIFF')));
  const [stiffMachines, setStiffMachines] = useState<MachineSetup[]>(() => loadFromStorage('app_stiff_machines', generateDefaultStiffMachines()));
  const [stiffStaff, setStiffStaff] = useState<StaffRecord[]>(() => loadFromStorage('app_stiff_staff', INITIAL_STAFF.filter(s => s.department === 'STIFF')));
  const [stiffHistory, setStiffHistory] = useState<ProductionHistoryRecord[]>(() => loadFromStorage('app_stiff_history', []));

  const [moldImportRecords, setMoldImportRecords] = useState<ImportRecord[]>(() => loadFromStorage('app_mold_import', []));
  const [moldExportRecords, setMoldExportRecords] = useState<ExportRecord[]>(() => loadFromStorage('app_mold_export', []));
  const [moldNetData, setMoldNetData] = useState<NetDataRecord[]>(() => loadFromStorage('app_mold_net_data', INITIAL_NET_DATA.filter(n => n.department === 'MOLD')));
  const [moldMachines, setMoldMachines] = useState<MachineSetup[]>(() => loadFromStorage('app_mold_machines', generateMachines("Mold")));
  const [moldStaff, setMoldStaff] = useState<StaffRecord[]>(() => loadFromStorage('app_mold_staff', INITIAL_STAFF.filter(s => s.department === 'MOLD')));
  const [moldHistory, setMoldHistory] = useState<ProductionHistoryRecord[]>(() => loadFromStorage('app_mold_history', []));
  const [moldScrapRecords, setMoldScrapRecords] = useState<ScrapRecord[]>(() => loadFromStorage('app_mold_scrap', []));

  const [stampingImportRecords, setStampingImportRecords] = useState<ImportRecord[]>(() => loadFromStorage('app_stamping_import', []));
  const [stampingExportRecords, setStampingExportRecords] = useState<ExportRecord[]>(() => loadFromStorage('app_stamping_export', []));
  const [stampingNetData, setStampingNetData] = useState<NetDataRecord[]>(() => loadFromStorage('app_stamping_net_data', INITIAL_NET_DATA.filter(n => n.department === 'STAMPING')));
  const [stampingMachines, setStampingMachines] = useState<MachineSetup[]>(() => loadFromStorage('app_stamping_machines', generateMachines("Stamp")));
  const [stampingStaff, setStampingStaff] = useState<StaffRecord[]>(() => loadFromStorage('app_stamping_staff', INITIAL_STAFF.filter(s => s.department === 'STAMPING')));
  const [stampingHistory, setStampingHistory] = useState<ProductionHistoryRecord[]>(() => loadFromStorage('app_stamping_history', []));

  const [equipmentStaff, setEquipmentStaff] = useState<StaffRecord[]>(() => loadFromStorage('app_equipment_staff', INITIAL_STAFF.filter(s => s.department === 'EQUIPMENT')));
  const [qualityStaff, setQualityStaff] = useState<StaffRecord[]>(() => loadFromStorage('app_quality_staff', []));
  const [hrStaff, setHrStaff] = useState<StaffRecord[]>(() => loadFromStorage('app_hr_staff', INITIAL_STAFF.filter(s => s.department === 'HR')));
  const [warehouseStaff, setWarehouseStaff] = useState<StaffRecord[]>([]);
  const [officeStaff, setOfficeStaff] = useState<StaffRecord[]>([]);

  const [qualitySolutions, setQualitySolutions] = useState<any[]>(() => loadFromStorage('app_quality_solutions', []));
  const [toolRecords, setToolRecords] = useState<ToolRecord[]>(() => loadFromStorage('app_tool_records', INITIAL_TOOLS));
  const [spareParts, setSpareParts] = useState<SparePartRecord[]>(() => loadFromStorage('app_spare_parts', INITIAL_SPARE_PARTS));
  const [repairHistory, setRepairHistory] = useState<RepairRecord[]>(() => loadFromStorage('app_repair_history', []));
  const [faultRecords, setFaultRecords] = useState<FaultRecord[]>(() => loadFromStorage('app_fault_records', []));
  const [contracts, setContracts] = useState<ContractRecord[]>(() => loadFromStorage('app_contracts', []));
  const [overtimeRecords, setOvertimeRecords] = useState<OvertimeRecord[]>(() => loadFromStorage('app_overtime_records', []));
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>(() => loadFromStorage('app_payroll_records', []));
  const [salarySlipRecords, setSalarySlipRecords] = useState<SalarySlipRecord[]>(() => loadFromStorage('app_salary_slips', []));
  const [timekeepingRecords, setTimekeepingRecords] = useState<TimekeepingRecord[]>(() => loadFromStorage('app_timekeeping_records', []));
  const [announcements, setAnnouncements] = useState<HRAnnouncement[]>(() => loadFromStorage('app_announcements', INITIAL_ANNOUNCEMENTS));
  const [hrAssets, setHrAssets] = useState<AssetRecord[]>(() => loadFromStorage('app_hr_assets', []));
  const [trainingRecords, setTrainingRecords] = useState<TrainingRecord[]>(() => loadFromStorage('app_training_records', []));
  const [documentRecords, setDocumentRecords] = useState<DocumentRecord[]>(() => loadFromStorage('app_document_records', []));
  const [attendanceRequests, setAttendanceRequests] = useState<AttendanceCorrectionRequest[]>(() => loadFromStorage('app_attendance_requests', []));
  const [productReturns, setProductReturns] = useState<any[]>(() => loadFromStorage('app_product_returns', []));
  const [accessoryReturns, setAccessoryReturns] = useState<any[]>(() => loadFromStorage('app_accessory_returns', []));
  const [productionPlans, setProductionPlans] = useState<any[]>(() => loadFromStorage('app_production_plans', []));

  // --- AUTOMATIC PERSISTENCE INTO LOCALSTORAGE ---
  useEffect(() => {
    localStorage.setItem('app_users', JSON.stringify(userAccounts));
    localStorage.setItem('app_lang', JSON.stringify(language));
    localStorage.setItem('app_dept_targets', JSON.stringify(deptTargets));
    localStorage.setItem('app_imported_records', JSON.stringify(importedRecords));
    localStorage.setItem('app_exported_records', JSON.stringify(exportedRecords));
    localStorage.setItem('app_accessories_records', JSON.stringify(accessoriesRecords));
    localStorage.setItem('app_accessories_usage', JSON.stringify(accessoriesUsage));
    localStorage.setItem('app_net_data', JSON.stringify(netDataRecords));
    localStorage.setItem('app_accessory_params', JSON.stringify(accessoryParams));
    localStorage.setItem('app_multi_machines', JSON.stringify(machineStatuses));
    localStorage.setItem('app_staff_records', JSON.stringify(staffRecords));
    localStorage.setItem('app_multi_history', JSON.stringify(multiHistory));
    localStorage.setItem('app_machine_logs', JSON.stringify(machineActivityLogs));
    localStorage.setItem('app_attendance_history', JSON.stringify(attendanceHistory));
    localStorage.setItem('app_att_confirmations', JSON.stringify(attendanceConfirmations));
    localStorage.setItem('app_approval_history', JSON.stringify(approvalHistory));

    localStorage.setItem('app_stiff_import', JSON.stringify(stiffImportRecords));
    localStorage.setItem('app_stiff_export', JSON.stringify(stiffExportRecords));
    localStorage.setItem('app_stiff_net_data', JSON.stringify(stiffNetData));
    localStorage.setItem('app_stiff_machines', JSON.stringify(stiffMachines));
    localStorage.setItem('app_stiff_staff', JSON.stringify(stiffStaff));
    localStorage.setItem('app_stiff_history', JSON.stringify(stiffHistory));

    localStorage.setItem('app_mold_import', JSON.stringify(moldImportRecords));
    localStorage.setItem('app_mold_export', JSON.stringify(moldExportRecords));
    localStorage.setItem('app_mold_net_data', JSON.stringify(moldNetData));
    localStorage.setItem('app_mold_machines', JSON.stringify(moldMachines));
    localStorage.setItem('app_mold_staff', JSON.stringify(moldStaff));
    localStorage.setItem('app_mold_history', JSON.stringify(moldHistory));
    localStorage.setItem('app_mold_scrap', JSON.stringify(moldScrapRecords));

    localStorage.setItem('app_stamping_import', JSON.stringify(stampingImportRecords));
    localStorage.setItem('app_stamping_export', JSON.stringify(stampingExportRecords));
    localStorage.setItem('app_stamping_net_data', JSON.stringify(stampingNetData));
    localStorage.setItem('app_stamping_machines', JSON.stringify(stampingMachines));
    localStorage.setItem('app_stamping_staff', JSON.stringify(stampingStaff));
    localStorage.setItem('app_stamping_history', JSON.stringify(stampingHistory));

    localStorage.setItem('app_equipment_staff', JSON.stringify(equipmentStaff));
    localStorage.setItem('app_quality_staff', JSON.stringify(qualityStaff));
    localStorage.setItem('app_hr_staff', JSON.stringify(hrStaff));
    localStorage.setItem('app_quality_solutions', JSON.stringify(qualitySolutions));
    localStorage.setItem('app_tool_records', JSON.stringify(toolRecords));
    localStorage.setItem('app_spare_parts', JSON.stringify(spareParts));
    localStorage.setItem('app_repair_history', JSON.stringify(repairHistory));
    localStorage.setItem('app_fault_records', JSON.stringify(faultRecords));
    localStorage.setItem('app_contracts', JSON.stringify(contracts));
    localStorage.setItem('app_overtime_records', JSON.stringify(overtimeRecords));
    localStorage.setItem('app_payroll_records', JSON.stringify(payrollRecords));
    localStorage.setItem('app_salary_slips', JSON.stringify(salarySlipRecords));
    localStorage.setItem('app_timekeeping_records', JSON.stringify(timekeepingRecords));
    localStorage.setItem('app_announcements', JSON.stringify(announcements));
    localStorage.setItem('app_hr_assets', JSON.stringify(hrAssets));
    localStorage.setItem('app_training_records', JSON.stringify(trainingRecords));
    localStorage.setItem('app_document_records', JSON.stringify(documentRecords));
    localStorage.setItem('app_attendance_requests', JSON.stringify(attendanceRequests));
    localStorage.setItem('app_product_returns', JSON.stringify(productReturns));
    localStorage.setItem('app_accessory_returns', JSON.stringify(accessoryReturns));
    localStorage.setItem('app_production_plans', JSON.stringify(productionPlans));
  }, [
      userAccounts, language, deptTargets, importedRecords, exportedRecords, accessoriesRecords,
      accessoriesUsage, netDataRecords, accessoryParams, machineStatuses, staffRecords, multiHistory,
      machineActivityLogs, attendanceHistory, attendanceConfirmations, approvalHistory,
      stiffImportRecords, stiffExportRecords, stiffNetData, stiffMachines, stiffStaff, stiffHistory,
      moldImportRecords, moldExportRecords, moldNetData, moldMachines, moldStaff, moldHistory,
      moldScrapRecords, stampingImportRecords, stampingExportRecords, stampingNetData, stampingMachines,
      stampingStaff, stampingHistory, equipmentStaff, qualityStaff, hrStaff, qualitySolutions,
      toolRecords, spareParts, repairHistory, faultRecords, contracts, overtimeRecords,
      payrollRecords, salarySlipRecords, timekeepingRecords, announcements, hrAssets, trainingRecords,
      documentRecords, attendanceRequests, productReturns, accessoryReturns, productionPlans
  ]);

  const allStaff = useMemo(() => [
      ...staffRecords, ...stiffStaff, ...moldStaff, ...stampingStaff, ...equipmentStaff, ...qualityStaff,
      ...hrStaff, ...warehouseStaff, ...officeStaff
  ], [staffRecords, stiffStaff, moldStaff, stampingStaff, equipmentStaff, qualityStaff, hrStaff, warehouseStaff, officeStaff]);

  const qualityMetrics = useMemo(() => {
      const totalSolutions = qualitySolutions.length;
      const openSolutions = qualitySolutions.filter(s => s.status === 'OPEN').length;
      return { ppm: 1250, passRate: 98.5, openSolutions, totalIncidents: totalSolutions };
  }, [qualitySolutions]);

  const visibleTabs = useMemo(() => {
      return ribbonData.filter(tab => {
          const roleAllowed = !tab.allowedRoles || (currentUser && tab.allowedRoles.includes(currentUser.role));
          if (tab.id === 'admin' && currentUser?.username.toLowerCase() === 'admin') return false;
          return roleAllowed;
      });
  }, [currentUser]);

  const currentTab = useMemo(() => visibleTabs.find(t => t.id === activeTab), [visibleTabs, activeTab]);
  const currentItem = useMemo(() => {
      if (!currentTab) return null;
      for (const group of currentTab.groups) {
          const item = group.items.find(i => i.id === activeItem);
          if (item) return item;
      }
      return null;
  }, [currentTab, activeItem]);

  const hasPulledInitial = useRef(false);
  const skipNextAutoPush = useRef(false);
  const isSyncingRef = useRef(false);

  const buildCurrentState = useCallback(() => ({
    userAccounts, importedRecords, exportedRecords, accessoriesRecords, accessoriesUsage, netDataRecords, accessoryParams, machineStatuses, staffRecords, multiHistory, machineActivityLogs, attendanceHistory, attendanceConfirmations, approvalHistory, stiffImportRecords, stiffExportRecords, stiffNetData, stiffMachines, stiffStaff, stiffHistory, moldImportRecords, moldExportRecords, moldNetData, moldMachines, moldStaff, moldHistory, moldScrapRecords, stampingImportRecords, stampingExportRecords, stampingNetData, stampingMachines, stampingStaff, stampingHistory, equipmentStaff, qualityStaff, hrStaff, warehouseStaff, officeStaff, qualitySolutions, toolRecords, spareParts, repairHistory, faultRecords, contracts, overtimeRecords, payrollRecords, salarySlipRecords, timekeepingRecords, announcements, hrAssets, trainingRecords, documentRecords, attendanceRequests, productReturns, accessoryReturns, productionPlans, deptTargets, language
  }), [
    userAccounts, importedRecords, exportedRecords, accessoriesRecords, accessoriesUsage, netDataRecords, accessoryParams, machineStatuses, staffRecords, multiHistory, machineActivityLogs, attendanceHistory, attendanceConfirmations, approvalHistory, stiffImportRecords, stiffExportRecords, stiffNetData, stiffMachines, stiffStaff, stiffHistory, moldImportRecords, moldExportRecords, moldNetData, moldMachines, moldStaff, moldHistory, moldScrapRecords, stampingImportRecords, stampingExportRecords, stampingNetData, stampingMachines, stampingStaff, stampingHistory, equipmentStaff, qualityStaff, hrStaff, warehouseStaff, officeStaff, qualitySolutions, toolRecords, spareParts, repairHistory, faultRecords, contracts, overtimeRecords, payrollRecords, salarySlipRecords, timekeepingRecords, announcements, hrAssets, trainingRecords, documentRecords, attendanceRequests, productReturns, accessoryReturns, productionPlans, deptTargets, language
  ]);

  const latestStateRef = useRef(buildCurrentState());
  useEffect(() => {
    latestStateRef.current = buildCurrentState();
  }, [buildCurrentState]);

  const applySyncedState = useCallback((s: Record<string, any>) => {
    if (!s || typeof s !== 'object') return;
    skipNextAutoPush.current = true;
    if (Array.isArray(s.userAccounts) && s.userAccounts.length > 0) setUserAccounts(s.userAccounts);
    if (s.language) setLanguage(s.language);
    if (s.deptTargets && typeof s.deptTargets === 'object') setDeptTargets(s.deptTargets);
    if (Array.isArray(s.importedRecords)) setImportedRecords(s.importedRecords);
    if (Array.isArray(s.exportedRecords)) setExportedRecords(s.exportedRecords);
    if (Array.isArray(s.accessoriesRecords)) setAccessoriesRecords(s.accessoriesRecords);
    if (Array.isArray(s.accessoriesUsage)) setAccessoriesUsage(s.accessoriesUsage);
    if (Array.isArray(s.netDataRecords)) setNetDataRecords(s.netDataRecords);
    if (Array.isArray(s.accessoryParams)) setAccessoryParams(s.accessoryParams);
    if (Array.isArray(s.machineStatuses)) setMachineStatuses(s.machineStatuses);
    if (Array.isArray(s.staffRecords)) setStaffRecords(s.staffRecords);
    if (Array.isArray(s.multiHistory)) setMultiHistory(s.multiHistory);
    if (Array.isArray(s.machineActivityLogs)) setMachineActivityLogs(s.machineActivityLogs);
    if (Array.isArray(s.attendanceHistory)) setAttendanceHistory(s.attendanceHistory);
    if (Array.isArray(s.attendanceConfirmations)) setAttendanceConfirmations(s.attendanceConfirmations);
    if (Array.isArray(s.approvalHistory)) setApprovalHistory(s.approvalHistory);

    if (Array.isArray(s.stiffImportRecords)) setStiffImportRecords(s.stiffImportRecords);
    if (Array.isArray(s.stiffExportRecords)) setStiffExportRecords(s.stiffExportRecords);
    if (Array.isArray(s.stiffNetData)) setStiffNetData(s.stiffNetData);
    if (Array.isArray(s.stiffMachines)) setStiffMachines(s.stiffMachines);
    if (Array.isArray(s.stiffStaff)) setStiffStaff(s.stiffStaff);
    if (Array.isArray(s.stiffHistory)) setStiffHistory(s.stiffHistory);

    if (Array.isArray(s.moldImportRecords)) setMoldImportRecords(s.moldImportRecords);
    if (Array.isArray(s.moldExportRecords)) setMoldExportRecords(s.moldExportRecords);
    if (Array.isArray(s.moldNetData)) setMoldNetData(s.moldNetData);
    if (Array.isArray(s.moldMachines)) setMoldMachines(s.moldMachines);
    if (Array.isArray(s.moldStaff)) setMoldStaff(s.moldStaff);
    if (Array.isArray(s.moldHistory)) setMoldHistory(s.moldHistory);
    if (Array.isArray(s.moldScrapRecords)) setMoldScrapRecords(s.moldScrapRecords);

    if (Array.isArray(s.stampingImportRecords)) setStampingImportRecords(s.stampingImportRecords);
    if (Array.isArray(s.stampingExportRecords)) setStampingExportRecords(s.stampingExportRecords);
    if (Array.isArray(s.stampingNetData)) setStampingNetData(s.stampingNetData);
    if (Array.isArray(s.stampingMachines)) setStampingMachines(s.stampingMachines);
    if (Array.isArray(s.stampingStaff)) setStampingStaff(s.stampingStaff);
    if (Array.isArray(s.stampingHistory)) setStampingHistory(s.stampingHistory);

    if (Array.isArray(s.equipmentStaff)) setEquipmentStaff(s.equipmentStaff);
    if (Array.isArray(s.qualityStaff)) setQualityStaff(s.qualityStaff);
    if (Array.isArray(s.hrStaff)) setHrStaff(s.hrStaff);
    if (Array.isArray(s.warehouseStaff)) setWarehouseStaff(s.warehouseStaff);
    if (Array.isArray(s.officeStaff)) setOfficeStaff(s.officeStaff);
    if (Array.isArray(s.qualitySolutions)) setQualitySolutions(s.qualitySolutions);
    if (Array.isArray(s.toolRecords)) setToolRecords(s.toolRecords);
    if (Array.isArray(s.spareParts)) setSpareParts(s.spareParts);
    if (Array.isArray(s.repairHistory)) setRepairHistory(s.repairHistory);
    if (Array.isArray(s.faultRecords)) setFaultRecords(s.faultRecords);
    if (Array.isArray(s.contracts)) setContracts(s.contracts);
    if (Array.isArray(s.overtimeRecords)) setOvertimeRecords(s.overtimeRecords);
    if (Array.isArray(s.payrollRecords)) setPayrollRecords(s.payrollRecords);
    if (Array.isArray(s.salarySlipRecords)) setSalarySlipRecords(s.salarySlipRecords);
    if (Array.isArray(s.timekeepingRecords)) setTimekeepingRecords(s.timekeepingRecords);
    if (Array.isArray(s.announcements)) setAnnouncements(s.announcements);
    if (Array.isArray(s.hrAssets)) setHrAssets(s.hrAssets);
    if (Array.isArray(s.trainingRecords)) setTrainingRecords(s.trainingRecords);
    if (Array.isArray(s.documentRecords)) setDocumentRecords(s.documentRecords);
    if (Array.isArray(s.attendanceRequests)) setAttendanceRequests(s.attendanceRequests);
    if (Array.isArray(s.productReturns)) setProductReturns(s.productReturns);
    if (Array.isArray(s.accessoryReturns)) setAccessoryReturns(s.accessoryReturns);
    if (Array.isArray(s.productionPlans)) setProductionPlans(s.productionPlans);
  }, []);

  // --- SYNC ENGINE (VERCEL TURSO PRIMARY + FIRESTORE SECONDARY FALLBACK) ---
  const performSync = useCallback(async (isPush: boolean) => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    setIsSyncing(true);
    try {
      const state = latestStateRef.current;
      const actor = currentUser?.fullName || currentUser?.username || 'system';
      let tursoSynced = false;

      // 1. Primary Vercel Turso Database Sync (/api/sync)
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
                // Seed brand-new empty Turso database with initial factory state
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

      // 2. Secondary Firebase Firestore Sync (Fallback / Mirror)
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
      }
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, [applySyncedState, currentUser]);

  useEffect(() => {
    if (!isInitialized.current) {
      isInitialized.current = true;
      performSync(false);
    }
  }, [performSync]);

  // Debounced auto-sync to Vercel Turso after local mutations
  useEffect(() => {
    if (!hasPulledInitial.current || !currentUser) return;
    if (skipNextAutoPush.current) {
      skipNextAutoPush.current = false;
      return;
    }

    const timer = window.setTimeout(() => {
      performSync(true);
    }, 2500);

    return () => window.clearTimeout(timer);
  }, [buildCurrentState, currentUser, performSync]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) {
        return;
      }
      if (e.key === 'm' || e.key === 'M') {
        setIsSidebarOpen(prev => !prev);
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

  const calculateCurrentShift = () => {
    const hour = new Date().getHours();
    return (hour >= 8 && hour < 20) ? 'Ca Ngày' : 'Ca Đêm';
  };

  const handleUpdateStatus = (dept: string, id: number, newStatus: any, stopReason?: string, stage?: string, extra?: any) => {
    const timestamp = new Date().toLocaleTimeString('vi-VN');
    const fullDateStr = new Date().toLocaleDateString('vi-VN');
    const nowTime = new Date();
    const logical = new Date(nowTime);
    if (nowTime.getHours() < 8) logical.setDate(logical.getDate() - 1);
    const logicalDateStr = `${String(logical.getDate()).padStart(2, '0')}/${String(logical.getMonth() + 1).padStart(2, '0')}/${logical.getFullYear()}`;

    const updateRecord = (record: ImportRecord): ImportRecord => {
        const currentStage = stage || record.stage;
        const progress = record.productionProgress || {};
        const stageProgress = progress[currentStage] || { status: 'PENDING' };
        const oldStatus = stageProgress.status;
        
        let newAccumulatedTime = stageProgress.accumulatedTime || 0;
        if (oldStatus === 'RUNNING' && stageProgress.lastStartTimestamp) {
            newAccumulatedTime += (nowTime.getTime() - stageProgress.lastStartTimestamp) / 1000;
        }

        const newProgress = { 
            ...progress, 
            [currentStage]: { 
                ...stageProgress, 
                status: newStatus, 
                accumulatedTime: newAccumulatedTime,
                stopReason: stopReason || stageProgress.stopReason, 
                lastStartTimestamp: newStatus === 'RUNNING' ? nowTime.getTime() : undefined, 
                lastStopTimestamp: newStatus === 'STOPPED' ? nowTime.getTime() : stageProgress.lastStopTimestamp, 
                completedAt: newStatus === 'COMPLETED' ? new Date().toLocaleString('vi-VN') : stageProgress.completedAt, 
                ...(extra || {}) 
            } 
        };

        if (newStatus === 'RUNNING' && !newProgress[currentStage].startTime) newProgress[currentStage].startTime = timestamp;
        
        const machineName = newProgress[currentStage].machine || record.moldNo || 'N/A';
        let eventType: MachineActivityLog['eventType'] = 'START';
        if (newStatus === 'RUNNING') eventType = (oldStatus === 'STOPPED') ? 'RESUME' : 'START';
        else if (newStatus === 'STOPPED') eventType = 'STOP';
        else if (newStatus === 'COMPLETED') eventType = 'FINISH';

        const logEntry: MachineActivityLog = { 
            id: Date.now() + Math.random(), machineName, department: dept, eventType, timestamp, date: fullDateStr, logicalDate: logicalDateStr, model: record.model, lotNo: record.lotNo, reason: stopReason, operator: currentUser?.fullName || 'Hệ thống Auto', durationSeconds: newStatus === 'COMPLETED' ? Math.floor(newAccumulatedTime) : undefined
        };
        setMachineActivityLogs(prev => [logEntry, ...prev]);

        if (newStatus === 'COMPLETED') {
            const finalProg = newProgress[currentStage];
            const net = (dept === 'STAMPING' ? stampingNetData : 
                         dept === 'STIFF' ? stiffNetData : 
                         netDataRecords).find(n => n.model === record.model && n.code === record.code);
            
            let totalHits = 0; let totalPcs = 0; let totalMeters = record.quantity; 
            if (dept === 'STAMPING' && net) {
                const pitch = net.pitchDistance || 1; const pcsPerHit = net.pcsPerStroke || 1;
                totalHits = Math.round((record.quantity * 1000) / pitch); totalPcs = totalHits * pcsPerHit;
            }

            const historyRecord: ProductionHistoryRecord = { 
                ...record, department: dept, date: logicalDateStr, historyId: Date.now() + Math.random(), completedAt: new Date().toLocaleString('vi-VN'), stageCompleted: currentStage, machine: finalProg.machine, moldNo: finalProg.moldNo || record.moldNo, totalMeters: dept === 'STAMPING' ? totalMeters : undefined, totalHits: dept === 'STAMPING' ? totalHits : undefined, totalPcs: dept === 'STAMPING' ? totalPcs : undefined, operator: currentUser?.fullName || 'Hệ thống', productionStartTime: finalProg.startTime, usedAccessoryLot: finalProg.accessoryLot, tableTemp: net?.tableTemp, padTemp: net?.padTemp, airPressure: net?.airPressure, totalDuration: Math.floor(newAccumulatedTime)
            };

            if (dept === 'MULTI') setMultiHistory(prev => [historyRecord, ...prev]);
            else if (dept === 'STIFF') setStiffHistory(prev => [historyRecord, ...prev]);
            else if (dept === 'STAMPING') setStampingHistory(prev => [historyRecord, ...prev]);
        }
        return { ...record, productionStatus: newStatus, productionProgress: newProgress };
    };

    if (dept === 'MULTI') setImportedRecords(prev => prev.map(r => r.id === id ? updateRecord(r) : r));
    else if (dept === 'STIFF') setStiffImportRecords(prev => prev.map(r => r.id === id ? updateRecord(r) : r));
    else if (dept === 'STAMPING') setStampingImportRecords(prev => prev.map(r => r.id === id ? updateRecord(r) : r));
  };

  const handleConfirmImport = (moduleName: string, tpIds: number[], plIds: number[]) => {
      const now = new Date();
      const timestamp = now.toLocaleTimeString('vi-VN');
      const dateStr = now.toLocaleDateString('vi-VN');
      const fullTs = `${dateStr} ${timestamp}`;
      
      const updateRecords = (prev: any[]) => prev.map(r => 
          tpIds.includes(r.id) || plIds.includes(r.id) 
              ? { ...r, isVerified: true, verifiedAt: fullTs } 
              : r
      );

      if (moduleName === 'Multi Auto') {
          setImportedRecords(updateRecords);
          setAccessoriesRecords(updateRecords);
      } else if (moduleName === 'Stiff') {
          setStiffImportRecords(updateRecords);
          setAccessoriesRecords(updateRecords);
      } else if (moduleName === 'Dập Tự Động') {
          setStampingImportRecords(updateRecords);
          setAccessoriesRecords(updateRecords);
      }

      const newLog: ApprovalHistoryRecord = {
          id: Date.now(),
          timestamp,
          date: dateStr,
          moduleName,
          tpCount: tpIds.length,
          plCount: plIds.length,
          details: `Duyệt ${tpIds.length} lô TP, ${plIds.length} lô PL tại bộ phận ${moduleName}`,
          operator: currentUser?.fullName || 'System'
      };
      setApprovalHistory(prev => [newLog, ...prev]);
  };

  const handleLinkAccessory = (dept: string, prodId: number, lot: string, qty: number, stage: string) => {
      setAccessoriesUsage(prev => [...prev, { 
          id: Date.now() + Math.random(), accessoryLotNo: lot, productionId: prodId, productionStage: stage, quantity: qty, timestamp: new Date().toLocaleString(), model: '', code: '' 
      }]);

      const updater = (prev: ImportRecord[]) => prev.map(r => {
          if (r.id === prodId) {
              const progress = r.productionProgress || {};
              const stProg = progress[stage] || { status: 'PENDING' };
              const currentLots = stProg.accessoryLot ? stProg.accessoryLot.split(', ') : [];
              if (!currentLots.includes(lot)) currentLots.push(lot);
              return { ...r, productionProgress: { ...progress, [stage]: { ...stProg, accessoryLot: currentLots.join(', ') } } };
          }
          return r;
      });

      if (dept === 'MULTI') setImportedRecords(updater);
      else if (dept === 'STIFF') setStiffImportRecords(updater);
      else if (dept === 'STAMPING') setStampingImportRecords(updater);
  };

  const handleUpdateMpsBatch = (dept: string, updates: {id: number, mpsDate: string, stayDurationMinutes: number, stayDurationHuman: string}[]) => {
      const updateMap = new Map(updates.map(u => [u.id, u]));
      const adapter = (prev: ImportRecord[]) => prev.map(r => {
          const u = updateMap.get(r.id);
          if (u) return { ...r, mpsDate: u.mpsDate, stayDurationMinutes: u.stayDurationMinutes, stayDurationHuman: u.stayDurationHuman };
          return r;
      });
      if (dept === 'MULTI') setImportedRecords(adapter);
      else if (dept === 'STIFF') setStiffImportRecords(adapter);
      else if (dept === 'STAMPING') setStampingImportRecords(adapter);
  };

  const handleUpdateStaffInfo = useCallback((updatedStaff: StaffRecord) => {
      const dept = updatedStaff.department?.toUpperCase();
      const updater = (prev: StaffRecord[]) => prev.map(s => s.employeeId === updatedStaff.employeeId ? updatedStaff : s);

      if (dept === 'MULTI') setStaffRecords(updater);
      else if (dept === 'STIFF') setStiffStaff(updater);
      else if (dept === 'MOLD') setMoldStaff(updater);
      else if (dept === 'STAMPING') setStampingStaff(updater);
      else if (dept === 'QUALITY') setQualityStaff(updater);
      else if (dept === 'EQUIPMENT') setEquipmentStaff(updater);
      else if (dept === 'HR' || dept === 'HC & NS') setHrStaff(updater);
      else if (dept === 'WAREHOUSE') setWarehouseStaff(updater);
      else if (dept === 'OFFICE') setOfficeStaff(updater);
  }, []);

  const handleUpdateAvatar = useCallback((newUrl: string) => {
      if (!currentUser?.employeeId) return;
      const staff = allStaff.find(s => s.employeeId === currentUser.employeeId);
      if (staff) handleUpdateStaffInfo({ ...staff, avatarUrl: newUrl });
  }, [currentUser, allStaff, handleUpdateStaffInfo]);

  if (!currentUser) return <Login users={userAccounts} allStaff={allStaff} onLogin={setCurrentUser} language={language} onLanguageChange={setLanguage} />;

  // --- RENDER CONTENT CHO TẤT CẢ CÁC TAB VÀ CHỨC NĂNG ---
  const renderContent = () => {
    const id = activeItem.toLowerCase();

    if (currentUser.role === 'staff' && (id === 'dashboard_home' || id === 'home')) {
        return <EmployeeProfile 
            currentUser={currentUser} 
            staffInfo={allStaff.find(s => s.employeeId === currentUser.employeeId)} 
            contracts={contracts} 
            salarySlips={salarySlipRecords} 
            payrollRecords={payrollRecords} 
            overtimeRecords={overtimeRecords} 
            announcements={announcements} 
            timekeepingRecords={timekeepingRecords} 
            attendanceRequests={attendanceRequests} 
            onRequestCorrection={req => setAttendanceRequests([req, ...attendanceRequests])} 
            attendanceConfirmations={attendanceConfirmations}
            onUpdateAttendanceConfirmation={setAttendanceConfirmations}
            onUpdateStaffInfo={handleUpdateStaffInfo}
            onUpdateAvatar={handleUpdateAvatar}
        />;
    }

    switch(id) {
      // --- TAB HOME ---
      case 'dashboard_home': return <Dashboard activeModule="ALL" multiAuto={{ imports: importedRecords, exports: exportedRecords, machineStatuses }} stiff={{ imports: stiffImportRecords, exports: stiffExportRecords, machineStatuses: stiffMachines }} mold={{ imports: moldImportRecords, exports: moldExportRecords, machineStatuses: moldMachines }} stamping={{ imports: stampingImportRecords, exports: stampingExportRecords, machineStatuses: stampingMachines }} language={language} repairHistory={repairHistory} qualityMetrics={qualityMetrics} onNavigate={setActiveItem} deptTargets={deptTargets} allNetData={netDataRecords} allHistoryData={[...multiHistory, ...stiffHistory, ...stampingHistory]} allStaffData={allStaff} attendanceHistory={attendanceHistory} overtimeRecords={overtimeRecords} announcements={announcements} onAddPlan={(p) => setProductionPlans([p, ...productionPlans])} currentUser={currentUser} />;
      case 'personal_profile': return <EmployeeProfile currentUser={currentUser} staffInfo={allStaff.find(s => s.employeeId === currentUser.employeeId)} contracts={contracts} salarySlips={salarySlipRecords} payrollRecords={payrollRecords} overtimeRecords={overtimeRecords} announcements={announcements} timekeepingRecords={timekeepingRecords} attendanceRequests={attendanceRequests} onRequestCorrection={req => setAttendanceRequests([req, ...attendanceRequests])} attendanceConfirmations={attendanceConfirmations} onUpdateAttendanceConfirmation={setAttendanceConfirmations} onUpdateStaffInfo={handleUpdateStaffInfo} onUpdateAvatar={handleUpdateAvatar} />;
      case 'planning_hub': return <ProductionPlanningHub allNetData={netDataRecords} onAddPlan={(p) => setProductionPlans([p, ...productionPlans])} currentUser={currentUser} />;
      case 'home_announcements': return <HRAnnouncements announcements={announcements} setAnnouncements={setAnnouncements} allStaff={allStaff} language={language} userRole={currentUser.role} />;
      case 'production_plans': return <ProductionPlanTab plans={productionPlans} departmentId="ALL" />;
      
      // --- TAB MULTI AUTO ---
      case 'prod_report': return <MultiAutoSummaryReport importData={importedRecords} exportData={exportedRecords} historyData={multiHistory} machineData={machineStatuses} staffData={staffRecords} netData={netDataRecords} productReturns={productReturns} targetPnl={deptTargets['Multi Auto']} attendanceHistory={attendanceHistory} overtimeRecords={overtimeRecords} />;
      case 'model_tracking': return <MultiAutoPerformanceReport importData={importedRecords} historyData={multiHistory} netData={netDataRecords} machineStatuses={machineStatuses} targetPnl={deptTargets['Multi Auto']} language={language} />;
      case 'quality_report': return <MultiAutoMonthlyReport historyData={multiHistory} netData={netDataRecords} machines={machineStatuses} targetPnl={deptTargets['Multi Auto']} language={language} onUpdateTarget={(v) => setDeptTargets({...deptTargets, 'Multi Auto': v})} />;
      case 'prod_report_kr': return <MultiAutoProductionStatusKR historyData={multiHistory} netData={netDataRecords} targetPnl={deptTargets['Multi Auto']} userRole={currentUser.role} />;
      case 'production': return <MultiAutoProduction data={importedRecords.filter(r => r.isVerified)} onUpdateStatus={(id, s, r, st, ex) => handleUpdateStatus('MULTI', id, s, r, st, ex)} onUpdateMachine={(id, m, s) => setImportedRecords(importedRecords.map(r => r.id === id ? { ...r, productionProgress: { ...(r.productionProgress || {}), [s || r.stage]: { ...(r.productionProgress?.[s || r.stage] || { status: 'PENDING' }), machine: m } } } : r))} onLinkAccessory={(id, lot, qty, s) => handleLinkAccessory('MULTI', id, lot, qty, s || '1L-1')} onUpdateMpsBatch={(b) => handleUpdateMpsBatch('MULTI', b)} machineStatuses={machineStatuses} accessoriesData={accessoriesRecords} netData={netDataRecords} language={language} faultRecords={faultRecords} />;
      case 'multi_staff': return <MultiAutoStaff data={staffRecords} onUpdate={setStaffRecords} attendanceHistory={attendanceHistory} onUpdateAttendanceHistory={setAttendanceHistory} overtimeRecords={overtimeRecords} onUpdateOvertime={setOvertimeRecords} />;
      case 'multi_matrix_timekeeping': return <DepartmentTimekeepingMatrix department="MULTI" departmentTitle="Multi Auto" staffList={staffRecords} allStaff={allStaff} attendanceHistory={attendanceHistory} overtimeRecords={overtimeRecords} />;
      case 'att_confirm': return <MultiAutoAttendanceConfirmation data={attendanceConfirmations} onUpdate={setAttendanceConfirmations} currentUser={currentUser} language={language} />;
      case 'import': return <MultiAutoImport onAddBatch={recs => setImportedRecords([...recs.map(r => ({ ...r, id: Date.now() + Math.random(), date: new Date().toLocaleDateString('vi-VN'), timestamp: new Date().toLocaleTimeString('vi-VN'), isVerified: false })), ...importedRecords])} recentRecords={importedRecords} netData={netDataRecords} userRole={currentUser.role} onUpdate={(r) => setImportedRecords(importedRecords.map(i => i.id === r.id ? r : i))} onDelete={(id) => setImportedRecords(importedRecords.filter(i => i.id !== id))} />;
      case 'machine_book': return <MultiAutoAccessoriesImport onAddBatch={recs => setAccessoriesRecords([...recs.map(r => ({ ...r, id: Date.now() + Math.random(), date: new Date().toLocaleDateString('vi-VN'), timestamp: new Date().toLocaleTimeString('vi-VN'), isVerified: false })), ...accessoriesRecords])} recentRecords={accessoriesRecords} netData={netDataRecords} onDelete={(id) => setAccessoriesRecords(accessoriesRecords.filter(i => i.id !== id))} onUpdate={(r) => setAccessoriesRecords(accessoriesRecords.map(i => i.id === r.id ? r : i))} />;
      case 'acc_check_sheet': return <AccessoryCheckSheet historyData={multiHistory} accessoryParams={accessoryParams} accessoriesData={accessoriesRecords} netData={netDataRecords} />;
      case 'export': return <MultiAutoExport onAddBatch={recs => setExportedRecords([...recs.map(r => ({ ...r, id: Date.now() + Math.random(), date: new Date().toLocaleDateString('vi-VN'), timestamp: new Date().toLocaleTimeString('vi-VN'), shift: calculateCurrentShift() })), ...exportedRecords])} recentRecords={exportedRecords} netData={netDataRecords} importData={importedRecords} exportData={exportedRecords} historyData={multiHistory} />;
      case 'completed_production': return <MultiAutoCompletedProduction data={multiHistory} language={language} netData={netDataRecords} exportData={exportedRecords} />;
      case 'machine_history': return <MultiAutoMachineHistory logs={machineActivityLogs} machineStatuses={machineStatuses} language={language} />;
      case 'dk_may': return <MultiAutoMachineSetup machines={machineStatuses} onUpdate={setMachineStatuses} staffData={staffRecords} faultRecords={faultRecords} />;
      case 'data_net': return <MultiAutoNetData data={netDataRecords} onDataUpdate={setNetDataRecords} />;
      case 'accessory_params': return <AccessoryParamsManagement data={accessoryParams} onUpdate={setAccessoryParams} netData={netDataRecords} />;
      case 'send_mail': return <MultiAutoSendMail exportData={exportedRecords} />;
      case 'inventory': return <MultiAutoInventory imports={importedRecords.filter(r => r.isVerified)} exports={exportedRecords} returns={productReturns} onReturn={ret => setProductReturns([{ ...ret, id: Date.now(), timestamp: new Date().toLocaleTimeString(), date: new Date().toLocaleDateString() }, ...productReturns])} language={language} userRole={currentUser.role} onDelete={lot => setImportedRecords(importedRecords.filter(r => r.lotNo !== lot))} onFixStock={(lot, qty) => setImportedRecords(importedRecords.map(r => r.lotNo === lot ? { ...r, quantity: qty } : r))} />;
      case 'acc_inventory': return <MultiAutoAccessoriesInventory imports={accessoriesRecords.filter(r => r.isVerified)} usage={accessoriesUsage} returns={accessoryReturns} onReturn={ret => setAccessoryReturns([{ ...ret, id: Date.now(), timestamp: new Date().toLocaleTimeString(), date: new Date().toLocaleDateString() }, ...accessoryReturns])} language={language} netData={netDataRecords} historyData={multiHistory} productionData={importedRecords} userRole={currentUser.role} onDelete={(lot) => setAccessoriesRecords(accessoriesRecords.filter(a => a.lotNo !== lot))} />;
      case 'check_pl': return <CheckMaterial netData={netDataRecords} importData={importedRecords} accessoryData={accessoriesRecords} approvalHistory={approvalHistory} onConfirmImport={(tpIds, plIds) => handleConfirmImport('Multi Auto', tpIds, plIds)} />;
      case 'multi_compare': return <AccessoryImportComparison accessoryData={accessoriesRecords} onClearSystemData={() => setAccessoriesRecords([])} />;
      case 'multi_data_view': return <MultiAutoDataViewer data={importedRecords} />;
      case 'multi_acc_data_view': return <MultiAutoAccessoriesDataViewer data={accessoriesRecords} />;
      case 'multi_export_view': return <MultiAutoDataExportViewer data={exportedRecords} netData={netDataRecords} />;
      case 'multi_backup': return <MultiAutoBackupRestore moduleName="Multi Auto" language={language} importData={importedRecords} exportData={exportedRecords} historyData={multiHistory} machineData={machineStatuses} netData={netDataRecords} staffData={staffRecords} accessoryData={accessoriesRecords} accessoryUsage={accessoriesUsage} productReturns={productReturns} accessoryReturns={accessoryReturns} setImportData={setImportedRecords} setExportData={setExportedRecords} setHistoryData={setMultiHistory} setMachineData={setMachineStatuses} setNetData={setNetDataRecords} setStaffData={setStaffRecords} setAccessoryData={setAccessoriesRecords} setAccessoryUsage={setAccessoriesUsage} setProductReturns={setProductReturns} setAccessoryReturns={setAccessoryReturns} />;

      // --- TAB STAMPING ---
      case 'as_prod_rpt': return <StampingSummaryReport importData={stampingImportRecords} exportData={stampingExportRecords} historyData={stampingHistory} machineData={stampingMachines} staffData={stampingStaff} netData={stampingNetData} targetPnl={deptTargets['Dập Tự Động']} />;
      case 'as_machine': return <StampingMachines data={stampingImportRecords} onUpdateStatus={(id, s, r, st) => handleUpdateStatus('STAMPING', id, s, r, st)} machineStatuses={stampingMachines} netData={stampingNetData} historyData={stampingHistory} targetPnl={deptTargets['Dập Tự Động']} />;
      case 'as_import': return <StampingImport onAddBatch={recs => {
          const now = new Date();
          if (now.getHours() < 8) now.setDate(now.getDate() - 1);
          const day = String(now.getDate()).padStart(2, '0');
          const month = String(now.getMonth() + 1).padStart(2, '0');
          const logicalDate = `${day}/${month}/${now.getFullYear()}`;
          setStampingImportRecords([...recs.map(r => ({ ...r, id: Date.now() + Math.random(), date: logicalDate, timestamp: new Date().toLocaleTimeString('vi-VN'), isVerified: true })), ...stampingImportRecords])
      }} recentRecords={stampingImportRecords} netData={stampingNetData} />;
      case 'as_production': return <StampingProduction data={stampingImportRecords} onUpdateStatus={(id, s, r, st, ex) => handleUpdateStatus('STAMPING', id, s, r, st, ex)} onUpdateMachine={(id, m, st, mold) => setStampingImportRecords(stampingImportRecords.map(r => r.id === id ? { ...r, productionProgress: { ...(r.productionProgress || {}), [st || r.stage]: { ...(r.productionProgress?.[st || r.stage] || { status: 'PENDING' }), machine: m, moldNo: mold } } } : r))} onLinkAccessory={() => {}} onUpdateMpsBatch={(b) => handleUpdateMpsBatch('STAMPING', b)} machineStatuses={stampingMachines} accessoriesData={accessoriesRecords} netData={stampingNetData} language={language} faultRecords={faultRecords} moldImportRecords={moldImportRecords} exportData={stampingExportRecords} />;
      case 'as_export': return <StampingExport onAddBatch={recs => setStampingExportRecords([...recs.map(r => ({ ...r, id: Date.now() + Math.random(), date: new Date().toLocaleDateString('vi-VN'), timestamp: new Date().toLocaleTimeString('vi-VN'), shift: calculateCurrentShift() })), ...stampingExportRecords])} recentRecords={stampingExportRecords} netData={stampingNetData} importData={stampingImportRecords} exportData={stampingExportRecords} historyData={stampingHistory} />;
      case 'as_completed': return <StampingCompletedProduction data={stampingHistory} language={language} netData={stampingNetData} exportData={stampingExportRecords} />;
      case 'as_history': return <StampingMachineHistory logs={machineActivityLogs} machineStatuses={stampingMachines} language={language} />;
      case 'as_inventory_tp': return <StampingAccessoriesInventory productionHistory={stampingHistory} exports={stampingExportRecords} />;
      case 'as_inventory_cuon': return <StampingInventory imports={stampingImportRecords} exports={stampingExportRecords} historyData={stampingHistory} netData={stampingNetData} />;
      case 'as_check_material': return <CheckMaterial moduleName="Dập Tự Động" netData={stampingNetData} importData={stampingImportRecords} accessoryData={accessoriesRecords} approvalHistory={approvalHistory} onConfirmImport={(tpIds, plIds) => handleConfirmImport('Dập Tự Động', tpIds, plIds)} />;
      case 'as_machine_setup': return <StampingMachineSetup machines={stampingMachines} onUpdate={setStampingMachines} staffData={stampingStaff} faultRecords={faultRecords} />;
      case 'as_net_data': return <StampingNetData data={stampingNetData} onDataUpdate={setStampingNetData} />;
      case 'as_staff': return <StampingStaff data={stampingStaff} onUpdate={setStampingStaff} attendanceHistory={attendanceHistory} onUpdateAttendanceHistory={setAttendanceHistory} />;
      case 'as_matrix_timekeeping': return <DepartmentTimekeepingMatrix department="STAMPING" departmentTitle="Dập Tự Động" staffList={stampingStaff} allStaff={allStaff} attendanceHistory={attendanceHistory} overtimeRecords={overtimeRecords} />;
      case 'as_backup': return <MultiAutoBackupRestore moduleName="Dập Tự Động" language={language} importData={stampingImportRecords} exportData={stampingExportRecords} historyData={stampingHistory} machineData={stampingMachines} netData={stampingNetData} staffData={stampingStaff} setImportData={setStampingImportRecords} setExportData={setStampingExportRecords} setHistoryData={setStampingHistory} setMachineData={setStampingMachines} setNetData={setStampingNetData} setStaffData={setStampingStaff} />;

      // --- TAB STIFF ---
      case 'stiff_sus_auto': case 'stiff_sus_semi': case 'stiff_tape_auto': case 'stiff_tape_jig':
        const subDept = id.replace('stiff_', '').toUpperCase();
        return <StiffSubDeptManager subDeptId={subDept as any} importData={stiffImportRecords} exportData={stiffExportRecords} historyData={stiffHistory} machineData={stiffMachines} netData={stiffNetData} accessoryData={accessoriesRecords} accessoryUsage={accessoriesUsage} repairHistory={repairHistory} faultRecords={faultRecords} machineActivityLogs={machineActivityLogs} onAddMachineLog={l => setMachineActivityLogs([l, ...machineActivityLogs])} onAddImport={recs => setStiffImportRecords([...recs.map(r => ({ ...r, id: Date.now() + Math.random(), date: new Date().toLocaleDateString('vi-VN'), timestamp: new Date().toLocaleTimeString('vi-VN') })), ...stiffImportRecords])} onAddAccessory={recs => setAccessoriesRecords([...recs.map(r => ({ ...r, id: Date.now() + Math.random(), date: new Date().toLocaleDateString('vi-VN'), timestamp: new Date().toLocaleTimeString('vi-VN') })), ...accessoriesRecords])} onAddExport={recs => setStiffExportRecords([...recs.map(r => ({ ...r, id: Date.now() + Math.random(), date: new Date().toLocaleDateString('vi-VN'), timestamp: new Date().toLocaleTimeString('vi-VN'), shift: calculateCurrentShift() })), ...stiffExportRecords])} onUpdateStatus={(rid, s, r, st) => handleUpdateStatus('STIFF', rid, s, r, st)} onUpdateMachine={(rid, m, st, mold) => setStiffImportRecords(stiffImportRecords.map(r => r.id === rid ? { ...r, productionProgress: { ...(r.productionProgress || {}), [st || r.stage]: { ...(r.productionProgress?.[st || r.stage] || { status: 'PENDING' }), machine: m, moldNo: mold } } } : r))} onLinkAccessory={(rid, lot, qty, st) => handleLinkAccessory('STIFF', rid, lot, qty, st || 'Process')} onUpdateMpsBatch={(b) => handleUpdateMpsBatch('STIFF', b)} onConfirmImport={(tps, pls) => handleConfirmImport('Stiff', tps, pls)} onUpdateNetData={setStiffNetData} onUpdateMachineSetup={setStiffMachines} stiffStaff={stiffStaff} setStiffStaff={setStiffStaff} attendanceHistory={attendanceHistory} onUpdateAttendanceHistory={setAttendanceHistory} overtimeRecords={overtimeRecords} onUpdateOvertime={setOvertimeRecords} moldImportRecords={moldImportRecords} targetPnl={deptTargets['Stiff']} />;
      case 'stiff_data_net': return <StiffNetData moduleName="Stiff" data={stiffNetData} onDataUpdate={setStiffNetData} />;
      case 'stiff_staff': return <StiffStaff data={staffRecords} onUpdate={setStaffRecords} attendanceHistory={attendanceHistory} onUpdateAttendanceHistory={setAttendanceHistory} />;
      case 'stiff_matrix_timekeeping': return <DepartmentTimekeepingMatrix department="STIFF" departmentTitle="Stiff" staffList={stiffStaff} allStaff={allStaff} attendanceHistory={attendanceHistory} overtimeRecords={overtimeRecords} />;
      case 'stiff_backup': return <MultiAutoBackupRestore moduleName="Stiff" language={language} importData={stiffImportRecords} exportData={stiffExportRecords} historyData={stiffHistory} machineData={stiffMachines} netData={stiffNetData} staffData={stiffStaff} setImportData={setStiffImportRecords} setExportData={setStiffExportRecords} setHistoryData={setStiffHistory} setMachineData={setStiffMachines} setNetData={setStiffNetData} setStaffData={setStiffStaff} />;

      // --- TAB KHUÔN & JIG ---
      case 'mj_import': return <MoldImport onAddBatch={recs => setMoldImportRecords([...recs.map(r => ({ ...r, id: Date.now() + Math.random(), date: new Date().toLocaleDateString('vi-VN'), timestamp: new Date().toLocaleTimeString('vi-VN'), isVerified: true })), ...moldImportRecords])} recentRecords={moldImportRecords} stampingNetData={stampingNetData} stiffNetData={stiffNetData} />;
      case 'mj_export': return <MoldExport importData={moldImportRecords} exportData={moldExportRecords} onAddBatch={recs => setMoldExportRecords([...recs.map(r => ({ ...r, id: Date.now() + Math.random(), date: new Date().toLocaleDateString('vi-VN'), timestamp: new Date().toLocaleTimeString('vi-VN'), shift: calculateCurrentShift() })), ...moldExportRecords])} language={language} />;
      case 'mj_tool_warehouse': return <MoldToolWarehouse importData={moldImportRecords} stampingHistory={stampingHistory} onDeleteTool={id => setMoldImportRecords(moldImportRecords.filter(m => m.id !== id))} onUpdateTool={upd => setMoldImportRecords(moldImportRecords.map(m => m.id === upd.id ? upd : m))} language={language} />;
      case 'mj_stock_mold': return <MoldStockInventory imports={moldImportRecords} netData={stampingNetData} language={language} onScrap={(item, type, reason) => { setMoldScrapRecords([{ id: Date.now(), date: new Date().toLocaleDateString('vi-VN'), timestamp: new Date().toLocaleTimeString('vi-VN'), type: item.note === 'MOLD_ASSET_IMPORT' ? 'MOLD' : 'JIG', moldNo: item.moldNo || '?', model: item.model, code: item.code, status: type, reason, operator: currentUser?.fullName || 'System', hitsAtScrap: item.currentHits, dieThicknessAtScrap: item.dieThickness, knifeHeightAtScrap: item.knifeHeight }, ...moldScrapRecords]); setMoldImportRecords(moldImportRecords.filter(m => m.id !== item.id)); }} onUpdateTool={(upd) => setMoldImportRecords(moldImportRecords.map(m => m.id === upd.id ? upd : m))} />;
      case 'mj_stock_jig': return <JigStockInventory imports={moldImportRecords} netData={stiffNetData} language={language} onScrap={(item, type, reason) => { setMoldScrapRecords([{ id: Date.now(), date: new Date().toLocaleDateString('vi-VN'), timestamp: new Date().toLocaleTimeString('vi-VN'), type: 'JIG', moldNo: item.moldNo || '?', model: item.model, code: item.code, status: type, reason, operator: currentUser?.fullName || 'System', hitsAtScrap: item.currentHits, dieThicknessAtScrap: item.dieThickness, knifeHeightAtScrap: item.knifeHeight }, ...moldScrapRecords]); setMoldImportRecords(moldImportRecords.filter(m => m.id !== item.id)); }} onUpdateTool={(upd) => setMoldImportRecords(moldImportRecords.map(m => m.id === upd.id ? upd : m))} />;
      case 'mj_history': return <MoldImportLedger data={moldImportRecords} />;
      case 'mj_scrap': return <MoldScrapList data={moldScrapRecords} />;
      case 'mj_net_data': return <MoldNetData data={moldNetData} onDataUpdate={setMoldNetData} />;
      case 'mj_staff': return <MoldStaff data={moldStaff} onUpdate={setMoldStaff} overtimeRecords={overtimeRecords} onUpdateOvertime={setOvertimeRecords} />;
      case 'mj_matrix_timekeeping': return <DepartmentTimekeepingMatrix department="MOLD" departmentTitle="Khuôn & Jig" staffList={moldStaff} allStaff={allStaff} attendanceHistory={attendanceHistory} overtimeRecords={overtimeRecords} />;
      case 'mj_backup': return <MultiAutoBackupRestore moduleName="Khuôn & Jig" language={language} importData={moldImportRecords} exportData={moldExportRecords} historyData={moldHistory} machineData={moldMachines} netData={moldNetData} staffData={moldStaff} setImportData={setMoldImportRecords} setExportData={setMoldExportRecords} setHistoryData={setMoldHistory} setMachineData={setMoldMachines} setNetData={setMoldNetData} setStaffData={setMoldStaff} setSalarySlips={setSalarySlipRecords} customData={{'MOLD_SCRAP': { data: moldScrapRecords, setter: setMoldScrapRecords }}} />;

      // --- TAB THIẾT BỊ ---
      case 'device_machine_setup': return <DeviceMachineMonitor multiMachines={machineStatuses} setMultiMachines={setMachineStatuses} stiffMachines={stiffMachines} setStiffMachines={setStiffMachines} moldMachines={moldMachines} setMoldMachines={setMoldMachines} stampingMachines={stampingMachines} setStampingMachines={setStampingMachines} spareParts={spareParts} onRepair={(mid, dept, cont, pid, q) => { const part = spareParts.find(p => p.id === pid); if (part) setSpareParts(spareParts.map(p => p.id === pid ? { ...p, quantity: p.quantity - q } : p)); setRepairHistory([{ id: Date.now(), department: dept, machineName: (dept === 'MULTI' ? machineStatuses : dept === 'STIFF' ? stiffMachines : dept === 'MOLD' ? moldMachines : stampingMachines).find(m => m.id === mid)?.name || '?', content: cont, replacementPart: part?.name, replacedQuantity: q, date: new Date().toLocaleDateString('vi-VN'), technician: currentUser?.fullName || 'KT' }, ...repairHistory]); }} faultRecords={faultRecords} />;
      case 'device_tool_registry': return <DeviceToolManagement data={toolRecords} onUpdate={setToolRecords} />;
      case 'device_spare_parts': return <SparePartsInventory data={spareParts} onUpdate={setSpareParts} />;
      case 'device_repair_history': return <RepairHistoryViewer data={repairHistory} />;
      case 'device_fault_registry': return <FaultRegistry data={faultRecords} onUpdate={setFaultRecords} language={language} />;
      case 'device_staff': return <DeviceStaff data={equipmentStaff} onUpdate={setEquipmentStaff} attendanceHistory={attendanceHistory} onUpdateAttendanceHistory={setAttendanceHistory} />;
      case 'device_matrix_timekeeping': return <DepartmentTimekeepingMatrix department="EQUIPMENT" departmentTitle="Thiết Bị" staffList={equipmentStaff} allStaff={allStaff} attendanceHistory={attendanceHistory} overtimeRecords={overtimeRecords} />;
      case 'eq_backup': return <MultiAutoBackupRestore moduleName="Thiết Bị" language={language} customData={{'EQ_TOOLS': {data: toolRecords, setter: setToolRecords}, 'EQ_SPARES': {data: spareParts, setter: setSpareParts}, 'EQ_REPAIRS': {data: repairHistory, setter: setRepairHistory}, 'EQ_FAULTS': {data: faultRecords, setter: setFaultRecords}, 'EQ_STAFF': {data: equipmentStaff, setter: setEquipmentStaff}}} />;

      // --- TAB HC & NS ---
      case 'staff_list': return <HRStaffManagement multiStaff={staffRecords} setMultiStaff={setStaffRecords} stiffStaff={stiffStaff} setStiffStaff={setStiffStaff} moldStaff={moldStaff} setMoldStaff={setMoldStaff} stampingStaff={stampingStaff} setStampingStaff={setStampingStaff} qualityStaff={qualityStaff} setQualityStaff={setQualityStaff} equipmentStaff={equipmentStaff} setEquipmentStaff={setEquipmentStaff} attendanceHistory={attendanceHistory} onUpdateAttendanceHistory={setAttendanceHistory} overtimeRecords={overtimeRecords} onUpdateOvertime={setOvertimeRecords} contracts={contracts} salarySlips={salarySlipRecords} payrollRecords={payrollRecords} announcements={announcements} timekeepingRecords={timekeepingRecords} attendanceRequests={attendanceRequests} onRequestCorrection={req => setAttendanceRequests([req, ...attendanceRequests])} attendanceConfirmations={attendanceConfirmations} onUpdateAttendanceConfirmation={setAttendanceConfirmations} />;
      case 'hr_add_staff': return <HRAddStaff multiStaff={staffRecords} setMultiStaff={setStaffRecords} stiffStaff={stiffStaff} setStiffStaff={setStiffStaff} moldStaff={moldStaff} setMoldStaff={setMoldStaff} stampingStaff={stampingStaff} setStampingStaff={setStampingStaff} equipmentStaff={equipmentStaff} setEquipmentStaff={setEquipmentStaff} />;
      case 'hr_contracts': return <HRContracts contracts={contracts} setContracts={setContracts} allStaff={allStaff} />;
      case 'hr_diary': return <HRAttendanceDiary allStaff={allStaff} attendanceHistory={attendanceHistory} onUpdateHistory={setAttendanceHistory} />;
      case 'timekeeping': return <HRTimekeeping data={timekeepingRecords} allStaff={allStaff} onUpdate={setTimekeepingRecords} attendanceRequests={attendanceRequests} onUpdateRequest={setAttendanceRequests} attendanceHistory={attendanceHistory} />;
      case 'hr_matrix_timekeeping': return <DepartmentTimekeepingMatrix department="ALL" departmentTitle="Toàn Nhà Máy (HC & NS)" staffList={allStaff} allStaff={allStaff} attendanceHistory={attendanceHistory} overtimeRecords={overtimeRecords} />;
      case 'hr_overtime': return <HROvertime allStaff={allStaff} overtimeRecords={overtimeRecords} onUpdateOvertime={setOvertimeRecords} />;
      case 'hr_leaves': return <HRLeaves allStaff={allStaff} />;
      case 'hr_payroll': return <HRPayroll payrollRecords={payrollRecords} setPayrollRecords={setPayrollRecords} allStaff={allStaff} />;
      case 'hr_salary_slip': return <HRSalarySlip salarySlips={salarySlipRecords} setSalarySlips={setSalarySlipRecords} allStaff={allStaff} />;
      case 'hr_assets': return <HRAssets data={hrAssets} onUpdate={setHrAssets} />;
      case 'hr_documents': return <HRDocuments data={documentRecords} onUpdate={setDocumentRecords} />;
      case 'hr_training': return <HRTraining data={trainingRecords} onUpdate={setTrainingRecords} />;
      case 'hr_backup': return <MultiAutoBackupRestore moduleName="HC & NS" language={language} customData={{'HR_CONTRACTS': {data: contracts, setter: setContracts}, 'HR_PAYROLLS': {data: payrollRecords, setter: setPayrollRecords}, 'HR_SLIPS': {data: salarySlipRecords, setter: setSalarySlipRecords}, 'HR_ANN_GRP': {data: announcements, setter: setAnnouncements}, 'HR_ASSETS': {data: hrAssets, setter: setHrAssets}, 'HR_TRAINING': {data: trainingRecords, setter: setTrainingRecords}, 'HR_DOCS': {data: documentRecords, setter: setDocumentRecords}, 'HR_ATT_REQ': {data: attendanceRequests, setter: setAttendanceRequests}}} />;

      // --- TAB ADMIN ---
      case 'users': return <AdminUserManagement users={userAccounts} onUpdateUsers={setUserAccounts} />;

      default: return <div className="p-20 text-center text-slate-500 font-bold uppercase tracking-widest text-xs">Mô đun {id} đang được thiết lập</div>;
    }
  };

  return (
    <div className="flex h-screen bg-[#020617] overflow-hidden text-slate-100 relative">
      <Sidebar 
        tabs={visibleTabs} 
        activeTabId={activeTab} 
        activeItemId={activeItem} 
        onTabChange={id => { 
          setActiveTab(id); 
        }} 
        onItemClick={id => { 
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
            activeTabLabel={currentTab ? (translations[language][currentTab.label] || currentTab.label) : ''} 
            activeItemLabel={currentItem ? (translations[language][currentItem.label] || currentItem.label) : ''} 
            toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
            isSidebarOpen={isSidebarOpen}
            isSyncing={isSyncing} 
            onSync={() => performSync(true)} 
            lastSyncTime={lastSyncTime} 
        />

        {/* Horizontal Quick Sub-Nav Ribbon - 1-click feature access with full-screen page width */}
        {currentTab && currentTab.groups.length > 0 && (
          <div className="h-10 bg-slate-950/80 border-b border-slate-800/80 px-4 flex items-center gap-1.5 overflow-x-auto custom-scrollbar shrink-0 select-none">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1 hidden sm:inline">
              {translations[language][currentTab.label] || currentTab.label}:
            </span>
            {currentTab.groups.flatMap(g => g.items).map(item => {
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
        )}

        <main className="flex-1 overflow-y-auto relative bg-[#020617] custom-scrollbar">
            {renderContent()}
        </main>
      </div>
      <Assistant isOpen={false} onClose={() => {}} context="" />
      <PWAPrompt />
    </div>
  );
}
