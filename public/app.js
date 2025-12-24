// public/app.js - Simple working version using iframe proxy
const urlInput = document.getElementById("urlInput");
const goBtn = document.getElementById("goBtn");
const iframe = document.getElementById("browser");
const tabsContainer = document.getElementById("tabs");
const newTabBtn = document.getElementById("newTab");

let tabs = [];
let currentTabId = null;

function init() {
  // Create first tab
  createTab();
  
  // Event listeners
  goBtn.addEventListener("click", navigate);
  urlInput.addEventListener("keydown", e => {
    if (e.key === "Enter") navigate();
  });
  newTabBtn.addEventListener("click", () => createTab());
  
  // Add quick nav buttons
  addQuickNav();
}

function navigate() {
  const raw = urlInput.value.trim();
  if (!raw) return;
  
  let url;
  try {
    if (!raw.startsWith('http://') && !raw.startsWith('https://')) {
      if (raw.includes('.') && !raw.includes(' ')) {
        url = 'https://' + raw;
      } else {
        url = 'https://www.google.com/search?q=' + encodeURIComponent(raw);
      }
    } else {
      url = raw;
    }
    
    // Validate
    new URL(url);
  } catch {
    alert('Invalid URL');
    return;
  }
  
  console.log('Navigating to:', url);
  
  // Use the /frame endpoint with corsproxy.io
  const proxiedUrl = `/frame?url=${encodeURIComponent(url)}`;
  iframe.src = proxiedUrl;
  
  // Update current tab
  if (currentTabId) {
    const tab = tabs.find(t => t.id === currentTabId);
    if (tab) {
      tab.url = url;
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
    container: tabDiv,
    url: url,
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
  if (tab.url !== 'about:blank') {
    iframe.src = `/frame?url=${encodeURIComponent(tab.url)}`;
  } else {
    iframe.src = '';
  }
  
  // Update URL input
  urlInput.value = tab.url === 'about:blank' ? '' : tab.url;
  
  // Update tab styles
  tabs.forEach(t => {
    t.button.classList.toggle('active', t.id === tabId);
    updateTabDisplay(t);
  });
}

function updateTabDisplay(tab) {
  let displayText = tab.title;
  
  if (tab.url !== 'about:blank') {
    try {
      const urlObj = new URL(tab.url);
      displayText = urlObj.hostname.replace('www.', '');
      if (displayText.length > 15) {
        displayText = displayText.substring(0, 12) + '...';
      }
    } catch {
      displayText = 'Page';
    }
  }
  
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

function addQuickNav() {
  const quickNav = document.createElement('div');
  quickNav.className = 'quick-nav';
  quickNav.innerHTML = `
    <button onclick="quickGo('https://www.google.com')">Google</button>
    <button onclick="quickGo('https://www.wikipedia.org')">Wikipedia</button>
    <button onclick="quickGo('https://www.youtube.com')">YouTube</button>
    <button onclick="quickGo('https://example.com')">Example</button>
  `;
  
  const omnibox = document.querySelector('.omnibox');
  if (omnibox) {
    omnibox.parentNode.insertBefore(quickNav, omnibox.nextSibling);
  }
}

function quickGo(url) {
  urlInput.value = url;
  navigate();
}

// Initialize
document.addEventListener('DOMContentLoaded', init);

// Global functions
window.quickGo = quickGo;
window.navigate = navigate;
