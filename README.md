# Leads-dashboardv1

Monorepo del sistema **BAST Detail Intelligence** — dashboard de pricing, ofertas y oportunidades comerciales para Tradinglead.

> Big Analysis System for Traders · Heineman pricing intelligence · Pipeline visual estilo Pipedrive con enriquecimiento NOWs (Need / Offer / Wish).

---

## Estructura del repo

```
Leads-dashboardv1/
├── dashboard/      Dashboard principal (HTML/CSS/JS estático, datos sintéticos)
├── retool_pack/    Especificación completa para reconstruir el dashboard en Retool
├── v6_merge/       Mockup del rediseño v6 (merge Pipedrive Power BI + NOWs)
└── README.md       Este archivo
```

### `dashboard/` — Dashboard productivo

Aplicación web autocontenida. Servir con cualquier HTTP server estático.

| Archivo | Descripción |
|---|---|
| `index.html` | 12 vistas en una sola página con sidebar de navegación |
| `app.js` | Lógica de renderizado, filtros, heatmaps y export |
| `styles.css` | Tema dark con acentos Pipedrive (degradados violet/blue/cyan/green/pink/amber) |
| `detail_data.js` | Datos sintéticos del Detail Intelligence (15K SKUs simulados) |
| `data.js` · `data_v2.js` | Datos del pipeline, listas NOW, ofertas, leads |
| `intel_data.js` | Market intelligence (noticias del sector) |
| `agents_data.js` | Estado de agentes automatizados |
| `build_detail.py` · `build_retool_app.py` | Generadores de datos sintéticos |

**Vistas principales:**

- Home · Pricing competitivo
- Pipeline en vivo · 696 prospects
- Matches calientes · oferta + demanda
- Mapa global · Leaflet
- Health del sistema
- Market Intelligence
- Listas NOW
- **Detail Intelligence** · 6 fuentes consolidadas con heatmap multi-paleta
- Leads Dashboard
- Ofertas realizadas
- Catálogo Heineman
- Contactos · Workflows n8n · Agentes

### `retool_pack/` — Especificación Retool

Contrato declarativo para reconstruir el dashboard en Retool.

| Archivo | Propósito |
|---|---|
| `README.md` | Guía técnica: arquitectura, instalación, fuentes, contrato I/O |
| `USER_DOCUMENTATION.md` | Manual de usuario final · 6 KPIs, filtros, heatmap, casos de uso |
| `EVENT_HANDLERS.md` | Catálogo de los 10 event handlers con bloques copiables |
| `bast_detail_blueprint.md` | Blueprint completo de la app · 16 widgets + 8 queries |
| `bast_detail_schema.json` | JSON Schema 2020-12 del payload `detail_intelligence_v` |
| `bast_detail_bootstrap.json` | Manifest declarativo de widgets, queries y eventos |
| `dataContract.json` | Contrato de datos extraído (paste-ready en Retool) |
| `bootstrap.json` | Bootstrap extraído (paste-ready en Retool) |
| `dataContract_and_bootstrap.json` | Combinado para campos que aceptan un único JSON |

### `v6_merge/` — Rediseño v6 en construcción

Mockup HTML del próximo rediseño que toma:

- **De Pipedrive Power BI Acquisition Dashboard**: KPIs hero con degradados, funnel central tipo bloques apilados, filtro lateral derecho de período con checkboxes, footer informativo.
- **De NOWs Dashboard**: sidebar con 5 secciones, vista dedicada de Cruces oferta + wish, vista Consultas ad-hoc con chips prefijados, toggle modo claro/oscuro, badge Supabase.

Estado: vista Detail completa, vistas Cruces y Consultas en estructura, Productos y Fuentes como placeholder.

---

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | HTML5, CSS custom, vanilla JS, Leaflet (mapa) |
| Diseño | Inter + JetBrains Mono · paleta dark Pipedrive |
| Backend objetivo | Supabase Postgres `eu-west-1` con vista materializada `detail_intelligence_v` |
| Plataforma destino | Retool (custom app) |
| Integraciones | HubSpot CRM (Hub `148358528`), Slack (`T0B05EVQ19A/C0B08DKCUBU`), Google Drive |

---

## Constraints del proyecto

Estos son los principios que se respetan en todo el código y la documentación:

- Idioma: **Español es-ES** siempre
- Moneda: **EUR**
- Fechas: **YYYY-MM-DD**
- Modo: **dark** (con toggle a light en v6)
- **Sin emojis · sin signos de exclamación**
- KPI crítico: **Net Price**
- Resaltar siempre dónde Heineman es más barato

---

## Cómo correrlo localmente

### Dashboard

```bash
cd dashboard
python3 -m http.server 8765
# abrir http://localhost:8765
```

### Mockup v6

```bash
cd v6_merge
python3 -m http.server 8770
# abrir http://localhost:8770
```

### Importar en Retool

1. Abrir Retool y crear nueva app vacía
2. Pegar `retool_pack/dataContract_and_bootstrap.json` cuando lo pida el constructor con AI
3. Conectar resource Supabase apuntando a la vista materializada `detail_intelligence_v`
4. Configurar los 10 event handlers según `retool_pack/EVENT_HANDLERS.md`

Ver `retool_pack/README.md` para la guía paso a paso completa.

---

## Roadmap

- **v5** completada: Detail Intelligence con 6 KPIs hero, heatmap multi-paleta, funnel y top categorías.
- **v6** en construcción: merge Pipedrive Power BI + NOWs · sidebar, funnel central tipo bloques, filtro de período lateral, vistas Cruces y Consultas.
- **v7** planificada: integración real con Supabase y refresh en vivo.
- **v8** planificada: alertas push a Slack cuando un cruce oferta + wish supere umbral configurable.

---

## Contacto

| Canal | Para qué |
|---|---|
| Slack [#bast](https://app.slack.com/client/T0B05EVQ19A/C0B08DKCUBU) | Operativo y alertas |
| Email atlas@tradinglead.net | Reportes formales |
| HubSpot [Hub 148358528](https://app.hubspot.com/contacts/148358528/) | Trazabilidad comercial |
| Drive [Carpeta BAST](https://drive.google.com/drive/folders/1e48ZJaKlnGbYIFEuPhu2RnLFzjLS5p3R) | Material de referencia |

---

**Mantenido por:** Equipo BAST · **Última actualización:** 2026-04-29
