const SPREADSHEET_PROPERTY = 'AGRI_ENQUIRIES_SPREADSHEET_ID';
const ENQUIRIES_SHEET = 'Enquiries';
const DASHBOARD_SHEET = 'Dashboard';
const OWNER_EMAIL = 'mragriengineer@gmail.com';
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
  'Status',
  'Source',
  'Notes',
  'Updated'
];
const STATUSES = [
  'New',
  'Contacted',
  'Site Visit Planned',
  'Proposal Sent',
  'Follow-up',
  'Confirmed',
  'In Progress',
  'Completed',
  'Not Proceeding'
];
const SOURCES = ['Website', 'Instagram', 'WhatsApp', 'Phone', 'Referral', 'Other'];
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

  prepareEnquiriesSheet_(sheet);
  prepareDashboard_(spreadsheet);

  console.log('Enquiry spreadsheet: ' + spreadsheet.getUrl());
  return spreadsheet.getUrl();
}

function prepareEnquiriesSheet_(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  } else {
    const lastColumn = Math.max(sheet.getLastColumn(), 1);
    const existingHeaders = sheet.getRange(1, 1, 1, lastColumn)
      .getDisplayValues()[0]
      .map(header => String(header).trim());
    const unexpectedHeader = existingHeaders.some((header, index) => header !== HEADERS[index]);
    if (unexpectedHeader || existingHeaders.length > HEADERS.length) {
      throw new Error('The Enquiries sheet has unexpected headers. Existing rows were left unchanged.');
    }
    if (existingHeaders.length < HEADERS.length) {
      sheet.getRange(1, existingHeaders.length + 1, 1, HEADERS.length - existingHeaders.length)
        .setValues([HEADERS.slice(existingHeaders.length)]);
    }
  }

  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
  sheet.getRange('B:B').setNumberFormat('dd/mm/yyyy hh:mm');
  sheet.getRange('N:N').setNumberFormat('dd/mm/yyyy hh:mm');
  sheet.getRange('J:J').setWrap(true);
  sheet.getRange('M:M').setWrap(true);
  sheet.getRange('K2:K5000').setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(STATUSES, true).setAllowInvalid(false).build()
  );
  sheet.getRange('L2:L5000').setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(SOURCES, true).setAllowInvalid(false).build()
  );
  sheet.autoResizeColumns(1, HEADERS.length);
}

function prepareDashboard_(spreadsheet) {
  let dashboard = spreadsheet.getSheetByName(DASHBOARD_SHEET);
  if (!dashboard) dashboard = spreadsheet.insertSheet(DASHBOARD_SHEET);

  dashboard.getRange('A1:H30').clearContent();
  dashboard.getRange('A1').setValue('MR:AGRI ENGINEER — ENQUIRY DASHBOARD')
    .setFontWeight('bold')
    .setFontSize(16);
  dashboard.getRange('A3:B3').setValues([['STATUS', 'COUNT']]).setFontWeight('bold');
  STATUSES.forEach((status, index) => {
    const row = index + 4;
    dashboard.getRange(row, 1).setValue(status);
    dashboard.getRange(row, 2).setFormula(`=COUNTIF(Enquiries!K:K,A${row})`);
  });

  dashboard.getRange('D3:E3').setValues([['SOURCE', 'COUNT']]).setFontWeight('bold');
  SOURCES.forEach((source, index) => {
    const row = index + 4;
    dashboard.getRange(row, 4).setValue(source);
    dashboard.getRange(row, 5).setFormula(`=COUNTIF(Enquiries!L:L,D${row})`);
  });

  dashboard.getRange('G3:H3').setValues([['SERVICE', 'COUNT']]).setFontWeight('bold');
  SERVICES.forEach((service, index) => {
    const row = index + 4;
    dashboard.getRange(row, 7).setValue(service);
    dashboard.getRange(row, 8).setFormula(`=COUNTIF(Enquiries!H:H,G${row})`);
  });

  dashboard.getRange('A15').setValue('RECENT ENQUIRIES').setFontWeight('bold');
  dashboard.getRange('A16:H16')
    .setValues([['ID', 'Date', 'Name', 'Source', 'Service', 'Budget', 'Status', 'Notes']])
    .setFontWeight('bold');
  dashboard.getRange('A17').setFormula(
    '=IFERROR(QUERY(Enquiries!A2:N,"select A,B,C,L,H,I,K,M where A is not null order by B desc limit 15",0),"")'
  );
  dashboard.getRange('B17:B31').setNumberFormat('dd/mm/yyyy hh:mm');
  dashboard.setFrozenRows(3);
  dashboard.autoResizeColumns(1, 8);
}

