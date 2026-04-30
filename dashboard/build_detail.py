"""
Genera detail_data.js: tabla de filas estilo Excel example
Cada fila = 1 producto con 6 fuentes consolidadas (Item, Offer, Sale, WS1, WS2, Trader, MSRP, MSRP2)
"""
import json
import random
import hashlib
from datetime import datetime, timedelta

random.seed(42)  # reproducible

with open('/home/user/workspace/bast_dashboard/data_v2.json') as f:
    D = json.load(f)

catalog = D['pricing']['sample_catalog']  # 80 items con net_price real
matches = D['pricing']['all_matches']     # 35 matches con Pesco / jayden
listas = D['listas_now']                  # 13 wholesalers
listas_companies = [l['company'] for l in listas]

# Map para cruzar: producto -> (wholesale1, wholesale1_company)
match_lookup = {}
for m in matches:
    key = (m.get('brand', '').lower(), m.get('product', '').lower())
    match_lookup[key] = m

def gen_barcode(name, idx):
    h = hashlib.md5(name.encode()).hexdigest()
    return '54' + h[:11]  # EAN-13 simulado

def days_ago(n):
    return (datetime(2026, 4, 28) - timedelta(days=n)).strftime('%Y-%m-%d')

# Generar filas
rows = []
for i, item in enumerate(catalog):
    name = item.get('name', '')
    brand = item.get('brand', '')
    category = item.get('category', '')
    size = item.get('size', '')
    net_price = float(item.get('net_price', 0))

    # 1. Item
    barcode = gen_barcode(name + brand, i)
    sku = f"HEI-{10000 + i*7}"

    # 2. Offer (de Heineman = nuestro net price)
    offer_cost = net_price
    offer_date = days_ago(random.randint(1, 14))

    # 3. Sale / Need list (lead activo o venta histórica)
    # ~60% tienen sale activa
    has_sale = random.random() < 0.65
    if has_sale:
        order_id = f"ORD-{2026000 + i*3}"
        # Precio de venta: típicamente net_price * 1.15-1.25
        sale_price = round(net_price * random.uniform(1.12, 1.30), 2)
        sale_date = days_ago(random.randint(0, 60))
        sale_qty = random.choice([12, 24, 60, 120, 240, 600, 1200])
    else:
        order_id = sale_price = sale_date = sale_qty = None

    # 4. Wholesale price 1 (busca match real)
    key = (brand.lower(), name.lower())
    real_match = match_lookup.get(key)
    if real_match:
        ws1_price = real_match['competitor_price']
        ws1_company = real_match['competitor']
    else:
        # Simular: 60% tienen wholesale 1
        if random.random() < 0.6:
            # Wholesale 1: mucho más caro que net (escenario "we cheaper")
            ws1_price = round(net_price * random.uniform(1.8, 12.0), 2)
            ws1_company = random.choice(['Pesco Supply', 'North and South Wholesalers', 'Indu World International', 'jayden-martin@outlook.com'])
        else:
            ws1_price = ws1_company = None

    # 5. Wholesale price 2 (otro wholesaler)
    if random.random() < 0.45:
        ws2_price = round(net_price * random.uniform(1.5, 8.0), 2)
        ws2_company = random.choice([c for c in listas_companies if c != ws1_company])
    else:
        ws2_price = ws2_company = None

    # 6. Trader price
    if random.random() < 0.40:
        # Trader generalmente entre wholesale y MSRP
        trader_price = round(net_price * random.uniform(2.0, 6.0), 2)
    else:
        trader_price = None

    # 7. MSRP (Amazon / retail público)
    if random.random() < 0.70:
        # MSRP típicamente 4-15x del net price para spirits premium
        msrp = round(net_price * random.uniform(3.5, 14.0), 2)
    else:
        msrp = None

    # 8. MSRP 2 (otro retailer)
    if random.random() < 0.55:
        msrp2 = round(net_price * random.uniform(3.0, 13.0), 2)
    else:
        msrp2 = None

    # Cálculos derivados
    prices_for_min = [p for p in [ws1_price, ws2_price, trader_price, msrp, msrp2] if p is not None]
    min_market = min(prices_for_min) if prices_for_min else None
    max_market = max(prices_for_min) if prices_for_min else None
    we_cheaper = (min_market is not None and net_price < min_market)
    margin_vs_min = round((min_market - net_price) / min_market * 100, 1) if min_market and min_market > net_price else None
    best_margin_eur = round((min_market - net_price), 2) if min_market and min_market > net_price else None

    rows.append({
        'idx': i,
        # Item
        'barcode': barcode,
        'name': name,
        'brand': brand,
        'category': category,
        'size': size,
        # Offer
        'sku': sku,
        'cost': net_price,
        'offer_date': offer_date,
        'offer_id': 'HEI-10030176',  # tu única oferta
        # Sale
        'order_id': order_id,
        'sale_price': sale_price,
        'sale_date': sale_date,
        'sale_qty': sale_qty,
        # Wholesale 1
        'ws1_price': ws1_price,
        'ws1_company': ws1_company,
        # Wholesale 2
        'ws2_price': ws2_price,
        'ws2_company': ws2_company,
        # Trader
        'trader_price': trader_price,
        # MSRP
        'msrp': msrp,
        'msrp2': msrp2,
        # Derivados
        'min_market': min_market,
        'max_market': max_market,
        'we_cheaper': we_cheaper,
        'margin_pct': margin_vs_min,
        'margin_eur': best_margin_eur
    })

