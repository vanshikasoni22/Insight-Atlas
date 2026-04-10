const ORDERS_API   = "http://localhost:3000/public/question/a35cde03-47c3-4c24-80e2-546275e66322.json";
const EVENTS_API   = "http://localhost:3000/public/question/64511719-7718-4e51-8c89-721ed1097574.json";
const INVOICES_API = "http://localhost:3000/public/question/27ecdfa8-a096-4a59-93d1-bc0b47f066f8.json";
const REVIEWS_API  = "http://localhost:3000/public/question/43af4062-a891-4762-8916-621a9f4f21bc.json";
const PRODUCTS_API = "http://localhost:3000/public/question/ab0d100e-01ba-4ff1-80cc-4a90fd7e8458.json";
const state = {
  orders:   { raw: [], filtered: [], cols: [], page: 1, sortCol: null, sortDir: 'asc', loaded: false },
  events:   { raw: [], filtered: [], cols: [], page: 1, sortCol: null, sortDir: 'asc', loaded: false },
  invoices: { raw: [], filtered: [], cols: [], page: 1, sortCol: null, sortDir: 'asc', loaded: false },
  reviews:  { raw: [], filtered: [], cols: [], page: 1, sortCol: null, sortDir: 'asc', loaded: false },
  products: { raw: [], filtered: [], cols: [], page: 1, sortCol: null, sortDir: 'asc', loaded: false },
};
const PAGE_SIZE = 25;
const charts = {};

