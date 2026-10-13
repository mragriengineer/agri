const SPREADSHEET_PROPERTY = 'AGRI_ENQUIRIES_SPREADSHEET_ID';
const ENQUIRIES_SHEET = 'Enquiries';
const HEADERS = [
  'Enquiry ID',
  'Submitted at',
  'Name',
  'Phone',
  'Email',
  'Land location',
  'Land size',
  'Service',
  'Budget',
  'Message',
  'Status'
];
const SERVICES = [
  'Farm planning',
  'Site & soil assessment',
  'Detailed project report',
  'Farmhouse planning',
  'Execution coordination',
  'Other'
];

function setupAgriEnquiries() {
  const properties = PropertiesService.getScriptProperties();
  let spreadsheetId = properties.getProperty(SPREADSHEET_PROPERTY);
  let spreadsheet;

  if (spreadsheetId) {
    spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  } else {
    spreadsheet = SpreadsheetApp.create('Mr Agri Engineer — Enquiries');
    spreadsheetId = spreadsheet.getId();
    properties.setProperty(SPREADSHEET_PROPERTY, spreadsheetId);
  }

  let sheet = spreadsheet.getSheetByName(ENQUIRIES_SHEET);
  if (!sheet) {
    const sheets = spreadsheet.getSheets();
    sheet = sheets.length === 1 && sheets[0].getLastRow() === 0
      ? sheets[0]
      : spreadsheet.insertSheet(ENQUIRIES_SHEET);
    if (sheet.getName() !== ENQUIRIES_SHEET) sheet.setName(ENQUIRIES_SHEET);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
  } else {
    const existingHeaders = sheet.getRange(1, 1, 1, HEADERS.length).getDisplayValues()[0];
    if (HEADERS.some((header, index) => existingHeaders[index] !== header)) {
      throw new Error('The Enquiries sheet has unexpected headers. Please check it before setup.');
    }
  }

  console.log('Enquiry spreadsheet: ' + spreadsheet.getUrl());
  return spreadsheet.getUrl();
}

function doPost(event) {
  try {
    const body = event && event.postData && event.postData.contents;
    if (!body) throw new Error('No enquiry data was received.');

    const data = JSON.parse(body);
    if (String(data.website || '').trim()) return jsonResponse_({ ok: true });

    const name = requiredText_(data.name, 'Please enter your name.', 100);
    const phone = requiredText_(data.phone, 'Please enter your phone number.', 30);
    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length < 7 || phoneDigits.length > 15) {
      throw new Error('Please enter a valid phone number.');
    }

    const email = optionalText_(data.email, 254);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('Please enter a valid email address.');
    }

    const message = requiredText_(data.message, 'Please tell us about your idea.', 3000);
    const service = optionalText_(data.service, 80);
    if (service && SERVICES.indexOf(service) === -1) throw new Error('Please select a valid service.');

    const spreadsheetId = PropertiesService.getScriptProperties().getProperty(SPREADSHEET_PROPERTY);
    if (!spreadsheetId) throw new Error('The enquiry sheet has not been set up.');
    const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName(ENQUIRIES_SHEET);
    if (!sheet) throw new Error('The Enquiries sheet could not be found.');

    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    let enquiryId;
    try {
      enquiryId = nextEnquiryId_(sheet);
      sheet.appendRow([
        enquiryId,
        new Date(),
        safeCell_(name),
        safeCell_(phone),
        safeCell_(email),
        safeCell_(optionalText_(data.location, 160)),
        safeCell_(optionalText_(data.landSize, 80)),
        safeCell_(service),
        safeCell_(optionalText_(data.budget, 80)),
        safeCell_(message),
        'New'
      ]);
    } finally {
      lock.releaseLock();
    }

    return jsonResponse_({ ok: true, enquiryId: enquiryId });
  } catch (error) {
    console.error('Enquiry submission failed: ' + error);
    return jsonResponse_({
      ok: false,
      error: error instanceof SyntaxError
        ? 'The enquiry details could not be read. Please review the form and try again.'
        : error.message || 'The enquiry could not be saved. Please try again.'
    });
  }
}

function requiredText_(value, errorMessage, maxLength) {
  const text = String(value || '').trim();
  if (!text) throw new Error(errorMessage);
  if (text.length > maxLength) throw new Error('One of the enquiry fields is too long.');
  return text;
}

function optionalText_(value, maxLength) {
  const text = String(value || '').trim();
  if (text.length > maxLength) throw new Error('One of the enquiry fields is too long.');
  return text;
}

function safeCell_(value) {
  const text = String(value || '');
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function nextEnquiryId_(sheet) {
  const lastRow = sheet.getLastRow();
  let highest = 0;
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues().forEach(row => {
      const match = row[0].match(/^MAE-(\d+)$/);
      if (match) highest = Math.max(highest, Number(match[1]));
    });
  }
  return 'MAE-' + String(highest + 1).padStart(5, '0');
}

function jsonResponse_(value) {
  return ContentService.createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
