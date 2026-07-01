import React, { useState } from 'react';
import { Product, Transaction, AdjustRequest } from '../data';
import { generateLabelId, fuzzySearchProducts } from '../utils';
import { Plus, Trash2, ShieldAlert, Scan, HelpCircle, CornerDownRight } from 'lucide-react';
import { LocationSearchInput } from './LocationSearchInput';

interface TransferPanelProps {
  products: Product[];
  transactions: Transaction[];
  currentUser: any;
  onSaveTransfer: (newTrans: Transaction[], updatedProducts: Product[]) => void;
  onSubmitAdjustmentRequest: (req: AdjustRequest) => void;
  locations: string[];
  onAddProductPrompt: (partNo: string) => void;
}

interface TempTransferItem {
  id: string; // React key
  labelId: string;
  partNo: string;
  customer: string;
  fullBox: number;
  qty: number;
  location: string;
}

export const TransferPanel: React.FC<TransferPanelProps> = ({
  products,
  transactions,
  currentUser,
  onSaveTransfer,
  onSubmitAdjustmentRequest,
  locations,
  onAddProductPrompt,
}) => {
  const [transferType, setTransferType] = useState('ส่งสโตร์ FG');
  const [customTypes, setCustomTypes] = useState<string[]>([]);
  const [newTypeInput, setNewTypeInput] = useState('');
  const [showAddType, setShowAddType] = useState(false);

  // Search input
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Active entries to transfer
  const [itemsList, setItemsList] = useState<TempTransferItem[]>([]);

  // Insufficient stock warning modal state
  const [stockWarning, setStockWarning] = useState<{
    show: boolean;
    partNo: string;
    customer: string;
    currentStock: number;
    requestedQty: number;
    mismatchQty: number;
  } | null>(null);

  const [mismatchInput, setMismatchInput] = useState('');

  // Scanner inputs
  const [scanLabelInput, setScanLabelInput] = useState('');
  const [scanPartInput, setScanPartInput] = useState('');

  const fuzzyMatches = searchQuery ? fuzzySearchProducts(searchQuery, products) : [];

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setSearchQuery(product.partNo);
  };

  const handleAddNewType = () => {
    if (newTypeInput.trim()) {
      setCustomTypes([...customTypes, newTypeInput.trim()]);
      setTransferType(newTypeInput.trim());
      setNewTypeInput('');
      setShowAddType(false);
    }
  };

  // Label ID Auto-Pull logic: if scanned or entered, search if there is a matching receiving label
  const handleLabelIdSearch = (index: number, labelId: string) => {
    const matchedRec = transactions.find((t) => t.labelId === labelId && t.type === 'RECEIVE');
    if (matchedRec) {
      const updated = [...itemsList];
      updated[index].partNo = matchedRec.partNo;
      updated[index].customer = matchedRec.customer;
      updated[index].qty = matchedRec.qty;
      updated[index].location = matchedRec.location;
      
      const prod = products.find((p) => p.partNo === matchedRec.partNo);
      if (prod) {
        updated[index].fullBox = prod.fullBox;
      }
      setItemsList(updated);
    }
  };

  const handleAddItem = () => {
    if (!selectedProduct) {
      alert('กรุณาเลือกหรือค้นหาพาร์ทสินค้าก่อน!');
      return;
    }

    const newLabel = generateLabelId([
      ...transactions.map((t) => t.labelId),
      ...itemsList.map((i) => i.labelId),
    ]);

    const newItem: TempTransferItem = {
      id: Math.random().toString(),
      labelId: newLabel,
      partNo: selectedProduct.partNo,
      customer: selectedProduct.customer,
      fullBox: selectedProduct.fullBox,
      qty: selectedProduct.fullBox,
      location: locations[0] || 'DIT-01',
    };

    setItemsList([...itemsList, newItem]);
  };

  const handleUpdateItemQty = (index: number, qtyVal: number) => {
    const updated = [...itemsList];
    updated[index].qty = qtyVal;
    setItemsList(updated);
  };

  const handleUpdateItemLabel = (index: number, labelVal: string) => {
    const updated = [...itemsList];
    updated[index].labelId = labelVal;
    setItemsList(updated);
  };

  const handleUpdateItemLocation = (index: number, locVal: string) => {
    const updated = [...itemsList];
    updated[index].location = locVal;
    setItemsList(updated);
  };

  const handleRemoveItem = (index: number) => {
    setItemsList(itemsList.filter((_, i) => i !== index));
  };

  const handleSaveAll = () => {
    if (itemsList.length === 0) {
      alert('ไม่มีรายการโอนออกสำหรับบันทึก!');
      return;
    }

    // 1. Group and check stock availability for each Product
    const qtyByProduct: Record<string, number> = {};
    for (const item of itemsList) {
      const key = `${item.customer}-${item.partNo}`;
      qtyByProduct[key] = (qtyByProduct[key] || 0) + item.qty;
    }

    // Validate stocks
    for (const key of Object.keys(qtyByProduct)) {
      const prod = products.find((p) => p.id === key);
      const reqQty = qtyByProduct[key];
      if (prod && prod.currentStock < reqQty) {
        const mismatch = reqQty - prod.currentStock;
        setStockWarning({
          show: true,
          partNo: prod.partNo,
          customer: prod.customer,
          currentStock: prod.currentStock,
          requestedQty: reqQty,
          mismatchQty: mismatch,
        });
        return; // stop execution and show warning
      }
    }

    // Build transactions and update stocks
    const newTransactions: Transaction[] = itemsList.map((item) => ({
      labelId: item.labelId,
      partNo: item.partNo,
      customer: item.customer,
      type: 'TRANSFER',
      subType: transferType,
      qty: -item.qty, // negative quantity representing reduction
      user: currentUser ? `${currentUser.name} ${currentUser.lastName}` : 'System Admin',
      timestamp: new Date().toISOString(),
      location: item.location,
    }));

    // Update Products Stock
    const updatedProductsList = products.map((prod) => {
      const matchedEntries = itemsList.filter((item) => item.partNo === prod.partNo && item.customer === prod.customer);
      if (matchedEntries.length > 0) {
        const totalRemoved = matchedEntries.reduce((acc, entry) => acc + entry.qty, 0);
        return {
          ...prod,
          outboundQty: prod.outboundQty + totalRemoved,
          currentStock: prod.currentStock - totalRemoved,
        };
      }
      return prod;
    });

    onSaveTransfer(newTransactions, updatedProductsList);
    setItemsList([]);
    setSelectedProduct(null);
    setSearchQuery('');
    alert('บันทึกการโอนจ่ายสินค้าสำเร็จและตัดยอดเรียบร้อยแล้ว!');
  };

  const handleAdjustmentRequestSubmit = () => {
    if (!stockWarning) return;
    const counted = parseInt(mismatchInput, 10);
    if (isNaN(counted) || counted < 0) {
      alert('กรุณากรอกจำนวนที่นับได้จริงที่ถูกต้อง!');
      return;
    }

    const delta = counted - stockWarning.currentStock;
    const newRequest: AdjustRequest = {
      id: `REQ-${Math.floor(Math.random() * 1000000)}`,
      partNo: stockWarning.partNo,
      customer: stockWarning.customer,
      currentStock: stockWarning.currentStock,
      countedQty: counted,
      delta,
      requester: currentUser ? `${currentUser.name} ${currentUser.lastName}` : 'System Admin',
      status: 'PENDING',
      timestamp: new Date().toISOString(),
    };

    onSubmitAdjustmentRequest(newRequest);
    setMismatchInput('');
    setStockWarning(null);
    alert('ส่งเรื่องขออนุมัติปรับปรุงสต๊อกส่งไปยัง Admin/Leader เรียบร้อยแล้ว!');
  };

  // Simulate barcode scanner
  const simulateScan = () => {
    if (scanLabelInput) {
      // Find in receiving labels
      const matchedRec = transactions.find((t) => t.labelId === scanLabelInput && t.type === 'RECEIVE');
      if (matchedRec) {
        const prod = products.find((p) => p.partNo === matchedRec.partNo);
        const newItem: TempTransferItem = {
          id: Math.random().toString(),
          labelId: matchedRec.labelId,
          partNo: matchedRec.partNo,
          customer: matchedRec.customer,
          fullBox: prod ? prod.fullBox : matchedRec.qty,
          qty: matchedRec.qty,
          location: matchedRec.location,
        };
        setItemsList([...itemsList, newItem]);
        setScanLabelInput('');
        setScanPartInput('');
        return;
      }
    }

    if (scanPartInput) {
      const match = products.find((p) => p.partNo.toUpperCase() === scanPartInput.toUpperCase());
      if (match) {
        setSelectedProduct(match);
        setSearchQuery(match.partNo);

        const newLabel = scanLabelInput || generateLabelId([
          ...transactions.map((t) => t.labelId),
          ...itemsList.map((i) => i.labelId),
        ]);

        const newItem: TempTransferItem = {
          id: Math.random().toString(),
          labelId: newLabel,
          partNo: match.partNo,
          customer: match.customer,
          fullBox: match.fullBox,
          qty: match.fullBox,
          location: locations[0] || 'DIT-01',
        };
        setItemsList([...itemsList, newItem]);
        setScanLabelInput('');
        setScanPartInput('');
      } else {
        onAddProductPrompt(scanPartInput);
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded border border-slate-200 p-4 shadow-sm space-y-3">
        <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
          <Scan className="w-4 h-4 text-red-600" />
          ระบบจ่าย/โอนสินค้าออกคลัง (Transfer Outbound)
        </h2>

        {/* Transfer Type Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-[9px] font-bold uppercase text-slate-400">ประเภทการโอนออก</label>
            <div className="flex gap-1">
              <select
                value={transferType}
                onChange={(e) => setTransferType(e.target.value)}
                className="w-full border p-1.5 text-xs rounded bg-slate-50 outline-none"
              >
                <option value="ส่งสโตร์ FG">ส่งสโตร์ FG (Send Store FG - Default)</option>
                <option value="เบิกงาน Rework">เบิกงาน Rework (Withdraw for Rework)</option>
                <option value="เบิกงาน จาก TN">เบิกงาน จาก TN (Withdraw from TN)</option>
                {customTypes.map((type, idx) => (
                  <option key={idx} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowAddType(!showAddType)}
                className="bg-slate-200 hover:bg-slate-300 px-2.5 py-1 text-xs font-bold rounded"
              >
                +
              </button>
            </div>
          </div>

          {showAddType && (
            <div className="flex items-end gap-1">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="เพิ่มประเภทการโอนจ่าย..."
                  value={newTypeInput}
                  onChange={(e) => setNewTypeInput(e.target.value)}
                  className="w-full border p-1 text-xs rounded"
                />
              </div>
              <button
                onClick={handleAddNewType}
                className="bg-red-600 text-white text-xs px-2.5 py-1.5 font-bold rounded hover:bg-red-500"
              >
                เพิ่ม
              </button>
            </div>
          )}
        </div>

        {/* Product Selection Form */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
          <div className="relative">
            <label className="text-[9px] font-bold uppercase text-slate-400">พิมพ์ค้นหา / สแกนคิวอาร์ (Fuzzy Search)</label>
            <input
              type="text"
              placeholder="รหัส Part No / ชื่อสินค้า..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border p-2 text-xs rounded outline-none focus:ring-1 focus:ring-blue-500"
            />
            
            {/* Fuzzy Dropdown Suggestion Box */}
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
                    <span className="block text-[9px] text-slate-400">{p.partName}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="text-[9px] font-bold uppercase text-slate-400">ขนาดกล่อง (Full Box)</label>
            <input
              type="text"
              disabled
              value={selectedProduct ? `${selectedProduct.fullBox} Pcs / ${selectedProduct.packageType}` : '--'}
              className="w-full border p-2 text-xs rounded bg-slate-100 font-bold"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={handleAddItem}
              className="w-full bg-red-600 text-white text-xs py-2 px-4 rounded font-bold hover:bg-red-500 transition-all flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              เพิ่มรายการโอนออก
            </button>
          </div>
        </div>

        {/* Barcode Simulator Tools */}
        <div className="bg-slate-50 p-2.5 rounded border border-dashed border-slate-300">
          <h4 className="text-[10px] font-bold uppercase text-slate-500 mb-1 flex items-center gap-1">
            <Scan className="w-3 h-3 text-red-600" />
            ระบบสแกนบาร์โค้ดลาเบลโอนจ่ายจำลอง (Label-Lookup Scanner)
          </h4>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="เลขที่ลาเบลรับเข้า (จะดึงข้อมูลพาร์ท/จำนวน/ที่เก็บโดยอัตโนมัติ)"
              value={scanLabelInput}
              onChange={(e) => setScanLabelInput(e.target.value)}
              className="border p-1.5 text-xs rounded flex-1 bg-white font-mono"
            />
            <input
              type="text"
              placeholder="รหัส Part No (หากไม่มีลาเบล)"
              value={scanPartInput}
              onChange={(e) => setScanPartInput(e.target.value)}
              className="border p-1.5 text-xs rounded flex-1 bg-white"
            />
            <button
              onClick={simulateScan}
              className="bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded hover:bg-slate-700 shrink-0"
            >
              จำลองสแกน (Simulate Transfer QR)
            </button>
          </div>
        </div>
      </div>

      {/* Temp Transfer Items Table */}
      {itemsList.length > 0 && (
        <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-3 bg-slate-50 border-b flex justify-between items-center">
            <span className="text-xs font-bold text-slate-700">รายการโอนออกชั่วคราว ({itemsList.length} รายการ)</span>
            <button onClick={handleSaveAll} className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-3 py-1 rounded">
              บันทึกการโอนออกทั้งหมด
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px] border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b">
                  <th className="p-2">Label ID</th>
                  <th className="p-2">Part No</th>
                  <th className="p-2">ลูกค้า</th>
                  <th className="p-2">ตำแหน่ง (Location)</th>
                  <th className="p-2 text-right">จำนวนโอนออก (Qty)</th>
                  <th className="p-2 text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {itemsList.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="p-2">
                      <input
                        type="text"
                        value={item.labelId}
                        onChange={(e) => handleUpdateItemLabel(idx, e.target.value)}
                        onBlur={(e) => handleLabelIdSearch(idx, e.target.value)}
                        className="border p-1 text-[11px] font-mono rounded w-32 outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="กรอก/ยิงลาเบล"
                      />
                    </td>
                    <td className="p-2 font-bold">{item.partNo}</td>
                    <td className="p-2 text-slate-500">{item.customer}</td>
                    <td className="p-2">
                      <LocationSearchInput
                        value={item.location}
                        onChange={(locVal) => handleUpdateItemLocation(idx, locVal)}
                        locations={locations}
                      />
                    </td>
                    <td className="p-2 text-right">
                      <input
                        type="number"
                        value={item.qty}
                        onChange={(e) => handleUpdateItemQty(idx, parseInt(e.target.value, 10) || 0)}
                        className="border p-1 text-[11px] font-bold rounded w-16 text-right outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="p-2 text-center">
                      <button onClick={() => handleRemoveItem(idx)} className="text-red-500 hover:text-red-700">
                        <Trash2 className="w-4 h-4 mx-auto" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Insufficient Stock Warning Modal */}
      {stockWarning && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-5 max-w-sm w-full shadow-xl border border-slate-300 space-y-3">
            <div className="flex items-center gap-2 text-red-600 font-bold text-sm">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <span>สินค้าขาดสต๊อก (Stock Shortage!)</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              สินค้าพาร์ท <strong className="text-slate-900">{stockWarning.partNo}</strong> ขาดสต๊อก! 
              <br />ต้องการโอนออก: <strong className="text-slate-900">{stockWarning.requestedQty} ชิ้น</strong> 
              <br />สต๊อกปัจจุบัน: <strong className="text-slate-900">{stockWarning.currentStock} ชิ้น</strong>
              <br /><span className="text-red-500 font-bold">ขาดสต๊อกอยู่: {stockWarning.mismatchQty} ชิ้น</span>
            </p>

            <div className="pt-2 border-t border-slate-100 space-y-2">
              <label className="block text-[10px] font-bold uppercase text-slate-400">
                หากพบว่าสต๊อกไม่ตรงกับที่นับจริง กรุณากรอกยอดนับจริงเพื่อส่งเรื่องปรับสต๊อก:
              </label>
              <div className="flex gap-1">
                <input
                  type="number"
                  placeholder="จำนวนนับได้จริง (Actual)..."
                  value={mismatchInput}
                  onChange={(e) => setMismatchInput(e.target.value)}
                  className="border p-1.5 text-xs rounded flex-1 focus:ring-1 focus:ring-blue-500 outline-none"
                />
                <button
                  onClick={handleAdjustmentRequestSubmit}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1 rounded font-bold shrink-0"
                >
                  ส่งขออนุมัติ
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={() => setStockWarning(null)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs px-4 py-1.5 font-bold rounded"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