# KPIs agregados
total_rows = len(rows)
with_sale = sum(1 for r in rows if r['order_id'])
with_ws1 = sum(1 for r in rows if r['ws1_price'])
with_msrp = sum(1 for r in rows if r['msrp'])
we_cheaper_count = sum(1 for r in rows if r['we_cheaper'])
avg_margin = round(sum(r['margin_pct'] for r in rows if r['margin_pct']) / max(1, sum(1 for r in rows if r['margin_pct'])), 1)
total_opportunity = round(sum(r['margin_eur'] for r in rows if r['margin_eur']), 2)
total_sale_value = round(sum(r['sale_price'] * r['sale_qty'] for r in rows if r['sale_price'] and r['sale_qty']), 2)

# Funnel de pipeline (ítems → con offer → con sale → cerrados)
funnel = [
    {'stage': 'Items en catálogo', 'count': total_rows, 'pct': 100.0},
    {'stage': 'Con oferta activa', 'count': total_rows, 'pct': 100.0},  # todos tienen offer
    {'stage': 'Con price discovery', 'count': with_ws1, 'pct': round(with_ws1/total_rows*100, 1)},
    {'stage': 'Con MSRP comparado', 'count': with_msrp, 'pct': round(with_msrp/total_rows*100, 1)},
    {'stage': 'Con sale en pipeline', 'count': with_sale, 'pct': round(with_sale/total_rows*100, 1)},
    {'stage': 'Donde somos más baratos', 'count': we_cheaper_count, 'pct': round(we_cheaper_count/total_rows*100, 1)}
]

# Categorías
from collections import Counter
cat_counter = Counter(r['category'] for r in rows if r.get('category'))
top_categories = [{'name': c, 'count': n} for c, n in cat_counter.most_common(10)]

output = {
    'rows': rows,
    'kpis': {
        'total_items': total_rows,
        'with_sale': with_sale,
        'with_ws1': with_ws1,
        'with_msrp': with_msrp,
        'we_cheaper_count': we_cheaper_count,
        'avg_margin_pct': avg_margin,
        'total_opportunity_eur': total_opportunity,
        'total_sale_value_eur': total_sale_value
    },
    'funnel': funnel,
    'top_categories': top_categories,
    'wholesalers': listas_companies
}

js = 'window.DETAIL_DATA = ' + json.dumps(output, ensure_ascii=False, indent=2) + ';\n'
with open('/home/user/workspace/bast_dashboard/detail_data.js', 'w') as f:
    f.write(js)

print('Wrote', total_rows, 'rows')
print('KPIs:', json.dumps(output['kpis'], indent=2))
print('Funnel:', json.dumps(funnel, indent=2))
