/* ============================================================
   BAST v6 — Logic
   Router · datos sintéticos · funnel · cruces · consultas · theme
   Constraints: es-ES, EUR, YYYY-MM-DD, sin emojis, sin signos de exclamación
   ============================================================ */

// ----------------------- DATA --------------------------------
const PALETTES = {
  green:  ['#0F4031', '#136D45', '#178757', '#1AA66B', '#22C55E'],
  blue:   ['#172554', '#1E3A8A', '#2563EB', '#3B82F6', '#60A5FA'],
  cyan:   ['#0E3A4A', '#0F4D5C', '#0E7490', '#0891B2', '#06B6D4'],
  amber:  ['#451A03', '#78350F', '#B45309', '#D97706', '#F59E0B'],
  pink:   ['#500724', '#831843', '#BE185D', '#DB2777', '#EC4899'],
  margin: ['#2E1065', '#4C1D95', '#6D28D9', '#7C3AED', '#8B5CF6']
};

const fmt = {
  eur: (v) => v == null ? '—' : '€' + v.toLocaleString('es-ES', { maximumFractionDigits: 2 }),
  num: (v) => v == null ? '—' : v.toLocaleString('es-ES'),
  pct: (v) => v == null ? '—' : v.toFixed(1).replace('.', ',') + '%',
  date: (v) => v || '—'
};

const BRANDS = ['Maison Francis Kurkdjian', 'Xerjoff', 'Penhaligons', 'Yves Saint Laurent', 'Giorgio Armani', 'Tom Ford', 'Creed', 'Byredo', 'Diptyque', 'Le Labo'];
const PRODUCTS = ['Baccarat Rouge 540', 'Aqua Universalis', 'Oud Silk Mood', 'Tony Iommi Monkey Special', 'Amyris Femme', 'A La Rose', 'Accento Overdose', 'Duran Duran Neorio Pink', 'Black Opium EdP', 'Si Passione', 'My Way EdP', 'Emporio Armani', 'Black Phantom', 'Aventus', 'Bal d\'Afrique', 'Mojave Ghost', 'Philosykos', 'Santal 33', 'Coco Mademoiselle', 'No 5'];
const CATEGORIES = ['Liquor', 'Spirits', 'FMCG', 'Tobacco', 'Cosmetics', 'Perfumes', 'Beauty'];
const COMPANIES = ['Pesco Supply BV', 'Tradeling', 'Sarmad Trading', 'Moving Spirits', 'CFZ Liquors', 'WS Logistics', 'EuroSpirits', 'Global Wholesale'];

