"""
Genera un App JSON nativo de Retool a partir del dataset Detail Intelligence.

Estructura producida (compatible con el importador Retool > Apps > Create new > From JSON):
- Una transformer 'detailData' que devuelve el dataset embebido
- Queries JS de KPIs derivados
- Componentes:
    * 6 Statistic cards (KPIs hero)
    * 2 Selects (parámetro + categoría)
    * 1 Table principal con 19 columnas + formato condicional (heatmap por color)
    * 1 Table secundaria con el funnel
    * 1 Table secundaria con top categorías
    * 1 Button de Export CSV
"""

import json, re, uuid, time, os

SRC = '/home/user/workspace/bast_dashboard/detail_data.js'
OUT = '/home/user/workspace/bast_dashboard/bast_detail_intelligence_retool.json'

raw = open(SRC).read()
m = re.search(r'window\.DETAIL_DATA\s*=\s*(\{.*\});?\s*$', raw, re.DOTALL) or \
    re.search(r'window\.DETAIL_DATA\s*=\s*(\{.*\})', raw, re.DOTALL)
DATA = json.loads(m.group(1))

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def uid():
    return uuid.uuid4().hex[:12]

NOW_ISO = time.strftime('%Y-%m-%dT%H:%M:%S.000Z', time.gmtime())

# ---------------------------------------------------------------------------
# Transformer with full dataset embedded as JS literal
# ---------------------------------------------------------------------------
detail_js = f"return {json.dumps(DATA, ensure_ascii=False)};"

# ---------------------------------------------------------------------------
# JS queries (transformers) that derive views from detailData
# ---------------------------------------------------------------------------
sortAndFilterJS = r"""
const all = {{detailData.value}}.rows;
const cat = {{detailCategory.value}} || '';
const param = {{detailParam.value}} || 'best_margin';
let rows = all.slice();
if (cat) rows = rows.filter(r => r.category === cat);
const cmp = (a,b,k,dir) => {
  const va = a[k] == null ? (dir==='asc' ? Infinity : -Infinity) : a[k];
  const vb = b[k] == null ? (dir==='asc' ? Infinity : -Infinity) : b[k];
  return dir==='asc' ? va-vb : vb-va;
};
switch(param){
  case 'cheapest':     rows.sort((a,b)=>cmp(a,b,'cost','asc')); break;
  case 'highest_msrp': rows.sort((a,b)=>cmp(a,b,'msrp','desc')); break;
  case 'recent_offer': rows.sort((a,b)=>(b.offer_date||'').localeCompare(a.offer_date||'')); break;
  case 'recent_sale':  rows.sort((a,b)=>{
    if(!a.sale_date && !b.sale_date) return 0;
    if(!a.sale_date) return 1;
    if(!b.sale_date) return -1;
    return b.sale_date.localeCompare(a.sale_date);
  }); break;
  case 'highest_qty':  rows.sort((a,b)=>cmp(a,b,'sale_qty','desc')); break;
  case 'best_margin':
  default: rows.sort((a,b)=>cmp(a,b,'margin_pct','desc'));
}
// percentile rank for heatmap colors
const cols = ['cost','sale_price','sale_qty','ws1_price','ws2_price','trader_price','msrp','msrp2','margin_pct'];
const sortedByCol = {};
cols.forEach(c => sortedByCol[c] = all.map(r=>r[c]).filter(v=>v!=null && !isNaN(v)).sort((a,b)=>a-b));
const quintile = (val, sorted, invert) => {
  if (val==null || isNaN(val) || !sorted.length) return 0;
  let pos = sorted.findIndex(v=>v>=val);
  if (pos===-1) pos = sorted.length-1;
  let pct = pos/Math.max(1, sorted.length-1);
  if (invert) pct = 1-pct;
  if (pct>=0.8) return 5;
  if (pct>=0.6) return 4;
  if (pct>=0.4) return 3;
  if (pct>=0.2) return 2;
  return 1;
};
return rows.map(r => Object.assign({}, r, {
  heat_cost: quintile(r.cost, sortedByCol.cost, true),
  heat_sale_price: quintile(r.sale_price, sortedByCol.sale_price, false),
  heat_sale_qty: quintile(r.sale_qty, sortedByCol.sale_qty, false),
  heat_ws1: quintile(r.ws1_price, sortedByCol.ws1_price, false),
  heat_ws2: quintile(r.ws2_price, sortedByCol.ws2_price, false),
  heat_trader: quintile(r.trader_price, sortedByCol.trader_price, false),
  heat_msrp: quintile(r.msrp, sortedByCol.msrp, false),
  heat_msrp2: quintile(r.msrp2, sortedByCol.msrp2, false),
  heat_margin: quintile(r.margin_pct, sortedByCol.margin_pct, false)
}));
""".strip()