function updateClock() {
  const el = document.getElementById('topbarTime');
  if (!el) return;
  const now = new Date();
  el.textContent = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
setInterval(updateClock, 1000);
updateClock();

function toggleTheme() {
  const html = document.documentElement;

  // Check current theme
  if (html.getAttribute("data-theme") === "dark") {
    html.setAttribute("data-theme", "light");

    document.getElementById("theme-label").textContent = "Dark Mode";
    document.getElementById("theme-icon-moon").style.display = "none";
    document.getElementById("theme-icon-sun").style.display = "block";

  } else {
    html.setAttribute("data-theme", "dark");

    document.getElementById("theme-label").textContent = "Light Mode";
    document.getElementById("theme-icon-moon").style.display = "block";
    document.getElementById("theme-icon-sun").style.display = "none";
  }


  rebuildAllCharts();
}
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

function showSection(name, navEl) {

  document.querySelectorAll(".dashboard-section").forEach(sec => {
    sec.classList.remove("active");
  });

  const section = document.getElementById("section-" + name);
  if (section) section.classList.add("active");

  document.querySelectorAll(".nav-item").forEach(item => {
    item.classList.remove("active");
  });
  if (navEl) navEl.classList.add("active");

  document.getElementById("topbarTitle").textContent = name.toUpperCase();

  if (window.innerWidth <= 700) {
    document.getElementById("sidebar").classList.remove("open");
  }

  if (name !== "overview" && !state[name].loaded) {
    fetchSectionData(name);
  }

}
  let _toastTimer;
  function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
  }

  async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} – ${res.statusText}`);
  return res.json();
}
function parseMetabaseData(raw) {
  if (Array.isArray(raw)) {
    // Flat array — derive cols from first object keys
    if (raw.length === 0) return { cols: [], rows: [] };
    const cols = Object.keys(raw[0]);
    const rows = raw.map(item => cols.map(c => item[c]));
    return { cols, rows };
  }

  if (raw && raw.data && Array.isArray(raw.data.rows)) {
    const cols = raw.data.cols.map(c => c.display_name || c.name);
    return { cols, rows: raw.data.rows };
  }

  // Try results wrapper
  if (raw && Array.isArray(raw.rows)) {
    const cols = raw.cols ? raw.cols.map(c => c.display_name || c.name) : Object.keys(raw.rows[0] || {});
    return { cols, rows: raw.rows };
  }

  return { cols: [], rows: [] };
}
const API_MAP = {
  orders:   ORDERS_API,
  events:   EVENTS_API,
  invoices: INVOICES_API,
  reviews:  REVIEWS_API,
  products: PRODUCTS_API,
};

async function fetchSectionData(name) {
  showLoading(name, true);
  try {
    const raw = await fetchJSON(API_MAP[name]);
    const { cols, rows } = parseMetabaseData(raw);
    state[name].cols     = cols;
    state[name].raw      = rows;
    state[name].filtered = [...rows];
    state[name].loaded   = true;
    state[name].page     = 1;
    state[name].sortCol  = null;

    // Update KPI
    updateKPI(name, rows.length);

    // Build filter column options
    buildFilterOptions(name, cols);

    // Render table
    renderTable(name);

    // Draw section chart
    drawSectionChart(name, cols, rows);

    showToast(`✓ ${capitalize(name)} data loaded – ${rows.length} records`);
  } catch (err) {
    showLoading(name, false);
    showError(name, err.message);
    showToast(`✗ Failed to load ${name}: ${err.message}`);
  }
}
function showLoading(name, show) {
  const el = document.getElementById(name + '-loading');
  if (el) el.style.display = show ? 'flex' : 'none';
}

function showError(name, msg) {
  const wrapper = document.getElementById(name + '-table-wrapper');
  if (!wrapper) return;
  wrapper.innerHTML = `<div class="empty-state">⚠️ ${msg}</div>`;
}

function updateKPI(name, count) {
  const el = document.getElementById('kpi-' + name);
  if (el) el.textContent = count.toLocaleString();
}

function buildFilterOptions(name, cols) {
  const sel = document.getElementById(name + '-filter-col');
  if (!sel) return;
  sel.innerHTML = '<option value="">All Columns</option>';
  cols.forEach(col => {
    const opt = document.createElement('option');
    opt.value = col;
    opt.textContent = col;
    sel.appendChild(opt);
  });
}

function filterTable(name) {
  const searchVal = (document.getElementById(name + '-search') || {}).value?.toLowerCase() || '';
  const colFilter = (document.getElementById(name + '-filter-col') || {}).value || '';
  const timeFilter = parseInt((document.getElementById(name + '-filter-time') || {}).value) || 0;
  const s = state[name];

  s.filtered = s.raw.filter(row => {
    // Time filter: look for a date-like column
    if (timeFilter > 0) {
      const dateColIdx = guessDateColIndex(s.cols);
      if (dateColIdx !== -1 && row[dateColIdx]) {
        const d = new Date(row[dateColIdx]);
        if (!isNaN(d)) {
          const cutoff = new Date();
          cutoff.setDate(cutoff.getDate() - timeFilter);
          if (d < cutoff) return false;
        }
      }
    }

    // Search filter
    if (!searchVal) return true;

    if (colFilter) {
      const idx = s.cols.indexOf(colFilter);
      if (idx === -1) return true;
      return String(row[idx] ?? '').toLowerCase().includes(searchVal);
    }
    return row.some(cell => String(cell ?? '').toLowerCase().includes(searchVal));
  });

  s.page = 1;
  renderTable(name);
}
function guessDateColIndex(cols) {
  const keywords = ['date', 'time', 'created', 'updated', 'at'];
  for (let i = 0; i < cols.length; i++) {
    const lower = cols[i].toLowerCase();
    if (keywords.some(k => lower.includes(k))) return i;
  }
  return -1;
}

function sortTable(name, colIdx) {
  const s = state[name];
  if (s.sortCol === colIdx) {
    s.sortDir = s.sortDir === 'asc' ? 'desc' : 'asc';
  } else {
    s.sortCol = colIdx;
    s.sortDir = 'asc';
  }

  s.filtered.sort((a, b) => {
    const va = a[colIdx], vb = b[colIdx];
    if (!isNaN(parseFloat(va)) && !isNaN(parseFloat(vb))) {
      return s.sortDir === 'asc' ? parseFloat(va) - parseFloat(vb) : parseFloat(vb) - parseFloat(va);
    }

    const da = new Date(va), db = new Date(vb);
    if (!isNaN(da) && !isNaN(db)) {
      return s.sortDir === 'asc' ? da - db : db - da;
    }

    const sa = String(va ?? '').toLowerCase();
    const sb = String(vb ?? '').toLowerCase();
    if (sa < sb) return s.sortDir === 'asc' ? -1 : 1;
    if (sa > sb) return s.sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  s.page = 1;
  renderTable(name);
}

function renderTable(name) {
  const s = state[name];
  const table = document.getElementById(name + '-table');
  const thead = document.getElementById(name + '-thead');
  const tbody = document.getElementById(name + '-tbody');
  const loading = document.getElementById(name + '-loading');
  const countEl = document.getElementById(name + '-count');

  if (!table) return;
  loading.style.display = 'none';
  table.style.display = 'table';

  // Update row count
  if (countEl) countEl.textContent = s.filtered.length.toLocaleString() + ' rows';

  // Render header
  thead.innerHTML = '';
  const tr = document.createElement('tr');
  s.cols.forEach((col, idx) => {
    const th = document.createElement('th');
    th.textContent = col;
    th.title = 'Sort by ' + col;
    if (s.sortCol === idx) th.classList.add('sorted-' + s.sortDir);
    th.addEventListener('click', () => sortTable(name, idx));
    tr.appendChild(th);
  });
  thead.appendChild(tr);

  // Paginate
  const start  = (s.page - 1) * PAGE_SIZE;
  const end    = start + PAGE_SIZE;
  const pageData = s.filtered.slice(start, end);

  // Render body
  tbody.innerHTML = '';
  if (pageData.length === 0) {
    const empty = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = s.cols.length || 1;
    td.innerHTML = '<div class="empty-state">No records match your filters.</div>';
    empty.appendChild(td);
    tbody.appendChild(empty);
  } else {
    pageData.forEach(row => {
      const tr = document.createElement('tr');
      row.forEach((cell, i) => {
        const td = document.createElement('td');
        td.title = String(cell ?? '');
        td.textContent = formatCell(cell, s.cols[i]);
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
  }

renderPagination(name, Math.ceil(s.filtered.length / PAGE_SIZE));
}

function formatCell(value, colName) {
  if (value === null || value === undefined) return '—';
  const col = (colName || '').toLowerCase();
  // Format dates
  if ((col.includes('date') || col.includes('at') || col.includes('time')) && typeof value === 'string' && value.length > 10) {
    const d = new Date(value);
    if (!isNaN(d)) return d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  }
  // Format numbers
  if (typeof value === 'number') {
    if (col.includes('price') || col.includes('amount') || col.includes('total') || col.includes('revenue')) {
      return '$' + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return value.toLocaleString();
  }
  return String(value);
}

function renderPagination(name, totalPages) {
  const el = document.getElementById(name + '-pagination');
  if (!el) return;
  el.innerHTML = '';
  if (totalPages <= 1) return;

  const s = state[name];

  const createBtn = (label, page, disabled, active) => {
    const btn = document.createElement('button');
    btn.textContent = label;
    if (disabled) btn.disabled = true;
    if (active)   btn.classList.add('active');
    btn.addEventListener('click', () => {
      if (!disabled) { s.page = page; renderTable(name); }
    });
    return btn;
  };

  el.appendChild(createBtn('‹ Prev', s.page - 1, s.page === 1, false));
  let pages = [];
  if (totalPages <= 7) {
    pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  } else {
    pages = [1, 2];
    if (s.page > 4) pages.push('…');
    for (let p = Math.max(3, s.page - 1); p <= Math.min(totalPages - 2, s.page + 1); p++) pages.push(p);
    if (s.page < totalPages - 3) pages.push('…');
    pages.push(totalPages - 1, totalPages);
  }

  pages.forEach(p => {
    if (p === '…') {
      const span = document.createElement('span');
      span.textContent = '…';
      span.style.color = 'var(--text-muted)';
      span.style.padding = '0 4px';
      el.appendChild(span);
    } else {
      el.appendChild(createBtn(p, p, false, p === s.page));
    }
  });

  el.appendChild(createBtn('Next ›', s.page + 1, s.page === totalPages, false));
}
function exportCSV(name) {
  const s = state[name];
  if (!s.filtered.length) { showToast('No data to export.'); return; }

  const escape = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  const lines = [s.cols.map(escape).join(',')];
  s.filtered.forEach(row => lines.push(row.map(escape).join(',')));

  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `insight-atlas-${name}-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast(`✓ ${capitalize(name)} exported as CSV`);
}

