import React, { useState, useEffect } from 'react';
import {
  initGoogleAuth,
  signInWithGoogleSheets,
  logoutGoogleSheets,
  getCachedToken,
  createNewSpreadsheet,
  fetchSpreadsheetValues,
  updateSpreadsheetValues,
  listUserSpreadsheets,
} from '../services/googleSheets';
import { Product, Transaction, Attendance } from '../data';
import {
  Database,
  RefreshCw,
  FileSpreadsheet,
  UserCheck,
  LogOut,
  Download,
  Upload,
  ExternalLink,
  PlusCircle,
  AlertCircle,
  CheckCircle,
  HelpCircle,
  Sparkles,
  Inbox,
} from 'lucide-react';

interface GoogleSheetsPanelProps {
  products: Product[];
  onImportProducts: (updatedProducts: Product[]) => void;
  transactions: Transaction[];
  attendanceLogs: Attendance[];
}

export const GoogleSheetsPanel: React.FC<GoogleSheetsPanelProps> = ({
  products,
  onImportProducts,
  transactions,
  attendanceLogs,
}) => {
  // Auth states
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);

  // Sheets sync states
  const [userSpreadsheets, setUserSpreadsheets] = useState<{ id: string; name: string }[]>([]);
  const [selectedSpreadsheetId, setSelectedSpreadsheetId] = useState<string>('');
  const [customSpreadsheetId, setCustomSpreadsheetId] = useState<string>('');
  const [isLoadingSpreadsheets, setIsLoadingSpreadsheets] = useState<boolean>(false);
  
  // Action status logs
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' | null }>({
    text: '',
    type: null,
  });
  const [isActionInProgress, setIsActionInProgress] = useState<boolean>(false);

  // Initialize Auth on Mount
  useEffect(() => {
    const unsubscribe = initGoogleAuth(
      (user, token) => {
        setIsAuthenticated(true);
        setGoogleUser(user);
        setIsAuthLoading(false);
        // Load spreadsheets once authenticated
        loadSpreadsheets();
      },
      () => {
        setIsAuthenticated(false);
        setGoogleUser(null);
        setIsAuthLoading(false);
      }
    );

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  const loadSpreadsheets = async () => {
    setIsLoadingSpreadsheets(true);
    try {
      const files = await listUserSpreadsheets();
      setUserSpreadsheets(files);
      if (files.length > 0) {
        setSelectedSpreadsheetId(files[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load spreadsheets:', err);
    } finally {
      setIsLoadingSpreadsheets(false);
    }
  };

  const handleLogin = async () => {
    setIsActionInProgress(true);
    try {
      const result = await signInWithGoogleSheets();
      if (result) {
        setIsAuthenticated(true);
        setGoogleUser(result.user);
        showStatus('เข้าสู่ระบบด้วย Google สำเร็จเรียบร้อย!', 'success');
        // Fetch spreadsheets list
        const files = await listUserSpreadsheets();
        setUserSpreadsheets(files);
        if (files.length > 0) {
          setSelectedSpreadsheetId(files[0].id);
        }
      }
    } catch (err: any) {
      showStatus(`เกิดข้อผิดพลาดในการเชื่อมต่อ: ${err.message}`, 'error');
    } finally {
      setIsActionInProgress(false);
    }
  };

  const handleLogout = async () => {
    const confirmed = window.confirm('คุณต้องการยกเลิกการเชื่อมต่อกับ Google Accounts และ Google Sheets ใช่หรือไม่?');
    if (!confirmed) return;

    try {
      await logoutGoogleSheets();
      setIsAuthenticated(false);
      setGoogleUser(null);
      setUserSpreadsheets([]);
      setSelectedSpreadsheetId('');
      showStatus('ตัดการเชื่อมต่อบัญชีเรียบร้อยแล้ว', 'info');
    } catch (err: any) {
      showStatus(`ไม่สามารถออกจากระบบได้: ${err.message}`, 'error');
    }
  };

  const handleCreateNewSheet = async () => {
    setIsActionInProgress(true);
    showStatus('กำลังสร้างสเปรดชีตใหม่บน Google Drive...', 'info');
    try {
      const title = `WMS_Warehouse_Data_Sync_${new Date().toLocaleDateString('th-TH').replace(/\//g, '-')}`;
      const sheet = await createNewSpreadsheet(title);
      
      // Update spreadsheet options
      const updatedFiles = await listUserSpreadsheets();
      setUserSpreadsheets(updatedFiles);
      setSelectedSpreadsheetId(sheet.spreadsheetId);
      
      showStatus(`สร้างสเปรดชีตใหม่สำเร็จ: "${title}"`, 'success');
    } catch (err: any) {
      showStatus(`สร้างสเปรดชีตไม่สำเร็จ: ${err.message}`, 'error');
    } finally {
      setIsActionInProgress(false);
    }
  };

  const showStatus = (text: string, type: 'success' | 'error' | 'info' | null) => {
    setStatusMessage({ text, type });
    // Auto-clear message after 8 seconds
    if (type !== 'info') {
      setTimeout(() => {
        setStatusMessage(prev => prev.text === text ? { text: '', type: null } : prev);
      }, 8000);
    }
  };

  const getActiveSpreadsheetId = (): string => {
    return customSpreadsheetId.trim() || selectedSpreadsheetId;
  };

  // EXPORT 1: Products to active Spreadsheet
  const handleExportProducts = async () => {
    const sheetId = getActiveSpreadsheetId();
    if (!sheetId) {
      showStatus('กรุณาเลือกหรือป้อน Spreadsheet ID ก่อนการทำรายการ', 'error');
      return;
    }

    const confirmed = window.confirm(`คุณต้องการส่งออกข้อมูลพาร์ทสินค้าจำนวน ${products.length} รายการ ไปยังสเปรดชีตที่เลือกใช่หรือไม่? ข้อมูลเก่าในแผ่นงานแรกจะถูกเขียนทับ`);
    if (!confirmed) return;

    setIsActionInProgress(true);
    showStatus('กำลังส่งออกข้อมูลสินค้าไปยัง Google Sheets...', 'info');

    try {
      // Build Google Sheets format values
      const headers = [
        'Product ID',
        'SAP No',
        'Zone',
        'Customer',
        'Part No',
        'Part Name',
        'Full Box Qty',
        'Package Type',
        'Beginning Stock',
        'Inbound Qty',
        'Outbound Qty',
        'Current Stock'
      ];

      const rows = products.map((p) => [
        p.id,
        p.sapNo || '',
        p.zone || '',
        p.customer || '',
        p.partNo || '',
        p.partName || '',
        p.fullBox || 0,
        p.packageType || '',
        p.beginningStock || 0,
        p.inboundQty || 0,
        p.outboundQty || 0,
        p.currentStock || 0
      ]);

      const payload = [headers, ...rows];
      
      // Update values in range "A1:L" (active sheet tab)
      await updateSpreadsheetValues(sheetId, 'Sheet1!A1:L1000', payload);
      showStatus(`ส่งออกข้อมูลพาร์ทสินค้าจำนวน ${products.length} รายการ ไปยัง Google Sheets สำเร็จเรียบร้อย!`, 'success');
    } catch (err: any) {
      showStatus(`การส่งออกผิดพลาด: ${err.message}`, 'error');
    } finally {
      setIsActionInProgress(false);
    }
  };

  // EXPORT 2: Transactions log to active Spreadsheet
  const handleExportTransactions = async () => {
    const sheetId = getActiveSpreadsheetId();
    if (!sheetId) {
      showStatus('กรุณาเลือกหรือป้อน Spreadsheet ID ก่อนการทำรายการ', 'error');
      return;
    }

    const confirmed = window.confirm(`คุณต้องการส่งออกประวัติธุรกรรมคลังสินค้าจำนวน ${transactions.length} รายการ ไปยังแผ่นงานแรกของสเปรดชีตใช่หรือไม่?`);
    if (!confirmed) return;

    setIsActionInProgress(true);
    showStatus('กำลังส่งออกประวัติคลังสินค้า...', 'info');

    try {
      const headers = [
        'Label ID',
        'Part No',
        'Customer',
        'Transaction Type',
        'Sub-Type Detail',
        'Quantity (Pcs)',
        'Operator',
        'Timestamp',
        'Location'
      ];

      const rows = transactions.map((t) => [
        t.labelId || '',
        t.partNo || '',
        t.customer || '',
        t.type || '',
        t.subType || '',
        t.qty || 0,
        t.user || '',
        t.timestamp || '',
        t.location || ''
      ]);

      const payload = [headers, ...rows];
      await updateSpreadsheetValues(sheetId, 'Sheet1!A1:I1000', payload);
      showStatus(`ส่งออกประวัติธุรกรรมจำนวน ${transactions.length} รายการสำเร็จ!`, 'success');
    } catch (err: any) {
      showStatus(`การส่งออกผิดพลาด: ${err.message}`, 'error');
    } finally {
      setIsActionInProgress(false);
    }
  };

  // EXPORT 3: Attendance logs to active Spreadsheet
  const handleExportAttendance = async () => {
    const sheetId = getActiveSpreadsheetId();
    if (!sheetId) {
      showStatus('กรุณาเลือกหรือป้อน Spreadsheet ID ก่อนการทำรายการ', 'error');
      return;
    }

    const confirmed = window.confirm(`คุณต้องการส่งออกข้อมูลประวัติลงเวลาทำงานและใบลาของพนักงานจำนวน ${attendanceLogs.length} รายการ ใช่หรือไม่?`);
    if (!confirmed) return;

    setIsActionInProgress(true);
    showStatus('กำลังส่งออกข้อมูลพนักงาน...', 'info');

    try {
      const headers = [
        'Log ID',
        'Employee ID',
        'Employee Name',
        'Date',
        'Check-In',
        'Check-Out',
        'Work Hours',
        'OT Hours',
        'Shift Code',
        'Status',
        'Leave Type',
        'Reason Detail'
      ];

      const rows = attendanceLogs.map((log) => [
        log.id || '',
        log.employeeId || '',
        log.employeeName || '',
        log.date || '',
        log.checkIn || '',
        log.checkOut || '',
        log.workHours || 0,
        log.otHours || 0,
        log.shift || '',
        log.status || '',
        log.leaveType || '',
        log.reason || ''
      ]);

      const payload = [headers, ...rows];
      await updateSpreadsheetValues(sheetId, 'Sheet1!A1:L1000', payload);
      showStatus(`ส่งออกข้อมูลประวัติการทำงานของพนักงานจำนวน ${attendanceLogs.length} รายการสำเร็จ!`, 'success');
    } catch (err: any) {
      showStatus(`การส่งออกผิดพลาด: ${err.message}`, 'error');
    } finally {
      setIsActionInProgress(false);
    }
  };

  // IMPORT 1: Import products from Spreadsheet back into WMS local store
  const handleImportProducts = async () => {
    const sheetId = getActiveSpreadsheetId();
    if (!sheetId) {
      showStatus('กรุณาเลือกหรือป้อน Spreadsheet ID ก่อนการทำรายการ', 'error');
      return;
    }

    const confirmed = window.confirm('คำเตือน: การนำเข้าข้อมูลสินค้าจาก Google Sheets จะทำหารจับคู่รหัส Product ID / Part No และปรับปรุงยอดสต๊อกหน้าคลังสินค้าในระบบปัจจุบันโดยอัตโนมัติ คุณต้องการดำเนินรายการต่อใช่หรือไม่?');
    if (!confirmed) return;

    setIsActionInProgress(true);
    showStatus('กำลังโหลดข้อมูลสินค้าจากสเปรดชีตเพื่อนำเข้า...', 'info');

    try {
      const rows = await fetchSpreadsheetValues(sheetId, 'Sheet1!A1:L1000');
      
      if (rows.length <= 1) {
        throw new Error('ไม่พบข้อมูลใดๆ หรือพบเฉพาะแถวหัวข้อในสเปรดชีต');
      }

      // Check headers index
      const headers = rows[0].map(h => String(h).trim().toLowerCase());
      
      const idxId = headers.indexOf('product id');
      const idxPartNo = headers.indexOf('part no');
      const idxSapNo = headers.indexOf('sap no');
      const idxZone = headers.indexOf('zone');
      const idxCustomer = headers.indexOf('customer');
      const idxPartName = headers.indexOf('part name');
      const idxFullBox = headers.indexOf('full box qty');
      const idxPackageType = headers.indexOf('package type');
      const idxBeginningStock = headers.indexOf('beginning stock');
      const idxInboundQty = headers.indexOf('inbound qty');
      const idxOutboundQty = headers.indexOf('outbound qty');
      const idxCurrentStock = headers.indexOf('current stock');

      if (idxPartNo === -1 || idxCurrentStock === -1) {
        throw new Error('ไม่พบหัวข้อคอลัมน์ที่จำเป็น: "Part No" และ "Current Stock" ในแถวแรกของสเปรดชีต');
      }

      const importedProducts: Product[] = [];
      const updatedCount = { updated: 0, added: 0 };

      // Clone existing products to merge
      const existingProducts = [...products];

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;

        const partNoVal = String(row[idxPartNo] || '').trim();
        if (!partNoVal) continue;

        const customerVal = idxCustomer !== -1 ? String(row[idxCustomer] || '').trim() : 'DEFAULT';
        const productIdVal = idxId !== -1 && String(row[idxId] || '').trim() 
          ? String(row[idxId]).trim() 
          : `${customerVal}-${partNoVal}`;

        const sapNoVal = idxSapNo !== -1 ? String(row[idxSapNo] || '').trim() : '';
        const zoneVal = idxZone !== -1 ? String(row[idxZone] || '').trim() : 'A1';
        const partNameVal = idxPartName !== -1 ? String(row[idxPartName] || '').trim() : partNoVal;
        const fullBoxVal = idxFullBox !== -1 ? Number(row[idxFullBox]) || 100 : 100;
        const packageTypeVal = idxPackageType !== -1 ? String(row[idxPackageType] || '').trim() : 'BOX';
        const beginningStockVal = idxBeginningStock !== -1 ? Number(row[idxBeginningStock]) || 0 : 0;
        const inboundQtyVal = idxInboundQty !== -1 ? Number(row[idxInboundQty]) || 0 : 0;
        const outboundQtyVal = idxOutboundQty !== -1 ? Number(row[idxOutboundQty]) || 0 : 0;
        const currentStockVal = Number(row[idxCurrentStock]) || 0;

        // Try to match existing product
        const matchIdx = existingProducts.findIndex(p => p.id === productIdVal || p.partNo === partNoVal);

        if (matchIdx !== -1) {
          // Update details
          existingProducts[matchIdx] = {
            ...existingProducts[matchIdx],
            sapNo: sapNoVal || existingProducts[matchIdx].sapNo,
            zone: zoneVal || existingProducts[matchIdx].zone,
            partName: partNameVal || existingProducts[matchIdx].partName,
            fullBox: fullBoxVal,
            packageType: packageTypeVal,
            beginningStock: beginningStockVal,
            inboundQty: inboundQtyVal,
            outboundQty: outboundQtyVal,
            currentStock: currentStockVal,
          };
          updatedCount.updated += 1;
        } else {
          // Add as new product
          const newProduct: Product = {
            id: productIdVal,
            sapNo: sapNoVal,
            zone: zoneVal,
            customer: customerVal,
            partNo: partNoVal,
            partName: partNameVal,
            fullBox: fullBoxVal,
            packageType: packageTypeVal,
            beginningStock: beginningStockVal,
            inboundQty: inboundQtyVal,
            outboundQty: outboundQtyVal,
            currentStock: currentStockVal,
          };
          existingProducts.push(newProduct);
          updatedCount.added += 1;
        }
      }

      // Submit merged products back to state
      onImportProducts(existingProducts);
      showStatus(`นำเข้าเรียบร้อย! อัปเดตข้อมูลสินค้าเดิม ${updatedCount.updated} รายการ, เพิ่มสินค้าใหม่ ${updatedCount.added} รายการ`, 'success');
    } catch (err: any) {
      showStatus(`นำเข้าข้อมูลไม่สำเร็จ: ${err.message}`, 'error');
    } finally {
      setIsActionInProgress(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner and Auth Check */}
      <div className="bg-white border border-slate-200 rounded p-4 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600 animate-pulse" />
              การเชื่อมต่อข้อมูล Google Sheets (Google Sheets Integration Hub)
            </h2>
            <p className="text-xs text-slate-400">
              จัดการเชื่อมโยงข้อมูลสต๊อกคงคลัง, ประวัติการจัดส่งออก, และประวัติลงเวลาทำงานพนักงานอย่างราบรื่นกับแผ่นงาน Google Sheets
            </p>
          </div>

          <div className="shrink-0">
            {isAuthLoading ? (
              <div className="flex items-center gap-2 text-xs text-slate-400 font-bold">
                <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
                กำลังตรวจสอบการเชื่อมต่อ...
              </div>
            ) : isAuthenticated && googleUser ? (
              <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded text-xs">
                <div className="text-right">
                  <div className="font-bold text-slate-800 flex items-center gap-1 justify-end">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                    {googleUser.displayName || 'Google User'}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">{googleUser.email}</div>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all"
                  title="ตัดการเชื่อมต่อบัญชี"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleLogin}
                disabled={isActionInProgress}
                className="gsi-material-button hover:scale-102 transition-all cursor-pointer shadow-sm active:scale-98"
              >
                <div className="gsi-material-button-state"></div>
                <div className="gsi-material-button-content-wrapper">
                  <div className="gsi-material-button-icon">
                    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block' }}>
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                    </svg>
                  </div>
                  <span className="gsi-material-button-contents font-bold">เชื่อมต่อด้วย Google Accounts</span>
                </div>
              </button>
            )}
          </div>
        </div>

        {/* Action Status Notification Bar */}
        {statusMessage.text && (
          <div className={`mt-4 p-3 rounded border text-xs flex items-center gap-2 font-medium ${
            statusMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
            statusMessage.type === 'error' ? 'bg-rose-50 text-rose-800 border-rose-200 animate-shake' :
            'bg-blue-50 text-blue-800 border-blue-200'
          }`}>
            {statusMessage.type === 'success' && <CheckCircle className="w-4 h-4 shrink-0" />}
            {statusMessage.type === 'error' && <AlertCircle className="w-4 h-4 shrink-0" />}
            {statusMessage.type === 'info' && <RefreshCw className="w-4 h-4 shrink-0 animate-spin" />}
            <span>{statusMessage.text}</span>
          </div>
        )}
      </div>

      {isAuthenticated ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          
          {/* Left panel: Spreadsheet Configuration */}
          <div className="bg-white border border-slate-200 rounded p-4 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b pb-2">
              <Database className="w-4 h-4 text-indigo-500" />
              1. เลือกแหล่งข้อมูลสเปรดชีต (Spreadsheet Selection)
            </h3>

            {/* Selector list */}
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 block">ค้นพบสเปรดชีตของคุณล่าสุด (Drive Files):</label>
                {isLoadingSpreadsheets ? (
                  <div className="flex items-center gap-1 text-[11px] text-slate-400">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> โหลดรายชื่อไฟล์...
                  </div>
                ) : userSpreadsheets.length > 0 ? (
                  <select
                    value={selectedSpreadsheetId}
                    onChange={(e) => {
                      setSelectedSpreadsheetId(e.target.value);
                      setCustomSpreadsheetId(''); // Clear manual input
                    }}
                    className="w-full border p-2 rounded text-xs bg-slate-50 font-medium"
                  >
                    {userSpreadsheets.map((file) => (
                      <option key={file.id} value={file.id}>{file.name}</option>
                    ))}
                  </select>
                ) : (
                  <div className="text-[11px] text-slate-400 bg-slate-50 p-2 rounded border border-dashed border-slate-200">
                    ไม่พบคลังสเปรดชีตบน Drive กรุณาสร้างไฟล์ใหม่ด้านล่าง
                  </div>
                )}
              </div>

              {/* Action Button: Create New */}
              <button
                onClick={handleCreateNewSheet}
                disabled={isActionInProgress}
                className="w-full border border-indigo-200 hover:border-indigo-400 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-700 font-bold py-2 px-3 rounded text-xs flex items-center justify-center gap-1.5 transition-all"
              >
                <PlusCircle className="w-4 h-4" />
                สร้างสเปรดชีตซิงก์ข้อมูลใหม่ (Create New Sheet)
              </button>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink mx-4 text-[10px] text-slate-400 font-bold uppercase">หรือระบุ ID เอง</span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 block">ป้อน Spreadsheet ID ด้วยตนเอง (Manual ID):</label>
                <input
                  type="text"
                  value={customSpreadsheetId}
                  onChange={(e) => setCustomSpreadsheetId(e.target.value)}
                  placeholder="ป้อน Spreadsheet ID จากบราวเซอร์ URL"
                  className="w-full border p-2 rounded text-xs outline-none bg-slate-50 focus:bg-white"
                />
                <span className="text-[9px] text-slate-400 block leading-tight">
                  ป้อนค่า ID เช่น: 1b_L0X... (หากต้องการชี้ไปที่ Spreadsheet อื่นนอกลิสต์)
                </span>
              </div>

              {/* Active Sheet Link */}
              {getActiveSpreadsheetId() && (
                <div className="p-3 bg-slate-50 rounded border border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-700">
                  <div className="truncate pr-2">
                    <span>แผ่นงานที่ระบุ:</span>
                    <p className="text-[10px] font-mono text-slate-400 truncate mt-0.5">{getActiveSpreadsheetId()}</p>
                  </div>
                  <a
                    href={`https://docs.google.com/spreadsheets/d/${getActiveSpreadsheetId()}/edit`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 bg-white border rounded hover:bg-slate-100 text-slate-600 transition-all shadow-sm flex items-center"
                    title="เปิดสเปรดชีตในหน้าต่างใหม่"
                  >
                    <ExternalLink className="w-4 h-4 text-emerald-600" />
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Right panel (columns 2 & 3): Synchronize Features */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded p-4 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b pb-2">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              2. เลือกรายการที่จะทำการซิงก์ข้อมูล (Synchronization Actions)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Product Inventory Card */}
              <div className="border border-slate-200 rounded-lg p-4 space-y-3 hover:border-emerald-300 transition-all hover:shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    📦 ข้อมูลพาร์ทคลังสินค้า (Products & Inventory)
                  </span>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded">
                    {products.length} รายการ
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  ส่งออกข้อมูลพาร์ทสินค้า, สต๊อกตั้งต้น และจำนวนคงเหลือปัจจุบันไปที่ Google Sheets หรือ ดึงข้อมูลสต๊อกที่อัปเดตบนสเปรดชีตกลับเข้ามาอัปเดตในระบบ WMS
                </p>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    onClick={handleExportProducts}
                    disabled={isActionInProgress}
                    className="py-2 px-3 border border-emerald-600 bg-white hover:bg-emerald-50 text-emerald-700 font-bold rounded text-xs flex items-center justify-center gap-1 transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    ส่งออกข้อมูล (Export)
                  </button>

                  <button
                    onClick={handleImportProducts}
                    disabled={isActionInProgress}
                    className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-xs flex items-center justify-center gap-1 transition-all"
                  >
                    <Upload className="w-3.5 h-3.5 animate-bounce" />
                    นำเข้าและซิงก์ (Import)
                  </button>
                </div>
              </div>

              {/* Warehouse Transactions Card */}
              <div className="border border-slate-200 rounded-lg p-4 space-y-3 hover:border-indigo-300 transition-all hover:shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    📑 ประวัติรับ-จ่าย-ย้ายพาร์ท (Transactions Log)
                  </span>
                  <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-1.5 py-0.5 rounded">
                    {transactions.length} รายการ
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  ส่งออกข้อมูลบันทึกธุรกรรมการนำเข้าพาร์ท (Receiving), ย้ายพื้นที่จัดเก็บ (Transfer), และการเบิกส่งมอบ (Outbound) ทั้งหมดสำหรับทำรายงานหรือตรวจสอบภายนอก
                </p>

                <div className="pt-2">
                  <button
                    onClick={handleExportTransactions}
                    disabled={isActionInProgress}
                    className="w-full py-2 px-3 border border-indigo-600 bg-white hover:bg-indigo-50 text-indigo-700 font-bold rounded text-xs flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    ส่งออกประวัติคลังสินค้า (Export To Sheet)
                  </button>
                </div>
              </div>

              {/* Attendance and Leave Logs Card */}
              <div className="border border-slate-200 rounded-lg p-4 space-y-3 hover:border-purple-300 transition-all hover:shadow-sm md:col-span-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    ⏰ ข้อมูลลงเวลาและยื่นใบลาพนักงาน (Attendance & Leave Records)
                  </span>
                  <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-1.5 py-0.5 rounded">
                    {attendanceLogs.length} บันทึก
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  ส่งออกตารางข้อมูลการลงเวลาเช้า-เย็น, ยอดชั่วโมงการทำงานปกติ, ชั่วโมงค่าล่วงเวลา (OT) และสถานะการขออนุมัติวันหยุดทั้งหมดในแผนกเพื่อส่งต่อทีมฝ่ายบุคคล (HR)
                </p>

                <div className="pt-2">
                  <button
                    onClick={handleExportAttendance}
                    disabled={isActionInProgress}
                    className="w-full py-2 px-3 border border-purple-600 bg-white hover:bg-purple-50 text-purple-700 font-bold rounded text-xs flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    ส่งออกข้อมูลลงเวลาพนักงาน (Export Staff Timesheet)
                  </button>
                </div>
              </div>

            </div>

            {/* Instruction block */}
            <div className="bg-slate-50 rounded p-3 border text-[11px] text-slate-500 space-y-1.5">
              <span className="font-bold flex items-center gap-1 text-slate-700">
                <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
                คำแนะนำขั้นตอนการเชื่อมโยงข้อมูล (How to Sync Data):
              </span>
              <ul className="list-decimal pl-4 space-y-1">
                <li>หากยังไม่มีสเปรดชีตในการใช้งาน ให้กดปุ่ม <strong>"สร้างสเปรดชีตซิงก์ข้อมูลใหม่"</strong> เพื่อสร้างไฟล์ทันที</li>
                <li>เมื่อต้องการนำข้อมูลออก ให้กดปุ่ม <strong>"ส่งออกข้อมูล (Export)"</strong> และเข้าสเปรดชีตเพื่อดูข้อมูลในแผ่นงาน Sheet1</li>
                <li>คุณสามารถแก้ไขยอดสต๊อกสินค้าในคอลัมน์ <code className="bg-slate-200 px-1 py-0.5 rounded">Current Stock</code>, <code className="bg-slate-200 px-1 py-0.5 rounded">Part Name</code> หรือ <code className="bg-slate-200 px-1 py-0.5 rounded">Zone</code> บน Google Sheet โดยคงรหัส <code className="bg-slate-200 px-1 py-0.5 rounded">Part No</code> เดิมไว้</li>
                <li>เมื่อปรับปรุงสต๊อกในสเปรดชีตแล้ว ให้กลับมากดปุ่ม <strong>"นำเข้าและซิงก์ (Import)"</strong> ใน WMS เพื่อดึงข้อมูลมาแทนที่และอัปเดตระบบในคลิกเดียว</li>
              </ul>
            </div>
          </div>

        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg p-12 text-center space-y-4 shadow-sm max-w-lg mx-auto">
          <div className="bg-slate-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto text-slate-400">
            <Inbox className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h4 className="font-bold text-sm text-slate-900">กรุณาเชื่อมโยงบัญชี Google ของคุณเพื่อเข้าใช้ Google Sheets</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
              ฟังก์ชั่นนี้ต้องการสิทธิ์การเขียนและอ่านไฟล์สเปรดชีตเพื่อแลกเปลี่ยนข้อมูลสต๊อกสินค้าและพนักงานโดยตรงกับ Google Drive ของคุณอย่างปลอดภัย
            </p>
          </div>
          <button
            onClick={handleLogin}
            className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black rounded shadow-sm hover:scale-105 transition-all inline-flex items-center gap-2"
          >
            เริ่มต้นเชื่อมต่อระบบ (Sign in with Google)
          </button>
        </div>
      )}
    </div>
  );
};