funnelJS = "return {{detailData.value}}.funnel;"
catsJS   = "return {{detailData.value}}.top_categories;"
catOptionsJS = "return [{label:'Todas las categorías', value:''}].concat(({{detailData.value}}.top_categories||[]).map(c=>({label:c.name+' ('+c.count+')', value:c.name})));"

kpiTotalJS   = "const k={{detailData.value}}.kpis; return k.total_items;"
kpiWs1JS     = "const k={{detailData.value}}.kpis; return k.with_ws1;"
kpiWs1PctJS  = "const k={{detailData.value}}.kpis; return Math.round(k.with_ws1*100/k.total_items)+'% del catálogo';"
kpiMsrpJS    = "const k={{detailData.value}}.kpis; return k.with_msrp;"
kpiMsrpPctJS = "const k={{detailData.value}}.kpis; return Math.round(k.with_msrp*100/k.total_items)+'% del catálogo';"
kpiSaleJS    = "const k={{detailData.value}}.kpis; return k.with_sale;"
kpiSaleValJS = "const k={{detailData.value}}.kpis; return k.total_sale_value_eur;"
kpiMarginJS  = "const k={{detailData.value}}.kpis; return k.avg_margin_pct;"
kpiOppJS     = "const k={{detailData.value}}.kpis; return k.total_opportunity_eur;"

# ---------------------------------------------------------------------------
# Component templates (Retool widget descriptors)
# ---------------------------------------------------------------------------
def widget(name, type_, position, custom={}, defaults_id=None):
    """Build a single widget entry following Retool's app-JSON shape."""
    base = {
      "id": defaults_id or uid(),
      "name": name,
      "type": type_,
      "position": position,
      "template": {},
    }
    base["template"].update(custom)
    return base

# Heatmap colors (5 quintile bins per family)
HEAT = {
  "green": ["#0F4031","#136D45","#178757","#1AA66B","#22C55E"],   # cost / sale (low = hot)
  "blue":  ["#172554","#1E3A8A","#2563EB","#3B82F6","#60A5FA"],
  "cyan":  ["#0E3A4A","#0F4D5C","#0E7490","#0891B2","#06B6D4"],
  "amber": ["#451A03","#78350F","#B45309","#D97706","#F59E0B"],
  "pink":  ["#500724","#831843","#BE185D","#DB2777","#EC4899"],
  "margin":["#2E1065","#4C1D95","#6D28D9","#7C3AED","#8B5CF6"],
}

# Conditional-formatting rule for a numeric column with a quintile rank field
def heat_rules(rank_field, palette):
    return [
      {"id": uid(), "condition": f"{{{{currentRow.{rank_field}}}}} === {i+1}",
       "backgroundColor": HEAT[palette][i], "textColor": "#FFFFFF"} for i in range(5)
    ]

# Definition of every column in the main table
COLS = [
  ("barcode", "Barcode", "string", "#catalog", None),
  ("name", "Item", "string", "#catalog", None),
  ("brand", "Brand", "string", None, None),
  ("category", "Categoría", "tag", None, None),
  ("sku", "SKU Heineman", "string", None, None),
  ("cost", "Cost", "currency", None, ("cost", "green", "heat_cost")),
  ("offer_date", "Offer Date", "date", "#ofertas", None),
  ("order_id", "Order ID", "string", "#leads", None),
  ("sale_price", "Sale Price", "currency", None, ("sale_price", "green", "heat_sale_price")),
  ("sale_date", "Sale Date", "date", None, None),
  ("sale_qty", "Qty", "number", None, ("sale_qty", "green", "heat_sale_qty")),
  ("ws1_price", "WS1 Price", "currency", None, ("ws1_price", "blue", "heat_ws1")),
  ("ws1_company", "WS1 Company", "string", "#listas", None),
  ("ws2_price", "WS2 Price", "currency", None, ("ws2_price", "cyan", "heat_ws2")),
  ("ws2_company", "WS2 Company", "string", "#listas", None),
  ("trader_price", "Trader Price", "currency", None, ("trader_price", "amber", "heat_trader")),
  ("msrp", "MSRP", "currency", "amazon", ("msrp", "pink", "heat_msrp")),
  ("msrp2", "MSRP 2", "currency", "amazon", ("msrp2", "pink", "heat_msrp2")),
  ("margin_pct", "Margen %", "percent", None, ("margin_pct", "margin", "heat_margin")),
]

