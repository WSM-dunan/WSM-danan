import React, { useState } from 'react';
import { Product, Transaction, AdjustRequest, Employee } from '../data';
import { parseImportData } from '../utils';
import { 
  Edit, 
  Trash2, 
  Plus, 
  Upload, 
  Search, 
  MapPin, 
  CheckCircle, 
  AlertTriangle, 
  FileText, 
  Printer, 
  ShieldAlert, 
  Layers, 
  ChevronRight,
  RefreshCw,
  Sliders,
  CheckCircle2
} from 'lucide-react';

interface InventoryPanelProps {
  products: Product[];
  onAddProduct: (p: Product) => void;
  onUpdateProduct: (p: Product) => void;
  onDeleteProduct: (id: string) => void;
  onImportProducts: (imported: Product[]) => void;
  onGenerateLocations: () => void;
  locations: string[];
  setLocations: (locs: string[]) => void;
  transactions: Transaction[];
  adjustRequests: AdjustRequest[];
  onSubmitAdjustmentRequest: (req: AdjustRequest) => void;
  currentUser: Employee | null;
}

export const InventoryPanel: React.FC<InventoryPanelProps> = ({
  products,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onImportProducts,
  onGenerateLocations,
  locations,
  setLocations,
  transactions,
  adjustRequests,
  onSubmitAdjustmentRequest,
  currentUser,
}) => {
  const [subTab, setSubTab] = useState<'catalog' | 'adjust' | 'count' | 'location'>('catalog');
  
  // Search and filter for Catalog tab
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerFilter, setSelectedCustomerFilter] = useState('ALL');

  // Master Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Form States for CRUD
  const [partNo, setPartNo] = useState('');
  const [partName, setPartName] = useState('');
  const [customer, setCustomer] = useState('');
  const [sapNo, setSapNo] = useState('');
  const [zone, setZone] = useState('');
  const [fullBox, setFullBox] = useState('500');
  const [packageType, setPackageType] = useState('STEEL BOX');
  const [begStock, setBegStock] = useState('1000');
  const [editingId, setEditingId] = useState('');

  // Paste excel text importer
  const [excelPasteText, setExcelPasteText] = useState('');

  // 1. Stock Adjust sub-tab states
  const [adjPartNo, setAdjPartNo] = useState('');
  const [adjLocation, setAdjLocation] = useState(locations[0] || 'DIT-01');
  const [adjPhysicalCount, setAdjPhysicalCount] = useState<number | ''>('');
  const [adjSearch, setAdjSearch] = useState('');

  // 2. Monthly Stock Count sub-tab states
  const [countQuantities, setCountQuantities] = useState<{ [id: string]: number }>({});
  const [countLocations, setCountLocations] = useState<{ [id: string]: string }>({});
  const [countGlobalLocation, setCountGlobalLocation] = useState(locations[0] || 'DIT-01');

  // 3. Location Management states
  const [locPrefix, setLocPrefix] = useState('CTC');
  const [locStart, setLocStart] = useState('0');
  const [locEnd, setLocEnd] = useState('12');
  const [selectedInspectionLoc, setSelectedInspectionLoc] = useState(locations[0] || 'DIT-01');

  // Filter products for dropdown searches
  const uniqueCustomers = Array.from(new Set(products.map((p) => p.customer)));

  const filteredProducts = products.filter((p) => {
    const matchesCust = selectedCustomerFilter === 'ALL' || p.customer === selectedCustomerFilter;
    const matchesSearch =
      !searchQuery ||
      p.partNo.toUpperCase().includes(searchQuery.toUpperCase()) ||
      p.partName.toUpperCase().includes(searchQuery.toUpperCase()) ||
      p.sapNo.toUpperCase().includes(searchQuery.toUpperCase());
    return matchesCust && matchesSearch;
  });

  const handleOpenAdd = () => {
    setPartNo('');
    setPartName('');
    setCustomer('');
    setSapNo('');
    setZone('A1');
    setFullBox('500');
    setPackageType('STEEL BOX');
    setBegStock('0');
    setShowAddModal(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingId(p.id);
    setPartNo(p.partNo);
    setPartName(p.partName);
    setCustomer(p.customer);
    setSapNo(p.sapNo);
    setZone(p.zone);
    setFullBox(String(p.fullBox));
    setPackageType(p.packageType);
    setBegStock(String(p.beginningStock));
    setShowEditModal(true);
  };

  const handleSaveAdd = () => {
    if (!partNo || !partName || !customer) {
      alert('กรุณากรอกข้อมูลพาร์ท ชื่อ และลูกค้าให้ครบถ้วน!');
      return;
    }
    const finalId = `${customer.trim()}-${partNo.trim()}`;
    if (products.some((p) => p.id === finalId)) {
      alert('สินค้ารหัส ID (ลูกค้า + Part No) นี้ได้รับการลงทะเบียนในระบบเรียบร้อยแล้ว!');
      return;
    }

    const newProd: Product = {
      id: finalId,
      sapNo: sapNo || `SAP-${Math.floor(Math.random() * 1000000)}`,
      zone: zone || 'A1',
      customer: customer.trim(),
      partNo: partNo.trim(),
      partName: partName.trim(),
      fullBox: parseInt(fullBox, 10) || 500,
      packageType,
      beginningStock: parseInt(begStock, 10) || 0,
      inboundQty: 0,
      outboundQty: 0,
      currentStock: parseInt(begStock, 10) || 0,
    };

    onAddProduct(newProd);
    setShowAddModal(false);
  };

  const handleSaveEdit = () => {
    const updatedProd: Product = {
      id: editingId,
      sapNo,
      zone,
      customer,
      partNo,
      partName,
      fullBox: parseInt(fullBox, 10) || 500,
      packageType,
      beginningStock: parseInt(begStock, 10) || 0,
      inboundQty: products.find((p) => p.id === editingId)?.inboundQty || 0,
      outboundQty: products.find((p) => p.id === editingId)?.outboundQty || 0,
      currentStock: parseInt(begStock, 10) + (products.find((p) => p.id === editingId)?.inboundQty || 0) - (products.find((p) => p.id === editingId)?.outboundQty || 0),
    };

    onUpdateProduct(updatedProd);
    setShowEditModal(false);
  };

  const handleExcelImport = () => {
    if (!excelPasteText.trim()) {
      alert('กรุณาวางข้อมูลคัดลอกจาก Excel ก่อนทำการประมวลผล!');
      return;
    }
    const parsed = parseImportData(excelPasteText);
    if (parsed.length === 0) {
      alert('ไม่พบข้อมูลรูปแบบคอลัมน์ที่รองรับ! กรุณาตรวจสอบแท็บหัวคอลัมน์');
      return;
    }

    const finalProducts: Product[] = parsed.map((p) => ({
      id: p.id || '',
      sapNo: p.sapNo || '',
      zone: p.zone || '',
      customer: p.customer || '',
      partNo: p.partNo || '',
      partName: p.partName || '',
      fullBox: p.fullBox || 500,
      packageType: p.packageType || '',
      beginningStock: p.beginningStock || 0,
      inboundQty: 0,
      outboundQty: 0,
      currentStock: p.beginningStock || 0,
    }));

    onImportProducts(finalProducts);
    setExcelPasteText('');
    setShowImportModal(false);
    alert(`นำเข้ารายการสินค้าใหม่จำนวน ${finalProducts.length} รายการจากไฟล์เรียบร้อยแล้ว!`);
  };

  // 1. Single Stock Adjust submission handler
  const handleSingleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjPartNo) {
      alert('กรุณาเลือกพาร์ทสินค้า!');
      return;
    }
    if (adjPhysicalCount === '') {
      alert('กรุณากรอกจำนวนที่นับได้จริง!');
      return;
    }

    const selectedProd = products.find((p) => p.partNo === adjPartNo);
    if (!selectedProd) {
      alert('ไม่พบข้อมูลสินค้าที่ระบุ!');
      return;
    }

    const currentSysStock = selectedProd.currentStock;
    const countVal = Number(adjPhysicalCount);
    const delta = countVal - currentSysStock;

    const newRequest: AdjustRequest = {
      id: `ADJ-${Math.floor(Math.random() * 1000000)}`,
      partNo: selectedProd.partNo,
      customer: selectedProd.customer,
      currentStock: currentSysStock,
      countedQty: countVal,
      delta: delta,
      requester: currentUser ? `${currentUser.name} ${currentUser.lastName}` : 'พนักงานคลังสินค้า',
      status: 'PENDING',
      timestamp: new Date().toISOString(),
      location: adjLocation,
    };

    onSubmitAdjustmentRequest(newRequest);
    setAdjPhysicalCount('');
    alert('ส่งเรื่องคำเสนอขออนุมัติปรับสต๊อกสินค้าไปยังหัวหน้างานสำเร็จเรียบร้อย!');
  };

  // 2. End of Month Bulk Count Submit Handler
  const handleBulkCountSubmit = () => {
    const enteredItems = Object.entries(countQuantities).filter(([_, qty]) => qty !== undefined && qty !== null);
    if (enteredItems.length === 0) {
      alert('กรุณากรอกจำนวนนับจริงอย่างน้อยหนึ่งรายการก่อนส่งคำขอ!');
      return;
    }

    let countSubmitted = 0;
    for (const [prodId, physicalValRaw] of enteredItems) {
      const prod = products.find((p) => p.id === prodId);
      if (!prod) continue;

      const physicalVal = Number(physicalValRaw);
      const delta = physicalVal - prod.currentStock;
      const countLocation = countLocations[prodId] || countGlobalLocation;

      const newRequest: AdjustRequest = {
        id: `ADJ-${Math.floor(Math.random() * 1000000)}`,
        partNo: prod.partNo,
        customer: prod.customer,
        currentStock: prod.currentStock,
        countedQty: physicalVal,
        delta: delta,
        requester: currentUser ? `${currentUser.name} ${currentUser.lastName} (ตรวจนับสิ้นเดือน)` : 'พนักงานตรวจนับสิ้นเดือน',
        status: 'PENDING',
        timestamp: new Date().toISOString(),
        location: countLocation,
      };

      onSubmitAdjustmentRequest(newRequest);
      countSubmitted++;
    }

    setCountQuantities({});
    alert(`ระบบบันทึกรายการตรวจนับสต๊อกและสร้างใบคำขอปรับสต๊อกด่วนจำนวน ${countSubmitted} พาร์ทสำเร็จ! ส่งต่อหัวหน้าเพื่อรอการอนุมัติเข้าระบบหลัก`);
  };

  // 3. Location Generation Range handler
  const handleGenerateCustomLocations = (e: React.FormEvent) => {
    e.preventDefault();
    const startNum = parseInt(locStart, 10);
    const endNum = parseInt(locEnd, 10);
    if (isNaN(startNum) || isNaN(endNum) || startNum > endNum) {
      alert('กรุณากรอกระบุช่วงตัวเลข เช่น เริ่มต้นที่ 0 ถึง 12 เป็นต้น!');
      return;
    }
    if (!locPrefix.trim()) {
      alert('กรุณากรอกชื่อย่อคำนำหน้าของ Location!');
      return;
    }

    const generated: string[] = [];
    for (let i = startNum; i <= endNum; i++) {
      // pad with a leading zero if number is single digit
      const paddedNum = String(i).padStart(2, '0');
      generated.push(`${locPrefix.trim()} ${paddedNum}`);
    }

    const updatedLocs = Array.from(new Set([...locations, ...generated]));
    setLocations(updatedLocs);
    localStorage.setItem('wms_locations', JSON.stringify(updatedLocs));

    alert(`สร้างและจดทะเบียน Location ใหม่จำนวน ${generated.length} บาร์โค้ดสำเร็จ! (${generated[0]} ถึง ${generated[generated.length - 1]})`);
  };

  // 4. Calculate Inventory items per Location from Transactions
  const getItemsOnLocation = (locName: string) => {
    const locTxs = transactions.filter((t) => t.location === locName);
    const stockMap: { [key: string]: { partNo: string; partName: string; customer: string; qty: number } } = {};

    for (const tx of locTxs) {
      const key = `${tx.customer}_${tx.partNo}`;
      const prod = products.find((p) => p.partNo === tx.partNo && p.customer === tx.customer);
      const name = prod ? prod.partName : 'ไม่พบรายละเอียดพาร์ทมาสเตอร์';

      if (!stockMap[key]) {
        stockMap[key] = {
          partNo: tx.partNo,
          partName: name,
          customer: tx.customer,
          qty: 0,
        };
      }
      stockMap[key].qty += tx.qty;
    }

    // Filter out 0 or negative balances for location tracking
    return Object.values(stockMap).filter((item) => item.qty > 0);
  };

  const inspectedGoods = getItemsOnLocation(selectedInspectionLoc);

  // Print Stock Count Sheet
  const handlePrintStockSheet = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      {/* Sub Navigation Tabs */}
      <div className="bg-white rounded border border-slate-200 p-1 flex gap-1 shadow-sm shrink-0">
        <button
          onClick={() => setSubTab('catalog')}
          className={`flex-1 py-2 text-xs font-bold rounded transition-all flex items-center justify-center gap-1.5 ${
            subTab === 'catalog' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>ทะเบียนพาร์ทสินค้า (SKU Catalog)</span>
        </button>
        <button
          onClick={() => setSubTab('adjust')}
          className={`flex-1 py-2 text-xs font-bold rounded transition-all flex items-center justify-center gap-1.5 ${
            subTab === 'adjust' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>แจ้งปรับปรุงสต๊อก (Stock Adjust)</span>
        </button>
        <button
          onClick={() => setSubTab('count')}
          className={`flex-1 py-2 text-xs font-bold rounded transition-all flex items-center justify-center gap-1.5 ${
            subTab === 'count' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>ระบบนับสต๊อกสิ้นเดือน (Audit Sheet)</span>
        </button>
        <button
          onClick={() => setSubTab('location')}
          className={`flex-1 py-2 text-xs font-bold rounded transition-all flex items-center justify-center gap-1.5 ${
            subTab === 'location' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <MapPin className="w-3.5 h-3.5" />
          <span>ระบบจัดการ Location ({locations.length})</span>
        </button>
      </div>

      {/* RENDER ACTIVE SUBTAB CONTENT */}
      {subTab === 'catalog' && (
        <div className="space-y-4">
          {/* Controls panel */}
          <div className="bg-white rounded border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="flex-1 flex flex-col sm:flex-row gap-2">
              {/* Search bar */}
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="ค้นหาตาม Part No / SAP / ชื่อ..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full border pl-8 pr-3 py-1.5 text-xs rounded outline-none focus:ring-1 focus:ring-blue-500"
                />
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              </div>

              {/* Customer Group filter */}
              <select
                value={selectedCustomerFilter}
                onChange={(e) => setSelectedCustomerFilter(e.target.value)}
                className="border p-1.5 text-xs rounded bg-slate-50 outline-none w-full sm:w-40"
              >
                <option value="ALL">กลุ่มลูกค้าทั้งหมด (ALL)</option>
                {uniqueCustomers.map((cust) => (
                  <option key={cust} value={cust}>
                    {cust}
                  </option>
                ))}
              </select>
            </div>

            {/* Buttons */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={onGenerateLocations}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs px-3 py-1.5 rounded"
              >
                สร้าง Location DIT-01 ถึง 60 (เริ่มต้น)
              </button>
              <button
                onClick={() => setShowImportModal(true)}
                className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs px-3 py-1.5 rounded flex items-center gap-1.5 animate-pulse"
              >
                <Upload className="w-3.5 h-3.5" />
                นำเข้าผ่าน Excel
              </button>
              <button
                onClick={handleOpenAdd}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-3.5 py-1.5 rounded flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                เพิ่มสินค้าใหม่ (Add)
              </button>
            </div>
          </div>

          {/* Grid Ledger view grouped by customer */}
          <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-3 bg-slate-50 border-b">
              <span className="text-xs font-black text-slate-600 uppercase tracking-wider">บัญชีรายการสินค้ามาสเตอร์ (Master Catalog)</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px] border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b">
                    <th className="p-2">SAP No</th>
                    <th className="p-2">ลูกค้า / กลุ่ม</th>
                    <th className="p-2">Part No / รหัสสินค้า</th>
                    <th className="p-2">ชื่อสินค้าพาร์ท</th>
                    <th className="p-2 text-center">โซนจัดเก็บ</th>
                    <th className="p-2 text-right">ขนาดกล่อง (Full)</th>
                    <th className="p-2 text-right text-slate-400">ยอดยกมา</th>
                    <th className="p-2 text-right text-emerald-600">รับรวม</th>
                    <th className="p-2 text-right text-red-500">โอนรวม</th>
                    <th className="p-2 text-right font-bold text-slate-900 bg-slate-50 border-x">สต๊อกคงเหลือ</th>
                    <th className="p-2 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="p-2 font-mono text-slate-400">{p.sapNo}</td>
                      <td className="p-2">
                        <span className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-[10px] font-bold">
                          {p.customer}
                        </span>
                      </td>
                      <td className="p-2 font-black text-slate-800 font-mono">{p.partNo}</td>
                      <td className="p-2 font-medium">{p.partName}</td>
                      <td className="p-2 text-center font-bold text-slate-600">{p.zone}</td>
                      <td className="p-2 text-right">
                        <span className="font-bold">{p.fullBox}</span> <span className="text-[10px] text-slate-400">{p.packageType}</span>
                      </td>
                      <td className="p-2 text-right text-slate-400">{p.beginningStock.toLocaleString()}</td>
                      <td className="p-2 text-right text-emerald-600 font-bold">+{p.inboundQty.toLocaleString()}</td>
                      <td className="p-2 text-right text-red-500 font-bold">-{p.outboundQty.toLocaleString()}</td>
                      <td className="p-2 text-right font-black text-blue-600 bg-slate-50/50 border-x text-xs">
                        {p.currentStock.toLocaleString()}
                      </td>
                      <td className="p-2 text-center">
                        <div className="flex justify-center gap-1.5">
                          <button onClick={() => handleOpenEdit(p)} className="text-blue-500 hover:text-blue-700">
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => onDeleteProduct(p.id)} className="text-red-500 hover:text-red-700">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan={11} className="text-center py-8 text-slate-400">
                        ไม่พบข้อมูลสินค้าที่ค้นหา
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SINGLE STOCK ADJUST REQUEST SYSTEM */}
      {subTab === 'adjust' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Submission Form (5 cols) */}
          <div className="lg:col-span-4 bg-white rounded border border-slate-200 p-4 shadow-sm h-fit">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-1.5 border-b pb-2.5 mb-3">
              <Sliders className="w-4 h-4 text-amber-500" />
              คำขอปรับปรุงยอดสต๊อกหน้างาน
            </h3>
            <form onSubmit={handleSingleAdjustSubmit} className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">ค้นหา/พิมพ์พาร์ทสินค้า</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="ป้อนรหัสสินค้าเพื่อสแกน/ค้นหา..."
                    value={adjSearch}
                    onChange={(e) => {
                      setAdjSearch(e.target.value);
                      const match = products.find((p) => p.partNo.toUpperCase() === e.target.value.toUpperCase());
                      if (match) {
                        setAdjPartNo(match.partNo);
                      }
                    }}
                    className="w-full border p-2 text-xs rounded font-mono outline-none focus:ring-1 focus:ring-amber-500 bg-slate-50"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">เลือกสินค้ายืนยัน</label>
                <select
                  value={adjPartNo}
                  onChange={(e) => {
                    setAdjPartNo(e.target.value);
                    const match = products.find((p) => p.partNo === e.target.value);
                    if (match) {
                      setAdjSearch(match.partNo);
                    }
                  }}
                  className="w-full border p-2 text-xs rounded outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                >
                  <option value="">-- เลือกรายการพาร์ทสินค้า --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.partNo}>
                      [{p.customer}] {p.partNo} - {p.partName.slice(0, 30)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">ระบุ Location ที่ทำการตรวจนับ</label>
                <select
                  value={adjLocation}
                  onChange={(e) => setAdjLocation(e.target.value)}
                  className="w-full border p-2 text-xs rounded outline-none focus:ring-1 focus:ring-amber-500 font-mono font-bold"
                >
                  {locations.map((loc) => (
                    <option key={loc} value={loc}>
                      📍 {loc}
                    </option>
                  ))}
                </select>
              </div>

              {adjPartNo && (
                <div className="bg-slate-50 p-2.5 rounded border text-[11px] space-y-1 text-slate-600">
                  <div className="flex justify-between">
                    <span>กลุ่มลูกค้า:</span>
                    <strong className="text-slate-800">{products.find((p) => p.partNo === adjPartNo)?.customer}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>ยอดคงเหลือในระบบคลัง:</span>
                    <strong className="text-blue-600">{products.find((p) => p.partNo === adjPartNo)?.currentStock.toLocaleString()} Pcs</strong>
                  </div>
                </div>
              )}

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">ระบุจำนวนนับจริง (Physical Counted)</label>
                <input
                  type="number"
                  placeholder="ป้อนจำนวนชิ้นที่นับจริง..."
                  value={adjPhysicalCount}
                  onChange={(e) => setAdjPhysicalCount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full border p-2 text-xs rounded font-bold outline-none focus:ring-1 focus:ring-amber-500 text-right text-blue-800"
                />
              </div>

              {adjPartNo && adjPhysicalCount !== '' && (
                <div className={`p-2 rounded text-[11px] font-bold text-center ${
                  (Number(adjPhysicalCount) - (products.find((p) => p.partNo === adjPartNo)?.currentStock || 0)) >= 0
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}>
                  ผลต่างปรับปรุง (Delta): {' '}
                  {Number(adjPhysicalCount) - (products.find((p) => p.partNo === adjPartNo)?.currentStock || 0) >= 0 ? '+' : ''}
                  {Number(adjPhysicalCount) - (products.find((p) => p.partNo === adjPartNo)?.currentStock || 0)} Pcs
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded shadow transition-all active:scale-95 flex items-center justify-center gap-1.5"
              >
                <CheckCircle className="w-4 h-4" />
                ส่งขอปรับยอดสต๊อกจริง (Submit Request)
              </button>
            </form>
          </div>

          {/* List of Requests (8 cols) */}
          <div className="lg:col-span-8 bg-white rounded border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide border-b pb-2.5 mb-3">
                ประวัติคำขอการปรับสต๊อกสินค้าของคุณ
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b">
                      <th className="p-2">วันเวลายื่น</th>
                      <th className="p-2">บาร์โค้ดพาร์ท</th>
                      <th className="p-2">ลูกค้า</th>
                      <th className="p-2">โลเคชั่น</th>
                      <th className="p-2 text-right">สต๊อกระบบ</th>
                      <th className="p-2 text-right">นับได้จริง</th>
                      <th className="p-2 text-right">ผลต่าง (Delta)</th>
                      <th className="p-2 text-center">สถานะการอนุมัติ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {adjustRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-50">
                        <td className="p-2 text-slate-400 text-[10px]">
                          {new Date(req.timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}{' '}
                          {new Date(req.timestamp).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit' })}
                        </td>
                        <td className="p-2 font-black text-slate-800 font-mono">{req.partNo}</td>
                        <td className="p-2">
                          <span className="bg-slate-100 px-1 py-0.5 rounded text-[9px] font-bold text-slate-600">{req.customer}</span>
                        </td>
                        <td className="p-2 font-bold font-mono text-indigo-700">{req.location || 'คลังสินค้า'}</td>
                        <td className="p-2 text-right text-slate-500 font-bold">{req.currentStock.toLocaleString()}</td>
                        <td className="p-2 text-right text-blue-700 font-bold">{req.countedQty.toLocaleString()}</td>
                        <td className={`p-2 text-right font-black ${req.delta >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                          {req.delta >= 0 ? `+${req.delta}` : req.delta}
                        </td>
                        <td className="p-2 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                            req.status === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : req.status === 'REJECTED'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {req.status === 'APPROVED' ? 'อนุมัติปรับยอดแล้ว' : req.status === 'REJECTED' ? 'ปฏิเสธคำขอ' : 'รอการอนุมัติ'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {adjustRequests.length === 0 && (
                      <tr>
                        <td colSpan={8} className="text-center py-8 text-slate-400">
                          ไม่มีบันทึกคำขอปรับปรุงยอดสต๊อกในระบบของคุณ
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MONTHLY STOCK COUNT AUDIT SHEET */}
      {subTab === 'count' && (
        <div className="bg-white rounded border border-slate-200 p-4 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b pb-3">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-indigo-600" />
                แบบฟอร์มบันทึกการตรวจนับสต๊อกสิ้นเดือน (Monthly Reconciler)
              </h3>
              <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5">
                *สำหรับสโตร์เกจเจอร์หรือพนักงานตรวจนับประจำสัปดาห์/เดือน ป้อนผลการนับจริงเทียบสต๊อกในระบบ เพื่อทำการบันทึกและให้ผู้จัดการตรวจอนุมัติแบบเป็นกลุ่ม
              </p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto self-end">
              <button
                onClick={handlePrintStockSheet}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs px-3 py-1.5 rounded flex items-center gap-1"
              >
                <Printer className="w-3.5 h-3.5" />
                พิมพ์เอกสารตรวจนับ (Print Sheet)
              </button>
              <button
                onClick={handleBulkCountSubmit}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-1.5 rounded flex items-center gap-1.5 shadow"
              >
                <CheckCircle2 className="w-4 h-4" />
                ส่งอนุมัติยอดนับรวม (Bulk Submit)
              </button>
            </div>
          </div>

          {/* Bulk Config Grid */}
          <div className="bg-slate-50 p-3 rounded border flex flex-col sm:flex-row gap-3 items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-600">📍 โลเคชั่นจัดเก็บหลักที่ตรวจนับ:</span>
              <select
                value={countGlobalLocation}
                onChange={(e) => setCountGlobalLocation(e.target.value)}
                className="border p-1.5 text-xs rounded bg-white outline-none font-bold font-mono text-indigo-800"
              >
                {locations.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-[10px] text-amber-600 font-bold text-right">
              *หากผลนับจริงต่างกับระบบ ระบบจะสร้างคำขอปรับยอดสต๊อกแยกทีละตัวให้อัตโนมัติหลังกดปุ่ม Bulk Submit
            </p>
          </div>

          {/* Audit Checklist Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px] border-collapse printable-table">
              <thead>
                <tr className="bg-slate-100 border-b">
                  <th className="p-2">ลูกค้า</th>
                  <th className="p-2">บาร์โค้ดพาร์ท (Part No)</th>
                  <th className="p-2">ชื่อพาร์ทสินค้ามาสเตอร์</th>
                  <th className="p-2 text-center">โซนวางหลัก</th>
                  <th className="p-2 text-right">สต๊อกระบบล่าสุด</th>
                  <th className="p-2 text-center" style={{ width: '130px' }}>ตรวจนับจริงบนที่ตั้ง</th>
                  <th className="p-2 text-center" style={{ width: '150px' }}>ที่ตั้ง (Location)</th>
                  <th className="p-2 text-right bg-slate-50 border-x font-bold text-slate-900">ผลต่างสะสม</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {products.map((p) => {
                  const physicalVal = countQuantities[p.id];
                  const hasValue = physicalVal !== undefined && physicalVal !== '';
                  const diff = hasValue ? physicalVal - p.currentStock : 0;
                  const itemLoc = countLocations[p.id] || countGlobalLocation;

                  return (
                    <tr key={p.id} className={`hover:bg-slate-50 ${hasValue && diff !== 0 ? 'bg-amber-50/30' : ''}`}>
                      <td className="p-2">
                        <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[9px] font-bold">
                          {p.customer}
                        </span>
                      </td>
                      <td className="p-2 font-mono font-black text-slate-800">{p.partNo}</td>
                      <td className="p-2 font-medium">{p.partName}</td>
                      <td className="p-2 text-center font-bold text-slate-500">{p.zone}</td>
                      <td className="p-2 text-right font-black text-slate-500">{p.currentStock.toLocaleString()} Pcs</td>
                      <td className="p-2 text-center">
                        <input
                          type="number"
                          placeholder="---"
                          value={physicalVal === undefined ? '' : physicalVal}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCountQuantities({
                              ...countQuantities,
                              [p.id]: val === '' ? undefined : Number(val),
                            });
                          }}
                          className="w-20 border border-slate-300 p-1 text-center font-bold rounded text-xs text-blue-800 focus:border-indigo-500 outline-none"
                        />
                      </td>
                      <td className="p-2">
                        <select
                          value={itemLoc}
                          onChange={(e) => {
                            setCountLocations({
                              ...countLocations,
                              [p.id]: e.target.value,
                            });
                          }}
                          className="border p-1 text-xs rounded w-full font-mono bg-white text-slate-700 outline-none"
                        >
                          {locations.map((loc) => (
                            <option key={loc} value={loc}>
                              {loc}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className={`p-2 text-right bg-slate-50/50 border-x font-black text-xs ${
                        !hasValue 
                          ? 'text-slate-400' 
                          : diff === 0 
                          ? 'text-emerald-600' 
                          : 'text-rose-500'
                      }`}>
                        {!hasValue ? 'ยังไม่ตรวจนับ' : diff === 0 ? 'ตรงกัน (OK)' : `${diff >= 0 ? '+' : ''}${diff}`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: LOCATION GENERATOR AND TRACKER */}
      {subTab === 'location' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Form: Generate ranges (5 cols) */}
          <div className="lg:col-span-4 bg-white rounded border border-slate-200 p-4 shadow-sm h-fit">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-1.5 border-b pb-2.5 mb-3">
              <MapPin className="w-4 h-4 text-emerald-600" />
              สร้าง Location อัตโนมัติ (Range Generator)
            </h3>
            <form onSubmit={handleGenerateCustomLocations} className="space-y-4">
              <div className="bg-blue-50 p-3 rounded border border-blue-200 text-slate-700 text-[11px] leading-relaxed">
                ระบบจะสร้างชั้นวางเรียงตามตัวเลขบาร์โค้ด <br />
                เช่น ตั้งแต่ <strong>CTC 00</strong> จนถึง <strong>CTC 12</strong> ให้เข้าสู่ระบบอ้างอิงของคลังแบบกลุ่มในปุ่มเดียว
              </div>
              
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">คำนำหน้ารหัสที่ตั้ง (Location Prefix)</label>
                <input
                  type="text"
                  placeholder="เช่น CTC, STG, A"
                  value={locPrefix}
                  onChange={(e) => setLocPrefix(e.target.value)}
                  className="w-full border p-2 text-xs rounded font-bold uppercase outline-none focus:ring-1 focus:ring-emerald-500 font-mono text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">ลำดับเริ่มต้น (Start)</label>
                  <input
                    type="number"
                    value={locStart}
                    onChange={(e) => setLocStart(e.target.value)}
                    className="w-full border p-2 text-xs rounded text-center outline-none focus:ring-1 focus:ring-emerald-500 font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">ลำดับสิ้นสุด (End)</label>
                  <input
                    type="number"
                    value={locEnd}
                    onChange={(e) => setLocEnd(e.target.value)}
                    className="w-full border p-2 text-xs rounded text-center outline-none focus:ring-1 focus:ring-emerald-500 font-bold"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded shadow transition-all active:scale-95 flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                จดทะเบียนสร้าง Location ทั้งหมด
              </button>
            </form>

            {/* List of generated locations */}
            <div className="mt-5 pt-4 border-t">
              <span className="text-[10px] font-bold text-slate-400 block mb-2">Location ที่เปิดใช้งานทั้งหมด ({locations.length})</span>
              <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-1 bg-slate-50 rounded border">
                {locations.map((loc) => (
                  <button
                    key={loc}
                    onClick={() => setSelectedInspectionLoc(loc)}
                    className={`px-2 py-1 rounded text-[10px] font-mono font-bold border transition-all ${
                      selectedInspectionLoc === loc
                        ? 'bg-emerald-600 text-white border-emerald-700'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {loc}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Area: Inspecting what items are on this location (8 cols) */}
          <div className="lg:col-span-8 bg-white rounded border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b pb-2.5">
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                    <Search className="w-4 h-4 text-indigo-600" />
                    ตรวจสอบรายงานสินค้าสะสมบน Location พิกัดเป้าหมาย
                  </h3>
                  <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5">
                    *ระบบจะทำการคำนวณและประมวลผลยอดบวก/ลบ จาก Transaction ทั้งหมด ณ โลเคชั่นจัดเก็บที่เลือกเพื่อรายงานสินค้าที่ยังคงจัดวางอยู่จริง
                  </p>
                </div>
              </div>

              {/* Selector */}
              <div className="flex gap-2 items-center bg-indigo-50/50 p-2.5 rounded border border-indigo-100">
                <span className="text-xs font-bold text-slate-600">🔎 เลือกที่ตั้งพิกัดเพื่อสืบค้น:</span>
                <select
                  value={selectedInspectionLoc}
                  onChange={(e) => setSelectedInspectionLoc(e.target.value)}
                  className="border p-1 text-xs rounded outline-none font-black font-mono text-indigo-800 bg-white"
                >
                  {locations.map((loc) => (
                    <option key={loc} value={loc}>
                      📍 {loc}
                    </option>
                  ))}
                </select>
              </div>

              {/* Grid of items on selected location */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 block">รายการสินค้าสะสมบน Location [ {selectedInspectionLoc} ] :</span>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b text-slate-600 font-bold">
                        <th className="p-2">กลุ่มลูกค้า</th>
                        <th className="p-2">พาร์ทสินค้า (Part No)</th>
                        <th className="p-2">ชื่อโมเดล / พาร์ทมาสเตอร์</th>
                        <th className="p-2 text-right">จำนวนจัดวางรวมสะสม (Stock)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {inspectedGoods.map((item) => (
                        <tr key={`${item.customer}-${item.partNo}`} className="hover:bg-indigo-50/20 font-medium">
                          <td className="p-2">
                            <span className="bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded text-[9px] font-bold">
                              {item.customer}
                            </span>
                          </td>
                          <td className="p-2 font-mono font-black text-slate-900">{item.partNo}</td>
                          <td className="p-2 text-slate-600">{item.partName}</td>
                          <td className="p-2 text-right font-mono text-xs font-black text-indigo-700">
                            {item.qty.toLocaleString()} <span className="text-[9px] text-slate-400 font-normal">Pcs</span>
                          </td>
                        </tr>
                      ))}
                      {inspectedGoods.length === 0 && (
                        <tr>
                          <td colSpan={4} className="text-center py-8 text-slate-400">
                            📭 ไม่พบสินค้าวางสะสมคงเหลือ ณ Location [ {selectedInspectionLoc} ] นี้ในขณะนี้
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Product Modal (CRUD) */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-5 max-w-md w-full shadow-xl border space-y-3">
            <h3 className="text-sm font-black text-slate-900 uppercase">ลงทะเบียนสินค้าใหม่ (New Product)</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="col-span-2">
                <label className="text-[9px] font-bold text-slate-400">กลุ่มลูกค้า / ผู้ขาย</label>
                <input type="text" value={customer} onChange={(e) => setCustomer(e.target.value)} className="w-full border p-1.5 rounded bg-slate-50 outline-none" placeholder="เช่น TOYOTA-TH" />
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-400">รหัสพาร์ทสินค้า (Part No)</label>
                <input type="text" value={partNo} onChange={(e) => setPartNo(e.target.value)} className="w-full border p-1.5 rounded font-mono bg-slate-50 outline-none" placeholder="PN-000-XX" />
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-400">ชื่อทางการค้า (Part Name)</label>
                <input type="text" value={partName} onChange={(e) => setPartName(e.target.value)} className="w-full border p-1.5 rounded bg-slate-50 outline-none" />
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-400">SAP No</label>
                <input type="text" value={sapNo} onChange={(e) => setSapNo(e.target.value)} className="w-full border p-1.5 rounded bg-slate-50 outline-none" />
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-400">โซนจัดเก็บ (Zone)</label>
                <input type="text" value={zone} onChange={(e) => setZone(e.target.value)} className="w-full border p-1.5 rounded bg-slate-50 outline-none" />
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-400">ขนาดกล่อง (Full Box)</label>
                <input type="number" value={fullBox} onChange={(e) => setFullBox(e.target.value)} className="w-full border p-1.5 rounded font-bold bg-slate-50 outline-none" />
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-400">บรรจุภัณฑ์ (Package Type)</label>
                <input type="text" value={packageType} onChange={(e) => setPackageType(e.target.value)} className="w-full border p-1.5 rounded bg-slate-50 outline-none" />
              </div>
              <div className="col-span-2">
                <label className="text-[9px] font-bold text-slate-400">ยอดยกมาจากเดือนก่อน (Beginning)</label>
                <input type="number" value={begStock} onChange={(e) => setBegStock(e.target.value)} className="w-full border p-1.5 rounded text-blue-600 font-bold bg-slate-50 outline-none" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowAddModal(false)} className="border text-xs px-3 py-1.5 rounded">ยกเลิก</button>
              <button onClick={handleSaveAdd} className="bg-slate-900 hover:bg-slate-800 text-white text-xs px-4 py-1.5 rounded font-bold">บันทึกเพิ่ม</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Product Modal (CRUD) */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-5 max-w-md w-full shadow-xl border space-y-3">
            <h3 className="text-sm font-black text-slate-900 uppercase">แก้ไขข้อมูลสินค้ามาสเตอร์</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-[9px] font-bold text-slate-400">กลุ่มลูกค้า / ผู้ขาย</label>
                <input type="text" disabled value={customer} className="w-full border p-1.5 rounded bg-slate-100" />
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-400">รหัสพาร์ทสินค้า (Part No)</label>
                <input type="text" disabled value={partNo} className="w-full border p-1.5 rounded bg-slate-100 font-mono" />
              </div>
              <div className="col-span-2">
                <label className="text-[9px] font-bold text-slate-400">ชื่อทางการค้า (Part Name)</label>
                <input type="text" value={partName} onChange={(e) => setPartName(e.target.value)} className="w-full border p-1.5 rounded bg-slate-50 outline-none" />
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-400">SAP No</label>
                <input type="text" value={sapNo} onChange={(e) => setSapNo(e.target.value)} className="w-full border p-1.5 rounded bg-slate-50 outline-none" />
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-400">โซนจัดเก็บ (Zone)</label>
                <input type="text" value={zone} onChange={(e) => setZone(e.target.value)} className="w-full border p-1.5 rounded bg-slate-50 outline-none" />
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-400">ขนาดกล่อง (Full Box)</label>
                <input type="number" value={fullBox} onChange={(e) => setFullBox(e.target.value)} className="w-full border p-1.5 rounded font-bold bg-slate-50 outline-none" />
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-400">บรรจุภัณฑ์ (Package Type)</label>
                <input type="text" value={packageType} onChange={(e) => setPackageType(e.target.value)} className="w-full border p-1.5 rounded bg-slate-50 outline-none" />
              </div>
              <div className="col-span-2">
                <label className="text-[9px] font-bold text-slate-400">ยอดยกมาเริ่มต้น (Beginning Stock)</label>
                <input type="number" value={begStock} onChange={(e) => setBegStock(e.target.value)} className="w-full border p-1.5 rounded text-blue-600 font-bold bg-slate-50 outline-none" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowEditModal(false)} className="border text-xs px-3 py-1.5 rounded">ยกเลิก</button>
              <button onClick={handleSaveEdit} className="bg-slate-900 hover:bg-slate-800 text-white text-xs px-4 py-1.5 rounded font-bold">บันทึกแก้ไข</button>
            </div>
          </div>
        </div>
      )}

      {/* Import Products from Excel/CSV Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-5 max-w-lg w-full shadow-xl border space-y-3">
            <h3 className="text-sm font-black text-slate-900 uppercase">นำเข้ารายการสินค้าผ่าน Excel / CSV Grid</h3>
            <p className="text-[11px] text-slate-500">
              กรุณาจัดคอลัมน์ใน Excel เรียงลำดับดังนี้: <br />
              <strong>Customer | Part No | Part Name | Full Box | SAP No | Zone | Package Type | Beginning Stock</strong>
              <br />แล้วคลุมดำก๊อปปี้ (Ctrl+C) นำมาวาง (Ctrl+V) ในกล่องด้านล่างนี้ได้โดยตรง:
            </p>
            <textarea
              rows={8}
              placeholder="วางข้อมูลคัดลอกจาก Excel ลงที่นี่..."
              value={excelPasteText}
              onChange={(e) => setExcelPasteText(e.target.value)}
              className="w-full border p-2 text-xs rounded font-mono outline-none focus:ring-1 focus:ring-blue-500"
            ></textarea>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowImportModal(false)} className="border text-xs px-3 py-1.5 rounded">ยกเลิก</button>
              <button onClick={handleExcelImport} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-4 py-1.5 rounded font-bold">เริ่มนำเข้าสินค้า</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
