// ====================== BAST DASHBOARD v2 ======================
const PROSPECTS = window.PROSPECTS || [];
const MATCHES = window.MATCHES || [];
const MATCH_SUMMARY = window.MATCH_SUMMARY || [];
const V2 = window.DATA_V2 || {};

// ─── Helpers ───
function escapeHtml(s) {
  if (s == null) return '';
  return String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));
}
function truncate(s, n) { s = s || ''; return s.length > n ? s.slice(0, n - 1) + '…' : s; }
function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
function fmtMoney(v) {
  if (v == null || isNaN(v)) return '—';
  return new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
}
function fmtInt(v) {
  if (v == null) return '0';
  return new Intl.NumberFormat('es-ES').format(v);
}
function ensureUrl(u) {
  if (!u) return '';
  u = String(u).trim();
  if (!u) return '';
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  return u;
}
function linkWeb(url, label) {
  const u = ensureUrl(url);
  if (!u) return '<span class="muted">—</span>';
  return `<a href="${escapeHtml(u)}" target="_blank" rel="noopener" class="link">${escapeHtml(label || u.replace(/^https?:\/\//, '').replace(/\/$/, ''))}</a>`;
}
function linkEmail(e) {
  if (!e) return '<span class="muted">—</span>';
  return `<a href="mailto:${escapeHtml(e)}" class="link">${escapeHtml(e)}</a>`;
}
function linkLi(u) {
  if (!u) return '<span class="muted">—</span>';
  return `<a href="${escapeHtml(ensureUrl(u))}" target="_blank" rel="noopener" class="link" title="LinkedIn">in ↗</a>`;
}

// ─── Hash routing & navigation ───
function showView(view) {
  document.querySelectorAll('.nav-item').forEach(n => {
    n.classList.toggle('active', n.dataset.view === view);
  });
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const target = document.getElementById('view-' + view);
  if (target) target.classList.add('active');
  if (view === 'map' && !window._mapInited) initMap();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function routeFromHash() {
  const h = (location.hash || '#home').replace(/^#/, '');
  showView(h || 'home');
}
window.addEventListener('hashchange', routeFromHash);
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', e => {
    if (item.dataset.view) {
      // hash href handles routing — ensure menu state updates immediately
      setTimeout(routeFromHash, 0);
    }
  });
});

// ─── Pipeline / Prospects ───
let filtered = [...PROSPECTS].sort((a, b) => b.score - a.score);
let page = 1;
const PAGE_SIZE = 25;

function populateCountryFilter() {
  const sel = document.getElementById('countryFilter');
  if (!sel) return;
  const countries = [...new Set(PROSPECTS.map(p => p.country).filter(Boolean))].sort();
  sel.innerHTML = '<option value="">Todos los países</option>' + countries.map(c => `<option>${escapeHtml(c)}</option>`).join('');
}

function applyFilters() {
  const r = document.getElementById('regionFilter').value;
  const s = document.getElementById('stageFilter').value;
  const c = document.getElementById('countryFilter')?.value || '';
  const q = (document.getElementById('globalSearch')?.value || '').toLowerCase().trim();
  filtered = PROSPECTS.filter(p => {
    if (r && p.region !== r) return false;
    if (s && p.stage !== s) return false;
    if (c && p.country !== c) return false;
    if (q) {
      const blob = (p.name + ' ' + p.country + ' ' + (p.brands||'') + ' ' + (p.type||'')).toLowerCase();
      if (!blob.includes(q)) return false;
    }
    return true;
  }).sort((a, b) => b.score - a.score);
  page = 1;
  renderTable();
  document.getElementById('rowCount').textContent = `${filtered.length.toLocaleString('es-ES')} filas`;
}

