# 📚 Lecciones Aprendidas — Sistema de Tesorería de Curso
**Proyecto:** Automatización de Estados de Cuenta con Google Apps Script  
**Versión:** 1.0 | **Fecha de cierre:** Julio 2026

> Este documento registra todas las lecciones técnicas, de proceso y de diseño obtenidas durante el desarrollo de este proyecto. Su propósito es acelerar futuros proyectos similares y evitar repetir los mismos errores.

---

## 1. Lecciones Técnicas — Google Apps Script

### ⏱️ LL-T1: Límite de 6 Minutos de Ejecución (Critical)
**Qué aprendimos:** Google Apps Script tiene un límite estricto de **6 minutos de ejecución** para cuentas gratuitas (30 minutos para Workspace). Cualquier script que itere sobre conjuntos grandes de datos (40+ alumnos) y requiera pausas para no saturar APIs externas, chocará inevitablemente con este muro.

**Solución implementada:** "Arquitectura Resumible" usando `PropertiesService.getDocumentProperties()` para guardar el estado (índice del último elemento procesado y ID de la carpeta de Drive). El script se auto-detiene amigablemente a los 4.5 minutos y pregunta al usuario si desea continuar.

**Patrón reusable:**
```javascript
const startTime = Date.now();
const MAX_EXEC_TIME_MS = 4.5 * 60 * 1000;

for (let i = startIndex; i < items.length; i++) {
  if (Date.now() - startTime > MAX_EXEC_TIME_MS) {
    PropertiesService.getDocumentProperties().setProperty('LAST_INDEX', i.toString());
    // alertar al usuario y salir
    return;
  }
  // ... procesar item
}
```

---

### 🚦 LL-T2: Rate Limiting Silencioso en la API de Exportación a PDF
**Qué aprendimos:** El endpoint interno de Google para exportar hojas a PDF (`/export?exportFormat=pdf...`) está sujeto a **Rate Limiting silencioso**. Cuando se realizan muchas solicitudes consecutivas, Google devuelve una página HTML de error (con `Content-Type: text/html`) en lugar de lanzar una excepción. El script capturaba ese HTML como si fuera un PDF válido, generando archivos corruptos.

**Señal de detección:** El archivo generado pesa menos de lo esperado (7 kB vs 20 kB) y al abrirlo muestra código HTML con `<!DOCTYPE html>`.

**Solución implementada:** Validar el `Content-Type` de la respuesta HTTP antes de procesar el blob. Si es HTML, reintentar con backoff exponencial.

```javascript
const contentType = response.getHeaders()['Content-Type'] || "";
if (contentType.toLowerCase().includes('text/html')) {
  retries++;
  Utilities.sleep(5000); // backoff de 5 segundos
} else {
  blob = response.getBlob().setName(pdfName);
  success = true;
}
```

**Regla práctica:** Siempre validar `Content-Type` al descargar blobs de APIs de Google. Nunca asumir que una respuesta 200 OK es el recurso esperado.

---

### 🧩 LL-T3: Mapeo Dinámico de Columnas vs. Índices Hardcodeados
**Qué aprendimos:** Nunca hardcodear índices de columna (ej. columna 5 = DEBEN). Las planillas evolucionan. Un enfoque robusto usa `findIndex` sobre los encabezados para ubicar cada columna por nombre.

**Patrón reusable:**
```javascript
const getColIndex = (name) => 
  headers.findIndex(h => String(h).toUpperCase().trim() === name);
```

**Bonus:** El mismo patrón permite descubrir automáticamente columnas nuevas (meses) usando una heurística: "toda columna seguida de una columna FECHA es un mes de recaudación".

---

### 🔑 LL-T4: PropertiesService para Estado Persistente
**Qué aprendimos:** `PropertiesService` es la forma correcta de persistir estado entre ejecuciones en Apps Script. Existen 3 ámbitos:
- `ScriptProperties` — compartido entre todos los documentos del script
- `DocumentProperties` — específico al documento activo ✅ (el correcto para este caso)
- `UserProperties` — específico al usuario que ejecuta

**Importante:** Siempre limpiar las propiedades al finalizar exitosamente para evitar que una reanudación fantasma quede guardada indefinidamente.

```javascript
props.deleteProperty('LAST_PROCESSED_INDEX');
props.deleteProperty('TARGET_FOLDER_ID');
```

---

### 📅 LL-T5: Formateo de Fechas en Apps Script
**Qué aprendimos:** Google Sheets puede almacenar fechas como objetos `Date` de JavaScript o como strings (depende del formato de la celda). Al leer con `getValues()`, una celda de fecha es un `Date` si está formateada como fecha, y un `String` si está formateada como texto. El script debe manejar ambos casos.

