import React, { useState } from 'react';
import { Attendance, Employee } from '../data';
import { calculateAttendanceHours } from '../utils';
import { Clock, Check, Calendar, AlertCircle, FileText, Send, User } from 'lucide-react';

interface AttendancePanelProps {
  currentUser: Employee | null;
  attendanceLogs: Attendance[];
  onCheckIn: (empId: string, empName: string, time: string) => void;
  onCheckOut: (empId: string, empName: string, time: string) => void;
  onSubmitForgotPunch: (req: Attendance) => void;
  onSubmitLeaveRequest: (req: Attendance) => void;
}

export const AttendancePanel: React.FC<AttendancePanelProps> = ({
  currentUser,
  attendanceLogs,
  onCheckIn,
  onCheckOut,
  onSubmitForgotPunch,
  onSubmitLeaveRequest,
}) => {
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  // Forgot Punch states
  const [forgotType, setForgotType] = useState<'FORGOT_REQUEST_IN' | 'FORGOT_REQUEST_OUT'>('FORGOT_REQUEST_IN');
  const [forgotDate, setForgotDate] = useState(new Date().toISOString().split('T')[0]);
  const [forgotTime, setForgotTime] = useState('08:30');
  const [forgotReason, setForgotReason] = useState('');

  // Leave states
  const [leaveType, setLeaveType] = useState('ลากิจ');
  const [leaveStartDate, setLeaveStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [leaveEndDate, setLeaveEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [leaveReason, setLeaveReason] = useState('');

  if (!currentUser) {
    return (
      <div className="bg-white rounded border p-8 text-center text-slate-500 shadow-sm">
        <User className="w-12 h-12 mx-auto text-slate-300 mb-2" />
        <h3 className="font-bold text-slate-700">กรุณาเข้าสู่ระบบก่อนตอกบัตร</h3>
        <p className="text-xs text-slate-400 mt-1">ใช้ Employee ID และ PIN 6 หลักเพื่อเข้าใช้งานระบบ</p>
      </div>
    );
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const todayRecord = attendanceLogs.find((l) => l.employeeId === currentUser.employeeId && l.date === todayStr);

  const handleClockInAction = () => {
    const nowStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false });
    onCheckIn(currentUser.employeeId, `${currentUser.name} ${currentUser.lastName}`, nowStr);
    alert(`ตอกบัตรเข้างานสำเร็จที่เวลา ${nowStr} น.`);
  };

  const handleClockOutAction = () => {
    const nowStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false });
    onCheckOut(currentUser.employeeId, `${currentUser.name} ${currentUser.lastName}`, nowStr);
    alert(`ตอกบัตรเลิกงานสำเร็จที่เวลา ${nowStr} น.`);
  };

  const submitForgotRequest = () => {
    if (!forgotReason.trim()) {
      alert('กรุณากรอกเหตุผลความจำเป็น!');
      return;
    }

    const newRequest: Attendance = {
      id: `FORGOT-${Math.floor(Math.random() * 1000000)}`,
      employeeId: currentUser.employeeId,
      employeeName: `${currentUser.name} ${currentUser.lastName}`,
      date: forgotDate,
      requestedTime: forgotTime,
      workHours: 0,
      otHours: 0,
      shift: currentUser.shiftWork,
      status: forgotType,
      reason: forgotReason.trim(),
    };

    onSubmitForgotPunch(newRequest);
    setForgotReason('');
    setShowForgotModal(false);
    alert('ส่งขออนุมัติลืมลงเวลาตอกบัตรเรียบร้อยแล้ว! รอหัวหน้างานยืนยัน');
  };

  const submitLeaveRequestAction = () => {
    if (!leaveReason.trim()) {
      alert('กรุณาระบุรายละเอียดการขอลา!');
      return;
    }

    const newRequest: Attendance = {
      id: `LEAVE-${Math.floor(Math.random() * 1000000)}`,
      employeeId: currentUser.employeeId,
      employeeName: `${currentUser.name} ${currentUser.lastName}`,
      date: leaveStartDate,
      workHours: 0,
      otHours: 0,
      shift: currentUser.shiftWork,
      status: 'PENDING_LEAVE',
      leaveType,
      reason: `${leaveReason.trim()} (ถึง ${leaveEndDate})`,
    };

    onSubmitLeaveRequest(newRequest);
    setLeaveReason('');
    setShowLeaveModal(false);
    alert('ส่งใบแจ้งขอลาหยุดงานเรียบร้อยแล้ว!');
  };

  // Get current user attendance log list
  const userLogs = attendanceLogs.filter((l) => l.employeeId === currentUser.employeeId);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded border border-slate-200 p-4 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Attendance Action buttons (7 cols) */}
        <div className="md:col-span-7 space-y-4">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-emerald-600" />
            ตอกบัตรและลางาน (Time Attendance Punch)
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleClockInAction}
              disabled={!!todayRecord?.checkIn || todayRecord?.status === 'FORGOT_REQUEST_IN' || todayRecord?.status === 'LEAVE_APPROVED' || todayRecord?.status === 'PENDING_LEAVE'}
              className="flex flex-col items-center justify-center py-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold rounded shadow transition-all active:scale-95"
            >
              <span className="text-base font-black">เข้างาน (CHECK IN)</span>
              <span className="text-[10px] opacity-80 mt-1">
                {todayRecord?.checkIn ? `ลงเวลาแล้ว: ${todayRecord.checkIn} น.` : todayRecord?.status === 'FORGOT_REQUEST_IN' ? 'รอยืนยันสิทธิ์ลืมตอกบัตร' : 'ตอกเข้างานเช้า'}
              </span>
            </button>

            <button
              onClick={handleClockOutAction}
              disabled={!todayRecord?.checkIn || !!todayRecord?.checkOut || todayRecord?.status === 'FORGOT_REQUEST_OUT'}
              className="flex flex-col items-center justify-center py-4 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold rounded shadow transition-all active:scale-95"
            >
              <span className="text-base font-black">เลิกงาน (CHECK OUT)</span>
              <span className="text-[10px] opacity-80 mt-1">
                {todayRecord?.checkOut ? `ลงเวลาแล้ว: ${todayRecord.checkOut} น.` : todayRecord?.status === 'FORGOT_REQUEST_OUT' ? 'รอยืนยันสิทธิ์ลืมตอกบัตร' : 'ตอกเลิกงานเย็น'}
              </span>
            </button>
          </div>

          <div className="bg-slate-50 p-3 rounded border border-dashed border-slate-300 text-xs text-slate-600 flex justify-between items-center">
            <div>
              <span className="font-bold">กะทำงานวันนี้ (จากตารางกะ):</span>{' '}
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                (currentUser.weeklyShifts?.[['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date().getDay()]] || (currentUser.shiftWork.includes('NIGHT') ? 'NIGHT' : 'DAY')) === 'NIGHT'
                  ? 'bg-indigo-100 text-indigo-800'
                  : (currentUser.weeklyShifts?.[['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date().getDay()]] || (currentUser.shiftWork.includes('NIGHT') ? 'NIGHT' : 'DAY')) === 'DAY'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-slate-100 text-slate-500'
              }`}>
                {currentUser.weeklyShifts?.[['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date().getDay()]] === 'OFF'
                  ? '😴 OFF (วันหยุด)'
                  : currentUser.weeklyShifts?.[['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date().getDay()]] === 'NIGHT'
                  ? '🌙 NIGHT Shift'
                  : currentUser.weeklyShifts?.[['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date().getDay()]] === 'DAY'
                  ? '🌞 DAY Shift'
                  : `ตามสัญญาหลัก: ${currentUser.shiftWork}`
              }
              </span>
              <br />
              <span className="font-bold text-blue-600">สิทธิ์พนักงาน:</span> {currentUser.role}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowForgotModal(true)}
                className="text-blue-600 underline hover:text-blue-800 font-bold"
              >
                ลืมลงเวลา?
              </button>
              <span className="text-slate-300">|</span>
              <button
                onClick={() => setShowLeaveModal(true)}
                className="text-red-500 underline hover:text-red-700 font-bold"
              >
                แจ้งลางาน
              </button>
            </div>
          </div>
        </div>

        {/* Recalculated working hours summary (5 cols) */}
        <div className="md:col-span-5 bg-slate-50 p-4 rounded border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              สรุปชั่วโมงทำงานวันนี้ (Recalculated Hours)
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span>เวลาเข้างานจริง:</span>
                <span className="text-slate-800">{todayRecord?.checkIn ? `${todayRecord.checkIn} น.` : '-- : --'}</span>
              </div>
              <div className="flex justify-between text-xs font-bold">
                <span>เวลาเลิกงานจริง:</span>
                <span className="text-slate-800">{todayRecord?.checkOut ? `${todayRecord.checkOut} น.` : '-- : --'}</span>
              </div>
              <div className="pt-2 border-t flex justify-between text-xs font-bold text-blue-600">
                <span>คำนวณชั่วโมงทำงานหลัก (หักเบรค):</span>
                <span>{todayRecord?.checkOut ? `${todayRecord.workHours} ชม.` : '0 ชม.'}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-emerald-600">
                <span>ชั่วโมงโอทีสะสม (OT):</span>
                <span>{todayRecord?.checkOut ? `${todayRecord.otHours} ชม.` : '0 ชม.'}</span>
              </div>
            </div>
          </div>
          <p className="text-[9px] text-slate-400 mt-3 leading-relaxed">
            *คำนวณกะหลักตัดทุกๆ 30 นาที, โอทีก่อนเข้าทำงานนับเต็มจำนวน, โอทีหลังเลิกงานหักลบ 30 นาทีตามเงื่อนไข
          </p>
        </div>
      </div>

      {/* Attendance History */}
      <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-3 bg-slate-50 border-b">
          <span className="text-xs font-black text-slate-600 uppercase tracking-wider">ประวัติตอกบัตรของคุณ</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px] border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b">
                <th className="p-2">วันที่ตอก</th>
                <th className="p-2">กะงาน</th>
                <th className="p-2 text-center">เข้างาน</th>
                <th className="p-2 text-center">เลิกงาน</th>
                <th className="p-2 text-right">ชั่วโมงงาน</th>
                <th className="p-2 text-right text-emerald-600">โอที (OT)</th>
                <th className="p-2">สถานะตอกบัตร</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {userLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="p-2 font-bold">{log.date}</td>
                  <td className="p-2 text-slate-500">{log.shift}</td>
                  <td className="p-2 text-center text-emerald-600 font-bold">{log.checkIn || '--:--'}</td>
                  <td className="p-2 text-center text-slate-800 font-bold">{log.checkOut || '--:--'}</td>
                  <td className="p-2 text-right">{log.workHours} ชม.</td>
                  <td className="p-2 text-right text-emerald-600 font-bold">+{log.otHours} ชม.</td>
                  <td className="p-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${log.status === 'PRESENT' ? 'bg-emerald-100 text-emerald-700' : log.status === 'LEAVE_APPROVED' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                      {log.status === 'PRESENT' && 'มาทำงานตามปกติ'}
                      {log.status === 'LEAVE_APPROVED' && 'ลางาน (อนุมัติ)'}
                      {log.status === 'PENDING_LEAVE' && 'ลางาน (รออนุมัติ)'}
                      {log.status === 'FORGOT_REQUEST_IN' && 'ขอกู้ตอกเข้างาน'}
                      {log.status === 'FORGOT_REQUEST_OUT' && 'ขอกู้ตอกเลิกงาน'}
                    </span>
                  </td>
                </tr>
              ))}
              {userLogs.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-6 text-slate-400">
                    ไม่พบข้อมูลตอกบัตรของพนักงานท่านนี้
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Forgot Punch Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-5 max-w-sm w-full shadow-xl border space-y-3 text-xs">
            <h3 className="text-sm font-black text-slate-900 uppercase">ยื่นคำขอลืมตอกบัตร (Forgot Punch)</h3>
            <div className="space-y-2">
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">ประเภทที่ต้องการปรับเวลา</label>
                <select
                  value={forgotType}
                  onChange={(e) => setForgotType(e.target.value as any)}
                  className="w-full border p-1.5 rounded"
                >
                  <option value="FORGOT_REQUEST_IN">ลืมตอกบัตรเข้างาน (Clock In)</option>
                  <option value="FORGOT_REQUEST_OUT">ลืมตอกบัตรเลิกงาน (Clock Out)</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">วันที่ต้องการกู้เวลา</label>
                <input type="date" value={forgotDate} onChange={(e) => setForgotDate(e.target.value)} className="w-full border p-1.5 rounded" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">ระบุเวลาทำงานจริง (HH:MM)</label>
                <input type="time" value={forgotTime} onChange={(e) => setForgotTime(e.target.value)} className="w-full border p-1.5 rounded" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">เหตุผลความจำเป็น</label>
                <textarea rows={3} value={forgotReason} onChange={(e) => setForgotReason(e.target.value)} className="w-full border p-1.5 rounded" placeholder="เช่น คิวแถวแสกนหนาแน่น / เครื่องสแกนขัดข้อง..."></textarea>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowForgotModal(false)} className="border text-xs px-3 py-1 rounded">ยกเลิก</button>
              <button onClick={submitForgotRequest} className="bg-slate-900 text-white text-xs px-4 py-1 rounded font-bold">ส่งขออนุมัติ</button>
            </div>
          </div>
        </div>
      )}

      {/* Leave Request Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-5 max-w-sm w-full shadow-xl border space-y-3 text-xs">
            <h3 className="text-sm font-black text-slate-900 uppercase">ใบขออนุมัติลางาน (Leave Application)</h3>
            <div className="space-y-2">
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">ประเภทการลาหยุด</label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value)}
                  className="w-full border p-1.5 rounded bg-white"
                >
                  <option value="ลากิจ">ลากิจ (Personal Leave)</option>
                  <option value="ลาป่วย">ลาป่วย (Sick Leave)</option>
                  <option value="ลาพักร้อน">ลาพักร้อน (Vacation Leave)</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">วันที่เริ่มลา</label>
                <input type="date" value={leaveStartDate} onChange={(e) => setLeaveStartDate(e.target.value)} className="w-full border p-1.5 rounded" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">ถึงวันที่</label>
                <input type="date" value={leaveEndDate} onChange={(e) => setLeaveEndDate(e.target.value)} className="w-full border p-1.5 rounded" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">ระบุรายละเอียดการลา</label>
                <textarea rows={3} value={leaveReason} onChange={(e) => setLeaveReason(e.target.value)} className="w-full border p-1.5 rounded" placeholder="ทำธุระครอบครัว / พบแพทย์ตามนัด..."></textarea>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowLeaveModal(false)} className="border text-xs px-3 py-1 rounded">ยกเลิก</button>
              <button onClick={submitLeaveRequestAction} className="bg-slate-900 text-white text-xs px-4 py-1 rounded font-bold">ยื่นใบลา</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
