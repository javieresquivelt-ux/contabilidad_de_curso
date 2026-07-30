/** =========================================================================
 * Módulo 1: DataExtractor
 * Responsabilidad: Leer la hoja 'cuotas', mapear dinámicamente columnas e instanciar alumnos.
 * ========================================================================= */

function testExtractor() {
  const data = extractStudentData();
  Logger.log(JSON.stringify(data.slice(0, 2), null, 2));
}

function extractStudentData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('cuotas');
  
  if (!sheet) {
    SpreadsheetApp.getUi().alert("Error: No se encontró la hoja 'cuotas'.");
    return [];
  }
  
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  
  const headers = data[0];
  const totalAbonosIndex = headers.findIndex(h => String(h).toUpperCase().trim() === 'TOTAL ABONOS');
  
  if (totalAbonosIndex === -1) {
    SpreadsheetApp.getUi().alert("Error: No se encontró la columna 'TOTAL ABONOS'.");
    return [];
  }
  
  const getColIndex = (name) => headers.findIndex(h => String(h).toUpperCase().trim() === name);
  const colMap = {
    N: getColIndex('N'),
    NOMBRE: getColIndex('NOMBRE'),
    APELLIDO: getColIndex('APELLIDO'),
    DEBEN: getColIndex('DEBEN'),
    SALDO_2025: getColIndex('SALDO 2025'),
    TOTAL_ABONOS: totalAbonosIndex
  };
  
  if (colMap.N === -1 || colMap.NOMBRE === -1) {
    SpreadsheetApp.getUi().alert("Faltan columnas críticas (N o NOMBRE).");
    return [];
  }

  const monthlyTransactions = [];
  let currentMonthName = null;
  
  for (let i = 0; i < totalAbonosIndex; i++) {
    if (Object.values(colMap).includes(i)) continue;
    
    const headerName = String(headers[i]).trim();
    if (headerName === "") continue;
    
    if (headerName.toUpperCase().includes('FECHA')) {
      if (currentMonthName) {
        monthlyTransactions.push({ type: 'DATE', name: currentMonthName, colIndex: i });
      }
    } else {
      currentMonthName = headerName;
      monthlyTransactions.push({ type: 'AMOUNT', name: currentMonthName, colIndex: i });
    }
  }

  const students = [];
  
  for (let r = 1; r < data.length; r++) {
    const row = data[r];
    const nVal = row[colMap.N];
    
    if (typeof nVal !== 'number' || isNaN(nVal) || nVal <= 0) continue;
    
    // TOTAL ABONOS en la hoja ya incluye el Saldo 2025
    const totalAbonosEnHoja = Number(row[colMap.TOTAL_ABONOS]) || 0;
    const saldo2025        = Number(row[colMap.SALDO_2025])    || 0;
    const deben            = Number(row[colMap.DEBEN])         || 0;
    
    // Abono real del año = lo que pagaron este año (sin el arrastre histórico)
    const pagadoEsteAnio = totalAbonosEnHoja - saldo2025;
    
    // Saldo final = total de la hoja menos deudas
    const saldoFinal = totalAbonosEnHoja - deben;
    
    const student = {
      N: nVal,
      NOMBRE_COMPLETO: `${row[colMap.NOMBRE] || ""} ${row[colMap.APELLIDO] || ""}`.trim(),
      DEBEN: deben,
      SALDO_2025: saldo2025,
      TOTAL_ABONOS: pagadoEsteAnio,  // Muestra solo lo pagado en el año actual
      SALDO_FINAL: saldoFinal,        // Saldo total = abonos totales - deuda
      MOVIMIENTOS: []
    };
    
    let lastAmount = 0;
    
    monthlyTransactions.forEach(t => {
      const cellValue = row[t.colIndex];
      
      if (t.type === 'AMOUNT') {
        lastAmount = Number(cellValue) || 0;
      } else if (t.type === 'DATE') {
        if (cellValue !== "" && lastAmount > 0) {
          student.MOVIMIENTOS.push({
            mes: t.name,
            monto: lastAmount,
            fecha: cellValue instanceof Date
              ? Utilities.formatDate(cellValue, Session.getScriptTimeZone(), "dd/MM/yyyy")
              : String(cellValue)
          });
          lastAmount = 0;
        }
      }
    });
    
    students.push(student);
  }
  
  return students;
}

