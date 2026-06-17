/**
 * Tally.ly — Google Sheets mirror.
 *
 * Setup (one time):
 *  1. Create a blank Google Sheet.
 *  2. Extensions → Apps Script. Delete any code, paste THIS file.
 *  3. Deploy → New deployment → type "Web app".
 *       - Execute as: Me
 *       - Who has access: Anyone
 *  4. Copy the Web app URL and put it in the app's VITE_SHEETS_WEBHOOK_URL.
 *
 * The app POSTs { action: 'upsert' | 'delete', entry: {...} }.
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
  var ids = sheet.getRange(2, 1, Math.max(sheet.getLastRow() - 1, 0), 1).getValues()
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
