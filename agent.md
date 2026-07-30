# Agents Design Document (agent.md) - Patrón de Módulos GAS

## 1. Propósito del Harness
Definir la arquitectura de componentes de software (módulos o "agentes") en Google Apps Script, delineando sus responsabilidades, entradas, salidas y límites estrictos de autonomía para garantizar un sistema seguro, inmutable en origen y auditable.

## 2. Módulo: `DataExtractor` (Agente Lector)
- **Responsabilidad:** Leer la hoja `cuotas`, parsear los encabezados, identificar pares dinámicos de mes/fecha, y retornar un Array de objetos estandarizados tipo `StudentData`.
- **Entradas:** Ninguna externa (lee directamente la hoja activa `cuotas`).
- **Salidas:** Array de objetos `StudentData`.
- **Límites:** Operaciones de solo lectura (`Range.getValues()`). Cero permisos de escritura. Filtra automáticamente el ruido y los totales en la base de datos.

## 3. Módulo: `TemplateEngine` (Agente Renderizador)
- **Responsabilidad:** Recibir un objeto `StudentData` e inyectar sus valores en rangos específicos (mediante "named ranges" o coordenadas directas) de la hoja física `plantilla_estado_cuenta`.
- **Entradas:** Objeto `StudentData`.
- **Salidas:** Modificación visual de la hoja `plantilla_estado_cuenta`.
- **Límites:** Solo tiene permitido escribir en la hoja de plantilla. Nunca en `cuotas`.

## 4. Módulo: `ReportGenerator` (Agente Exportador)
- **Responsabilidad:** Orquestar el flujo por lotes (Batch). Iterar sobre la lista entregada por `DataExtractor`, invocar a `TemplateEngine`, generar un blob en formato PDF de la plantilla actual, y guardarlo en Google Drive con nomenclatura estandarizada.
- **Entradas:** Array de objetos `StudentData` y referencia a la carpeta de destino en Drive.
- **Salidas:** Archivos PDF guardados físicamente en Google Drive.
- **Dependencias:** Interdependiente; usa `DataExtractor` para la materia prima y `TemplateEngine` para formatearla antes del volcado a PDF.

## 5. Módulo: `UIManager` (Agente Controlador de Interfaz)
- **Responsabilidad:** Crear y gestionar el menú superior personalizado ("Tesorería") en Google Sheets para exponer las acciones al usuario final. Capturar interacciones (clics) y gatillar los flujos del sistema.
- **Límites:** No contiene lógica de cálculo de negocio, es meramente una capa de presentación y orquestación inicial.

## 6. Orden de Ejecución y Dependencias
1. El usuario interactúa mediante el menú habilitado por `UIManager`.
2. `UIManager` invoca a `DataExtractor` para obtener la data limpia, validada y estructurada.
3. Se inicia un bucle de control por cada alumno en la lista:
   - *Paso A:* Se envía un registro a `TemplateEngine` para poblar visualmente la plantilla.
   - *Paso B:* `ReportGenerator` captura la hoja, la convierte a PDF y la almacena.
4. Fin del proceso y notificación de éxito al usuario.

## 7. Validaciones por Etapa y Escalamiento a Humano
- **Regla de Escalamiento:** Si `DataExtractor` no encuentra las columnas críticas (`N`, `NOMBRE`) o el patrón esperado para un mes (una columna `FECHA` asociada) no es coherente, el script **debe detenerse inmediatamente**, arrojando un `UI.Alert` al usuario explicando el error estructural. NO DEBE intentar adivinar o rellenar datos faltantes.
- **Manejo de Ambigüedad:** Cualquier fila sin un número de lista (`N`) válido será ignorada por diseño (se asume que es un subtotal, total o nota al margen). Si hay ambigüedad en los encabezados de la fila 1, el sistema aplica una política *fail-safe* y aborta la generación masiva para proteger la integridad del reporte.

## 8. Criterios de Detención y Regla de "No Implementación"
- **Regla estricta:** Este diseño modular no se transcribirá a código fuente (`.gs`) hasta que el tesorero (humano) resuelva las dependencias contables y apruebe explícitamente el inicio de la Fase 2 (Implementación Controlada).
- El paso a la Fase 2 está sujeto a la respuesta del usuario a las preguntas del Gate de Aprobación registradas en el documento `memory.md`.

## 9. Reglas Obligatorias de Documentación
- **Registro de Tareas:** El sistema/agente siempre debe documentar, registrar y rastrear cualquier actividad, requerimiento o funcionalidad a implementar en el archivo de checklist maestro `task.md`.
- **Registro de Razonamiento:** Toda decisión de diseño, análisis de fallos, supuesto técnico o bloqueo encontrado debe quedar plasmado obligatoriamente en el archivo `memory.md`.