function initials(name) {
  return name.split(/[\s-]/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}
function scoreClass(s) {
  if (s >= 85) return 's-hot';
  if (s >= 70) return 's-warm';
  return 's-cool';
}
function scoreColor(s) {
  if (s >= 85) return 'var(--green)';
  if (s >= 70) return 'var(--amber)';
  return 'var(--text-3)';
}

function renderTable() {
  const tbody = document.getElementById('tbody');
  const start = (page - 1) * PAGE_SIZE;
  const slice = filtered.slice(start, start + PAGE_SIZE);
  tbody.innerHTML = slice.map((p, idx) => {
    const realIdx = PROSPECTS.indexOf(p);
    return `
    <tr class="row-link" data-pidx="${realIdx}">
      <td><input type="checkbox" onclick="event.stopPropagation()"></td>
      <td><div class="company-cell">
        <div class="company-icon">${initials(p.name)}</div>
        <div>
          <div class="company-name">${escapeHtml(p.name)}</div>
          <div class="company-sub">${escapeHtml(p.city || '')}${p.city && p.subcat ? ' · ' : ''}${escapeHtml(p.subcat || '')}</div>
        </div>
      </div></td>
      <td><span class="flag">${escapeHtml(p.country)}</span></td>
      <td style="color: var(--text-2); font-size: 12px;">${escapeHtml(p.type || '')}</td>
      <td><div class="score-cell">
        <div class="score-bar"><div class="score-fill" style="width:${p.score}%; background:${scoreColor(p.score)}"></div></div>
        <span class="score-num ${scoreClass(p.score)}">${p.score}</span>
      </div></td>
      <td><span class="stage-pill stage-${p.stage}">${p.stage}</span></td>
      <td><div class="brands-cell" title="${escapeHtml(p.brands||'')}">${escapeHtml(p.brands || '—')}</div></td>
      <td class="contact-cell">
        ${p.web ? linkWeb(p.web, '🌐') : ''}
        ${p.email ? linkEmail(p.email).replace(/>([^<]+)</, '>✉<') : ''}
        ${p.linkedin ? linkLi(p.linkedin) : ''}
      </td>
      <td><button class="action-btn" onclick="event.stopPropagation(); openProspectModal(${realIdx})">⋯</button></td>
    </tr>
  `;}).join('');
  const total = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  document.getElementById('pageInfo').textContent = `Página ${page} de ${total}`;
  // attach row click
  tbody.querySelectorAll('.row-link').forEach(tr => {
    tr.addEventListener('click', () => openProspectModal(parseInt(tr.dataset.pidx)));
  });
}

// ─── Modal ───
function openProspectModal(idx) {
  const p = PROSPECTS[idx];
  if (!p) return;
  const modal = document.getElementById('prospectModal');
  document.getElementById('modalTitle').textContent = p.name;
  document.getElementById('modalBody').innerHTML = `
    <div class="modal-grid">
      <div><div class="kpi-label">País</div><div>${escapeHtml(p.country)} · ${escapeHtml(p.city||'')}</div></div>
      <div><div class="kpi-label">Región</div><div>${escapeHtml(p.region||'')}</div></div>
      <div><div class="kpi-label">Tipo</div><div>${escapeHtml(p.type||'')}</div></div>
      <div><div class="kpi-label">Score</div><div><span class="score-num ${scoreClass(p.score)}">${p.score}</span></div></div>
      <div><div class="kpi-label">Stage</div><div><span class="stage-pill stage-${p.stage}">${p.stage}</span></div></div>
      <div><div class="kpi-label">Sub-categoría</div><div>${escapeHtml(p.subcat||'')}</div></div>
    </div>
    <div class="modal-section"><div class="kpi-label">Brands</div><div>${escapeHtml(p.brands||'—')}</div></div>
    <div class="modal-section"><div class="kpi-label">Notas</div><div style="color:var(--text-2); line-height:1.55">${escapeHtml(p.notes||'—')}</div></div>
    <div class="modal-section">
      <div class="kpi-label">Contacto</div>
      <div class="contact-row">
        ${p.web ? `<div>🌐 ${linkWeb(p.web)}</div>` : ''}
        ${p.email ? `<div>✉ ${linkEmail(p.email)}</div>` : ''}
        ${p.linkedin ? `<div>in ${linkWeb(p.linkedin, 'LinkedIn')}</div>` : ''}
        ${p.phone ? `<div>📞 <a class="link" href="tel:${escapeHtml(p.phone)}">${escapeHtml(p.phone)}</a></div>` : ''}
      </div>
    </div>
    ${p.source ? `<div class="modal-section"><div class="kpi-label">Fuente</div><div>${linkWeb(p.source, 'Fuente original')}</div></div>` : ''}
  `;
  modal.style.display = 'flex';
}
document.getElementById('modalClose').addEventListener('click', () => {
  document.getElementById('prospectModal').style.display = 'none';
});
document.getElementById('prospectModal').addEventListener('click', e => {
  if (e.target.id === 'prospectModal') e.target.style.display = 'none';
});

document.getElementById('regionFilter').addEventListener('change', applyFilters);
document.getElementById('stageFilter').addEventListener('change', applyFilters);
document.getElementById('countryFilter')?.addEventListener('change', applyFilters);
document.getElementById('globalSearch').addEventListener('input', debounce(applyFilters, 200));
document.getElementById('clearFilters')?.addEventListener('click', () => {
  document.getElementById('regionFilter').value = '';
  document.getElementById('stageFilter').value = '';
  document.getElementById('countryFilter').value = '';
  document.getElementById('globalSearch').value = '';
  applyFilters();
});
document.getElementById('prevPage').addEventListener('click', () => { if (page > 1) { page--; renderTable(); } });
document.getElementById('nextPage').addEventListener('click', () => { if (page * PAGE_SIZE < filtered.length) { page++; renderTable(); } });

// ─── Region chart ───
function renderRegionChart() {
  const counts = {};
  PROSPECTS.forEach(p => { counts[p.region] = (counts[p.region] || 0) + 1; });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const max = sorted[0][1];
  const colors = ['', 'bf-pink', 'bf-amber', 'bf-green', ''];
  document.getElementById('regionChart').innerHTML = sorted.map(([k, v], i) => `
    <div class="bar-row clickable" data-region="${escapeHtml(k)}">
      <div class="lbl">${k}</div>
      <div class="bar-track"><div class="bar-fill ${colors[i]||''}" style="width:${(v / max) * 100}%"></div></div>
      <div class="val">${v}</div>
    </div>
  `).join('');
  document.querySelectorAll('#regionChart .bar-row').forEach(r => {
    r.addEventListener('click', () => {
      document.getElementById('regionFilter').value = r.dataset.region;
      applyFilters();
    });
  });
}

// ─── Funnel ───
function renderFunnel() {
  const stages = ['New', 'Researching', 'Contacted', 'Engaged', 'Negotiating', 'Won'];
  const counts = stages.map(s => ({ stage: s, n: PROSPECTS.filter(p => p.stage === s).length }));
  const max = counts[0].n || 1;
  document.getElementById('funnelChart').innerHTML = counts.map(c => `
    <div class="funnel-row clickable" data-stage="${c.stage}">
      <div class="lbl">${c.stage}</div>
      <div class="funnel-bar" style="width:${(c.n / max) * 100}%">${c.n}</div>
      <div class="val">${((c.n / counts[0].n) * 100).toFixed(0)}%</div>
    </div>
  `).join('');
  document.querySelectorAll('#funnelChart .funnel-row').forEach(r => {
    r.addEventListener('click', () => {
      document.getElementById('stageFilter').value = r.dataset.stage;
      applyFilters();
    });
  });
}

// ─── Matches ───
function renderMatches() {
  const tbody = document.getElementById('matchesBody');
  if (!tbody) return;
  const filter = document.getElementById('matchTypeFilter')?.value || '';
  const rows = MATCHES.filter(m => !filter || m.Match_Type === filter);
  tbody.innerHTML = rows.map(m => `
    <tr>
      <td><strong>${escapeHtml(m.Prospect)}</strong></td>
      <td><span class="flag">${escapeHtml(m.List_Type || '')}</span></td>
      <td>${escapeHtml(truncate(m.Prospect_Producto, 38))}</td>
      <td style="color: var(--text-2);">${escapeHtml(m.Prospect_Marca || '')}</td>
      <td style="font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--text-3);">${escapeHtml(m.Prospect_UPC || '—')}</td>
      <td>${escapeHtml(truncate(m.Heineman_Producto, 30))}</td>
      <td style="color: var(--text-2); font-size: 12px;">${escapeHtml(m.Heineman_Categoria || '')}</td>
      <td><span class="match-tag match-${m.Match_Type}">${m.Match_Type === 'UPC_EXACT' ? 'UPC' : 'FUZZY'}</span></td>
      <td><strong style="font-variant-numeric: tabular-nums;">${typeof m.Match_Score === 'number' ? m.Match_Score.toFixed(2) : m.Match_Score}</strong></td>
    </tr>
  `).join('');
}
document.getElementById('matchTypeFilter')?.addEventListener('change', renderMatches);

function renderProspectMatchesChart() {
  const max = MATCH_SUMMARY[0]?.Coincidencias || 1;
  const colors = ['', 'bf-pink', 'bf-amber', 'bf-green', '', '', ''];
  document.getElementById('prospectMatchesChart').innerHTML = MATCH_SUMMARY.map((s, i) => `
    <div class="bar-row">
      <div class="lbl">${escapeHtml(s.Prospect)}</div>
      <div class="bar-track"><div class="bar-fill ${colors[i]||''}" style="width:${(s.Coincidencias / max) * 100}%"></div></div>
      <div class="val">${s.Coincidencias}</div>
    </div>
  `).join('');
}
function renderCategoryChart() {
  const cats = {};
  MATCHES.forEach(m => {
    const c = (m.Heineman_Categoria || '').split('/')[0].trim();
    if (c) cats[c] = (cats[c] || 0) + 1;
  });
  const sorted = Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const max = sorted[0]?.[1] || 1;
  const colors = ['bf-pink', '', 'bf-amber', 'bf-green', '', '', '', ''];
  document.getElementById('categoryChart').innerHTML = sorted.map(([k, v], i) => `
    <div class="bar-row">
      <div class="lbl">${escapeHtml(k)}</div>
      <div class="bar-track"><div class="bar-fill ${colors[i]||''}" style="width:${(v / max) * 100}%"></div></div>
      <div class="val">${v}</div>
    </div>
  `).join('');
}

// ─── Map (drill-down + click filter) ───
const COUNTRY_COORDS = {
  "Saudi Arabia":[24.7,46.7],"Qatar":[25.3,51.2],"UAE":[24.5,54.4],"Lebanon":[33.9,35.5],"Jordan":[31.9,35.9],
  "Kuwait":[29.4,47.9],"Bahrain":[26.2,50.6],"Oman":[23.6,58.5],"Israel":[31.8,35.2],"Iraq":[33.3,44.4],
  "South Africa":[-30,25],"Nigeria":[9,8],"Kenya":[-1.3,36.8],"Ghana":[7.9,-1],"Morocco":[33.6,-7.6],
  "Egypt":[30,31.2],"Tanzania":[-6.8,39.3],"Angola":[-8.8,13.2],"Mozambique":[-25.9,32.6],"Namibia":[-22.5,17],
  "Zambia":[-15.4,28.3],"Ivory Coast":[5.3,-4],"Senegal":[14.7,-17.5],"Mauritius":[-20.2,57.5],"Ethiopia":[9,38.7],
  "Mexico":[19.4,-99.1],"Brazil":[-23.5,-46.6],"Argentina":[-34.6,-58.4],"Chile":[-33.4,-70.6],"Colombia":[4.7,-74.1],
  "Peru":[-12,-77],"Uruguay":[-34.9,-56.2],"Paraguay":[-25.3,-57.6],"Panama":[8.9,-79.5],"Ecuador":[-0.2,-78.5],
  "Dominican Republic":[18.5,-69.9],"Costa Rica":[9.9,-84.1],"Guatemala":[14.6,-90.5],
  "Aruba/Curacao":[12.5,-69.9],"Bahamas":[25,-77.4],
  "Singapore":[1.35,103.8],"Hong Kong":[22.3,114.2],"Vietnam":[10.8,106.7],"Thailand":[13.7,100.5],
  "Malaysia":[3.1,101.7],"Philippines":[14.6,121],"Indonesia":[-6.2,106.8],"South Korea":[37.5,127],
  "Japan":[35.7,139.7],"Taiwan":[25,121.5],"India":[28.6,77.2],"Cambodia":[11.6,104.9],
  "Sri Lanka":[6.9,79.9],"China":[19.6,109.6],"Mongolia":[47.9,106.9],
  "Turkey":[41,29],"Lithuania":[54.7,25.3],"Kazakhstan":[43.2,76.9],"Latvia/Estonia":[58.4,24.7],
  "Georgia/Armenia":[41.7,44.8],"Azerbaijan/Uzbekistan":[40.4,49.9],"Ukraine":[50.4,30.5],
  "Cyprus/Malta":[35,33.4],"Bulgaria/Romania":[44.4,26.1],"Greece":[37.98,23.7]
};
const REGION_COLORS = {
  "Africa": "#F59E0B", "Middle East": "#EF4444", "LATAM": "#10B981",
  "Asia": "#3B82F6", "Eurasia/CIS/Eastern Europe": "#8B5CF6", "Other": "#94A0B8"
};

let mapState = { map: null, layer: null, selCountry: null };

function jitter(seed, amp) {
  // deterministic jitter from seed
  let h = 0; for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return ((h % 1000) / 1000 - 0.5) * amp;
}

function rebuildMapLayer() {
  if (!mapState.map) return;
  if (mapState.layer) { mapState.map.removeLayer(mapState.layer); }
  const layer = L.layerGroup();
  const zoom = mapState.map.getZoom();
  document.getElementById('mapZoom').textContent = zoom;

  // Aggregate by country
  const byCountry = {};
  PROSPECTS.forEach(p => {
    if (!byCountry[p.country]) byCountry[p.country] = { count: 0, region: p.region, list: [] };
    byCountry[p.country].count++;
    byCountry[p.country].list.push(p);
  });

  if (zoom <= 3) {
    // Country aggregate circles
    Object.entries(byCountry).forEach(([country, info]) => {
      const coords = COUNTRY_COORDS[country];
      if (!coords) return;
      const radius = Math.min(6 + Math.sqrt(info.count) * 2.5, 28);
      const color = REGION_COLORS[info.region] || "#94A0B8";
      const marker = L.circleMarker(coords, {
        radius, fillColor: color, color: color, weight: 1.5,
        opacity: .9, fillOpacity: .55
      });
      const top3 = info.list.slice(0, 3).map(p => `<div style="margin-top:4px"><strong>${escapeHtml(p.name)}</strong><br><span style="color:#94A0B8;font-size:10px">Score ${p.score} · ${escapeHtml(p.type || '')}</span></div>`).join('');
      marker.bindPopup(`<strong>${escapeHtml(country)}</strong><br><span style="color:#94A0B8">${info.count} prospects · ${info.region}</span>${top3}<br><br><span style="color:#3B82F6">Click para filtrar →</span>`);
      marker.on('click', () => filterMapByCountry(country));
      layer.addLayer(marker);
    });
  } else if (zoom <= 5) {
    // Country circle + small cluster splits (still aggregate but smaller)
    Object.entries(byCountry).forEach(([country, info]) => {
      const coords = COUNTRY_COORDS[country];
      if (!coords) return;
      // Split into clusters of up to 10
      const clusters = Math.min(Math.ceil(info.count / 8), 5);
      for (let i = 0; i < clusters; i++) {
        const lat = coords[0] + jitter(country + i + 'lat', 4);
        const lng = coords[1] + jitter(country + i + 'lng', 6);
        const sub = info.list.slice(i * Math.ceil(info.count / clusters), (i + 1) * Math.ceil(info.count / clusters));
        if (!sub.length) continue;
        const color = REGION_COLORS[info.region] || "#94A0B8";
        const marker = L.circleMarker([lat, lng], {
          radius: Math.min(5 + Math.sqrt(sub.length) * 2, 18),
          fillColor: color, color: color, weight: 1.5, opacity: .9, fillOpacity: .6
        });
        const list3 = sub.slice(0, 5).map(p => `<div><strong>${escapeHtml(p.name)}</strong> · Score ${p.score}</div>`).join('');
        marker.bindPopup(`<strong>${escapeHtml(country)}</strong><br><span style="color:#94A0B8">${sub.length} empresas en cluster</span><br>${list3}<br><br><span style="color:#3B82F6">Click para filtrar →</span>`);
        marker.on('click', () => filterMapByCountry(country));
        layer.addLayer(marker);
      }
    });
  } else {
    // Individual company markers
    PROSPECTS.forEach((p, idx) => {
      const coords = COUNTRY_COORDS[p.country];
      if (!coords) return;
      const lat = coords[0] + jitter(p.name + 'lat', 6);
      const lng = coords[1] + jitter(p.name + 'lng', 8);
      const color = REGION_COLORS[p.region] || "#94A0B8";
      const marker = L.circleMarker([lat, lng], {
        radius: 5 + (p.score >= 80 ? 3 : 0),
        fillColor: color, color: '#fff', weight: 1, opacity: .9, fillOpacity: .9
      });
      marker.bindPopup(`<strong>${escapeHtml(p.name)}</strong><br>
        <span style="color:#94A0B8">${escapeHtml(p.country)} · Score ${p.score} · ${escapeHtml(p.type||'')}</span><br>
        ${p.web ? `<a href="${escapeHtml(ensureUrl(p.web))}" target="_blank" style="color:#3B82F6">🌐 Sitio web</a><br>` : ''}
        ${p.linkedin ? `<a href="${escapeHtml(ensureUrl(p.linkedin))}" target="_blank" style="color:#3B82F6">in LinkedIn</a><br>` : ''}
        ${p.email ? `<a href="mailto:${escapeHtml(p.email)}" style="color:#3B82F6">✉ Email</a><br>` : ''}
        <span style="color:#94A0B8;font-size:10px">${escapeHtml(truncate(p.brands||'',60))}</span>`);
      marker.on('click', () => filterMapByCountry(p.country));
      layer.addLayer(marker);
    });
  }
  layer.addTo(mapState.map);
  mapState.layer = layer;
}

function filterMapByCountry(country) {
  mapState.selCountry = country;
  document.getElementById('mapFilterLabel').textContent = `Filtrado: ${country}`;
  document.getElementById('mapClearFilter').style.display = '';
  const list = PROSPECTS.filter(p => p.country === country).sort((a,b) => b.score - a.score);
  document.getElementById('mapSelCount').textContent = `${list.length} prospects en ${country}`;
  document.getElementById('mapSelBody').innerHTML = list.map((p, i) => `
    <tr class="row-link" data-pidx="${PROSPECTS.indexOf(p)}">
      <td><strong>${escapeHtml(p.name)}</strong><div class="muted">${escapeHtml(p.type||'')}</div></td>
      <td>${escapeHtml(p.country)}</td>
      <td><span class="score-num ${scoreClass(p.score)}">${p.score}</span></td>
      <td>${linkWeb(p.web,'🌐')}</td>
      <td>${linkLi(p.linkedin)}</td>
      <td>${linkEmail(p.email)}</td>
    </tr>
  `).join('');
  document.querySelectorAll('#mapSelBody .row-link').forEach(tr => {
    tr.addEventListener('click', e => {
      if (e.target.tagName === 'A') return;
      openProspectModal(parseInt(tr.dataset.pidx));
    });
  });
}

function initMap() {
  window._mapInited = true;
  const map = L.map('map', { worldCopyJump: true, minZoom: 2 }).setView([15, 20], 2);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO', subdomains: 'abcd', maxZoom: 18
  }).addTo(map);
  mapState.map = map;
  map.on('zoomend moveend', rebuildMapLayer);
  rebuildMapLayer();
}
document.getElementById('mapClearFilter').addEventListener('click', () => {
  mapState.selCountry = null;
  document.getElementById('mapFilterLabel').textContent = 'Sin filtro';
  document.getElementById('mapClearFilter').style.display = 'none';
  document.getElementById('mapSelCount').textContent = '— prospects';
  document.getElementById('mapSelBody').innerHTML = '';
});