function onEdit(event) {
  if (!event || !event.range) return;
  const sheet = event.range.getSheet();
  const row = event.range.getRow();
  const column = event.range.getColumn();
  if (sheet.getName() !== ENQUIRIES_SHEET || row < 2 || (column !== 11 && column !== 13)) return;
  sheet.getRange(row, 14).setValue(new Date());
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

    const email = requiredText_(data.email, 'Please enter your email address.', 254);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('Please enter a valid email address.');
    }

    const message = requiredText_(data.message, 'Please tell us about your idea.', 3000);
    const service = optionalText_(data.service, 80);
    if (service && SERVICES.indexOf(service) === -1) throw new Error('Please select a valid service.');
    const source = optionalText_(data.source || 'Website', 30);
    if (SOURCES.indexOf(source) === -1) throw new Error('Please select a valid enquiry source.');
    const location = optionalText_(data.location, 160);
    const landSize = optionalText_(data.landSize, 80);
    const budget = optionalText_(data.budget, 80);

    const spreadsheetId = PropertiesService.getScriptProperties().getProperty(SPREADSHEET_PROPERTY);
    if (!spreadsheetId) throw new Error('The enquiry sheet has not been set up.');
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    const sheet = spreadsheet.getSheetByName(ENQUIRIES_SHEET);
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
        safeCell_(location),
        safeCell_(landSize),
        safeCell_(service),
        safeCell_(budget),
        safeCell_(message),
        'New',
        safeCell_(source),
        '',
        new Date()
      ]);
    } finally {
      lock.releaseLock();
    }

    const warnings = sendEnquiryEmails_({
      enquiryId: enquiryId,
      name: name,
      phone: phone,
      email: email,
      location: location,
      landSize: landSize,
      service: service,
      budget: budget,
      message: message,
      source: source,
      spreadsheetUrl: spreadsheet.getUrl()
    });
    return jsonResponse_({ ok: true, enquiryId: enquiryId, emailWarnings: warnings });
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

function sendEnquiryEmails_(enquiry) {
  const warnings = [];
  const subject = 'New Mr:Agri Engineer enquiry — ' + enquiry.enquiryId + ' — ' + enquiry.name;
  const ownerBody = [
    'NEW MR:AGRI ENGINEER ENQUIRY',
    '',
    'Enquiry ID: ' + enquiry.enquiryId,
    'Name: ' + enquiry.name,
    'Phone: ' + enquiry.phone,
    'Email: ' + (enquiry.email || 'not provided'),
    'Source: ' + enquiry.source,
    'Service: ' + (enquiry.service || 'not specified'),
    'Land location: ' + (enquiry.location || 'not specified'),
    'Land size: ' + (enquiry.landSize || 'not specified'),
    'Budget: ' + (enquiry.budget || 'not specified'),
    '',
    'Message:',
    enquiry.message,
    '',
    'Open the Enquiries sheet: ' + enquiry.spreadsheetUrl
  ].join('\n');
  try {
    MailApp.sendEmail(OWNER_EMAIL, subject, ownerBody);
  } catch (error) {
    console.error('Owner notification failed for ' + enquiry.enquiryId + ': ' + error);
    warnings.push('The enquiry was saved, but the company notification email could not be sent.');
  }

  const customerBody = [
      'Hello ' + enquiry.name + ',',
      '',
      'Thank you for contacting Mr:Agri Engineer. We have received your enquiry (' + enquiry.enquiryId + ').',
      'Our team will review your details and contact you about the next steps.',
      '',
      'Your enquiry:',
      'Service: ' + (enquiry.service || 'Not specified'),
      'Land location: ' + (enquiry.location || 'Not specified'),
      'Land size: ' + (enquiry.landSize || 'Not specified'),
      '',
      'Farming is the future.',
      'Mr:Agri Engineer',
      OWNER_EMAIL
  ].join('\n');
  try {
    MailApp.sendEmail(
      enquiry.email,
      'We received your enquiry — ' + enquiry.enquiryId + ' | Mr:Agri Engineer',
      customerBody
    );
  } catch (error) {
    console.error('Customer acknowledgement failed for ' + enquiry.enquiryId + ': ' + error);
    warnings.push('The enquiry was saved, but the customer acknowledgement email could not be sent.');
  }
  return warnings;
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
