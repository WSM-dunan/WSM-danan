import React from 'react';
import { Transaction, Product } from '../data';
import { TrendingUp, ArrowDownCircle, ArrowUpCircle, RefreshCw, Layers } from 'lucide-react';

interface DashboardPanelProps {
  products: Product[];
  transactions: Transaction[];
  selectedMonth: string;
  selectedYear: string;
  setSelectedMonth: (m: string) => void;
  setSelectedYear: (y: string) => void;
  onNavigate: (tab: string) => void;
  onSync: () => void;
  isSyncing: boolean;
  lastSynced: string;
}

export const DashboardPanel: React.FC<DashboardPanelProps> = ({
  products,
  transactions,
  selectedMonth,
  selectedYear,
  setSelectedMonth,
  setSelectedYear,
  onNavigate,
  onSync,
  isSyncing,
  lastSynced,
}) => {
  // Current Stock (Total)
  const totalStock = products.reduce((acc, p) => acc + p.currentStock, 0);

  // Month Index (0-11)
  const monthNamesTh = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  
  const monthMap: Record<string, number> = {
    'January': 0, 'February': 1, 'March': 2, 'April': 3, 'May': 4, 'June': 5,
    'July': 6, 'August': 7, 'September': 8, 'October': 9, 'November': 10, 'December': 11
  };

  const currentMonthIdx = monthMap[selectedMonth] !== undefined ? monthMap[selectedMonth] : 6; // July default
  const targetYearNum = parseInt(selectedYear, 10) || 2026;

  // Monthly stats helper: start 8:30 AM on 1st of selected Month to 8:29 AM of 1st of next Month
  const filterMonthlyTransactions = (type: 'RECEIVE' | 'TRANSFER') => {
    return transactions.filter((t) => {
      if (t.type !== type) return false;
      const tDate = new Date(t.timestamp);
      
      // Target range
      const startDate = new Date(targetYearNum, currentMonthIdx, 1, 8, 30, 0);
      const endDate = new Date(targetYearNum, currentMonthIdx + 1, 1, 8, 29, 59);
      
      return tDate >= startDate && tDate <= endDate;
    });
  };

  // Daily stats helper: cut-off 8:30 AM
  const filterDailyTransactions = (type: 'RECEIVE' | 'TRANSFER') => {
    const now = new Date();
    // Start of "today's period" is either today 8:30 AM (if now is after 8:30) or yesterday 8:30 AM
    const today830 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 30, 0);
    let periodStart: Date;
    let periodEnd: Date;

    if (now >= today830) {
      periodStart = today830;
      periodEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 8, 29, 59);
    } else {
      periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 8, 30, 0);
      periodEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 29, 59);
    }

    return transactions.filter((t) => {
      if (t.type !== type) return false;
      const tDate = new Date(t.timestamp);
      return tDate >= periodStart && tDate <= periodEnd;
    });
  };

  const monthlyInbound = filterMonthlyTransactions('RECEIVE').reduce((acc, t) => acc + t.qty, 0);
  const monthlyOutbound = filterMonthlyTransactions('TRANSFER').reduce((acc, t) => acc + Math.abs(t.qty), 0);

  const dailyInbound = filterDailyTransactions('RECEIVE').reduce((acc, t) => acc + t.qty, 0);
  const dailyOutbound = filterDailyTransactions('TRANSFER').reduce((acc, t) => acc + Math.abs(t.qty), 0);

  // Targets for progress bars
  const DAILY_RECEIVE_TARGET = 6000;
  const DAILY_TRANSFER_TARGET = 5000;

  return (
    <div className="space-y-4">
      {/* Filters header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-3 rounded border border-slate-200 gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-900">แดชบอร์ดติดตามงาน (Live Dashboard)</h2>
          <p className="text-xs text-slate-500">ตัดรอบตอกบัตรและยอดสต๊อกที่เวลา 08:30 น. (ICT)</p>
        </div>
        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="border p-1.5 text-xs font-semibold rounded bg-slate-50 focus:ring-1 focus:ring-blue-500 outline-none flex-1 sm:flex-initial"
          >
            {monthNamesTh.map((name, idx) => (
              <option key={idx} value={Object.keys(monthMap)[idx]}>
                {name} ({Object.keys(monthMap)[idx]})
              </option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="border p-1.5 text-xs font-semibold rounded bg-slate-50 focus:ring-1 focus:ring-blue-500 outline-none w-24"
          >
            <option value="2026">2026</option>
            <option value="2025">2025</option>
          </select>
        </div>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* KPI 1 */}
        <div className="bg-white p-3 rounded border border-slate-200 border-l-4 border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Current Stock</span>
            <Layers className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-slate-900">{totalStock.toLocaleString()}</span>
            <span className="text-xs text-slate-500 ml-1">ชิ้น (pcs)</span>
          </div>
          <p className="text-[9px] text-slate-400 mt-1">สต๊อกคงคลังรวมทั้งหมด</p>
        </div>

        {/* KPI 2 */}
        <div className="bg-white p-3 rounded border border-slate-200 border-l-4 border-emerald-500 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-600 uppercase">In Monthly</span>
            <ArrowDownCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-emerald-600">{monthlyInbound.toLocaleString()}</span>
            <span className="text-xs text-slate-500 ml-1">ชิ้น</span>
          </div>
          <p className="text-[9px] text-slate-400 mt-1">ยอดรับเข้าสะสมทั้งเดือน</p>
        </div>

        {/* KPI 3 */}
        <div className="bg-white p-3 rounded border border-slate-200 border-l-4 border-emerald-300 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-500 uppercase">In Daily (Today)</span>
            <ArrowDownCircle className="w-4 h-4 text-emerald-300" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-slate-900">{dailyInbound.toLocaleString()}</span>
            <span className="text-xs text-slate-500 ml-1">ชิ้น</span>
          </div>
          <p className="text-[9px] text-slate-400 mt-1">รับเข้าประจำวัน (หลัง 08:30)</p>
        </div>

        {/* KPI 4 */}
        <div className="bg-white p-3 rounded border border-slate-200 border-l-4 border-red-500 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-red-600 uppercase">Out Monthly</span>
            <ArrowUpCircle className="w-4 h-4 text-red-500" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-red-600">{monthlyOutbound.toLocaleString()}</span>
            <span className="text-xs text-slate-500 ml-1">ชิ้น</span>
          </div>
          <p className="text-[9px] text-slate-400 mt-1">ยอดโอนออกสะสมทั้งเดือน</p>
        </div>

        {/* KPI 5 */}
        <div className="bg-white p-3 rounded border border-slate-200 border-l-4 border-red-300 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-red-400 uppercase">Out Daily (Today)</span>
            <ArrowUpCircle className="w-4 h-4 text-red-300" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-slate-900">{dailyOutbound.toLocaleString()}</span>
            <span className="text-xs text-slate-500 ml-1">ชิ้น</span>
          </div>
          <p className="text-[9px] text-slate-400 mt-1">โอนออกประจำวัน (หลัง 08:30)</p>
        </div>
      </div>

      {/* Sync Banner */}
      <div className="bg-slate-50 border border-slate-200 px-4 py-2.5 rounded flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
          <p className="text-xs text-slate-600">
            <strong>ระบบแบบเรียลไทม์:</strong> อัปเดตข้อมูลอัตโนมัติลงชีทและฐานข้อมูลส่วนกลาง 
            {lastSynced && <span className="text-slate-400 ml-1">| ล่าสุดเมื่อ: {lastSynced}</span>}
          </p>
        </div>
        <button
          onClick={onSync}
          disabled={isSyncing}
          className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white text-xs px-3 py-1.5 rounded flex items-center justify-center gap-1.5 self-start sm:self-auto transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'กำลังซิงค์...' : 'ซิงค์ Google Sheets'}
        </button>
      </div>

      {/* Grid Layout (Middle Content) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Quick Actions (6 cols) */}
        <div className="lg:col-span-6 bg-white rounded border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">เมนูดัดแปลงสต๊อกและทางลัด</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button
                onClick={() => onNavigate('receiving')}
                className="bg-slate-50 hover:bg-slate-100 border border-slate-200 p-3 rounded flex flex-col items-center justify-center gap-2 transition-all active:scale-95 text-center"
              >
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <ArrowDownCircle className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-800">สแกนรับเข้า</span>
              </button>

              <button
                onClick={() => onNavigate('transfer')}
                className="bg-slate-50 hover:bg-slate-100 border border-slate-200 p-3 rounded flex flex-col items-center justify-center gap-2 transition-all active:scale-95 text-center"
              >
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                  <ArrowUpCircle className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-800">สแกนโอนออก</span>
              </button>

              <button
                onClick={() => onNavigate('inventory')}
                className="bg-slate-50 hover:bg-slate-100 border border-slate-200 p-3 rounded flex flex-col items-center justify-center gap-2 transition-all active:scale-95 text-center"
              >
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-800">ปรับปรุงสต๊อก</span>
              </button>

              <button
                onClick={() => onNavigate('deposit')}
                className="bg-slate-50 hover:bg-slate-100 border border-slate-200 p-3 rounded flex flex-col items-center justify-center gap-2 transition-all active:scale-95 text-center"
              >
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                  <Layers className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-800">ฝาก/เบิกงาน</span>
              </button>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span>ความคืบหน้ารับประจำวัน</span>
                <span className="text-emerald-600">
                  {dailyInbound.toLocaleString()} / {DAILY_RECEIVE_TARGET.toLocaleString()} Pcs
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full transition-all"
                  style={{ width: `${Math.min(100, (dailyInbound / DAILY_RECEIVE_TARGET) * 100)}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span>ความคืบหน้าโอนจ่ายประจำวัน</span>
                <span className="text-red-600">
                  {dailyOutbound.toLocaleString()} / {DAILY_TRANSFER_TARGET.toLocaleString()} Pcs
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-red-500 h-full transition-all"
                  style={{ width: `${Math.min(100, (dailyOutbound / DAILY_TRANSFER_TARGET) * 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Transactions (6 cols) */}
        <div className="lg:col-span-6 bg-white rounded border border-slate-200 p-4 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">กิจกรรมล่าสุด (Recent Activity)</h3>
            <button onClick={() => onNavigate('reports')} className="text-blue-600 hover:underline text-xs font-bold">
              ดูรายงานทั้งหมด
            </button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 max-h-[250px] pr-1">
            {transactions.slice(0, 5).map((t, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-all text-xs">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-full ${t.type === 'RECEIVE' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                    {t.type === 'RECEIVE' ? <ArrowDownCircle className="w-3.5 h-3.5" /> : <ArrowUpCircle className="w-3.5 h-3.5" />}
                  </div>
                  <div>
                    <div className="font-bold text-slate-800">
                      {t.type === 'RECEIVE' ? 'รับเข้า' : 'โอนออก'} SKU: {t.partNo}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      ผู้ลงบันทึก: {t.user} • {t.location || 'คลัง'} • {new Date(t.timestamp).toLocaleTimeString('th-TH')}
                    </div>
                  </div>
                </div>
                <div className={`font-black ${t.type === 'RECEIVE' ? 'text-emerald-600' : 'text-red-600'}`}>
                  {t.type === 'RECEIVE' ? '+' : ''}
                  {t.qty.toLocaleString()}
                </div>
              </div>
            ))}
            {transactions.length === 0 && (
              <div className="text-center py-8 text-slate-400 text-xs">
                ยังไม่มีรายการบันทึกในระบบในขณะนี้
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