// ─── Health view ───
const WORKFLOWS = [
  { name: "wf_prospect_discovery", run: "Lun 06:00", lastRun: "hoy 06:01", duration: "12m 14s", status: "ok" },
  { name: "wf_market_pulse", run: "Diario 08:00", lastRun: "hoy 08:00", duration: "1m 42s", status: "ok" },
  { name: "wf_catalog_ingest", run: "Trigger Drive", lastRun: "ayer 17:23", duration: "47s", status: "ok" },
  { name: "wf_offer_ingest", run: "Trigger email", lastRun: "hoy 09:14", duration: "1m 8s", status: "ok" },
  { name: "wf_product_matching", run: "Post-ingest", lastRun: "hoy 09:16", duration: "3m 22s", status: "ok" },
  { name: "wf_lead_scoring", run: "Cada 6h", lastRun: "hoy 12:00", duration: "55s", status: "ok" },
  { name: "wf_outreach", run: "Trigger score>80", lastRun: "hoy 10:42", duration: "2m 11s", status: "warn" },
  { name: "wf_followup", run: "Diario 17:00", lastRun: "ayer 17:00", duration: "38s", status: "ok" },
  { name: "wf_audio_brief", run: "Diario 07:00", lastRun: "hoy 07:00", duration: "1m 30s", status: "ok" },
  { name: "wf_weekly_report", run: "Vie 17:00", lastRun: "vie 17:02", duration: "4m 17s", status: "ok" },
];
function renderWorkflows() {
  const el = document.getElementById('wfList');
  if (!el) return;
  el.innerHTML = WORKFLOWS.map(w => `
    <div class="wf-row">
      <div>
        <div class="wf-name" style="font-family: 'JetBrains Mono', monospace;">${w.name}</div>
        <div class="wf-meta">${w.run} · última: ${w.lastRun}</div>
      </div>
      <div class="wf-meta">${w.duration}</div>
      <div class="wf-status wf-${w.status}">${w.status === 'ok' ? '✓ OK' : '⚠ WARN'}</div>
    </div>
  `).join('');
}
const COSTS = [
  { model: "GPT-5 (outreach)", val: 142, color: "" },
  { model: "Claude Sonnet 4.6", val: 98, color: "bf-pink" },
  { model: "Perplexity Computer", val: 42, color: "bf-amber" },
  { model: "Manus", val: 18, color: "bf-green" },
  { model: "ElevenLabs", val: 12, color: "" },
];
function renderCostChart() {
  const el = document.getElementById('costChart');
  if (!el) return;
  const max = COSTS[0].val;
  el.innerHTML = COSTS.map(c => `
    <div class="bar-row">
      <div class="lbl">${c.model}</div>
      <div class="bar-track"><div class="bar-fill ${c.color}" style="width:${(c.val / max) * 100}%"></div></div>
      <div class="val">$${c.val}</div>
    </div>
  `).join('');
}
const LOGS = [
  { wf: "wf_offer_ingest", time: "09:14:32", dur: "1m 8s", model: "Claude", status: "ok", out: "products_offered +47 SKUs" },
  { wf: "wf_product_matching", time: "09:16:01", dur: "3m 22s", model: "—", status: "ok", out: "1.208 matches generados" },
  { wf: "wf_lead_scoring", time: "12:00:04", dur: "55s", model: "—", status: "ok", out: "189 prospects con score≥80" },
  { wf: "wf_outreach", time: "10:42:18", dur: "2m 11s", model: "GPT-5", status: "warn", out: "12 emails generados, 1 rate-limited" },
  { wf: "wf_audio_brief", time: "07:00:11", dur: "1m 30s", model: "ElevenLabs", status: "ok", out: "brief_2026-04-28.mp3 → WhatsApp" },
  { wf: "wf_market_pulse", time: "08:00:02", dur: "1m 42s", model: "Perplexity", status: "ok", out: "9 signals → #market-pulse" },
];
function renderLogs() {
  const tbody = document.getElementById('logsBody');
  if (!tbody) return;
  tbody.innerHTML = LOGS.map(l => `
    <tr>
      <td style="font-family: 'JetBrains Mono', monospace; font-size: 12px;">${l.wf}</td>
      <td style="color: var(--text-3);">${l.time}</td>
      <td style="color: var(--text-2);">${l.dur}</td>
      <td><span class="match-tag match-BRAND_PRODUCT_FUZZY">${l.model}</span></td>
      <td><span class="wf-status wf-${l.status}">${l.status === 'ok' ? '✓ OK' : '⚠ WARN'}</span></td>
      <td style="color: var(--text-2); font-size: 12px;">${l.out}</td>
    </tr>
  `).join('');
}

// ====================== HOME · PRICING ======================
function renderHomePricing() {
  const p = V2.pricing;
  if (!p) return;
  const k = p.kpi;
  document.getElementById('pricingKpis').innerHTML = `
    <div class="kpi"><div class="kpi-label">SKUs Heineman</div><div class="kpi-value">${fmtInt(k.total_products_heineman)}</div><div class="kpi-delta delta-flat">${fmtInt(k.with_net_price)} con Net Price</div></div>
    <div class="kpi"><div class="kpi-label">Coincidencias detectadas</div><div class="kpi-value">${fmtInt(k.matches_found)}</div><div class="kpi-delta delta-flat">vs Pesco + ofertas prospects</div></div>
    <div class="kpi"><div class="kpi-label">Donde somos más baratos</div><div class="kpi-value" style="color:var(--green)">${fmtInt(k.we_cheaper_count)}</div><div class="kpi-delta delta-up">${(k.we_cheaper_count*100/Math.max(1,k.matches_found)).toFixed(0)}% del total</div></div>
    <div class="kpi"><div class="kpi-label">Margen promedio %</div><div class="kpi-value">${k.avg_margin_pct}%</div><div class="kpi-delta delta-up">€ ${fmtMoney(k.total_potential_eur)} de oportunidad</div></div>
  `;
  // Top opps chart
  const ops = (p.top_opportunities || []).slice(0, 10);
  const max = Math.max(...ops.map(o => o.margin_pct), 1);
  document.getElementById('topOppsChart').innerHTML = ops.map((o, i) => `
    <div class="bar-row">
      <div class="lbl" title="${escapeHtml(o.product)}">${escapeHtml(truncate(o.product, 28))}</div>
      <div class="bar-track"><div class="bar-fill bf-green" style="width:${(o.margin_pct/max)*100}%"></div></div>
      <div class="val" style="color:var(--green)">+${o.margin_pct.toFixed(0)}%</div>
    </div>
  `).join('') || '<div class="muted" style="padding:20px">Sin oportunidades detectadas aún</div>';
  // By category (we_cheaper)
  const catCount = {};
  (p.all_matches || []).filter(m => m.we_cheaper).forEach(m => {
    const c = (m.category || 'Otros').split('/')[0].trim();
    catCount[c] = (catCount[c]||0) + 1;
  });
  const sortedCats = Object.entries(catCount).sort((a,b) => b[1]-a[1]).slice(0,6);
  const cmax = sortedCats[0]?.[1] || 1;
  const colors = ['', 'bf-pink', 'bf-amber', 'bf-green', '', ''];
  document.getElementById('catCompareChart').innerHTML = sortedCats.map(([k,v],i) => `
    <div class="bar-row">
      <div class="lbl">${escapeHtml(k)}</div>
      <div class="bar-track"><div class="bar-fill ${colors[i]||''}" style="width:${(v/cmax)*100}%"></div></div>
      <div class="val">${v}</div>
    </div>
  `).join('') || '<div class="muted" style="padding:20px">Sin datos</div>';
  renderPricingTable();
}

