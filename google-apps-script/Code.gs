// ================================================================
// TALLY — Google Sheets Backend  v5
// App format: {action:"upsert"|"delete"|"status", entry:{...}, token:"..."}
// category = proyecto (minúsculas), NO hay campo project
// ================================================================

const SHEET_ID = '12UIZT1Kp_K-kehqxh_7zHXPFnhfuSL2TfJbESewb90o';
const TOKEN    = 'tally2024';
const NUM_COLS = 16; // A..P — see entryToRow for the column map

// Category map from app → project name in Sheet
const CAT_TO_PROJECT = {
  'mushrooms':       'Mushrooms',
  'mushroom':        'Mushrooms',
  'hongos':          'Mushrooms',
  'home':            'Home',
  'hogar':           'Home',
  'jardin':          'Home',
  'jardín':          'Home',
  'garden':          'Home',
  'lyhoff':          'LYHOFF',
  'digital projects':'Digital Projects',
  'digital':         'Digital Projects',
  'proyectos digitales':'Digital Projects',
  'other':           'Other',
  'otro':            'Other',
  'general':         'Other'
};

function categoryToProject(cat) {
  if (!cat) return 'Other';
  var key = cat.toLowerCase().trim();
  return CAT_TO_PROJECT[key] || (cat.charAt(0).toUpperCase() + cat.slice(1));
}

function capitalize(s) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ================================================================
// entryToRow — converts entry from app to Record row
// Columns: A=Date, B=Project, C=Category, D=Subcategory(family/stage),
//   E=Product(component/strain), F=Type(income|expense|inventory),
//   G=Consumption, H=Qty, I=Unit, J=UnitPrice, K=Total, L=Note, M=ID,
//   N=Supplier, O=Batch/Lot, P=(reserved, unused)
// ================================================================
function entryToRow(entry) {
  var tz = Session.getScriptTimeZone();
  var date = entry.createdAt
    ? Utilities.formatDate(new Date(entry.createdAt), tz, 'yyyy-MM-dd')
    : Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');

  var project = entry.project
    ? entry.project
    : categoryToProject(entry.category);

  var type = capitalize(entry.type || 'expense');

  return [
    date,                                          // A: Date
    project,                                       // B: Project
    capitalize(entry.category || ''),              // C: Category
    capitalize(entry.subcategory || ''),           // D: Subcategory (family/stage)
    entry.product || '',                           // E: Product (component/strain)
    type,                                          // F: Type (income/expense/inventory)
    entry.isConsumption ? 'TRUE' : 'FALSE',        // G: Consumption
    entry.quantity != null ? entry.quantity : '',  // H: Qty
    entry.unit || '',                              // I: Unit
    entry.unitPrice != null ? entry.unitPrice : '',// J: Unit Price
    entry.total != null ? entry.total : '',        // K: Total
    entry.note || '',                              // L: Note
    entry.id || '',                                // M: ID
    entry.supplier || '',                          // N: Supplier
    entry.batchId || '',                           // O: Batch / Lot
    ''                                              // P: reserved, unused
  ];
}

