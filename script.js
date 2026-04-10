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