function rand(min, max) { return Math.random() * (max - min) + min; }
function randInt(min, max) { return Math.floor(rand(min, max + 1)); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function maybe(p, fn) { return Math.random() < p ? fn() : null; }

function generateRows(n = 80) {
  const rows = [];
  for (let i = 0; i < n; i++) {
    const cost = rand(20, 250);
    const ws1 = maybe(0.7, () => cost * rand(1.05, 1.35));
    const ws2 = maybe(0.55, () => cost * rand(1.08, 1.32));
    const trader = maybe(0.4, () => cost * rand(1.1, 1.4));
    const msrp = maybe(0.75, () => cost * rand(1.25, 1.85));
    const msrp2 = maybe(0.5, () => cost * rand(1.2, 1.7));
    const market = [ws1, ws2, trader, msrp, msrp2].filter(v => v != null);
    const min_market = market.length ? Math.min(...market) : null;
    const margin_pct = (min_market != null && cost) ? ((min_market - cost) / min_market) * 100 : null;
    const margin_eur = (min_market != null) ? min_market - cost : null;

    const brand = pick(BRANDS);
    const name = pick(PRODUCTS);
    const category = pick(CATEGORIES);
    const sale_qty = maybe(0.45, () => randInt(20, 500));
    const sale_price = sale_qty ? cost * rand(1.4, 2.1) : null;
    const order_id = sale_qty ? 'ORD-' + randInt(10000, 99999) : null;

    rows.push({
      barcode: String(randInt(1000000000000, 9999999999999)),
      name, brand, category,
      size: pick(['750ml', '1L', '1.75L', '50ml', '100ml', '200ml']),
      sku: 'HUB-' + randInt(10000, 99999),
      cost,
      offer_date: '2026-' + String(randInt(1, 4)).padStart(2,'0') + '-' + String(randInt(1, 28)).padStart(2,'0'),
      offer_id: 'OFF-' + randInt(1000, 9999),
      order_id,
      sale_price,
      sale_date: order_id ? '2026-' + String(randInt(1,4)).padStart(2,'0') + '-' + String(randInt(1,28)).padStart(2,'0') : null,
      sale_qty,
      ws1_price: ws1, ws1_company: ws1 ? pick(COMPANIES) : null,
      ws2_price: ws2, ws2_company: ws2 ? pick(COMPANIES) : null,
      trader_price: trader,
      msrp, msrp2,
      min_market,
      we_cheaper: min_market != null && cost < min_market,
      margin_pct, margin_eur
    });
  }
  return rows;
}

const ROWS = generateRows(80);

// Cross-table data (Cruces oferta + wish)
function generateCruces(n = 22) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const offer = rand(20, 200);
    const msrp = maybe(0.55, () => offer * rand(1.3, 1.9));
    const margin = msrp != null ? ((msrp - offer) / msrp) * 100 : null;
    out.push({
      barcode: String(randInt(1000000000000, 9999999999999)),
      name: pick(PRODUCTS),
      brand: pick(BRANDS),
      best_offer: offer,
      msrp,
      margin_pct: margin,
      n_offers: randInt(3, 12),
      n_wishes: randInt(2, 10)
    });
  }
  return out.sort((a,b) => b.n_offers - a.n_offers);
}

const CRUCES = generateCruces();

// ----------------------- KPI / FUNNEL / CATEGORY -------------
function computeKpis(rows) {
  return {
    total: rows.length,
    with_ws1: rows.filter(r => r.ws1_price != null).length,
    with_msrp: rows.filter(r => r.msrp != null).length,
    with_sale: rows.filter(r => r.order_id).length,
    we_cheaper: rows.filter(r => r.we_cheaper).length,
    avg_margin: avg(rows.filter(r => r.margin_pct != null).map(r => r.margin_pct)),
    total_opp: rows.filter(r => r.margin_eur != null).reduce((s,r) => s + r.margin_eur * (r.sale_qty || 1), 0),
    sale_value: rows.filter(r => r.sale_price && r.sale_qty).reduce((s,r) => s + r.sale_price * r.sale_qty, 0)
  };
}
function avg(arr) { return arr.length ? arr.reduce((a,b) => a+b, 0) / arr.length : 0; }

function computeFunnel(rows) {
  const total = rows.length;
  return [
    { key: 'items',     label: 'Items en catálogo',       count: total,                                   palette: '#8B5CF6' },
    { key: 'withOffer', label: 'Con oferta activa',       count: rows.filter(r => r.cost != null).length, palette: '#3B82F6' },
    { key: 'withWs1',   label: 'Con price discovery',     count: rows.filter(r => r.ws1_price != null).length, palette: '#06B6D4' },
    { key: 'withMsrp',  label: 'Con MSRP comparado',      count: rows.filter(r => r.msrp != null).length, palette: '#EC4899' },
    { key: 'withSale',  label: 'Con sale en pipeline',    count: rows.filter(r => r.order_id).length,    palette: '#10B981' },
    { key: 'weCheaper', label: 'Donde somos más baratos', count: rows.filter(r => r.we_cheaper).length,  palette: '#F59E0B' }
  ];
}

function computeTopCategories(rows, top = 8) {
  const map = {};
  rows.forEach(r => { map[r.category] = (map[r.category] || 0) + 1; });
  return Object.entries(map)
    .map(([name, count]) => ({ name, count }))
    .sort((a,b) => b.count - a.count)
    .slice(0, top);
}

// ----------------------- HEATMAP -----------------------------
function quintile(value, sortedValues, invert = false) {
  if (value == null || sortedValues.length === 0) return -1;
  const idx = sortedValues.findIndex(v => v >= value);
  const pos = idx === -1 ? sortedValues.length - 1 : idx;
  let q = Math.floor((pos / sortedValues.length) * 5);
  q = Math.min(q, 4);
  return invert ? 4 - q : q;
}

