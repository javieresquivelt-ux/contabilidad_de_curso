# Memory Document (memory.md) - Registro de Decisiones y Razonamiento

## 1. Registro del Problema y Necesidad
El usuario, actuando como tesorero de curso, administra una hoja de recaudación (`cuotas`) en Google Sheets que se expande constantemente (nuevos estudiantes en el eje vertical y nuevos meses de pago en el eje horizontal). El dolor principal radica en la necesidad de generar "estados de cuenta" automatizados, individuales y legibles para cada apoderado, sin dañar o complicar la mantención de la matriz de datos original. Se requiere una solución robusta, trazable y profesional.

## 2. Razonamiento Arquitectónico y Decisión de Diseño
- **Opciones descartadas:** Se evaluó la creación de múltiples hojas físicas (una por alumno), pero se descartó rotundamente por su pésima escalabilidad (alta fragilidad, dificultad para modificar el formato general y saturación visual del libro, que llevaría a posibles cuellos de botella en la operación manual).
- **Decisión Tomada:** Se recomendó la arquitectura de "Plantilla Única + Generador Batch de PDF". Esto centraliza el diseño visual en una sola pestaña limpia (`plantilla_estado_cuenta`) y traslada la carga operativa al entorno de Apps Script. Los estados de cuenta resultantes son documentos inmutables (PDF) perfectos para ser compartidos de forma segura, garantizando la privacidad de los demás miembros del curso y proyectando profesionalismo.

## 3. Estrategia de Lectura Dinámica y Mantenibilidad
- Para mitigar la "fragilidad técnica" de soluciones estáticas (donde cambiar una columna rompe el código), se ha diseñado una lógica basada en el descubrimiento de patrones:
  - En vez de anclar que "Marzo" está en la columna F, el extractor recorrerá las celdas de la fila de cabecera.
  - El patrón funcional detectado en la hoja es: un bloque mensual consiste en `[Columna Genérica]` + `[Columna llamada FECHA]`. Al validar esta dupla, la columna izquierda asume la identidad del mes de recaudación.
- La distinción entre "filas de estudiantes válidos" y "filas de totales/basura" dependerá exclusivamente del campo Identificador Principal (`N`). Si el campo `N` no posee un número correlativo, la fila será omitida del procesamiento por diseño, protegiendo así las celdas inferiores que consolidan sumatorias.

## 4. Estado de los Gates de Aprobación (Final de la Fase 1)
En este punto, hemos consolidado el entendimiento del problema, proyectado el plan de trabajo futuro, diseñado la arquitectura (`agent.md`) y detallado las especificaciones funcionales (`spec.md`).

**🚨 Decisiones Pendientes (Bloqueo de Avance a Fase 2):**
Para abandonar la fase de diseño y proceder a la **Fase 2 de Implementación** (generación de código y despliegue del entorno), estoy a la espera de la resolución expresa por parte del usuario sobre las siguientes interrogantes que dictarán la lógica de negocio final:

1. **Aprobación de la Arquitectura Propuesta:** Confirmación explícita de que se aprueba el modelo basado en plantillas y generación de PDFs centralizados en Drive, abandonando la idea de tener decenas de pestañas sueltas.
2. **Definición de Saldo:** Fijar la fórmula matemática absoluta para calcular la situación contable final del alumno. ¿Es el resultado de: `DEBEN + SALDO 2025 - TOTAL ABONOS`? ¿O existen consideraciones extras?
3. **Manejo de Casos Borde Mensuales:** Instrucciones sobre cómo manejar o interpretar la situación si un apoderado divide el pago de un mes en dos transferencias y, por ende, dos fechas diferentes (dado que el esquema actual contempla un par unitario por mes).
4. **Discrepancia en Columnas Finales:** Aclarar si la aparente repetición de "Julio" o anotaciones extra tras la columna "TOTAL ABONOS" (Columnas Q/R en adelante) requieren procesamiento especial o deben simplemente ser ignoradas por el automatismo.

## 5. Aplicación Estricta de Restricciones Operativas
Cumpliendo fielmente las reglas de control de la sesión, nos encontramos detenidos en el Gate. **No se creará ningún archivo `.gs` (Apps Script), no se estructurarán las funciones finales y no se realizará ninguna intervención al sistema en la nube** hasta que el evaluador humano (el usuario) haya respondido los puntos del Gate y haya declarado abiertamente: "Apruebo el diseño, pasemos a la Fase 2".

## 6. Documentación de Referencia y Antecedentes
- **Archivo de muestra:** El usuario ha proporcionado el archivo físico `Copia de cuotas 2026 III medio blue .xlsx` en el entorno del proyecto. Este archivo servirá estrictamente como modelo de lectura pasiva (antecedente) para clarificar dudas estructurales durante la Fase de Diseño o para testear el script de extracción (`DataExtractor`) una vez que inicie la Fase 2 de Implementación.