function renderPricingTable() {
  const filter = document.getElementById('onlyCheaperFilter').value;
  const all = V2.pricing.all_matches || [];
  const rows = filter === 'cheaper' ? all.filter(m => m.we_cheaper) : all;
  rows.sort((a,b) => b.margin_pct - a.margin_pct);
  document.getElementById('pricingRowCount').textContent = `${rows.length} filas`;
  document.getElementById('pricingBody').innerHTML = rows.slice(0, 200).map(m => `
    <tr>
      <td><strong>${escapeHtml(truncate(m.product, 35))}</strong></td>
      <td style="color:var(--text-2)">${escapeHtml(m.brand)}</td>
      <td style="color:var(--text-3);font-size:12px">${escapeHtml(m.size)}</td>
      <td style="color:var(--text-2);font-size:12px">${escapeHtml(m.category||'')}</td>
      <td class="num" style="font-family:monospace">€ ${fmtMoney(m.heineman_price)}</td>
      <td>${escapeHtml(m.competitor)}</td>
      <td class="num" style="font-family:monospace;color:var(--text-2)">€ ${fmtMoney(m.competitor_price)}</td>
      <td class="num" style="color:${m.we_cheaper?'var(--green)':'var(--pink)'};font-family:monospace">${m.margin_eur > 0 ? '+' : ''}${fmtMoney(m.margin_eur)}</td>
      <td class="num" style="color:${m.we_cheaper?'var(--green)':'var(--pink)'};font-weight:600">${m.margin_pct > 0 ? '+' : ''}${m.margin_pct.toFixed(1)}%</td>
      <td>${m.we_cheaper ? '<span class="match-tag" style="background:rgba(16,185,129,.15);color:var(--green)">✓ Margen</span>' : '<span class="match-tag" style="background:rgba(239,68,68,.15);color:var(--pink)">Más caro</span>'}</td>
    </tr>
  `).join('') || '<tr><td colspan="10" class="muted" style="padding:30px;text-align:center">Sin coincidencias para este filtro</td></tr>';
}
document.getElementById('onlyCheaperFilter').addEventListener('change', renderPricingTable);

// ====================== LISTAS NOW ======================
let listasSelected = null;
function renderListas() {
  const lns = V2.listas_now || [];
  document.getElementById('badgeListas').textContent = lns.length;
  const totalItems = lns.reduce((a,l) => a + l.item_count, 0);
  const totalCompanies = lns.length;
  const avgPrice = lns.length ? (lns.reduce((a,l) => a + l.avg_price, 0) / lns.length) : 0;
  document.getElementById('listasKpis').innerHTML = `
    <div class="kpi"><div class="kpi-label">Listas activas</div><div class="kpi-value">${totalCompanies}</div><div class="kpi-delta delta-flat">empresas con stock/wishlist</div></div>
    <div class="kpi"><div class="kpi-label">Items totales</div><div class="kpi-value">${fmtInt(totalItems)}</div><div class="kpi-delta delta-flat">SKUs únicos</div></div>
    <div class="kpi"><div class="kpi-label">Precio promedio (€)</div><div class="kpi-value">${fmtMoney(avgPrice)}</div><div class="kpi-delta delta-flat">según listas con precio</div></div>
    <div class="kpi"><div class="kpi-label">Última actualización</div><div class="kpi-value">28 abr</div><div class="kpi-delta delta-up">2026</div></div>
  `;
  const search = (document.getElementById('listasSearch')?.value || '').toLowerCase();
  const filtered = lns.filter(l => !search || l.company.toLowerCase().includes(search));
  document.getElementById('listasGrid').innerHTML = filtered.map((l, i) => `
    <div class="card lista-card" data-i="${i}">
      <div class="card-head">
        <div>
          <h3 style="margin-bottom:4px">${escapeHtml(l.company)}</h3>
          <div class="subtle">${l.item_count} items · actualizado ${l.last_update}</div>
        </div>
        <div class="kpi-value" style="font-size:24px">${fmtInt(l.item_count)}</div>
      </div>
      <div class="lista-stats">
        <div><span class="muted">Min</span><strong>€ ${fmtMoney(l.min_price)}</strong></div>
        <div><span class="muted">Promedio</span><strong>€ ${fmtMoney(l.avg_price)}</strong></div>
        <div><span class="muted">Max</span><strong>€ ${fmtMoney(l.max_price)}</strong></div>
      </div>
      <div class="muted" style="font-size:11px;margin-top:8px;font-family:monospace">📄 ${escapeHtml(l.source_file)}</div>
      <button class="btn-ghost-sm" style="margin-top:12px;width:100%" data-i="${i}">Ver items →</button>
    </div>
  `).join('');
  document.querySelectorAll('.lista-card button').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.i);
      selectLista(filtered[idx]);
    });
  });
  document.querySelectorAll('.lista-card').forEach(card => {
    card.addEventListener('click', () => {
      const idx = parseInt(card.dataset.i);
      selectLista(filtered[idx]);
    });
  });
}

function selectLista(l) {
  listasSelected = l;
  document.getElementById('listasSelLabel').textContent = `${l.company} · ${l.item_count} items`;
  document.getElementById('listasBody').innerHTML = (l.sample_items || []).map(it => `
    <tr>
      <td><strong>${escapeHtml(truncate(it.name, 60))}</strong></td>
      <td class="num" style="font-family:monospace">€ ${fmtMoney(it.price)}</td>
      <td class="muted" style="font-size:11px;font-family:monospace">${escapeHtml(it.src||'')}</td>
    </tr>
  `).join('');
}

document.getElementById('listasSearch')?.addEventListener('input', debounce(renderListas, 200));

// ====================== LEADS DASHBOARD ======================
function renderLeads() {
  const ld = V2.leads;
  if (!ld) return;
  document.getElementById('badgeLeads').textContent = ld.total;
  document.getElementById('leadsKpis').innerHTML = `
    <div class="kpi"><div class="kpi-label">Leads totales</div><div class="kpi-value">${fmtInt(ld.total)}</div><div class="kpi-delta delta-flat">ALL_Leads_Unified_v2</div></div>
    <div class="kpi"><div class="kpi-label">Países</div><div class="kpi-value">${ld.by_country.length}</div><div class="kpi-delta delta-flat">cobertura geográfica</div></div>
    <div class="kpi"><div class="kpi-label">Tipos de empresa</div><div class="kpi-value">${ld.by_type.length}</div><div class="kpi-delta delta-flat">categorías</div></div>
    <div class="kpi"><div class="kpi-label">Top país</div><div class="kpi-value">${escapeHtml(ld.by_country[0]?.[0]||'—')}</div><div class="kpi-delta delta-flat">${ld.by_country[0]?.[1]||0} leads</div></div>
  `;
  // Country chart
  const cmax = ld.by_country[0]?.[1] || 1;
  const colors = ['', 'bf-pink', 'bf-amber', 'bf-green'];
  document.getElementById('leadsCountryChart').innerHTML = ld.by_country.slice(0,10).map(([k,v],i) => `
    <div class="bar-row clickable" data-country="${escapeHtml(k)}">
      <div class="lbl">${escapeHtml(k)}</div>
      <div class="bar-track"><div class="bar-fill ${colors[i%4]||''}" style="width:${(v/cmax)*100}%"></div></div>
      <div class="val">${v}</div>
    </div>
  `).join('');
  // Type chart
  const tmax = ld.by_type[0]?.[1] || 1;
  document.getElementById('leadsTypeChart').innerHTML = ld.by_type.slice(0,8).map(([k,v],i) => `
    <div class="bar-row">
      <div class="lbl">${escapeHtml(k||'—')}</div>
      <div class="bar-track"><div class="bar-fill ${colors[i%4]||''}" style="width:${(v/tmax)*100}%"></div></div>
      <div class="val">${v}</div>
    </div>
  `).join('');
  // Filters
  const cSel = document.getElementById('leadsCountryFilter');
  cSel.innerHTML = '<option value="">Todos los países</option>' + ld.by_country.map(([c,n]) => `<option>${escapeHtml(c)}</option>`).join('');
  const tSel = document.getElementById('leadsTypeFilter');
  tSel.innerHTML = '<option value="">Todos los tipos</option>' + ld.by_type.map(([t,n]) => `<option>${escapeHtml(t||'')}</option>`).join('');
  renderLeadsTable();
}
function renderLeadsTable() {
  const ld = V2.leads;
  const c = document.getElementById('leadsCountryFilter').value;
  const t = document.getElementById('leadsTypeFilter').value;
  const q = (document.getElementById('leadsSearch').value || '').toLowerCase();
  const rows = (ld.leads || []).filter(l => {
    if (c && l['Country'] !== c) return false;
    if (t && l['Company Type'] !== t) return false;
    if (q && !((l['Company Name']||'').toLowerCase().includes(q))) return false;
    return true;
  });
  document.getElementById('leadsRowCount').textContent = `${rows.length} de ${ld.total} filas`;
  document.getElementById('leadsBody').innerHTML = rows.slice(0, 200).map(l => `
    <tr>
      <td><strong>${escapeHtml(l['Company Name']||'')}</strong></td>
      <td><span class="flag">${escapeHtml(l['Country']||'')}</span></td>
      <td style="color:var(--text-2);font-size:12px">${escapeHtml(l['Region']||'')}</td>
      <td style="color:var(--text-2);font-size:12px">${escapeHtml(l['Company Type']||'')}</td>
      <td style="color:var(--text-3);font-size:12px">${escapeHtml(l['Primary Category']||'')}</td>
      <td>${linkWeb(l['Website'])}</td>
    </tr>
  `).join('') || '<tr><td colspan="6" class="muted" style="padding:30px;text-align:center">Sin resultados</td></tr>';
}
document.getElementById('leadsCountryFilter').addEventListener('change', renderLeadsTable);
document.getElementById('leadsTypeFilter').addEventListener('change', renderLeadsTable);
document.getElementById('leadsSearch').addEventListener('input', debounce(renderLeadsTable, 200));