/** =========================================================================
 * Módulo 2: TemplateEngine
 * Responsabilidad: Inyectar datos de un alumno en la hoja 'plantilla_estado_cuenta'.
 * ========================================================================= */

const TEMPLATE_CONFIG = {
  NOMBRE:              'C3',
  N_LISTA:             'F3',
  DEUDA_ARRASTRE:      'F5',
  SALDO_FAVOR:         'C5',
  TOTAL_PAGADO:        'C6',
  SALDO_FINAL:         'F6',
  MOVIMIENTOS_START_ROW: 10,
  MOVIMIENTOS_COLS: {
    MES:   2,   // Columna B
    FECHA: 3,   // Columna C
    MONTO: 4    // Columna D
  }
};

function renderStudentTemplate(student, sheet) {
  // Limpiar celdas de cabecera
  sheet.getRange(TEMPLATE_CONFIG.NOMBRE).clearContent();
  sheet.getRange(TEMPLATE_CONFIG.N_LISTA).clearContent();
  sheet.getRange(TEMPLATE_CONFIG.DEUDA_ARRASTRE).clearContent();
  sheet.getRange(TEMPLATE_CONFIG.SALDO_FAVOR).clearContent();
  sheet.getRange(TEMPLATE_CONFIG.TOTAL_PAGADO).clearContent();
  sheet.getRange(TEMPLATE_CONFIG.SALDO_FINAL).clearContent();
  
  // Limpiar área de movimientos
  const lastRow = Math.max(sheet.getLastRow(), TEMPLATE_CONFIG.MOVIMIENTOS_START_ROW + 1);
  if (lastRow >= TEMPLATE_CONFIG.MOVIMIENTOS_START_ROW) {
    sheet.getRange(
      TEMPLATE_CONFIG.MOVIMIENTOS_START_ROW,
      TEMPLATE_CONFIG.MOVIMIENTOS_COLS.MES,
      lastRow,
      3
    ).clearContent();
  }

  // Inyectar datos de cabecera
  sheet.getRange(TEMPLATE_CONFIG.NOMBRE).setValue(student.NOMBRE_COMPLETO);
  sheet.getRange(TEMPLATE_CONFIG.N_LISTA).setValue(student.N);
  sheet.getRange(TEMPLATE_CONFIG.DEUDA_ARRASTRE).setValue(student.DEBEN);
  sheet.getRange(TEMPLATE_CONFIG.SALDO_FAVOR).setValue(student.SALDO_2025);
  sheet.getRange(TEMPLATE_CONFIG.TOTAL_PAGADO).setValue(student.TOTAL_ABONOS); // Solo abonos del año
  sheet.getRange(TEMPLATE_CONFIG.SALDO_FINAL).setValue(student.SALDO_FINAL);   // Total real

  // Inyectar tabla de movimientos
  if (student.MOVIMIENTOS && student.MOVIMIENTOS.length > 0) {
    const movimientosData = student.MOVIMIENTOS.map(mov => [mov.mes, mov.fecha, mov.monto]);
    
    sheet.getRange(
      TEMPLATE_CONFIG.MOVIMIENTOS_START_ROW,
      TEMPLATE_CONFIG.MOVIMIENTOS_COLS.MES,
      movimientosData.length,
      3
    ).setValues(movimientosData);
  }
  
  SpreadsheetApp.flush();
}

/** =========================================================================
 * Módulo 3: ReportGenerator (V3 - Reanudación Inteligente anti-Timeout)
 * Responsabilidad: Orquestar el flujo batch y generar los PDFs en Drive.
 * ========================================================================= */

