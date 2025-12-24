// public/app.js - Working UV browser
const urlInput = document.getElementById("urlInput");
const goBtn = document.getElementById("goBtn");
const iframe = document.getElementById("browser");
const tabsContainer = document.getElementById("tabs");
const newTabBtn = document.getElementById("newTab");

let tabs = [];
let currentTabId = null;

// Initialize
function init() {
  console.log('Initializing browser...');
  
  // Load UV config
  loadUVConfig();
  
  // Create first tab
  createTab();
  
  // Event listeners
  goBtn.addEventListener("click", navigate);
  urlInput.addEventListener("keydown", e => {
    if (e.key === "Enter") navigate();
  });
  newTabBtn.addEventListener("click", () => createTab());
  
  // Add quick navigation
  addQuickNav();
}

// Load UV configuration
function loadUVConfig() {
  // Check if UV is already loaded
  if (window.__uv$config) {
    console.log('UV config already loaded');
    return;
  }
  
  // Load UV scripts
  const uvScripts = [
    '/uv/uv.bundle.js',
    '/uv/uv.config.js'
  ];
  
  uvScripts.forEach(src => {
    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    document.head.appendChild(script);
  });
  
  console.log('UV scripts loading...');
}

// Format URL
function formatUrl(input) {
  input = input.trim();
  if (!input) return '';
  
  // Check if it's already a valid URL
  try {
    new URL(input);
    return input;
  } catch {
    // If it looks like a domain
    if (input.includes('.') && !input.includes(' ')) {
      return 'https://' + input;
    }
    // Otherwise treat as search
    return 'https://www.google.com/search?q=' + encodeURIComponent(input);
  }
}

// Navigate using UV
async function navigate() {
  const raw = urlInput.value.trim();
  if (!raw) return;
  
  const url = formatUrl(raw);
  console.log('Navigating to:', url);
  
  try {
    // Validate URL
    new URL(url);
    
    // Try UV proxy first
    if (window.Ultraviolet && window.Ultraviolet.codec) {
      await navigateWithUV(url);
    } else {
      // Fallback to direct iframe
      navigateDirect(url);
    }
    
    // Update current tab
    if (currentTabId) {
      const tab = tabs.find(t => t.id === currentTabId);
      if (tab) {
        tab.url = url;
        updateTabDisplay(tab);
      }
    }
    
  } catch (error) {
    console.error('Navigation error:', error);
    alert('Error: ' + error.message);
  }
}

// Navigate using Ultraviolet
async function navigateWithUV(url) {
  console.log('Using UV proxy...');
  
  try {
    // Encode the URL
    const encoded = Ultraviolet.codec.xor.encode(url);
    console.log('Encoded:', encoded);
    
    // Create the proxied URL
    const proxiedUrl = '/service/' + encodeURIComponent(encoded);
    console.log('Proxied URL:', proxiedUrl);
    
    // Load in iframe
    iframe.src = proxiedUrl;
    
  } catch (error) {
    console.warn('UV proxy failed, falling back:', error);
    navigateDirect(url);
  }
}

// Navigate directly (fallback)
function navigateDirect(url) {
  console.log('Using direct iframe...');
  
  // Use the simple proxy endpoint
  iframe.src = '/proxy?url=' + encodeURIComponent(url);
}

// Tab management functions
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
    if (window.Ultraviolet) {
      try {
        const encoded = Ultraviolet.codec.xor.encode(tab.url);
        iframe.src = '/service/' + encodeURIComponent(encoded);
      } catch {
        iframe.src = '/proxy?url=' + encodeURIComponent(tab.url);
      }
    } else {
      iframe.src = '/proxy?url=' + encodeURIComponent(tab.url);
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
    <button onclick="quickNav('https://www.google.com')">Google</button>
    <button onclick="quickNav('https://www.wikipedia.org')">Wikipedia</button>
    <button onclick="quickNav('https://www.youtube.com')">YouTube</button>
    <button onclick="quickNav('https://example.com')">Example</button>
    <button onclick="quickNav('https://duckduckgo.com')">DuckDuckGo</button>
  `;
  
  const omnibox = document.querySelector('.omnibox');
  if (omnibox) {
    omnibox.parentNode.insertBefore(quickNav, omnibox.nextSibling);
  }
}

function quickNav(url) {
  urlInput.value = url;
  navigate();
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', init);

// Global functions
window.quickNav = quickNav;
window.navigate = navigate;