// ====================== OFERTAS REALIZADAS ======================
function renderOfertas() {
  const o = V2.ofertas || [];
  const totalProducts = o.reduce((a,x) => a + x.product_count, 0);
  const totalValue = o.reduce((a,x) => a + (x.total_value||0), 0);
  document.getElementById('ofertasKpis').innerHTML = `
    <div class="kpi"><div class="kpi-label">Ofertas registradas</div><div class="kpi-value">${o.length}</div><div class="kpi-delta delta-flat">catálogos enviados/recibidos</div></div>
    <div class="kpi"><div class="kpi-label">Productos totales</div><div class="kpi-value">${fmtInt(totalProducts)}</div><div class="kpi-delta delta-flat">SKUs ofertados</div></div>
    <div class="kpi"><div class="kpi-label">Valor total (€)</div><div class="kpi-value">€ ${fmtMoney(totalValue)}</div><div class="kpi-delta delta-up">Net Price</div></div>
    <div class="kpi"><div class="kpi-label">Última oferta</div><div class="kpi-value">28 abr</div><div class="kpi-delta delta-flat">Heineman</div></div>
  `;
  document.getElementById('ofertasBody').innerHTML = o.map(of => `
    <tr>
      <td style="font-family:monospace;font-size:12px"><strong>${escapeHtml(of.id)}</strong></td>
      <td>${escapeHtml(of.date)}</td>
      <td><span class="match-tag match-UPC_EXACT">${escapeHtml(of.source)}</span></td>
      <td>${escapeHtml(of.recipient)}</td>
      <td class="num">${fmtInt(of.product_count)}</td>
      <td class="num" style="color:var(--green)">${fmtInt(of.with_price)}</td>
      <td class="num" style="font-family:monospace">€ ${fmtMoney(of.total_value)}</td>
      <td style="font-size:11px;color:var(--text-2)">${(of.categories||[]).slice(0,4).map(c => escapeHtml(c)).join(', ')}…</td>
      <td style="font-family:monospace;font-size:11px;color:var(--text-3)">${escapeHtml(of.file)}</td>
    </tr>
  `).join('');
}

// ====================== CATÁLOGO HEINEMAN ======================
function renderCatalog() {
  const cat = V2.pricing?.sample_catalog || [];
  const q = (document.getElementById('catSearch')?.value || '').toLowerCase();
  const rows = cat.filter(p => !q || (p.brand+' '+p.name).toLowerCase().includes(q));
  document.getElementById('catRowCount').textContent = `${rows.length} de ${cat.length} filas (top ${cat.length} por precio)`;
  document.getElementById('catBody').innerHTML = rows.slice(0, 80).map(p => `
    <tr>
      <td><strong>${escapeHtml(p.brand||'')}</strong></td>
      <td>${escapeHtml(truncate(p.name||'', 50))}</td>
      <td style="color:var(--text-3);font-size:12px">${escapeHtml(p.size||'')}</td>
      <td style="color:var(--text-2);font-size:12px">${escapeHtml(p.category||'')}</td>
      <td style="color:var(--text-3);font-size:12px">${escapeHtml(p.origin||'')}</td>
      <td class="num" style="font-family:monospace;color:var(--green)">€ ${fmtMoney(p.net_price)}</td>
      <td class="num" style="font-family:monospace;color:var(--text-2)">${p.rsp ? '€ ' + fmtMoney(p.rsp) : '—'}</td>
    </tr>
  `).join('');
}
document.getElementById('catSearch')?.addEventListener('input', debounce(renderCatalog, 200));

// ─── Init ───
populateCountryFilter();
renderTable();
renderRegionChart();
renderFunnel();
renderMatches();
renderProspectMatchesChart();
renderCategoryChart();
renderWorkflows();
renderCostChart();
renderLogs();
renderHomePricing();
renderListas();
renderLeads();
renderOfertas();
renderCatalog();
renderAgents();
routeFromHash();

// ─── AGENTES · live status ───
function renderAgents() {
  const ag = AGENTS_DATA;

  // KPIs
  const onlineCount = ag.agents.filter(a => a.status === 'online').length;
  const totalRunsToday = ag.agents.reduce((s, a) => s + (a.runs_24h || 0), 0);
  const successRate = Math.round(
    ag.agents.reduce((s, a) => s + (a.success_rate || 0), 0) / ag.agents.length
  );
  const dataPoints =
    (window.DATA_V2?.leads?.length || 0) +
    (window.DATA_V2?.catalog?.length || 0) +
    PROSPECTS.length;

  document.getElementById('agentsKpis').innerHTML = `
    <div class="kpi">
      <div class="kpi-label">Agentes online</div>
      <div class="kpi-value green">${onlineCount}/${ag.agents.length}</div>
      <div class="kpi-delta delta-up">100% disponibilidad 7d</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Ejecuciones (24h)</div>
      <div class="kpi-value">${totalRunsToday.toLocaleString('es')}</div>
      <div class="kpi-delta delta-flat">distribuidas en ${ag.agents.length} agentes</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Tasa de éxito</div>
      <div class="kpi-value">${successRate}%</div>
      <div class="kpi-delta delta-up">3 errores · auto-retry</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Datos procesados</div>
      <div class="kpi-value">${dataPoints.toLocaleString('es')}</div>
      <div class="kpi-delta delta-flat">leads + SKUs + prospects</div>
    </div>`;

  // Stack de agentes
  document.getElementById('agentGrid').innerHTML = ag.agents.map(a => {
    const statusClass = a.status === 'online' ? 'st-on' : a.status === 'idle' ? 'st-idle' : 'st-off';
    const statusLabel = a.status === 'online' ? 'Online' : a.status === 'idle' ? 'En espera' : 'Offline';
    const taskHTML = a.current_task
      ? `<div class="agent-task"><i class="task-pulse"></i> ${escapeHtml(a.current_task)}</div>`
      : `<div class="agent-task subtle">Sin tarea activa</div>`;
    const linkHTML = a.url
      ? `<a class="link" href="${a.url}" target="_blank" rel="noopener">Abrir consola ↗</a>`
      : '';
    return `
      <div class="agent-card" style="border-left:4px solid ${a.color}">
        <div class="agent-head">
          <div class="agent-icon" style="background:${a.color}22; color:${a.color}">${a.icon}</div>
          <div class="agent-title-wrap">
            <div class="agent-title">${escapeHtml(a.name)}</div>
            <div class="agent-role subtle">${escapeHtml(a.role)}</div>
          </div>
          <span class="agent-status ${statusClass}"><i></i> ${statusLabel}</span>
        </div>
        ${taskHTML}
        <div class="agent-stats">
          <div><div class="stat-label">Runs 24h</div><div class="stat-val">${a.runs_24h || 0}</div></div>
          <div><div class="stat-label">Éxito</div><div class="stat-val">${a.success_rate || 0}%</div></div>
          <div><div class="stat-label">Última</div><div class="stat-val">${escapeHtml(a.last_run || '—')}</div></div>
        </div>
        <div class="agent-foot">${linkHTML}</div>
      </div>`;
  }).join('');

  // Actividad reciente
  document.getElementById('agentActivity').innerHTML = ag.activity.map(ev => `
    <div class="activity-item">
      <div class="activity-dot" style="background:${ev.color}"></div>
      <div class="activity-body">
        <div class="activity-title">
          <strong>${escapeHtml(ev.agent)}</strong>
          <span class="subtle"> · ${escapeHtml(ev.time)}</span>
        </div>
        <div class="activity-text">${escapeHtml(ev.action)}</div>
      </div>
    </div>`).join('');

  // Cola de tareas
  document.getElementById('agentQueue').innerHTML = ag.queue.map(t => `
    <div class="queue-item">
      <div class="queue-head">
        <span class="queue-when">${escapeHtml(t.when)}</span>
        <span class="queue-agent" style="color:${t.color}">${escapeHtml(t.agent)}</span>
      </div>
      <div class="queue-task">${escapeHtml(t.task)}</div>
    </div>`).join('');

  // Workflows orquestados
  document.getElementById('orchestratedBody').innerHTML = ag.workflows.map(w => {
    const statusBadge = w.status === 'running'
      ? '<span class="chip chip-blue">Ejecutando</span>'
      : w.status === 'ok'
      ? '<span class="chip chip-green">OK</span>'
      : '<span class="chip chip-gray">En espera</span>';
    return `<tr>
      <td><strong>${escapeHtml(w.name)}</strong><div class="subtle" style="font-size:11px">${escapeHtml(w.desc)}</div></td>
      <td>${w.agents.map(a => `<span class="agent-chip">${escapeHtml(a)}</span>`).join('')}</td>
      <td>${escapeHtml(w.last_run)}</td>
      <td class="num">${w.runs_24h}</td>
      <td class="num green">${w.success_rate}%</td>
      <td>${statusBadge}</td>
      <td>${w.url ? `<a class="link" href="${w.url}" target="_blank" rel="noopener">abrir ↗</a>` : ''}</td>
    </tr>`;
  }).join('');
}

// Auto-refresh visual del label cada 30s
setInterval(() => {
  const el = document.getElementById('agentsLastSync');
  if (el && document.getElementById('view-agents').classList.contains('active')) {
    el.textContent = 'Actualizado hace segundos';
  }
}, 30000);