```javascript
fecha: cellValue instanceof Date
  ? Utilities.formatDate(cellValue, Session.getScriptTimeZone(), "dd/MM/yyyy")
  : String(cellValue)
```

---

## 2. Lecciones de Arquitectura y Diseño

### 🏗️ LL-A1: Separación de Responsabilidades (Single Responsibility)
**Qué aprendimos:** Dividir el script en módulos con responsabilidades únicas fue la decisión de diseño más valiosa del proyecto. Cuando surgían bugs, era trivial identificar en qué módulo estaba el problema:
- Bug de cálculo → `DataExtractor`
- Bug de formato visual → `TemplateEngine`
- Bug de exportación → `ReportGenerator`

**Regla:** Un módulo = una responsabilidad. Si un módulo tiene dos razones para cambiar, debe dividirse.

---

### 📋 LL-A2: La Plantilla es Diseño, el Script es Datos
**Qué aprendimos:** El `TemplateEngine` no inyecta "diseño", inyecta datos. Toda la estructura visual (títulos, colores, bordes, tipografías) debe estar en la hoja de Google Sheets (`plantilla_estado_cuenta`). El script solo pone números y texto en celdas específicas.

Esta separación permite que el tesorero rediseñe la plantilla visualmente en cualquier momento sin tocar el código. Solo se actualiza el `TEMPLATE_CONFIG` si se mueven las celdas.

---

### 🔄 LL-A3: Arquitectura Resumible (Resumable Pattern)
**Qué aprendimos:** Cualquier proceso batch de larga duración debe ser diseñado como resumible desde el inicio. El patrón consiste en:

1. Al iniciar, verificar si hay estado guardado del proceso anterior.
2. Preguntar al usuario si desea continuar o empezar desde cero.
3. Durante el proceso, guardar el índice actual regularmente.
4. Al finalizar exitosamente, limpiar el estado guardado.

Este patrón es aplicable a cualquier proceso que itere sobre decenas de registros en Apps Script.

---

### 📊 LL-A5: Separación de Casos de Uso (Batch vs On-Demand)
**Qué aprendimos:** Al surgir el requerimiento de generar un PDF del Dashboard (FASE 2), existió la tentación de agregarlo al final del bucle masivo de alumnos. 

**Decisión:** Se creó el `DashboardExporter` como un caso de uso independiente en el menú de UI. 
**Razón:** Acoplar la generación de un reporte gerencial a un proceso batch masivo contamina la lógica, aumenta la probabilidad de timeouts y empeora la experiencia del usuario (quien podría querer solo el dashboard sin generar 40 PDFs de alumnos). Los casos de uso con frecuencias y propósitos diferentes deben tener puntos de entrada separados.

---

### 🧮 LL-A4: Validación de Datos en la Fuente (Fail-Safe Design)
**Qué aprendimos:** Siempre validar al inicio, antes de iniciar el proceso costoso:
1. ¿Existe la hoja? → Si no, alertar y salir.
2. ¿Existe la columna crítica? → Si no, alertar y salir.
3. ¿Existen filas válidas? → Si no, alertar y salir.

Es infinitamente mejor fallar rápido con un mensaje claro que fallar a mitad del proceso con un error críptico.

---

## 3. Lecciones Contables y de Dominio

### 💰 LL-C1: El Dominio Manda sobre el Código
**Qué aprendimos:** La fórmula contable fue redefinida dos veces durante el proyecto. El error inicial fue asumir que `TOTAL ABONOS` **no incluía** el `SALDO 2025`, cuando en realidad ya lo traía sumado desde la planilla.

**Lección:** Antes de codificar cualquier regla de negocio, solicitar un ejemplo concreto con números reales y verificar matemáticamente el resultado esperado. No asumir.

**Iteraciones de la fórmula:**
```
Versión 1 (incorrecta): Saldo = (TOTAL + SALDO_2025) - DEBEN  → Duplicaba el arrastre
Versión 2 (correcta):   Saldo = TOTAL - DEBEN                 → Correcto
```

---

### 📊 LL-C2: Separar "Total del Año" de "Total Histórico"
**Qué aprendimos:** Para que el estado de cuenta sea comprensible para un apoderado, los montos deben ser intuitivos. La distinción clave es:

- **Total Pagado a la Fecha** → Solo los abonos del año actual (lo que el apoderado pagó este año).
- **Saldo Final Actual** → El saldo total acumulado (incluyendo arrastre histórico, menos deudas).

Presentar solo el total consolidado confundía al apoderado porque no entendía de dónde venía el número.

---

## 4. Lecciones de Proceso y Gestión

### 🚦 LL-P1: Gates de Aprobación Humana (No avanzar sin luz verde)
**Qué aprendimos:** La regla de "no implementar antes de validar el diseño" evitó tener que reescribir el código desde cero por malentendidos contables. El tiempo invertido en el Gate de Aprobación de la Fase 1 ahorró horas de debugging posterior.

