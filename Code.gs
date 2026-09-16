/**
 * =========================================================================
 * Google Apps Script Web App — Employee Attendance Management Backend
 * =========================================================================
 * 
 * DEPLOYMENT INSTRUCTIONS (4 Quick Steps):
 * 1. Open Google Sheets (https://sheets.new) and create a new blank spreadsheet.
 * 2. In the top menu, go to: Extensions > Apps Script.
 * 3. Delete any existing code in the editor, paste this ENTIRE Code.gs file, and click Save (💾).
 * 4. In the top right, click Deploy > New deployment:
 *    - Click the gear icon next to "Select type" and choose "Web app".
 *    - Description: "Employee Attendance API"
 *    - Execute as: "Me (your email)"
 *    - Who has access: "Anyone" (CRITICAL: must be "Anyone" so the app can connect without Google login)
 *    - Click "Deploy", authorize permissions when prompted.
 *    - Copy the "Web app URL" (ends in /exec) and paste it into the Attendance App!
 * =========================================================================
 */

var SHEET_TABS = {
  EMPLOYEES: 'Employees',
  ATTENDANCE: 'Attendance',
  HOLIDAYS: 'Holidays',
  SETTINGS: 'Settings'
};

var HEADERS = {
  Employees: ['id', 'name', 'designation', 'department', 'phone', 'email', 'joiningDate', 'avatarColor', 'status', 'createdAt'],
  Attendance: ['id', 'employeeId', 'date', 'status', 'note', 'markedAt'],
  Holidays: ['id', 'date', 'label', 'createdAt'],
  Settings: ['key', 'value']
};

/**
 * Auto-initializes spreadsheet tabs and default settings if not present.
 */
function initializeSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Ensure each tab exists with correct headers
  Object.keys(HEADERS).forEach(function(tabName) {
    var sheet = ss.getSheetByName(tabName);
    if (!sheet) {
      sheet = ss.insertSheet(tabName);
    }
    var currentLastRow = sheet.getLastRow();
    var currentLastCol = sheet.getLastColumn();
    if (currentLastRow === 0 || currentLastCol === 0) {
      sheet.appendRow(HEADERS[tabName]);
      sheet.getRange(1, 1, 1, HEADERS[tabName].length)
           .setFontWeight('bold')
           .setBackground('#fdeff2')
           .setFontColor('#2d2a4a');
      sheet.setFrozenRows(1);
    }
  });

  // Seed default settings if empty
  var settingsSheet = ss.getSheetByName(SHEET_TABS.SETTINGS);
  if (settingsSheet.getLastRow() <= 1) {
    var defaultSettings = [
      ['weekOffDays', 'Saturday,Sunday'],
      ['orgName', 'Acme Corporation'],
      ['language', 'en'],
      ['theme', 'coral'],
      ['initializedAt', new Date().toISOString()]
    ];
    defaultSettings.forEach(function(row) {
      settingsSheet.appendRow(row);
    });
  }

  // Remove default "Sheet1" if empty and other sheets exist
  var sheet1 = ss.getSheetByName('Sheet1');
  if (sheet1 && ss.getSheets().length > 1 && sheet1.getLastRow() === 0) {
    try { ss.deleteSheet(sheet1); } catch (e) {}
  }
}

/**
 * HTTP GET handler
 */
function doGet(e) {
  try {
    initializeSheet();
    var params = (e && e.parameter) ? e.parameter : {};
    var action = params.action || 'getAllData';

    var result;
    if (action === 'getAllData') {
      result = handleGetAllData();
    } else if (action === 'ping') {
      result = { status: 'success', message: 'Attendance API is online', timestamp: new Date().toISOString() };
    } else {
      result = { status: 'error', message: 'Unknown GET action: ' + action };
    }

    return createJsonResponse(result);
  } catch (error) {
    return createJsonResponse({ status: 'error', message: error.toString() });
  }
}

/**
 * HTTP POST handler
 */
