import { ChangeDetectionStrategy, Component, computed, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { AttendanceService } from './services/attendance.service';
import { TRANSLATIONS } from './translations';
import { APPS_SCRIPT_CODE } from './apps-script-code';
import { AttendanceStatus, Employee, Holiday, NavTab } from './types';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App implements OnInit {
  readonly attService = inject(AttendanceService);

  // Active navigation tab
  readonly activeTab = signal<NavTab>('dashboard');

  // Modal / Screen overlays
  readonly activeModal = signal<
    | 'employeeActions'
    | 'markAttendance'
    | 'addEmployee'
    | 'editEmployee'
    | 'employeeDetail'
    | 'addHoliday'
    | 'connectSheet'
    | 'viewCode'
    | 'settingsSheet'
    | 'settingsOrg'
    | 'settingsWeekOff'
    | 'settingsHolidays'
    | 'settingsLanguage'
    | 'settingsAbout'
    | null
  >(null);

  // Selected employee for detail view
  readonly selectedEmployee = signal<Employee | null>(null);

  // Selected employee for monthly report view
  readonly reportEmployeeId = signal<string>('');

  // Search & Filter state for Employees tab
  readonly employeeSearchQuery = signal<string>('');
  readonly selectedDepartmentFilter = signal<string>('All');

  // Script code string for copying
  readonly appsScriptCode = APPS_SCRIPT_CODE;
  readonly codeCopied = signal<boolean>(false);

  // PWA Install state
  readonly isInstallable = signal<boolean>(false);
  readonly isInstalled = signal<boolean>(false);
  readonly isIOS = signal<boolean>(false);
  readonly showIOSInstallGuide = signal<boolean>(false);
  private deferredInstallPrompt: (Event & { prompt: () => void; userChoice: Promise<{ outcome: string }> }) | null = null;

  // Translation helper
  readonly currentLang = computed(() => this.attService.settings().language);
  readonly t = computed(() => TRANSLATIONS[this.currentLang()] || TRANSLATIONS.en);

  // Mark Attendance Form
  readonly markAttendanceForm = new FormGroup({
    date: new FormControl(this.attService.formatDate(new Date()), { nonNullable: true, validators: [Validators.required] }),
    status: new FormControl<AttendanceStatus>('Present', { nonNullable: true, validators: [Validators.required] }),
    note: new FormControl('', { nonNullable: true }),
    sendAlert: new FormControl(true, { nonNullable: true })
  });
  readonly selectedEmployeeIdsForMarking = signal<string[]>([]);

  // Employee Form (Add/Edit)
  readonly employeeForm = new FormGroup({
    id: new FormControl(''),
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    designation: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    department: new FormControl('Engineering', { nonNullable: true, validators: [Validators.required] }),
    phone: new FormControl('', { nonNullable: true }),
    email: new FormControl('', { nonNullable: true }),
    joiningDate: new FormControl(this.attService.formatDate(new Date()), { nonNullable: true }),
    avatarColor: new FormControl('#ff6b6b', { nonNullable: true })
  });

  // Holiday Form
  readonly holidayForm = new FormGroup({
    date: new FormControl(this.attService.formatDate(new Date()), { nonNullable: true, validators: [Validators.required] }),
    label: new FormControl('', { nonNullable: true, validators: [Validators.required] })
  });

  // Sheet Connection Form
  readonly sheetUrlInput = new FormControl('', { nonNullable: true });

  // Organization name input
  readonly orgNameInput = new FormControl('', { nonNullable: true });

  // Avatar pastel colors palette
  readonly avatarColors = ['#ff6b6b', '#a78bfa', '#f472b6', '#38bdf8', '#34d399', '#fb923c', '#818cf8', '#ec4899'];

  // Department options
  readonly departments = ['All', 'Engineering', 'Design', 'Product', 'Marketing', 'Human Resources', 'Sales', 'Operations'];

  // Status options for chips
  readonly statusOptions: AttendanceStatus[] = ['Present', 'Absent', 'Half-day', 'Leave', 'Holiday', 'Week-off'];

  // Weekday names for Week-off schedule
  readonly weekdaysList = [
    { key: 'monday', label: 'Mon' },
    { key: 'tuesday', label: 'Tue' },
    { key: 'wednesday', label: 'Wed' },
    { key: 'thursday', label: 'Thu' },
    { key: 'friday', label: 'Fri' },
    { key: 'saturday', label: 'Sat' },
    { key: 'sunday', label: 'Sun' }
  ];

  // Calendar display computed properties
  readonly calendarDays = computed(() => {
    const selectedDateStr = this.attService.selectedDate();
    const [year, month] = selectedDateStr.split('-').map(Number);
    const firstDayOfMonth = new Date(year, month - 1, 1);
    const lastDayOfMonth = new Date(year, month, 0);
    const daysInMonth = lastDayOfMonth.getDate();

    // Day of week for 1st of month: 0 (Sun) to 6 (Sat). We map Monday to index 0
    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6; // Sunday becomes 6

    const days: {
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isSelected: boolean;
      isToday: boolean;
      isWeekOff: boolean;
      holiday?: Holiday;
      hasAttendance: boolean;
    }[] = [];

    // Previous month padding
    const prevMonthLastDate = new Date(year, month - 1, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const prevDay = prevMonthLastDate - i;
      const prevDate = new Date(year, month - 2, prevDay);
      const prevStr = this.attService.formatDate(prevDate);
      days.push({
        dateStr: prevStr,
        dayNumber: prevDay,
        isCurrentMonth: false,
        isSelected: prevStr === selectedDateStr,
        isToday: prevStr === this.attService.formatDate(new Date()),
        isWeekOff: this.attService.isDateWeekOff(prevStr),
        holiday: this.attService.isDateHoliday(prevStr),
        hasAttendance: this.attService.attendance().some(a => a.date === prevStr)
      });
    }

    // Current month days
    const todayStr = this.attService.formatDate(new Date());
    for (let day = 1; day <= daysInMonth; day++) {
      const curDateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      days.push({
        dateStr: curDateStr,
        dayNumber: day,
        isCurrentMonth: true,
        isSelected: curDateStr === selectedDateStr,
        isToday: curDateStr === todayStr,
        isWeekOff: this.attService.isDateWeekOff(curDateStr),
        holiday: this.attService.isDateHoliday(curDateStr),
        hasAttendance: this.attService.attendance().some(a => a.date === curDateStr)
      });
    }

    // Next month padding to fill complete grid rows (multiple of 7)
    const totalCells = Math.ceil(days.length / 7) * 7;
    const remaining = totalCells - days.length;
    for (let day = 1; day <= remaining; day++) {
      const nextDate = new Date(year, month, day);
      const nextStr = this.attService.formatDate(nextDate);
      days.push({
        dateStr: nextStr,
        dayNumber: day,
        isCurrentMonth: false,
        isSelected: nextStr === selectedDateStr,
        isToday: nextStr === todayStr,
        isWeekOff: this.attService.isDateWeekOff(nextStr),
        holiday: this.attService.isDateHoliday(nextStr),
        hasAttendance: this.attService.attendance().some(a => a.date === nextStr)
      });
    }

    return days;
  });

  // Calendar Header Title (e.g. "April 2026")
  readonly calendarMonthTitle = computed(() => {
    const [year, month] = this.attService.selectedDate().split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    const locale = this.currentLang() === 'hi' ? 'hi-IN' : 'en-US';
    return date.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  });

  // Filtered employees for Employees tab
  readonly filteredEmployees = computed(() => {
    const q = this.employeeSearchQuery().trim().toLowerCase();
    const dept = this.selectedDepartmentFilter();
    return this.attService.employees().filter(e => {
      const matchesSearch = !q || e.name.toLowerCase().includes(q) || e.designation.toLowerCase().includes(q) || e.department.toLowerCase().includes(q);
      const matchesDept = dept === 'All' || e.department === dept;
      return matchesSearch && matchesDept;
    });
  });

  // Monthly report for selected report employee
  readonly activeMonthlyReport = computed(() => {
    const empId = this.reportEmployeeId();
    if (!empId) return null;
    return this.attService.generateMonthlyReport(empId, this.attService.selectedMonth());
  });

  // Employee detail report
  readonly selectedEmployeeDetailReport = computed(() => {
    const emp = this.selectedEmployee();
    if (!emp) return null;
    return this.attService.generateMonthlyReport(emp.id, this.attService.selectedMonth());
  });

  // Formatted date for Dashboard card header (e.g., "Wed, 16 Sep 2026")
  readonly selectedDateFormatted = computed(() => {
    const dateStr = this.attService.selectedDate();
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const locale = this.currentLang() === 'hi' ? 'hi-IN' : 'en-US';
    return date.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  });

  // Selected date attendance percentage
  readonly selectedDateAttendanceRate = computed(() => {
    const stats = this.attService.selectedDateStats();
    if (stats.total === 0) return 0;
    return Math.round((stats.present / stats.total) * 100);
  });

  // Minimal preview employees (3 items) for dashboard card
  readonly previewEmployees = computed(() => {
    return this.attService.employees().slice(0, 3);
  });

  // Settings Summaries for Overview Cards
  readonly weekOffSummary = computed(() => {
    const raw = this.attService.settings().weekOffDays;
    if (!raw || !raw.trim()) return 'None (7 Days Working)';
    const list = raw.split(',').map(s => s.trim()).filter(Boolean);
    if (list.length === 0) return 'None (7 Days Working)';
    return list.join(', ');
  });

  readonly holidaysSummary = computed(() => {
    const count = this.attService.holidays().length;
    if (count === 0) return 'No holidays declared';
    return `${count} declared holiday${count > 1 ? 's' : ''}`;
  });

  readonly languageSummary = computed(() => {
    return this.currentLang() === 'hi' ? 'हिंदी (Hindi)' : 'English (Default)';
  });

  // Reload application when user clicks top-left attendance icon
  reloadApp() {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }

  ngOnInit() {
    this.orgNameInput.setValue(this.attService.settings().orgName);
    this.sheetUrlInput.setValue(this.attService.settings().webAppUrl || '');

    // Default report employee to first employee
    const emps = this.attService.employees();
    if (emps.length > 0) {
      this.reportEmployeeId.set(emps[0].id);
    }

    // PWA setup
    if (typeof window !== 'undefined') {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      this.isInstalled.set(isStandalone);

      const ua = window.navigator.userAgent.toLowerCase();
      this.isIOS.set(/iphone|ipad|ipod/.test(ua));

      window.addEventListener('beforeinstallprompt', (e: Event) => {
        e.preventDefault();
        this.deferredInstallPrompt = e as Event & { prompt: () => void; userChoice: Promise<{ outcome: string }> };
        this.isInstallable.set(true);
      });

      window.addEventListener('appinstalled', () => {
        this.isInstalled.set(true);
        this.isInstallable.set(false);
        this.deferredInstallPrompt = null;
      });
    }
  }

  // Language Toggle
  toggleLanguage() {
    const nextLang = this.currentLang() === 'en' ? 'hi' : 'en';
    this.attService.updateSettings({ language: nextLang });
  }

  // Navigation
  switchTab(tab: NavTab) {
    this.activeTab.set(tab);
    if (tab === 'reports' && !this.reportEmployeeId()) {
      const first = this.attService.employees()[0];
      if (first) this.reportEmployeeId.set(first.id);
    }
  }

  // Calendar Navigation
  prevMonth() {
    const [year, month, day] = this.attService.selectedDate().split('-').map(Number);
    const d = new Date(year, month - 2, Math.min(day, 28));
    this.attService.selectedDate.set(this.attService.formatDate(d));
    this.attService.selectedMonth.set(this.attService.formatMonth(d));
  }

  nextMonth() {
    const [year, month, day] = this.attService.selectedDate().split('-').map(Number);
    const d = new Date(year, month, Math.min(day, 28));
    this.attService.selectedDate.set(this.attService.formatDate(d));
    this.attService.selectedMonth.set(this.attService.formatMonth(d));
  }

  selectCalendarDate(dateStr: string) {
    this.attService.selectedDate.set(dateStr);
    const [y, m] = dateStr.split('-');
    this.attService.selectedMonth.set(`${y}-${m}`);
  }

  // Mark Attendance Modal
  openMarkAttendanceModal(employeeId?: string) {
    this.markAttendanceForm.patchValue({
      date: this.attService.selectedDate(),
      status: 'Present',
      note: ''
    });

    if (employeeId) {
      this.selectedEmployeeIdsForMarking.set([employeeId]);
    } else {
      // Default select all active employees
      const allIds = this.attService.employees().filter(e => e.status === 'active').map(e => e.id);
      this.selectedEmployeeIdsForMarking.set(allIds);
    }

    this.activeModal.set('markAttendance');
  }

  toggleEmployeeSelection(empId: string) {
    const current = this.selectedEmployeeIdsForMarking();
    if (current.includes(empId)) {
      this.selectedEmployeeIdsForMarking.set(current.filter(id => id !== empId));
    } else {
      this.selectedEmployeeIdsForMarking.set([...current, empId]);
    }
  }

  selectAllEmployeesForMarking() {
    const allIds = this.attService.employees().filter(e => e.status === 'active').map(e => e.id);
    this.selectedEmployeeIdsForMarking.set(allIds);
  }

  clearAllEmployeesForMarking() {
    this.selectedEmployeeIdsForMarking.set([]);
  }

  submitAttendance() {
    const formVal = this.markAttendanceForm.getRawValue();
    const targetIds = this.selectedEmployeeIdsForMarking();

    if (targetIds.length === 0) {
      this.attService.showToast('Please select at least one employee', 'error');
      return;
    }

    this.attService.bulkMarkAttendance(formVal.date, formVal.status, formVal.note, targetIds);
    this.closeModal();
  }

  // Quick Action: Mark all present for selected date
  quickMarkAllPresent() {
    const date = this.attService.selectedDate();
    this.attService.bulkMarkAttendance(date, 'Present', 'All present quick mark');
  }

  // Add / Edit Employee
  openAddEmployeeModal() {
    this.employeeForm.reset({
      id: '',
      name: '',
      designation: '',
      department: 'Engineering',
      phone: '',
      email: '',
      joiningDate: this.attService.formatDate(new Date()),
      avatarColor: this.avatarColors[Math.floor(Math.random() * this.avatarColors.length)]
    });
    this.activeModal.set('addEmployee');
  }

  openEditEmployeeModal(emp: Employee, event?: Event) {
    if (event) event.stopPropagation();
    this.employeeForm.setValue({
      id: emp.id,
      name: emp.name,
      designation: emp.designation,
      department: emp.department,
      phone: emp.phone,
      email: emp.email,
      joiningDate: emp.joiningDate,
      avatarColor: emp.avatarColor
    });
    this.activeModal.set('editEmployee');
  }

  saveEmployee() {
    if (this.employeeForm.invalid) {
      this.attService.showToast('Please fill out employee name and designation', 'error');
      return;
    }

    const val = this.employeeForm.getRawValue();
    if (val.id) {
      // Edit
      const existing = this.attService.employees().find(e => e.id === val.id);
      if (existing) {
        this.attService.updateEmployee({
          ...existing,
          name: val.name,
          designation: val.designation,
          department: val.department,
          phone: val.phone,
          email: val.email,
          joiningDate: val.joiningDate,
          avatarColor: val.avatarColor
        });
      }
    } else {
      // Add
      this.attService.addEmployee({
        name: val.name,
        designation: val.designation,
        department: val.department,
        phone: val.phone,
        email: val.email,
        joiningDate: val.joiningDate,
        avatarColor: val.avatarColor,
        status: 'active'
      });
    }

    this.closeModal();
  }

  deleteEmployee(empId: string, event?: Event) {
    if (event) event.stopPropagation();
    if (confirm('Are you sure you want to delete this employee? All attendance records will be removed.')) {
      this.attService.deleteEmployee(empId);
      if (this.selectedEmployee()?.id === empId) {
        this.selectedEmployee.set(null);
      }
      this.closeModal();
    }
  }

  viewEmployeeDetail(emp: Employee) {
    this.selectedEmployee.set(emp);
    this.activeModal.set('employeeDetail');
  }

  openEmployeeActionMenu(emp: Employee, event?: Event) {
    if (event) event.stopPropagation();
    this.selectedEmployee.set(emp);
    this.activeModal.set('employeeActions');
  }

  // Week-off Schedule Toggle
  toggleWeekOffDay(dayKey: string) {
    const raw = this.attService.settings().weekOffDays || '';
    const current = new Set(raw.split(',').map(s => s.trim().toLowerCase()).filter(Boolean));

    if (current.has(dayKey)) {
      current.delete(dayKey);
    } else {
      current.add(dayKey);
    }

    // Capitalize first letter
    const updated = Array.from(current).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(',');
    this.attService.updateSettings({ weekOffDays: updated });
  }

  isWeekOffSelected(dayKey: string): boolean {
    return this.attService.weekOffDaysSet().has(dayKey.toLowerCase());
  }

  // Holidays Modal
  openAddHolidayModal() {
    this.holidayForm.reset({
      date: this.attService.formatDate(new Date()),
      label: ''
    });
    this.activeModal.set('addHoliday');
  }

  saveHoliday() {
    if (this.holidayForm.invalid) {
      this.attService.showToast('Please enter a holiday title and date', 'error');
      return;
    }
    const val = this.holidayForm.getRawValue();
    this.attService.addHoliday(val.date, val.label);
    this.closeModal();
  }

  deleteHoliday(id: string) {
    this.attService.deleteHoliday(id);
  }

  // Google Sheet Connect
  openConnectSheetModal() {
    this.sheetUrlInput.setValue(this.attService.settings().webAppUrl || '');
    this.activeModal.set('connectSheet');
  }

  async submitSheetConnection() {
    const url = this.sheetUrlInput.value.trim();
    if (!url) {
      this.attService.showToast('Please enter your Google Apps Script Web App URL', 'error');
      return;
    }
    const success = await this.attService.connectSheet(url);
    if (success) {
      this.closeModal();
    }
  }

  // Settings Dialog Openers
  openSettingsModal(
    modal: 'settingsSheet' | 'settingsOrg' | 'settingsWeekOff' | 'settingsHolidays' | 'settingsLanguage' | 'settingsAbout'
  ) {
    if (modal === 'settingsOrg') {
      this.orgNameInput.setValue(this.attService.settings().orgName || '');
    } else if (modal === 'settingsSheet') {
      this.sheetUrlInput.setValue(this.attService.settings().webAppUrl || '');
    }
    this.activeModal.set(modal);
  }

  saveOrgName() {
    const name = this.orgNameInput.value.trim();
    if (name) {
      this.attService.updateSettings({ orgName: name });
      this.attService.showToast('Organization name updated successfully!', 'success');
      this.closeModal();
    } else {
      this.attService.showToast('Please enter organization name', 'error');
    }
  }

  selectLanguage(lang: 'en' | 'hi') {
    this.attService.updateSettings({ language: lang });
    this.attService.showToast(lang === 'hi' ? 'भाषा बदलकर हिंदी कर दी गई है' : 'Language changed to English', 'success');
  }

  disconnectSheet() {
    if (confirm('Are you sure you want to disconnect from your Google Sheet? The app will revert to demo mode.')) {
      this.attService.disconnectSheet();
      this.sheetUrlInput.setValue('');
      this.closeModal();
    }
  }

  // Code.gs Modal
  openViewCodeModal() {
    this.codeCopied.set(false);
    this.activeModal.set('viewCode');
  }

  copyCodeToClipboard() {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(this.appsScriptCode);
      this.codeCopied.set(true);
      this.attService.showToast('Code.gs copied to clipboard!', 'success');
      setTimeout(() => this.codeCopied.set(false), 3000);
    }
  }

  // PWA Install Action
  async triggerPWAInstall() {
    if (this.deferredInstallPrompt) {
      this.deferredInstallPrompt.prompt();
      const choice = await this.deferredInstallPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        this.isInstalled.set(true);
      }
      this.deferredInstallPrompt = null;
      this.isInstallable.set(false);
    } else if (this.isIOS()) {
      this.showIOSInstallGuide.set(true);
    }
  }

  // Print Report
  printReport() {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }

  closeModal() {
    this.activeModal.set(null);
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map(part => part.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  }

  getStatusBadgeClass(status: AttendanceStatus): string {
    switch (status) {
      case 'Present':
        return 'bg-emerald-100/70 text-emerald-700 border-emerald-200';
      case 'Absent':
        return 'bg-rose-100/70 text-rose-700 border-rose-200';
      case 'Half-day':
        return 'bg-amber-100/70 text-amber-700 border-amber-200';
      case 'Leave':
        return 'bg-purple-100/70 text-purple-700 border-purple-200';
      case 'Holiday':
        return 'bg-sky-100/70 text-sky-700 border-sky-200';
      case 'Week-off':
        return 'bg-slate-100/70 text-slate-700 border-slate-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  }

  getStatusIconName(status: AttendanceStatus): string {
    switch (status) {
      case 'Present':
        return 'check_circle';
      case 'Absent':
        return 'cancel';
      case 'Half-day':
        return 'schedule';
      case 'Leave':
        return 'beach_access';
      case 'Holiday':
        return 'celebration';
      case 'Week-off':
        return 'weekend';
      default:
        return 'help';
    }
  }
}
