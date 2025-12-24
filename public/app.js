// public/app.js - Fixed for CORS
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
  
  // Create first tab
  createTab();
  
  // Event listeners
  goBtn.addEventListener("click", navigate);
  urlInput.addEventListener("keydown", e => {
    if (e.key === "Enter") navigate();
  });
  newTabBtn.addEventListener("click", () => createTab());
  
  // Preload UV
  preloadUV();
  
  // Add quick nav
  setTimeout(addQuickNav, 500);
}

// Preload UV scripts
function preloadUV() {
  if (window.__uv$config) {
    console.log('UV already preloaded');
    return;
  }
  
  // Load UV scripts in background
  const script = document.createElement('script');
  script.src = '/uv/uv.bundle.js';
  script.async = true;
  document.head.appendChild(script);
  
  const configScript = document.createElement('script');
  configScript.src = '/uv/uv.config.js';
  configScript.async = true;
  document.head.appendChild(configScript);
}

// Format URL
function formatUrl(input) {
  input = input.trim();
  if (!input) return '';
  
  // Check if valid URL
  try {
    new URL(input);
    return input;
  } catch {
    // Has dots? Assume domain
    if (input.includes('.') && !input.includes(' ')) {
      return 'https://' + input;
    }
    // Otherwise search
    return 'https://www.google.com/search?q=' + encodeURIComponent(input);
  }
}

// Navigate - Uses UV or fallback
function navigate() {
  const raw = urlInput.value.trim();
  if (!raw) return;
  
  const url = formatUrl(raw);
  console.log('Target:', url);
  
  // Validate
  try {
    new URL(url);
  } catch {
    alert('Invalid URL');
    return;
  }
  
  // Try UV first
  if (window.Ultraviolet && window.Ultraviolet.codec) {
    useUV(url);
  } else {
    // Use simple proxy
    useSimpleProxy(url);
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

// Use Ultraviolet (bypasses CORS through bare server)
function useUV(url) {
  console.log('Using UV proxy...');
  
  try {
    // Encode with UV XOR
    const encoded = Ultraviolet.codec.xor.encode(url);
    
    // Build UV service URL
    const uvUrl = `/uv/service/${encoded}`;
    console.log('UV URL:', uvUrl);
    
    // Load in iframe
    iframe.src = uvUrl;
    
  } catch (error) {
    console.error('UV failed:', error);
    useSimpleProxy(url);
  }
}

// Simple proxy (uses bare server)
function useSimpleProxy(url) {
  console.log('Using simple proxy...');
  
  // Base64 encode
  const encoded = btoa(url);
  const proxyUrl = `/proxy/${encoded}`;
  
  iframe.src = proxyUrl;
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
        iframe.src = `/uv/service/${encoded}`;
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
    { name: 'Example', url: 'https://example.com' },
    { name: 'DuckDuckGo', url: 'https://duckduckgo.com' }
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

// Global
window.quickNav = quickNav;
window.navigate = navigate;
