# BAST · Detail Intelligence — Retool Blueprint

> Spec para reconstruir la dashboard **Detail Intelligence v5** dentro de Retool.
> No incluye datos. Define **estructura, estética, contrato I/O, fuentes y eventos**.
> Usar junto con `bast_detail_schema.json` (contrato de payload) y `bast_detail_bootstrap.json` (manifest compacto).

---

## 1. Objetivo del dashboard

Vista única que consolida **6 fuentes de precio por SKU** del catálogo Heineman para responder en un golpe de vista a:

- ¿En qué SKUs **somos más baratos** que el mercado?
- ¿Dónde tenemos **mayor margen acumulable** (cost vs min_market × qty)?
- ¿Qué **leads/sales** ya están moviéndose en pipeline y a qué precio?
- ¿Qué SKUs **carecen de price discovery** (ws1/ws2/MSRP) y necesitan investigación?

---

## 2. Layout (12 columnas, mobile breakpoint = 8)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Header  · title (h2) + subtitle + 3 controles a la derecha              │  rows 0-1
├─────────────────────────────────────────────────────────────────────────┤
│ Filters · [parámetro orden] [categoría] [search] [exportCSV]            │  row 2
├─────────────────────────────────────────────────────────────────────────┤
│ Hero KPIs · 6 statistic cards en línea (2 cols cada una)                │  rows 3-4
│ ┌────────┬────────┬────────┬────────┬────────┬────────┐                 │
│ │ violet │  blue  │  cyan  │ green  │  pink  │ amber  │                 │
│ └────────┴────────┴────────┴────────┴────────┴────────┘                 │
├─────────────────────────────────────────────────────────────────────────┤
│ Pipeline funnel (7 cols)        │  Top categorías (5 cols)              │  rows 5-9
│ 6 etapas · barra horizontal     │  10 filas · barra horizontal · click  │
├─────────────────────────────────────────────────────────────────────────┤
│ Detail rows table (12 cols · sticky header · grouped headers · 19 cols) │  rows 10-22
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Resources requeridos

Crear en **Retool > Resources** uno de los siguientes (o mantener uno existente con la misma forma):

| Resource id        | Tipo        | Tabla / endpoint                                  | Notas |
|--------------------|-------------|---------------------------------------------------|-------|
| `bast_supabase`    | PostgreSQL  | `public.detail_intelligence_v` (vista materializada) | **Recomendado.** Una sola vista que ya devuelve las 26 columnas del schema. |
| `bast_rest`        | REST API    | `GET /api/detail-intelligence`                     | Endpoint que devuelve `{ rows: [...] }` con el shape del JSON Schema. |
| `bast_hubspot`     | HubSpot     | OAuth Hub `148358528`                              | Solo para deeplinks de Order ID; no obligatorio para datos. |
| `bast_slack`       | Slack       | Workspace `T0B05EVQ19A` channel `C0B08DKCUBU`     | Solo para deeplinks. |

> Si la fuente es Supabase, la vista `detail_intelligence_v` se construye en SQL así (idea conceptual, no datos):
>
> ```sql
> CREATE OR REPLACE VIEW detail_intelligence_v AS
> SELECT
>   c.barcode, c.name, c.brand, c.category, c.size, c.sku, c.cost,
>   o.last_seen_at AS offer_date, o.id AS offer_id,
>   s.order_id, s.unit_price AS sale_price, s.closed_at AS sale_date, s.qty AS sale_qty,
>   ln1.price AS ws1_price, ln1.company AS ws1_company,
>   ln2.price AS ws2_price, ln2.company AS ws2_company,
>   t.avg_price AS trader_price,
>   m.primary  AS msrp,  m.secondary AS msrp2,
>   LEAST(ln1.price, ln2.price, t.avg_price, m.primary, m.secondary) AS min_market,
>   GREATEST(ln1.price, ln2.price, t.avg_price, m.primary, m.secondary) AS max_market,
>   (c.cost < LEAST(ln1.price, ln2.price, t.avg_price, m.primary, m.secondary)) AS we_cheaper,
>   ROUND(((LEAST(...) - c.cost) / NULLIF(LEAST(...), 0)) * 100, 1) AS margin_pct,
>   (LEAST(...) - c.cost) AS margin_eur
> FROM catalog c
> LEFT JOIN offers o      ON o.sku = c.sku AND o.active
> LEFT JOIN sales  s      ON s.barcode = c.barcode AND s.status IN ('won','requested')
> LEFT JOIN lists_now ln1 ON ln1.barcode = c.barcode AND ln1.rank = 1
> LEFT JOIN lists_now ln2 ON ln2.barcode = c.barcode AND ln2.rank = 2
> LEFT JOIN traders t     ON t.barcode = c.barcode
> LEFT JOIN msrp m        ON m.barcode = c.barcode;
> ```

