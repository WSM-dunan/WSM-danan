import React, { useState, useMemo } from 'react';
import { Transaction, Product } from '../data';
import { exportToCSV } from '../utils';
import { FileSpreadsheet, Printer, Trash2, Edit, Filter, Search, CheckSquare, Square, Eye, Calendar, BookOpen } from 'lucide-react';

interface ReportsPanelProps {
  transactions: Transaction[];
  products: Product[];
  onDeleteTransaction: (labelId: string) => void;
  onUpdateTransactionPrinted: (labelIds: string[], printedStatus?: boolean) => void;
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
  const [subTab, setSubTab] = useState<'ledger' | 'daily_export' | 'monthly_ledger' | 'transfer_print'>('transfer_print');

  const getMonthNumber = (monthStr: string): number => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const idx = months.indexOf(monthStr);
    return idx >= 0 ? idx + 1 : 7;
  };

  const [ledgerMonth, setLedgerMonth] = useState<number>(() => getMonthNumber(selectedMonth));
  const [ledgerYear, setLedgerYear] = useState<number>(() => Number(selectedYear) || 2026);

  // Selected Transfer items for printing slips
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [showSlipModal, setShowSlipModal] = useState(false);

  // Computed unique customers and users for dropdown filtering
  const uniqueCustomers = useMemo(() => {
    return Array.from(new Set(transactions.map((t) => t.customer).filter(Boolean)));
  }, [transactions]);

  const uniqueUsers = useMemo(() => {
    return Array.from(new Set(transactions.map((t) => t.user).filter(Boolean)));
  }, [transactions]);

  // Filter lists based on input queries and sort newest first
  const filteredTx = useMemo(() => {
    return [...transactions]
      .filter((t) => {
        const matchesPart = !filterPartNo || t.partNo.toUpperCase().includes(filterPartNo.toUpperCase());
        const matchesCustomer = !filterCustomer || t.customer === filterCustomer;
        const matchesUser = !filterUser || t.user === filterUser;
        const matchesType =
          filterType === 'ALL' ||
          (filterType === 'RECEIVE' && t.type === 'RECEIVE') ||
          (filterType === 'TRANSFER' && t.type === 'TRANSFER');
        return matchesPart && matchesCustomer && matchesUser && matchesType;
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [transactions, filterPartNo, filterCustomer, filterUser, filterType]);

  const transferTxs = useMemo(() => {
    return [...transactions]
      .filter((t) => {
        if (t.type !== 'TRANSFER') return false;
        const matchesPart = !filterPartNo || t.partNo.toUpperCase().includes(filterPartNo.toUpperCase());
        const matchesCustomer = !filterCustomer || t.customer === filterCustomer;
        const matchesUser = !filterUser || t.user === filterUser;
        return matchesPart && matchesCustomer && matchesUser;
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [transactions, filterPartNo, filterCustomer, filterUser]);

  const unprintedTransfers = useMemo(() => {
    return transferTxs.filter((t) => !t.printed);
  }, [transferTxs]);

  const printedTransfers = useMemo(() => {
    return transferTxs.filter((t) => t.printed);
  }, [transferTxs]);

  const daysInMonth = new Date(ledgerYear, ledgerMonth, 0).getDate();
  const daysArray = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }, [daysInMonth]);

  const ledgerData = useMemo(() => {
    const startOfMonth = new Date(ledgerYear, ledgerMonth - 1, 1);

    return products
      .filter((p) => {
        const matchesPart = !filterPartNo || p.partNo.toUpperCase().includes(filterPartNo.toUpperCase());
        const matchesCustomer = !filterCustomer || p.customer.toUpperCase().includes(filterCustomer.toUpperCase());
        return matchesPart && matchesCustomer;
      })
      .map((p) => {
        // Transactions of this product BEFORE start of this month
        const beforeTxs = transactions.filter((t) => {
          return (
            t.partNo === p.partNo &&
            t.customer === p.customer &&
            new Date(t.timestamp) < startOfMonth
          );
        });

        const opening = p.beginningStock + beforeTxs.reduce((acc, t) => acc + t.qty, 0);

        // Group transactions of this month by day
        const thisMonthTxs = transactions.filter((t) => {
          if (t.partNo !== p.partNo || t.customer !== p.customer) return false;
          const tDate = new Date(t.timestamp);
          return (
            tDate.getFullYear() === ledgerYear &&
            (tDate.getMonth() + 1) === ledgerMonth
          );
        });

        const daysData: Record<number, { inbound: number; outbound: number }> = {};
        daysArray.forEach((d) => {
          daysData[d] = { inbound: 0, outbound: 0 };
        });

        thisMonthTxs.forEach((t) => {
          const d = new Date(t.timestamp).getDate();
          if (daysData[d]) {
            if (t.qty > 0) {
              daysData[d].inbound += t.qty;
            } else {
              daysData[d].outbound += Math.abs(t.qty);
            }
          }
        });

        const totalInbound = thisMonthTxs.filter((t) => t.qty > 0).reduce((acc, t) => acc + t.qty, 0);
        const totalOutbound = thisMonthTxs.filter((t) => t.qty < 0).reduce((acc, t) => acc + Math.abs(t.qty), 0);
        const closing = opening + totalInbound - totalOutbound;

        return {
          id: p.id,
          sapNo: p.sapNo || '',
          customer: p.customer || '',
          partNo: p.partNo || '',
          partName: p.partName || '',
          opening,
          daysData,
          closing,
        };
      });
  }, [products, transactions, ledgerMonth, ledgerYear, filterPartNo, filterCustomer, daysArray]);

  const handleMonthlyLedgerExport = () => {
    // Header Row 1
    const headerRow1 = ['SAP No', 'Customer', 'Part No', 'Part Name', 'Opening'];
    daysArray.forEach((d) => {
      headerRow1.push(String(d), '');
    });
    headerRow1.push('Closing');

    // Header Row 2
    const headerRow2 = ['', '', '', '', ''];
    daysArray.forEach(() => {
      headerRow2.push('IN', 'OUT');
    });
    headerRow2.push('');

    // Data Rows
    const dataRows = ledgerData.map((item) => {
      const row = [
        item.sapNo,
        item.customer,
        item.partNo,
        item.partName,
        String(item.opening),
      ];
      daysArray.forEach((d) => {
        const dayVal = item.daysData[d] || { inbound: 0, outbound: 0 };
        row.push(
          dayVal.inbound > 0 ? String(dayVal.inbound) : '',
          dayVal.outbound > 0 ? String(dayVal.outbound) : ''
        );
      });
      row.push(String(item.closing));
      return row;
    });

    const BOM = '\uFEFF';
    const csvContent = [
      headerRow1.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','),
      headerRow2.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','),
      ...dataRows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `WMS_Monthly_Ledger_M${ledgerMonth}_Y${ledgerYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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

  const selectAllUnprinted = () => {
    const unprintedIds = unprintedTransfers.map((t) => t.labelId);
    const allSelected = unprintedIds.length > 0 && unprintedIds.every(id => selectedLabels.includes(id));
    if (allSelected) {
      setSelectedLabels(prev => prev.filter(id => !unprintedIds.includes(id)));
    } else {
      setSelectedLabels(prev => Array.from(new Set([...prev, ...unprintedIds])));
    }
  };

  const selectAllPrinted = () => {
    const printedIds = printedTransfers.map((t) => t.labelId);
    const allSelected = printedIds.length > 0 && printedIds.every(id => selectedLabels.includes(id));
    if (allSelected) {
      setSelectedLabels(prev => prev.filter(id => !printedIds.includes(id)));
    } else {
      setSelectedLabels(prev => Array.from(new Set([...prev, ...printedIds])));
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
    // Flag printed status on state to be true
    onUpdateTransactionPrinted(selectedLabels, true);
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
            <label className="text-[9px] font-bold uppercase text-slate-400">กรองกลุ่มลูกค้า (Customer)</label>
            <select
              value={filterCustomer}
              onChange={(e) => setFilterCustomer(e.target.value)}
              className="w-full border p-1.5 text-xs rounded bg-slate-50 outline-none font-medium text-slate-700"
            >
              <option value="">-- ลูกค้าทั้งหมด (ALL) --</option>
              {uniqueCustomers.map((cust) => (
                <option key={cust} value={cust}>
                  {cust}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[9px] font-bold uppercase text-slate-400">ผู้บันทึกรายการ (User)</label>
            <select
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="w-full border p-1.5 text-xs rounded bg-slate-50 outline-none font-medium text-slate-700"
            >
              <option value="">-- ผู้บันทึกทั้งหมด (ALL) --</option>
              {uniqueUsers.map((user) => (
                <option key={user} value={user}>
                  {user}
                </option>
              ))}
            </select>
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
      <div className="flex border-b border-slate-200 overflow-x-auto">
        <button
          onClick={() => setSubTab('transfer_print')}
          className={`px-4 py-2 text-xs font-bold border-b-2 -mb-px transition-all whitespace-nowrap ${
            subTab === 'transfer_print'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          🖨️ ระบบพิมพ์ใบโอนออก (Transfer Slip Printing)
        </button>
        <button
          onClick={() => setSubTab('ledger')}
          className={`px-4 py-2 text-xs font-bold border-b-2 -mb-px transition-all whitespace-nowrap ${
            subTab === 'ledger'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          ประวัติการลงธุรกรรมทั้งหมด (Ledger Table)
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
        <button
          onClick={() => setSubTab('monthly_ledger')}
          className={`px-4 py-2 text-xs font-bold border-b-2 -mb-px transition-all ${
            subTab === 'monthly_ledger'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          สมุดคุมคลังรายเดือน (Monthly Ledger Sheets) 📋
        </button>
      </div>

      {subTab === 'transfer_print' ? (
        /* Dedicated Outbound Transfer Slip Printing System */
        <div className="space-y-4">
          {/* Action Header bar */}
          <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
                <span>📦 รายการโอนออกที่ค้นพบในระบบ ({transferTxs.length} รายการ)</span>
              </h3>
              <p className="text-[10px] text-slate-500 mt-1">
                คุณสามารถเลือกรายการต่างๆ แล้วคลิกปุ่ม "เปิดหน้าพิมพ์ใบโอน" เพื่อพิมพ์ Slip หลายใบพร้อมกันได้
              </p>
            </div>
            
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  const allIds = transferTxs.map(t => t.labelId);
                  const areAllSelected = allIds.length > 0 && allIds.every(id => selectedLabels.includes(id));
                  if (areAllSelected) {
                    setSelectedLabels([]);
                  } else {
                    setSelectedLabels(allIds);
                  }
                }}
                className="flex-1 sm:flex-initial bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs py-2 px-3.5 rounded flex items-center justify-center gap-1.5 transition-all"
              >
                {transferTxs.length > 0 && transferTxs.every(t => selectedLabels.includes(t.labelId)) ? '✕ ยกเลิกเลือกทั้งหมด' : '☑ เลือกทุกรายการ'}
              </button>

              <button
                type="button"
                onClick={handlePrintSlips}
                disabled={selectedLabels.length === 0}
                className={`flex-1 sm:flex-initial font-black text-xs py-2 px-4 rounded flex items-center justify-center gap-1.5 transition-all ${
                  selectedLabels.length > 0 
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md cursor-pointer' 
                    : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                }`}
              >
                <Printer className="w-4 h-4" />
                เปิดหน้าพิมพ์ใบโอน ({selectedLabels.length} รายการ)
              </button>
            </div>
          </div>

          {/* Grid of Two Columns: Unprinted vs Printed */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            
            {/* COLUMN 1: UNPRINTED */}
            <div className="bg-white rounded-lg border border-amber-200 shadow-sm overflow-hidden flex flex-col">
              <div className="p-3 bg-amber-50/70 border-b border-amber-100 flex justify-between items-center">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                  <span className="font-black text-slate-700 text-xs">⏳ คิวใบโอนที่ยังไม่ได้พิมพ์ ({unprintedTransfers.length} รายการ)</span>
                </div>
                <button
                  type="button"
                  onClick={selectAllUnprinted}
                  className="text-amber-800 hover:underline font-bold text-[10px] bg-amber-100 hover:bg-amber-200 px-2 py-0.5 rounded transition-colors"
                >
                  {unprintedTransfers.length > 0 && unprintedTransfers.every(t => selectedLabels.includes(t.labelId)) ? '✕ ยกเลิกเลือกทั้งหมด' : '☑ เลือกทุกใบที่ยังไม่พิมพ์'}
                </button>
              </div>

              <div className="divide-y divide-slate-100 overflow-y-auto max-h-[500px]">
                {unprintedTransfers.map((t) => {
                  const isSelected = selectedLabels.includes(t.labelId);
                  return (
                    <div key={t.labelId} className={`p-3 text-[11px] transition-all flex items-start gap-2.5 ${isSelected ? 'bg-indigo-50/40' : 'hover:bg-slate-50'}`}>
                      <button 
                        type="button"
                        onClick={() => toggleSelectLabel(t.labelId)} 
                        className="text-slate-400 hover:text-indigo-600 mt-0.5 transition-colors focus:outline-none"
                      >
                        {isSelected ? <CheckSquare className="w-4.5 h-4.5 text-indigo-600" /> : <Square className="w-4.5 h-4.5 text-slate-300" />}
                      </button>

                      <div className="flex-1 space-y-1">
                        <div className="flex justify-between items-start">
                          <span className="font-mono font-black text-slate-800 text-[11px]">{t.labelId}</span>
                          <span className="text-[9px] text-slate-400 font-medium">
                            {new Date(t.timestamp).toLocaleDateString('th-TH')} {new Date(t.timestamp).toLocaleTimeString('th-TH')}
                          </span>
                        </div>
                        
                        <div className="font-bold text-slate-700 text-[11px]">
                          {t.partNo} <span className="text-slate-400 font-normal">|</span> <span className="text-indigo-600">{t.customer}</span>
                        </div>
                        
                        <p className="text-[10px] text-slate-500 truncate leading-tight">
                          {products.find((p) => p.partNo === t.partNo)?.partName || 'N/A'}
                        </p>

                        <div className="flex justify-between items-center text-[10px] pt-1">
                          <span className="text-slate-500">
                            พิกัด: <strong className="text-slate-700 font-bold">{t.location || 'สโตร์หลัก'}</strong> • ผู้โอน: <strong className="text-slate-700 font-bold">{t.user}</strong>
                          </span>
                          <strong className="text-red-600 text-[12px] font-black">-{Math.abs(t.qty).toLocaleString()} Pcs</strong>
                        </div>
                      </div>

                      <div className="pl-1 self-center">
                        <button
                          type="button"
                          onClick={() => onUpdateTransactionPrinted([t.labelId], true)}
                          title="คลิกเพื่อสลับเป็นพิมพ์แล้ว"
                          className="bg-amber-100 hover:bg-emerald-100 text-amber-800 hover:text-emerald-800 p-1.5 rounded transition-colors text-[9px] font-black whitespace-nowrap"
                        >
                          พิมพ์แล้ว ✓
                        </button>
                      </div>
                    </div>
                  );
                })}
                {unprintedTransfers.length === 0 && (
                  <div className="p-8 text-center text-slate-400 text-xs italic">
                    📭 ไม่มีใบโอนที่ยังไม่ได้พิมพ์ในขณะนี้
                  </div>
                )}
              </div>
            </div>

            {/* COLUMN 2: PRINTED */}
            <div className="bg-white rounded-lg border border-emerald-200 shadow-sm overflow-hidden flex flex-col">
              <div className="p-3 bg-emerald-50/70 border-b border-emerald-100 flex justify-between items-center">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <span className="font-black text-slate-700 text-xs">✅ ประวัติใบโอนที่พิมพ์เสร็จแล้ว ({printedTransfers.length} รายการ)</span>
                </div>
                <button
                  type="button"
                  onClick={selectAllPrinted}
                  className="text-emerald-800 hover:underline font-bold text-[10px] bg-emerald-100 hover:bg-emerald-200 px-2 py-0.5 rounded transition-colors"
                >
                  {printedTransfers.length > 0 && printedTransfers.every(t => selectedLabels.includes(t.labelId)) ? '✕ ยกเลิกเลือกทั้งหมด' : '☑ เลือกทุกใบที่พิมพ์แล้ว'}
                </button>
              </div>

              <div className="divide-y divide-slate-100 overflow-y-auto max-h-[500px]">
                {printedTransfers.map((t) => {
                  const isSelected = selectedLabels.includes(t.labelId);
                  return (
                    <div key={t.labelId} className={`p-3 text-[11px] transition-all flex items-start gap-2.5 ${isSelected ? 'bg-indigo-50/40' : 'hover:bg-slate-50'}`}>
                      <button 
                        type="button"
                        onClick={() => toggleSelectLabel(t.labelId)} 
                        className="text-slate-400 hover:text-indigo-600 mt-0.5 transition-colors focus:outline-none"
                      >
                        {isSelected ? <CheckSquare className="w-4.5 h-4.5 text-indigo-600" /> : <Square className="w-4.5 h-4.5 text-slate-300" />}
                      </button>

                      <div className="flex-1 space-y-1">
                        <div className="flex justify-between items-start">
                          <span className="font-mono font-black text-slate-500 text-[11px] line-through decoration-slate-300">{t.labelId}</span>
                          <span className="text-[9px] text-slate-400 font-medium">
                            {new Date(t.timestamp).toLocaleDateString('th-TH')} {new Date(t.timestamp).toLocaleTimeString('th-TH')}
                          </span>
                        </div>
                        
                        <div className="font-bold text-slate-700 text-[11px]">
                          {t.partNo} <span className="text-slate-400 font-normal">|</span> <span className="text-indigo-600">{t.customer}</span>
                        </div>
                        
                        <p className="text-[10px] text-slate-500 truncate leading-tight">
                          {products.find((p) => p.partNo === t.partNo)?.partName || 'N/A'}
                        </p>

                        <div className="flex justify-between items-center text-[10px] pt-1">
                          <span className="text-slate-500">
                            พิกัด: <strong className="text-slate-700 font-bold">{t.location || 'สโตร์หลัก'}</strong> • ผู้โอน: <strong className="text-slate-700 font-bold">{t.user}</strong>
                          </span>
                          <strong className="text-slate-600 text-[11px] font-bold">-{Math.abs(t.qty).toLocaleString()} Pcs</strong>
                        </div>
                      </div>

                      <div className="pl-1 self-center">
                        <button
                          type="button"
                          onClick={() => onUpdateTransactionPrinted([t.labelId], false)}
                          title="คลิกเพื่อสลับกลับเป็นยังไม่พิมพ์"
                          className="bg-emerald-100 hover:bg-amber-100 text-emerald-800 hover:text-amber-800 p-1.5 rounded transition-colors text-[9px] font-black whitespace-nowrap"
                        >
                          ย้อนกลับ ⏳
                        </button>
                      </div>
                    </div>
                  );
                })}
                {printedTransfers.length === 0 && (
                  <div className="p-8 text-center text-slate-400 text-xs italic">
                    📭 ยังไม่มีประวัติใบโอนที่พิมพ์ในขณะนี้
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      ) : subTab === 'ledger' ? (
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
                        <button
                          onClick={() => onUpdateTransactionPrinted([t.labelId])}
                          title="คลิกเพื่อสลับสถานะการพิมพ์"
                          className="hover:scale-105 transition-all focus:outline-none"
                        >
                          {t.printed ? (
                            <span className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 px-2 py-0.5 rounded text-[9px] font-black cursor-pointer">
                              พิมพ์แล้ว ✓
                            </span>
                          ) : (
                            <span className="bg-amber-100 text-amber-700 hover:bg-amber-200 px-2 py-0.5 rounded text-[9px] font-black cursor-pointer">
                              ยังไม่พิมพ์ ⏳
                            </span>
                          )}
                        </button>
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
      ) : subTab === 'daily_export' ? (
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
      ) : (
        /* Monthly Ledger Sheets subTab view */
        <div className="bg-white rounded border border-slate-200 shadow-sm p-4 space-y-4">
          {/* Controls Bar */}
          <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              {/* Month Selector */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">เลือกเดือนประเมิน</span>
                <select
                  value={ledgerMonth}
                  onChange={(e) => setLedgerMonth(Number(e.target.value))}
                  className="border border-slate-200 text-xs px-2 py-1.5 rounded bg-white font-bold text-indigo-700 outline-none focus:border-indigo-500"
                >
                  <option value={1}>1 (มกราคม)</option>
                  <option value={2}>2 (กุมภาพันธ์)</option>
                  <option value={3}>3 (มีนาคม)</option>
                  <option value={4}>4 (เมษายน)</option>
                  <option value={5}>5 (พฤษภาคม)</option>
                  <option value={6}>6 (มิถุนายน)</option>
                  <option value={7}>7 (กรกฎาคม)</option>
                  <option value={8}>8 (สิงหาคม)</option>
                  <option value={9}>9 (กันยายน)</option>
                  <option value={10}>10 (ตุลาคม)</option>
                  <option value={11}>11 (พฤศจิกายน)</option>
                  <option value={12}>12 (ธันวาคม)</option>
                </select>
              </div>

              {/* Year Selector */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">เลือกปี</span>
                <select
                  value={ledgerYear}
                  onChange={(e) => setLedgerYear(Number(e.target.value))}
                  className="border border-slate-200 text-xs px-2 py-1.5 rounded bg-white font-bold outline-none focus:border-indigo-500"
                >
                  <option value={2026}>พ.ศ. 2569 (2026)</option>
                  <option value={2027}>พ.ศ. 2570 (2027)</option>
                  <option value={2025}>พ.ศ. 2568 (2025)</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleMonthlyLedgerExport}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2 px-4 rounded flex items-center justify-center gap-1.5 self-start md:self-auto shadow-sm transition-all"
            >
              <FileSpreadsheet className="w-4 h-4" />
              ส่งออกสมุดคุมคลังรายเดือนตามภาพตัวอย่าง (CSV)
            </button>
          </div>

          {/* Ledger Table Container */}
          <div className="overflow-x-auto border border-slate-100 rounded-lg shadow-sm">
            <table className="w-full text-left text-[11px] border-collapse min-w-[1500px]">
              <thead>
                {/* Header Row 1 */}
                <tr className="bg-slate-900 text-white border-b border-slate-800 text-xs font-bold text-center">
                  <th className="p-2 w-32 text-left sticky left-0 bg-slate-900 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.2)]">SAP No</th>
                  <th className="p-2 w-20 text-left">Customer</th>
                  <th className="p-2 w-32 text-left">Part No</th>
                  <th className="p-2 w-44 text-left">Part Name</th>
                  <th className="p-2 w-24 text-right">Opening</th>
                  {daysArray.map((d) => (
                    <th key={d} colSpan={2} className="p-2 border-l border-slate-850 border-r border-slate-800 text-center w-24">
                      {d}
                    </th>
                  ))}
                  <th className="p-2 w-28 text-right bg-slate-800">Closing</th>
                </tr>
                {/* Header Row 2 */}
                <tr className="bg-slate-850 text-slate-200 border-b border-slate-700 text-[10px] font-semibold text-center">
                  <th className="p-1.5 text-left sticky left-0 bg-slate-850 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.2)]"></th>
                  <th className="p-1.5 text-left"></th>
                  <th className="p-1.5 text-left"></th>
                  <th className="p-1.5 text-left"></th>
                  <th className="p-1.5 text-right"></th>
                  {daysArray.map((d) => (
                    <React.Fragment key={d}>
                      <th className="p-1 border-l border-slate-700 text-emerald-400 text-center w-12 font-bold">IN</th>
                      <th className="p-1 border-r border-slate-700 text-red-400 text-center w-12 font-bold">OUT</th>
                    </React.Fragment>
                  ))}
                  <th className="p-1.5 text-right bg-slate-700"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ledgerData.map((item, idx) => {
                  const isEven = idx % 2 === 0;
                  const rowBg = isEven ? 'bg-white' : 'bg-slate-50';
                  return (
                    <tr key={item.id} className={`${rowBg} hover:bg-slate-100/80 transition-all`}>
                      <td className={`p-2 font-mono text-slate-500 font-semibold sticky left-0 z-10 border-r border-slate-100 shadow-[2px_0_5px_rgba(0,0,0,0.03)] ${rowBg}`}>
                        {item.sapNo || '-'}
                      </td>
                      <td className="p-2 font-black text-slate-700">{item.customer}</td>
                      <td className="p-2 font-black text-indigo-700">{item.partNo}</td>
                      <td className="p-2 text-slate-500 truncate max-w-[150px]" title={item.partName}>
                        {item.partName || '-'}
                      </td>
                      <td className="p-2 text-right font-bold text-slate-800 bg-slate-50/40">
                        {item.opening.toLocaleString()}
                      </td>
                      {daysArray.map((d) => {
                        const dVal = item.daysData[d] || { inbound: 0, outbound: 0 };
                        return (
                          <React.Fragment key={d}>
                            {/* IN */}
                            <td className="p-1 border-l border-slate-100 text-center font-bold text-[10px] text-emerald-600 w-12 bg-emerald-50/10">
                              {dVal.inbound > 0 ? dVal.inbound.toLocaleString() : ''}
                            </td>
                            {/* OUT */}
                            <td className="p-1 border-r border-slate-100 text-center font-bold text-[10px] text-red-600 w-12 bg-rose-50/10">
                              {dVal.outbound > 0 ? dVal.outbound.toLocaleString() : ''}
                            </td>
                          </React.Fragment>
                        );
                      })}
                      {/* Closing */}
                      <td className="p-2 text-right font-black text-slate-900 bg-indigo-50/30 text-xs">
                        {item.closing.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
                {ledgerData.length === 0 && (
                  <tr>
                    <td colSpan={5 + daysInMonth * 2 + 1} className="text-center py-12 text-slate-400">
                      ไม่พบข้อมูลพาร์ทสินค้าในระบบสอดคล้องกับการค้นหาของคุณ
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Quick Summary Bar */}
          <div className="bg-slate-900 text-slate-200 p-3 rounded-lg flex flex-col sm:flex-row justify-between items-center text-xs gap-2">
            <div>
              พบพาร์ทสินค้าทั้งหมด <span className="text-indigo-400 font-black">{ledgerData.length}</span> รายการ
            </div>
            <div className="flex gap-4">
              <div>
                ยอดยกมาเริ่มเดือนรวม: <span className="text-amber-400 font-black">{ledgerData.reduce((acc, x) => acc + x.opening, 0).toLocaleString()}</span> ชิ้น
              </div>
              <div>
                ยอดคงเหลือท้ายเดือนรวม: <span className="text-emerald-400 font-black">{ledgerData.reduce((acc, x) => acc + x.closing, 0).toLocaleString()}</span> ชิ้น
              </div>
            </div>
          </div>
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
