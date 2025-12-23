// ================================
// Ultraviolet Service Worker
// ================================
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/uv/uv.sw.js", { scope: "/service/" })
    .then(() => console.log("✅ UV Service Worker registered"))
    .catch(err => console.error("❌ UV SW failed:", err));
}

// ================================
// Elements
// ================================
const frame = document.getElementById("browser");
const input = document.getElementById("urlInput");
const tabsEl = document.getElementById("tabs");
const goBtn = document.getElementById("goBtn");
const newTabBtn = document.getElementById("newTab");

// ================================
// State
// ================================
let tabs = [];
let activeTabId = null;

// ================================
// Helpers
// ================================
function uvEncode(url) {
  return __uv$config.prefix + __uv$config.encodeUrl(url);
}

function isLikelyUrl(value) {
  return /^https?:\/\//i.test(value) || /\./.test(value);
}

function normalizeInput(value) {
  value = value.trim();
  if (!value) return "";

  if (isLikelyUrl(value)) {
    if (!/^https?:\/\//i.test(value)) {
      return "https://" + value;
    }
    return value;
  }

  return "https://www.google.com/search?q=" + encodeURIComponent(value);
}

function getActiveTab() {
  return tabs.find(t => t.id === activeTabId);
}

// ================================
// Tabs
// ================================
function createTab() {
  const tab = {
    id: crypto.randomUUID(),
    title: "New Tab",
    input: "",
    proxied: ""
  };
  tabs.push(tab);
  setActiveTab(tab.id);
}

function closeTab(id) {
  const index = tabs.findIndex(t => t.id === id);
  if (index === -1) return;

  tabs.splice(index, 1);

  if (!tabs.length) {
    createTab();
    return;
  }

  if (id === activeTabId) {
    const next = tabs[Math.max(0, index - 1)];
    setActiveTab(next.id);
  } else {
    renderTabs();
  }
}

function setActiveTab(id) {
  activeTabId = id;
  const tab = getActiveTab();
  renderTabs();

  input.value = tab.input;
  frame.src = tab.proxied || "";
}

function renderTabs() {
  tabsEl.innerHTML = "";

  for (const tab of tabs) {
    const el = document.createElement("div");
    el.className = "tab" + (tab.id === activeTabId ? " active" : "");

    const title = document.createElement("span");
    title.textContent = tab.title;

    const close = document.createElement("button");
    close.textContent = "×";
    close.onclick = e => {
      e.stopPropagation();
      closeTab(tab.id);
    };

    el.onclick = () => setActiveTab(tab.id);

    el.append(title, close);
    tabsEl.appendChild(el);
  }
}

// ================================
// Navigation
// ================================
function navigate() {
  const tab = getActiveTab();
  if (!tab) return;

  const raw = input.value.trim();
  if (!raw) return;

  const url = normalizeInput(raw);
  const proxied = uvEncode(url);

  tab.input = raw;
  tab.proxied = proxied;
  tab.title = url;

  frame.src = proxied;
  renderTabs();
}

goBtn.onclick = navigate;
input.addEventListener("keydown", e => {
  if (e.key === "Enter") navigate();
});

newTabBtn.onclick = () => createTab();

// ================================
// Update tab title on load
// ================================
frame.addEventListener("load", () => {
  try {
    const title = frame.contentDocument?.title;
    if (title) {
      const tab = getActiveTab();
      if (tab) {
        tab.title = title;
        renderTabs();
      }
    }
  } catch {
    // Cross-origin blocked — ignore
  }
});

// ================================
// Init
// ================================
createTab();