---

## 4. Queries (en este orden de creación)

| # | name | type | runs on page load | depende de | propósito |
|---|------|------|-------------------|------------|-----------|
| 1 | `detailRaw` | SQL/REST query al resource | ✅ | resource | Devuelve `rows[]` crudas. Cero transformación. |
| 2 | `detailData` | JSQuery transformer | ✅ | `detailRaw` | Empaqueta `{ rows, generatedAt: moment().toISOString(), currency: 'EUR' }`. |
| 3 | `detailRows` | JSQuery transformer | ✅ | `detailData`, `detailParam`, `detailCategory` | Filtra por categoría, ordena por parámetro, agrega `heat_*` (quintile rank por columna). Ver §7. |
| 4 | `kpis` | JSQuery transformer | ✅ | `detailData` | Devuelve `{ total_items, with_sale, with_ws1, with_msrp, avg_margin_pct, total_opportunity_eur, total_sale_value_eur }`. Fórmulas en `bast_detail_schema.json#x-derivedKpis`. |
| 5 | `funnelRows` | JSQuery transformer | ✅ | `detailData` | Devuelve los 6 stages del funnel con `{ stage, count, pct, palette }`. Fórmulas en `#x-funnelStages`. |
| 6 | `categoryRows` | JSQuery transformer | ✅ | `detailData` | Top 10 categorías por count desc. |
| 7 | `categoryOptions` | JSQuery transformer | ✅ | `categoryRows` | `[{label:'Todas las categorías', value:''}, ...categoryRows.map(...)]`. |
| 8 | `exportCsv` | JSQuery on-click | manual | `detailRows` | `utils.exportData({{detailRows.value}}, 'detail_intelligence_'+moment().format('YYYY-MM-DD'), 'csv')`. |

> Toda la lógica está en transformers JS. El resource backend solo tiene que servir `rows[]`.

---

## 5. Componentes (widgets)

### 5.1 Header

| name | tipo | binding | estilo |
|------|------|---------|--------|
| `title` | Text | markdown `## Detail Intelligence` | color `--text-primary` |
| `subtitle` | Text | `Cada fila consolida 6 fuentes · catálogo · ofertas · sales · wholesale 1/2 · trader · MSRP · todo linkeable al origen` | color `--text-muted`, fontSize 13 |
| `lastSyncBadge` | Tag | `Última sync: {{ moment({{detailData.value.generatedAt}}).fromNow() }}` | tagColor: green si <15min, amber si <1h, red si >1h |

### 5.2 Filtros (row 2)

| name | tipo | binding | default | onChange |
|------|------|---------|---------|----------|
| `detailParam` | Select | options ver §6 | `best_margin` | `detailRows.trigger()` |
| `detailCategory` | Select | `data: {{categoryOptions.value}}` | `''` | `detailRows.trigger()` |
| `detailSearch` | Text Input | placeholder `Buscar barcode, nombre, brand...` | `''` | debounce 250ms → `detailRows.trigger()` |
| `detailExport` | Button | `Exportar CSV` | — | `exportCsv.trigger()` |

### 5.3 Hero KPIs (row 3-4 · 6 cards)

