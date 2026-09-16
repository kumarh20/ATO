export type AttendanceStatus =
  | 'Present'
  | 'Absent'
  | 'Half-day'
  | 'Leave'
  | 'Holiday'
  | 'Week-off';

export interface Employee {
  id: string;
  name: string;
  designation: string;
  department: string;
  phone: string;
  email: string;
  joiningDate: string;
  avatarColor: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  note?: string;
  markedAt: string;
}

export interface Holiday {
  id: string;
  date: string; // YYYY-MM-DD
  label: string;
  createdAt?: string;
}

export interface AppSettings {
  weekOffDays: string; // e.g., "Saturday,Sunday"
  orgName: string;
  language: 'en' | 'hi';
  theme: string;
  webAppUrl?: string;
  lastSynced?: string;
}

export interface MonthlyReportSummary {
  employee: Employee;
  monthKey: string; // YYYY-MM
  totalDaysInMonth: number;
  weekOffs: number;
  holidays: number;
  workingDays: number;
  presentDays: number;
  absentDays: number;
  halfDays: number;
  leaveDays: number;
  effectivePresentDays: number; // present + (halfDays * 0.5)
  attendancePercentage: number; // (effectivePresentDays / workingDays) * 100
  dailyStatuses: Record<string, AttendanceStatus>;
}

export type NavTab = 'dashboard' | 'employees' | 'reports' | 'settings';
