# Specification Document (spec.md) - Sistema de Tesorería Curso

## 1. Propósito
Automatizar la generación de estados de cuenta individuales, precisos y presentables a partir de una matriz consolidada de tesorería de curso, sin comprometer la estructura de la base de datos original.

## 2. Contexto del negocio y Problema a resolver
El tesorero administra una hoja "cuotas" en Google Sheets que actúa como base de datos maestra para la recaudación del curso. El problema actual es que esta matriz horizontal es excelente para la consolidación, pero inadecuada para rendir cuentas a cada apoderado debido a problemas de privacidad, claridad y usabilidad. Se necesita un mecanismo para generar vistas individuales legibles y seguras.

## 3. Definición de Entidades Principales y Fuente de Datos
- **Fuente de Datos:** Hoja `cuotas` en Google Sheets (Solo lectura para el sistema).
- **Entidad Alumno:** Identificada por `N` (Primary Key). Otros datos: `NOMBRE`, `APELLIDO`.
- **Transacción Mensual:** Tupla dinámica compuesta por `[Monto del Mes, Fecha de Pago]`.

## 4. Reglas Funcionales y de Sincronización
- **Detección de Columnas:** Las columnas estáticas (`N`, `NOMBRE`, `APELLIDO`, `DEBEN`, `SALDO 2025`, `TOTAL ABONOS`) se identificarán dinámicamente por su nombre exacto en la fila 1, sin importar su posición absoluta.
- **Manejo de Nuevos Meses:** Se identificarán iterando los encabezados. Cualquier columna "X" que tenga a su derecha inmediata una columna "FECHA", será catalogada como "Mes de Recaudación" (ej. "MARZO" y "FECHA", "AGOSTO" y "FECHA").
- **Manejo de Filas de Resumen/Totales:** Una fila se procesa solo si la celda bajo la columna `N` contiene un valor numérico mayor a 0. Esto descarta automáticamente la fila inferior de "SALDO" y filas en blanco.
- **Manejo de Nuevos Alumnos:** Al leer dinámicamente hasta la última fila válida, cualquier alumno agregado al final de la lista será incorporado automáticamente en la próxima ejecución.

## 5. Estrategia de Actualización
- **Arquitectura recomendada:** Modelo "Plantilla Única + Generador Batch PDF". Existirá una hoja `plantilla_estado_cuenta` y el sistema inyectará los datos allí para luego exportarlos.
- **Regeneración:** La creación de los estados de cuenta finales se realizará mediante exportación a PDF vía Google Apps Script (Batch Processing), depositados en Google Drive de forma estructurada.
- **Inmutabilidad:** El script NUNCA escribirá, modificará ni borrará celdas en la hoja maestra `cuotas`. Solo leerá datos.

## 6. Restricciones del Entorno
- Entorno: Google Sheets y Google Apps Script.
- Límite de tiempo de ejecución de Google Apps Script (6 minutos por ejecución). El procesamiento por lotes debe ser eficiente para prever este límite al generar los PDFs de todo el curso (o separar el trabajo en sub-tareas si excediera los 6 min, aunque para ~40-50 PDFs no suele ser un problema).

## 7. Riesgos y Supuestos (Pendientes de Validación)
- **Supuestos contables:** La fórmula de cálculo del saldo final absoluto aún debe ser definida por el tesorero (relación exacta entre `DEBEN`, `SALDO 2025` y `TOTAL ABONOS`).
- **Supuestos de datos:** Se asume que `N` es inmutable y único por alumno.
- **Riesgos:** La alteración manual de los nombres de las columnas (ej: escribir "fechas" en vez de "FECHA") puede quebrar la detección de bloques mensuales si no se controla adecuadamente.

## 8. Definition of Done (Criterios de Aceptación)
- El sistema detecta automáticamente si se agrega "Agosto" y "FECHA", incluyéndolo en el estado de cuenta sin necesidad de modificar el código fuente.
- Al generar el reporte, se ignora consistentemente la fila de "SALDO" global.
- El usuario puede generar todos los PDFs con un par de clics desde un menú personalizado.
- El código resultante es modular, auditable y está documentado para que otro mantenedor pueda entenderlo.
