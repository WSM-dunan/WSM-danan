import React, { useState } from 'react';
import { Transaction, Product } from '../data';
import { exportToCSV } from '../utils';
import { FileSpreadsheet, Printer, Trash2, Edit, Filter, Search, CheckSquare, Square, Eye } from 'lucide-react';

interface ReportsPanelProps {
  transactions: Transaction[];
  products: Product[];
  onDeleteTransaction: (labelId: string) => void;
  onUpdateTransactionPrinted: (labelIds: string[]) => void;
  selectedMonth: string;
  selectedYear: string;
}

export const ReportsPanel: React.FC<ReportsPanelProps> = ({
  transactions,
  products,
  onDeleteTransaction,
  onUpdateTransactionPrinted,
  selectedMonth,
  selectedYear,
}) => {
  const [filterPartNo, setFilterPartNo] = useState('');
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [subTab, setSubTab] = useState<'ledger' | 'daily_export'>('ledger');

  // Selected Transfer items for printing slips
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [showSlipModal, setShowSlipModal] = useState(false);

  // Filter lists based on input queries
  const filteredTx = transactions.filter((t) => {
    const matchesPart = !filterPartNo || t.partNo.toUpperCase().includes(filterPartNo.toUpperCase());
    const matchesCustomer = !filterCustomer || t.customer.toUpperCase().includes(filterCustomer.toUpperCase());
    const matchesUser = !filterUser || t.user.toUpperCase().includes(filterUser.toUpperCase());
    const matchesType =
      filterType === 'ALL' ||
      (filterType === 'RECEIVE' && t.type === 'RECEIVE') ||
      (filterType === 'TRANSFER' && t.type === 'TRANSFER');
    return matchesPart && matchesCustomer && matchesUser && matchesType;
  });

  const toggleSelectLabel = (labelId: string) => {
    if (selectedLabels.includes(labelId)) {
      setSelectedLabels(selectedLabels.filter((l) => l !== labelId));
    } else {
      setSelectedLabels([...selectedLabels, labelId]);
    }
  };

  const selectAllTransfers = () => {
    const transferLabels = filteredTx.filter((t) => t.type === 'TRANSFER').map((t) => t.labelId);
    if (selectedLabels.length === transferLabels.length) {
      setSelectedLabels([]);
    } else {
      setSelectedLabels(transferLabels);
    }
  };

  const handlePrintSlips = () => {
    if (selectedLabels.length === 0) {
      alert('กรุณาเลือกรายการใบโอนจ่ายที่ต้องการพิมพ์ก่อน!');
      return;
    }
    setShowSlipModal(true);
  };

  const triggerActualPrint = () => {
    // Flag printed status on state
    onUpdateTransactionPrinted(selectedLabels);
    window.print();
    setShowSlipModal(false);
    setSelectedLabels([]);
  };

  const handleExcelExport = () => {
    const headers = ['Label ID', 'วันที่ทำรายการ', 'ประเภท', 'รายละเอียดกะงาน', 'พาร์ทสินค้า (Part No)', 'กลุ่มลูกค้า', 'จำนวน (ชิ้น)', 'ผู้บันทึก', 'ตำแหน่งคลัง', 'สถานะจัดพิมพ์'];
    const rows = filteredTx.map((t) => [
      t.labelId,
      new Date(t.timestamp).toLocaleDateString('th-TH') + ' ' + new Date(t.timestamp).toLocaleTimeString('th-TH'),
      t.type === 'RECEIVE' ? 'รับสินค้าเข้า' : 'โอนจ่ายออก',
      t.subType,
      t.partNo,
      t.customer,
      String(t.qty),
      t.user,
      t.location || 'สโตร์หลัก',
      t.printed ? 'พิมพ์แล้ว' : 'ยังไม่ได้พิมพ์',
    ]);

    exportToCSV(`WMS_Report_${selectedMonth}_${selectedYear}.csv`, headers, rows);
    alert('ส่งออกรายงานไฟล์ Excel/CSV สำเร็จเรียบร้อยแล้ว!');
  };

  // Extract selected items details for printable slip layout
  const selectedItemsDetails = transactions.filter((t) => selectedLabels.includes(t.labelId));

  return (
    <div className="space-y-4">
      {/* Search Header Panel */}
      <div className="bg-white rounded border border-slate-200 p-4 shadow-sm space-y-3">
        <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
          <Filter className="w-4 h-4 text-indigo-600" />
          ระบบรายงานยอดและวิเคราะห์ข้อมูลคลัง (Ledger Records & Printing Slips)
        </h2>

        {/* Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          <div>
            <label className="text-[9px] font-bold uppercase text-slate-400">ค้นหาพาร์ทสินค้า</label>
            <input
              type="text"
              placeholder="ค้นหา Part No..."
              value={filterPartNo}
              onChange={(e) => setFilterPartNo(e.target.value)}
              className="w-full border p-1.5 text-xs rounded outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-[9px] font-bold uppercase text-slate-400">ค้นหากลุ่มลูกค้า</label>
            <input
              type="text"
              placeholder="ค้นหาลูกค้า..."
              value={filterCustomer}
              onChange={(e) => setFilterCustomer(e.target.value)}
              className="w-full border p-1.5 text-xs rounded outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-[9px] font-bold uppercase text-slate-400">ผู้บันทึกรายการ</label>
            <input
              type="text"
              placeholder="ชื่อผู้ตอกบัตร..."
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="w-full border p-1.5 text-xs rounded outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-[9px] font-bold uppercase text-slate-400">ประเภทบันทึก</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full border p-1.5 text-xs rounded bg-slate-50 outline-none"
            >
              <option value="ALL">รายการทั้งหมด (ALL)</option>
              <option value="RECEIVE">รายการรับเข้าคลัง (RECEIVE)</option>
              <option value="TRANSFER">รายการโอนออกคลัง (TRANSFER)</option>
            </select>
          </div>

          <div className="flex items-end gap-1">
            <button
              onClick={handleExcelExport}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2 px-3 rounded flex items-center justify-center gap-1.5"
            >
              <FileSpreadsheet className="w-4 h-4" />
              ส่งออก Excel
            </button>
            <button
              onClick={handlePrintSlips}
              className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2 px-3 rounded flex items-center justify-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              พิมพ์ใบโอน
            </button>
          </div>
        </div>
      </div>

      {/* Sub-Tabs Selector inside ReportsPanel */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setSubTab('ledger')}
          className={`px-4 py-2 text-xs font-bold border-b-2 -mb-px transition-all ${
            subTab === 'ledger'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          สมุดลงรายการธุรกรรมทั้งหมด (Ledger Table)
        </button>
        <button
          onClick={() => setSubTab('daily_export')}
          className={`px-4 py-2 text-xs font-bold border-b-2 -mb-px transition-all ${
            subTab === 'daily_export'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          รายงานการส่งออกรายวัน (Daily Shipped Out Report)
        </button>
      </div>

      {subTab === 'ledger' ? (
        /* Ledger History Grid */
        <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-3 bg-slate-50 border-b flex justify-between items-center text-xs">
            <span className="font-black text-slate-600 uppercase tracking-wider">บันทึกธุรกรรมทั้งหมด ({filteredTx.length} รายการ)</span>
            <button
              onClick={selectAllTransfers}
              className="text-blue-600 hover:underline font-bold text-[11px]"
            >
              เลือก/ยกเลิกใบโอนทั้งหมดที่เห็น
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px] border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b text-slate-500">
                  <th className="p-2 w-12 text-center">พิมพ์</th>
                  <th className="p-2 w-28">เลขที่ Label ID</th>
                  <th className="p-2 w-28">เวลาทำรายการ</th>
                  <th className="p-2">ประเภทธุรกรรม</th>
                  <th className="p-2">Part No / ลูกค้า</th>
                  <th className="p-2 text-right">จำนวน (Pcs)</th>
                  <th className="p-2">ผู้บันทึก</th>
                  <th className="p-2">จัดเก็บที่ (Loc)</th>
                  <th className="p-2 text-center">สถานะพิมพ์</th>
                  <th className="p-2 text-center w-12">ลบ</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredTx.map((t) => {
                  const isTransfer = t.type === 'TRANSFER';
                  const isSelected = selectedLabels.includes(t.labelId);

                  return (
                    <tr key={t.labelId} className="hover:bg-slate-50">
                      <td className="p-2 text-center">
                        {isTransfer ? (
                          <button onClick={() => toggleSelectLabel(t.labelId)} className="text-slate-400 hover:text-blue-600">
                            {isSelected ? <CheckSquare className="w-4 h-4 text-blue-600 mx-auto" /> : <Square className="w-4 h-4 mx-auto" />}
                          </button>
                        ) : (
                          <span className="text-slate-300 text-[9px]">-</span>
                        )}
                      </td>
                      <td className="p-2 font-mono font-bold text-slate-700">{t.labelId}</td>
                      <td className="p-2 text-slate-400">
                        {new Date(t.timestamp).toLocaleDateString('th-TH')} {new Date(t.timestamp).toLocaleTimeString('th-TH')}
                      </td>
                      <td className="p-2">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${t.type === 'RECEIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {t.type === 'RECEIVE' ? 'รับสินค้าเข้า' : 'โอนสินค้าออก'}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">{t.subType}</span>
                      </td>
                      <td className="p-2">
                        <div className="font-bold text-slate-800">{t.partNo}</div>
                        <div className="text-[10px] text-slate-400">{t.customer}</div>
                      </td>
                      <td className="p-2 text-right font-black text-slate-800">{t.qty.toLocaleString()}</td>
                      <td className="p-2 text-slate-600">{t.user}</td>
                      <td className="p-2 font-bold text-slate-600">{t.location || 'สโตร์หลัก'}</td>
                      <td className="p-2 text-center">
                        {t.printed ? (
                          <span className="bg-slate-100 text-slate-500 px-1 py-0.5 rounded text-[9px] font-bold">
                            พิมพ์แล้ว (Printed)
                          </span>
                        ) : (
                          <span className="bg-amber-100 text-amber-700 px-1 py-0.5 rounded text-[9px] font-bold">
                            ยังไม่พิมพ์
                          </span>
                        )}
                      </td>
                      <td className="p-2 text-center">
                        <button onClick={() => onDeleteTransaction(t.labelId)} className="text-slate-300 hover:text-red-500">
                          <Trash2 className="w-3.5 h-3.5 mx-auto" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filteredTx.length === 0 && (
                  <tr>
                    <td colSpan={10} className="text-center py-8 text-slate-400">
                      ไม่พบข้อมูลประวัติการทำรายการตามฟิลเตอร์
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Daily Export Summary Report grouped by day */
        <div className="space-y-6">
          {(() => {
            const transfers = filteredTx.filter((t) => t.type === 'TRANSFER');
            const groups: Record<string, typeof transfers> = {};
            for (const t of transfers) {
              const dateStr = t.timestamp.split('T')[0];
              if (!groups[dateStr]) {
                groups[dateStr] = [];
              }
              groups[dateStr].push(t);
            }
            const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a));

            if (sortedDates.length === 0) {
              return (
                <div className="bg-white rounded border border-slate-200 p-8 text-center text-slate-400 text-xs">
                  ไม่มีรายการโอนส่งออกสินค้า (TRANSFER) ในช่วงเวลานี้
                </div>
              );
            }

            return sortedDates.map((dateStr) => {
              const items = groups[dateStr];
              const totalQty = items.reduce((sum, item) => sum + Math.abs(item.qty), 0);
              const formattedDate = new Date(dateStr).toLocaleDateString('th-TH', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              });

              return (
                <div key={dateStr} className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
                  {/* Date Header */}
                  <div className="bg-slate-900 text-white px-4 py-2.5 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
                      <h3 className="text-xs font-black uppercase tracking-wider">{formattedDate}</h3>
                    </div>
                    <div className="text-[10px] text-slate-300 font-mono font-bold">
                      จำนวนทั้งหมด {items.length} รายการโอนจ่าย
                    </div>
                  </div>

                  {/* Day Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[11px] border-collapse">
                      <thead>
                        <tr className="bg-slate-100 border-b text-slate-500 font-bold">
                          <th className="p-2 w-24">เวลาโอน</th>
                          <th className="p-2 w-28">เลขที่ Label ID</th>
                          <th className="p-2">พาร์ทสินค้า (Part No)</th>
                          <th className="p-2">ชื่อพาร์ทสินค้า</th>
                          <th className="p-2">กลุ่มลูกค้า</th>
                          <th className="p-2">จัดเก็บที่ (Loc)</th>
                          <th className="p-2 text-right">จำนวนส่งออก (Pcs)</th>
                          <th className="p-2">ผู้โอนจ่าย</th>
                          <th className="p-2 text-center">สถานะพิมพ์</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {items.map((item) => {
                          const prodDetail = products.find((p) => p.partNo === item.partNo);
                          return (
                            <tr key={item.labelId} className="hover:bg-slate-50">
                              <td className="p-2 font-mono text-slate-500">
                                {new Date(item.timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                              </td>
                              <td className="p-2 font-mono font-bold text-slate-700">{item.labelId}</td>
                              <td className="p-2 font-bold text-slate-900">{item.partNo}</td>
                              <td className="p-2 text-slate-500 truncate max-w-xs">{prodDetail?.partName || 'N/A'}</td>
                              <td className="p-2 font-bold text-slate-600">{item.customer}</td>
                              <td className="p-2 font-bold text-slate-600">{item.location || 'สโตร์หลัก'}</td>
                              <td className="p-2 text-right font-black text-red-600">{Math.abs(item.qty).toLocaleString()}</td>
                              <td className="p-2 text-slate-500">{item.user}</td>
                              <td className="p-2 text-center">
                                {item.printed ? (
                                  <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-[9px] font-bold">
                                    พิมพ์แล้ว
                                  </span>
                                ) : (
                                  <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-[9px] font-bold">
                                    ยังไม่พิมพ์
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Date Summary Row */}
                  <div className="bg-slate-50 px-4 py-2.5 border-t flex justify-between items-center text-xs font-black text-slate-900">
                    <span>ยอดจัดส่งออกรวมของวัน:</span>
                    <span className="text-sm text-red-600 font-extrabold">{totalQty.toLocaleString()} ชิ้น (Pcs)</span>
                  </div>
                </div>
              );
            });
          })()}
        </div>
      )}

      {/* Printable Transfer Slip Template Overlay Modal */}
      {showSlipModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div id="transfer-slip-printable-area" className="bg-white rounded-lg p-6 max-w-3xl w-full shadow-2xl border space-y-4">
            {/* Header */}
            <div className="flex justify-between items-start border-b pb-3">
              <div>
                <h1 className="text-md font-black text-slate-900 tracking-tight">ใบโอนจ่ายคลังสินค้า (TRANSFER SLIP)</h1>
                <p className="text-[10px] text-slate-500">WMS PRO Core System v3.0.2</p>
              </div>
              <div className="text-right text-[10px] text-slate-500">
                <div>วันที่ออกใบงาน: {new Date().toLocaleDateString('th-TH')}</div>
                <div>เวลาพิมพ์: {new Date().toLocaleTimeString('th-TH')} น.</div>
              </div>
            </div>

            {/* Slip table content */}
            <div className="border rounded overflow-hidden">
              <table className="w-full text-left text-[11px] border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b">
                    <th className="p-2">Label ID</th>
                    <th className="p-2">Part No</th>
                    <th className="p-2">ชื่อพาร์ทสินค้า</th>
                    <th className="p-2">กลุ่มลูกค้า</th>
                    <th className="p-2">จัดเก็บที่ (Location)</th>
                    <th className="p-2 text-right">จำนวนโอน (Pcs)</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {selectedItemsDetails.map((item) => (
                    <tr key={item.labelId}>
                      <td className="p-2 font-mono font-bold">{item.labelId}</td>
                      <td className="p-2 font-mono font-bold text-blue-600">{item.partNo}</td>
                      <td className="p-2">{products.find((p) => p.partNo === item.partNo)?.partName || 'N/A'}</td>
                      <td className="p-2 font-bold">{item.customer}</td>
                      <td className="p-2 font-bold">{item.location}</td>
                      <td className="p-2 text-right font-black">{Math.abs(item.qty).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total summary */}
            <div className="text-right font-black text-sm text-slate-900">
              ยอดรวมสุทธิ: {selectedItemsDetails.reduce((acc, item) => acc + Math.abs(item.qty), 0).toLocaleString()} ชิ้น (Pcs)
            </div>

            {/* Signature Area */}
            <div className="grid grid-cols-3 gap-6 pt-8 text-center text-[11px] text-slate-600">
              <div className="space-y-8">
                <div className="border-b border-dashed w-36 mx-auto h-5"></div>
                <p>ผู้โอนจ่ายสินค้า (ฝ่ายผลิต/คลัง)</p>
              </div>
              <div className="space-y-8">
                <div className="border-b border-dashed w-36 mx-auto h-5"></div>
                <p>พนักงานจัดเรียงสโตร์ FG</p>
              </div>
              <div className="space-y-8">
                <div className="border-b border-dashed w-36 mx-auto h-5"></div>
                <p>ผู้จัดการคลังสินค้า อนุมัติ</p>
              </div>
            </div>

            {/* Action buttons (Hidden during actual print) */}
            <div className="flex gap-2 justify-end pt-4 border-t print:hidden">
              <button
                onClick={() => setShowSlipModal(false)}
                className="border text-xs px-3.5 py-1.5 rounded font-bold hover:bg-slate-100"
              >
                ยกเลิก
              </button>
              <button
                onClick={triggerActualPrint}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs px-4 py-1.5 rounded font-bold flex items-center gap-1.5 shadow"
              >
                <Printer className="w-4 h-4" />
                สั่งพิมพ์ใบงาน (window.print)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