function handleGlobalSearch(val) {
  ['orders', 'events', 'invoices', 'reviews', 'products'].forEach(name => {
    if (!state[name].loaded) return;
    const inp = document.getElementById(name + '-search');
    if (inp) inp.value = val;
    filterTable(name);
  });
}

function drawSectionChart(name, cols, rows) {
  const cfg = getChartColors();

  if (name === 'orders')   drawOrdersChart(cols, rows, cfg);
  if (name === 'events')   drawEventsChart(cols, rows, cfg);
  if (name === 'invoices') drawInvoicesChart(cols, rows, cfg);
  if (name === 'reviews')  drawReviewsChart(cols, rows, cfg, 'reviewsChart');
  if (name === 'products') drawProductsChart(cols, rows, cfg, 'productsChart');
}
function drawOrdersChart(cols, rows, cfg) {
  destroyChart('ordersChart');

  const dateIdx = cols.findIndex(c => c.toLowerCase().includes('creat') || c.toLowerCase().includes('date'));
  if (dateIdx === -1) { drawSimpleBarChart('ordersChart', cols, rows, cfg); return; }

  const monthCounts = {};
  rows.forEach(row => {
    const d = new Date(row[dateIdx]);
    if (isNaN(d)) return;
    const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    monthCounts[key] = (monthCounts[key] || 0) + 1;
  });

  const sorted = Object.entries(monthCounts).sort((a, b) => a[0].localeCompare(b[0]));
  const labels = sorted.map(([k]) => k);
  const data   = sorted.map(([, v]) => v);

  const ctx = document.getElementById('ordersChart').getContext('2d');
  charts['ordersChart'] = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Orders',
        data,
        borderColor: cfg.accent,
        backgroundColor: cfg.accent + '22',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointBackgroundColor: cfg.accent,
      }]
    },
    options: lineChartOptions(cfg),
  });

  // Also update overview chart with same data
  destroyChart('overviewOrdersChart');
  const ctx2 = document.getElementById('overviewOrdersChart').getContext('2d');
  charts['overviewOrdersChart'] = new Chart(ctx2, {
    type: 'line',
    data: {
      labels: labels.slice(-12),
      datasets: [{
        label: 'Orders',
        data: data.slice(-12),
        borderColor: cfg.accent,
        backgroundColor: cfg.accent + '22',
        fill: true,
        tension: 0.4,
        pointRadius: 2,
        pointBackgroundColor: cfg.accent,
      }]
    },
    options: lineChartOptions(cfg),
  });

