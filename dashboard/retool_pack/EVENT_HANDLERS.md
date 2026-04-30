# BAST Detail Intelligence — Event Handlers

Catálogo completo de event handlers que la app de Retool debe tener configurados.
Cada sección es copiable y mapea uno a uno con la UI de Retool: Component → Inspector → Event handlers.

**Versión:** 1.0 · **Fecha:** 2026-04-28 · **Idioma:** es-ES
**Constraints:** EUR · YYYY-MM-DD · dark mode · sin emojis · sin signos de exclamación

---

## Tabla de contenido

1. [Resumen ejecutivo](#resumen-ejecutivo)
2. [Tabla maestra de eventos](#tabla-maestra-de-eventos)
3. [Eventos a nivel App](#eventos-a-nivel-app)
4. [Eventos por widget](#eventos-por-widget)
5. [Eventos de queries (success y failure)](#eventos-de-queries-success-y-failure)
6. [Acciones reutilizables](#acciones-reutilizables)
7. [Convenciones y notas](#convenciones-y-notas)
8. [Checklist de implementación](#checklist-de-implementación)

---

## Resumen ejecutivo

El dashboard usa **5 componentes interactivos**, **8 queries** y **1 evento global de app**. Todos los handlers se reducen a tres acciones primitivas:

- `query.trigger()` — vuelve a ejecutar una query de transformación.
- `component.setValue(...)` — fija el valor de un input.
- `utils.openUrl(...)` — abre una URL externa en pestaña nueva.

No hay event handlers de tipo `runScript` ni `showNotification` en la versión 1. Todos los flujos son determinísticos y sin efectos secundarios fuera de las queries declaradas.

---

## Tabla maestra de eventos

| # | Origen | Evento | Acción | Destino | Debounce | Notas |
|---|---|---|---|---|---|---|
| 1 | App | `pageLoad` | `trigger` | `detailRaw, detailData, detailRows, kpis, funnelRows, categoryRows, categoryOptions` | — | Carga inicial encadenada |
| 2 | `detailParam` (Select) | `change` | `trigger` | `detailRows` | 0 | Reordena la tabla |
| 3 | `detailCategory` (Select) | `change` | `trigger` | `detailRows` | 0 | Filtra por categoría |
| 4 | `detailSearch` (Text Input) | `change` | `trigger` | `detailRows` | 250 ms | Búsqueda libre |
| 5 | `detailExport` (Button) | `click` | `trigger` | `exportCsv` | — | Descarga CSV |
| 6 | `categoryTable` (Table) | `rowClick` | `setValue` | `detailCategory` ← `{{currentRow.name}}` | — | Filtro por click |
| 7 | `categoryTable` (Table) | `rowClick` | `trigger` | `detailRows` | — | Encadenado al setValue |
| 8 | `detailTable` (Table) row action | `click` | `openUrl` | HubSpot | — | Acción 1 de fila |
| 9 | `detailTable` (Table) row action | `click` | `openUrl` | Slack | — | Acción 2 de fila |
| 10 | `detailTable` (Table) row action | `click` | `openUrl` | Amazon | — | Acción 3 de fila |
| 11 | `funnelTable` (Table) | `rowClick` | reservado v6 | — | — | No implementar en v1 |

Total v1: **10 handlers activos** + 1 reservado.

---

## Eventos a nivel App

### `app.pageLoad`

Dispara la cadena completa de queries en orden de dependencia.

```yaml
event: pageLoad
debounce: 0
actions:
  - { type: trigger, query: detailRaw }
  - { type: trigger, query: detailData }
  - { type: trigger, query: detailRows }
  - { type: trigger, query: kpis }
  - { type: trigger, query: funnelRows }
  - { type: trigger, query: categoryRows }
  - { type: trigger, query: categoryOptions }
```

**Nota:** si la fuente expone una sola query SQL agregada (`detail_intelligence_v`), basta con disparar `detailRaw` y dejar que las demás se encadenen por `runWhenModelUpdates` con dependencias en `{{detailRaw.data}}`. La lista anterior cubre el caso explícito.

---

## Eventos por widget

### 1. `detailParam` — Select (parámetro de orden)

Opciones: `best_margin`, `cheapest`, `highest_msrp`, `recent_offer`, `recent_sale`, `highest_qty`.

| Event | Action | Target | Value |
|---|---|---|---|
| Change | Trigger query | `detailRows` | — |

```yaml
- event: change
  action: triggerQuery
  query: detailRows
```

---

### 2. `detailCategory` — Select (filtro de categoría)

Datasource: `{{ categoryOptions.value }}`. Valor por defecto: `''` (todas).

| Event | Action | Target | Value |
|---|---|---|---|
| Change | Trigger query | `detailRows` | — |

```yaml
- event: change
  action: triggerQuery
  query: detailRows
```

---

### 3. `detailSearch` — Text Input (búsqueda libre)

Placeholder: `Buscar barcode, nombre, brand...`

| Event | Action | Target | Debounce |
|---|---|---|---|
| Change | Trigger query | `detailRows` | **250 ms** |

```yaml
- event: change
  action: triggerQuery
  query: detailRows
  debounce: 250
```

> El debounce evita disparar la query en cada keystroke. 250 ms es el valor recomendado para inputs de búsqueda en Retool.

---

### 4. `detailExport` — Button (Exportar CSV)

| Event | Action | Target |
|---|---|---|
| Click | Trigger query | `exportCsv` |

```yaml
- event: click
  action: triggerQuery
  query: exportCsv
```

> La query `exportCsv` debe estar configurada con `runType: manual` y resource `JS Query` que llame a `utils.downloadFile(csvBlob, 'bast_detail_intelligence_YYYY-MM-DD.csv')`.

---

### 5. `categoryTable` — Table (Top categorías)

Datasource: `{{ categoryRows.data }}`. Click en fila → fija el filtro de categoría y refresca la tabla principal.

| Event | Action | Target | Value |
|---|---|---|---|
| Row click | Set value | `detailCategory` | `{{ currentRow.name }}` |
| Row click | Trigger query | `detailRows` | — |

```yaml
- event: rowClick
  action: setValue
  target: detailCategory
  value: "{{ currentRow.name }}"

- event: rowClick
  action: triggerQuery
  query: detailRows
```

> Importante: registrar los dos handlers en el mismo evento `rowClick`, en este orden. Retool los ejecuta secuencialmente.

---

### 6. `detailTable` — Table (tabla maestra) · Row Actions

Tres botones contextuales por fila. Cada uno abre una URL externa en pestaña nueva.

#### 6.1 Abrir en HubSpot

| Campo | Valor |
|---|---|
| Label | `Abrir en HubSpot` |
| Icon | `ExternalLink` |
| Event | Click |
| Action | Open URL |
| Target | `_blank` |
| URL | `https://app.hubspot.com/contacts/148358528/objects/0-1/views/all/list?searchString={{ currentRow.brand }}` |

#### 6.2 Buscar en Slack

| Campo | Valor |
|---|---|
| Label | `Buscar en Slack` |
| Icon | `MessageCircle` |
| Event | Click |
| Action | Open URL |
| Target | `_blank` |
| URL | `https://app.slack.com/client/T0B05EVQ19A/C0B08DKCUBU?query={{ currentRow.barcode }}` |

#### 6.3 MSRP en Amazon

| Campo | Valor |
|---|---|
| Label | `MSRP en Amazon` |
| Icon | `Search` |
| Event | Click |
| Action | Open URL |
| Target | `_blank` |
| URL | `https://www.amazon.com/s?k={{ encodeURIComponent(currentRow.brand + ' ' + currentRow.name) }}` |

```yaml
rowActions:
  - label: "Abrir en HubSpot"
    icon: ExternalLink
    onClick:
      action: openUrl
      target: _blank
      url: "https://app.hubspot.com/contacts/148358528/objects/0-1/views/all/list?searchString={{ currentRow.brand }}"

  - label: "Buscar en Slack"
    icon: MessageCircle
    onClick:
      action: openUrl
      target: _blank
      url: "https://app.slack.com/client/T0B05EVQ19A/C0B08DKCUBU?query={{ currentRow.barcode }}"

  - label: "MSRP en Amazon"
    icon: Search
    onClick:
      action: openUrl
      target: _blank
      url: "https://www.amazon.com/s?k={{ encodeURIComponent(currentRow.brand + ' ' + currentRow.name) }}"
```

#### Empty state

```text
No hay filas con esos filtros. Probá quitar la categoría o cambiar el parámetro de orden.
```

---

### 7. `funnelTable` — Table (Pipeline funnel) · reservado para v6

En la versión 1 el funnel es solo informativo. La interactividad de filtrar por etapa (items → withOffer → withWs1 → withMsrp → withSale → weCheaper) está prevista para la versión 6.

```yaml
# v6 (no implementar todavía)
- event: rowClick
  action: triggerQuery
  query: detailRows
  pre:
    - { setValue: stageFilter, value: "{{ currentRow.stage }}" }
```

---

## Eventos de queries (success y failure)

Las queries `detailRaw` (fuente) y `exportCsv` (efecto) son las únicas que conviene instrumentar con handlers de éxito o fallo. El resto son transformaciones puras y no requieren handlers.

### `detailRaw.onFailure`

Mostrar un banner de error en la cabecera con el mensaje de la fuente.

```yaml
query: detailRaw
event: failure
action: setValue
target: errorBanner
value: "{{ 'No se pudo cargar la fuente: ' + detailRaw.error.message }}"
```

### `detailRaw.onSuccess`

Limpiar el banner de error si previamente estaba visible.

```yaml
query: detailRaw
event: success
action: setValue
target: errorBanner
value: ""
```

### `exportCsv.onSuccess`

Sin acción adicional. La descarga se gestiona dentro de la propia JS query.

### `exportCsv.onFailure`

```yaml
query: exportCsv
event: failure
action: showNotification
notification:
  type: error
  title: "Export falló"
  description: "{{ exportCsv.error.message }}"
  duration: 5
```

> Excepción a la regla del resumen: este es el único `showNotification` autorizado en v1, porque la descarga es una acción terminal del usuario.

---

## Acciones reutilizables

Si Retool admite definir actions reutilizables a nivel global (Workflows / Custom actions), conviene crear las siguientes para evitar duplicar lógica:

### `refreshDetail`

```yaml
name: refreshDetail
steps:
  - { action: trigger, query: detailRows }
```

Usar en lugar de `detailRows.trigger()` en los 5 handlers que ya lo invocan.

### `applyCategoryFilter(category)`

```yaml
name: applyCategoryFilter
params: [category]
steps:
  - { action: setValue, target: detailCategory, value: "{{ category }}" }
  - { action: trigger, query: detailRows }
```

Usar en `categoryTable.rowClick` y, opcionalmente, en links externos que pasen una categoría por query string.

---

## Convenciones y notas

1. **Orden de actions dentro de un mismo evento:** Retool ejecuta secuencialmente en el orden de la lista. Si un handler depende del valor recién fijado por el anterior, dejarlo después.
2. **Debounce solo en `detailSearch`:** los selects no necesitan debounce porque cada cambio es discreto.
3. **No usar `runScript` para tareas que se pueden resolver con triggers:** reduce coste de mantenimiento.
4. **Todos los textos visibles deben respetar:** sin emojis, sin signos de exclamación, español es-ES.
5. **`exportCsv`:** debe quedar como JS query manual, nunca como SQL. La generación del CSV se hace en cliente para incluir filtros aplicados.
6. **Locales:** el botón `detailExport` lleva label `Exportar CSV` (no `Export CSV`).

---

## Checklist de implementación

Marcar cada item al configurar la app en Retool.

- [ ] App > Settings > onLoad → 7 triggers en cadena.
- [ ] `detailParam` Select → onChange → trigger `detailRows`.
- [ ] `detailCategory` Select → onChange → trigger `detailRows`.
- [ ] `detailSearch` Text Input → onChange → trigger `detailRows` con debounce 250 ms.
- [ ] `detailExport` Button → onClick → trigger `exportCsv`.
- [ ] `categoryTable` Table → onRowClick → setValue `detailCategory` + trigger `detailRows`.
- [ ] `detailTable` row actions → 3 botones con `openUrl` (HubSpot, Slack, Amazon).
- [ ] `detailRaw` query → onSuccess limpia banner + onFailure muestra banner.
- [ ] `exportCsv` query → onFailure showNotification.
- [ ] Funnel table → SIN handlers en v1 (reservado para v6).

---

**Documento mantenido por:** Equipo BAST
**Próxima revisión:** con la entrega de la versión 6.
