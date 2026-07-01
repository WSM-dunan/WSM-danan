import React, { useState } from 'react';
import { AdjustRequest, Attendance, Employee } from '../data';
import { Bell, CheckCircle2, XCircle, AlertCircle, RefreshCw, Layers, Calendar, Clock, Inbox, ShieldAlert } from 'lucide-react';

interface NotificationsPanelProps {
  currentUser: Employee | null;
  adjustRequests: AdjustRequest[];
  attendanceLogs: Attendance[];
  onApproveAdjustment: (reqId: string, partNo: string, customer: string, delta: number) => void;
  onApproveForgotPunch: (reqId: string, employeeId: string, date: string, time: string, status: string) => void;
  onApproveLeave: (reqId: string) => void;
  onRejectRequest: (reqId: string, type: 'adjust' | 'attendance') => void;
}

export const NotificationsPanel: React.FC<NotificationsPanelProps> = ({
  currentUser,
  adjustRequests,
  attendanceLogs,
  onApproveAdjustment,
  onApproveForgotPunch,
  onApproveLeave,
  onRejectRequest,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'adjust' | 'attendance'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'PENDING' | 'APPROVED' | 'REJECTED'>('all');

  const isAdminOrLeader = currentUser?.role === 'admin' || currentUser?.role === 'leader';

  // 1. Convert AdjustRequests to standard list item
  const formattedAdjustRequests = adjustRequests.map((req) => ({
    id: req.id,
    type: 'adjust' as const,
    title: 'คำขอปรับปรุงยอดสต๊อกหน้างาน',
    detail: `พาร์ท: ${req.partNo} (${req.customer}) • ระบุ: ${req.currentStock} Pcs • นับได้จริง: ${req.countedQty} Pcs • ส่วนต่าง: ${req.delta > 0 ? '+' : ''}${req.delta} Pcs`,
    requester: req.requester,
    timestamp: req.timestamp || new Date().toISOString(),
    status: req.status, // 'PENDING' | 'APPROVED' | 'REJECTED'
    original: req,
  }));

  // 2. Filter attendance logs for forgot punches and leave requests
  const attendanceRequests = attendanceLogs
    .filter((log) => 
      log.status === 'FORGOT_REQUEST_IN' ||
      log.status === 'FORGOT_REQUEST_OUT' ||
      log.status === 'PENDING_LEAVE' ||
      log.status === 'LEAVE_APPROVED' ||
      log.status === 'LEAVE_REJECTED' ||
      log.status === 'FORGOT_REJECTED_IN' ||
      log.status === 'FORGOT_REJECTED_OUT'
    )
    .map((log) => {
      let reqType: 'FORGOT_IN' | 'FORGOT_OUT' | 'LEAVE' = 'LEAVE';
      let title = 'คำขอวันลาพักงาน';
      let detail = `ขอประเภท: ${log.leaveType || 'ทั่วไป'} • เหตุผล: ${log.reason || 'ไม่มีระบุ'}`;
      
      if (log.status.includes('FORGOT')) {
        const isIn = log.status.includes('IN');
        reqType = isIn ? 'FORGOT_IN' : 'FORGOT_OUT';
        title = `คำขอลืมตอกบัตรปรับเวลา (${isIn ? 'เข้างาน' : 'เลิกงาน'})`;
        detail = `เวลาที่ขอปรับ: ${log.requestedTime || '08:30'} น. • วันที่ลืมตอก: ${log.date} • เหตุผล: ${log.reason || 'ไม่มีระบุ'}`;
      }

      let requestStatus: 'PENDING' | 'APPROVED' | 'REJECTED' = 'PENDING';
      if (log.status === 'LEAVE_APPROVED' || (log.status === 'PRESENT' && log.checkIn && !log.status.includes('REQUEST'))) {
        // Attendance records that are normally present or approved leave
        requestStatus = log.status === 'LEAVE_APPROVED' ? 'APPROVED' : 'APPROVED';
      } else if (log.status.includes('REJECTED')) {
        requestStatus = 'REJECTED';
      } else if (log.status === 'PRESENT') {
        requestStatus = 'APPROVED'; // Completed request
      }

      return {
        id: log.id,
        type: 'attendance' as const,
        title,
        detail,
        requester: log.employeeName,
        timestamp: `${log.date}T08:30:00.000Z`, // Proxy timestamp
        status: requestStatus,
        original: log,
      };
    });

  // Combine lists
  const allRequests = [...formattedAdjustRequests, ...attendanceRequests];

  // Sort by timestamp desc, but put PENDING first
  allRequests.sort((a, b) => {
    if (a.status === 'PENDING' && b.status !== 'PENDING') return -1;
    if (a.status !== 'PENDING' && b.status === 'PENDING') return 1;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  // Filter lists
  const filteredRequests = allRequests.filter((req) => {
    const matchType = filterType === 'all' || req.type === filterType;
    const matchStatus = filterStatus === 'all' || req.status === filterStatus;
    
    // Regular users only see their own requests (by name matching requester)
    const isOwner = !isAdminOrLeader 
      ? req.requester.toLowerCase().includes(`${currentUser?.name} ${currentUser?.lastName}`.toLowerCase().trim()) || 
        (req.original as any).employeeId === currentUser?.employeeId
      : true;

    return matchType && matchStatus && isOwner;
  });

  return (
    <div className="space-y-4">
      {/* Header Panel */}
      <div className="bg-white rounded border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Bell className="w-4 h-4 text-rose-600 animate-swing" />
            ศูนย์แจ้งเตือนและการอนุมัติคำขอ (Notifications & Approval Center)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {isAdminOrLeader
              ? 'ตรวจสอบคำขอลืมตอกบัตร, คำขออนุมัติลางาน และคำขอปรับสต๊อกทั้งหมดในระบบ'
              : 'ตรวจสอบสถานะการอนุมัติใบลาพักงาน หรือการลืมตอกบัตรของคุณ'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Quick Filters */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="border text-[11px] font-bold px-2 py-1 rounded bg-slate-50 outline-none"
          >
            <option value="all">ระบบทั้งหมด (All Systems)</option>
            <option value="adjust">📦 ปรับสต๊อกสินค้า</option>
            <option value="attendance">⏰ เวลาเข้างาน & วันลา</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="border text-[11px] font-bold px-2 py-1 rounded bg-slate-50 outline-none"
          >
            <option value="all">สถานะทั้งหมด</option>
            <option value="PENDING">⏳ รออนุมัติ (Pending)</option>
            <option value="APPROVED">✅ อนุมัติแล้ว (Approved)</option>
            <option value="REJECTED">❌ ปฏิเสธแล้ว (Rejected)</option>
          </select>
        </div>
      </div>

      {/* Main Request Board */}
      <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-3 bg-slate-50 border-b font-bold text-xs text-slate-700 flex justify-between items-center">
          <span>รายการคำขอแจ้งเตือน ({filteredRequests.length} รายการ)</span>
          <span className="text-[10px] text-slate-400">คำขอที่ยังไม่อนุมัติจะไม่หายไปและแสดงที่นี่เสมอ</span>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredRequests.map((req) => {
            const isPending = req.status === 'PENDING';
            const isApproved = req.status === 'APPROVED';
            const isRejected = req.status === 'REJECTED';

            return (
              <div
                key={req.id}
                className={`p-4 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isPending ? 'bg-amber-50/40 hover:bg-amber-50/70 border-l-4 border-amber-500' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Status icon badge */}
                  <div className="mt-0.5 shrink-0">
                    {isPending && <AlertCircle className="w-5 h-5 text-amber-500 animate-pulse" />}
                    {isApproved && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                    {isRejected && <XCircle className="w-5 h-5 text-rose-500" />}
                  </div>

                  {/* Details block */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs text-slate-900">{req.title}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                        isPending 
                          ? 'bg-amber-100 text-amber-800' 
                          : isApproved 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {isPending ? '⏳ รอผู้อนุมัติ' : isApproved ? '✅ อนุมัติแล้ว' : '❌ ปฏิเสธ'}
                      </span>
                    </div>

                    <p className="text-slate-600 text-xs font-medium leading-relaxed">
                      {req.detail}
                    </p>

                    <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono">
                      <span>ผู้ยื่นขอ: <strong className="text-slate-600 font-sans">{req.requester}</strong></span>
                      <span>•</span>
                      <span>วันที่ทำคำขอ: {new Date(req.timestamp).toLocaleDateString('th-TH', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>

                {/* Approver Action Panel */}
                <div className="shrink-0 flex items-center gap-2 self-end md:self-auto">
                  {isPending && isAdminOrLeader ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          if (req.type === 'adjust') {
                            onRejectRequest(req.id, 'adjust');
                          } else {
                            onRejectRequest(req.id, 'attendance');
                          }
                        }}
                        className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded text-[10px] transition-all"
                      >
                        ปฏิเสธการขอ (Reject)
                      </button>
                      
                      <button
                        onClick={() => {
                          if (req.type === 'adjust') {
                            const orig = req.original as AdjustRequest;
                            onApproveAdjustment(orig.id, orig.partNo, orig.customer, orig.delta);
                          } else {
                            const orig = req.original as Attendance;
                            if (orig.status === 'PENDING_LEAVE') {
                              onApproveLeave(orig.id);
                            } else {
                              onApproveForgotPunch(
                                orig.id,
                                orig.employeeId,
                                orig.date,
                                orig.requestedTime || '08:30',
                                orig.status
                              );
                            }
                          }
                        }}
                        className={`px-4 py-1.5 font-black rounded text-[10px] text-white shadow-sm hover:scale-105 transition-all ${
                          req.type === 'adjust' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                      >
                        อนุมัติและอัปเดตระบบ (Approve)
                      </button>
                    </div>
                  ) : isPending ? (
                    <span className="text-[10px] text-slate-400 font-semibold italic flex items-center gap-1 bg-slate-50 px-2 py-1 rounded">
                      <Clock className="w-3.5 h-3.5 text-slate-400 animate-spin" />
                      รอหัวหน้างานตรวจสอบ...
                    </span>
                  ) : (
                    <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold">
                      {isApproved ? (
                        <span className="text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-100 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> ดำเนินการอนุมัติเสร็จสิ้น
                        </span>
                      ) : (
                        <span className="text-rose-600 bg-rose-50 px-2.5 py-1 rounded border border-rose-100 flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5" /> ปฏิเสธคำขอการตอกเวลา
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {filteredRequests.length === 0 && (
            <div className="p-8 text-center text-slate-400 space-y-2">
              <Inbox className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-xs font-semibold">ไม่พบรายการแจ้งเตือนตามเงื่อนไขที่เลือก</p>
              <p className="text-[10px] text-slate-400">คำขอของคุณหรือของแผนกที่ยื่นเรื่องจะแสดงที่นี่และไม่สูญหาย</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