function drawEventsChart(cols, rows, cfg) {
  destroyChart('eventsChart');
  const dateIdx = cols.findIndex(c => c.toLowerCase().includes('date') || c.toLowerCase().includes('time') || c.toLowerCase().includes('at'));

  if (dateIdx === -1) { drawSimpleBarChart('eventsChart', cols, rows, cfg); return; }

  const monthCounts = {};
  rows.forEach(row => {
    const d = new Date(row[dateIdx]);
    if (isNaN(d)) return;
    const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    monthCounts[key] = (monthCounts[key] || 0) + 1;
  });

  const sorted = Object.entries(monthCounts).sort((a, b) => a[0].localeCompare(b[0]));
  const ctx = document.getElementById('eventsChart').getContext('2d');
  charts['eventsChart'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: sorted.map(([k]) => k),
      datasets: [{
        label: 'Events',
        data: sorted.map(([, v]) => v),
        backgroundColor: cfg.accent2 + 'cc',
        borderRadius: 6,
      }]
    },
    options: barChartOptions(cfg),
  });
}

function drawInvoicesChart(cols, rows, cfg) {
  destroyChart('invoicesChart');
  const amountIdx = cols.findIndex(c => c.toLowerCase().includes('amount') || c.toLowerCase().includes('total') || c.toLowerCase().includes('price'));

  if (amountIdx === -1) { drawSimpleBarChart('invoicesChart', cols, rows, cfg); return; }

  const dateIdx = cols.findIndex(c => c.toLowerCase().includes('date') || c.toLowerCase().includes('creat'));
  if (dateIdx === -1) { drawSimpleBarChart('invoicesChart', cols, rows, cfg); return; }

  const monthTotals = {};
  rows.forEach(row => {
    const d = new Date(row[dateIdx]);
    if (isNaN(d)) return;
    const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    const amt = parseFloat(row[amountIdx]) || 0;
    monthTotals[key] = (monthTotals[key] || 0) + amt;
  });

  const sorted = Object.entries(monthTotals).sort((a, b) => a[0].localeCompare(b[0]));
  const ctx = document.getElementById('invoicesChart').getContext('2d');
  charts['invoicesChart'] = new Chart(ctx, {
    type: 'line',
    data: {
      labels: sorted.map(([k]) => k),
      datasets: [{
        label: 'Invoice Amount ($)',
        data: sorted.map(([, v]) => v.toFixed(2)),
        borderColor: cfg.success,
        backgroundColor: cfg.success + '22',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointBackgroundColor: cfg.success,
      }]
    },
    options: lineChartOptions(cfg),
  });
}