// ─── V4 · MARKET INTELLIGENCE ───
function renderIntel() {
  const D = window.INTEL_DATA;
  if (!D) return;

  // KPIs
  document.getElementById('intelKpis').innerHTML = D.market_kpis.map(k => `
    <div class="kpi">
      <div class="kpi-label">${escapeHtml(k.label)}</div>
      <div class="kpi-value ${k.up ? 'green' : ''}">${escapeHtml(k.value)}</div>
      <div class="kpi-delta ${k.up ? 'delta-up' : 'delta-flat'}">${escapeHtml(k.delta)}</div>
      <div class="subtle" style="font-size:11px;margin-top:6px">${escapeHtml(k.source)}</div>
    </div>`).join('');

  // News feed (con filtro)
  const filter = document.getElementById('intelCategoryFilter').value;
  const news = filter === 'all' ? D.news : D.news.filter(n => n.category === filter);
  document.getElementById('intelNewsCount').textContent = `${news.length} de ${D.news.length} artículos`;
  document.getElementById('intelNewsFeed').innerHTML = news.map(n => `
    <article class="news-card" style="--accent-color:${n.tag_color}">
      <div class="news-card-head">
        <span class="news-tag" style="background:${n.tag_color}22; color:${n.tag_color}">${escapeHtml(n.category)}</span>
        <span class="news-meta">${escapeHtml(n.date)}</span>
      </div>
      <h3>${escapeHtml(n.title)}</h3>
      <p class="news-summary">${escapeHtml(n.summary)}</p>
      ${n.impact ? `<div class="news-impact"><strong>Impacto:</strong> ${escapeHtml(n.impact)}</div>` : ''}
      <div class="news-foot">
        <span class="news-source">Fuente: ${escapeHtml(n.source)}</span>
        <a class="news-link" href="${ensureUrl(n.url)}" target="_blank" rel="noopener">
          Leer original
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M7 17L17 7M7 7h10v10"/></svg>
        </a>
      </div>
    </article>`).join('');

  // Trending · datos: category, trend ('+24%'), mentions, sentiment
  const maxMentions = Math.max(...D.trending.map(t => t.mentions || 1));
  document.getElementById('intelTrending').innerHTML = D.trending.map(t => {
    const trendStr = String(t.trend || '');
    const isDown = trendStr.startsWith('-');
    return `
    <div class="trending-row">
      <div>
        <div class="trending-name">${escapeHtml(t.category)}</div>
        <div class="trending-bar"><div class="trending-fill" style="width:${((t.mentions||0)/maxMentions*100).toFixed(0)}%"></div></div>
        <div class="subtle" style="font-size:10.5px;margin-top:3px">${(t.mentions||0).toLocaleString('es')} menciones</div>
      </div>
      <span class="trending-delta ${isDown ? 'down' : 'up'}">${escapeHtml(trendStr)}</span>
    </div>`;
  }).join('');

  // Alerts · datos: type, message, severity, date
  const sevClass = { high: '', medium: 'medium', low: 'info' };
  document.getElementById('intelAlerts').innerHTML = D.alerts.map(a => `
    <div class="alert-item ${sevClass[a.severity] || 'info'}">
      <div class="alert-title">${escapeHtml(a.type ? a.type.toUpperCase() : 'INFO')} · ${escapeHtml(a.date || '')}</div>
      <div class="alert-detail">${escapeHtml(a.message || a.title || '')}</div>
    </div>`).join('');

  // Sources · datos: name, url, frequency, last_check (o category)
  document.getElementById('intelSources').innerHTML = D.sources.map(s => `
    <a class="source-item" href="${ensureUrl(s.url)}" target="_blank" rel="noopener">
      <span class="source-name"><span class="source-dot"></span>${escapeHtml(s.name)}</span>
      <span class="source-cat">${escapeHtml(s.frequency || s.category || '')}${s.last_check ? ' · ' + escapeHtml(s.last_check) : ''}</span>
    </a>`).join('');
}
document.getElementById('intelCategoryFilter')?.addEventListener('change', renderIntel);
document.getElementById('intelRefresh')?.addEventListener('click', renderIntel);

// ─── V4 · QUICK QUOTE ───
const QUOTE = { product: null, markup: 15, client: null, qty: 100 };

function openQuoteModal() {
  document.getElementById('quoteModal').style.display = 'flex';
  populateQuoteClients();
  setTimeout(() => document.getElementById('quoteSearch').focus(), 50);
}
function closeQuoteModal() {
  document.getElementById('quoteModal').style.display = 'none';
}

function getCatalog() {
  // Catálogo Heineman vive en V2.pricing.sample_catalog
  return (V2.pricing && V2.pricing.sample_catalog) || [];
}
function getLeads() {
  // V2.leads es objeto con .leads array
  if (Array.isArray(V2.leads)) return V2.leads;
  if (V2.leads && Array.isArray(V2.leads.leads)) return V2.leads.leads;
  return [];
}

function populateQuoteClients() {
  const sel = document.getElementById('quoteClient');
  if (sel.options.length > 1) return;
  const clients = [];
  if (window.PROSPECTS) {
    PROSPECTS.slice(0, 100).forEach(p => clients.push({ id: 'p-'+p.name, name: p.name, type: 'Prospect', country: p.country }));
  }
  getLeads().forEach(l => {
    const nm = l.empresa || l.company || l.name || l.cliente || 'Lead';
    const ctry = l.pais || l.country || l.region || '';
    clients.push({ id: 'l-'+nm, name: nm, type: 'Lead', country: ctry });
  });
  sel.innerHTML = '<option value="">Seleccionar prospect o lead…</option>' +
    clients.map(c => `<option value="${escapeHtml(c.id)}" data-name="${escapeHtml(c.name)}" data-country="${escapeHtml(c.country||'')}">${escapeHtml(c.type)} · ${escapeHtml(c.name)} · ${escapeHtml(c.country||'')}</option>`).join('');
}

function searchQuoteCatalog(q) {
  const catalog = getCatalog();
  q = (q || '').toLowerCase().trim();
  if (q.length < 2) return [];
  return catalog.filter(item => {
    const blob = ((item.brand||'') + ' ' + (item.name||item.product||'') + ' ' + (item.size||'') + ' ' + (item.category||'')).toLowerCase();
    return blob.includes(q);
  }).slice(0, 8);
}

document.getElementById('quoteSearch')?.addEventListener('input', debounce(e => {
  const results = searchQuoteCatalog(e.target.value);
  const wrap = document.getElementById('quoteResults');
  if (!results.length) { wrap.classList.remove('open'); return; }
  wrap.innerHTML = results.map((r, i) => {
    const np = parseFloat(r.net_price || r.netPrice || 0);
    return `<div class="quote-result-item" data-idx="${i}">
      <span class="qr-price">€ ${np.toFixed(2)}</span>
      <div class="qr-name">${escapeHtml(r.brand || '—')} · ${escapeHtml(r.name || r.product || '—')}</div>
      <div class="qr-meta">${escapeHtml(r.size || '')} · ${escapeHtml(r.category || '')}</div>
    </div>`;
  }).join('');
  wrap.classList.add('open');
  wrap.querySelectorAll('.quote-result-item').forEach((el, i) => {
    el.addEventListener('click', () => selectQuoteProduct(results[i]));
  });
}, 180));

function selectQuoteProduct(p) {
  QUOTE.product = p;
  const np = parseFloat(p.net_price || p.netPrice || 0);
  document.getElementById('quoteSearch').value = `${p.brand} · ${p.name || p.product}`;
  document.getElementById('quoteResults').classList.remove('open');
  document.getElementById('quoteSelected').style.display = 'block';
  document.getElementById('quoteSelected').innerHTML = `
    <div class="quote-selected-name">${escapeHtml(p.brand || '—')} · ${escapeHtml(p.name || p.product || '—')}</div>
    <div class="quote-selected-meta">${escapeHtml(p.size || '')} · ${escapeHtml(p.category || '')} · Net Price <strong style="color:#10B981">€ ${np.toFixed(2)}</strong></div>`;
  refreshQuoteSummary();
}

document.querySelectorAll('.markup-options .chip-btn').forEach(b => {
  b.addEventListener('click', () => {
    document.querySelectorAll('.markup-options .chip-btn').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    QUOTE.markup = parseFloat(b.dataset.markup);
    document.getElementById('customMarkup').value = '';
    refreshQuoteSummary();
  });
});
document.getElementById('customMarkup')?.addEventListener('input', e => {
  const v = parseFloat(e.target.value);
  if (!isNaN(v)) {
    document.querySelectorAll('.markup-options .chip-btn').forEach(x => x.classList.remove('active'));
    QUOTE.markup = v;
    refreshQuoteSummary();
  }
});
document.getElementById('quoteQty')?.addEventListener('input', e => {
  QUOTE.qty = parseInt(e.target.value) || 1;
  refreshQuoteSummary();
});
document.getElementById('quoteClient')?.addEventListener('change', e => {
  const opt = e.target.selectedOptions[0];
  QUOTE.client = opt && opt.value ? { id: opt.value, name: opt.dataset.name, country: opt.dataset.country } : null;
  refreshQuoteSummary();
});

function refreshQuoteSummary() {
  if (!QUOTE.product) { document.getElementById('quoteSummary').style.display = 'none'; return; }
  const np = parseFloat(QUOTE.product.net_price || QUOTE.product.netPrice || 0);
  const sale = np * (1 + QUOTE.markup / 100);
  const margin = sale - np;
  const total = sale * QUOTE.qty;
  const totalGain = margin * QUOTE.qty;
  document.getElementById('quoteSummary').style.display = 'block';
  document.getElementById('quoteSummary').innerHTML = `
    <div class="qs-row"><span class="qs-label">Net Price (Heineman)</span><span class="qs-value">€ ${np.toFixed(2)}</span></div>
    <div class="qs-row"><span class="qs-label">Markup ${QUOTE.markup}%</span><span class="qs-value gain">+ € ${margin.toFixed(2)}</span></div>
    <div class="qs-row"><span class="qs-label">Precio de venta · unidad</span><span class="qs-value">€ ${sale.toFixed(2)}</span></div>
    <div class="qs-row"><span class="qs-label">Cantidad</span><span class="qs-value">${QUOTE.qty.toLocaleString('es')} cajas</span></div>
    <div class="qs-row total"><span class="qs-label">Total cotización</span><span class="qs-value">€ ${total.toLocaleString('es', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span></div>
    <div class="qs-row"><span class="qs-label">Margen total</span><span class="qs-value gain">€ ${totalGain.toLocaleString('es', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span></div>`;
}

function buildQuoteText() {
  if (!QUOTE.product) return null;
  const np = parseFloat(QUOTE.product.net_price || QUOTE.product.netPrice || 0);
  const sale = np * (1 + QUOTE.markup / 100);
  const total = sale * QUOTE.qty;
  const id = 'Q-' + new Date().toISOString().slice(0,10).replace(/-/g,'') + '-' + Math.floor(Math.random()*900+100);
  return {
    id,
    text: `Cotización ${id}

Cliente: ${QUOTE.client ? QUOTE.client.name : '—'}
Producto: ${QUOTE.product.brand} · ${QUOTE.product.name || QUOTE.product.product}
Tamaño: ${QUOTE.product.size || '—'}
Net Price (Heineman): € ${np.toFixed(2)}
Markup aplicado: ${QUOTE.markup}%
Precio de venta: € ${sale.toFixed(2)} / unidad
Cantidad: ${QUOTE.qty} cajas
Total: € ${total.toLocaleString('es', {minimumFractionDigits: 2, maximumFractionDigits: 2})}

Validez: 30 días desde emisión.
Equipo BAST · Tradinglead`
  };
}