Cada card es **Statistic** con `background: linear-gradient(135deg, <c1> 0%, <c2> 100%)`, `color: #FFFFFF`.

| name | label | primaryValue | secondaryLabel | gradient |
|------|-------|--------------|----------------|----------|
| `kpi1_items` | SKUs activos | `{{kpis.value.total_items}}` | `catálogo Heineman` | `#6D28D9 → #8B5CF6` violet |
| `kpi2_ws1` | Con price discovery | `{{kpis.value.with_ws1}}` | `{{Math.round(kpis.value.with_ws1*100/kpis.value.total_items)}}% del catálogo` | `#1D4ED8 → #3B82F6` blue |
| `kpi3_msrp` | Con MSRP comparado | `{{kpis.value.with_msrp}}` | `{{Math.round(kpis.value.with_msrp*100/kpis.value.total_items)}}% del catálogo` | `#0E7490 → #06B6D4` cyan |
| `kpi4_sale` | Sales en pipeline | `{{kpis.value.with_sale}}` | `€ {{Number(kpis.value.total_sale_value_eur).toLocaleString('es-ES',{minimumFractionDigits:2})}} valor pipeline` | `#047857 → #10B981` green |
| `kpi5_margin` | Margen promedio | `{{kpis.value.avg_margin_pct.toFixed(1)}}%` | `vs precio más bajo del mercado` | `#BE185D → #EC4899` pink |
| `kpi6_opp` | Oportunidad total | `€ {{Number(kpis.value.total_opportunity_eur).toLocaleString('es-ES',{minimumFractionDigits:2})}}` | `margen acumulable` | `#B45309 → #F59E0B` amber |

### 5.4 Funnel (row 5-9, cols 0-7)

Componente: **Listview** + Container por fila, o **Custom Component** simple.
Data: `{{funnelRows.value}}`.

Por fila renderizar:
```
[ stage label · 30%w ] [ progress bar · 50%w · width = count/maxCount * 100% · gradient(palette) ] [ count · 10%w ] [ pct · 10%w ]
```

### 5.5 Top categorías (row 5-9, cols 7-12)

Componente: **Table** mínima.
Data: `{{categoryRows.value}}`.
Columnas: `name` (tag), `count` (number).
Click en fila: `detailCategory.setValue({{currentRow.name}}); detailRows.trigger()`.

### 5.6 Detail rows table (row 10-22, full width)

Componente: **Table** (new Table widget v3+).
Data: `{{detailRows.value}}`.
Settings:
- `rowHeight: compact`
- `stickyHeader: true`
- `searchEnabled: true` (se usa `detailSearch` para no duplicar)
- `exportEnabled: true`
- `paginationType: virtual` (80+ filas)

**Columnas (19) y heatmap** — ver tabla §6.

**Grupos de columnas (header gradient)**:

| Grupo | Columnas | Gradient |
|-------|----------|----------|
| ITEM           | barcode · name · brand · category | `#6D28D9 → #8B5CF6` violet |
| OFFERS WE HAVE | sku · cost · offer_date            | `#1D4ED8 → #3B82F6` blue |
| SALES / NEED   | order_id · sale_price · sale_date · sale_qty | `#047857 → #10B981` green |
| WHOLESALE 1    | ws1_price · ws1_company            | `#0E7490 → #06B6D4` cyan |
| WHOLESALE 2    | ws2_price · ws2_company            | `#155E75 → #0891B2` cyan-dark |
| TRADER         | trader_price                        | `#B45309 → #F59E0B` amber |
| MSRP           | msrp · msrp2 · margin_pct          | `#BE185D → #EC4899` pink |

**Row actions** (overflow menu por fila):
- `Abrir en HubSpot` → `https://app.hubspot.com/contacts/148358528/objects/0-1/views/all/list?searchString={{currentRow.brand}}`
- `Buscar en Slack` → `https://app.slack.com/client/T0B05EVQ19A/C0B08DKCUBU?query={{currentRow.barcode}}`
- `Buscar MSRP en Amazon` → `https://www.amazon.com/s?k={{encodeURIComponent(currentRow.brand+' '+currentRow.name)}}`