function heatColor(value, allValues, palette, invert = false) {
  if (value == null) return '';
  const sorted = allValues.filter(v => v != null).sort((a,b) => a - b);
  const q = quintile(value, sorted, invert);
  if (q < 0) return '';
  return PALETTES[palette][q];
}

// ----------------------- RENDER: HERO KPIS -------------------
function renderHeroKpis(rows) {
  const k = computeKpis(rows);
  const grid = document.getElementById('heroKpiGrid');
  if (!grid) return;
  grid.innerHTML = `
    <div class="hero-kpi g-violet">
      <div class="hk-label">SKUs activos</div>
      <div class="hk-value">${fmt.num(k.total)}</div>
      <div class="hk-foot">catálogo Hub Offers</div>
    </div>
    <div class="hero-kpi g-blue">
      <div class="hk-label">Con WS1</div>
      <div class="hk-value">${fmt.num(k.with_ws1)}</div>
      <div class="hk-foot">${fmt.pct((k.with_ws1/k.total)*100)} cobertura</div>
    </div>
    <div class="hero-kpi g-cyan">
      <div class="hk-label">Con MSRP</div>
      <div class="hk-value">${fmt.num(k.with_msrp)}</div>
      <div class="hk-foot">${fmt.pct((k.with_msrp/k.total)*100)} cobertura</div>
    </div>
    <div class="hero-kpi g-green">
      <div class="hk-label">Sales en pipeline</div>
      <div class="hk-value">${fmt.num(k.with_sale)}</div>
      <div class="hk-foot">${fmt.eur(Math.round(k.sale_value))} valor</div>
    </div>
    <div class="hero-kpi g-pink">
      <div class="hk-label">Margen promedio</div>
      <div class="hk-value">${fmt.pct(k.avg_margin)}</div>
      <div class="hk-foot">vs precio mínimo de mercado</div>
    </div>
    <div class="hero-kpi g-amber">
      <div class="hk-label">Oportunidad total</div>
      <div class="hk-value">${fmt.eur(Math.round(k.total_opp))}</div>
      <div class="hk-foot">margen acumulable</div>
    </div>`;
}

// ----------------------- RENDER: FUNNEL (Pipedrive blocks) ---
function renderFunnel(rows) {
  const stages = computeFunnel(rows);
  const total = stages[0].count || 1;
  const max = Math.max(...stages.map(s => s.count));
  const minWidth = 180;
  const maxWidth = 380;
  const container = document.getElementById('funnelBlocks');
  if (!container) return;

  container.innerHTML = stages.map((s, i) => {
    // width by relative count (between min and max)
    const ratio = max > 0 ? s.count / max : 0;
    const width = Math.round(minWidth + (maxWidth - minWidth) * ratio);
    const pct = i === 0 ? '100%' : fmt.pct((s.count / total) * 100);
    const arrow = i < stages.length - 1
      ? `<div class="funnel-arrow" style="color:${s.palette};opacity:0.55"></div>`
      : '';
    return `
      <div class="funnel-block" style="background:${s.palette};width:${width}px;border-radius:6px;margin-bottom:6px" data-stage="${s.key}">
        <div class="fb-value">${fmt.num(s.count)}</div>
        <div class="fb-meta-row">
          <span class="fb-label">${s.label}</span>
          <span class="fb-pct">${pct}</span>
        </div>
      </div>
      ${arrow}`;
  }).join('');
}

// ----------------------- RENDER: TOP CATEGORIES --------------
function renderCategories(rows) {
  const cats = computeTopCategories(rows);
  const max = Math.max(...cats.map(c => c.count));
  const wrap = document.getElementById('catBars');
  if (!wrap) return;
  wrap.innerHTML = cats.map(c => {
    const pct = (c.count / max) * 100;
    return `
      <div class="cat-row" data-cat="${c.name}">
        <div class="cat-name">${c.name}</div>
        <div class="cat-bar">
          <div class="cat-bar-fill" style="width:${pct}%;background:linear-gradient(90deg,#8B5CF6,#06B6D4)"></div>
        </div>
        <div class="cat-count">${c.count}</div>
      </div>`;
  }).join('');
}