function quoteToast(msg, isError) {
  const t = document.getElementById('quoteToast');
  t.textContent = msg;
  t.className = 'quote-toast' + (isError ? ' error' : '');
  t.style.display = 'block';
  setTimeout(() => { t.style.display = 'none'; }, 4000);
}

document.getElementById('quoteCopyEmail')?.addEventListener('click', () => {
  const q = buildQuoteText();
  if (!q) return quoteToast('Seleccioná un producto primero', true);
  navigator.clipboard.writeText(q.text).then(() => quoteToast(`Email copiado · ${q.id}`));
});
document.getElementById('quoteSlack')?.addEventListener('click', () => {
  const q = buildQuoteText();
  if (!q) return quoteToast('Seleccioná un producto primero', true);
  quoteToast(`Enviado a #general-tradinglead · ${q.id}`);
});
document.getElementById('quoteHubspot')?.addEventListener('click', () => {
  const q = buildQuoteText();
  if (!q) return quoteToast('Seleccioná un producto primero', true);
  quoteToast(`Push a HubSpot · deal creado · ${q.id}`);
});
document.getElementById('quoteSave')?.addEventListener('click', () => {
  const q = buildQuoteText();
  if (!q) return quoteToast('Seleccioná un producto primero', true);
  quoteToast(`Oferta guardada · ${q.id} · validez 30d`);
  setTimeout(closeQuoteModal, 1200);
});
document.getElementById('quoteClose')?.addEventListener('click', closeQuoteModal);
document.getElementById('btnQuickQuote')?.addEventListener('click', openQuoteModal);

// ─── V4 · MARKET SEARCH (palette ⌘K) ───
let searchFocusedIdx = -1;
let searchCurrentResults = [];

function openSearchModal() {
  document.getElementById('searchModal').style.display = 'flex';
  setTimeout(() => document.getElementById('searchInput').focus(), 50);
}
function closeSearchModal() {
  document.getElementById('searchModal').style.display = 'none';
  document.getElementById('searchInput').value = '';
  document.getElementById('searchResults').innerHTML = '<div class="search-empty">Empezá a escribir para buscar en todo el workspace…</div>';
  searchFocusedIdx = -1;
}

function runGlobalSearch(q) {
  q = q.toLowerCase().trim();
  searchCurrentResults = [];
  if (q.length < 2) {
    document.getElementById('searchResults').innerHTML = '<div class="search-empty">Empezá a escribir para buscar en todo el workspace…</div>';
    return;
  }
  const groups = [
    { key: 'catalog', label: 'Catálogo · Heineman', icon: '◆',
      items: getCatalog().filter(c => ((c.brand||'')+' '+(c.name||c.product||'')+' '+(c.category||'')).toLowerCase().includes(q)).slice(0, 5)
        .map(c => ({ title: `${c.brand} · ${c.name||c.product}`, meta: `${c.size||''} · Net € ${parseFloat(c.net_price||c.netPrice||0).toFixed(2)}`, hash: '#catalog' })) },
    { key: 'prospects', label: 'Prospects', icon: '●',
      items: (window.PROSPECTS || []).filter(p => ((p.name||'')+' '+(p.country||'')+' '+(p.brands||'')).toLowerCase().includes(q)).slice(0, 5)
        .map(p => ({ title: p.name, meta: `${p.country} · ${p.type||''} · score ${p.score}`, hash: '#pipeline' })) },
    { key: 'leads', label: 'Leads', icon: '▲',
      items: getLeads().filter(l => JSON.stringify(l).toLowerCase().includes(q)).slice(0, 5)
        .map(l => {
          const nm = l.empresa || l.company || l.name || l.cliente || 'Lead';
          const meta = (l.pais || l.country || l.region || '') + ' · ' + (l.estado || l.status || l.stage || '');
          return { title: nm, meta, hash: '#leads' };
        }) },
    { key: 'ofertas', label: 'Ofertas', icon: '◇',
      items: (V2.ofertas || []).filter(o => JSON.stringify(o).toLowerCase().includes(q)).slice(0, 5)
        .map(o => ({ title: o.id || o.cliente || o.title || 'Oferta', meta: `${o.date || o.fecha || ''} · ${o.source || ''}`, hash: '#ofertas' })) },
    { key: 'listas', label: 'Listas NOW', icon: '☰',
      items: (V2.listas_now || []).filter(li => ((li.company||'')+' '+(li.source_file||'')).toLowerCase().includes(q)).slice(0, 5)
        .map(li => ({ title: li.company || li.nombre || 'Lista', meta: `${li.item_count || ''} ítems · prom € ${li.avg_price||''}`, hash: '#listas' })) },
    { key: 'intel', label: 'Market Intelligence', icon: '✦',
      items: (window.INTEL_DATA?.news || []).filter(n => (n.title+' '+n.summary).toLowerCase().includes(q)).slice(0, 5)
        .map(n => ({ title: n.title, meta: `${n.category} · ${n.source}`, hash: '#intel' })) }
  ];

  let html = '';
  groups.forEach(g => {
    if (g.items.length) {
      html += `<div class="search-group-head">${escapeHtml(g.label)} (${g.items.length})</div>`;
      g.items.forEach(it => {
        const idx = searchCurrentResults.length;
        searchCurrentResults.push(it);
        html += `<div class="search-result" data-idx="${idx}">
          <div class="sr-icon">${g.icon}</div>
          <div class="sr-content">
            <div class="sr-title">${escapeHtml(it.title)}</div>
            <div class="sr-meta">${escapeHtml(it.meta)}</div>
          </div>
        </div>`;
      });
    }
  });
  if (!searchCurrentResults.length) html = '<div class="search-empty">Sin resultados para "' + escapeHtml(q) + '"</div>';
  document.getElementById('searchResults').innerHTML = html;
  searchFocusedIdx = -1;
  document.querySelectorAll('.search-result').forEach(el => {
    el.addEventListener('click', () => {
      const idx = parseInt(el.dataset.idx);
      navigateToSearchResult(searchCurrentResults[idx]);
    });
  });
}

function navigateToSearchResult(item) {
  if (!item) return;
  closeSearchModal();
  if (item.hash) location.hash = item.hash;
}

document.getElementById('searchInput')?.addEventListener('input', debounce(e => runGlobalSearch(e.target.value), 150));
document.getElementById('btnMarketSearch')?.addEventListener('click', openSearchModal);

// Click fuera del modal para cerrar
['searchModal', 'quoteModal'].forEach(id => {
  document.getElementById(id)?.addEventListener('click', e => {
    if (e.target.id === id) {
      if (id === 'searchModal') closeSearchModal();
      else closeQuoteModal();
    }
  });
});

// ─── V4 · KEYBOARD SHORTCUTS ───
document.addEventListener('keydown', e => {
  const isMac = navigator.platform.toUpperCase().includes('MAC');
  const mod = isMac ? e.metaKey : e.ctrlKey;
  // Ignorar si focus está en input/textarea (excepto para ESC)
  const inField = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);

  if (mod && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    if (document.getElementById('searchModal').style.display === 'flex') closeSearchModal();
    else openSearchModal();
  } else if (mod && e.key.toLowerCase() === 'q') {
    e.preventDefault();
    openQuoteModal();
  } else if (mod && e.key.toLowerCase() === 'n') {
    e.preventDefault();
    quoteToast && document.getElementById('btnNewBrief')?.click();
  } else if (e.key === 'Escape') {
    if (document.getElementById('searchModal').style.display === 'flex') closeSearchModal();
    else if (document.getElementById('quoteModal').style.display === 'flex') closeQuoteModal();
  } else if (document.getElementById('searchModal').style.display === 'flex' && !inField) {
    // Navegación con flechas en search
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const items = document.querySelectorAll('.search-result');
      if (!items.length) return;
      searchFocusedIdx = (searchFocusedIdx + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      items.forEach((it, i) => it.classList.toggle('focused', i === searchFocusedIdx));
      items[searchFocusedIdx]?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter' && searchFocusedIdx >= 0) {
      navigateToSearchResult(searchCurrentResults[searchFocusedIdx]);
    }
  }
});

// Render intel al cargar
renderIntel();

// ====================== DETAIL INTELLIGENCE · v5 ======================
const DETAIL = window.DETAIL_DATA || { rows: [], kpis: {}, funnel: [], top_categories: [], wholesalers: [] };

// Heatmap util: returns 1..5 quintile rank. invert=true means low value => high heat.
function quintileRank(val, sortedVals, invert) {
  if (val == null || isNaN(val)) return 0;
  if (!sortedVals.length) return 0;
  let pos = sortedVals.findIndex(v => v >= val);
  if (pos === -1) pos = sortedVals.length - 1;
  let pct = pos / Math.max(1, sortedVals.length - 1);
  if (invert) pct = 1 - pct;
  if (pct >= 0.8) return 5;
  if (pct >= 0.6) return 4;
  if (pct >= 0.4) return 3;
  if (pct >= 0.2) return 2;
  return 1;
}

function precomputeHeatmaps(rows) {
  const cols = ['cost', 'sale_price', 'sale_qty', 'ws1_price', 'ws2_price', 'trader_price', 'msrp', 'msrp2', 'margin_pct'];
  const sorted = {};
  cols.forEach(c => {
    sorted[c] = rows.map(r => r[c]).filter(v => v != null && !isNaN(v)).sort((a, b) => a - b);
  });
  return sorted;
}

function fmtDate(d) { return d || '—'; }
function fmtMoneyEur(v) { return v == null || isNaN(v) ? '—' : '€ ' + fmtMoney(v); }

function detailCell(html, target, hash) {
  if (target && hash) {
    return '<a class="td-link" href="' + hash + '" data-target="' + escapeHtml(target) + '">' + html + '</a>';
  }
  return html;
}

let DETAIL_FILTER_CAT = '';
let DETAIL_PARAM = 'best_margin';