**Empty state**: `No hay filas con esos filtros. Probá quitar la categoría o cambiar el parámetro de orden.`

---

## 6. Mapping completo de columnas

| Col | key | label | format | decimales | linkType | linkTarget | heatmap palette | heatmap invert | rank field |
|-----|-----|-------|--------|-----------|----------|------------|-----------------|----------------|------------|
| 1 | barcode | Barcode | string | — | internal | `#catalog` | — | — | — |
| 2 | name | Item | string | — | internal | `#catalog` | — | — | — |
| 3 | brand | Brand | string | — | — | — | — | — | — |
| 4 | category | Categoría | tag (violet) | — | — | — | — | — | — |
| 5 | sku | SKU Heineman | mono | — | — | — | — | — | — |
| 6 | cost | Cost | currency EUR | 2 | — | — | green | **true** | heat_cost |
| 7 | offer_date | Offer Date | date YYYY-MM-DD | — | internal | `#ofertas` | — | — | — |
| 8 | order_id | Order ID | mono | — | internal | `#leads` | — | — | — |
| 9 | sale_price | Sale Price | currency EUR | 2 | — | — | green | false | heat_sale_price |
| 10 | sale_date | Sale Date | date | — | — | — | — | — | — |
| 11 | sale_qty | Qty | integer | 0 | — | — | green | false | heat_sale_qty |
| 12 | ws1_price | WS1 Price | currency EUR | 2 | — | — | blue | false | heat_ws1 |
| 13 | ws1_company | WS1 Company | string | — | internal | `#listas` | — | — | — |
| 14 | ws2_price | WS2 Price | currency EUR | 2 | — | — | cyan | false | heat_ws2 |
| 15 | ws2_company | WS2 Company | string | — | internal | `#listas` | — | — | — |
| 16 | trader_price | Trader Price | currency EUR | 2 | — | — | amber | false | heat_trader |
| 17 | msrp | MSRP | currency EUR | 2 | external | Amazon search | pink | false | heat_msrp |
| 18 | msrp2 | MSRP 2 | currency EUR | 2 | external | Amazon search | pink | false | heat_msrp2 |
| 19 | margin_pct | Margen % | number + % suffix | 1 | — | — | margin (violet) | false | heat_margin |

### 6.1 Parámetros de orden (`detailParam`)

| value | label | sort logic |
|-------|-------|------------|
| `best_margin` | Mayor margen | `margin_pct desc, nulls last` |
| `cheapest` | Cost más bajo | `cost asc, nulls last` |
| `highest_msrp` | MSRP más alto | `msrp desc, nulls last` |
| `recent_offer` | Oferta reciente | `offer_date desc` |
| `recent_sale` | Sale reciente | `sale_date desc, nulls last` |
| `highest_qty` | Mayor cantidad | `sale_qty desc, nulls last` |

### 6.2 Heatmap quintile (palette × 5 niveles)

Por cada columna con heatmap, calcular el quintile rank (1..5) sobre los valores no-null de esa columna en `detailData.value.rows` (el universo, no las filas filtradas — para que el contraste no cambie al filtrar). `invert: true` significa low value → high heat.

| Palette | Q1 | Q2 | Q3 | Q4 | Q5 (más caliente) |
|---------|----|----|----|----|---|
| green   | `#0F4031` | `#136D45` | `#178757` | `#1AA66B` | `#22C55E` |
| blue    | `#172554` | `#1E3A8A` | `#2563EB` | `#3B82F6` | `#60A5FA` |
| cyan    | `#0E3A4A` | `#0F4D5C` | `#0E7490` | `#0891B2` | `#06B6D4` |
| amber   | `#451A03` | `#78350F` | `#B45309` | `#D97706` | `#F59E0B` |
| pink    | `#500724` | `#831843` | `#BE185D` | `#DB2777` | `#EC4899` |
| margin  | `#2E1065` | `#4C1D95` | `#6D28D9` | `#7C3AED` | `#8B5CF6` |

