// public/app.js - Fixed to use /uv/service/
const urlInput = document.getElementById("urlInput");
const goBtn = document.getElementById("goBtn");
const iframe = document.getElementById("browser");
const tabsContainer = document.getElementById("tabs");
const newTabBtn = document.getElementById("newTab");

let tabs = [];
let currentTabId = null;

// Initialize UV
function initUV() {
  if (!window.Ultraviolet) {
    console.error('Ultraviolet not loaded');
    return false;
  }
  
  // Create custom UV config
  window.__uv$config = {
    prefix: '/uv/service/',
    bare: '/bare/',
    encodeUrl: Ultraviolet.codec.xor.encode,
    decodeUrl: Ultraviolet.codec.xor.decode,
    handler: '/uv/uv.handler.js',
    bundle: '/uv/uv.bundle.js',
    config: '/uv/uv.config.js',
    client: '/uv/uv.client.js',
    sw: '/uv/uv.sw.js'
  };
  
  return true;
}

// Initialize app
function init() {
  // Initialize UV config
  if (!initUV()) {
    alert('Ultraviolet proxy not loaded. Please refresh the page.');
    return;
  }
  
  // Create first tab
  createTab();
  
  // Set up event listeners
  goBtn.addEventListener("click", navigate);
  urlInput.addEventListener("keydown", e => {
    if (e.key === "Enter") navigate();
  });
  newTabBtn.addEventListener("click", () => createTab());
  
  // Add quick nav
  addQuickNav();
}

function navigate() {
  const raw = urlInput.value.trim();
  if (!raw) return;
  
  let url;
  try {
    // Try to parse as URL
    if (!raw.startsWith('http://') && !raw.startsWith('https://')) {
      if (raw.includes('.') && !raw.includes(' ')) {
        url = 'https://' + raw;
      } else {
        url = 'https://www.google.com/search?q=' + encodeURIComponent(raw);
      }
    } else {
      url = raw;
    }
    
    // Validate URL
    new URL(url);
  } catch (error) {
    alert('Invalid URL: ' + error.message);
    return;
  }
  
  console.log('Navigating to:', url);
  
  try {
    // Encode URL using UV
    const encoded = Ultraviolet.codec.xor.encode(url);
    const proxiedUrl = '/uv/service/' + encoded;
    
    console.log('Proxied URL:', proxiedUrl);
    
    // Load in iframe
    iframe.src = proxiedUrl;
    
    // Update current tab
    if (currentTabId) {
      const tab = tabs.find(t => t.id === currentTabId);
      if (tab) {
        tab.url = url;
        tab.proxiedUrl = proxiedUrl;
        updateTabDisplay(tab);
      }
    }
  } catch (error) {
    console.error('Navigation error:', error);
    alert('Error: ' + error.message);
    
    // Fallback to /go route
    iframe.src = '/go?url=' + encodeURIComponent(url);
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
    try {
      const encoded = Ultraviolet.codec.xor.encode(tab.url);
      iframe.src = '/uv/service/' + encoded;
    } catch (error) {
      iframe.src = '/go?url=' + encodeURIComponent(tab.url);
    }
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
      displayText = tab.url.length > 15 ? tab.url.substring(0, 12) + '...' : tab.url;
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
    <button onclick="quickNavigate('https://www.google.com')">Google</button>
    <button onclick="quickNavigate('https://www.wikipedia.org')">Wikipedia</button>
    <button onclick="quickNavigate('https://www.youtube.com')">YouTube</button>
    <button onclick="quickNavigate('https://example.com')">Example</button>
  `;
  
  const omnibox = document.querySelector('.omnibox');
  if (omnibox) {
    omnibox.parentNode.insertBefore(quickNav, omnibox.nextSibling);
  }
}

function quickNavigate(url) {
  urlInput.value = url;
  navigate();
}

// Start when page loads
document.addEventListener('DOMContentLoaded', init);

// Make functions available globally
window.navigate = navigate;
window.quickNavigate = quickNavigate;
window.createTab = createTab;
window.switchTab = switchTab;
window.closeTab = closeTab;