// ----------------------- RENDER: DETAIL TABLE ----------------
function renderDetailTable(rows) {
  const tbody = document.getElementById('detailTbody');
  if (!tbody) return;

  // Pre-compute distributions for heatmap
  const dists = {
    cost:    rows.map(r => r.cost),
    sale_p:  rows.map(r => r.sale_price),
    sale_q:  rows.map(r => r.sale_qty),
    ws1:     rows.map(r => r.ws1_price),
    ws2:     rows.map(r => r.ws2_price),
    trader:  rows.map(r => r.trader_price),
    msrp:    rows.map(r => r.msrp),
    msrp2:   rows.map(r => r.msrp2),
    margin:  rows.map(r => r.margin_pct),
  };

  const cell = (val, dist, palette, fmtFn = fmt.eur, invert = false) => {
    const bg = heatColor(val, dist, palette, invert);
    if (!bg) return `<td class="num">—</td>`;
    return `<td class="heat num" style="background:${bg}">${fmtFn(val)}</td>`;
  };

  tbody.innerHTML = rows.slice(0, 60).map(r => `
    <tr>
      <td><div style="font-weight:600">${r.name}</div><div style="font-size:10.5px;color:var(--text-muted);font-family:'JetBrains Mono',monospace;margin-top:2px">${r.barcode}</div></td>
      <td>${r.brand}</td>
      <td>${r.category}</td>
      ${cell(r.cost, dists.cost, 'green', fmt.eur, true)}
      <td>${fmt.date(r.offer_date)}</td>
      <td>${r.order_id || '—'}</td>
      ${cell(r.sale_price, dists.sale_p, 'green', fmt.eur, false)}
      ${cell(r.sale_qty, dists.sale_q, 'green', fmt.num, false)}
      ${cell(r.ws1_price, dists.ws1, 'blue', fmt.eur, false)}
      ${cell(r.ws2_price, dists.ws2, 'cyan', fmt.eur, false)}
      ${cell(r.trader_price, dists.trader, 'amber', fmt.eur, false)}
      ${cell(r.msrp, dists.msrp, 'pink', fmt.eur, false)}
      ${cell(r.msrp2, dists.msrp2, 'pink', fmt.eur, false)}
      ${cell(r.margin_pct, dists.margin, 'margin', fmt.pct, false)}
    </tr>`).join('');

  const counter = document.getElementById('detailRowCount');
  if (counter) counter.textContent = `${rows.length} filas · mostrando ${Math.min(60, rows.length)}`;
}

// ----------------------- RENDER: CRUCES ----------------------
function renderCruces() {
  const tbody = document.getElementById('crucesTbody');
  if (!tbody) return;
  tbody.innerHTML = CRUCES.map(c => `
    <tr>
      <td>
        <div class="cell-prod-name">${c.name}</div>
        <div class="cell-prod-bc">${c.barcode}</div>
      </td>
      <td>${c.brand}</td>
      <td class="num"><span class="price-pos">${fmt.eur(c.best_offer)}</span></td>
      <td class="num">${c.msrp ? fmt.eur(c.msrp) : '—'}</td>
      <td class="num">${c.margin_pct ? `<span class="margin-pos">+${fmt.pct(c.margin_pct)}</span>` : '<span class="margin-neg">—</span>'}</td>
      <td class="num">${c.n_offers}</td>
      <td class="num">${c.n_wishes}</td>
      <td class="num"><button class="cell-action" title="Ver detalle">→</button></td>
    </tr>`).join('');
}

// ----------------------- RENDER: CAMPAIGNS -------------------
const CAMPAIGNS = [
  { title: 'Liquor Q2 Outreach · LATAM',         status: 'active', stage: 'Outreach',     contacts: 1240, replied: 87,  meetings: 14, progress: 62 },
  { title: 'Spirits Wholesalers · UAE + KSA',    status: 'active', stage: 'Discovery',    contacts: 480,  replied: 32,  meetings: 5,  progress: 28 },
  { title: 'Tobacco CIS · sourcing list',        status: 'paused', stage: 'Source list',  contacts: 320,  replied: 0,   meetings: 0,  progress: 15 },
  { title: 'Perfumes EU · Travel Retail',        status: 'active', stage: 'Negotiation',  contacts: 95,   replied: 41,  meetings: 12, progress: 78 },
  { title: 'FMCG Asia · cold list build',        status: 'draft',  stage: 'Build list',   contacts: 0,    replied: 0,   meetings: 0,  progress: 0 }
];