function doPost(e) {
  try {
    initializeSheet();
    var requestData = {};

    if (e && e.postData && e.postData.contents) {
      try {
        requestData = JSON.parse(e.postData.contents);
      } catch (parseErr) {
        requestData = e.parameter || {};
      }
    } else if (e && e.parameter) {
      requestData = e.parameter;
    }

    var action = requestData.action || '';
    var payload = requestData.payload || requestData;
    var result;

    switch (action) {
      case 'getAllData':
        result = handleGetAllData();
        break;

      case 'addEmployee':
        result = handleAddEmployee(payload);
        break;

      case 'updateEmployee':
        result = handleUpdateEmployee(payload);
        break;

      case 'deleteEmployee':
        result = handleDeleteEmployee(payload);
        break;

      case 'markAttendance':
        result = handleMarkAttendance(payload);
        break;

      case 'bulkMarkAttendance':
        result = handleBulkMarkAttendance(payload);
        break;

      case 'addHoliday':
        result = handleAddHoliday(payload);
        break;

      case 'deleteHoliday':
        result = handleDeleteHoliday(payload);
        break;

      case 'updateSettings':
        result = handleUpdateSettings(payload);
        break;

      default:
        result = { status: 'error', message: 'Unknown POST action: ' + action };
        break;
    }

    return createJsonResponse(result);
  } catch (error) {
    return createJsonResponse({ status: 'error', message: error.toString() });
  }
}

/**
 * Format JSON response with appropriate MIME type
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Reads all table rows as an array of objects
 */
function getSheetRowsAsObjects(sheetName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];

  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow <= 1 || lastCol === 0) return [];

  var data = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  var headers = data[0];
  var rows = [];

  for (var i = 1; i < data.length; i++) {
    var rowObj = {};
    var hasContent = false;
    for (var j = 0; j < headers.length; j++) {
      var val = data[i][j];
      if (val instanceof Date) {
        val = Utilities.formatDate(val, Session.getScriptTimeZone(), "yyyy-MM-dd");
      }
      rowObj[headers[j]] = val;
      if (val !== '' && val !== null && val !== undefined) hasContent = true;
    }
    if (hasContent) {
      rows.push(rowObj);
    }
  }
  return rows;
}

/**
 * Fetches all employees, attendance, holidays and settings in one unified payload
 */
function handleGetAllData() {
  var employees = getSheetRowsAsObjects(SHEET_TABS.EMPLOYEES);
  var attendance = getSheetRowsAsObjects(SHEET_TABS.ATTENDANCE);
  var holidays = getSheetRowsAsObjects(SHEET_TABS.HOLIDAYS);
  var settingsRows = getSheetRowsAsObjects(SHEET_TABS.SETTINGS);

  var settings = {};
  settingsRows.forEach(function(row) {
    if (row.key) {
      settings[row.key] = row.value;
    }
  });

  return {
    status: 'success',
    data: {
      employees: employees,
      attendance: attendance,
      holidays: holidays,
      settings: settings
    }
  };
}

/**
 * Adds an employee
 */
function handleAddEmployee(employee) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_TABS.EMPLOYEES);
  var id = employee.id || Utilities.getUuid();
  var createdAt = employee.createdAt || new Date().toISOString();

  var row = [
    id,
    employee.name || 'Unnamed',
    employee.designation || 'Staff',
    employee.department || 'General',
    employee.phone || '',
    employee.email || '',
    employee.joiningDate || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd"),
    employee.avatarColor || '#ff6b6b',
    employee.status || 'active',
    createdAt
  ];

  sheet.appendRow(row);
  return { status: 'success', data: { id: id }, message: 'Employee added successfully' };
}

/**
 * Updates an employee
 */
function handleUpdateEmployee(employee) {
  if (!employee.id) return { status: 'error', message: 'Employee id is required' };
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_TABS.EMPLOYEES);
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return { status: 'error', message: 'No employees found' };

  var data = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < data.length; i++) {
    if (data[i][0] == employee.id) {
      var rowIdx = i + 2;
      var existing = sheet.getRange(rowIdx, 1, 1, 10).getValues()[0];
      sheet.getRange(rowIdx, 2).setValue(employee.name !== undefined ? employee.name : existing[1]);
      sheet.getRange(rowIdx, 3).setValue(employee.designation !== undefined ? employee.designation : existing[2]);
      sheet.getRange(rowIdx, 4).setValue(employee.department !== undefined ? employee.department : existing[3]);
      sheet.getRange(rowIdx, 5).setValue(employee.phone !== undefined ? employee.phone : existing[4]);
      sheet.getRange(rowIdx, 6).setValue(employee.email !== undefined ? employee.email : existing[5]);
      sheet.getRange(rowIdx, 7).setValue(employee.joiningDate !== undefined ? employee.joiningDate : existing[6]);
      sheet.getRange(rowIdx, 8).setValue(employee.avatarColor !== undefined ? employee.avatarColor : existing[7]);
      sheet.getRange(rowIdx, 9).setValue(employee.status !== undefined ? employee.status : existing[8]);
      return { status: 'success', message: 'Employee updated successfully' };
    }
  }
  return { status: 'error', message: 'Employee not found' };
}

