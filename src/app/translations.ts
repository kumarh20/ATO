export interface TranslationStrings {
  appName: string;
  dashboard: string;
  employees: string;
  reports: string;
  settings: string;
  schedule: string;
  todayAttendance: string;
  attendance: string;
  present: string;
  absent: string;
  halfDay: string;
  onLeave: string;
  holiday: string;
  weekOff: string;
  totalEmployees: string;
  markAllPresent: string;
  markAttendance: string;
  addEmployee: string;
  editEmployee: string;
  deleteEmployee: string;
  employeeDetails: string;
  searchPlaceholder: string;
  allDepartments: string;
  department: string;
  designation: string;
  phone: string;
  email: string;
  joiningDate: string;
  employeeId: string;
  fullName: string;
  selectStatus: string;
  selectEmployees: string;
  selectAll: string;
  date: string;
  notes: string;
  notesPlaceholder: string;
  getAlert: string;
  save: string;
  cancel: string;
  syncNow: string;
  syncedJustNow: string;
  sheetConnected: string;
  sheetNotConnected: string;
  connectGoogleSheet: string;
  sheetUrlLabel: string;
  sheetUrlPlaceholder: string;
  connect: string;
  disconnect: string;
  viewScriptCode: string;
  orgSettings: string;
  orgName: string;
  weekOffSchedule: string;
  holidayCalendar: string;
  addHoliday: string;
  holidayTitle: string;
  holidayDate: string;
  language: string;
  workingDays: string;
  attendanceRate: string;
  monthlyReport: string;
  monthlySummary: string;
  selectMonth: string;
  selectEmployee: string;
  exportPdf: string;
  noEmployeesFound: string;
  noAttendanceMarked: string;
  quickActions: string;
  installApp: string;
  appInstalled: string;
  demoModeNotice: string;
  copySuccess: string;
}

