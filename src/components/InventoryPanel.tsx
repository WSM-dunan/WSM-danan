import React, { useState } from 'react';
import { Product } from '../data';
import { parseImportData } from '../utils';
import { Edit, Trash2, Plus, Download, Upload, Search, Tag, Eye } from 'lucide-react';

interface InventoryPanelProps {
  products: Product[];
  onAddProduct: (p: Product) => void;
  onUpdateProduct: (p: Product) => void;
  onDeleteProduct: (id: string) => void;
  onImportProducts: (imported: Product[]) => void;
  onGenerateLocations: () => void;
}

export const InventoryPanel: React.FC<InventoryPanelProps> = ({
  products,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onImportProducts,
  onGenerateLocations,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerFilter, setSelectedCustomerFilter] = useState('ALL');

  // Master Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Form States
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

  // Filtering products
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

    // Convert Partial to real Product
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

  return (
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
            สร้าง Location DIT-01 ถึง 60
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs px-3 py-1.5 rounded flex items-center gap-1.5"
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

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-5 max-w-md w-full shadow-xl border space-y-3">
            <h3 className="text-sm font-black text-slate-900 uppercase">ลงทะเบียนสินค้าใหม่ (New Product)</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="col-span-2">
                <label className="text-[9px] font-bold text-slate-400">กลุ่มลูกค้า / ผู้ขาย</label>
                <input type="text" value={customer} onChange={(e) => setCustomer(e.target.value)} className="w-full border p-1.5 rounded" placeholder="เช่น TOYOTA-TH" />
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-400">รหัสพาร์ทสินค้า (Part No)</label>
                <input type="text" value={partNo} onChange={(e) => setPartNo(e.target.value)} className="w-full border p-1.5 rounded font-mono" placeholder="PN-000-XX" />
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-400">ชื่อทางการค้า (Part Name)</label>
                <input type="text" value={partName} onChange={(e) => setPartName(e.target.value)} className="w-full border p-1.5 rounded" />
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-400">SAP No</label>
                <input type="text" value={sapNo} onChange={(e) => setSapNo(e.target.value)} className="w-full border p-1.5 rounded" />
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-400">โซนจัดเก็บ (Zone)</label>
                <input type="text" value={zone} onChange={(e) => setZone(e.target.value)} className="w-full border p-1.5 rounded" />
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-400">ขนาดกล่อง (Full Box)</label>
                <input type="number" value={fullBox} onChange={(e) => setFullBox(e.target.value)} className="w-full border p-1.5 rounded font-bold" />
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-400">บรรจุภัณฑ์ (Package Type)</label>
                <input type="text" value={packageType} onChange={(e) => setPackageType(e.target.value)} className="w-full border p-1.5 rounded" />
              </div>
              <div className="col-span-2">
                <label className="text-[9px] font-bold text-slate-400">ยอดยกมาจากเดือนก่อน (Beginning)</label>
                <input type="number" value={begStock} onChange={(e) => setBegStock(e.target.value)} className="w-full border p-1.5 rounded text-blue-600 font-bold" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowAddModal(false)} className="border text-xs px-3 py-1.5 rounded">ยกเลิก</button>
              <button onClick={handleSaveAdd} className="bg-slate-900 hover:bg-slate-800 text-white text-xs px-4 py-1.5 rounded font-bold">บันทึกเพิ่ม</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
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
                <input type="text" value={partName} onChange={(e) => setPartName(e.target.value)} className="w-full border p-1.5 rounded" />
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-400">SAP No</label>
                <input type="text" value={sapNo} onChange={(e) => setSapNo(e.target.value)} className="w-full border p-1.5 rounded" />
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-400">โซนจัดเก็บ (Zone)</label>
                <input type="text" value={zone} onChange={(e) => setZone(e.target.value)} className="w-full border p-1.5 rounded" />
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-400">ขนาดกล่อง (Full Box)</label>
                <input type="number" value={fullBox} onChange={(e) => setFullBox(e.target.value)} className="w-full border p-1.5 rounded font-bold" />
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-400">บรรจุภัณฑ์ (Package Type)</label>
                <input type="text" value={packageType} onChange={(e) => setPackageType(e.target.value)} className="w-full border p-1.5 rounded" />
              </div>
              <div className="col-span-2">
                <label className="text-[9px] font-bold text-slate-400">ยอดยกมาเริ่มต้น (Beginning Stock)</label>
                <input type="number" value={begStock} onChange={(e) => setBegStock(e.target.value)} className="w-full border p-1.5 rounded text-blue-600 font-bold" />
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