// ================================================================
// doPost — receives data from Tally app
// ================================================================
function doPost(e) {
  try {
    var raw = JSON.parse(e.postData.contents);
    var action = raw.action || 'upsert';
    var entry  = raw.entry  || raw;

    // Token check
    var tok = raw.token || entry.token || '';
    if (tok !== TOKEN) {
      return ContentService
        .createTextOutput(JSON.stringify({ok:false, error:'Unauthorized'}))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sh = ss.getSheetByName('Record');

    if (action === 'status') {
      var allData = sh.getDataRange().getValues();
      var rows = allData.slice(1).filter(function(r) { return r[0] !== ''; });
      var last5 = rows.slice(-5).map(function(r) {
        return { date: r[0], project: r[1], product: r[4], type: r[5], variant: r[15], id: r[12] };
      });
      return ContentService
        .createTextOutput(JSON.stringify({ ok: true, totalRows: rows.length, last5: last5 }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var row = entryToRow(entry);

    if (action === 'delete') {
      var data = sh.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        if (data[i][12] === entry.id) {
          sh.deleteRow(i + 1);
          return ContentService
            .createTextOutput(JSON.stringify({ok:true, deleted:i+1}))
            .setMimeType(ContentService.MimeType.JSON);
        }
      }
      return ContentService
        .createTextOutput(JSON.stringify({ok:false, error:'ID not found'}))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'upsert' || action === 'addEntry' || action === 'add') {
      var data = sh.getDataRange().getValues();
      var existingRowIdx = -1;
      for (var i = 1; i < data.length; i++) {
        if (data[i][12] === entry.id) { existingRowIdx = i + 1; break; }
      }

      if (existingRowIdx > 0) {
        sh.getRange(existingRowIdx, 1, 1, row.length).setValues([row]);
        formatSingleRow(sh, existingRowIdx, entry.type, entry.isConsumption);
        return ContentService
          .createTextOutput(JSON.stringify({ok:true, updated:existingRowIdx}))
          .setMimeType(ContentService.MimeType.JSON);
      } else {
        var lastRow = sh.getLastRow();
        var targetRow = Math.max(lastRow + 1, 2);
        sh.getRange(targetRow, 1, 1, row.length).setValues([row]);
        formatSingleRow(sh, targetRow, entry.type, entry.isConsumption);
        return ContentService
          .createTextOutput(JSON.stringify({ok:true, row:targetRow}))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }

    return ContentService
      .createTextOutput(JSON.stringify({ok:false, error:'Unknown action: '+action}))
      .setMimeType(ContentService.MimeType.JSON);

  } catch(err) {
    return ContentService
      .createTextOutput(JSON.stringify({ok:false, error:err.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ================================================================
// formatSingleRow — colorea una fila según tipo
// ================================================================
function formatSingleRow(sh, rowNum, type, isConsumption) {
  var range = sh.getRange(rowNum, 1, 1, NUM_COLS);
  var bg, fg;
  var isCons = isConsumption === true || isConsumption === 'TRUE';
  if (isCons) {
    bg = '#fef3c7'; fg = '#92400e';
  } else {
    var t = (type || '').toLowerCase();
    if (t === 'income')         { bg = '#dcfce7'; fg = '#166534'; }
    else if (t === 'expense')   { bg = '#fee2e2'; fg = '#991b1b'; }
    else if (t === 'inventory') { bg = '#dbeafe'; fg = '#1e40af'; }
    else                        { bg = '#f8fafc'; fg = '#1e293b'; }
  }
  range.setBackground(bg).setFontColor(fg);
  range.setBorder(false,false,true,false,false,false,'#e2e8f0',SpreadsheetApp.BorderStyle.SOLID);
}

// ================================================================
// injectEntries — escribe un array de entries directo
// ================================================================
function injectEntries(entries) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sh = ss.getSheetByName('Record');

  var lastRow = sh.getLastRow();
  if (lastRow > 1) {
    sh.getRange(2, 1, lastRow - 1, NUM_COLS).clearContent().clearFormat();
  }

  if (!entries || entries.length === 0) {
    Logger.log('No hay entries para inyectar');
    return;
  }

  var rows = entries.map(function(e) { return entryToRow(e); });
  sh.getRange(2, 1, rows.length, NUM_COLS).setValues(rows);

  var bgs = [], fgs = [];
  entries.forEach(function(e) {
    var t = (e.type || '').toLowerCase();
    var isCons = e.isConsumption === true;
    var bg, fg;
    if (isCons)               { bg='#fef3c7'; fg='#92400e'; }
    else if (t==='income')    { bg='#dcfce7'; fg='#166534'; }
    else if (t==='expense')   { bg='#fee2e2'; fg='#991b1b'; }
    else if (t==='inventory') { bg='#dbeafe'; fg='#1e40af'; }
    else                      { bg='#f8fafc'; fg='#1e293b'; }
    bgs.push(Array(NUM_COLS).fill(bg));
    fgs.push(Array(NUM_COLS).fill(fg));
  });
  sh.getRange(2, 1, rows.length, NUM_COLS).setBackgrounds(bgs).setFontColors(fgs);
  sh.getRange(2, 10, rows.length, 1).setNumberFormat('$#,##0.00');
  sh.getRange(2, 11, rows.length, 1).setNumberFormat('$#,##0.00');

  SpreadsheetApp.flush();
  Logger.log('OK: ' + rows.length + ' entries inyectados');
}

// ================================================================
// setupRecord — reconstruye cabeceras y panel de filtros
// Data: A..P (16 cols). Gap: Q. Filter panel: R..T (18..20).
// ================================================================
function setupRecord() {
  var ss  = SpreadsheetApp.openById(SHEET_ID);
  var sh  = ss.getSheetByName('Record');

  // Detect whether this sheet is still on the old 13-column layout (N/O/P used
  // to hold the filter panel, not real data) — reading 16 cols on an
  // unmigrated sheet would drag stray filter-panel text into Supplier/Batch/Variant.
  var alreadyMigrated = sh.getRange(1,16).getValue() === 'Variant';
  var oldNumCols = alreadyMigrated ? NUM_COLS : 13;

  var lastRow = sh.getLastRow();
  var existingData = [];
  if (lastRow >= 2) {
    existingData = sh.getRange(2, 1, lastRow - 1, oldNumCols).getValues()
      .filter(function(r){ return r[0] !== ''; })
      .map(function(r) {
        r = r.slice();
        while (r.length < NUM_COLS) r.push('');
        return r;
      });
  }

  sh.clearContents();
  sh.clearFormats();
  sh.clearNotes();

  if (sh.getMaxColumns() < 20) sh.insertColumnsAfter(sh.getMaxColumns(), 20 - sh.getMaxColumns());
  if (sh.getMaxRows() < 500)   sh.insertRowsAfter(sh.getMaxRows(), 500 - sh.getMaxRows());

  // Data header (row 1)
  var headers = ['Date','Project','Category','Subcategory (Family)','Product (Component)','Type','Consumption','Qty','Unit','Unit Price ($)','Total ($)','Note','ID','Supplier','Batch / Lot','Variant'];
  sh.getRange(1,1,1,NUM_COLS).setValues([headers])
    .setBackground('#1e293b').setFontColor('#f8fafc')
    .setFontWeight('bold').setFontSize(10);

  // Panel filtros (cabecera) — shifted to R..T (18..20) to leave room for N/O/P data cols
  sh.getRange(1,18).setValue('🔍 Filter by')
    .setBackground('#334155').setFontColor('#f8fafc').setFontWeight('bold');
  sh.getRange(1,19).setBackground('#334155');

  var labels = [['Project:','',''],['Type:','',''],['Category:','',''],
                ['','',''],['📊 TOTAL $:','',''],['📋 Records:','',''],
                ['💰 Revenue:','',''],['🛒 Expenses:','',''],
                ['📦 Inventory:','',''],['🔥 Consumption:','','']];
  sh.getRange(2,18,10,3).setValues(labels)
    .setBackground('#1e293b').setFontColor('#f8fafc').setFontSize(10);

  sh.getRange(2,19).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['(Todos)','Mushrooms','Home','LYHOFF','Digital Projects','Other'],true).build()
  ).setValue('(Todos)');
  sh.getRange(3,19).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['(Todos)','Inventory','Expense','Income'],true).build()
  ).setValue('(Todos)');
  sh.getRange(4,19).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['(Todos)','Food','Mushrooms','Seeds','Software','Supplies','Other'],true).build()
  ).setValue('(Todos)');
  sh.getRange(2,19,3,1).setBackground('#334155').setFontColor('#ffffff').setFontWeight('bold');

  var formulas = [
    ['=SUMPRODUCT((IF(S2="(Todos)",1,B2:B2000=S2))*(IF(S3="(Todos)",1,F2:F2000=S3))*(IF(S4="(Todos)",1,C2:C2000=S4))*IF(ISNUMBER(K2:K2000),K2:K2000,0))'],
    ['=SUMPRODUCT((IF(S2="(Todos)",1,B2:B2000=S2))*(IF(S3="(Todos)",1,F2:F2000=S3))*(IF(S4="(Todos)",1,C2:C2000=S4))*(A2:A2000<>""))'],
    ['=SUMPRODUCT((IF(S2="(Todos)",1,B2:B2000=S2))*(F2:F2000="Income")*IF(ISNUMBER(K2:K2000),K2:K2000,0))'],
    ['=SUMPRODUCT((IF(S2="(Todos)",1,B2:B2000=S2))*(F2:F2000="Expense")*IF(ISNUMBER(K2:K2000),K2:K2000,0))'],
    ['=SUMPRODUCT((IF(S2="(Todos)",1,B2:B2000=S2))*(F2:F2000="Inventory")*IF(ISNUMBER(K2:K2000),K2:K2000,0))'],
    ['=SUMPRODUCT((IF(S2="(Todos)",1,B2:B2000=S2))*(G2:G2000=TRUE)*IF(ISNUMBER(K2:K2000),K2:K2000,0))'],
  ];
  sh.getRange(6,20,6,1).setValues(formulas);
  sh.getRange(6,20,1,1).setNumberFormat('$#,##0.00');
  sh.getRange(7,20,1,1).setNumberFormat('#,##0');
  sh.getRange(8,20,4,1).setNumberFormat('$#,##0.00');
  sh.getRange(6,20,6,1).setBackground('#0f172a').setFontColor('#4ade80').setFontWeight('bold');

  var dv = SpreadsheetApp.newDataValidation().requireValueInList(['Inventory','Expense','Income'],true).build();
  sh.getRange(2,6,500,1).setDataValidation(dv);
  var dvC = SpreadsheetApp.newDataValidation().requireValueInList(['TRUE','FALSE'],true).build();
  sh.getRange(2,7,500,1).setDataValidation(dvC);
  var dvV = SpreadsheetApp.newDataValidation().requireValueInList([''],true).build();
  sh.getRange(2,16,500,1).setDataValidation(dvV);

  if (existingData.length > 0) {
    sh.getRange(2,1,existingData.length,NUM_COLS).setValues(existingData);
    var bgs=[],fgs=[];
    existingData.forEach(function(r){
      var t=(r[5]||'').toLowerCase(), isCons=r[6]==='TRUE'||r[6]===true;
      var bg,fg;
      if(isCons){bg='#fef3c7';fg='#92400e';}
      else if(t==='income'){bg='#dcfce7';fg='#166534';}
      else if(t==='expense'){bg='#fee2e2';fg='#991b1b';}
      else if(t==='inventory'){bg='#dbeafe';fg='#1e40af';}
      else{bg='#f8fafc';fg='#1e293b';}
      bgs.push(Array(NUM_COLS).fill(bg));
      fgs.push(Array(NUM_COLS).fill(fg));
    });
    sh.getRange(2,1,existingData.length,NUM_COLS).setBackgrounds(bgs).setFontColors(fgs);
    sh.getRange(2,10,existingData.length,1).setNumberFormat('$#,##0.00');
    sh.getRange(2,11,existingData.length,1).setNumberFormat('$#,##0.00');
  }

  sh.setFrozenRows(1);
  sh.setRowHeight(1,30);
  var widths=[90,110,100,140,160,90,100,50,60,110,90,160,80,120,100,90,20,130,150,110];
  widths.forEach(function(w,i){sh.setColumnWidth(i+1,w);});

  try { var f=sh.getFilter(); if(f) f.remove(); } catch(er){}
  sh.getRange(1,1,1,NUM_COLS).createFilter();

  Logger.log('setupRecord OK: ' + existingData.length + ' rows');
}

// ================================================================
// setupProjectSheet — hoja de proyecto individual
// ================================================================
function setupProjectSheet(sh, projectName) {
  sh.clearContents();
  sh.clearFormats();
  sh.clearNotes();

  if (sh.getMaxColumns() < 15) sh.insertColumnsAfter(sh.getMaxColumns(), 15-sh.getMaxColumns());
  if (sh.getMaxRows() < 500)   sh.insertRowsAfter(sh.getMaxRows(), 500-sh.getMaxRows());

  sh.getRange(1,1,1,15).merge()
    .setValue('📊 ' + projectName.toUpperCase() + ' — TALLY CONTROL')
    .setBackground('#1e293b').setFontColor('#f8fafc')
    .setFontSize(14).setFontWeight('bold').setHorizontalAlignment('center');
  sh.setRowHeight(1,36);

  sh.getRange(2,1).setValue('💰 Inventory:').setBackground('#0f172a').setFontColor('#60a5fa').setFontWeight('bold');
  sh.getRange(2,2).setFormula('=SUMPRODUCT((Record!B2:B2000="'+projectName+'")*(Record!F2:F2000="Inventory")*IF(ISNUMBER(Record!K2:K2000),Record!K2:K2000,0))')
    .setBackground('#0f172a').setFontColor('#60a5fa').setFontWeight('bold').setNumberFormat('$#,##0.00');

  sh.getRange(2,3).setValue('🛒 Expenses:').setBackground('#0f172a').setFontColor('#f87171').setFontWeight('bold');
  sh.getRange(2,4).setFormula('=SUMPRODUCT((Record!B2:B2000="'+projectName+'")*(Record!F2:F2000="Expense")*IF(ISNUMBER(Record!K2:K2000),Record!K2:K2000,0))')
    .setBackground('#0f172a').setFontColor('#f87171').setFontWeight('bold').setNumberFormat('$#,##0.00');

  sh.getRange(2,5).setValue('💵 Revenue:').setBackground('#0f172a').setFontColor('#4ade80').setFontWeight('bold');
  sh.getRange(2,6).setFormula('=SUMPRODUCT((Record!B2:B2000="'+projectName+'")*(Record!F2:F2000="Income")*IF(ISNUMBER(Record!K2:K2000),Record!K2:K2000,0))')
    .setBackground('#0f172a').setFontColor('#4ade80').setFontWeight('bold').setNumberFormat('$#,##0.00');

  sh.getRange(2,7).setValue('🔥 Consumption:').setBackground('#0f172a').setFontColor('#fbbf24').setFontWeight('bold');
  sh.getRange(2,8).setFormula('=SUMPRODUCT((Record!B2:B2000="'+projectName+'")*(Record!G2:G2000=TRUE)*IF(ISNUMBER(Record!K2:K2000),Record!K2:K2000,0))')
    .setBackground('#0f172a').setFontColor('#fbbf24').setFontWeight('bold').setNumberFormat('$#,##0.00');

  sh.getRange(2,9).setValue('📈 Balance:').setBackground('#0f172a').setFontColor('#e2e8f0').setFontWeight('bold');
  sh.getRange(2,10).setFormula('=F2-D2')
    .setBackground('#0f172a').setFontColor('#facc15').setFontWeight('bold').setNumberFormat('$#,##0.00');

  sh.getRange(2,1,1,15).setBackground('#0f172a');
  sh.setRowHeight(2,28);

  sh.getRange(3,1,1,15).setBackground('#334155');
  sh.getRange(3,1).setValue('  📋 RECORD (auto from Record)').setFontColor('#e2e8f0').setFontWeight('bold');
  sh.setRowHeight(3,24);

  sh.getRange(4,1,1,15).setValues([['Date','Project','Category','Subcategory (Family)','Product (Component)','Type','Consumption','Qty','Unit','Unit Price ($)','Total ($)','Note','Supplier','Batch / Lot','Variant']])
    .setBackground('#334155').setFontColor('#e2e8f0').setFontWeight('bold').setFontSize(9);
  sh.setFrozenRows(4);

  sh.getRange(5,1).setFormula(
    '=IFERROR(QUERY(Record!A2:P2000,"SELECT A,B,C,D,E,F,G,H,I,J,K,L,N,O,P WHERE B=\'' + projectName + '\' ORDER BY A DESC format A \'yyyy-MM-dd\'",0),"No data yet")'
  );
  sh.getRange(5,1,500,1).setNumberFormat('yyyy-mm-dd');
  sh.getRange(5,7,500,1).setNumberFormat('@');

  var w=[90,90,100,140,160,90,90,50,60,110,90,150,110,100,90];
  w.forEach(function(wd,i){sh.setColumnWidth(i+1,wd);});
}

// ================================================================
// setupDashboard
// ================================================================
function setupDashboard() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sh = ss.getSheetByName('Dashboard');
  if (!sh) return;

  sh.clearContents(); sh.clearFormats();
  if (sh.getMaxColumns()<9) sh.insertColumnsAfter(sh.getMaxColumns(),9-sh.getMaxColumns());
  if (sh.getMaxRows()<30)   sh.insertRowsAfter(sh.getMaxRows(),30-sh.getMaxRows());

  sh.getRange(1,1,1,9).merge()
    .setValue('🏠 TALLY — DASHBOARD GLOBAL')
    .setBackground('#1e293b').setFontColor('#f8fafc')
    .setFontSize(16).setFontWeight('bold').setHorizontalAlignment('center');
  sh.setRowHeight(1,40);

  sh.getRange(2,1,1,9).merge()
    .setValue('Actualizado automáticamente desde Record')
    .setBackground('#334155').setFontColor('#94a3b8').setFontSize(10).setHorizontalAlignment('center');
  sh.setRowHeight(2,22);

  var heads=[['Project','Inventory ($)','Expenses ($)','Revenue ($)','Consumption ($)','Net Balance ($)','# Entries','Last Activity','']];
  sh.getRange(4,1,1,9).setValues(heads)
    .setBackground('#334155').setFontColor('#e2e8f0').setFontWeight('bold').setFontSize(10);
  sh.setRowHeight(4,26);
  sh.setFrozenRows(4);

  var projects=[
    ['🍄 Mushrooms','Mushrooms','#d1fae5'],
    ['🏠 Home','Home','#ede9fe'],
    ['👜 LYHOFF','LYHOFF','#fef9c3'],
    ['💻 Digital Projects','Digital Projects','#dbeafe'],
    ['🔵 Other','Other','#f1f5f9'],
  ];

  projects.forEach(function(p,i){
    var row=5+i, proj=p[1], bg=p[2];
    sh.getRange(row,1).setValue(p[0]).setFontWeight('bold');
    sh.getRange(row,2).setFormula('=SUMPRODUCT((Record!B2:B2000="'+proj+'")*(Record!F2:F2000="Inventory")*IF(ISNUMBER(Record!K2:K2000),Record!K2:K2000,0))').setNumberFormat('$#,##0.00');
    sh.getRange(row,3).setFormula('=SUMPRODUCT((Record!B2:B2000="'+proj+'")*(Record!F2:F2000="Expense")*IF(ISNUMBER(Record!K2:K2000),Record!K2:K2000,0))').setNumberFormat('$#,##0.00');
    sh.getRange(row,4).setFormula('=SUMPRODUCT((Record!B2:B2000="'+proj+'")*(Record!F2:F2000="Income")*IF(ISNUMBER(Record!K2:K2000),Record!K2:K2000,0))').setNumberFormat('$#,##0.00');
    sh.getRange(row,5).setFormula('=SUMPRODUCT((Record!B2:B2000="'+proj+'")*(Record!G2:G2000=TRUE)*IF(ISNUMBER(Record!K2:K2000),Record!K2:K2000,0))').setNumberFormat('$#,##0.00');
    sh.getRange(row,6).setFormula('=D'+row+'-C'+row).setNumberFormat('$#,##0.00').setFontWeight('bold');
    sh.getRange(row,7).setFormula('=SUMPRODUCT((Record!B2:B2000="'+proj+'")*(Record!A2:A2000<>""))');
    sh.getRange(row,8).setFormula('=IFERROR(TEXT(MAXIFS(Record!A2:A2000,Record!B2:B2000,"'+proj+'"),"yyyy-MM-dd"),"—")');
    sh.getRange(row,1,1,8).setBackground(bg).setFontColor('#1e293b').setFontSize(10);
    sh.setRowHeight(row,28);
  });

  var tr=10;
  sh.getRange(tr,1).setValue('📊 TOTAL').setFontWeight('bold');
  sh.getRange(tr,2).setFormula('=SUM(B5:B9)').setNumberFormat('$#,##0.00').setFontWeight('bold');
  sh.getRange(tr,3).setFormula('=SUM(C5:C9)').setNumberFormat('$#,##0.00').setFontWeight('bold');
  sh.getRange(tr,4).setFormula('=SUM(D5:D9)').setNumberFormat('$#,##0.00').setFontWeight('bold');
  sh.getRange(tr,5).setFormula('=SUM(E5:E9)').setNumberFormat('$#,##0.00').setFontWeight('bold');
  sh.getRange(tr,6).setFormula('=SUM(F5:F9)').setNumberFormat('$#,##0.00').setFontWeight('bold');
  sh.getRange(tr,7).setFormula('=SUM(G5:G9)').setFontWeight('bold');
  sh.getRange(tr,1,1,8).setBackground('#1e293b').setFontColor('#f8fafc');
  sh.setRowHeight(tr,30);

  var w=[160,120,100,100,100,130,90,120,30];
  w.forEach(function(wd,i){sh.setColumnWidth(i+1,wd);});
  Logger.log('setupDashboard OK');
}

// ================================================================
// setupInventory — inventario neto por familia + componente + tipo
// D=Subcategory(family/stage), E=Product(component/strain), P=Variant,
// B=Project, C=Category
// ================================================================
function setupInventory() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sh = ss.getSheetByName('Inventory');
  if (!sh) return;
  sh.clearContents(); sh.clearFormats();
  if (sh.getMaxColumns()<11) sh.insertColumnsAfter(sh.getMaxColumns(),11-sh.getMaxColumns());

  sh.getRange(1,1,1,11).merge()
    .setValue('📦 NET INVENTORY — TALLY')
    .setBackground('#1e293b').setFontColor('#f8fafc')
    .setFontSize(14).setFontWeight('bold').setHorizontalAlignment('center');
  sh.setRowHeight(1,36);

  sh.getRange(2,1,1,7).setValues([['Family / Stage','Component','Type','Project','Category','Total Inv. ($)','# Entries']])
    .setBackground('#334155').setFontColor('#e2e8f0').setFontWeight('bold').setFontSize(10);
  sh.setRowHeight(2,26);
  sh.setFrozenRows(2);

  // D=Subcategory(family/stage), E=Product(component/strain), P=Variant, B=Project, C=Category, K=Total
  var q = "SELECT IFERROR(D,E), E, P, B, C, SUM(K), COUNT(A) WHERE F = 'Inventory' AND E <> '' GROUP BY IFERROR(D,E), E, P, B, C ORDER BY IFERROR(D,E), B, SUM(K) DESC LABEL IFERROR(D,E) 'Family', SUM(K) 'Total ($)', COUNT(A) '# Entries'";
  sh.getRange(3,1).setFormula('=IFERROR(QUERY(Record!A2:P2000,"'+q+'",0),"No data")');

  var w=[150,150,80,110,100,110,80];
  w.forEach(function(wd,i){sh.setColumnWidth(i+1,wd);});
  Logger.log('setupInventory OK');
}

