/**
 * Tally — Google Sheets mirror.
 *
 * Setup (one time):
 *  1. Create a blank Google Sheet.
 *  2. Extensions → Apps Script. Delete any code, paste THIS file.
 *  3. Deploy → New deployment → type "Web app".
 *       - Execute as: Me
 *       - Who has access: Anyone
 *  4. Copy the Web app URL and put it in the app's VITE_SHEETS_WEBHOOK_URL.
 *  5. (Recommended) Lock it down: Project Settings → Script Properties →
 *       add a property TALLY_TOKEN = some-long-random-string, and set the SAME
 *       value in the app's VITE_SHEETS_TOKEN. Requests without it are rejected,
 *       so the public URL can't be used to write/delete your rows.
 *
 * The app POSTs { action: 'upsert' | 'delete', entry: {...}, token: '...' }.
 * Rows are keyed by entry id, so edits/deletes stay in sync.
 */

var SHEET_NAME = 'Tally'
var HEADERS = [
  'id', 'date', 'type', 'product', 'category',
  'quantity', 'unitPrice', 'total', 'currency', 'note', 'source',
]

function doPost(e) {
  var lock = LockService.getScriptLock()
  lock.waitLock(30000)
  try {
    var body = JSON.parse(e.postData.contents)
    var expected = PropertiesService.getScriptProperties().getProperty('TALLY_TOKEN')
    if (expected && body.token !== expected) {
      return jsonOut({ ok: false, error: 'unauthorized' })
    }
    var sheet = getSheet()
    if (body.action === 'delete') {
      deleteRowById(sheet, body.entry.id)
    } else {
      upsertRow(sheet, body.entry)
    }
    return jsonOut({ ok: true })
  } catch (err) {
    return jsonOut({ ok: false, error: String(err) })
  } finally {
    lock.releaseLock()
  }
}

function getSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet()
  var sheet = ss.getSheetByName(SHEET_NAME)
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME)
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS)
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold')
    sheet.setFrozenRows(1)
  }
  return sheet
}

function entryToRow(entry) {
  return [
    entry.id,
    entry.createdAt || '',
    entry.type || '',
    entry.product || '',
    entry.category || '',
    entry.quantity === null || entry.quantity === undefined ? '' : entry.quantity,
    entry.unitPrice === null || entry.unitPrice === undefined ? '' : entry.unitPrice,
    entry.total === null || entry.total === undefined ? '' : entry.total,
    entry.currency || '',
    entry.note || '',
    entry.source || '',
  ]
}

function findRowById(sheet, id) {
  var lastRow = sheet.getLastRow()
  if (lastRow < 2) return -1 // only the header (or empty) — no data rows to scan
  var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues()
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) return i + 2 // 1-based + header
  }
  return -1
}

function upsertRow(sheet, entry) {
  var row = findRowById(sheet, entry.id)
  var values = entryToRow(entry)
  if (row === -1) {
    sheet.appendRow(values)
  } else {
    sheet.getRange(row, 1, 1, values.length).setValues([values])
  }
}

function deleteRowById(sheet, id) {
  var row = findRowById(sheet, id)
  if (row !== -1) sheet.deleteRow(row)
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  )
}
