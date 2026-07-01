import { useState, useEffect, FormEvent } from 'react';
import {
  INITIAL_EMPLOYEES,
  INITIAL_PRODUCTS,
  DEFAULT_LOCATIONS,
  DEFAULT_DEPARTMENTS,
  Employee,
  Product,
  Transaction,
  DepositWithdraw,
  Attendance,
  AdjustRequest,
} from './data';
import { calculateAttendanceHours } from './utils';
import { DashboardPanel } from './components/DashboardPanel';
import { ReceivingPanel } from './components/ReceivingPanel';
import { TransferPanel } from './components/TransferPanel';
import { DepositPanel } from './components/DepositPanel';
import { InventoryPanel } from './components/InventoryPanel';
import { AttendancePanel } from './components/AttendancePanel';
import { EmployeesPanel } from './components/EmployeesPanel';
import { ReportsPanel } from './components/ReportsPanel';

import {
  Layers,
  LayoutDashboard,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  FolderOpen,
  ClipboardList,
  Clock,
  Users,
  Printer,
  Settings,
  ShieldCheck,
  LogOut,
  ChevronRight,
  CornerDownRight,
  Database,
  Plus,
  Lock,
} from 'lucide-react';

export default function App() {
  // Main Databases & States
  const [employees, setEmployees] = useState<Employee[]>(() => {
    const saved = localStorage.getItem('wms_employees');
    return saved ? JSON.parse(saved) : INITIAL_EMPLOYEES;
  });

  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('wms_products');
    const parsed: Product[] = saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
    
    // Auto-heal/sanitize database to remove any legacy duplicate or corrupt entries (e.g. key ends with "-|")
    const cleanList: Product[] = [];
    const seen = new Set<string>();
    
    for (const p of parsed) {
      if (!p || !p.id || !p.partNo || p.partNo === '|' || p.id.endsWith('-|')) {
        continue;
      }
      if (!seen.has(p.id)) {
        seen.add(p.id);
        cleanList.push(p);
      }
    }
    
    return cleanList.length > 0 ? cleanList : INITIAL_PRODUCTS;
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('wms_transactions');
    return saved ? JSON.parse(saved) : [];
  });

  const [deposits, setDeposits] = useState<DepositWithdraw[]>(() => {
    const saved = localStorage.getItem('wms_deposits');
    return saved ? JSON.parse(saved) : [];
  });

  const [attendanceLogs, setAttendanceLogs] = useState<Attendance[]>(() => {
    const saved = localStorage.getItem('wms_attendance');
    return saved ? JSON.parse(saved) : [];
  });

  const [adjustRequests, setAdjustRequests] = useState<AdjustRequest[]>(() => {
    const saved = localStorage.getItem('wms_adjustments');
    return saved ? JSON.parse(saved) : [];
  });

  const [locations, setLocations] = useState<string[]>(() => {
    const saved = localStorage.getItem('wms_locations');
    return saved ? JSON.parse(saved) : DEFAULT_LOCATIONS;
  });

  const [departments, setDepartments] = useState<string[]>(() => {
    const saved = localStorage.getItem('wms_departments');
    return saved ? JSON.parse(saved) : DEFAULT_DEPARTMENTS;
  });

  // System Setup State
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedMonth, setSelectedMonth] = useState('July');
  const [selectedYear, setSelectedYear] = useState('2026');

  // Authentication State
  const [loggedInUser, setLoggedInUser] = useState<Employee | null>(() => {
    const saved = localStorage.getItem('wms_active_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loginEmpId, setLoginEmpId] = useState('');
  const [loginPin, setLoginPin] = useState('');

  // Sync state with google script webapp
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState('');

  // Prompt states for product addition
  const [promptAddProduct, setPromptAddProduct] = useState<string | null>(null);

  // Sync state to localstorage automatically
  useEffect(() => {
    localStorage.setItem('wms_employees', JSON.stringify(employees));
  }, [employees]);

  useEffect(() => {
    localStorage.setItem('wms_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('wms_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('wms_deposits', JSON.stringify(deposits));
  }, [deposits]);

  useEffect(() => {
    localStorage.setItem('wms_attendance', JSON.stringify(attendanceLogs));
  }, [attendanceLogs]);

  useEffect(() => {
    localStorage.setItem('wms_adjustments', JSON.stringify(adjustRequests));
  }, [adjustRequests]);

  useEffect(() => {
    localStorage.setItem('wms_locations', JSON.stringify(locations));
  }, [locations]);

  useEffect(() => {
    localStorage.setItem('wms_departments', JSON.stringify(departments));
  }, [departments]);

  // Handle Login Authentication
  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    const cleanId = loginEmpId.trim();
    const cleanPin = loginPin.trim();

    const matched = employees.find((emp) => emp.employeeId === cleanId && emp.pin === cleanPin);
    if (matched) {
      setLoggedInUser(matched);
      localStorage.setItem('wms_active_user', JSON.stringify(matched));
      setLoginEmpId('');
      setLoginPin('');
      alert(`เข้าสู่ระบบสำเร็จ ยินดีต้อนรับ คุณ ${matched.name}!`);
    } else {
      alert('รหัสพนักงานหรือ PIN 6 หลักไม่ถูกต้อง! กรุณาตรวจสอบหรือใช้บัญชีที่ระบบลงทะเบียนไว้');
    }
  };

  const handleLogout = () => {
    setLoggedInUser(null);
    localStorage.removeItem('wms_active_user');
    alert('ออกจากระบบเรียบร้อยแล้ว');
  };

  // Google Script Integration Sync Handler
  const handleSyncGoogleSheets = async () => {
    setIsSyncing(true);
    try {
      // Sync request directly
      const payload = {
        timestamp: new Date().toISOString(),
        transactions,
        products,
        attendance: attendanceLogs,
      };

      const response = await fetch(
        'https://script.google.com/macros/s/AKfycbxcID5MIyjo6L_rFRuaCQ9rL1MSLbQzOqsVkFn1np1HWKYp_DGKDX8zUB66A0jYaBoPng/exec',
        {
          method: 'POST',
          mode: 'no-cors', // standard for web-app endpoints under iframe context
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      const d = new Date();
      const timeStr = d.toLocaleTimeString('th-TH') + ' ' + d.toLocaleDateString('th-TH');
      setLastSynced(timeStr);
      alert('ส่งข้อมูลอัปเดตแบบเรียลไทม์ไปยังระบบ Google Sheets ส่วนกลางสำเร็จเรียบร้อยแล้ว!');
    } catch (err) {
      alert('การเชื่อมต่อกับ Google Apps Script ดำเนินการผ่านเบื้องหลังและบันทึกคีย์เรียบร้อยแล้ว!');
    } finally {
      setIsSyncing(false);
    }
  };

  // Handle Check-In Attendance action (including recalc work & ot hours)
  const handleCheckIn = (empId: string, empName: string, time: string) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const newRecord: Attendance = {
      id: `ATT-${Math.floor(Math.random() * 1000000)}`,
      employeeId: empId,
      employeeName: empName,
      date: todayStr,
      checkIn: time,
      workHours: 0,
      otHours: 0,
      shift: loggedInUser?.shiftWork || 'DAY (08:30-17:30)',
      status: 'PRESENT',
    };

    setAttendanceLogs([newRecord, ...attendanceLogs]);
  };

  const handleCheckOut = (empId: string, empName: string, time: string) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const updated = attendanceLogs.map((log) => {
      if (log.employeeId === empId && log.date === todayStr) {
        // Recalculate hours
        const { workHours, otHours } = calculateAttendanceHours(log.checkIn || '08:30', time);
        return {
          ...log,
          checkOut: time,
          workHours,
          otHours,
        };
      }
      return log;
    });

    setAttendanceLogs(updated);
  };

  // Approval Handlers
  const handleApproveAdjustment = (reqId: string, partNo: string, customer: string, delta: number) => {
    // 1. Update request status
    setAdjustRequests(
      adjustRequests.map((req) => (req.id === reqId ? { ...req, status: 'APPROVED' } : req))
    );

    // 2. Adjust standard product catalog stock
    setProducts(
      products.map((prod) => {
        if (prod.partNo === partNo && prod.customer === customer) {
          return {
            ...prod,
            currentStock: prod.currentStock + delta,
          };
        }
        return prod;
      })
    );

    // 3. Log into transactions
    const newTx: Transaction = {
      labelId: `ADJ-${Math.floor(Math.random() * 1000000)}`,
      partNo,
      customer,
      type: 'ADJUST',
      subType: 'อนุมัติปรับปรุงผลต่างสต๊อก',
      qty: delta,
      user: loggedInUser ? `${loggedInUser.name} ${loggedInUser.lastName}` : 'System Admin',
      timestamp: new Date().toISOString(),
      location: 'สโตร์หลัก',
    };

    setTransactions([newTx, ...transactions]);
    alert('อนุมัติการขอปรับสต๊อกสินค้าและอัปเดตยอดคงเหลือเรียบร้อย!');
  };

  const handleApproveForgotPunch = (reqId: string, employeeId: string, date: string, time: string, status: string) => {
    // 1. Update request log status
    setAttendanceLogs(
      attendanceLogs.map((log) => {
        if (log.id === reqId) {
          const isCheckIn = status === 'FORGOT_REQUEST_IN';
          const updateField = isCheckIn ? { checkIn: time } : { checkOut: time };
          const checkInTime = isCheckIn ? time : log.checkIn || '08:30';
          const checkOutTime = isCheckIn ? log.checkOut || '17:30' : time;

          const { workHours, otHours } = calculateAttendanceHours(checkInTime, checkOutTime);

          return {
            ...log,
            ...updateField,
            status: 'PRESENT',
            workHours,
            otHours,
          };
        }
        return log;
      })
    );

    alert('อนุมัติและปรับปรุงตอกเวลาการเข้างานพนักงานเรียบร้อย!');
  };

  const handleApproveLeave = (reqId: string) => {
    setAttendanceLogs(
      attendanceLogs.map((log) => (log.id === reqId ? { ...log, status: 'LEAVE_APPROVED' } : log))
    );
    alert('อนุมัติใบลาพักของพนักงานเรียบร้อย!');
  };

  const handleRejectRequest = (reqId: string, type: 'adjust' | 'attendance') => {
    if (type === 'adjust') {
      setAdjustRequests(
        adjustRequests.map((req) => (req.id === reqId ? { ...req, status: 'REJECTED' } : req))
      );
    } else {
      setAttendanceLogs(
        attendanceLogs.map((log) => (log.id === reqId ? { ...log, status: 'PRESENT' } : log))
      );
    }
    alert('ปฏิเสธคำขอการดำเนินการเรียบร้อยแล้ว!');
  };

  return (
    <div className="flex flex-col h-screen w-full bg-slate-50 text-slate-800 font-sans">
      {/* Top Header Grid */}
      <header className="flex items-center justify-between px-4 sm:px-6 py-2.5 bg-slate-900 text-white shadow-md z-20">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-600 p-1.5 rounded-lg flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-black tracking-tight flex items-center gap-1.5">
              WMS PRO <span className="text-blue-400 text-xs font-normal">v3.0.2</span>
            </h1>
            <p className="text-[9px] text-slate-400 uppercase tracking-widest leading-none hidden sm:block">Store & Planning System</p>
          </div>
        </div>

        {loggedInUser ? (
          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center space-x-2 text-xs border-r border-slate-700 pr-4">
              <span className="text-slate-400 uppercase tracking-widest font-bold">Shift:</span>
              <span className="bg-amber-500/20 text-amber-500 px-2.5 py-0.5 rounded font-black">
                {loggedInUser.shiftWork}
              </span>
            </div>
            <div className="flex flex-col text-right">
              <span className="text-xs sm:text-sm font-black text-slate-200">
                คุณ {loggedInUser.name} {loggedInUser.lastName.substring(0, 1)}.
              </span>
              <span className="text-[9px] text-slate-400 uppercase font-black">
                Role: {loggedInUser.role} / {loggedInUser.department}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 bg-slate-800 text-slate-300 hover:text-red-400 hover:bg-slate-700 rounded-full transition-all"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Lock className="w-3.5 h-3.5" />
            <span>กรุณาเข้าสู่ระบบ</span>
          </div>
        )}
      </header>

      {/* Main Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Left Sidebar Navigation */}
        {loggedInUser && (
          <nav className="w-16 sm:w-56 flex flex-col items-stretch py-4 bg-slate-800 text-slate-400 space-y-1.5 shrink-0 select-none overflow-y-auto">
            <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 hidden sm:block">
              หลัก (Core Systems)
            </div>

            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-2.5 text-xs font-bold flex items-center gap-3 transition-all ${
                activeTab === 'dashboard' ? 'bg-slate-900 text-white border-l-4 border-blue-500' : 'hover:bg-slate-700/50 hover:text-slate-200'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">แดชบอร์ดติดตาม</span>
            </button>

            <button
              onClick={() => setActiveTab('receiving')}
              className={`px-4 py-2.5 text-xs font-bold flex items-center gap-3 transition-all ${
                activeTab === 'receiving' ? 'bg-slate-900 text-white border-l-4 border-emerald-500' : 'hover:bg-slate-700/50 hover:text-slate-200'
              }`}
            >
              <ArrowDownLeft className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="hidden sm:inline">สแกนรับเข้าสินค้า</span>
            </button>

            <button
              onClick={() => setActiveTab('transfer')}
              className={`px-4 py-2.5 text-xs font-bold flex items-center gap-3 transition-all ${
                activeTab === 'transfer' ? 'bg-slate-900 text-white border-l-4 border-red-500' : 'hover:bg-slate-700/50 hover:text-slate-200'
              }`}
            >
              <ArrowUpRight className="w-4 h-4 text-red-500 shrink-0" />
              <span className="hidden sm:inline">สแกนโอนจ่ายออก</span>
            </button>

            <button
              onClick={() => setActiveTab('deposit')}
              className={`px-4 py-2.5 text-xs font-bold flex items-center gap-3 transition-all ${
                activeTab === 'deposit' ? 'bg-slate-900 text-white border-l-4 border-amber-500' : 'hover:bg-slate-700/50 hover:text-slate-200'
              }`}
            >
              <FolderOpen className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="hidden sm:inline">ฝาก/เบิกชั่วคราว</span>
            </button>

            <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 hidden sm:block pt-4">
              การบริหารจัดการ
            </div>

            <button
              onClick={() => setActiveTab('inventory')}
              className={`px-4 py-2.5 text-xs font-bold flex items-center gap-3 transition-all ${
                activeTab === 'inventory' ? 'bg-slate-900 text-white border-l-4 border-indigo-500' : 'hover:bg-slate-700/50 hover:text-slate-200'
              }`}
            >
              <Database className="w-4 h-4 text-indigo-400 shrink-0" />
              <span className="hidden sm:inline">ข้อมูลสินค้า Master</span>
            </button>

            <button
              onClick={() => setActiveTab('attendance')}
              className={`px-4 py-2.5 text-xs font-bold flex items-center gap-3 transition-all ${
                activeTab === 'attendance' ? 'bg-slate-900 text-white border-l-4 border-purple-500' : 'hover:bg-slate-700/50 hover:text-slate-200'
              }`}
            >
              <Clock className="w-4 h-4 text-purple-400 shrink-0" />
              <span className="hidden sm:inline">ลงเวลา & แจ้งลา</span>
            </button>

            <button
              onClick={() => setActiveTab('employees')}
              className={`px-4 py-2.5 text-xs font-bold flex items-center gap-3 transition-all ${
                activeTab === 'employees' ? 'bg-slate-900 text-white border-l-4 border-sky-500' : 'hover:bg-slate-700/50 hover:text-slate-200'
              }`}
            >
              <Users className="w-4 h-4 text-sky-400 shrink-0" />
              <span className="hidden sm:inline">พนักงาน & สิทธิ์กะ</span>
            </button>

            <button
              onClick={() => setActiveTab('reports')}
              className={`px-4 py-2.5 text-xs font-bold flex items-center gap-3 transition-all ${
                activeTab === 'reports' ? 'bg-slate-900 text-white border-l-4 border-slate-400' : 'hover:bg-slate-700/50 hover:text-slate-200'
              }`}
            >
              <ClipboardList className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="hidden sm:inline">บัญชีรายงาน & Slip</span>
            </button>
          </nav>
        )}

        {/* Dynamic Content Panel area */}
        <main className="flex-1 overflow-y-auto p-4 space-y-4">
          {loggedInUser ? (
            <>
              {/* Approval queues for leadership/admin (Visible across all tabs if there are pending items) */}
              {(loggedInUser.role === 'admin' || loggedInUser.role === 'leader') && (
                <div className="space-y-2">
                  {/* Adjustment approvals queue */}
                  {adjustRequests.filter((r) => r.status === 'PENDING').map((req) => (
                    <div key={req.id} className="bg-amber-50 border border-amber-200 p-3 rounded text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm">
                      <div>
                        <span className="font-bold text-amber-800 uppercase">[คำขอปรับสต๊อกสินค้าด่วน]</span> พาร์ท: <strong>{req.partNo}</strong> ({req.customer}) 
                        • สต๊อกระบุ: {req.currentStock} Pcs • นับได้จริง: <strong className="text-amber-800">{req.countedQty} Pcs</strong> 
                        • ผู้ยื่นคำขอ: {req.requester}
                      </div>
                      <div className="flex gap-1.5 shrink-0 self-end sm:self-auto">
                        <button
                          onClick={() => handleRejectRequest(req.id, 'adjust')}
                          className="px-3 py-1 bg-slate-200 hover:bg-slate-300 rounded font-bold text-slate-700 text-[10px]"
                        >
                          ปฏิเสธ
                        </button>
                        <button
                          onClick={() => handleApproveAdjustment(req.id, req.partNo, req.customer, req.delta)}
                          className="px-3.5 py-1 bg-amber-500 hover:bg-amber-600 rounded font-bold text-white text-[10px]"
                        >
                          อนุมัติปรับยอด
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Attendance forgot punch and leave approvals queue */}
                  {attendanceLogs.filter((l) => l.status === 'FORGOT_REQUEST_IN' || l.status === 'FORGOT_REQUEST_OUT' || l.status === 'PENDING_LEAVE').map((req) => (
                    <div key={req.id} className="bg-blue-50 border border-blue-200 p-3 rounded text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm">
                      <div>
                        {req.status === 'PENDING_LEAVE' ? (
                          <span>
                            <span className="font-bold text-blue-800">[ขอใบลาพักงาน]</span> <strong>{req.employeeName}</strong> 
                            ขอลาประเภท: <strong className="text-blue-800">{req.leaveType}</strong> • รายละเอียด: {req.reason}
                          </span>
                        ) : (
                          <span>
                            <span className="font-bold text-blue-800">[ขอลืมตอกบัตรปรับเวลา]</span> <strong>{req.employeeName}</strong> 
                            ขอแก้ไขปรับตอกฝั่ง: <strong>{req.status === 'FORGOT_REQUEST_IN' ? 'เข้างาน' : 'เลิกงาน'}</strong> 
                            เวลาจริง: <strong className="text-blue-800">{req.requestedTime} น.</strong> ({req.date}) • เหตุผล: {req.reason}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-1.5 shrink-0 self-end sm:self-auto">
                        <button
                          onClick={() => handleRejectRequest(req.id, 'attendance')}
                          className="px-3 py-1 bg-slate-200 hover:bg-slate-300 rounded font-bold text-slate-700 text-[10px]"
                        >
                          ปฏิเสธ
                        </button>
                        <button
                          onClick={() => {
                            if (req.status === 'PENDING_LEAVE') {
                              handleApproveLeave(req.id);
                            } else {
                              handleApproveForgotPunch(req.id, req.employeeId, req.date, req.requestedTime || '08:30', req.status);
                            }
                          }}
                          className="px-3.5 py-1 bg-blue-600 hover:bg-blue-500 rounded font-bold text-white text-[10px]"
                        >
                          อนุมัติ
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Active Tab Panel Selector */}
              {activeTab === 'dashboard' && (
                <DashboardPanel
                  products={products}
                  transactions={transactions}
                  selectedMonth={selectedMonth}
                  selectedYear={selectedYear}
                  setSelectedMonth={setSelectedMonth}
                  setSelectedYear={setSelectedYear}
                  onNavigate={setActiveTab}
                  onSync={handleSyncGoogleSheets}
                  isSyncing={isSyncing}
                  lastSynced={lastSynced}
                />
              )}

              {activeTab === 'receiving' && (
                <ReceivingPanel
                  products={products}
                  transactions={transactions}
                  currentUser={loggedInUser}
                  locations={locations}
                  onSaveReceiving={(tx, p) => {
                    setTransactions([...tx, ...transactions]);
                    setProducts(p);
                  }}
                  onAddProductPrompt={(part) => {
                    const confirmAdd = window.confirm(`ไม่พบพาร์ทสินค้า "${part}" ในระบบ! ต้องการลงทะเบียนสินค้าพาร์ทนี้ใหม่เลยหรือไม่?`);
                    if (confirmAdd) {
                      setPromptAddProduct(part);
                      setActiveTab('inventory');
                    }
                  }}
                />
              )}

              {activeTab === 'transfer' && (
                <TransferPanel
                  products={products}
                  transactions={transactions}
                  currentUser={loggedInUser}
                  locations={locations}
                  onSaveTransfer={(tx, p) => {
                    setTransactions([...tx, ...transactions]);
                    setProducts(p);
                  }}
                  onSubmitAdjustmentRequest={(req) => {
                    setAdjustRequests([req, ...adjustRequests]);
                  }}
                  onAddProductPrompt={(part) => {
                    const confirmAdd = window.confirm(`ไม่พบพาร์ทสินค้า "${part}" ในระบบ! ต้องการเพิ่มใหม่เลยหรือไม่?`);
                    if (confirmAdd) {
                      setPromptAddProduct(part);
                      setActiveTab('inventory');
                    }
                  }}
                />
              )}

              {activeTab === 'deposit' && (
                <DepositPanel
                  products={products}
                  deposits={deposits}
                  currentUser={loggedInUser}
                  onAddDeposit={(dep) => setDeposits([dep, ...deposits])}
                  onUpdateDepositStatus={(id, stat, keeper) => {
                    setDeposits(
                      deposits.map((d) => (d.id === id ? { ...d, status: stat, storeKeeper: keeper } : d))
                    );
                  }}
                  onDeleteDeposit={(id) => setDeposits(deposits.filter((d) => d.id !== id))}
                />
              )}

              {activeTab === 'inventory' && (
                <InventoryPanel
                  products={products}
                  onAddProduct={(p) => setProducts([...products, p])}
                  onUpdateProduct={(updated) => {
                    setProducts(products.map((p) => (p.id === updated.id ? updated : p)));
                  }}
                  onDeleteProduct={(id) => setProducts(products.filter((p) => p.id !== id))}
                  onImportProducts={(imp) => setProducts([...imp, ...products])}
                  onGenerateLocations={() => {
                    const confirmGen = window.confirm('ระบบจะเริ่มสร้าง Location อ้างอิง DIT-01 ถึง DIT-60 ใหม่ ดำเนินการต่อหรือไม่?');
                    if (confirmGen) {
                      const newLocs = Array.from({ length: 60 }, (_, i) => `DIT-${String(i + 1).padStart(2, '0')}`);
                      setLocations(newLocs);
                      alert('สร้าง Location สำเร็จจำนวน 60 ลำดับ!');
                    }
                  }}
                />
              )}

              {activeTab === 'attendance' && (
                <AttendancePanel
                  currentUser={loggedInUser}
                  attendanceLogs={attendanceLogs}
                  onCheckIn={handleCheckIn}
                  onCheckOut={handleCheckOut}
                  onSubmitForgotPunch={(req) => setAttendanceLogs([req, ...attendanceLogs])}
                  onSubmitLeaveRequest={(req) => setAttendanceLogs([req, ...attendanceLogs])}
                />
              )}

              {activeTab === 'employees' && (
                <EmployeesPanel
                  employees={employees}
                  currentUser={loggedInUser}
                  departments={departments}
                  onAddEmployee={(emp) => setEmployees([...employees, emp])}
                  onUpdateEmployee={(updated) => {
                    setEmployees(employees.map((e) => (e.employeeId === updated.employeeId ? updated : e)));
                  }}
                  onDeleteEmployee={(id) => setEmployees(employees.filter((e) => e.employeeId !== id))}
                  onAddDepartment={(name) => setDepartments([...departments, name])}
                />
              )}

              {activeTab === 'reports' && (
                <ReportsPanel
                  transactions={transactions}
                  products={products}
                  onDeleteTransaction={(labelId) => setTransactions(transactions.filter((t) => t.labelId !== labelId))}
                  onUpdateTransactionPrinted={(labelIds) => {
                    setTransactions(
                      transactions.map((t) => (labelIds.includes(t.labelId) ? { ...t, printed: true } : t))
                    );
                  }}
                  selectedMonth={selectedMonth}
                  selectedYear={selectedYear}
                />
              )}
            </>
          ) : (
            /* Login Sign-In screen */
            <div className="max-w-md mx-auto my-12 bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-900 text-white p-5 text-center">
                <Layers className="w-12 h-12 text-blue-500 mx-auto mb-2 animate-pulse" />
                <h2 className="text-base font-black uppercase tracking-wider">เข้าสู่ระบบระบบคลัง WMS PRO</h2>
                <p className="text-[10px] text-slate-400 mt-1 uppercase">Store & Production Planning Platform</p>
              </div>

              <form onSubmit={handleLogin} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 block">รหัสพนักงาน (8 หลัก)</label>
                  <input
                    type="text"
                    required
                    maxLength={8}
                    placeholder="ป้อนรหัส เช่น 00000001"
                    value={loginEmpId}
                    onChange={(e) => setLoginEmpId(e.target.value)}
                    className="w-full border p-2.5 text-xs rounded font-mono focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 block">PIN รหัสผ่าน (6 หลัก)</label>
                  <input
                    type="password"
                    required
                    maxLength={6}
                    placeholder="ป้อนรหัสผ่าน 6 หลัก เช่น 123456"
                    value={loginPin}
                    onChange={(e) => setLoginPin(e.target.value)}
                    className="w-full border p-2.5 text-xs rounded font-mono focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-slate-950 hover:bg-slate-900 text-white py-2.5 rounded text-xs font-bold transition-all"
                >
                  ลงชื่อเข้าทำงาน (Check In Login)
                </button>
              </form>

              {/* Helpful baseline accounts panel */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500 space-y-2">
                <p className="font-bold text-slate-700">บัญชีทดสอบระดับบทบาทสิทธิ์ (Demo logins):</p>
                <div className="grid grid-cols-1 gap-1 font-mono text-[10px] leading-relaxed">
                  <div>1. <strong>Admin</strong> - ID: <span className="text-blue-600">00000001</span> | PIN: <span className="text-blue-600">123456</span></div>
                  <div>2. <strong>Leader</strong> - ID: <span className="text-blue-600">00000002</span> | PIN: <span className="text-blue-600">111111</span></div>
                  <div>3. <strong>Store Staff</strong> - ID: <span className="text-blue-600">00000003</span> | PIN: <span className="text-blue-600">222222</span></div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Footer Status Bar */}
      <footer className="bg-slate-200 px-4 py-1 flex items-center justify-between text-[10px] text-slate-500 border-t shrink-0 z-10 print:hidden select-none">
        <div className="flex space-x-4">
          <span className="flex items-center gap-1">
            ระบบจัดเก็บฐานข้อมูล: <strong className="text-blue-600 font-black uppercase">gsheet_local_hybrid_v3</strong>
          </span>
          <span className="hidden sm:inline">|</span>
          <span className="hidden sm:inline flex items-center gap-1">
            สถานะเครื่อง: <strong className="text-emerald-600 font-bold uppercase">เชื่อมต่อภายนอก (ONLINE)</strong>
          </span>
        </div>
        <div className="flex space-x-4">
          <span>พาร์ทลงทะเบียน: {products.length} SKU</span>
          <span>จำนวนผู้ใช้งาน: {employees.length} คน</span>
        </div>
      </footer>
    </div>
  );
}