/**
 * Deletes an employee
 */
function handleDeleteEmployee(payload) {
  var id = payload.id;
  if (!id) return { status: 'error', message: 'Employee id is required' };
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_TABS.EMPLOYEES);
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return { status: 'error', message: 'No employees found' };

  var data = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < data.length; i++) {
    if (data[i][0] == id) {
      sheet.deleteRow(i + 2);
      return { status: 'success', message: 'Employee deleted' };
    }
  }
  return { status: 'error', message: 'Employee not found' };
}

/**
 * Upserts a single attendance record by employeeId + date
 */
function handleMarkAttendance(record) {
  if (!record.employeeId || !record.date) {
    return { status: 'error', message: 'employeeId and date are required' };
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_TABS.ATTENDANCE);
  var lastRow = sheet.getLastRow();
  var markedAt = new Date().toISOString();
  var status = record.status || 'Present';
  var note = record.note || '';

  // Check for existing record
  if (lastRow > 1) {
    var data = sheet.getRange(2, 1, lastRow - 1, 4).getValues();
    for (var i = 0; i < data.length; i++) {
      var rowEmpId = data[i][1];
      var rowDate = data[i][2];
      if (rowDate instanceof Date) {
        rowDate = Utilities.formatDate(rowDate, Session.getScriptTimeZone(), "yyyy-MM-dd");
      }
      if (rowEmpId == record.employeeId && rowDate == record.date) {
        var rowIdx = i + 2;
        sheet.getRange(rowIdx, 4).setValue(status);
        sheet.getRange(rowIdx, 5).setValue(note);
        sheet.getRange(rowIdx, 6).setValue(markedAt);
        return { status: 'success', message: 'Attendance updated' };
      }
    }
  }

  // Insert new
  var id = Utilities.getUuid();
  sheet.appendRow([id, record.employeeId, record.date, status, note, markedAt]);
  return { status: 'success', data: { id: id }, message: 'Attendance recorded' };
}

/**
 * Bulk marks attendance for multiple employees (or all)
 */
function handleBulkMarkAttendance(payload) {
  var records = payload.records || [];
  if (!Array.isArray(records) || records.length === 0) {
    return { status: 'error', message: 'Records array is empty' };
  }

  records.forEach(function(rec) {
    handleMarkAttendance(rec);
  });

  return { status: 'success', message: 'Bulk attendance recorded for ' + records.length + ' records' };
}

/**
 * Adds a custom holiday
 */
function handleAddHoliday(holiday) {
  if (!holiday.date || !holiday.label) {
    return { status: 'error', message: 'date and label are required' };
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_TABS.HOLIDAYS);
  var id = holiday.id || Utilities.getUuid();
  var createdAt = new Date().toISOString();

  sheet.appendRow([id, holiday.date, holiday.label, createdAt]);
  return { status: 'success', data: { id: id }, message: 'Holiday added' };
}

/**
 * Deletes a holiday
 */
function handleDeleteHoliday(payload) {
  var id = payload.id;
  if (!id) return { status: 'error', message: 'Holiday id is required' };
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_TABS.HOLIDAYS);
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return { status: 'error', message: 'No holidays found' };

  var data = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < data.length; i++) {
    if (data[i][0] == id) {
      sheet.deleteRow(i + 2);
      return { status: 'success', message: 'Holiday deleted' };
    }
  }
  return { status: 'error', message: 'Holiday not found' };
}

/**
 * Updates application settings key-values
 */
function handleUpdateSettings(settingsObj) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_TABS.SETTINGS);
  var lastRow = sheet.getLastRow();

  var existingKeys = {};
  if (lastRow > 1) {
    var data = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
    for (var i = 0; i < data.length; i++) {
      existingKeys[data[i][0]] = i + 2;
    }
  }

  Object.keys(settingsObj).forEach(function(key) {
    var value = settingsObj[key];
    if (typeof value === 'object') value = JSON.stringify(value);
    if (existingKeys[key]) {
      sheet.getRange(existingKeys[key], 2).setValue(value);
    } else {
      sheet.appendRow([key, value]);
    }
  });

  return { status: 'success', message: 'Settings saved' };
}