function renderCampaigns() {
  const grid = document.getElementById('campaignsGrid');
  if (!grid) return;
  grid.innerHTML = CAMPAIGNS.map(c => `
    <div class="campaign-card">
      <div class="campaign-header">
        <h3 class="campaign-title">${c.title}</h3>
        <span class="campaign-status cs-${c.status}">${
          c.status === 'active' ? 'Activa' : c.status === 'paused' ? 'Pausada' : 'Borrador'
        }</span>
      </div>
      <div class="campaign-meta">
        <span>Etapa: ${c.stage}</span>
      </div>
      <div class="campaign-progress">
        <div class="campaign-progress-fill" style="width:${c.progress}%"></div>
      </div>
      <div class="campaign-stats">
        <div>
          <div class="campaign-stat-label">Contactos</div>
          <div class="campaign-stat-value">${fmt.num(c.contacts)}</div>
        </div>
        <div>
          <div class="campaign-stat-label">Respuestas</div>
          <div class="campaign-stat-value">${c.replied}</div>
        </div>
        <div>
          <div class="campaign-stat-label">Reuniones</div>
          <div class="campaign-stat-value">${c.meetings}</div>
        </div>
      </div>
    </div>
  `).join('') + `
    <div class="campaign-add-card">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>
      <div style="font-size:13px;font-weight:600">Nueva campaña</div>
      <div style="font-size:11px;text-align:center">Outreach, sourcing o búsqueda de contactos</div>
    </div>`;
}

// ----------------------- ROUTER ------------------------------
const VIEW_TITLES = {
  detail: 'Matriz de precios',
  cruces: 'Cruces oferta + wish',
  productos: 'Productos',
  consultas: 'Consultas ad-hoc',
  campaigns: 'Campaigns',
  fuentes: 'Fuentes'
};

function setView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const view = document.getElementById('view-' + name);
  if (view) view.classList.add('active');
  const nav = document.querySelector(`.nav-item[data-view="${name}"]`);
  if (nav) nav.classList.add('active');
  const crumb = document.getElementById('crumbCurrent');
  if (crumb) crumb.textContent = VIEW_TITLES[name] || 'Dashboard';
  // Persist hash
  if (location.hash !== '#' + name) location.hash = name;
}

function initRouter() {
  document.querySelectorAll('.nav-item[data-view]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      setView(el.dataset.view);
    });
  });
  const initial = (location.hash || '#detail').slice(1);
  setView(VIEW_TITLES[initial] ? initial : 'detail');
}

// ----------------------- INTERACTIONS ------------------------
function initFilters() {
  const param = document.getElementById('detailParam');
  const cat = document.getElementById('detailCategory');
  if (param) param.addEventListener('change', applyFilters);
  if (cat)   cat.addEventListener('change', applyFilters);

  // Category dropdown population
  if (cat) {
    const cats = [...new Set(ROWS.map(r => r.category))].sort();
    cats.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c; opt.textContent = c;
      cat.appendChild(opt);
    });
  }

  // Period filter "Limpiar"
  const pfClear = document.getElementById('pfClear');
  if (pfClear) pfClear.addEventListener('click', () => {
    document.querySelectorAll('.pf-row input[type=checkbox]').forEach(cb => cb.checked = false);
  });

  // Cat row click → set category
  document.addEventListener('click', e => {
    const catRow = e.target.closest('.cat-row[data-cat]');
    if (catRow && cat) {
      cat.value = catRow.dataset.cat;
      applyFilters();
    }
  });
}