Texto siempre `#FFFFFF`. Celda vacía → `td-empty` (color `#475569`, contenido `—`).

---

## 7. Transformer `detailRows` (JS de referencia)

```js
const all = {{detailData.value}}.rows;
const cat = {{detailCategory.value}} || '';
const param = {{detailParam.value}} || 'best_margin';
const q = ({{detailSearch.value}} || '').toLowerCase().trim();

let rows = all.slice();
if (cat) rows = rows.filter(r => r.category === cat);
if (q) rows = rows.filter(r =>
  (r.barcode||'').toLowerCase().includes(q) ||
  (r.name||'').toLowerCase().includes(q) ||
  (r.brand||'').toLowerCase().includes(q) ||
  (r.sku||'').toLowerCase().includes(q)
);

const sortMap = {
  best_margin:  { k: 'margin_pct',  dir: 'desc' },
  cheapest:     { k: 'cost',        dir: 'asc'  },
  highest_msrp: { k: 'msrp',        dir: 'desc' },
  recent_offer: { k: 'offer_date',  dir: 'desc' },
  recent_sale:  { k: 'sale_date',   dir: 'desc' },
  highest_qty:  { k: 'sale_qty',    dir: 'desc' },
};
const { k, dir } = sortMap[param] || sortMap.best_margin;
rows.sort((a, b) => {
  const va = a[k] == null ? (dir==='asc' ? Infinity : -Infinity) : a[k];
  const vb = b[k] == null ? (dir==='asc' ? Infinity : -Infinity) : b[k];
  if (typeof va === 'string') return dir==='asc' ? va.localeCompare(vb) : vb.localeCompare(va);
  return dir==='asc' ? va - vb : vb - va;
});

// quintile rank por columna sobre el universo entero
const cols = ['cost','sale_price','sale_qty','ws1_price','ws2_price','trader_price','msrp','msrp2','margin_pct'];
const sortedByCol = {};
cols.forEach(c => sortedByCol[c] = all.map(r=>r[c]).filter(v=>v!=null && !isNaN(v)).sort((a,b)=>a-b));
const quintile = (val, sorted, invert) => {
  if (val == null || isNaN(val) || !sorted.length) return 0;
  let pos = sorted.findIndex(v => v >= val);
  if (pos === -1) pos = sorted.length - 1;
  let pct = pos / Math.max(1, sorted.length - 1);
  if (invert) pct = 1 - pct;
  if (pct >= 0.8) return 5;
  if (pct >= 0.6) return 4;
  if (pct >= 0.4) return 3;
  if (pct >= 0.2) return 2;
  return 1;
};

return rows.map(r => Object.assign({}, r, {
  heat_cost:       quintile(r.cost,         sortedByCol.cost,         true),
  heat_sale_price: quintile(r.sale_price,   sortedByCol.sale_price,   false),
  heat_sale_qty:   quintile(r.sale_qty,     sortedByCol.sale_qty,     false),
  heat_ws1:        quintile(r.ws1_price,    sortedByCol.ws1_price,    false),
  heat_ws2:        quintile(r.ws2_price,    sortedByCol.ws2_price,    false),
  heat_trader:     quintile(r.trader_price, sortedByCol.trader_price, false),
  heat_msrp:       quintile(r.msrp,         sortedByCol.msrp,         false),
  heat_msrp2:      quintile(r.msrp2,        sortedByCol.msrp2,        false),
  heat_margin:     quintile(r.margin_pct,   sortedByCol.margin_pct,   false),
}));
```

Cada columna con heatmap usa **Conditional Formatting** con 5 reglas:
```
Condition: {{ currentRow.heat_<rank_field> }} === 1   →   bg = palette Q1, text #FFFFFF
Condition: {{ currentRow.heat_<rank_field> }} === 2   →   bg = palette Q2, text #FFFFFF
... hasta 5
```

---

## 8. Estética global (theme tokens)

Aplicar en **App settings > Custom CSS** o en **Theme**:

