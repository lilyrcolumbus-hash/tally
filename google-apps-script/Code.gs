/**
 * Tally — Google Sheets mirror (modern, one tab per category).
 *
 * Each entry goes to a tab named after its category (Mushrooms, Home, ...).
 * Columns: product first, then subcategory/product-line, quantity, unit, price,
 * total. The id is kept (needed to update/delete) but hidden.
 *
 * The app POSTs { action: 'upsert' | 'delete', entry: {...}, token?: '...' }.
 */

var HEADERS = ['id', 'product', 'subcategory', 'quantity', 'unit', 'unitPrice', 'total', 'currency', 'type', 'date', 'note', 'source']

var CATEGORY_LABELS = {
  mushrooms: 'Mushrooms',
  home: 'Home',
  digital: 'Digital Projects',
  lyhoff: 'LYHOFF',
  other: 'Other',
}

function doPost(e) {
  var lock = LockService.getScriptLock()
  lock.waitLock(30000)
  try {
    var body = JSON.parse(e.postData.contents)
    var expected = PropertiesService.getScriptProperties().getProperty('TALLY_TOKEN')
    if (expected && body.token !== expected) return jsonOut({ ok: false, error: 'unauthorized' })

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
  sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setFontColor('#fbbf24').setBackground('#0f172a').setVerticalAlignment('middle')
  sheet.setFrozenRows(1)
  sheet.setRowHeight(1, 32)
  sheet.hideColumns(1) // id
  sheet.getRange('F2:G').setNumberFormat('#,##0.00') // unitPrice + total
  sheet.getRange('J2:J').setNumberFormat('MMM d, yyyy  h:mm am/pm') // date
  sheet.setColumnWidth(2, 170) // product
  sheet.setColumnWidth(3, 140) // subcategory
  sheet.setColumnWidth(10, 170) // date
  sheet.setColumnWidth(11, 200) // note
  try {
    sheet.getRange(2, 1, sheet.getMaxRows() - 1, HEADERS.length).applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY, false, false)
  } catch (e) {
    // banding already applied — ignore
  }
}

function entryToRow(en) {
  return [
    en.id,
    en.product || '',
    en.subcategory || '',
    en.quantity == null ? '' : en.quantity,
    en.unit || '',
    en.unitPrice == null ? '' : en.unitPrice,
    en.total == null ? '' : en.total,
    en.currency || '',
    en.type || '',
    en.createdAt ? new Date(en.createdAt) : '',
    en.note || '',
    en.source || '',
  ]
}

function appendEntry(sheet, en) {
  sheet.appendRow(entryToRow(en))
}

function removeFromAllTabs(id) {
  var sheets = SpreadsheetApp.getActiveSpreadsheet().getSheets()
  for (var s = 0; s < sheets.length; s++) {
    var sheet = sheets[s]
    var last = sheet.getLastRow()
    if (last < 2) continue
    if (sheet.getRange(1, 1).getValue() !== 'id') continue
    var ids = sheet.getRange(2, 1, last - 1, 1).getValues()
    for (var i = ids.length - 1; i >= 0; i--) {
      if (String(ids[i][0]) === String(id)) sheet.deleteRow(i + 2)
    }
  }
}

function jsonOut(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON)
}
