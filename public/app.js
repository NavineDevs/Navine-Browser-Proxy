// public/app.js - Fixed encoding
const urlInput = document.getElementById("urlInput");
const goBtn = document.getElementById("goBtn");
const iframe = document.getElementById("browser");
const tabsContainer = document.getElementById("tabs");
const newTabBtn = document.getElementById("newTab");

let tabs = [];
let currentTabId = null;
let uvReady = false;

// Initialize
function init() {
  console.log('Initializing browser...');
  
  // Create first tab
  createTab();
  
  // Event listeners
  goBtn.addEventListener("click", navigate);
  urlInput.addEventListener("keydown", e => {
    if (e.key === "Enter") navigate();
  });
  newTabBtn.addEventListener("click", () => createTab());
  
  // Load UV
  loadUV();
  
  // Add quick nav
  setTimeout(addQuickNav, 500);
}

// Load UV scripts ONCE
function loadUV() {
  if (window.__uv$config) {
    uvReady = true;
    console.log('UV already loaded');
    return;
  }
  
  console.log('Loading UV...');
  
  // Load bundle first
  const bundleScript = document.createElement('script');
  bundleScript.src = '/uv/uv.bundle.js';
  bundleScript.async = false;
  bundleScript.onload = () => {
    console.log('UV bundle loaded');
    
    // Load config
    const configScript = document.createElement('script');
    configScript.src = '/uv/uv.config.js';
    configScript.async = false;
    configScript.onload = () => {
      uvReady = true;
      console.log('UV config loaded');
      
      // Update UV config if needed
      if (window.__uv$config) {
        window.__uv$config.prefix = '/uv/service/';
        window.__uv$config.bare = '/bare/';
        console.log('UV config updated');
      }
    };
    document.head.appendChild(configScript);
  };
  
  document.head.appendChild(bundleScript);
}

// Format URL
function formatUrl(input) {
  input = input.trim();
  if (!input) return '';
  
  // Already a URL?
  try {
    const url = new URL(input);
    return url.href;
  } catch {
    // Has dots but no spaces? Assume domain
    if (input.includes('.') && !input.includes(' ')) {
      return 'https://' + input;
    }
    // Otherwise search
    return 'https://www.google.com/search?q=' + encodeURIComponent(input);
  }
}

// Navigate - FIXED encoding
function navigate() {
  const raw = urlInput.value.trim();
  if (!raw) return;
  
  const url = formatUrl(raw);
  console.log('Navigating to:', url);
  
  // Validate
  try {
    new URL(url);
  } catch {
    alert('Invalid URL');
    return;
  }
  
  // Use UV if ready
  if (uvReady && window.Ultraviolet && window.Ultraviolet.codec) {
    navigateUV(url);
  } else {
    navigateSimple(url);
  }
  
  // Update tab
  if (currentTabId) {
    const tab = tabs.find(t => t.id === currentTabId);
    if (tab) {
      tab.url = url;
      updateTabDisplay(tab);
    }
  }
}

// Navigate with UV - FIXED: No double encoding
function navigateUV(url) {
  console.log('Using UV...');
  
  try {
    // Encode ONCE with UV XOR
    const encoded = Ultraviolet.codec.xor.encode(url);
    console.log('XOR encoded:', encoded);
    
    // DO NOT encodeURIComponent here - let the server handle it
    // The server will decode it properly
    const uvUrl = `/uv/service/${encoded}`;
    console.log('Final UV URL:', uvUrl);
    
    // Load in iframe
    iframe.src = uvUrl;
    
  } catch (error) {
    console.error('UV encoding failed:', error);
    navigateSimple(url);
  }
}

// Simple navigation (fallback)
function navigateSimple(url) {
  console.log('Using simple navigation...');
  
  // Use a query parameter instead
  iframe.src = `/uv-redirect?url=${encodeURIComponent(url)}`;
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
    if (uvReady && window.Ultraviolet) {
      try {
        const encoded = Ultraviolet.codec.xor.encode(tab.url);
        iframe.src = `/uv/service/${encoded}`;
      } catch {
        iframe.src = `/uv-redirect?url=${encodeURIComponent(tab.url)}`;
      }
    } else {
      iframe.src = `/uv-redirect?url=${encodeURIComponent(tab.url)}`;
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
  quickNav.style.cssText = `
    display: flex;
    gap: 8px;
    padding: 8px 12px;
    background: #f8f9fa;
    border-bottom: 1px solid #ddd;
    flex-wrap: wrap;
  `;
  
  const sites = [
    { name: 'Google', url: 'https://www.google.com' },
    { name: 'Wikipedia', url: 'https://www.wikipedia.org' },
    { name: 'GitHub', url: 'https://github.com' },
    { name: 'Example', url: 'https://example.com' }
  ];
  
  quickNav.innerHTML = `
    <span style="color: #666; font-size: 12px; padding: 6px 0;">Quick:</span>
    ${sites.map(site => 
      `<button onclick="quickNav('${site.url}')" style="padding: 6px 12px; background: white; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; font-size: 13px;">${site.name}</button>`
    ).join('')}
  `;
  
  // Insert after omnibox
  const omnibox = document.querySelector('.omnibox');
  if (omnibox && omnibox.parentNode) {
    omnibox.parentNode.insertBefore(quickNav, omnibox.nextSibling);
  }
}

function quickNav(url) {
  urlInput.value = url;
  navigate();
}

// Initialize
document.addEventListener('DOMContentLoaded', init);

// Global functions
window.quickNav = quickNav;
window.navigate = navigate;
