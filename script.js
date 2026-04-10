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

  // Refresh charts
  rebuildAllCharts();
}
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}