export const TRANSLATIONS: Record<'en' | 'hi', TranslationStrings> = {
  en: {
    appName: 'Attendance & Leave Manager',
    dashboard: 'Dashboard',
    employees: 'Employees',
    reports: 'Reports',
    settings: 'Settings',
    schedule: 'Schedule',
    todayAttendance: "Today's Attendance",
    attendance: "Attendance",
    present: 'Present',
    absent: 'Absent',
    halfDay: 'Half-day',
    onLeave: 'On Leave',
    holiday: 'Holiday',
    weekOff: 'Week-off',
    totalEmployees: 'Total Employees',
    markAllPresent: 'Mark All Present',
    markAttendance: 'Mark Attendance',
    addEmployee: 'Add Employee',
    editEmployee: 'Edit Employee',
    deleteEmployee: 'Delete Employee',
    employeeDetails: 'Employee Details',
    searchPlaceholder: 'Search by name or role...',
    allDepartments: 'All',
    department: 'Department',
    designation: 'Designation / Role',
    phone: 'Phone Number',
    email: 'Email Address',
    joiningDate: 'Joining Date',
    employeeId: 'Employee ID',
    fullName: 'Full Name',
    selectStatus: 'Select Status',
    selectEmployees: 'Select Employee(s)',
    selectAll: 'Select All',
    date: 'Date',
    notes: 'Notes / Remarks',
    notesPlaceholder: 'Add a description or note...',
    getAlert: 'Send notification alert',
    save: 'Save Record',
    cancel: 'Cancel',
    syncNow: 'Sync with Sheet',
    syncedJustNow: 'Synced just now',
    sheetConnected: 'Connected to Google Sheet',
    sheetNotConnected: 'Google Sheet Not Connected',
    connectGoogleSheet: 'Connect Your Google Sheet',
    sheetUrlLabel: 'Apps Script Web App URL',
    sheetUrlPlaceholder: 'https://script.google.com/macros/s/.../exec',
    connect: 'Connect Sheet',
    disconnect: 'Disconnect',
    viewScriptCode: 'View / Copy Apps Script Code',
    orgSettings: 'Organization Settings',
    orgName: 'Company / Organization Name',
    weekOffSchedule: 'Week-off Schedule',
    holidayCalendar: 'Holiday Calendar',
    addHoliday: 'Add Holiday',
    holidayTitle: 'Holiday Name',
    holidayDate: 'Holiday Date',
    language: 'Language',
    workingDays: 'Working Days',
    attendanceRate: 'Attendance Rate',
    monthlyReport: 'Monthly Report',
    monthlySummary: 'Monthly Summary',
    selectMonth: 'Select Month',
    selectEmployee: 'Select Employee',
    exportPdf: 'Print / Export PDF',
    noEmployeesFound: 'No employees found yet',
    noAttendanceMarked: 'No attendance marked for this date',
    quickActions: 'Quick Actions',
    installApp: 'Install App (PWA)',
    appInstalled: 'App Installed',
    demoModeNotice: 'Using demo preview data. Connect your Google Sheet anytime for live cloud sync.',
    copySuccess: 'Copied to clipboard!',
  },
  hi: {
    appName: 'कर्मचारी उपस्थिति प्रबंधक',
    dashboard: 'डैशबोर्ड',
    employees: 'कर्मचारी',
    reports: 'रिपोर्ट्स',
    settings: 'सेटिंग्स',
    schedule: 'अनुसूची',
    todayAttendance: 'आज की उपस्थिति',
    attendance: 'उपस्थिति',
    present: 'उपस्थित',
    absent: 'अनुपस्थित',
    halfDay: 'आधा दिन',
    onLeave: 'अवकाश पर',
    holiday: 'छुट्टी',
    weekOff: 'साप्ताहिक छुट्टी',
    totalEmployees: 'कुल कर्मचारी',
    markAllPresent: 'सभी को उपस्थित करें',
    markAttendance: 'उपस्थिति दर्ज करें',
    addEmployee: 'कर्मचारी जोड़ें',
    editEmployee: 'कर्मचारी संपादित करें',
    deleteEmployee: 'कर्मचारी हटाएं',
    employeeDetails: 'कर्मचारी विवरण',
    searchPlaceholder: 'नाम या पद से खोजें...',
    allDepartments: 'सभी',
    department: 'विभाग',
    designation: 'पद / पदनाम',
    phone: 'फ़ोन नंबर',
    email: 'ईमेल पता',
    joiningDate: 'शामिल होने की तिथि',
    employeeId: 'कर्मचारी आईडी',
    fullName: 'पूरा नाम',
    selectStatus: 'स्थिति चुनें',
    selectEmployees: 'कर्मचारी चुनें',
    selectAll: 'सभी चुनें',
    date: 'तारीख',
    notes: 'टिप्पणी / विवरण',
    notesPlaceholder: 'विवरण या नोट जोड़ें...',
    getAlert: 'सूचना अलर्ट भेजें',
    save: 'रिकॉर्ड सहेजें',
    cancel: 'रद्द करें',
    syncNow: 'शीट के साथ सिंक करें',
    syncedJustNow: 'अभी सिंक किया गया',
    sheetConnected: 'गूगल शीट कनेक्ट है',
    sheetNotConnected: 'गूगल शीट कनेक्ट नहीं है',
    connectGoogleSheet: 'अपनी गूगल शीट कनेक्ट करें',
    sheetUrlLabel: 'एप्स स्क्रिप्ट वेब ऐप यूआरएल',
    sheetUrlPlaceholder: 'https://script.google.com/macros/s/.../exec',
    connect: 'शीट कनेक्ट करें',
    disconnect: 'डिस्कनेक्ट करें',
    viewScriptCode: 'एप्स स्क्रिप्ट कोड देखें / कॉपी करें',
    orgSettings: 'संगठन सेटिंग्स',
    orgName: 'कंपनी / संगठन का नाम',
    weekOffSchedule: 'साप्ताहिक अवकाश अनुसूची',
    holidayCalendar: 'अवकाश कैलेंडर',
    addHoliday: 'अवकाश जोड़ें',
    holidayTitle: 'अवकाश का नाम',
    holidayDate: 'अवकाश की तिथि',
    language: 'भाषा',
    workingDays: 'कार्य दिवस',
    attendanceRate: 'उपस्थिति दर',
    monthlyReport: 'मासिक रिपोर्ट',
    monthlySummary: 'मासिक सारांश',
    selectMonth: 'महीना चुनें',
    selectEmployee: 'कर्मचारी चुनें',
    exportPdf: 'प्रिंट / पीडीएफ निर्यात',
    noEmployeesFound: 'अभी तक कोई कर्मचारी नहीं मिला',
    noAttendanceMarked: 'इस तिथि के लिए कोई उपस्थिति दर्ज नहीं की गई',
    quickActions: 'त्वरित क्रियाएं',
    installApp: 'ऐप इंस्टॉल करें (PWA)',
    appInstalled: 'ऐप इंस्टॉल है',
    demoModeNotice: 'डेमो डेटा का उपयोग हो रहा है। लाइव क्लाउड सिंक के लिए अपनी गूगल शीट कनेक्ट करें।',
    copySuccess: 'क्लिपबोर्ड पर कॉपी किया गया!',
  }
};