function generateAllPDFs() {
  const ui    = SpreadsheetApp.getUi();
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const templateSheet = ss.getSheetByName('plantilla_estado_cuenta');
  const props = PropertiesService.getDocumentProperties();
  
  if (!templateSheet) {
    ui.alert("Error: Debes crear una hoja llamada 'plantilla_estado_cuenta'.");
    return;
  }
  
  const students = extractStudentData();
  if (students.length === 0) {
    ui.alert("No se encontraron alumnos válidos para procesar.");
    return;
  }
  
  // 1. LÓGICA DE REANUDACIÓN
  let startIndex = 0;
  const savedIndex    = props.getProperty('LAST_PROCESSED_INDEX');
  const savedFolderId = props.getProperty('TARGET_FOLDER_ID');
  
  if (savedIndex !== null && parseInt(savedIndex) < students.length) {
    const response = ui.alert(
      'Proceso Incompleto',
      `El script anterior se pausó en el alumno número ${parseInt(savedIndex) + 1}.\n\n¿Deseas continuar desde donde se quedó?`,
      ui.ButtonSet.YES_NO
    );
    if (response == ui.Button.YES) {
      startIndex = parseInt(savedIndex);
    } else {
      props.deleteProperty('LAST_PROCESSED_INDEX');
      props.deleteProperty('TARGET_FOLDER_ID');
    }
  }
  
  // 2. CONFIGURACIÓN DE CARPETA
  let targetFolder;
  const folderName = `Estados de Cuenta - ${Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd-MM-yyyy")}`;
  
  if (startIndex > 0 && savedFolderId) {
    targetFolder = DriveApp.getFolderById(savedFolderId);
  } else {
    const parentFolder = DriveApp.getRootFolder();
    const folders = parentFolder.searchFolders(`title = '${folderName}'`);
    targetFolder = folders.hasNext() ? folders.next() : parentFolder.createFolder(folderName);
    props.setProperty('TARGET_FOLDER_ID', targetFolder.getId());
  }
  
  const sheetId = templateSheet.getSheetId();
  const url = ss.getUrl().replace(/edit$/, '') + 'export?exportFormat=pdf&format=pdf' +
              '&size=letter&portrait=true&fitw=true&sheetnames=false&printtitle=false' +
              '&pagenumbers=false&gridlines=false&fzr=false&gid=' + sheetId;
  const token = ScriptApp.getOAuthToken();
  
  let procesados = 0;
  const startTime        = Date.now();
  const MAX_EXEC_TIME_MS = 4.5 * 60 * 1000; // 4.5 minutos para tener margen ante el límite de 6 min
  
  for (let i = startIndex; i < students.length; i++) {
    
    // Guardar progreso y pausar amigablemente antes del timeout de Google
    if (Date.now() - startTime > MAX_EXEC_TIME_MS) {
      props.setProperty('LAST_PROCESSED_INDEX', i.toString());
      ui.alert(
        'Pausa de Seguridad (Límite de Google)',
        `Procesados ${procesados} PDFs exitosamente.\n\nVuelve a ejecutar "generateAllPDFs" y selecciona "Sí" para continuar desde donde pausamos.`,
        ui.ButtonSet.OK
      );
      return;
    }
    
    const student = students[i];
    renderStudentTemplate(student, templateSheet);
    const pdfName = `${student.N}_${student.NOMBRE_COMPLETO}.pdf`;
    
    let success = false;
    let retries = 0;
    let blob    = null;
    
    while (!success && retries < 3) {
      try {
        const response = UrlFetchApp.fetch(url, {
          headers: { 'Authorization': 'Bearer ' + token },
          muteHttpExceptions: true
        });
        
        const contentType = (response.getHeaders()['Content-Type'] || response.getHeaders()['content-type'] || "");
        
        if (contentType.toLowerCase().includes('text/html')) {
          // Google devolvió una página de error (Rate Limit) — reintentamos
          retries++;
          Utilities.sleep(5000);
        } else {
          blob = response.getBlob().setName(pdfName);
          success = true;
        }
      } catch (e) {
        retries++;
        Utilities.sleep(5000);
      }
    }
    
    if (success && blob) {
      targetFolder.createFile(blob);
      procesados++;
    }
    
    Utilities.sleep(2500); // Pausa de cortesía entre alumnos
  }
  
  // Limpiar estado guardado al completar el lote
  props.deleteProperty('LAST_PROCESSED_INDEX');
  props.deleteProperty('TARGET_FOLDER_ID');
  
  ui.alert(`¡Proceso Completado!\n\nSe generaron ${procesados} estados de cuenta.\nRevisa la carpeta: "${folderName}".`);
}

/** =========================================================================
 * Módulo 4: UIManager
 * Responsabilidad: Crear el menú personalizado "Tesorería" en Google Sheets
 * y enlazar las opciones con los agentes correspondientes.
 * ========================================================================= */

