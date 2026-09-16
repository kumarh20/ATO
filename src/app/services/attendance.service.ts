import { Injectable, signal, computed } from '@angular/core';
import { Employee, AttendanceRecord, Holiday, AppSettings, AttendanceStatus, MonthlyReportSummary } from '../types';
import { SecurityService } from './security.service';

const STORAGE_KEY_URL = 'attendance_sheet_web_app_url';

@Injectable({
  providedIn: 'root'
})
export class AttendanceService {
  readonly employees = signal<Employee[]>([]);
  readonly attendance = signal<AttendanceRecord[]>([]);
  readonly holidays = signal<Holiday[]>([]);
  readonly settings = signal<AppSettings>({
    weekOffDays: 'Saturday,Sunday',
    orgName: 'Acme Technologies',
    language: 'en',
    theme: 'coral'
  });

  readonly isConnected = signal<boolean>(false);
  readonly isSyncing = signal<boolean>(false);
  readonly lastSyncedTime = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly toast = signal<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Selected date on calendar (YYYY-MM-DD)
  readonly selectedDate = signal<string>(this.formatDate(new Date()));
  // Selected month for viewing/reporting (YYYY-MM)
  readonly selectedMonth = signal<string>(this.formatMonth(new Date()));

  // Computed: Week-off set
  readonly weekOffDaysSet = computed(() => {
    const raw = this.settings().weekOffDays || 'Saturday,Sunday';
    return new Set(raw.split(',').map(s => s.trim().toLowerCase()));
  });

  // Computed: Active employees count
  readonly activeEmployeesCount = computed(() => {
    return this.employees().filter(e => e.status === 'active').length;
  });

  // Computed: Attendance for the currently selected date
  readonly selectedDateAttendance = computed(() => {
    const date = this.selectedDate();
    const records = this.attendance().filter(r => r.date === date);
    const map = new Map<string, AttendanceRecord>();
    records.forEach(r => map.set(r.employeeId, r));
    return map;
  });

  // Computed: Stats for selected date
  readonly selectedDateStats = computed(() => {
    const date = this.selectedDate();
    const emps = this.employees().filter(e => e.status === 'active');
    const attMap = this.selectedDateAttendance();
    const isHoliday = this.isDateHoliday(date);
    const isWeekOff = this.isDateWeekOff(date);

    let present = 0;
    let absent = 0;
    let halfDay = 0;
    let leave = 0;
    let holiday = isHoliday ? emps.length : 0;
    let weekOff = isWeekOff && !isHoliday ? emps.length : 0;
    let notMarked = 0;

    emps.forEach(emp => {
      const rec = attMap.get(emp.id);
      if (rec) {
        if (rec.status === 'Present') present++;
        else if (rec.status === 'Absent') absent++;
        else if (rec.status === 'Half-day') halfDay++;
        else if (rec.status === 'Leave') leave++;
        else if (rec.status === 'Holiday') holiday++;
        else if (rec.status === 'Week-off') weekOff++;
      } else {
        if (!isHoliday && !isWeekOff) {
          notMarked++;
        }
      }
    });

    return {
      total: emps.length,
      present,
      absent,
      halfDay,
      leave,
      holiday,
      weekOff,
      notMarked
    };
  });

  constructor() {
    this.initializeState();
  }

  private async initializeState() {
    if (typeof window === 'undefined') return;

    // Strict privacy & security requirement:
    // User-related data (employees, attendance, holidays) must NEVER be saved in local or session storage.
    // Clean up any legacy or lingering keys.
    try {
      localStorage.removeItem('attendance_offline_cached_data');
      sessionStorage.clear();
    } catch {
      // ignore
    }

    // Only the Google Apps Script connection URL may be stored, and only in cryptographically encrypted form
    const storedCipher = localStorage.getItem(STORAGE_KEY_URL);
    if (storedCipher && storedCipher.trim()) {
      let resolvedUrl: string | null = null;
      if (storedCipher.startsWith('SECURE_APP_V2:')) {
        resolvedUrl = await SecurityService.decrypt(storedCipher);
      } else if (storedCipher.startsWith('http')) {
        // Upgrade legacy plain URL to encrypted cipher immediately
        resolvedUrl = storedCipher.trim();
        const encrypted = await SecurityService.encrypt(resolvedUrl);
        localStorage.setItem(STORAGE_KEY_URL, encrypted);
      }

      if (resolvedUrl && resolvedUrl.startsWith('http')) {
        this.settings.update(s => ({ ...s, webAppUrl: resolvedUrl! }));
        this.isConnected.set(true);
        await this.syncWithSheet(false);
        return;
      }
    }

    // If not connected to a Google Sheet, load sample preview in reactive memory signals only (never written to storage)
    this.loadDemoData();
  }

