# Plan de Trabajo Detallado (task.md)

- [x] **Etapa 1: Aprobación de Arquitectura y Diseño**
  - [x] Entendimiento del problema
  - [x] Diseño de Arquitectura (Plantilla Única + PDF)
  - [x] Generación de `spec.md` y `agent.md`
  - [x] Aprobación del usuario sobre decisiones contables y casos borde (detalladas en `memory.md`)
- [x] **Etapa 2: Configuración del Entorno y Pruebas Iniciales**
  - [x] Clonar la hoja actual `cuotas` a un entorno de pruebas seguro (anonimizada si es necesario)
  - [x] Crear y diseñar visualmente la pestaña `plantilla_estado_cuenta`
- [x] **Etapa 3: Desarrollo Módulo de Extracción de Datos (DataExtractor)**
  - [x] Implementar lectura dinámica de encabezados (ignorando todo tras "TOTAL ABONOS")
  - [x] Desarrollar algoritmo para identificar bloques "MES" + "FECHA" (soportando hasta 3 pagos distintos por mes)
  - [x] Codificar cálculo de Saldo Actual = `(TOTAL ABONOS + SALDO 2025) - DEBEN`
  - [x] Implementar filtro de alumnos válidos asegurando que ignora filas nulas o totales
- [/] **Etapa 4: Desarrollo Módulo de Generación (TemplateEngine & ReportGenerator)**
  - [x] Codificar la inyección de datos desde Apps Script hacia `plantilla_estado_cuenta`
  - [x] Desarrollar la exportación del rango de la plantilla a formato PDF
  - [x] Configurar el guardado estructurado de los PDFs en carpetas de Google Drive
- [x] **Etapa 4.5: Resolución de Feedback Visual y Errores (Fix)** — COMPLETADA
  - [x] **Fix UI:** Estructura tabular profesional configurada en `plantilla_estado_cuenta`.
  - [x] **Fix PDF Blob:** Anti-Rate Limit con Exponential Backoff implementado.
  - [x] **Fix Timeout (6 min):** Arquitectura Resumible con `PropertiesService` implementada.
  - [x] **Fix Cálculo:** `TOTAL_ABONOS` ahora muestra solo abonos del año actual (sin arrastre histórico).
  - [x] **Consolidación:** Script unificado en archivo canónico `app_pagos.gs` (306 líneas, 3 módulos).
- [x] **Etapa 5: Interfaz de Usuario (UIManager)** — COMPLETADA
  - [x] Programar el menú personalizado "Tesoría" en la cinta de Google Sheets
  - [x] Enlazar las opciones del menú con los agentes correspondientes
  - [x] Agregar opción de limpieza de estado de reanudación (`resetProgress`)
- [x] **Etapa 6: Pruebas de Integración (QA)** — COMPLETADA ✅
  - [x] **QA-1:** Menú "Tesoría" aparece correctamente al abrir la planilla
  - [x] **QA-2:** Mes futuro (AGOSTO) mapeado automáticamente por el DataExtractor
  - [x] **QA-3:** Hasta 3 cuotas en un mismo mes procesadas correctamente
  - [x] **QA-4:** Fila de SALDO ignorada sin afectar el conteo de alumnos
  - [x] **QA-5:** Cálculos contables correctos en todos los PDFs
- [x] **Etapa 7: Despliegue y Traspaso** — COMPLETADA ✅
  - [x] Copiar `app_pagos.gs` al editor de Apps Script de la planilla productiva final
  - [x] Redactar manual básico de uso y mantenimiento para el tesorero (`MANUAL_TESORERO.md`)

---
## 🏁 PROYECTO COMPLETADO — Sistema de Tesoría de Curso v1.0

---
## 🚀 FASE 2: Expansión de Reportes
- [x] **Etapa 8: Dashboard Exporter (Reporte Consolidado)** — COMPLETADA ✅
  - [x] Añadir "Módulo 5: DashboardExporter" al archivo canónico `app_pagos.gs` (preservando la regla de "un solo archivo").
  - [x] Actualizar "Módulo 4: UIManager" para agregar la opción "📊 Generar reporte consolidado (Dashboard en PDF)".
  - [x] Integrar lógica de exportación específica para la hoja 'dashboard', reutilizando autenticación y *Exponential Backoff*.
  - [x] Validar guardado en Drive con nomenclatura `Dashboard_Consolidado_DD-MM-AAAA.pdf`.
