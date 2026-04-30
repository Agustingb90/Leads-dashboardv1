# BAST · Detail Intelligence

> Dashboard de inteligencia de pricing que consolida 6 fuentes de precio por SKU del catálogo Heineman para identificar oportunidades de margen en tiempo real.

---

## Tabla de contenidos

1. [Qué es](#1-qué-es)
2. [Por qué existe](#2-por-qué-existe)
3. [Arquitectura](#3-arquitectura)
4. [Stack y dependencias](#4-stack-y-dependencias)
5. [Estructura de archivos del paquete](#5-estructura-de-archivos-del-paquete)
6. [Fuentes de datos](#6-fuentes-de-datos)
7. [Contrato de payload](#7-contrato-de-payload)
8. [Instalación en Retool](#8-instalación-en-retool)
9. [Configuración del backend](#9-configuración-del-backend)
10. [Mantenimiento](#10-mantenimiento)
11. [Roadmap](#11-roadmap)
12. [Soporte y contacto](#12-soporte-y-contacto)

---

## 1. Qué es

**BAST · Detail Intelligence** es un dashboard que muestra una sola fila por SKU del catálogo Heineman, consolidando en cada fila la información de **6 fuentes diferentes**: catálogo maestro, ofertas activas, sales/need list, dos niveles de precio mayorista, precio promedio de traders independientes, y dos referencias de MSRP público.

Sobre esa estructura aplica un sistema de **heatmap quintile por columna** que destaca visualmente dónde está la oportunidad de margen, y un sistema de **filtros por parámetro** (mejor margen, costo más bajo, MSRP más alto, oferta más reciente, sale más reciente, mayor cantidad).

Todas las celdas son linkeables al origen: barcode → catálogo, offer date → ofertas, order id → leads, ws company → listas NOW, MSRP → búsqueda en Amazon. Un menú de acciones por fila abre el contacto en HubSpot, el canal de Slack del proyecto, y la búsqueda externa.

## 2. Por qué existe

Antes de Detail Intelligence, los traders tenían que cruzar manualmente cinco hojas de cálculo distintas para responder preguntas básicas:

- ¿En qué SKUs somos más baratos que el mercado?
- ¿Dónde tengo mayor margen acumulable (cost vs min_market × qty)?
- ¿Qué SKUs no tienen price discovery todavía?
- ¿Qué leads están moviéndose en pipeline y a qué precio?

Detail Intelligence resuelve las cuatro en un golpe de vista, con todos los datos vivos de Supabase, HubSpot y las listas NOW, y exporta a CSV cuando hace falta.

## 3. Arquitectura

```
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│  Catálogo        │    │  Listas NOW      │    │  HubSpot Deals   │
│  Heineman (CSV)  │    │  (CSV semanal)   │    │  (API)           │
└────────┬─────────┘    └────────┬─────────┘    └────────┬─────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 ▼
                    ┌─────────────────────────┐
                    │   Supabase Postgres     │
                    │   public.* (raw tables) │
                    └────────────┬────────────┘
                                 ▼
                    ┌─────────────────────────┐
                    │   detail_intelligence_v │
                    │   (vista materializada) │
                    └────────────┬────────────┘
                                 ▼
                    ┌─────────────────────────┐
                    │   Retool resource       │
                    │   bast_main             │
                    └────────────┬────────────┘
                                 ▼
            ┌─────────────────────────────────────┐
            │   Retool App                        │
            │   ─────────────────                 │
            │   detailRaw (resource query)        │
            │      ↓                              │
            │   detailData (transformer)          │
            │      ↓                              │
            │   detailRows · kpis · funnelRows    │
            │   categoryRows · categoryOptions    │
            │      ↓                              │
            │   16 widgets nativos                │
            └─────────────────────────────────────┘
```

Toda la transformación (KPIs, funnel, top categorías, heatmap quintile) ocurre en **transformers JS dentro de Retool**. El backend solo devuelve `rows[]`. Esto mantiene la lógica versionada en Retool y evita ida y vuelta con el equipo de datos.

## 4. Stack y dependencias

| Capa | Tecnología | Versión mínima | Rol |
|------|------------|----------------|-----|
| UI / queries | Retool | 3.6+ | Editor visual y runtime |
| Base de datos | PostgreSQL via Supabase | 14+ | Tablas raw + vista consolidada |
| Resource Retool | Postgres o REST API | — | Conexión a la vista |
| CRM | HubSpot (Hub `148358528`) | — | Solo para deeplinks de leads |
| Comunicación | Slack (`T0B05EVQ19A` / `C0B08DKCUBU`) | — | Solo para deeplinks |
| Idioma de UI | español (`es-ES`) | — | Hard requirement |
| Moneda | EUR (`€`) | — | Todas las columnas monetarias |
| Formato de fecha | `YYYY-MM-DD` | — | ISO-8601 sin hora |

## 5. Estructura de archivos del paquete

```
retool_pack/
├── README.md                    ← este archivo · setup + arquitectura
├── USER_DOCUMENTATION.md        ← guía de uso para el usuario final
├── bast_detail_blueprint.md     ← spec técnica completa paso a paso
├── bast_detail_schema.json      ← JSON Schema 2020-12 del payload
├── bast_detail_bootstrap.json   ← manifest declarativo (resources + queries + widgets)
└── bast_detail_retool_unified.json   ← los 3 anteriores en un solo JSON
```

**Cuándo usar cuál:**

- ¿Vas a construir la app a mano siguiendo instrucciones? → `bast_detail_blueprint.md`
- ¿Vas a usar Retool AI para generarla? → pegale `bast_detail_retool_unified.json`
- ¿Tu equipo de backend tiene que armar el endpoint? → `bast_detail_schema.json`
- ¿Sos el usuario final del dashboard? → `USER_DOCUMENTATION.md`

## 6. Fuentes de datos

| Fuente | Tabla raw | Owner | Frecuencia de actualización | Notas |
|--------|-----------|-------|------------------------------|-------|
| Catálogo Heineman | `public.catalog` | Operations | Mensual (CSV manual) | Master de SKUs · barcode como ID estable |
| Ofertas activas | `public.offers` | Operations | Diaria (sync Heineman) | Solo `active = true` |
| Sales / Need list | `public.sales` | Sales | Cuando se cierra deal | Status `won` o `requested` |
| Listas NOW | `public.lists_now` | Trading | Semanal (CSV) | `rank=1` es el mayorista principal |
| Traders | `public.traders` | Trading | Quincenal | Promedio de 3+ traders independientes |
| MSRP | `public.msrp` | Operations | Mensual | `primary` = web oficial · `secondary` = retailer alternativo |

## 7. Contrato de payload

El backend (vista Postgres o endpoint REST) debe devolver un objeto con la siguiente forma:

```ts
{
  rows: Row[];
  generatedAt?: string;   // ISO-8601 UTC
  currency?: string;      // ISO 4217, default 'EUR'
}

type Row = {
  // ITEM
  barcode: string;        // EAN/UPC · ID estable
  name: string;
  brand: string;
  category: string;
  size?: string | null;

  // OFFERS WE HAVE
  sku: string;
  cost: number | null;
  offer_date: string | null;   // YYYY-MM-DD
  offer_id: string | null;

  // SALES / NEED LIST
  order_id: string | null;
  sale_price: number | null;
  sale_date: string | null;
  sale_qty: number | null;

  // WHOLESALE 1
  ws1_price: number | null;
  ws1_company: string | null;

  // WHOLESALE 2
  ws2_price: number | null;
  ws2_company: string | null;

  // TRADER
  trader_price: number | null;

  // MSRP
  msrp: number | null;
  msrp2: number | null;

  // DERIVED (calculado en backend)
  min_market: number | null;
  max_market: number | null;
  we_cheaper: boolean;
  margin_pct: number | null;
  margin_eur: number | null;
};
```

La spec completa con anotaciones (`x-source`, `x-format`, `x-link`, `x-heatmap`) está en `bast_detail_schema.json`.

## 8. Instalación en Retool

### Vía rápida (recomendada): construcción asistida con Retool AI

1. En Retool, **Apps → Create new → Blank app**.
2. Abrir Retool AI (panel izquierdo).
3. Pegar el contenido completo de `bast_detail_retool_unified.json`.
4. Prompt:
   > *Construí esta app respetando exactamente la sección `bootstrap` del JSON. Aplicá los `themeTokens` como Custom CSS. Conectá el resource `bast_main` con la conexión Postgres de Supabase ya configurada en mi instancia. Los datos los toma desde `detail_intelligence_v`.*
5. Retool AI genera resources, queries y widgets siguiendo el manifest.
6. Verificar el dashboard contra la sección 5 del blueprint.

### Vía manual

1. Crear app en blanco · pegar el CSS de §8 del blueprint en **App settings > Custom CSS**.
2. Crear resource Postgres apuntando a Supabase. Nombrarlo `bast_main`.
3. Crear las **8 queries** en orden (ver `bast_detail_blueprint.md` §4).
4. Drag & drop los **16 widgets** (6 KPIs + 4 filtros + 2 tablas auxiliares + 1 tabla principal + 3 textos).
5. Configurar columnas, formatos y conditional formatting de la tabla principal.
6. Conectar todos los `onChange` listados en §9 del blueprint.
7. Aplicar responsive rules.
8. Publicar.

Tiempo estimado: **30 min** vía manual, **5 min** vía Retool AI.

## 9. Configuración del backend

### Opción A · Vista materializada en Supabase (recomendado)

```sql
CREATE MATERIALIZED VIEW IF NOT EXISTS public.detail_intelligence_v AS
SELECT
  c.barcode, c.name, c.brand, c.category, c.size,
  c.sku, c.cost,
  o.last_seen_at::date AS offer_date,
  o.id AS offer_id,
  s.order_id,
  s.unit_price AS sale_price,
  s.closed_at::date AS sale_date,
  s.qty AS sale_qty,
  ln1.price AS ws1_price, ln1.company AS ws1_company,
  ln2.price AS ws2_price, ln2.company AS ws2_company,
  t.avg_price AS trader_price,
  m.primary AS msrp, m.secondary AS msrp2,
  LEAST(ln1.price, ln2.price, t.avg_price, m.primary, m.secondary) AS min_market,
  GREATEST(ln1.price, ln2.price, t.avg_price, m.primary, m.secondary) AS max_market,
  (c.cost < LEAST(ln1.price, ln2.price, t.avg_price, m.primary, m.secondary)) AS we_cheaper,
  ROUND(
    ((LEAST(ln1.price, ln2.price, t.avg_price, m.primary, m.secondary) - c.cost)
     / NULLIF(LEAST(ln1.price, ln2.price, t.avg_price, m.primary, m.secondary), 0) * 100)::numeric,
    1
  ) AS margin_pct,
  (LEAST(ln1.price, ln2.price, t.avg_price, m.primary, m.secondary) - c.cost) AS margin_eur
FROM public.catalog c
LEFT JOIN public.offers     o   ON o.sku = c.sku AND o.active
LEFT JOIN public.sales      s   ON s.barcode = c.barcode AND s.status IN ('won','requested')
LEFT JOIN public.lists_now  ln1 ON ln1.barcode = c.barcode AND ln1.rank = 1
LEFT JOIN public.lists_now  ln2 ON ln2.barcode = c.barcode AND ln2.rank = 2
LEFT JOIN public.traders    t   ON t.barcode = c.barcode
LEFT JOIN public.msrp       m   ON m.barcode = c.barcode;

CREATE UNIQUE INDEX ON public.detail_intelligence_v (barcode);
```

Refresh sugerido: **cada 30 minutos** vía pg_cron, o on-demand desde Retool con un botón de "Refrescar datos".

### Opción B · Endpoint REST

`GET /api/detail-intelligence` que devuelve `{ rows: Row[] }`. La validación del payload se puede hacer con un middleware Zod usando los tipos del JSON Schema.

## 10. Mantenimiento

| Acción | Cuándo | Responsable |
|--------|--------|-------------|
| Refresh de la vista materializada | Cada 30 min (pg_cron) | DBA |
| Sync del catálogo Heineman | Cada vez que llega nuevo CSV | Operations |
| Actualizar listas NOW | Lunes 9am UTC | Trading |
| Ajustar paletas de heatmap | Si las quintiles dejan de discriminar | Frontend |
| Versionar cambios del schema | Cada vez que se agrega una columna | Backend + Frontend |

### Política de versionado

El paquete sigue **semver**. Cambios breaking en `Row` (rename o delete de propiedad) requieren bump de major y migración coordinada de la vista + la app Retool.

## 11. Roadmap

- **v6** · Drill-down modal por fila con histórico de precios mensual
- **v6** · Funnel etapas clicables que filtran la tabla principal
- **v7** · Alertas: notificar a Slack cuando un SKU pasa de `we_cheaper=false` a `true`
- **v7** · Sincronización bidireccional con HubSpot (cambio de price en sale_price actualiza el deal)
- **v8** · Modo competitivo: agregar columnas de competidores específicos (no solo agregados ws1/ws2)

## 12. Soporte y contacto

- **Owner del producto** · Atlas (`atlas@tradinglead.net`)
- **Canal de Slack** · `#bast-dashboard` (workspace `T0B05EVQ19A`)
- **HubSpot Hub** · `148358528`
- **Drive del proyecto** · carpeta `1e48ZJaKlnGbYIFEuPhu2RnLFzjLS5p3R`
- **Repositorio de versiones del dashboard** · ver `bast_dashboard/` en Drive

Para reportar bugs o pedir features, abrir un mensaje en `#bast-dashboard` con el prefijo `[BAST-DI]` y mencionar a Atlas.

---

**Última actualización del README** · Abril 2026
**Versión del paquete** · 1.0.0