  showToast(message: string, type: 'success' | 'error' | 'info' = 'success') {
    this.toast.set({ message, type });
    setTimeout(() => {
      if (this.toast()?.message === message) {
        this.toast.set(null);
      }
    }, 3200);
  }

  /**
   * Connects to a Google Apps Script Web App URL
   * Encrypts the URL before saving to localStorage so nobody can copy or read it.
   */
  async connectSheet(url: string): Promise<boolean> {
    const cleanUrl = url.trim();
    if (!cleanUrl.startsWith('http')) {
      this.showToast('Please enter a valid Web App URL (starts with https://)', 'error');
      return false;
    }

    this.isSyncing.set(true);
    this.errorMessage.set(null);

    try {
      // Test fetch from the Google Apps Script Web App
      const endpoint = cleanUrl.includes('?') ? `${cleanUrl}&action=getAllData` : `${cleanUrl}?action=getAllData`;
      const response = await fetch(endpoint, {
        method: 'GET',
        redirect: 'follow',
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const json = await response.json();
      if (json && json.status === 'success' && json.data) {
        if (typeof window !== 'undefined') {
          // Encrypt before saving to localStorage
          const encrypted = await SecurityService.encrypt(cleanUrl);
          localStorage.setItem(STORAGE_KEY_URL, encrypted);
        }
        this.settings.update(s => ({ ...s, webAppUrl: cleanUrl }));
        this.isConnected.set(true);
        this.applyFetchedData(json.data);
        this.lastSyncedTime.set(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        this.showToast('Google Sheet connected & synchronized successfully!', 'success');
        this.isSyncing.set(false);
        return true;
      } else {
        throw new Error(json?.message || 'Invalid response format from Apps Script');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.errorMessage.set(msg);
      this.isSyncing.set(false);
      this.showToast(`Connection failed: ${msg}. Check Web App URL & permissions.`, 'error');
      return false;
    }
  }

  disconnectSheet() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY_URL);
    }
    this.settings.update(s => ({ ...s, webAppUrl: undefined }));
    this.isConnected.set(false);
    this.showToast('Disconnected from Google Sheet.', 'info');
  }

  /**
   * Synchronizes data with the connected Google Sheet
   */
  async syncWithSheet(showToastNotice = true): Promise<void> {
    const url = this.settings().webAppUrl;
    if (!url) {
      if (showToastNotice) this.showToast('No Sheet URL configured', 'info');
      return;
    }

    this.isSyncing.set(true);
    try {
      const endpoint = url.includes('?') ? `${url}&action=getAllData` : `${url}?action=getAllData`;
      const response = await fetch(endpoint, {
        method: 'GET',
        redirect: 'follow',
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const json = await response.json();

      if (json && json.status === 'success' && json.data) {
        this.applyFetchedData(json.data);
        this.lastSyncedTime.set(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        if (showToastNotice) {
          this.showToast('Sheet synchronized successfully!', 'success');
        }
      } else {
        throw new Error(json?.message || 'Failed to read data');
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (showToastNotice) {
        this.showToast(`Sync failed: ${msg}.`, 'error');
      }
    } finally {
      this.isSyncing.set(false);
    }
  }

  private applyFetchedData(data: { employees?: Employee[]; attendance?: AttendanceRecord[]; holidays?: Holiday[]; settings?: Partial<AppSettings> }) {
    if (Array.isArray(data.employees)) {
      this.employees.set(data.employees);
    }
    if (Array.isArray(data.attendance)) {
      this.attendance.set(data.attendance);
    }
    if (Array.isArray(data.holidays)) {
      this.holidays.set(data.holidays);
    }
    if (data.settings) {
      this.settings.update(s => ({ ...s, ...data.settings }));
    }
  }

  /**
   * Helper to execute Apps Script POST mutations with non-blocking remote sync
   */
  private async callAppsScriptPost(action: string, payload: unknown) {
    const url = this.settings().webAppUrl;
    if (!url || !this.isConnected()) return;

    try {
      await fetch(url, {
        method: 'POST',
        // 'text/plain' ensures browser does not send an OPTIONS CORS preflight which Apps Script drops
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action, payload })
      });
      this.lastSyncedTime.set(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch (e) {
      console.warn('Apps Script mutation background sync error:', e);
    }
  }

  /**
   * Employee CRUD
   */
  addEmployee(empData: Omit<Employee, 'id' | 'createdAt'>): Employee {
    const newEmp: Employee = {
      ...empData,
      id: 'emp-' + Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString()
    };
    this.employees.update(list => [newEmp, ...list]);
    this.showToast(`Employee ${newEmp.name} added!`);
    this.callAppsScriptPost('addEmployee', newEmp);
    return newEmp;
  }

  updateEmployee(emp: Employee): void {
    this.employees.update(list => list.map(e => e.id === emp.id ? { ...emp } : e));
    this.showToast(`Employee ${emp.name} updated!`);
    this.callAppsScriptPost('updateEmployee', emp);
  }

  deleteEmployee(id: string): void {
    const target = this.employees().find(e => e.id === id);
    this.employees.update(list => list.filter(e => e.id !== id));
    // Also remove associated attendance records
    this.attendance.update(list => list.filter(a => a.employeeId !== id));
    this.showToast(target ? `Employee ${target.name} deleted` : 'Employee removed');
    this.callAppsScriptPost('deleteEmployee', { id });
  }

  /**
   * Attendance Marking & Upsert
   */
  markAttendance(employeeId: string, date: string, status: AttendanceStatus, note?: string): void {
    const nowIso = new Date().toISOString();
    let updated = false;

    this.attendance.update(records => {
      const idx = records.findIndex(r => r.employeeId === employeeId && r.date === date);
      if (idx >= 0) {
        updated = true;
        const copy = [...records];
        copy[idx] = { ...copy[idx], status, note, markedAt: nowIso };
        return copy;
      } else {
        const newRecord: AttendanceRecord = {
          id: 'att-' + Math.random().toString(36).substring(2, 9),
          employeeId,
          date,
          status,
          note,
          markedAt: nowIso
        };
        return [newRecord, ...records];
      }
    });

    this.showToast(updated ? 'Attendance updated' : 'Attendance recorded');
    this.callAppsScriptPost('markAttendance', { employeeId, date, status, note });
  }

  /**
   * Bulk Attendance Marking ("Mark all Present for today" quick action)
   */
  bulkMarkAttendance(date: string, status: AttendanceStatus, note?: string, employeeIds?: string[]): void {
    const emps = this.employees().filter(e => e.status === 'active');
    const targetIds = employeeIds && employeeIds.length > 0 ? employeeIds : emps.map(e => e.id);
    const nowIso = new Date().toISOString();

    const recordsToSync: AttendanceRecord[] = [];

    this.attendance.update(existing => {
      const map = new Map<string, AttendanceRecord>();
      existing.forEach(r => {
        map.set(`${r.employeeId}_${r.date}`, r);
      });

      targetIds.forEach(empId => {
        const key = `${empId}_${date}`;
        const prev = map.get(key);
        if (prev) {
          const updatedRec: AttendanceRecord = { ...prev, status, note, markedAt: nowIso };
          map.set(key, updatedRec);
          recordsToSync.push(updatedRec);
        } else {
          const newRec: AttendanceRecord = {
            id: 'att-' + Math.random().toString(36).substring(2, 9),
            employeeId: empId,
            date,
            status,
            note,
            markedAt: nowIso
          };
          map.set(key, newRec);
          recordsToSync.push(newRec);
        }
      });

      return Array.from(map.values());
    });

    this.showToast(`Marked ${targetIds.length} employees as ${status}`);
    this.callAppsScriptPost('bulkMarkAttendance', { records: recordsToSync });
  }

  /**
   * Holiday Management
   */
  addHoliday(date: string, label: string): Holiday {
    const newHol: Holiday = {
      id: 'hol-' + Math.random().toString(36).substring(2, 9),
      date,
      label,
      createdAt: new Date().toISOString()
    };
    this.holidays.update(list => [...list, newHol].sort((a, b) => a.date.localeCompare(b.date)));
    this.showToast(`Holiday "${label}" added`);
    this.callAppsScriptPost('addHoliday', newHol);
    return newHol;
  }

  deleteHoliday(id: string): void {
    this.holidays.update(list => list.filter(h => h.id !== id));
    this.showToast('Holiday deleted');
    this.callAppsScriptPost('deleteHoliday', { id });
  }

  /**
   * Settings Updates
   */
  updateSettings(partial: Partial<AppSettings>): void {
    this.settings.update(s => ({ ...s, ...partial }));
    this.showToast('Settings saved');
    this.callAppsScriptPost('updateSettings', partial);
  }

  /**
   * Date & Week-off Utilities
   */
  formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  formatMonth(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }

  isDateHoliday(dateStr: string): Holiday | undefined {
    return this.holidays().find(h => h.date === dateStr);
  }

  isDateWeekOff(dateStr: string): boolean {
    const [year, month, day] = dateStr.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    const weekdayName = d.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    return this.weekOffDaysSet().has(weekdayName);
  }

  getEmployeeStatusForDate(employeeId: string, dateStr: string): { status: AttendanceStatus; note?: string } {
    // 1. Check explicit mark
    const explicit = this.attendance().find(a => a.employeeId === employeeId && a.date === dateStr);
    if (explicit) {
      return { status: explicit.status, note: explicit.note };
    }
    // 2. Check holiday
    const holiday = this.isDateHoliday(dateStr);
    if (holiday) {
      return { status: 'Holiday', note: holiday.label };
    }
    // 3. Check week-off
    if (this.isDateWeekOff(dateStr)) {
      return { status: 'Week-off' };
    }
    // Default not marked
    return { status: 'Absent' };
  }

  /**
   * Generates a monthly report for an employee
   */
  generateMonthlyReport(employeeId: string, monthKey: string): MonthlyReportSummary | null {
    const emp = this.employees().find(e => e.id === employeeId);
    if (!emp) return null;

    const [year, month] = monthKey.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();

    let weekOffs = 0;
    let holidays = 0;
    let presentDays = 0;
    let absentDays = 0;
    let halfDays = 0;
    let leaveDays = 0;

    const dailyStatuses: Record<string, AttendanceStatus> = {};

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const explicit = this.attendance().find(a => a.employeeId === employeeId && a.date === dateStr);
      const isHol = this.isDateHoliday(dateStr);
      const isWOff = this.isDateWeekOff(dateStr);

      let effectiveStatus: AttendanceStatus;

      if (explicit) {
        effectiveStatus = explicit.status;
      } else if (isHol) {
        effectiveStatus = 'Holiday';
      } else if (isWOff) {
        effectiveStatus = 'Week-off';
      } else {
        // If date is in the past, consider absent; if future, treat as yet to be marked
        const todayStr = this.formatDate(new Date());
        effectiveStatus = dateStr <= todayStr ? 'Absent' : 'Present';
      }

      dailyStatuses[dateStr] = effectiveStatus;

      if (effectiveStatus === 'Present') presentDays++;
      else if (effectiveStatus === 'Absent') absentDays++;
      else if (effectiveStatus === 'Half-day') halfDays++;
      else if (effectiveStatus === 'Leave') leaveDays++;
      else if (effectiveStatus === 'Holiday') holidays++;
      else if (effectiveStatus === 'Week-off') weekOffs++;
    }

    const workingDays = Math.max(1, daysInMonth - weekOffs - holidays);
    const effectivePresentDays = presentDays + (halfDays * 0.5);
    const attendancePercentage = Math.min(100, Math.round((effectivePresentDays / workingDays) * 100));

    return {
      employee: emp,
      monthKey,
      totalDaysInMonth: daysInMonth,
      weekOffs,
      holidays,
      workingDays,
      presentDays,
      absentDays,
      halfDays,
      leaveDays,
      effectivePresentDays,
      attendancePercentage,
      dailyStatuses
    };
  }

  /**
   * Pre-loads realistic demo data matching the reference aesthetics
   */
  private loadDemoData() {
    const demoEmployees: Employee[] = [
      {
        id: 'emp-101',
        name: 'Emma Watson',
        designation: 'Lead UI/UX Designer',
        department: 'Design',
        phone: '+1 (555) 234-5678',
        email: 'emma.watson@acme.co',
        joiningDate: '2023-03-15',
        avatarColor: '#ff6b6b',
        status: 'active',
        createdAt: '2023-03-15T09:00:00.000Z'
      },
      {
        id: 'emp-102',
        name: 'John Miller',
        designation: 'Senior Frontend Engineer',
        department: 'Engineering',
        phone: '+1 (555) 876-5432',
        email: 'john.miller@acme.co',
        joiningDate: '2023-06-01',
        avatarColor: '#a78bfa',
        status: 'active',
        createdAt: '2023-06-01T09:00:00.000Z'
      },
      {
        id: 'emp-103',
        name: 'Katie Holmes',
        designation: 'Product Manager',
        department: 'Product',
        phone: '+1 (555) 345-6789',
        email: 'katie.h@acme.co',
        joiningDate: '2023-08-20',
        avatarColor: '#f472b6',
        status: 'active',
        createdAt: '2023-08-20T09:00:00.000Z'
      },
      {
        id: 'emp-104',
        name: 'Alex Rivera',
        designation: 'Mobile Engineer (Android)',
        department: 'Engineering',
        phone: '+1 (555) 901-2345',
        email: 'alex.rivera@acme.co',
        joiningDate: '2023-11-10',
        avatarColor: '#38bdf8',
        status: 'active',
        createdAt: '2023-11-10T09:00:00.000Z'
      },
      {
        id: 'emp-105',
        name: 'Sophia Patel',
        designation: 'HR & Talent Lead',
        department: 'Human Resources',
        phone: '+1 (555) 456-7890',
        email: 'sophia.p@acme.co',
        joiningDate: '2024-01-05',
        avatarColor: '#34d399',
        status: 'active',
        createdAt: '2024-01-05T09:00:00.000Z'
      },
      {
        id: 'emp-106',
        name: 'Liam Chen',
        designation: 'Backend Architect',
        department: 'Engineering',
        phone: '+1 (555) 789-0123',
        email: 'liam.chen@acme.co',
        joiningDate: '2024-02-18',
        avatarColor: '#fb923c',
        status: 'active',
        createdAt: '2024-02-18T09:00:00.000Z'
      }
    ];

    const todayStr = this.selectedDate();
    const [y, m, d] = todayStr.split('-').map(Number);

    const demoHolidays: Holiday[] = [
      { id: 'hol-1', date: `${y}-01-01`, label: "New Year's Day" },
      { id: 'hol-2', date: `${y}-05-01`, label: 'Labor Day' },
      { id: 'hol-3', date: `${y}-10-24`, label: 'Festival of Lights (Diwali)' },
      { id: 'hol-4', date: `${y}-12-25`, label: 'Christmas Day' }
    ];

    // Seed recent attendance records around today
    const demoAttendance: AttendanceRecord[] = [];
    const statuses: AttendanceStatus[] = ['Present', 'Present', 'Present', 'Half-day', 'Leave', 'Present'];

    demoEmployees.forEach((emp, i) => {
      // Mark today
      demoAttendance.push({
        id: `att-td-${emp.id}`,
        employeeId: emp.id,
        date: todayStr,
        status: statuses[i % statuses.length],
        note: i === 3 ? 'Morning appointment' : i === 4 ? 'Personal leave' : 'In-office 9:00 AM',
        markedAt: new Date().toISOString()
      });

      // Mark past 7 days
      for (let offset = 1; offset <= 7; offset++) {
        const pastD = new Date(y, m - 1, d - offset);
        const pastStr = this.formatDate(pastD);
        if (!this.isDateWeekOff(pastStr)) {
          demoAttendance.push({
            id: `att-p${offset}-${emp.id}`,
            employeeId: emp.id,
            date: pastStr,
            status: offset % 5 === 0 ? 'Leave' : 'Present',
            note: 'Regular shift',
            markedAt: pastD.toISOString()
          });
        }
      }
    });

    this.employees.set(demoEmployees);
    this.holidays.set(demoHolidays);
    this.attendance.set(demoAttendance);
  }
}
