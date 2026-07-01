export interface Employee {
  employeeId: string;
  pin: string;
  name: string;
  lastName: string;
  position: string;
  jobPosition: string;
  department: string;
  status: 'ประจำ' | 'ทดลองงาน' | 'ซับคอนแท็ค' | 'ลาออก';
  role: 'admin' | 'leader' | 'Assistant' | 'user_production' | 'user_store' | 'user_planning' | 'Sales';
  shiftWork: string;
  weeklyShifts?: Record<string, string>; // e.g. { mon: 'DAY', tue: 'DAY', wed: 'NIGHT', etc. }
}

export interface Product {
  id: string; // Customer-PartNo
  sapNo: string;
  zone: string;
  customer: string;
  partNo: string;
  partName: string;
  fullBox: number;
  packageType: string;
  beginningStock: number;
  inboundQty: number;
  outboundQty: number;
  currentStock: number;
}

export interface Transaction {
  labelId: string;
  partNo: string;
  customer: string;
  type: 'RECEIVE' | 'TRANSFER' | 'ADJUST' | 'DEPOSIT' | 'WITHDRAW';
  subType: string;
  qty: number;
  user: string;
  timestamp: string;
  location: string;
  printed?: boolean;
}

export interface DepositWithdraw {
  id: string;
  partNo: string;
  customer: string;
  qty: number;
  type: 'DEPOSIT' | 'WITHDRAW';
  depositor: string;
  storeKeeper: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  timestamp: string;
}

export interface Attendance {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string; // YYYY-MM-DD
  checkIn?: string; // HH:MM
  checkOut?: string; // HH:MM
  workHours: number;
  otHours: number;
  shift: string;
  status: 'PRESENT' | 'LEAVE' | 'FORGOT_REQUEST_IN' | 'FORGOT_REQUEST_OUT' | 'PENDING_LEAVE' | 'LEAVE_APPROVED';
  leaveType?: string;
  requestedTime?: string;
  reason?: string;
}

export interface AdjustRequest {
  id: string;
  partNo: string;
  customer: string;
  currentStock: number;
  countedQty: number;
  delta: number;
  requester: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  timestamp: string;
  location?: string;
}

export const INITIAL_EMPLOYEES: Employee[] = [
  {
    employeeId: '00000001',
    pin: '123456',
    name: 'สมชาย',
    lastName: 'คงศรี',
    position: 'ผู้จัดการสโตร์',
    jobPosition: 'บริหารคลังสินค้า',
    department: 'สโตร์ FG',
    status: 'ประจำ',
    role: 'admin',
    shiftWork: 'DAY (08:30-17:30)',
  },
  {
    employeeId: '00000002',
    pin: '111111',
    name: 'อนุชา',
    lastName: 'ยิ่งดี',
    position: 'หัวหน้างานผลิต',
    jobPosition: 'ควบคุมการผลิต',
    department: 'ฝ่ายผลิต',
    status: 'ประจำ',
    role: 'leader',
    shiftWork: 'DAY (08:30-17:30)',
  },
  {
    employeeId: '00000003',
    pin: '222222',
    name: 'วิภา',
    lastName: 'พรประสิทธิ์',
    position: 'พนักงานคลังสินค้า',
    jobPosition: 'จัดเตรียมวัตถุดิบ',
    department: 'สโตร์กลาง',
    status: 'ประจำ',
    role: 'user_store',
    shiftWork: 'DAY (08:30-17:30)',
  },
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'TOYOTA-PN998',
    sapNo: 'SAP-100293',
    zone: 'A1',
    customer: 'TOYOTA-TH',
    partNo: 'PN-998-XX',
    partName: 'BUMPER SUPPORT BRACKET',
    fullBox: 500,
    packageType: 'STEEL BOX',
    beginningStock: 1000,
    inboundQty: 4500,
    outboundQty: 3200,
    currentStock: 2300,
  },
  {
    id: 'HONDA-PN451',
    sapNo: 'SAP-100452',
    zone: 'B3',
    customer: 'HONDA-MY',
    partNo: 'PN-451-BA',
    partName: 'CENTER CONSOLE LINER',
    fullBox: 200,
    packageType: 'PLASTIC CARTON',
    beginningStock: 500,
    inboundQty: 1000,
    outboundQty: 600,
    currentStock: 900,
  },
];

export const DEFAULT_SHIFTS = [
  { id: 'S1', name: 'DAY Shift', timeIn: '08:30', timeOut: '17:30' },
  { id: 'S2', name: 'NIGHT Shift', timeIn: '20:30', timeOut: '05:30' },
];

export const DEFAULT_LOCATIONS = Array.from({ length: 60 }, (_, i) => `DIT-${String(i + 1).padStart(2, '0')}`);

export const DEFAULT_DEPARTMENTS = [
  'ฝ่ายผลิต',
  'สโตร์กลาง',
  'สโตร์ FG',
  'สโตร์ WIP',
  'Planning',
  'เซลล์',
];

export const DEFAULT_ROLES = [
  { value: 'admin', label: 'Admin (แอดมิน)' },
  { value: 'leader', label: 'Leader (หัวหน้างาน)' },
  { value: 'Assistant', label: 'Assistant (ผู้ช่วย)' },
  { value: 'user_production', label: 'User Production (ฝ่ายผลิต)' },
  { value: 'user_store', label: 'User Store (ฝ่ายคลังสินค้า)' },
  { value: 'user_planning', label: 'User Planning (วางแผน)' },
  { value: 'Sales', label: 'Sales (ฝ่ายขาย)' },
];
