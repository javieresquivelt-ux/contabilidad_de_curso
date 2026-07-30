# 🏦 Manual de Uso — Sistema de Tesorería de Curso
**Versión:** 1.0 | **Archivo de script:** `app_pagos.gs`

---

## ¿Qué hace este sistema?

Genera automáticamente un **estado de cuenta en PDF** para cada apoderado del curso, directamente desde tu planilla de Google Sheets y los guarda en una carpeta de tu Google Drive.

---

## Cómo generar los estados de cuenta

1. Abre tu planilla de Google Sheets.
2. En la barra superior verás el menú **"🏦 Tesorería"**.
3. Haz clic en **"📄 Generar todos los estados de cuenta (PDF)"**.
4. Espera. El script procesará alumno por alumno (puede tardar varios minutos).

> **Importante:** Google limita la ejecución a 6 minutos por proceso.
> Si el script hace una **"Pausa de Seguridad"**, simplemente vuelve a ejecutarlo y selecciona **"Sí"** para continuar desde donde se quedó. Los PDFs ya generados no se duplican.

5. Al terminar, verás un mensaje de confirmación con la cantidad de PDFs generados.
6. Abre **Google Drive → "Mi Unidad"** y encontrarás una carpeta llamada:
   `Estados de Cuenta - DD-MM-AAAA`

---

## Estructura requerida de la hoja "cuotas"

La hoja **debe llamarse exactamente `cuotas`** y tener esta estructura de columnas:

| Columna | Nombre exacto del encabezado |
|---|---|
| Número de lista | `N` |
| Primer nombre | `NOMBRE` |
| Apellidos | `APELLIDO` |
| Deuda de arrastre | `DEBEN` |
| Saldo a favor 2025 | `SALDO 2025` |
| Mes de pago | `MARZO`, `ABRIL`, etc. (nombre del mes) |
| Fecha de pago | `FECHA` (inmediatamente después del mes) |
| Total consolidado | `TOTAL ABONOS` |

> **Regla clave:** Cada mes debe tener su columna `FECHA` inmediatamente a la derecha.
> El sistema ignora automáticamente todo lo que esté después de `TOTAL ABONOS`.

### Cómo agregar un mes nuevo

Solo agrega dos columnas **antes** de `TOTAL ABONOS`:
1. Una columna con el nombre del mes (ej. `AGOSTO`)
2. La siguiente columna con el encabezado `FECHA`

El sistema las detectará automáticamente la próxima vez que ejecutes el script.

---

## Fórmula contable usada

El sistema calcula los valores del estado de cuenta así:

```
Total Pagado a la Fecha  = TOTAL ABONOS (en hoja) − SALDO 2025
Saldo Final Actual       = TOTAL ABONOS (en hoja) − DEBEN
```

---

## Opciones del menú "🏦 Tesorería"

| Opción | Para qué sirve |
|---|---|
| 📄 Generar todos los estados de cuenta | Proceso principal. Genera todos los PDFs. |
| 🔍 Ver datos del alumno N°1 (Diagnóstico) | Muestra en el Registro de Ejecución el JSON del primer alumno. Útil para verificar que el mapeo de columnas está correcto antes de generar. |
| 🗑️ Limpiar estado de reanudación | Borra el punto de pausa guardado. Úsalo si quieres empezar el proceso desde cero. |

---

## Solución de problemas frecuentes

| Síntoma | Causa probable | Solución |
|---|---|---|
| No aparece el menú "Tesorería" | El script no se ejecutó al abrir | Cierra y vuelve a abrir la planilla |
| Error: "No se encontró la hoja 'cuotas'" | La pestaña tiene otro nombre | Renombra la pestaña exactamente a `cuotas` (minúsculas) |
| Error: "No se encontró la columna 'TOTAL ABONOS'" | El encabezado tiene un espacio extra o está mal escrito | Verifica que sea exactamente `TOTAL ABONOS` en mayúsculas |
| Aparece el mensaje "Pausa de Seguridad" | Google detuvo el script a los 6 minutos | Normal. Vuelve a ejecutar y selecciona "Sí" para continuar |
| Un PDF muestra código HTML raro | Google colapsó por tráfico en el momento | Borra ese PDF de Drive y vuelve a generar (el script reintentará) |
| Los cálculos no cuadran | El SALDO 2025 no está siendo correctamente leído | Usa la opción "Ver datos alumno N°1" para verificar el JSON |

---

## Mantenimiento anual (inicio de nuevo año)

Al comenzar un nuevo año escolar:

1. Duplica la planilla actual para archivar el historial.
2. En la nueva planilla, actualiza el encabezado `SALDO 2025` al año nuevo (ej. `SALDO 2026`).
3. Actualiza en el código la línea del `colMap`:
   ```javascript
   SALDO_2025: getColIndex('SALDO 2026'),  // <-- cambiar aquí
   ```
4. Limpia los valores de las columnas de meses del año pasado.

---

*Sistema desarrollado con Google Apps Script. Archivo fuente: `app_pagos.gs`*