**Regla:** En proyectos con reglas de negocio ambiguas, siempre separar Fase de Diseño de Fase de Implementación. Obtener aprobación explícita sobre cada supuesto antes de codificarlo.

---

### 📝 LL-P2: Documentar Decisiones en Tiempo Real
**Qué aprendimos:** Registrar cada decisión, bug y corrección en `memory.md` durante el desarrollo (no al final) tuvo dos beneficios concretos:
1. Al encontrar el error de doble contabilización del `SALDO 2025`, el archivo de memory ya tenía la fórmula original registrada, lo que hizo trivial entender qué había cambiado.
2. Al volver a una sesión interrumpida, el contexto completo estaba disponible sin necesidad de "recordar" lo que se había hecho.

**Regla:** Tratar `memory.md` como un diario de bitácora técnica. Escribir en él inmediatamente después de cada decisión importante.

---

### 🗂️ LL-P3: Un Solo Archivo Canónico de Código
**Qué aprendimos:** Tener el código dividido en 3 archivos separados (`DataExtractor.gs`, `TemplateEngine.gs`, `ReportGenerator.gs`) provocó múltiples errores humanos de copy-paste durante la fase de desarrollo (se perdían módulos, se pegaban en el lugar equivocado, se dejaban llaves `}` sin cerrar).

La consolidación en un único archivo `app_pagos.gs` eliminó completamente esta clase de errores. Durante la **Fase 2**, al agregar el `DashboardExporter`, se inyectó como un "Módulo 5" al final de este mismo archivo, respetando la arquitectura física y previniendo regresiones.

**Regla:** Para proyectos de Apps Script con <500 líneas, preferir un único archivo monolítico bien comentado sobre múltiples archivos. La modularidad lógica (por funciones/comentarios de sección) es suficiente.

---

### 🔁 LL-P4: Iterar Rápido, Probar en Producción Real
**Qué aprendimos:** Las pruebas con los datos reales (no anonimizados) detectaron inmediatamente el error de la fórmula contable. Probar solo con datos ficticios habría pasado por alto el caso del `SALDO 2025` ya incluido en el `TOTAL ABONOS`.

**Regla:** En proyectos de automatización de datos reales, probar lo antes posible con datos reales. Los casos borde siempre emergen en los datos reales y casi nunca en los sintéticos.

---

## 5. Resumen de Errores Cometidos y sus Correcciones

| # | Error | Causa Raíz | Corrección |
|---|---|---|---|
| 1 | PDFs corruptos (HTML) | Rate Limiting silencioso de Google | Validar `Content-Type` + Retry Pattern |
| 2 | `extractStudentData is not defined` | Código pegado dentro de otra función | Entregar siempre código monolítico completo |
| 3 | `Exceeded maximum execution time` | 40+ alumnos × pausas > 6 minutos | Arquitectura Resumible con `PropertiesService` |
| 4 | Saldo Final duplicado (+28.086) | `TOTAL ABONOS` ya incluía el `SALDO 2025` | Ajustar fórmula: `Saldo = TOTAL - DEBEN` |
| 5 | "Total Pagado" mostraba valor incorrecto | Se mostraba `TOTAL ABONOS` (histórico) | Restar arrastre: `Pagado = TOTAL - SALDO_2025` |

---

## 6. Patrones Reutilizables para Futuros Proyectos GAS

```javascript
// PATRÓN 1: Mapeo dinámico de encabezados
const getColIndex = (name) => 
  headers.findIndex(h => String(h).toUpperCase().trim() === name);

// PATRÓN 2: Arquitectura resumible
const savedIdx = props.getProperty('PROGRESS_INDEX');
const startIndex = savedIdx ? parseInt(savedIdx) : 0;
// ... al final del bucle:
props.setProperty('PROGRESS_INDEX', i.toString());

// PATRÓN 3: Descarga de PDF con validación de Content-Type
const response = UrlFetchApp.fetch(url, { headers: { 'Authorization': 'Bearer ' + token }, muteHttpExceptions: true });
const ct = response.getHeaders()['Content-Type'] || "";
if (!ct.includes('application/pdf')) { /* manejar error */ }

// PATRÓN 4: Pausa de seguridad anti-timeout
const startTime = Date.now();
if (Date.now() - startTime > 4.5 * 60 * 1000) { /* guardar estado y salir */ }

// PATRÓN 5: Filtro de filas válidas (ignorar totales/vacíos)
if (typeof nVal !== 'number' || isNaN(nVal) || nVal <= 0) continue;
```

---

*Lecciones compiladas al cierre del proyecto · Sistema de Tesorería de Curso v1.0 · 2026*
