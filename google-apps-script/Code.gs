/**
 * Tally — Google Sheets mirror (modern, one tab per category).
 *
 * Each entry goes to a tab named after its category (Food, Supplies, ...).
 * Columns are ordered with the useful stuff first (product, quantity, unit,
 * price, total). The id is kept (needed to update/delete) but hidden.
 *
 * The app POSTs { action: 'upsert' | 'delete', entry: {...}, token?: '...' }.
 */

var HEADERS = ['id', 'product', 'quantity', 'unit', 'unitPrice', 'total', 'currency', 'type', 'date', 'note', 'source']

var CATEGORY_LABELS = {
  food: 'Food',
  supplies: 'Supplies',
  home: 'Home',
  health: 'Health & Beauty',
  products: 'Products',
  tools: 'Tools',
  transport: 'Transport',
  services: 'Services & Bills',
  other: 'Other',
}

function doPost(e) {
  var lock = LockService.getScriptLock()
  lock.waitLock(30000)
  try {
    var body = JSON.parse(e.postData.contents)
    var expected = PropertiesService.getScriptProperties().getProperty('TALLY_TOKEN')
    if (expected && body.token !== expected) return jsonOut({ ok: false, error: 'unauthorized' })

    // Remove any existing copy first (handles edits + category changes), then re-add.
    removeFromAllTabs(body.entry.id)
    if (body.action !== 'delete') {
      appendEntry(sheetForCategory(body.entry.category), body.entry)
    }
    return jsonOut({ ok: true })
  } catch (err) {
    return jsonOut({ ok: false, error: String(err) })
  } finally {
    lock.releaseLock()
  }
}

function tabName(category) {
  if (CATEGORY_LABELS[category]) return CATEGORY_LABELS[category]
  if (!category) return 'Other'
  return category.charAt(0).toUpperCase() + category.slice(1)
}

function sheetForCategory(category) {
  var ss = SpreadsheetApp.getActiveSpreadsheet()
  var name = tabName(category)
  var sheet = ss.getSheetByName(name)
  if (!sheet) sheet = ss.insertSheet(name)
  if (sheet.getLastRow() === 0) initSheet(sheet)
  return sheet
}

function initSheet(sheet) {
  sheet.appendRow(HEADERS)
  var header = sheet.getRange(1, 1, 1, HEADERS.length)
  header.setFontWeight('bold').setFontColor('#fbbf24').setBackground('#0f172a').setVerticalAlignment('middle')
  sheet.setFrozenRows(1)
  sheet.setRowHeight(1, 32)
  sheet.hideColumns(1) // hide the id column
  sheet.getRange('E2:F').setNumberFormat('#,##0.00') // unitPrice + total
  sheet.getRange('I2:I').setNumberFormat('MMM d, yyyy  h:mm am/pm') // date
  sheet.setColumnWidth(2, 180) // product
  sheet.setColumnWidth(9, 170) // date
  sheet.setColumnWidth(10, 200) // note
  try {
    sheet
      .getRange(2, 1, sheet.getMaxRows() - 1, HEADERS.length)
      .applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY, false, false)
  } catch (e) {
    // banding already applied — ignore
  }
}

function entryToRow(entry) {
  return [
    entry.id,
    entry.product || '',
    entry.quantity == null ? '' : entry.quantity,
    entry.unit || '',
    entry.unitPrice == null ? '' : entry.unitPrice,
    entry.total == null ? '' : entry.total,
    entry.currency || '',
    entry.type || '',
    entry.createdAt ? new Date(entry.createdAt) : '',
    entry.note || '',
    entry.source || '',
  ]
}

function appendEntry(sheet, entry) {
  sheet.appendRow(entryToRow(entry))
}

function removeFromAllTabs(id) {
  var sheets = SpreadsheetApp.getActiveSpreadsheet().getSheets()
  for (var s = 0; s < sheets.length; s++) {
    var sheet = sheets[s]
    var last = sheet.getLastRow()
    if (last < 2) continue
    if (sheet.getRange(1, 1).getValue() !== 'id') continue // only our tabs
    var ids = sheet.getRange(2, 1, last - 1, 1).getValues()
    for (var i = ids.length - 1; i >= 0; i--) {
      if (String(ids[i][0]) === String(id)) sheet.deleteRow(i + 2)
    }
  }
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON)
}
