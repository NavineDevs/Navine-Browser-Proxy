const frame = document.getElementById("browser");
const input = document.getElementById("urlInput");
const tabsEl = document.getElementById("tabs");

let tabs = [];
let activeTab = null;

function uv(url) {
  return __uv$config.prefix + __uv$config.encodeUrl(url);
}

function isURL(text) {
  return /^https?:\/\//i.test(text) || /\./.test(text);
}

function createTab(url = "") {
  const tab = {
    id: Date.now().toString(16),
    title: "New Tab",
    input: url,
    proxied: ""
  };
  tabs.push(tab);
  switchTab(tab.id);
}

function closeTab(id) {
  const i = tabs.findIndex(t => t.id === id);
  if (i === -1) return;
  tabs.splice(i, 1);

  if (!tabs.length) {
    createTab();
  } else {
    switchTab(tabs[Math.max(0, i - 1)].id);
  }
}

function switchTab(id) {
  activeTab = tabs.find(t => t.id === id);
  renderTabs();

  input.value = activeTab.input;
  frame.src = activeTab.proxied || "";
}

function navigate() {
  if (!activeTab) return;

  let value = input.value.trim();
  if (!value) return;

  let url = isURL(value)
    ? value.startsWith("http") ? value : "https://" + value
    : "https://www.google.com/search?q=" + encodeURIComponent(value);

  activeTab.input = value;
  activeTab.proxied = uv(url);
  activeTab.title = url;

  frame.src = activeTab.proxied;
  renderTabs();
}

function renderTabs() {
  tabsEl.innerHTML = "";

  tabs.forEach(tab => {
    const el = document.createElement("div");
    el.className = "tab" + (tab === activeTab ? " active" : "");

    const title = document.createElement("span");
    title.textContent = tab.title;

    const close = document.createElement("button");
    close.textContent = "×";
    close.onclick = e => {
      e.stopPropagation();
      closeTab(tab.id);
    };

    el.onclick = () => switchTab(tab.id);

    el.append(title, close);
    tabsEl.appendChild(el);
  });
}

document.getElementById("goBtn").onclick = navigate;
document.getElementById("newTab").onclick = () => createTab();

input.addEventListener("keydown", e => {
  if (e.key === "Enter") navigate();
});

frame.addEventListener("load", () => {
  try {
    const title = frame.contentDocument.title;
    if (title) {
      activeTab.title = title;
      renderTabs();
    }
  } catch {}
});

// Init
createTab();