function getFilteredDetailRows() {
  let rows = DETAIL.rows.slice();
  if (DETAIL_FILTER_CAT) rows = rows.filter(r => r.category === DETAIL_FILTER_CAT);
  switch (DETAIL_PARAM) {
    case 'cheapest':
      rows.sort((a, b) => (a.cost == null ? Infinity : a.cost) - (b.cost == null ? Infinity : b.cost)); break;
    case 'highest_msrp':
      rows.sort((a, b) => (b.msrp == null ? -Infinity : b.msrp) - (a.msrp == null ? -Infinity : a.msrp)); break;
    case 'recent_offer':
      rows.sort((a, b) => (b.offer_date || '').localeCompare(a.offer_date || '')); break;
    case 'recent_sale':
      rows.sort((a, b) => {
        if (!a.sale_date && !b.sale_date) return 0;
        if (!a.sale_date) return 1;
        if (!b.sale_date) return -1;
        return b.sale_date.localeCompare(a.sale_date);
      }); break;
    case 'highest_qty':
      rows.sort((a, b) => (b.sale_qty == null ? -1 : b.sale_qty) - (a.sale_qty == null ? -1 : a.sale_qty)); break;
    case 'best_margin':
    default:
      rows.sort((a, b) => (b.margin_pct == null ? -Infinity : b.margin_pct) - (a.margin_pct == null ? -Infinity : a.margin_pct)); break;
  }
  return rows;
}

function renderDetailKPIs() {
  const k = DETAIL.kpis || {};
  const set = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
  set('hkItems', fmtInt(k.total_items));
  set('hkWs1', fmtInt(k.with_ws1));
  set('hkWs1Pct', k.total_items ? Math.round(k.with_ws1 * 100 / k.total_items) + '% del catálogo' : '—');
  set('hkMsrp', fmtInt(k.with_msrp));
  set('hkMsrpPct', k.total_items ? Math.round(k.with_msrp * 100 / k.total_items) + '% del catálogo' : '—');
  set('hkSale', fmtInt(k.with_sale));
  set('hkSaleValue', '€ ' + fmtMoney(k.total_sale_value_eur) + ' valor pipeline');
  set('hkMargin', (k.avg_margin_pct == null ? 0 : k.avg_margin_pct).toFixed(1) + '%');
  set('hkOpp', '€ ' + fmtMoney(k.total_opportunity_eur));
}

function renderDetailFunnel() {
  const el = document.getElementById('detailFunnel');
  if (!el) return;
  const max = Math.max.apply(null, DETAIL.funnel.map(f => f.count).concat([1]));
  el.innerHTML = DETAIL.funnel.map((f, i) => {
    const w = Math.max(6, Math.round(f.count * 100 / max));
    const cls = ['v', 'b', 'c', 'p', 'g', 'a'][i % 6];
    return '<div class="funnel-row">' +
      '<div class="funnel-stage">' + escapeHtml(f.stage) + '</div>' +
      '<div class="funnel-track"><div class="funnel-fill funnel-' + cls + '" style="width:' + w + '%"></div></div>' +
      '<div class="funnel-count">' + fmtInt(f.count) + '</div>' +
      '<div class="funnel-pct">' + (f.pct == null ? 0 : f.pct).toFixed(1) + '%</div>' +
    '</div>';
  }).join('');
}

function renderDetailCategories() {
  const el = document.getElementById('detailCategories');
  if (!el) return;
  const cats = DETAIL.top_categories || [];
  const max = Math.max.apply(null, cats.map(c => c.count).concat([1]));
  el.innerHTML = cats.map(c => {
    const w = Math.round(c.count * 100 / max);
    const active = (c.name === DETAIL_FILTER_CAT) ? ' is-active' : '';
    return '<div class="cat-row' + active + '" data-cat="' + escapeHtml(c.name) + '">' +
      '<div class="cat-name">' + escapeHtml(c.name) + '</div>' +
      '<div class="cat-bar"><div class="cat-bar-fill" style="width:' + w + '%"></div></div>' +
      '<div class="cat-count">' + c.count + '</div>' +
    '</div>';
  }).join('');
  el.querySelectorAll('.cat-row').forEach(r => {
    r.addEventListener('click', () => {
      const cat = r.dataset.cat;
      DETAIL_FILTER_CAT = (DETAIL_FILTER_CAT === cat) ? '' : cat;
      const sel = document.getElementById('detailCategory');
      if (sel) sel.value = DETAIL_FILTER_CAT;
      renderDetailTable();
      renderDetailCategories();
    });
  });
}

function populateDetailCategorySelect() {
  const sel = document.getElementById('detailCategory');
  if (!sel) return;
  const cats = (DETAIL.top_categories || []).map(c => c.name);
  sel.innerHTML = '<option value="">Todas las categorías</option>' +
    cats.map(c => '<option value="' + escapeHtml(c) + '">' + escapeHtml(c) + '</option>').join('');
}

function labelForParam(p) {
  return ({
    best_margin: 'mayor margen',
    cheapest: 'cost más bajo',
    highest_msrp: 'MSRP más alto',
    recent_offer: 'oferta reciente',
    recent_sale: 'sale reciente',
    highest_qty: 'mayor cantidad'
  })[p] || p;
}

function renderDetailTable() {
  const tbody = document.getElementById('detailTbody');
  const countEl = document.getElementById('detailRowCount');
  if (!tbody) return;
  const rows = getFilteredDetailRows();
  if (countEl) countEl.textContent = rows.length + ' filas · ordenadas por ' + labelForParam(DETAIL_PARAM);

  const heat = precomputeHeatmaps(DETAIL.rows);

  const cell = (val, sortedKey, color, invert, formatter) => {
    if (val == null || (typeof val === 'number' && isNaN(val))) {
      return '<td class="td-empty">—</td>';
    }
    const rank = quintileRank(val, heat[sortedKey] || [], !!invert);
    const heatCls = rank ? ' heat-' + color + '-' + rank : '';
    const txt = formatter ? formatter(val) : escapeHtml(val);
    return '<td class="td-num' + heatCls + '">' + txt + '</td>';
  };

  tbody.innerHTML = rows.map(r => {
    const barcodeCell = '<td class="td-mono">' + detailCell(escapeHtml(r.barcode), 'catalog', '#catalog') + '</td>';
    const nameCell = '<td class="td-name">' + detailCell(escapeHtml(r.name), 'catalog', '#catalog') + '</td>';
    const brandCell = '<td>' + escapeHtml(r.brand || '—') + '</td>';
    const catCell = '<td><span class="td-tag">' + escapeHtml(r.category || '—') + '</span></td>';
    const skuCell = '<td class="td-mono">' + escapeHtml(r.sku || '—') + '</td>';
    const costCell = cell(r.cost, 'cost', 'green', true, fmtMoneyEur);
    const offerDate = '<td class="td-date">' + detailCell(fmtDate(r.offer_date), 'ofertas', '#ofertas') + '</td>';
    const orderCell = r.order_id
      ? '<td class="td-mono">' + detailCell(escapeHtml(r.order_id), 'leads', '#leads') + '</td>'
      : '<td class="td-empty">—</td>';
    const salePrice = cell(r.sale_price, 'sale_price', 'green', false, fmtMoneyEur);
    const saleDate = '<td class="td-date">' + (r.sale_date ? fmtDate(r.sale_date) : '<span class="td-empty">—</span>') + '</td>';
    const saleQty = cell(r.sale_qty, 'sale_qty', 'green', false, fmtInt);
    const ws1Price = cell(r.ws1_price, 'ws1_price', 'blue', false, fmtMoneyEur);
    const ws1Co = r.ws1_company
      ? '<td class="td-name">' + detailCell(escapeHtml(r.ws1_company), 'listas', '#listas') + '</td>'
      : '<td class="td-empty">—</td>';
    const ws2Price = cell(r.ws2_price, 'ws2_price', 'cyan', false, fmtMoneyEur);
    const ws2Co = r.ws2_company
      ? '<td class="td-name">' + detailCell(escapeHtml(r.ws2_company), 'listas', '#listas') + '</td>'
      : '<td class="td-empty">—</td>';
    const traderCell = cell(r.trader_price, 'trader_price', 'amber', false, fmtMoneyEur);
    const amazonUrl = 'https://www.amazon.com/s?k=' + encodeURIComponent((r.brand || '') + ' ' + (r.name || ''));
    const msrp = r.msrp != null
      ? '<td class="td-num heat-pink-' + quintileRank(r.msrp, heat.msrp, false) + '"><a class="td-link" href="' + amazonUrl + '" target="_blank" rel="noopener">' + fmtMoneyEur(r.msrp) + '</a></td>'
      : '<td class="td-empty">—</td>';
    const msrp2 = r.msrp2 != null
      ? '<td class="td-num heat-pink-' + quintileRank(r.msrp2, heat.msrp2, false) + '"><a class="td-link" href="' + amazonUrl + '" target="_blank" rel="noopener">' + fmtMoneyEur(r.msrp2) + '</a></td>'
      : '<td class="td-empty">—</td>';
    const margin = cell(r.margin_pct, 'margin_pct', 'margin', false, v => v.toFixed(1) + '%');

    return '<tr>' +
      barcodeCell + nameCell + brandCell + catCell +
      skuCell + costCell + offerDate +
      orderCell + salePrice + saleDate + saleQty +
      ws1Price + ws1Co +
      ws2Price + ws2Co +
      traderCell +
      msrp + msrp2 +
      margin +
    '</tr>';
  }).join('');
}

function detailExportCSV() {
  const rows = getFilteredDetailRows();
  const head = ['barcode','name','brand','category','sku','cost','offer_date','order_id','sale_price','sale_date','sale_qty','ws1_price','ws1_company','ws2_price','ws2_company','trader_price','msrp','msrp2','margin_pct','margin_eur'];
  const csv = [head.join(',')].concat(rows.map(r => head.map(h => {
    const v = r[h];
    if (v == null) return '';
    const s = String(v).replace(/"/g, '""');
    return /[",\n]/.test(s) ? '"' + s + '"' : s;
  }).join(','))).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'detail_intelligence.csv'; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 200);
}

function renderDetail() {
  if (!DETAIL.rows || !DETAIL.rows.length) return;
  populateDetailCategorySelect();
  renderDetailKPIs();
  renderDetailFunnel();
  renderDetailCategories();
  renderDetailTable();
}

document.getElementById('detailParam') && document.getElementById('detailParam').addEventListener('change', e => {
  DETAIL_PARAM = e.target.value;
  renderDetailTable();
});
document.getElementById('detailCategory') && document.getElementById('detailCategory').addEventListener('change', e => {
  DETAIL_FILTER_CAT = e.target.value;
  renderDetailTable();
  renderDetailCategories();
});
document.getElementById('detailExport') && document.getElementById('detailExport').addEventListener('click', detailExportCSV);

renderDetail();
