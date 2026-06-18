/**
 * Tally — Google Sheets mirror.
 *
 * One tab per category (Mushrooms, Home, Digital Projects, LYHOFF, Other) +
 * a "Summary" tab with live SUMPRODUCT formulas (income/expenses/net per
 * category and global × This week / This month / All time).
 * The "total" cell is colored by type: income green, expense red, inventory blue.
 *
 * Columns: id(A) product(B) subcategory(C) quantity(D) unit(E) unitPrice(F)
 *          total(G) currency(H) type(I) date(J) note(K)   — no "source" column.
 */

var HEADERS = ['id', 'product', 'subcategory', 'quantity', 'unit', 'unitPrice', 'total', 'currency', 'type', 'date', 'note']

var CATEGORY_LABELS = { mushrooms: 'Mushrooms', home: 'Home', digital: 'Digital Projects', lyhoff: 'LYHOFF', other: 'Other' }
var SUMMARY_CATS = [['Mushrooms', '🍄'], ['Home', '🏠'], ['Digital Projects', '💻'], ['LYHOFF', '👜'], ['Other', '🔵']]
var TYPE_COLOR = { income: '#34A853', expense: '#EA4335', inventory: '#4285F4' }

function doPost(e) {
  var lock = LockService.getScriptLock()
  lock.waitLock(30000)
  try {
    var b = JSON.parse(e.postData.contents)
    var ex = PropertiesService.getScriptProperties().getProperty('TALLY_TOKEN')
    if (ex && b.token !== ex) return jsonOut({ ok: false, error: 'unauthorized' })
    removeFromAllTabs(b.entry.id)
    if (b.action !== 'delete') appendEntry(sheetForCategory(b.entry.category), b.entry)
    ensureSummary()
    return jsonOut({ ok: true })
  } catch (err) {
    return jsonOut({ ok: false, error: String(err) })
  } finally {
    lock.releaseLock()
  }
}

function tabName(c) {
  if (CATEGORY_LABELS[c]) return CATEGORY_LABELS[c]
  if (!c) return 'Other'
  return c.charAt(0).toUpperCase() + c.slice(1)
}

function sheetForCategory(c) {
  var ss = SpreadsheetApp.getActiveSpreadsheet()
  var n = tabName(c)
  var sh = ss.getSheetByName(n)
  if (!sh) sh = ss.insertSheet(n)
  if (sh.getLastRow() === 0) initSheet(sh)
  return sh
}

function initSheet(sh) {
  sh.appendRow(HEADERS)
  sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setFontColor('#fbbf24').setBackground('#0f172a')
  sh.setFrozenRows(1)
  sh.setRowHeight(1, 32)
  sh.hideColumns(1)
  sh.getRange('F2:G').setNumberFormat('#,##0.00')
  sh.getRange('J2:J').setNumberFormat('MMM d, yyyy  h:mm am/pm')
  sh.setColumnWidth(2, 170)
  sh.setColumnWidth(3, 140)
  sh.setColumnWidth(10, 170)
  sh.setColumnWidth(11, 200)
  try {
    sh.getRange(2, 1, sh.getMaxRows() - 1, HEADERS.length).applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY, false, false)
  } catch (e) {}
}

function entryToRow(en) {
  return [
    en.id, en.product || '', en.subcategory || '', en.quantity == null ? '' : en.quantity, en.unit || '',
    en.unitPrice == null ? '' : en.unitPrice, en.total == null ? '' : en.total, en.currency || '', en.type || '',
    en.createdAt ? new Date(en.createdAt) : '', en.note || '',
  ]
}

function appendEntry(sh, en) {
  sh.appendRow(entryToRow(en))
  var r = sh.getLastRow()
  var color = TYPE_COLOR[en.type] || '#cbd5e1'
  sh.getRange(r, 7).setFontColor(color).setFontWeight('bold') // total cell
}

function removeFromAllTabs(id) {
  var sheets = SpreadsheetApp.getActiveSpreadsheet().getSheets()
  for (var s = 0; s < sheets.length; s++) {
    var sh = sheets[s]
    if (sh.getName() === 'Summary') continue
    var last = sh.getLastRow()
    if (last < 2) continue
    if (sh.getRange(1, 1).getValue() !== 'id') continue
    var ids = sh.getRange(2, 1, last - 1, 1).getValues()
    for (var i = ids.length - 1; i >= 0; i--) {
      if (String(ids[i][0]) === String(id)) sh.deleteRow(i + 2)
    }
  }
}

// ---- Summary ----
function ensureSummary() {
  if (!SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Summary')) buildSummary()
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

  // total=G, type=I, date=J — ranges start at row 2 to skip the header
  for (var i = 0; i < SUMMARY_CATS.length; i++) {
    var r = 4 + i
    var t = "'" + SUMMARY_CATS[i][0] + "'"
    var G = t + '!G2:G', I = t + '!I2:I', J = t + '!J2:J'
    var wk = '(' + J + '>=TODAY()-7)'
    var moC = '(MONTH(' + J + ')=MONTH(TODAY()))*(YEAR(' + J + ')=YEAR(TODAY()))'
    sh.getRange(r, 1).setValue(SUMMARY_CATS[i][1] + ' ' + SUMMARY_CATS[i][0])
    sh.getRange(r, 2).setFormula('=IFERROR(SUMPRODUCT((' + I + '="income")*' + wk + '*' + G + '),0)')
    sh.getRange(r, 3).setFormula('=IFERROR(SUMPRODUCT((' + I + '="expense")*' + wk + '*' + G + '),0)')
    sh.getRange(r, 4).setFormula('=B' + r + '-C' + r)
    sh.getRange(r, 5).setFormula('=IFERROR(SUMPRODUCT((' + I + '="income")*' + moC + '*' + G + '),0)')
    sh.getRange(r, 6).setFormula('=IFERROR(SUMPRODUCT((' + I + '="expense")*' + moC + '*' + G + '),0)')
    sh.getRange(r, 7).setFormula('=E' + r + '-F' + r)
    sh.getRange(r, 8).setFormula('=IFERROR(SUMPRODUCT((' + I + '="income")*' + G + '),0)')
    sh.getRange(r, 9).setFormula('=IFERROR(SUMPRODUCT((' + I + '="expense")*' + G + '),0)')
    sh.getRange(r, 10).setFormula('=H' + r + '-I' + r)
  }
  var tot = 4 + SUMMARY_CATS.length
  sh.getRange(tot, 1).setValue('TOTAL')
  for (var col = 2; col <= 10; col++) {
    var L = String.fromCharCode(64 + col)
    sh.getRange(tot, col).setFormula('=SUM(' + L + '4:' + L + (tot - 1) + ')')
  }
  sh.getRange(tot, 1, 1, 10).setFontWeight('bold').setBackground('#1e293b')
  sh.getRange(4, 2, SUMMARY_CATS.length + 1, 9).setNumberFormat('#,##0.00')
  sh.setColumnWidth(1, 150)
  for (var c = 2; c <= 10; c++) sh.setColumnWidth(c, 95)
}

function jsonOut(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON)
}