// ================================================================
// setupAllSheets — punto de entrada principal
// ================================================================
function setupAllSheets() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var t0 = new Date();
  Logger.log('🚀 setupAllSheets v5...');

  setupRecord();
  Logger.log('  ✅ Record ' + (new Date()-t0)+'ms');

  setupDashboard();
  Logger.log('  ✅ Dashboard ' + (new Date()-t0)+'ms');

  setupInventory();
  Logger.log('  ✅ Inventory ' + (new Date()-t0)+'ms');

  [['Mushrooms'],['Home'],['LYHOFF'],['Digital Projects'],['Other']].forEach(function(p){
    var sh = ss.getSheetByName(p[0]);
    if (sh) {
      setupProjectSheet(sh, p[0]);
      Logger.log('  ✅ '+p[0]+' ' + (new Date()-t0)+'ms');
    }
  });

  SpreadsheetApp.flush();
  Logger.log('✅ DONE in ' + (new Date()-t0)+'ms');
}

// ================================================================
// masterSetup — configure everything + load data in one step
// ================================================================
function masterSetup() {
  Logger.log('🚀 masterSetup: configuring sheets + loading data...');
  setupAllSheets();
  SpreadsheetApp.flush();
  Logger.log('✅ masterSetup COMPLETED');
}

// ================================================================
// testWebhook — test doPost locally
// ================================================================
function testWebhook() {
  var testEntry = {
    action: 'upsert',
    token: TOKEN,
    entry: {
      id: 'test-' + Date.now(),
      type: 'inventory',
      product: 'Oyster',
      category: 'mushrooms',
      subcategory: 'Liquid Culture',
      quantity: 93,
      unit: 'bag',
      unitPrice: null,
      total: null,
      isConsumption: false,
      supplier: null,
      batchId: null,
      createdAt: new Date().toISOString()
    }
  };
  var e = { postData: { contents: JSON.stringify(testEntry) } };
  var result = doPost(e);
  Logger.log('testWebhook: ' + result.getContent());
}

// One-time cleanup: the app no longer has a "variant" (Magic/Normal) concept —
// clears any leftover values in column P on the Record sheet so the sheet
// matches the app. Run once from the Apps Script editor (select this function
// in the dropdown, click Run), then it's safe to delete this function.
function clearVariantColumn() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sh = ss.getSheetByName('Record');
  var lastRow = sh.getLastRow();
  if (lastRow < 2) return;
  // Column P = 16th column.
  var range = sh.getRange(2, 16, lastRow - 1, 1);
  range.clearContent();
  Logger.log('Cleared column P (Variant) for ' + (lastRow - 1) + ' rows.');
}