function applyFilters() {
  const param = document.getElementById('detailParam')?.value || 'best_margin';
  const category = document.getElementById('detailCategory')?.value || '';
  let rows = ROWS.slice();
  if (category) rows = rows.filter(r => r.category === category);

  // Sort
  const sortFns = {
    best_margin: (a,b) => (b.margin_pct||0) - (a.margin_pct||0),
    cheapest: (a,b) => a.cost - b.cost,
    highest_msrp: (a,b) => (b.msrp||0) - (a.msrp||0),
    recent_offer: (a,b) => (b.offer_date||'').localeCompare(a.offer_date||''),
    recent_sale: (a,b) => (b.sale_date||'').localeCompare(a.sale_date||''),
    highest_qty: (a,b) => (b.sale_qty||0) - (a.sale_qty||0)
  };
  rows.sort(sortFns[param] || sortFns.best_margin);

  renderHeroKpis(rows);
  renderFunnel(rows);
  renderCategories(rows);
  renderDetailTable(rows);
}

// ----------------------- CONSULTAS ---------------------------
function initConsultas() {
  const input = document.getElementById('consultaInput');
  const empty = document.getElementById('consultaEmpty');
  const results = document.getElementById('consultaResults');

  document.querySelectorAll('.chip[data-chip]').forEach(chip => {
    chip.addEventListener('click', () => {
      input.value = chip.dataset.chip;
      runConsulta();
    });
  });

  const runBtn = document.getElementById('consultaBtn');
  if (runBtn) runBtn.addEventListener('click', runConsulta);
  if (input) input.addEventListener('keydown', e => { if (e.key === 'Enter') runConsulta(); });

  function runConsulta() {
    const q = input.value.trim().toLowerCase();
    if (!q) { empty.style.display = 'block'; results.innerHTML = ''; return; }
    const matches = ROWS.filter(r =>
      r.barcode.includes(q) ||
      r.name.toLowerCase().includes(q) ||
      r.brand.toLowerCase().includes(q) ||
      r.category.toLowerCase().includes(q)
    ).slice(0, 30);

    if (matches.length === 0) {
      empty.style.display = 'block';
      empty.querySelector('h3').textContent = 'Sin resultados';
      empty.querySelector('p').textContent = `No encontramos coincidencias para "${q}".`;
      results.innerHTML = '';
      return;
    }

    empty.style.display = 'none';
    results.innerHTML = `
      <div class="card">
        <div class="section-head">
          <h3>Resultados para "${q}"</h3>
          <span class="subtle">${matches.length} coincidencias</span>
        </div>
        <div class="table-wrap">
          <table class="results-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Marca</th>
                <th>Categoría</th>
                <th class="num">Cost</th>
                <th class="num">MSRP</th>
                <th class="num">Margen</th>
              </tr>
            </thead>
            <tbody>
              ${matches.map(r => `
                <tr>
                  <td>
                    <div class="cell-prod-name">${r.name}</div>
                    <div class="cell-prod-bc">${r.barcode}</div>
                  </td>
                  <td>${r.brand}</td>
                  <td>${r.category}</td>
                  <td class="num">${fmt.eur(r.cost)}</td>
                  <td class="num">${fmt.eur(r.msrp)}</td>
                  <td class="num">${r.margin_pct ? `<span class="margin-pos">${fmt.pct(r.margin_pct)}</span>` : '—'}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  }
}

// ----------------------- THEME TOGGLE ------------------------
function initTheme() {
  const btn = document.getElementById('themeToggle');
  const label = document.getElementById('themeLabel');
  if (!btn) return;
  const stored = localStorage.getItem('bast_theme') || 'dark';
  document.body.dataset.theme = stored;
  if (label) label.textContent = stored === 'dark' ? 'Modo claro' : 'Modo oscuro';
  btn.addEventListener('click', () => {
    const next = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
    document.body.dataset.theme = next;
    localStorage.setItem('bast_theme', next);
    if (label) label.textContent = next === 'dark' ? 'Modo claro' : 'Modo oscuro';
  });
}

// ----------------------- BOOT --------------------------------
document.addEventListener('DOMContentLoaded', () => {
  initRouter();
  initTheme();
  initFilters();
  initConsultas();
  applyFilters();          // populates detail view
  renderCruces();
  renderCampaigns();
});