```css
:root {
  --bg-0: #0B0F19;
  --bg-1: #111726;
  --bg-2: #1E293B;
  --border: #334155;
  --text-primary: #F8FAFC;
  --text: #E5E7EB;
  --text-muted: #94A3B8;
  --text-empty: #475569;
  --accent-violet: #8B5CF6;
  --accent-blue:   #3B82F6;
  --accent-cyan:   #06B6D4;
  --accent-green:  #10B981;
  --accent-pink:   #EC4899;
  --accent-amber:  #F59E0B;
  --radius: 12px;
  --font-sans: 'Inter', 'DM Sans', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, monospace;
}

._retool-detailTable thead tr th { background: var(--bg-2) !important; color: var(--text); }
._retool-detailTable tbody td.td-mono { font-family: var(--font-mono); font-size: 10.5px; color: var(--text-muted); }
._retool-detailTable tbody td.td-empty { color: var(--text-empty); }
```

Tipografía: pesos 500 para body, 600 para tags y KPIs, 700 para títulos h2.
Border-radius global 12px en cards y tables.
Sombra de elevación sutil: `0 1px 2px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.2)`.

---

## 9. Eventos / interacciones globales

| Evento | Acción |
|--------|--------|
| `detailParam.onChange` | `detailRows.trigger()` |
| `detailCategory.onChange` | `detailRows.trigger()` |
| `detailSearch.onChange` (debounce 250) | `detailRows.trigger()` |
| `categoryTable.onRowClick` | `detailCategory.setValue({{currentRow.name}}); detailRows.trigger()` |
| `funnelRow.onClick` (custom) | filtro implícito por stage (opcional · v6) |
| `detailExport.onClick` | `exportCsv.trigger()` |
| `detailTable.onRowClick` | abrir modal `rowDetailModal` (opcional · v6) |

---

## 10. Responsive

Breakpoint mobile: 8 columns.
- KPIs pasan a 2 cols × 3 rows
- Funnel y Top categorías se apilan verticalmente
- Detail table mantiene scroll horizontal con sticky `barcode` + `name`

---

## 11. Performance

- Backend devuelve max 5000 rows · paginar después en transformer si crece
- Transformer `detailRows` es O(n log n) por sort, aceptable hasta ~10k rows
- `Table.paginationType = virtual` obligatorio si `detailData.value.rows.length > 200`
- Cachear `detailData` con `cacheKeyTtl: 300` segundos en Retool

---

## 12. Cómo construir esto en Retool en 30 minutos

1. **Crear app vacía** en blanco. Pegar el CSS de §8 en App > Custom CSS.
2. **Crear el Resource** Postgres/REST que apunte al backend de BAST.
3. **Crear `detailRaw`** apuntando a la vista o endpoint. Marcar "Run on page load".
4. **Crear los 7 transformers** del §4 copiando los snippets de §7 y de `bast_detail_schema.json#x-derivedKpis`.
5. **Drag & drop** 6 Statistic widgets para los KPIs · pegar bindings de §5.3.
6. **Drag & drop** los 2 Selects + 1 TextInput + 1 Button del §5.2.
7. **Drag & drop** 2 Tables (funnel + categorías) y configurar sus columnas.
8. **Drag & drop** la Table principal · agregar las 19 columnas con sus formatos · activar Conditional Formatting con las 5 reglas por palette de §6.2 · activar Column groups con los 7 grupos del §5.6.
9. Conectar todos los `onChange` del §9.
10. Probar con datos reales · ajustar paddings · publicar.

---

## 13. Archivos del paquete

| Archivo | Para qué sirve |
|---------|----------------|
| `bast_detail_blueprint.md` | **Este archivo.** Spec leíble que cualquier dev puede seguir paso a paso. |
| `bast_detail_schema.json` | Contrato de datos JSON Schema para validar el payload del backend. |
| `bast_detail_bootstrap.json` | Manifest compacto para pegarle a Retool AI ("Create app from this manifest") o a un script de generación. |