table_columns = []
for key, label, kind, link, heat in COLS:
    col = {
        "id": uid(),
        "key": key,
        "label": label,
        "visible": True,
        "format": kind,
    }
    if kind == "currency":
        col["currency"] = "EUR"
        col["decimalPlaces"] = 2
    if kind == "percent":
        col["decimalPlaces"] = 1
        col["format"] = "number"
        col["suffix"] = "%"
    if kind == "number":
        col["decimalPlaces"] = 0
    if kind == "tag":
        col["format"] = "tag"
        col["tagColor"] = "violet"
    if heat:
        _, palette, rank_field = heat
        col["conditionalFormatting"] = heat_rules(rank_field, palette)
    if link == "#catalog":
        col["openInNewTab"] = False
    table_columns.append(col)

# ---------------------------------------------------------------------------
# App skeleton — Retool app JSON
# ---------------------------------------------------------------------------
APP_ID = uid()
PAGE_ID = uid()

app = {
  "uuid": str(uuid.uuid4()),
  "exportedAt": NOW_ISO,
  "exportedBy": "BAST Dashboard v5",
  "retoolFormatVersion": 4,
  "schema": "retool-app-export",
  "appName": "BAST · Detail Intelligence",
  "appDescription": "Detail Intelligence dashboard · 6 fuentes consolidadas (catálogo · ofertas · sales · ws1 · ws2 · trader · MSRP) · heatmap por columna · linkeable al origen.",
  "page": {
    "id": PAGE_ID,
    "name": "Detail Intelligence",
    "isHomePage": True,
    "layout": "default",
    "queryParams": [],
    "appBackgroundColor": "#0B0F19"
  },
  "queries": [
    {
      "id": uid(), "name": "detailData", "type": "JSQuery",
      "transformer": detail_js, "runWhenPageLoads": True,
      "description": "Dataset embebido (80 rows + KPIs + funnel + top_categories)"
    },
    {"id": uid(), "name": "detailRows", "type": "JSQuery", "transformer": sortAndFilterJS,
     "description": "Filas filtradas/ordenadas por parámetro + categoría con heatmap quintile"},
    {"id": uid(), "name": "funnelRows", "type": "JSQuery", "transformer": funnelJS},
    {"id": uid(), "name": "categoryRows", "type": "JSQuery", "transformer": catsJS},
    {"id": uid(), "name": "categoryOptions", "type": "JSQuery", "transformer": catOptionsJS},
    {"id": uid(), "name": "kpiTotal",  "type": "JSQuery", "transformer": kpiTotalJS},
    {"id": uid(), "name": "kpiWs1",    "type": "JSQuery", "transformer": kpiWs1JS},
    {"id": uid(), "name": "kpiWs1Pct", "type": "JSQuery", "transformer": kpiWs1PctJS},
    {"id": uid(), "name": "kpiMsrp",   "type": "JSQuery", "transformer": kpiMsrpJS},
    {"id": uid(), "name": "kpiMsrpPct","type": "JSQuery", "transformer": kpiMsrpPctJS},
    {"id": uid(), "name": "kpiSale",   "type": "JSQuery", "transformer": kpiSaleJS},
    {"id": uid(), "name": "kpiSaleVal","type": "JSQuery", "transformer": kpiSaleValJS},
    {"id": uid(), "name": "kpiMargin", "type": "JSQuery", "transformer": kpiMarginJS},
    {"id": uid(), "name": "kpiOpp",    "type": "JSQuery", "transformer": kpiOppJS},
  ],
  "widgets": [
    # Header
    widget("title", "text",
           {"x":0,"y":0,"w":12,"h":1},
           {"value":"## Detail Intelligence","style":{"color":"#F8FAFC"}}),
    widget("subtitle", "text",
           {"x":0,"y":1,"w":12,"h":1},
           {"value":"Cada fila consolida 6 fuentes · catálogo · ofertas · sales · wholesale 1/2 · trader · MSRP · todo linkeable al origen",
            "style":{"color":"#94A3B8","fontSize":13}}),

    # Filters
    widget("detailParam", "select",
           {"x":0,"y":2,"w":3,"h":1},
           {"label":"Parámetro de orden","defaultValue":"best_margin",
            "values":[
              {"label":"Mayor margen","value":"best_margin"},
              {"label":"Cost más bajo","value":"cheapest"},
              {"label":"MSRP más alto","value":"highest_msrp"},
              {"label":"Oferta reciente","value":"recent_offer"},
              {"label":"Sale reciente","value":"recent_sale"},
              {"label":"Mayor cantidad","value":"highest_qty"},
            ]}),
    widget("detailCategory", "select",
           {"x":3,"y":2,"w":3,"h":1},
           {"label":"Categoría","defaultValue":"",
            "data":"{{categoryOptions.value}}"}),
    widget("detailExport", "button",
           {"x":9,"y":2,"w":3,"h":1},
           {"text":"Exportar CSV","style":"primary",
            "onClick":"utils.exportData({{detailRows.value}}, 'detail_intelligence', 'csv')"}),

    # Hero KPIs (6 statistic cards with vibrant gradients)
    widget("kpi1_items", "statistic",
           {"x":0,"y":3,"w":2,"h":2},
           {"label":"SKUs activos","primaryValue":"{{kpiTotal.value}}",
            "secondaryLabel":"catálogo Heineman",
            "background":"linear-gradient(135deg, #6D28D9 0%, #8B5CF6 100%)",
            "color":"#FFFFFF"}),
    widget("kpi2_ws1", "statistic",
           {"x":2,"y":3,"w":2,"h":2},
           {"label":"Con price discovery","primaryValue":"{{kpiWs1.value}}",
            "secondaryLabel":"{{kpiWs1Pct.value}}",
            "background":"linear-gradient(135deg, #1D4ED8 0%, #3B82F6 100%)",
            "color":"#FFFFFF"}),
    widget("kpi3_msrp", "statistic",
           {"x":4,"y":3,"w":2,"h":2},
           {"label":"Con MSRP comparado","primaryValue":"{{kpiMsrp.value}}",
            "secondaryLabel":"{{kpiMsrpPct.value}}",
            "background":"linear-gradient(135deg, #0E7490 0%, #06B6D4 100%)",
            "color":"#FFFFFF"}),
    widget("kpi4_sale", "statistic",
           {"x":6,"y":3,"w":2,"h":2},
           {"label":"Sales en pipeline","primaryValue":"{{kpiSale.value}}",
            "secondaryLabel":"€ {{Number({{kpiSaleVal.value}}).toLocaleString('es-ES',{minimumFractionDigits:2})}} valor pipeline",
            "background":"linear-gradient(135deg, #047857 0%, #10B981 100%)",
            "color":"#FFFFFF"}),
    widget("kpi5_margin", "statistic",
           {"x":8,"y":3,"w":2,"h":2},
           {"label":"Margen promedio","primaryValue":"{{kpiMargin.value}}%",
            "secondaryLabel":"vs precio más bajo del mercado",
            "background":"linear-gradient(135deg, #BE185D 0%, #EC4899 100%)",
            "color":"#FFFFFF"}),
    widget("kpi6_opp", "statistic",
           {"x":10,"y":3,"w":2,"h":2},
           {"label":"Oportunidad total","primaryValue":"€ {{Number({{kpiOpp.value}}).toLocaleString('es-ES',{minimumFractionDigits:2})}}",
            "secondaryLabel":"margen acumulable",
            "background":"linear-gradient(135deg, #B45309 0%, #F59E0B 100%)",
            "color":"#FFFFFF"}),

    # Funnel + Categories
    widget("funnelTable", "table",
           {"x":0,"y":5,"w":7,"h":5},
           {"title":"Pipeline funnel · desde catálogo a venta",
            "data":"{{funnelRows.value}}",
            "columns":[
              {"id":uid(),"key":"stage","label":"Etapa","format":"string"},
              {"id":uid(),"key":"count","label":"Items","format":"number","decimalPlaces":0},
              {"id":uid(),"key":"pct","label":"%","format":"number","decimalPlaces":1,"suffix":"%",
               "conditionalFormatting":[
                 {"id":uid(),"condition":"true","backgroundColor":"linear-gradient(90deg,#6D28D9,#8B5CF6)","textColor":"#FFFFFF"}
               ]},
            ]}),
    widget("categoryTable", "table",
           {"x":7,"y":5,"w":5,"h":5},
           {"title":"Top categorías",
            "data":"{{categoryRows.value}}",
            "columns":[
              {"id":uid(),"key":"name","label":"Categoría","format":"tag","tagColor":"pink"},
              {"id":uid(),"key":"count","label":"Items","format":"number","decimalPlaces":0},
            ],
            "rowSelectionType":"single",
            "onRowClick":"detailCategory.setValue({{currentRow.name}}); detailRows.trigger();"}),

    # Main table — full detail
    widget("detailTable", "table",
           {"x":0,"y":10,"w":12,"h":12},
           {"title":"Detail rows · todas las fuentes consolidadas",
            "subtitle":"{{detailRows.value.length}} filas · ordenadas por {{detailParam.value}}",
            "data":"{{detailRows.value}}",
            "rowHeight":"compact",
            "stickyHeader":True,
            "background":"#111726",
            "headerBackground":"#1E293B",
            "headerColor":"#E5E7EB",
            "rowColor":"#E5E7EB",
            "columns":table_columns,
            "groups":[
              {"label":"ITEM","background":"linear-gradient(90deg,#6D28D9,#8B5CF6)","columns":["barcode","name","brand","category"]},
              {"label":"OFFERS WE HAVE","background":"linear-gradient(90deg,#1D4ED8,#3B82F6)","columns":["sku","cost","offer_date"]},
              {"label":"SALES / NEED LIST","background":"linear-gradient(90deg,#047857,#10B981)","columns":["order_id","sale_price","sale_date","sale_qty"]},
              {"label":"WHOLESALE 1","background":"linear-gradient(90deg,#0E7490,#06B6D4)","columns":["ws1_price","ws1_company"]},
              {"label":"WHOLESALE 2","background":"linear-gradient(90deg,#155E75,#0891B2)","columns":["ws2_price","ws2_company"]},
              {"label":"TRADER","background":"linear-gradient(90deg,#B45309,#F59E0B)","columns":["trader_price"]},
              {"label":"MSRP","background":"linear-gradient(90deg,#BE185D,#EC4899)","columns":["msrp","msrp2","margin_pct"]},
            ],
            "exportEnabled":True,
            "searchEnabled":True,
            "rowActions":[
              {"label":"Abrir en HubSpot","openUrl":"https://app.hubspot.com/contacts/148358528/objects/0-1/views/all/list?searchString={{currentRow.brand}}"},
              {"label":"Buscar en Slack","openUrl":"https://app.slack.com/client/T0B05EVQ19A/C0B08DKCUBU?query={{currentRow.barcode}}"},
              {"label":"Buscar MSRP en Amazon","openUrl":"https://www.amazon.com/s?k={{encodeURIComponent(currentRow.brand+' '+currentRow.name)}}"},
            ]}),
  ],
  "metadata": {
    "source": "BAST Dashboard v5 · Detail Intelligence",
    "totalRows": len(DATA["rows"]),
    "kpis": DATA["kpis"],
    "buildTimestamp": NOW_ISO,
    "notes": [
      "Importar desde Retool > Apps > Create new > From JSON/ZIP.",
      "Si Retool reporta versión incompatible: abrir el JSON, ajustar 'retoolFormatVersion' al valor que muestre tu instancia.",
      "El dataset está embebido en la query 'detailData'. Para conectar a fuente real, reemplazá esa query por una hacia tu Resource (Postgres/Supabase/REST) y mantené la misma forma de fila.",
      "Los grupos de columnas y los gradientes de color usan keys propias de v3+ del table widget."
    ]
  }
}

# Wrap in the outer envelope Retool expects on import
envelope = {
  "version": 4,
  "schema": "retool-app",
  "data": app,
  "kind": "App"
}

with open(OUT, 'w') as f:
    json.dump(envelope, f, ensure_ascii=False, indent=2)

print(f"Wrote {OUT}")
print(f"Size: {os.path.getsize(OUT):,} bytes")
print(f"Widgets: {len(app['widgets'])}")
print(f"Queries: {len(app['queries'])}")
print(f"Table columns: {len(table_columns)}")
print(f"Rows embedded: {len(DATA['rows'])}")