function drawReviewsChart(cols, rows, cfg, canvasId) {
  destroyChart(canvasId);
  const ratingIdx = cols.findIndex(c => c.toLowerCase().includes('rating') || c.toLowerCase().includes('score') || c.toLowerCase().includes('star'));

  let distribution = {};
  if (ratingIdx !== -1) {
    rows.forEach(row => {
      const r = Math.round(parseFloat(row[ratingIdx]));
      if (!isNaN(r)) distribution[r] = (distribution[r] || 0) + 1;
    });
  } else {
    // fallback: count by first column unique values (top 6)
    const counts = {};
    rows.forEach(row => { const v = String(row[0]); counts[v] = (counts[v] || 0) + 1; });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6);
    top.forEach(([k, v]) => distribution[k] = v);
  }

  const labels = Object.keys(distribution).sort();
  const data   = labels.map(k => distribution[k]);
  const colors = [cfg.accent, cfg.accent2, cfg.accent3, cfg.success, cfg.warning, '#a78bfa'];

  const ctx = document.getElementById(canvasId).getContext('2d');
  charts[canvasId] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors,
        borderWidth: 0,
        hoverOffset: 6,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: cfg.text, font: { size: 11 }, boxWidth: 12, padding: 10 }
        },
        tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.raw}` } }
      }
    }
  });

  if (canvasId === 'reviewsChart') {
    destroyChart('overviewReviewsChart');
    const ctx3 = document.getElementById('overviewReviewsChart').getContext('2d');
    charts['overviewReviewsChart'] = new Chart(ctx3, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{ data, backgroundColor: colors, borderWidth: 0, hoverOffset: 4 }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: cfg.text, font: { size: 10 }, boxWidth: 10, padding: 8 } }
        }
      }
    });
  }
}
function drawProductsChart(cols, rows, cfg, canvasId) {
  destroyChart(canvasId);

  // Try to get category or vendor column
  const catIdx = cols.findIndex(c => c.toLowerCase().includes('categ') || c.toLowerCase().includes('vendor') || c.toLowerCase().includes('type'));

  let counts = {};
  if (catIdx !== -1) {
    rows.forEach(row => {
      const v = String(row[catIdx] ?? 'Unknown');
      counts[v] = (counts[v] || 0) + 1;
    });
  } else {
    counts = { 'Products': rows.length };
  }

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const labels = sorted.map(([k]) => k);
  const data   = sorted.map(([, v]) => v);

  const ctx = document.getElementById(canvasId).getContext('2d');
  charts[canvasId] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Count',
        data,
        backgroundColor: [cfg.accent, cfg.accent2, cfg.accent3, cfg.success, cfg.warning, '#a78bfa', '#fb923c', '#4ade80', '#f87171', '#60a5fa'],
        borderRadius: 6,
      }]
    },
    options: {
      ...barChartOptions(cfg),
      indexAxis: 'y',
    }
  });

    if (canvasId === 'productsChart') {
    destroyChart('overviewProductsChart');
    const ctx4 = document.getElementById('overviewProductsChart').getContext('2d');
    charts['overviewProductsChart'] = new Chart(ctx4, {
      type: 'bar',
      data: {
        labels: labels.slice(0, 6),
        datasets: [{
          label: 'Count',
          data: data.slice(0, 6),
          backgroundColor: [cfg.accent, cfg.accent2, cfg.accent3, cfg.success, cfg.warning, '#a78bfa'],
          borderRadius: 5,
        }]
      },
      options: { ...barChartOptions(cfg), indexAxis: 'y' },
    });
  }
}
function drawSimpleBarChart(canvasId, cols, rows, cfg) {
  destroyChart(canvasId);
  const numColIdx = cols.findIndex((c, i) => rows.slice(0, 10).some(r => typeof r[i] === 'number' || !isNaN(parseFloat(r[i]))));
  const labels = rows.slice(0, 20).map(r => String(r[0] ?? ''));
  const data   = numColIdx > 0 ? rows.slice(0, 20).map(r => parseFloat(r[numColIdx]) || 0) : rows.slice(0, 20).map((_, i) => i + 1);

  const ctx = document.getElementById(canvasId).getContext('2d');
  charts[canvasId] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{ label: cols[numColIdx] || 'Value', data, backgroundColor: cfg.accent + 'cc', borderRadius: 6 }]
    },
    options: barChartOptions(cfg),
  });
}
function lineChartOptions(cfg) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#13162a',
        titleColor: '#e8eaf6',
        bodyColor: '#9199c4',
        padding: 10,
        cornerRadius: 8,
      }
    },
    scales: {
      x: {
        ticks: { color: cfg.text, font: { size: 10 }, maxTicksLimit: 8 },
        grid: { color: cfg.grid },
      },
      y: {
        ticks: { color: cfg.text, font: { size: 10 } },
        grid: { color: cfg.grid },
      }
    }
  };
}

function barChartOptions(cfg) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#13162a',
        titleColor: '#e8eaf6',
        bodyColor: '#9199c4',
        padding: 10,
        cornerRadius: 8,
      }
    },
    scales: {
      x: { ticks: { color: cfg.text, font: { size: 10 } }, grid: { color: cfg.grid } },
      y: { ticks: { color: cfg.text, font: { size: 10 } }, grid: { color: cfg.grid } }
    }
  };
}
function destroyChart(id) {
  if (charts[id]) {
    charts[id].destroy();
    delete charts[id];
  }
}

function rebuildAllCharts() {
  const cfg = getChartColors();
  Object.keys(state).forEach(name => {
    if (state[name].loaded) {
      drawSectionChart(name, state[name].cols, state[name].raw);
    }
  });
}
function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─── TIME FILTER EVENT LISTENERS ─────────────────────────────────────────────
['orders', 'events', 'invoices', 'reviews', 'products'].forEach(name => {
  const el = document.getElementById(name + '-filter-time');
  if (el) el.addEventListener('change', () => filterTable(name));
});

// ─── INIT: PRE-FETCH ALL DATA IN BG ──────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  // Kick off all fetches in parallel so charts + KPIs populate automatically
  ['orders', 'events', 'invoices', 'reviews', 'products'].forEach(name => {
    fetchSectionData(name);
  });

  // Animate KPI cards on overview entrance
  setTimeout(() => {
    document.querySelectorAll('.kpi-card').forEach((card, i) => {
      card.style.animationDelay = (i * 0.07) + 's';
    });
  }, 100);
});