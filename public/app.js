// public/app.js - Using /uv/service/
const urlInput = document.getElementById("urlInput");
const goBtn = document.getElementById("goBtn");
const iframe = document.getElementById("browser");
const tabsContainer = document.getElementById("tabs");
const newTabBtn = document.getElementById("newTab");

let tabs = [];
let currentTabId = null;

// Initialize
function init() {
  console.log('🚀 Initializing UV Browser...');
  
  // Load UV configuration first
  loadUV();
  
  // Create first tab
  createTab();
  
  // Event listeners
  goBtn.addEventListener("click", navigate);
  urlInput.addEventListener("keydown", e => {
    if (e.key === "Enter") navigate();
  });
  newTabBtn.addEventListener("click", () => createTab());
  
  // Add status indicator
  addStatusBar();
  
  // Focus URL input
  setTimeout(() => {
    urlInput.focus();
    urlInput.select();
  }, 500);
}

// Load UV scripts
function loadUV() {
  // Check if already loaded
  if (window.__uv$config) {
    console.log('UV config already loaded');
    updateStatus('UV: Ready');
    return;
  }
  
  updateStatus('UV: Loading...');
  
  // Load UV bundle and config
  const scripts = [
    '/uv/uv.bundle.js',
    '/uv/uv.config.js'
  ];
  
  let loaded = 0;
  
  scripts.forEach(src => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => {
      loaded++;
      console.log(`Loaded: ${src}`);
      
      if (loaded === scripts.length) {
        if (window.__uv$config) {
          console.log('UV config loaded:', window.__uv$config);
          updateStatus('UV: Ready');
        } else {
          console.error('UV config not found after loading scripts');
          updateStatus('UV: Config missing');
        }
      }
    };
    script.onerror = () => {
      console.error(`Failed to load: ${src}`);
      updateStatus(`UV: Failed to load ${src.split('/').pop()}`);
    };
    document.head.appendChild(script);
  });
  
  // Check after timeout
  setTimeout(() => {
    if (!window.__uv$config) {
      console.warn('UV not loaded after timeout, using fallback');
      updateStatus('UV: Using fallback mode');
    }
  }, 3000);
}

// Navigate using UV
function navigate() {
  const raw = urlInput.value.trim();
  if (!raw) return;
  
  let url;
  
  // Format URL
  if (!raw.startsWith('http://') && !raw.startsWith('https://')) {
    if (raw.includes('.') && !raw.includes(' ')) {
      url = 'https://' + raw;
    } else {
      url = 'https://www.google.com/search?q=' + encodeURIComponent(raw);
    }
  } else {
    url = raw;
  }
  
  console.log('🌐 Target:', url);
  
  // Validate URL
  try {
    new URL(url);
  } catch {
    alert('Invalid URL');
    return;
  }
  
  // Try UV first
  if (window.Ultraviolet && window.Ultraviolet.codec) {
    navigateUV(url);
  } else {
    // Fallback
    navigateFallback(url);
  }
  
  // Update current tab
  if (currentTabId) {
    const tab = tabs.find(t => t.id === currentTabId);
    if (tab) {
      tab.url = url;
      updateTabDisplay(tab);
    }
  }
}

// Navigate using Ultraviolet
function navigateUV(url) {
  console.log('Using UV proxy...');
  updateStatus('UV: Encoding...');
  
  try {
    // Encode URL with UV XOR
    const encoded = Ultraviolet.codec.xor.encode(url);
    console.log('Encoded:', encoded.substring(0, 50) + '...');
    
    // URL encode for safety
    const urlSafeEncoded = encodeURIComponent(encoded);
    
    // Build UV service URL
    const uvUrl = `/uv/service/${urlSafeEncoded}`;
    console.log('UV URL:', uvUrl);
    
    updateStatus('UV: Loading...');
    iframe.src = uvUrl;
    
  } catch (error) {
    console.error('UV encoding failed:', error);
    updateStatus('UV: Failed, using fallback');
    navigateFallback(url);
  }
}

// Fallback navigation
function navigateFallback(url) {
  console.log('Using fallback proxy...');
  updateStatus('Proxy: Loading...');
  
  // Simple base64 proxy
  const encoded = btoa(url);
  iframe.src = `/proxy/${encoded}`;
}

// Tab management
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
    if (window.Ultraviolet && window.Ultraviolet.codec) {
      try {
        const encoded = Ultraviolet.codec.xor.encode(tab.url);
        const urlSafe = encodeURIComponent(encoded);
        iframe.src = `/uv/service/${urlSafe}`;
      } catch {
        const encoded = btoa(tab.url);
        iframe.src = `/proxy/${encoded}`;
      }
    } else {
      const encoded = btoa(tab.url);
      iframe.src = `/proxy/${encoded}`;
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
      
      // Shorten
      if (displayText.length > 18) {
        displayText = displayText.substring(0, 15) + '...';
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

// Status bar
function addStatusBar() {
  const statusBar = document.createElement('div');
  statusBar.id = 'statusBar';
  statusBar.style.cssText = `
    padding: 4px 12px;
    background: #f5f5f5;
    border-top: 1px solid #ddd;
    font-size: 12px;
    color: #666;
    font-family: monospace;
  `;
  statusBar.textContent = 'Initializing...';
  
  // Insert after iframe
  const body = document.querySelector('body');
  if (body) {
    body.appendChild(statusBar);
  }
}

function updateStatus(message) {
  const statusBar = document.getElementById('statusBar');
  if (statusBar) {
    statusBar.textContent = message;
    console.log('Status:', message);
  }
}

// Add quick navigation
function addQuickNav() {
  const quickNav = document.createElement('div');
  quickNav.style.cssText = `
    display: flex;
    gap: 8px;
    padding: 8px 12px;
    background: #f8f9fa;
    border-bottom: 1px solid #e0e0e0;
  `;
  
  quickNav.innerHTML = `
    <span style="color: #666; font-size: 12px; padding: 6px 0;">Quick:</span>
    <button onclick="quickGo('https://www.google.com')" class="quick-btn">Google</button>
    <button onclick="quickGo('https://www.wikipedia.org')" class="quick-btn">Wikipedia</button>
    <button onclick="quickGo('https://www.youtube.com')" class="quick-btn">YouTube</button>
    <button onclick="quickGo('https://example.com')" class="quick-btn">Example</button>
  `;
  
  // Add CSS for quick buttons
  const style = document.createElement('style');
  style.textContent = `
    .quick-btn {
      padding: 6px 12px;
      background: white;
      border: 1px solid #dadce0;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      color: #3c4043;
    }
    .quick-btn:hover {
      background: #f8f9fa;
      border-color: #d2e3fc;
    }
  `;
  document.head.appendChild(style);
  
  // Insert after omnibox
  const omnibox = document.querySelector('.omnibox');
  if (omnibox && omnibox.parentNode) {
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