## 7. Respuestas al Gate de Aprobación y Cierre de Fase 1
Con fecha de la sesión actual, el tesorero (usuario) ha respondido al Gate de Aprobación, estableciendo los siguientes lineamientos contables y arquitectónicos definitivos:
1. **Arquitectura:** Se aprueba avanzar con el modelo de "Plantilla Única + Generación de PDF". Se asume el escepticismo inicial del usuario como un riesgo que debe mitigarse entregando prototipos de alta calidad para probar el valor del enfoque.
2. **Definición Contable (Corregida tras Pruebas):** 
   - `DEBEN` opera como una resta (deuda).
   - `SALDO 2025` es el saldo a favor, pero **ya viene sumado** dentro de la columna `TOTAL ABONOS` en la planilla de Google Sheets.
   - **Fórmula Definitiva:** `Saldo Final = TOTAL ABONOS - DEBEN` (Se elimina la suma del Saldo 2025 en el script para evitar duplicidad).
3. **Casos Borde (Pagos Múltiples):** El sistema debe estar diseñado estructuralmente para aceptar y procesar hasta **3 pagos/cuotas por mes** para un mismo alumno.
4. **Columnas Finales:** Se ignorará de forma absoluta cualquier dato o columna ubicada después del campo `TOTAL ABONOS`. No son válidas para el sistema.

**ESTADO ACTUAL:** La Fase 1 (Diseño) se declara **COMPLETADA Y APROBADA**. Se levanta la restricción operativa y se autoriza oficialmente el inicio de la **Fase 2: Implementación Controlada**.

## 8. Análisis de Fallos: Feedback Etapa 4 (Generación de PDF)
El usuario ejecutó la primera prueba de `generateAllPDFs()` y reportó dos hallazgos documentados visualmente:
1. **Deficiencia UI/UX:** El PDF carece de títulos y estructura (se ve como un documento en blanco con números flotando).
   - *Razonamiento:* El script inyecta datos en coordenadas (ej. C3, F5), pero la hoja física en Google Sheets no tiene formato, bordes, ni encabezados. El script no inyecta "diseño", inyecta datos. La solución es guiar al usuario a crear la "carcasa" visual en Sheets, y luego adaptar el `TEMPLATE_CONFIG` en el código para que encaje con su nuevo diseño profesional.
2. **Archivos corruptos (Error de renderizado a PDF):** Algunos PDFs generados resultan ser archivos de código HTML (una página de error/login de Google) en lugar del documento correcto.
   - *Razonamiento Técnico:* El endpoint interno de Google (`.../export?exportFormat=pdf...`) es susceptible a **Rate Limiting** (limitación de tasa). Cuando un script en un bucle `for` hace decenas de solicitudes de descarga seguidas, los servidores de Google colapsan silenciosamente y devuelven una página web de error (HTML `<!DOCTYPE html>...`) en lugar de arrojar una excepción. El script de la Etapa 4 captura ese HTML pensando que es el PDF.
   - *Plan de Mitigación:* 
     1. Aumentar el tiempo de espera (`Utilities.sleep`) a 2500ms.
     2. Validar que la respuesta sea un PDF real leyendo las cabeceras (`response.getHeaders()['Content-Type'] !== 'application/pdf'`).
     3. Implementar un bucle `while` de reintentos (*Retry Pattern*) si falla.

3. **Error Humano (ReferenceError):** El usuario reportó un error `extractStudentData is not defined`. Esto ocurrió porque, al intentar actualizar solo el módulo 3, el usuario borró accidentalmente el código de los módulos 1 y 2 de su editor.
   - *Solución:* Entregar nuevamente el código monolítico completo (Módulos 1, 2 y 3) para evitar ensamblajes manuales propensos a errores.

4. **Límite de Tiempo de Ejecución (Exceeded maximum execution time):** Al procesar un curso completo de ~40 alumnos, el tiempo total de generación de PDFs más las esperas obligatorias (para evitar el Rate Limiting) superó los 6 minutos (límite de cuota estricto de Google Apps Script para cuentas gratuitas).
   - *Razonamiento Técnico:* Google interrumpe cualquier script a los 6 minutos exactos. Al tener pausas intencionales para no colapsar el exportador de PDF, es matemáticamente imposible procesar 40 alumnos en una sola corrida sin chocar con este muro.
   - *Plan de Mitigación (Arquitectura Resumible):* Se utilizará `PropertiesService` para guardar el estado (el índice del último alumno procesado). El script calculará su propio tiempo de ejecución y, al llegar a los 4.5 minutos, se auto-detendrá amigablemente y guardará el progreso. Al ejecutarlo de nuevo, preguntará al usuario si desea continuar desde donde se quedó.

