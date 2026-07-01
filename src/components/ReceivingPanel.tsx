import React, { useState } from 'react';
import { Product, Transaction } from '../data';
import { generateLabelId, fuzzySearchProducts } from '../utils';
import { Plus, Trash2, CheckCircle, HelpCircle, Scan, AlertTriangle } from 'lucide-react';
import { LocationSearchInput } from './LocationSearchInput';

interface ReceivingPanelProps {
  products: Product[];
  transactions: Transaction[];
  currentUser: any;
  onSaveReceiving: (newTrans: Transaction[], updatedProducts: Product[]) => void;
  locations: string[];
  onAddProductPrompt: (partNo: string) => void;
}

interface TempReceiveItem {
  id: string; // React key
  labelId: string;
  partNo: string;
  customer: string;
  fullBox: number;
  qty: number;
  location: string;
}

export const ReceivingPanel: React.FC<ReceivingPanelProps> = ({
  products,
  transactions,
  currentUser,
  onSaveReceiving,
  locations,
  onAddProductPrompt,
}) => {
  const [receiveType, setReceiveType] = useState('รับเข้าจากฝ่ายผลิต');
  const [customTypes, setCustomTypes] = useState<string[]>([]);
  const [newTypeInput, setNewTypeInput] = useState('');
  const [showAddType, setShowAddType] = useState(false);

  // Search input
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isFuzzySearching, setIsFuzzySearching] = useState(false);

  // Active entries to submit
  const [itemsList, setItemsList] = useState<TempReceiveItem[]>([]);
  
  // Custom box size modification modal
  const [boxAlert, setBoxAlert] = useState<{ show: boolean; index: number; newSize: number; originalSize: number } | null>(null);

  // Quick scanner simulator
  const [scanLabelInput, setScanLabelInput] = useState('');
  const [scanPartInput, setScanPartInput] = useState('');

  // Fuzzy matches to display
  const fuzzyMatches = searchQuery ? fuzzySearchProducts(searchQuery, products) : [];

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setSearchQuery(product.partNo);
  };

  const handleAddNewType = () => {
    if (newTypeInput.trim()) {
      setCustomTypes([...customTypes, newTypeInput.trim()]);
      setReceiveType(newTypeInput.trim());
      setNewTypeInput('');
      setShowAddType(false);
    }
  };

  const handleSearchCheck = () => {
    if (searchQuery.trim() && fuzzyMatches.length === 0) {
      // Prompt user to add new product if not found
      onAddProductPrompt(searchQuery.trim());
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

    const newItem: TempReceiveItem = {
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

  const handleBoxSizeEdit = (index: number, newFullBoxStr: string) => {
    const newSize = parseInt(newFullBoxStr, 10) || 0;
    const item = itemsList[index];
    const originalProd = products.find((p) => p.partNo === item.partNo && p.customer === item.customer);

    if (originalProd && originalProd.fullBox !== newSize) {
      // Trigger prompt to adjust Master product full box
      setBoxAlert({
        show: true,
        index,
        newSize,
        originalSize: originalProd.fullBox,
      });
    }
  };

  const confirmBoxAdjustment = (agree: boolean) => {
    if (!boxAlert) return;
    const { index, newSize } = boxAlert;
    
    const updatedItems = [...itemsList];
    const targetItem = updatedItems[index];

    if (agree) {
      // Modify original product fullBox and update the item quantity
      targetItem.fullBox = newSize;
      targetItem.qty = newSize; // default to new full size
    } else {
      // Keep original product size but update this item's quantity only
      targetItem.qty = newSize;
    }

    setItemsList(updatedItems);
    setBoxAlert(null);
  };

  const handleRemoveItem = (index: number) => {
    setItemsList(itemsList.filter((_, i) => i !== index));
  };

  const handleSaveAll = () => {
    if (itemsList.length === 0) {
      alert('ไม่มีรายการรับเข้าสำหรับบันทึก!');
      return;
    }

    // Label validation (no duplicates allowed)
    const activeLabelIds = itemsList.map((i) => i.labelId);
    const hasDuplicateInActive = new Set(activeLabelIds).size !== activeLabelIds.length;
    if (hasDuplicateInActive) {
      alert('ตรวจพบคีย์สลาเบล (Label ID) ซ้ำกันในรายการของคุณ!');
      return;
    }

    const existingLabelIds = transactions.map((t) => t.labelId);
    for (const item of itemsList) {
      if (existingLabelIds.includes(item.labelId)) {
        alert(`ลาเบลเลขที่ ${item.labelId} มีอยู่ในฐานข้อมูลแล้วเพื่อป้องกันการสแกนซ้ำ!`);
        return;
      }
    }

    // Build transactions and update stocks
    const newTransactions: Transaction[] = itemsList.map((item) => ({
      labelId: item.labelId,
      partNo: item.partNo,
      customer: item.customer,
      type: 'RECEIVE',
      subType: receiveType,
      qty: item.qty,
      user: currentUser ? `${currentUser.name} ${currentUser.lastName}` : 'System Admin',
      timestamp: new Date().toISOString(),
      location: item.location,
    }));

    // Update Products Stock
    const updatedProductsList = products.map((prod) => {
      // Find matching inbound entries
      const matchedEntries = itemsList.filter((item) => item.partNo === prod.partNo && item.customer === prod.customer);
      if (matchedEntries.length > 0) {
        const totalAdded = matchedEntries.reduce((acc, entry) => acc + entry.qty, 0);
        
        // Also check if any full box updates were approved
        const approvedBoxUpdate = matchedEntries.find((item) => item.fullBox !== prod.fullBox);
        const finalFullBox = approvedBoxUpdate ? approvedBoxUpdate.fullBox : prod.fullBox;

        return {
          ...prod,
          fullBox: finalFullBox,
          inboundQty: prod.inboundQty + totalAdded,
          currentStock: prod.currentStock + totalAdded,
        };
      }
      return prod;
    });

    onSaveReceiving(newTransactions, updatedProductsList);
    setItemsList([]);
    setSelectedProduct(null);
    setSearchQuery('');
    alert('บันทึกยอดรับเข้าสำเร็จและอัปเดตสต๊อกเรียบร้อยแล้ว!');
  };

  // Scanner simulation
  const simulateScan = () => {
    if (!scanPartInput) {
      alert('กรุณากรอกรหัสพาร์ทเพื่อจำลองการสแกน QR!');
      return;
    }
    const match = products.find((p) => p.partNo.toUpperCase() === scanPartInput.toUpperCase());
    if (match) {
      setSelectedProduct(match);
      setSearchQuery(match.partNo);
      
      // Auto-add to list
      const newLabel = scanLabelInput || generateLabelId([
        ...transactions.map((t) => t.labelId),
        ...itemsList.map((i) => i.labelId),
      ]);

      const newItem: TempReceiveItem = {
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
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded border border-slate-200 p-4 shadow-sm space-y-3">
        <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
          <Scan className="w-4 h-4 text-emerald-600" />
          ระบบรับสินค้าเข้าคลัง (Receiving Inbound)
        </h2>

        {/* Receive Type Selector */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-[9px] font-bold uppercase text-slate-400">ประเภทการรับงานเข้า</label>
            <div className="flex gap-1">
              <select
                value={receiveType}
                onChange={(e) => setReceiveType(e.target.value)}
                className="w-full border p-1.5 text-xs rounded bg-slate-50 outline-none"
              >
                <option value="รับเข้าจากฝ่ายผลิต">รับเข้าจากฝ่ายผลิต (Production Output)</option>
                <option value="รับคืนสโตร์">รับคืนสโตร์ (Return to Store)</option>
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
                  placeholder="เพิ่มประเภทการรับงาน..."
                  value={newTypeInput}
                  onChange={(e) => setNewTypeInput(e.target.value)}
                  className="w-full border p-1 text-xs rounded"
                />
              </div>
              <button
                onClick={handleAddNewType}
                className="bg-emerald-600 text-white text-xs px-2.5 py-1.5 font-bold rounded hover:bg-emerald-500"
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
              onBlur={handleSearchCheck}
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
            <label className="text-[9px] font-bold uppercase text-slate-400">ขนาดกล่อง (Full Box ขนาดปกติ)</label>
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
              className="w-full bg-emerald-600 text-white text-xs py-2 px-4 rounded font-bold hover:bg-emerald-500 transition-all flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              เพิ่มรายการรับเข้า
            </button>
          </div>
        </div>

        {/* QR Simulation Tools */}
        <div className="bg-slate-50 p-2.5 rounded border border-dashed border-slate-300">
          <h4 className="text-[10px] font-bold uppercase text-slate-500 mb-1 flex items-center gap-1">
            <Scan className="w-3 h-3" />
            เครื่องมือสแกนบาร์โค้ดจำลอง (Scan Simulator)
          </h4>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="เลขที่ลาเบล (ปล่อยว่างหากต้องการสแกนอัตโนมัติ)"
              value={scanLabelInput}
              onChange={(e) => setScanLabelInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  simulateScan();
                }
              }}
              className="border p-1.5 text-xs rounded flex-1 bg-white"
            />
            <input
              type="text"
              placeholder="รหัส Part No (สแกนคิวอาร์)"
              value={scanPartInput}
              onChange={(e) => setScanPartInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  simulateScan();
                }
              }}
              className="border p-1.5 text-xs rounded flex-1 bg-white font-mono"
            />
            <button
              onClick={simulateScan}
              className="bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded hover:bg-slate-700 shrink-0"
            >
              ยิงบาร์โค้ด (Scan QR)
            </button>
          </div>
        </div>
      </div>

      {/* Items List Table */}
      {itemsList.length > 0 && (
        <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-3 bg-slate-50 border-b flex justify-between items-center">
            <span className="text-xs font-bold text-slate-700">รายการรับเข้าชั่วคราว ({itemsList.length} รายการ)</span>
            <button onClick={handleSaveAll} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded">
              บันทึกการรับเข้าทั้งหมด
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px] border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b">
                  <th className="p-2">Label ID</th>
                  <th className="p-2">Part No</th>
                  <th className="p-2">ลูกค้า</th>
                  <th className="p-2">ตำแหน่งจัดเก็บ (Location)</th>
                  <th className="p-2 text-right">ยอดรับจริง (Qty)</th>
                  <th className="p-2 text-right">ขนาดกล่อง (Full)</th>
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
                        className="border p-1 text-[11px] font-mono rounded w-32 focus:ring-1 focus:ring-blue-500 outline-none"
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
                    <td className="p-2 text-right">
                      <input
                        type="number"
                        placeholder={`${item.fullBox}`}
                        onBlur={(e) => handleBoxSizeEdit(idx, e.target.value)}
                        className="border p-1 text-[11px] rounded w-16 text-right outline-none"
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

      {/* Box Alert Confirmation Modal */}
      {boxAlert && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-5 max-w-sm w-full shadow-xl border border-slate-300 space-y-3">
            <div className="flex items-center gap-2 text-amber-600 font-bold text-sm">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>แจ้งเตือนปรับยอด Full Box ในระบบ</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              ยอด Full Box ที่คุณป้อน ({boxAlert.newSize}) แตกต่างจากยอดดั้งเดิมที่ลงทะเบียน ({boxAlert.originalSize}) 
              ต้องการแก้ไขขนาดบรรจุมาตรฐานสำหรับสินค้านี้ในฐานข้อมูล Master หรือไม่?
            </p>
            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => confirmBoxAdjustment(false)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs px-3 py-1.5 font-bold rounded"
              >
                ไม่ (ปรับปรุงเฉพาะกล่องนี้)
              </button>
              <button
                onClick={() => confirmBoxAdjustment(true)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-4 py-1.5 font-bold rounded"
              >
                ใช่ (ปรับมาตรฐานสินค้า)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