/**
 * Se ejecuta automáticamente cada vez que se abre la planilla.
 * Construye el menú "Tesorería" en la barra de herramientas de Google Sheets.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🏦 Tesorería')
    .addItem('📄 Generar todos los estados de cuenta (PDF)', 'generateAllPDFs')
    .addItem('📊 Generar reporte consolidado (Dashboard en PDF)', 'exportDashboardPDF')
    .addSeparator()
    .addItem('🔍 Ver datos del alumno N°1 (Diagnóstico)', 'testExtractor')
    .addSeparator()
    .addItem('🗑️ Limpiar estado de reanudación guardado', 'resetProgress')
    .addToUi();
}

/**
 * Utilidad para limpiar manualmente el estado de reanudación.
 * Útil si el usuario quiere empezar un lote desde cero aunque haya uno guardado.
 */
function resetProgress() {
  const props = PropertiesService.getDocumentProperties();
  props.deleteProperty('LAST_PROCESSED_INDEX');
  props.deleteProperty('TARGET_FOLDER_ID');
  SpreadsheetApp.getUi().alert('✅ Listo', 'El estado de reanudación fue eliminado. La próxima vez que ejecutes "Generar", comenzará desde el principio.', SpreadsheetApp.getUi().ButtonSet.OK);
}

/** =========================================================================
 * Módulo 5: DashboardExporter
 * Responsabilidad: Ubicar la hoja 'dashboard', generar PDF de la misma, 
 * y almacenarla en la carpeta actual utilizando el patrón Anti-Rate Limit.
 * ========================================================================= */

function exportDashboardPDF() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dashboardSheet = ss.getSheetByName('dashboard');
  const props = PropertiesService.getDocumentProperties();
  
  if (!dashboardSheet) {
    ui.alert("Error: No se encontró la hoja llamada 'dashboard'.");
    return;
  }
  
  // 1. OBTENER / CREAR CARPETA DE DESTINO
  let targetFolder;
  const folderName = `Estados de Cuenta - ${Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd-MM-yyyy")}`;
  
  const savedFolderId = props.getProperty('TARGET_FOLDER_ID');
  if (savedFolderId) {
    targetFolder = DriveApp.getFolderById(savedFolderId);
  } else {
    const parentFolder = DriveApp.getRootFolder();
    const folders = parentFolder.searchFolders(`title = '${folderName}'`);
    targetFolder = folders.hasNext() ? folders.next() : parentFolder.createFolder(folderName);
    // Solo guardamos la carpeta si la creamos o encontramos, para mantener el orden del lote
    props.setProperty('TARGET_FOLDER_ID', targetFolder.getId());
  }
  
  // 2. CONFIGURAR PARÁMETROS DE EXPORTACIÓN
  const sheetId = dashboardSheet.getSheetId();
  // Configuración orientada a una tabla de resumen: vertical ajustado al ancho (fitw=true)
  const url = ss.getUrl().replace(/edit$/, '') + 'export?exportFormat=pdf&format=pdf' +
              '&size=letter&portrait=true&fitw=true&sheetnames=false&printtitle=false' +
              '&pagenumbers=false&gridlines=false&fzr=false&gid=' + sheetId;
  const token = ScriptApp.getOAuthToken();
  
  // 3. OBTENER EL BLOB CON EXPONENTIAL BACKOFF (Anti-Rate Limit)
  let success = false;
  let retries = 0;
  let blob = null;
  const pdfName = `Dashboard_Consolidado_${Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd-MM-yyyy")}.pdf`;
  
  while (!success && retries < 3) {
    try {
      const response = UrlFetchApp.fetch(url, {
        headers: { 'Authorization': 'Bearer ' + token },
        muteHttpExceptions: true
      });
      
      const contentType = (response.getHeaders()['Content-Type'] || response.getHeaders()['content-type'] || "");
      
      if (contentType.toLowerCase().includes('text/html')) {
        retries++;
        Utilities.sleep(5000); // 5 segundos de espera si Google nos bloquea temporalmente
      } else {
        blob = response.getBlob().setName(pdfName);
        success = true;
      }
    } catch (e) {
      retries++;
      Utilities.sleep(5000);
    }
  }
  
  // 4. GUARDAR Y NOTIFICAR
  if (success && blob) {
    targetFolder.createFile(blob);
    ui.alert(`¡Reporte Generado!\n\nEl archivo "${pdfName}" se ha guardado exitosamente en la carpeta:\n"${folderName}".`);
  } else {
    ui.alert("Error de Conexión", "Google rechazó la generación del PDF por exceso de tráfico. Por favor, intenta de nuevo en unos minutos.", ui.ButtonSet.OK);
  }
}
