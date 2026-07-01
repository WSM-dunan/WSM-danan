import React, { useState } from 'react';
import { Employee, DEFAULT_DEPARTMENTS, DEFAULT_ROLES } from '../data';
import { Users, Trash2, Edit, Plus, Eye, EyeOff, Key, Search, Calendar } from 'lucide-react';

interface EmployeesPanelProps {
  employees: Employee[];
  currentUser: Employee | null;
  onAddEmployee: (emp: Employee) => void;
  onUpdateEmployee: (emp: Employee) => void;
  onDeleteEmployee: (empId: string) => void;
  departments: string[];
  onAddDepartment: (name: string) => void;
}

export const EmployeesPanel: React.FC<EmployeesPanelProps> = ({
  employees,
  currentUser,
  onAddEmployee,
  onUpdateEmployee,
  onDeleteEmployee,
  departments,
  onAddDepartment,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPinId, setShowPinId] = useState<string | null>(null);
  const [subTab, setSubTab] = useState<'list' | 'scheduler'>('list');
  const [schedulerSearch, setSchedulerSearch] = useState('');

  // Form Fields
  const [employeeId, setEmployeeId] = useState('');
  const [pin, setPin] = useState('');
  const [name, setName] = useState('');
  const [lastName, setLastName] = useState('');
  const [position, setPosition] = useState('');
  const [jobPosition, setJobPosition] = useState('');
  const [department, setDepartment] = useState('ฝ่ายผลิต');
  const [status, setStatus] = useState<'ประจำ' | 'ทดลองงาน' | 'ซับคอนแท็ค' | 'ลาออก'>('ประจำ');
  const [role, setRole] = useState<'admin' | 'leader' | 'Assistant' | 'user_production' | 'user_store' | 'user_planning' | 'Sales'>('user_production');
  const [shiftWork, setShiftWork] = useState('DAY (08:30-17:30)');

  // New department addition
  const [newDeptInput, setNewDeptInput] = useState('');

  const isAdminOrLeader = currentUser?.role === 'admin' || currentUser?.role === 'leader';

  const handleOpenAdd = () => {
    setEmployeeId('');
    setPin('');
    setName('');
    setLastName('');
    setPosition('');
    setJobPosition('');
    setDepartment(departments[0] || 'ฝ่ายผลิต');
    setStatus('ประจำ');
    setRole('user_production');
    setShiftWork('DAY (08:30-17:30)');
    setShowAddModal(true);
  };

  const handleOpenEdit = (emp: Employee) => {
    setEmployeeId(emp.employeeId);
    setPin(emp.pin);
    setName(emp.name);
    setLastName(emp.lastName);
    setPosition(emp.position);
    setJobPosition(emp.jobPosition);
    setDepartment(emp.department);
    setStatus(emp.status);
    setRole(emp.role);
    setShiftWork(emp.shiftWork);
    setShowEditModal(true);
  };

  const handleSaveAdd = () => {
    if (employeeId.length !== 8) {
      alert('รหัสพนักงานต้องมีความยาว 8 หลัก!');
      return;
    }
    if (pin.length !== 6) {
      alert('PIN ต้องมีความยาว 6 หลัก!');
      return;
    }
    if (!name || !lastName) {
      alert('กรุณากรอกชื่อและนามสกุล!');
      return;
    }

    if (employees.some((e) => e.employeeId === employeeId)) {
      alert('รหัสพนักงานนี้มีผู้ใช้งานอยู่แล้ว!');
      return;
    }

    const newEmp: Employee = {
      employeeId,
      pin,
      name,
      lastName,
      position,
      jobPosition,
      department,
      status,
      role,
      shiftWork,
    };

    onAddEmployee(newEmp);
    setShowAddModal(false);
  };

  const handleSaveEdit = () => {
    const updatedEmp: Employee = {
      employeeId,
      pin,
      name,
      lastName,
      position,
      jobPosition,
      department,
      status,
      role,
      shiftWork,
    };

    onUpdateEmployee(updatedEmp);
    setShowEditModal(false);
  };

  const toggleShowPin = (empId: string) => {
    if (showPinId === empId) {
      setShowPinId(null);
    } else {
      setShowPinId(empId);
    }
  };

  const handleAddDept = () => {
    if (newDeptInput.trim()) {
      onAddDepartment(newDeptInput.trim());
      setDepartment(newDeptInput.trim());
      setNewDeptInput('');
    }
  };

  // Group employees by Department
  const groupedEmployees: Record<string, Employee[]> = {};
  for (const dept of departments) {
    groupedEmployees[dept] = employees.filter((e) => e.department === dept);
  }

  // Any leftover departments not in primary list
  const leftoverDepts = (Array.from(new Set(employees.map((e) => e.department))) as string[]).filter((d) => !departments.includes(d));
  for (const dept of leftoverDepts) {
    groupedEmployees[dept] = employees.filter((e) => e.department === dept);
  }

  const daysOfWeek = [
    { key: 'mon', label: 'จันทร์ (Mon)' },
    { key: 'tue', label: 'อังคาร (Tue)' },
    { key: 'wed', label: 'พุธ (Wed)' },
    { key: 'thu', label: 'พฤหัส (Thu)' },
    { key: 'fri', label: 'ศุกร์ (Fri)' },
    { key: 'sat', label: 'เสาร์ (Sat)' },
    { key: 'sun', label: 'อาทิตย์ (Sun)' },
  ];

  const getDayShift = (emp: Employee, dayKey: string) => {
    if (emp.weeklyShifts && emp.weeklyShifts[dayKey]) {
      return emp.weeklyShifts[dayKey];
    }
    if (emp.shiftWork.includes('NIGHT')) return 'NIGHT';
    return 'DAY';
  };

  const handleQuickSetShift = (emp: Employee, shiftType: string) => {
    const updatedWeekly = {
      mon: shiftType,
      tue: shiftType,
      wed: shiftType,
      thu: shiftType,
      fri: shiftType,
      sat: 'OFF',
      sun: 'OFF',
    };
    onUpdateEmployee({
      ...emp,
      weeklyShifts: updatedWeekly,
    });
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Users className="w-4 h-4 text-blue-600" />
            ระบบจัดการและจัดกลุ่มพนักงาน (Employee Directory & Roles)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">พนักงานทั้งหมดที่จัดกลุ่มแบ่งตามแผนกและสิทธิ์ความปลอดภัย</p>
        </div>
        {isAdminOrLeader && (
          <button
            onClick={handleOpenAdd}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-3.5 py-1.5 rounded flex items-center gap-1 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            เพิ่มพนักงานใหม่ (Add)
          </button>
        )}
      </div>

      {/* Sub-Tabs Navigation */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setSubTab('list')}
          className={`px-4 py-1.5 text-xs font-bold border-b-2 -mb-px transition-all ${
            subTab === 'list'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          รายชื่อพนักงานและสิทธิ์ระบบ
        </button>
        <button
          onClick={() => setSubTab('scheduler')}
          className={`px-4 py-1.5 text-xs font-bold border-b-2 -mb-px transition-all ${
            subTab === 'scheduler'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          ตารางจัดกะพนักงานรายสัปดาห์ (Shift Planner)
        </button>
      </div>

      {subTab === 'list' ? (
        /* Employees grid grouped by department */
        <div className="space-y-4">
          {Object.keys(groupedEmployees).map((dept) => {
            const deptEmployees = groupedEmployees[dept];
            if (deptEmployees.length === 0) return null;

            return (
              <div key={dept} className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-3 bg-slate-50 border-b font-bold text-xs text-slate-700 flex justify-between items-center">
                  <span>แผนก/หน่วยงาน: {dept} ({deptEmployees.length} คน)</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b text-slate-500">
                        <th className="p-2 w-24">Employee ID</th>
                        <th className="p-2">ชื่อ - นามสกุล</th>
                        <th className="p-2">ตำแหน่ง / บทบาทหน้าที่</th>
                        <th className="p-2">กะการทำงาน</th>
                        <th className="p-2 text-center">สิทธิ์เข้าถึง (Role)</th>
                        <th className="p-2 text-center">สถานะ</th>
                        {currentUser?.role === 'admin' && <th className="p-2 text-center w-24">PIN</th>}
                        <th className="p-2 text-center w-20">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {deptEmployees.map((emp) => (
                        <tr key={emp.employeeId} className="hover:bg-slate-50">
                          <td className="p-2 font-mono font-bold text-slate-800">{emp.employeeId}</td>
                          <td className="p-2 font-medium text-slate-900">{emp.name} {emp.lastName}</td>
                          <td className="p-2 text-slate-500">
                            <strong>{emp.position}</strong> <span className="text-[10px] text-slate-400 block">{emp.jobPosition}</span>
                          </td>
                          <td className="p-2 font-semibold text-slate-600">{emp.shiftWork}</td>
                          <td className="p-2 text-center">
                            <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[10px] font-bold border border-blue-100">
                              {emp.role}
                            </span>
                          </td>
                          <td className="p-2 text-center">
                            <span className={`px-1 rounded text-[9px] font-bold ${emp.status === 'ประจำ' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                              {emp.status}
                            </span>
                          </td>
                          {currentUser?.role === 'admin' && (
                            <td className="p-2 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <span className="font-mono font-bold text-slate-600 w-12 text-right">
                                  {showPinId === emp.employeeId ? emp.pin : '••••••'}
                                </span>
                                <button onClick={() => toggleShowPin(emp.employeeId)} className="text-slate-400 hover:text-slate-600">
                                  {showPinId === emp.employeeId ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </td>
                          )}
                          <td className="p-2 text-center">
                            <div className="flex justify-center gap-1.5">
                              {isAdminOrLeader && (
                                <button onClick={() => handleOpenEdit(emp)} className="text-blue-500 hover:text-blue-700">
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {currentUser?.role === 'admin' && emp.employeeId !== currentUser.employeeId && (
                                <button onClick={() => onDeleteEmployee(emp.employeeId)} className="text-red-500 hover:text-red-700">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Weekly Shift Scheduler view */
        <div className="bg-white rounded border border-slate-200 shadow-sm p-4 space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-indigo-600" />
                ตารางจัดกะการทำงานพนักงานแบบรายวัน
              </h3>
              <p className="text-[11px] text-slate-400">กำหนดกะกลางวัน (DAY), กะกลางคืน (NIGHT), หรือหยุด (OFF) สำหรับวันในสัปดาห์</p>
            </div>

            {/* Scheduler Search Bar */}
            <div className="relative max-w-xs w-full self-start sm:self-auto">
              <input
                type="text"
                placeholder="ค้นหาชื่อหรือแผนกพนักงาน..."
                value={schedulerSearch}
                onChange={(e) => setSchedulerSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-100 rounded">
            <table className="w-full text-left text-[11px] border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-50 border-b text-slate-600 font-bold">
                  <th className="p-2.5 w-44">พนักงาน (Employee)</th>
                  <th className="p-2.5 w-32">แผนก</th>
                  {daysOfWeek.map((day) => (
                    <th key={day.key} className="p-2.5 text-center">{day.label}</th>
                  ))}
                  <th className="p-2.5 text-center w-36">กำหนดด่วน Mon-Fri</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees
                  .filter((emp) => {
                    const q = schedulerSearch.toLowerCase();
                    return (
                      emp.name.toLowerCase().includes(q) ||
                      emp.lastName.toLowerCase().includes(q) ||
                      emp.employeeId.includes(q) ||
                      emp.department.toLowerCase().includes(q)
                    );
                  })
                  .map((emp) => (
                    <tr key={emp.employeeId} className="hover:bg-slate-50/50">
                      <td className="p-2.5">
                        <div className="font-bold text-slate-900">{emp.name} {emp.lastName}</div>
                        <div className="text-[9px] font-mono text-slate-400">ID: {emp.employeeId} • {emp.position}</div>
                      </td>
                      <td className="p-2.5">
                        <span className="text-slate-500 font-semibold">{emp.department}</span>
                      </td>
                      {daysOfWeek.map((day) => {
                        const val = getDayShift(emp, day.key);
                        return (
                          <td key={day.key} className="p-1.5 text-center">
                            <select
                              disabled={!isAdminOrLeader}
                              value={val}
                              onChange={(e) => {
                                const currentWeekly = emp.weeklyShifts || {
                                  mon: emp.shiftWork.includes('NIGHT') ? 'NIGHT' : 'DAY',
                                  tue: emp.shiftWork.includes('NIGHT') ? 'NIGHT' : 'DAY',
                                  wed: emp.shiftWork.includes('NIGHT') ? 'NIGHT' : 'DAY',
                                  thu: emp.shiftWork.includes('NIGHT') ? 'NIGHT' : 'DAY',
                                  fri: emp.shiftWork.includes('NIGHT') ? 'NIGHT' : 'DAY',
                                  sat: 'OFF',
                                  sun: 'OFF',
                                };
                                onUpdateEmployee({
                                  ...emp,
                                  weeklyShifts: {
                                    ...currentWeekly,
                                    [day.key]: e.target.value,
                                  },
                                });
                              }}
                              className={`text-[10px] font-bold p-1 rounded border border-slate-200 outline-none w-20 transition-all ${
                                val === 'DAY'
                                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                                  : val === 'NIGHT'
                                  ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                                  : 'bg-slate-50 text-slate-400 border-slate-200'
                              }`}
                            >
                              <option value="DAY">🌞 DAY</option>
                              <option value="NIGHT">🌙 NIGHT</option>
                              <option value="OFF">😴 OFF</option>
                            </select>
                          </td>
                        );
                      })}
                      <td className="p-1.5 text-center">
                        {isAdminOrLeader ? (
                          <div className="flex gap-1 justify-center">
                            <button
                              onClick={() => handleQuickSetShift(emp, 'DAY')}
                              className="px-2 py-0.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded text-[9px]"
                              title="ตั้งจันทร์-ศุกร์ เป็นกะ DAY, เสาร์-อาทิตย์ เป็น OFF"
                            >
                              DAY
                            </button>
                            <button
                              onClick={() => handleQuickSetShift(emp, 'NIGHT')}
                              className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded text-[9px]"
                              title="ตั้งจันทร์-ศุกร์ เป็นกะ NIGHT, เสาร์-อาทิตย์ เป็น OFF"
                            >
                              NIGHT
                            </button>
                          </div>
                        ) : (
                          <span className="text-[9px] text-slate-400 font-semibold">ไม่มีสิทธิ์แก้ไข</span>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-5 max-w-sm w-full shadow-xl border space-y-3 text-xs">
            <h3 className="text-sm font-black text-slate-900 uppercase">เพิ่มข้อมูลบุคลากรใหม่</h3>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] font-bold text-slate-400">Employee ID (8 หลัก)</label>
                  <input type="text" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="w-full border p-1.5 rounded font-mono" placeholder="เช่น 00000214" />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-400">PIN เข้ารหัส (6 หลัก)</label>
                  <input type="password" value={pin} onChange={(e) => setPin(e.target.value)} className="w-full border p-1.5 rounded font-mono" placeholder="เช่น 123456" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] font-bold text-slate-400">ชื่อจริง (Name)</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full border p-1.5 rounded" />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-400">นามสกุล (Lastname)</label>
                  <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full border p-1.5 rounded" />
                </div>
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-400">ตำแหน่งงาน (Position)</label>
                <input type="text" value={position} onChange={(e) => setPosition(e.target.value)} className="w-full border p-1.5 rounded" placeholder="เช่น พนักงานคลังสินค้า" />
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-400">หน้าที่รับผิดชอบ (Job Responsibilities)</label>
                <input type="text" value={jobPosition} onChange={(e) => setJobPosition(e.target.value)} className="w-full border p-1.5 rounded" />
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] font-bold text-slate-400">ฝ่าย/แผนก</label>
                  <div className="flex gap-1">
                    <select value={department} onChange={(e) => setDepartment(e.target.value)} className="w-full border p-1.5 rounded text-xs bg-white">
                      {departments.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-400">กะเวลาการจัดงาน (Shift)</label>
                  <select value={shiftWork} onChange={(e) => setShiftWork(e.target.value)} className="w-full border p-1.5 rounded text-xs bg-white">
                    <option value="DAY (08:30-17:30)">DAY Shift (08:30-17:30)</option>
                    <option value="NIGHT (20:30-05:30)">NIGHT Shift (20:30-05:30)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="text-[9px] font-bold text-slate-400">สิทธิ์ระบบ (Access Role)</label>
                  <select value={role} onChange={(e) => setRole(e.target.value as any)} className="w-full border p-1.5 rounded text-xs bg-white">
                    {DEFAULT_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-400">สถานะพนักงาน</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value as any)} className="w-full border p-1.5 rounded text-xs bg-white">
                    <option value="ประจำ">พนักงานประจำ</option>
                    <option value="ทดลองงาน">ทดลองงาน</option>
                    <option value="ซับคอนแท็ค">ซับคอนแท็ค</option>
                    <option value="ลาออก">ลาออกแล้ว</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowAddModal(false)} className="border text-xs px-3 py-1.5 rounded">ยกเลิก</button>
              <button onClick={handleSaveAdd} className="bg-slate-900 hover:bg-slate-800 text-white text-xs px-4 py-1.5 rounded font-bold">บันทึกเพิ่ม</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-5 max-w-sm w-full shadow-xl border space-y-3 text-xs">
            <h3 className="text-sm font-black text-slate-900 uppercase">แก้ไขข้อมูลบุคลากร</h3>
            <div className="space-y-2">
              <div>
                <label className="text-[9px] font-bold text-slate-400">Employee ID (เปลี่ยนไม่ได้)</label>
                <input type="text" disabled value={employeeId} className="w-full border p-1.5 rounded bg-slate-100 font-mono" />
              </div>
              {currentUser?.role === 'admin' && (
                <div>
                  <label className="text-[9px] font-bold text-slate-400">PIN เข้ารหัสใหม่ (6 หลัก)</label>
                  <input type="password" value={pin} onChange={(e) => setPin(e.target.value)} className="w-full border p-1.5 rounded font-mono" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] font-bold text-slate-400">ชื่อจริง</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full border p-1.5 rounded" />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-400">นามสกุล</label>
                  <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full border p-1.5 rounded" />
                </div>
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-400">ตำแหน่งงาน (Position)</label>
                <input type="text" value={position} onChange={(e) => setPosition(e.target.value)} className="w-full border p-1.5 rounded" />
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] font-bold text-slate-400">ฝ่าย/แผนก</label>
                  <select value={department} onChange={(e) => setDepartment(e.target.value)} className="w-full border p-1.5 rounded text-xs bg-white">
                    {departments.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-400">กะเวลาการจัดงาน (Shift)</label>
                  <select value={shiftWork} onChange={(e) => setShiftWork(e.target.value)} className="w-full border p-1.5 rounded text-xs bg-white">
                    <option value="DAY (08:30-17:30)">DAY Shift (08:30-17:30)</option>
                    <option value="NIGHT (20:30-05:30)">NIGHT Shift (20:30-05:30)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="text-[9px] font-bold text-slate-400">สิทธิ์ระบบ (Access Role)</label>
                  <select value={role} onChange={(e) => setRole(e.target.value as any)} className="w-full border p-1.5 rounded text-xs bg-white">
                    {DEFAULT_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-400">สถานะพนักงาน</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value as any)} className="w-full border p-1.5 rounded text-xs bg-white">
                    <option value="ประจำ">พนักงานประจำ</option>
                    <option value="ทดลองงาน">ทดลองงาน</option>
                    <option value="ซับคอนแท็ค">ซับคอนแท็ค</option>
                    <option value="ลาออก">ลาออกแล้ว</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowEditModal(false)} className="border text-xs px-3 py-1.5 rounded">ยกเลิก</button>
              <button onClick={handleSaveEdit} className="bg-slate-900 hover:bg-slate-800 text-white text-xs px-4 py-1.5 rounded font-bold">บันทึกแก้ไข</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
