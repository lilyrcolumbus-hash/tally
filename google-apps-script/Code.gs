/**
 * Tally — Google Sheets mirror.
 *
 * One tab per category (Mushrooms, Home, Digital Projects, LYHOFF, Other) +
 * a "Summary" tab with live formulas: income / expenses / net per category and
 * global, for This week / This month / All time.
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

var SUMMARY_CATS = [
  ['Mushrooms', '🍄'],
  ['Home', '🏠'],
  ['Digital Projects', '💻'],
  ['LYHOFF', '👜'],
  ['Other', '🔵'],
]

function doPost(e) {
  var lock = LockService.getScriptLock()
  lock.waitLock(30000)
  try {
    var body = JSON.parse(e.postData.contents)
    var ex = PropertiesService.getScriptProperties().getProperty('TALLY_TOKEN')
    if (ex && body.token !== ex) return jsonOut({ ok: false, error: 'unauthorized' })

    removeFromAllTabs(body.entry.id)
    if (body.action !== 'delete') {
      appendEntry(sheetForCategory(body.entry.category), body.entry)
    }
    ensureSummary()
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
  sheet.hideColumns(1)
  sheet.getRange('F2:G').setNumberFormat('#,##0.00')
  sheet.getRange('J2:J').setNumberFormat('MMM d, yyyy  h:mm am/pm')
  sheet.setColumnWidth(2, 170)
  sheet.setColumnWidth(3, 140)
  sheet.setColumnWidth(10, 170)
  sheet.setColumnWidth(11, 200)
  try {
    sheet.getRange(2, 1, sheet.getMaxRows() - 1, HEADERS.length).applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY, false, false)
  } catch (e) {}
}

function entryToRow(en) {
  return [
    en.id, en.product || '', en.subcategory || '', en.quantity == null ? '' : en.quantity, en.unit || '',
    en.unitPrice == null ? '' : en.unitPrice, en.total == null ? '' : en.total, en.currency || '', en.type || '',
    en.createdAt ? new Date(en.createdAt) : '', en.note || '', en.source || '',
  ]
}

function appendEntry(sheet, en) {
  sheet.appendRow(entryToRow(en))
}

function removeFromAllTabs(id) {
  var sheets = SpreadsheetApp.getActiveSpreadsheet().getSheets()
  for (var s = 0; s < sheets.length; s++) {
    var sheet = sheets[s]
    if (sheet.getName() === 'Summary') continue
    var last = sheet.getLastRow()
    if (last < 2) continue
    if (sheet.getRange(1, 1).getValue() !== 'id') continue
    var ids = sheet.getRange(2, 1, last - 1, 1).getValues()
    for (var i = ids.length - 1; i >= 0; i--) {
      if (String(ids[i][0]) === String(id)) sheet.deleteRow(i + 2)
    }
  }
}

// ---- Summary tab (built once; formulas auto-recalc) ----
function ensureSummary() {
  var ss = SpreadsheetApp.getActiveSpreadsheet()
  if (ss.getSheetByName('Summary')) return
  buildSummary()
}

function buildSummary() {
  var ss = SpreadsheetApp.getActiveSpreadsheet()
  var sh = ss.getSheetByName('Summary') || ss.insertSheet('Summary', 0)
  sh.clear()
  sh.getRange('A1').setValue('卌 Tally — Summary').setFontWeight('bold').setFontSize(14)
  sh.getRange('B2:D2').merge().setValue('This week').setHorizontalAlignment('center')
  sh.getRange('E2:G2').merge().setValue('This month').setHorizontalAlignment('center')
  sh.getRange('H2:J2').merge().setValue('All time').setHorizontalAlignment('center')
  var sub = [['Income', 'Expenses', 'Net']]
  sh.getRange('A3').setValue('Category')
  sh.getRange(3, 2, 1, 3).setValues(sub)
  sh.getRange(3, 5, 1, 3).setValues(sub)
  sh.getRange(3, 8, 1, 3).setValues(sub)
  sh.getRange('A2:J3').setFontWeight('bold').setBackground('#0f172a').setFontColor('#fbbf24')
  sh.setFrozenRows(3)

  var wk = '(TODAY()-WEEKDAY(TODAY(),3))'
  var mo = '(EOMONTH(TODAY(),-1)+1)'
  for (var i = 0; i < SUMMARY_CATS.length; i++) {
    var row = 4 + i
    var t = "'" + SUMMARY_CATS[i][0] + "'"
    sh.getRange(row, 1).setValue(SUMMARY_CATS[i][1] + ' ' + SUMMARY_CATS[i][0])
    sh.getRange(row, 2).setFormula('=IFERROR(SUMIFS(' + t + '!G:G,' + t + '!I:I,"income",' + t + '!J:J,">="&' + wk + '),0)')
    sh.getRange(row, 3).setFormula('=IFERROR(SUMIFS(' + t + '!G:G,' + t + '!I:I,"expense",' + t + '!J:J,">="&' + wk + '),0)')
    sh.getRange(row, 4).setFormula('=B' + row + '-C' + row)
    sh.getRange(row, 5).setFormula('=IFERROR(SUMIFS(' + t + '!G:G,' + t + '!I:I,"income",' + t + '!J:J,">="&' + mo + '),0)')
    sh.getRange(row, 6).setFormula('=IFERROR(SUMIFS(' + t + '!G:G,' + t + '!I:I,"expense",' + t + '!J:J,">="&' + mo + '),0)')
    sh.getRange(row, 7).setFormula('=E' + row + '-F' + row)
    sh.getRange(row, 8).setFormula('=IFERROR(SUMIFS(' + t + '!G:G,' + t + '!I:I,"income"),0)')
    sh.getRange(row, 9).setFormula('=IFERROR(SUMIFS(' + t + '!G:G,' + t + '!I:I,"expense"),0)')
    sh.getRange(row, 10).setFormula('=H' + row + '-I' + row)
  }
  var tot = 4 + SUMMARY_CATS.length
  sh.getRange(tot, 1).setValue('TOTAL')
  for (var col = 2; col <= 10; col++) {
    var L = colLetter(col)
    sh.getRange(tot, col).setFormula('=SUM(' + L + '4:' + L + (tot - 1) + ')')
  }
  sh.getRange(tot, 1, 1, 10).setFontWeight('bold').setBackground('#1e293b')
  sh.getRange(4, 2, SUMMARY_CATS.length + 1, 9).setNumberFormat('#,##0.00')
  sh.setColumnWidth(1, 150)
  for (var c = 2; c <= 10; c++) sh.setColumnWidth(c, 95)
}

function colLetter(n) {
  return String.fromCharCode(64 + n)
}

function jsonOut(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON)
}
