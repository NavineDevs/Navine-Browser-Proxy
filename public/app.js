// public/app.js - Updated version
const urlInput = document.getElementById("urlInput");
const goBtn = document.getElementById("goBtn");
const iframe = document.getElementById("browser");
const tabsContainer = document.getElementById("tabs");
const newTabBtn = document.getElementById("newTab");

let tabs = [];
let currentTabId = null;

// Initialize UV if available
let uvConfig = null;
if (window.__uv$config) {
  uvConfig = window.__uv$config;
} else {
  console.warn('UV config not loaded, fetching...');
  fetch('/uv-config')
    .then(res => res.json())
    .then(config => {
      uvConfig = config;
      console.log('UV config loaded:', config);
    })
    .catch(err => console.error('Failed to load UV config:', err));
}

function isUrl(value) {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function formatInput(input) {
  input = input.trim();
  if (isUrl(input)) return input;
  if (input.includes('.') && !input.includes(' ')) {
    return 'https://' + input;
  }
  return 'https://www.google.com/search?q=' + encodeURIComponent(input);
}

function navigate() {
  if (!uvConfig) {
    alert("Ultraviolet not loaded. Please wait...");
    return;
  }

  const raw = urlInput.value.trim();
  if (!raw) return;

  const target = formatInput(raw);
  
  // Encode URL for UV
  const encoded = uvConfig.encodeUrl(target);
  const proxiedUrl = uvConfig.prefix + encoded;
  
  console.log('Navigating to:', target, 'via:', proxiedUrl);
  
  // Update iframe
  iframe.src = proxiedUrl;
  
  // Update current tab
  if (currentTabId) {
    const tab = tabs.find(t => t.id === currentTabId);
    if (tab) {
      tab.url = target;
      tab.proxiedUrl = proxiedUrl;
      updateTabDisplay(tab);
    }
  }
}

function createTab(url = 'about:blank') {
  const tabId = Date.now().toString();
  
  const tabBtn = document.createElement('button');
  tabBtn.className = 'tab-btn';
  tabBtn.textContent = 'New Tab';
  tabBtn.onclick = () => switchTab(tabId);

  const closeBtn = document.createElement('button');
  closeBtn.className = 'close-btn';
  closeBtn.textContent = '×';
  closeBtn.onclick = (e) => {
    e.stopPropagation();
    closeTab(tabId);
  };

  const tabDiv = document.createElement('div');
  tabDiv.className = 'tab-container';
  tabDiv.appendChild(tabBtn);
  tabDiv.appendChild(closeBtn);
  tabsContainer.appendChild(tabDiv);

  const tab = {
    id: tabId,
    button: tabBtn,
    closeBtn: closeBtn,
    container: tabDiv,
    url: url,
    proxiedUrl: url,
    title: 'New Tab'
  };
  
  tabs.push(tab);
  switchTab(tabId);
  return tab;
}

function switchTab(tabId) {
  const tab = tabs.find(t => t.id === tabId);
  if (!tab) return;

  currentTabId = tabId;
  
  // Update iframe
  iframe.src = tab.proxiedUrl;
  
  // Update URL input
  urlInput.value = tab.url === 'about:blank' ? '' : tab.url;
  
  // Update tab styles
  tabs.forEach(t => {
    t.button.classList.toggle('active', t.id === tabId);
    updateTabDisplay(t);
  });
}

function updateTabDisplay(tab) {
  const displayText = tab.title.length > 20 
    ? tab.title.substring(0, 17) + '...' 
    : tab.title;
  tab.button.textContent = displayText;
  tab.button.title = tab.url;
}

function closeTab(tabId) {
  const index = tabs.findIndex(t => t.id === tabId);
  if (index === -1) return;

  tabs[index].container.remove();
  tabs.splice(index, 1);

  if (currentTabId === tabId) {
    if (tabs.length > 0) {
      switchTab(tabs[0].id);
    } else {
      iframe.src = '';
      urlInput.value = '';
      currentTabId = null;
      createTab();
    }
  }
}

// Event Listeners
goBtn.addEventListener("click", navigate);
urlInput.addEventListener("keydown", e => {
  if (e.key === "Enter") navigate();
});
newTabBtn.onclick = () => createTab();

// Iframe load handler to update tab title
iframe.addEventListener('load', function() {
  if (currentTabId && iframe.contentWindow) {
    try {
      const tab = tabs.find(t => t.id === currentTabId);
      if (tab && iframe.contentWindow.document.title) {
        tab.title = iframe.contentWindow.document.title || tab.url;
        updateTabDisplay(tab);
      }
    } catch (e) {
      // Cross-origin restriction
    }
  }
});

// Initialize
createTab();

// Quick navigation buttons (optional)
document.addEventListener('DOMContentLoaded', () => {
  // Add quick links for testing
  const quickLinks = document.createElement('div');
  quickLinks.className = 'quick-links';
  quickLinks.innerHTML = `
    <button onclick="urlInput.value='https://www.google.com'; navigate()">Google</button>
    <button onclick="urlInput.value='https://www.wikipedia.org'; navigate()">Wikipedia</button>
    <button onclick="urlInput.value='https://www.youtube.com'; navigate()">YouTube</button>
  `;
  document.querySelector('.omnibox').appendChild(quickLinks);
});
