import React, { useState } from 'react';
import { Product, DepositWithdraw } from '../data';
import { fuzzySearchProducts } from '../utils';
import { ArrowLeftRight, CheckCircle, XCircle, Trash2, ClipboardCheck, Plus, Scan } from 'lucide-react';

interface DepositPanelProps {
  products: Product[];
  deposits: DepositWithdraw[];
  currentUser: any;
  onAddDeposit: (dep: DepositWithdraw) => void;
  onUpdateDepositStatus: (id: string, status: 'APPROVED' | 'REJECTED', storeKeeper: string) => void;
  onDeleteDeposit: (id: string) => void;
}

export const DepositPanel: React.FC<DepositPanelProps> = ({
  products,
  deposits,
  currentUser,
  onAddDeposit,
  onUpdateDepositStatus,
  onDeleteDeposit,
}) => {
  const [actionType, setActionType] = useState<'DEPOSIT' | 'WITHDRAW'>('DEPOSIT');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [qtyInput, setQtyInput] = useState('');
  
  // Barcode simulation
  const [scanPartInput, setScanPartInput] = useState('');

  const fuzzyMatches = searchQuery ? fuzzySearchProducts(searchQuery, products) : [];

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setSearchQuery(product.partNo);
  };

  const handleAddRequest = () => {
    if (!selectedProduct) {
      alert('กรุณาเลือกหรือค้นหาพาร์ทสินค้าก่อน!');
      return;
    }
    const qty = parseInt(qtyInput, 10);
    if (isNaN(qty) || qty <= 0) {
      alert('กรุณากรอกจำนวนชิ้นที่ถูกต้อง!');
      return;
    }

    // Validation: If withdrawing, check if there are approved deposit balances available
    if (actionType === 'WITHDRAW') {
      const key = `${selectedProduct.customer}-${selectedProduct.partNo}`;
      
      // Calculate total approved deposited qty
      const totalDeposited = deposits
        .filter((d) => d.partNo === selectedProduct.partNo && d.customer === selectedProduct.customer && d.type === 'DEPOSIT' && d.status === 'APPROVED')
        .reduce((acc, d) => acc + d.qty, 0);

      const totalWithdrawn = deposits
        .filter((d) => d.partNo === selectedProduct.partNo && d.customer === selectedProduct.customer && d.type === 'WITHDRAW' && d.status === 'APPROVED')
        .reduce((acc, d) => acc + d.qty, 0);

      const netBalance = totalDeposited - totalWithdrawn;

      if (qty > netBalance) {
        alert(`ไม่สามารถทำเรื่องเบิกงานได้! ยอดฝากคงเหลือในระบบคือ ${netBalance} ชิ้น (คุณขอเบิก ${qty} ชิ้น)`);
        return;
      }
    }

    const newDep: DepositWithdraw = {
      id: `DEP-${Math.floor(Math.random() * 1000000)}`,
      partNo: selectedProduct.partNo,
      customer: selectedProduct.customer,
      qty,
      type: actionType,
      depositor: currentUser ? `${currentUser.name} ${currentUser.lastName}` : 'System Production',
      storeKeeper: '',
      status: 'PENDING',
      timestamp: new Date().toISOString(),
    };

    onAddDeposit(newDep);
    setQtyInput('');
    setSelectedProduct(null);
    setSearchQuery('');
    alert(`ส่งเรื่องขอ ${actionType === 'DEPOSIT' ? 'ฝากงาน' : 'เบิกงาน'} เรียบร้อยแล้ว! รอดำเนินการตรวจรับโดยสโตร์`);
  };

  // Scanner Simulation for Deposit
  const simulateScan = () => {
    const match = products.find((p) => p.partNo.toUpperCase() === scanPartInput.toUpperCase());
    if (match) {
      setSelectedProduct(match);
      setSearchQuery(match.partNo);
      setScanPartInput('');
    } else {
      alert('ไม่พบรหัสสินค้าในระบบ!');
    }
  };

  // Permissions helper
  const isStoreKeeper = currentUser?.role === 'admin' || currentUser?.role === 'user_store';

  return (
    <div className="space-y-4">
      {/* Upper Controls */}
      <div className="bg-white rounded border border-slate-200 p-4 shadow-sm space-y-3">
        <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
          <ArrowLeftRight className="w-4 h-4 text-amber-500" />
          ระบบฝาก/เบิกงาน ฝ่ายผลิตและสโตร์ (Isolated Temporary Deposit)
        </h2>
        <p className="text-[11px] text-slate-400">
          *หมายเหตุ: ข้อมูลฝากเบิกในส่วนนี้ ถูกตัดแยกเฉพาะงานฝากชั่วคราว ไม่ปะปนรวมกับระบบยอดสต๊อกคลังหลัก
        </p>

        {/* Deposit/Withdraw Switcher */}
        <div className="flex gap-2 border-b pb-2">
          <button
            onClick={() => setActionType('DEPOSIT')}
            className={`px-4 py-1.5 text-xs font-bold rounded ${actionType === 'DEPOSIT' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600'}`}
          >
            ทำเรื่องฝากงาน (Deposit Request)
          </button>
          <button
            onClick={() => setActionType('WITHDRAW')}
            className={`px-4 py-1.5 text-xs font-bold rounded ${actionType === 'WITHDRAW' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600'}`}
          >
            ทำเรื่องเบิกงาน (Withdrawal Request)
          </button>
        </div>

        {/* Form Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <label className="text-[9px] font-bold uppercase text-slate-400">ค้นหาพาร์ทสินค้า</label>
            <input
              type="text"
              placeholder="รหัส Part No / ค้นหาสินค้า..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border p-2 text-xs rounded outline-none focus:ring-1 focus:ring-blue-500"
            />
            {searchQuery && fuzzyMatches.length > 0 && (
              <div className="absolute left-0 right-0 top-full bg-white border border-slate-200 rounded mt-1 max-h-40 overflow-y-auto z-10 shadow-lg divide-y">
                {fuzzyMatches.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectProduct(p)}
                    className="w-full text-left p-2 hover:bg-slate-50 text-[11px] block"
                  >
                    <span className="font-bold text-slate-800">{p.partNo}</span>
                    <span className="text-slate-400 mx-1">|</span>
                    <span className="text-slate-500">{p.customer}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="text-[9px] font-bold uppercase text-slate-400">จำนวนที่ต้องการ (ชิ้น)</label>
            <input
              type="number"
              placeholder="กรอกจำนวนยอดฝาก/เบิก..."
              value={qtyInput}
              onChange={(e) => setQtyInput(e.target.value)}
              className="w-full border p-2 text-xs rounded outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={handleAddRequest}
              className="w-full bg-slate-900 text-white text-xs py-2 px-4 rounded font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              ส่งคำขอฝาก-เบิก (Submit)
            </button>
          </div>
        </div>

        {/* Scan simulator */}
        <div className="bg-slate-50 p-2 rounded border border-dashed border-slate-300 flex flex-col sm:flex-row gap-2 items-center justify-between">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
            <Scan className="w-4 h-4 text-amber-500" />
            <span>สแกน Part No รวดเร็ว:</span>
          </div>
          <div className="flex gap-1 flex-1 w-full sm:w-auto">
            <input
              type="text"
              placeholder="ยิงบาร์โค้ด QR..."
              value={scanPartInput}
              onChange={(e) => setScanPartInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  simulateScan();
                }
              }}
              className="border p-1 text-xs rounded flex-1 bg-white font-mono"
            />
            <button
              onClick={simulateScan}
              className="bg-slate-800 text-white text-xs px-2.5 py-1 font-bold rounded"
            >
              สแกน QR
            </button>
          </div>
        </div>
      </div>

      {/* Requests Ledger Table */}
      <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-3 bg-slate-50 border-b flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700">ประวัติและการตรวจรับคำขอฝาก/เบิก</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px] border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b">
                <th className="p-2">วันที่ยื่น</th>
                <th className="p-2">ประเภท</th>
                <th className="p-2">Part No / ลูกค้า</th>
                <th className="p-2 text-right">จำนวน</th>
                <th className="p-2">ผู้ยื่นคำขอ (ผลิต)</th>
                <th className="p-2">ผู้ตรวจสอบ (สโตร์)</th>
                <th className="p-2">สถานะ</th>
                <th className="p-2 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {deposits.map((dep) => (
                <tr key={dep.id} className="hover:bg-slate-50">
                  <td className="p-2 text-slate-400">
                    {new Date(dep.timestamp).toLocaleDateString('th-TH')} {new Date(dep.timestamp).toLocaleTimeString('th-TH')}
                  </td>
                  <td className="p-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${dep.type === 'DEPOSIT' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>
                      {dep.type === 'DEPOSIT' ? 'ฝากงาน' : 'เบิกงาน'}
                    </span>
                  </td>
                  <td className="p-2">
                    <div className="font-bold text-slate-800">{dep.partNo}</div>
                    <div className="text-[10px] text-slate-400">{dep.customer}</div>
                  </td>
                  <td className="p-2 text-right font-bold text-slate-800">{dep.qty.toLocaleString()}</td>
                  <td className="p-2 text-slate-600">{dep.depositor}</td>
                  <td className="p-2 text-slate-600">{dep.storeKeeper || '-'}</td>
                  <td className="p-2">
                    <span className={`inline-flex items-center gap-1 font-bold ${dep.status === 'APPROVED' ? 'text-emerald-600' : dep.status === 'REJECTED' ? 'text-red-500' : 'text-slate-500'}`}>
                      {dep.status === 'APPROVED' && 'อนุมัติเรียบร้อย'}
                      {dep.status === 'REJECTED' && 'ปฏิเสธคำขอ'}
                      {dep.status === 'PENDING' && 'รอตรวจรับ'}
                    </span>
                  </td>
                  <td className="p-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {dep.status === 'PENDING' && isStoreKeeper && (
                        <>
                          <button
                            onClick={() => onUpdateDepositStatus(dep.id, 'APPROVED', currentUser ? `${currentUser.name} ${currentUser.lastName}` : 'Storekeeper')}
                            title="อนุมัติการตรวจรับ"
                            className="text-emerald-600 hover:text-emerald-800"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onUpdateDepositStatus(dep.id, 'REJECTED', currentUser ? `${currentUser.name} ${currentUser.lastName}` : 'Storekeeper')}
                            title="ปฏิเสธ"
                            className="text-red-500 hover:text-red-700"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {(currentUser?.role === 'admin' || currentUser?.role === 'leader') && (
                        <button onClick={() => onDeleteDeposit(dep.id)} className="text-slate-400 hover:text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {deposits.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-6 text-slate-400">
                    ยังไม่มีรายการฝาก-เบิกสินค้าผ่านระบบชั่วคราว
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
