// public/app.js - Simple working browser with UV
const urlInput = document.getElementById("urlInput");
const goBtn = document.getElementById("goBtn");
const iframe = document.getElementById("browser");
const tabsContainer = document.getElementById("tabs");
const newTabBtn = document.getElementById("newTab");

let tabs = [];
let currentTabId = null;

// Initialize
function init() {
  console.log('🚀 Browser starting...');
  
  // Load UV
  loadUVScripts();
  
  // Create first tab
  createTab();
  
  // Event listeners
  goBtn.addEventListener("click", navigate);
  urlInput.addEventListener("keydown", e => {
    if (e.key === "Enter") navigate();
  });
  newTabBtn.addEventListener("click", () => createTab());
  
  // Add quick nav
  setTimeout(addQuickNav, 100);
  
  // Focus URL
  setTimeout(() => {
    urlInput.focus();
    urlInput.select();
  }, 200);
}

// Load UV scripts
function loadUVScripts() {
  // Don't reload if already loaded
  if (window.__uv$config) {
    console.log('UV already loaded');
    return;
  }
  
  console.log('Loading UV scripts...');
  
  const scripts = [
    { src: '/uv/uv.bundle.js', id: 'uv-bundle' },
    { src: '/uv/uv.config.js', id: 'uv-config' }
  ];
  
  scripts.forEach(scriptInfo => {
    // Remove existing if any
    const existing = document.getElementById(scriptInfo.id);
    if (existing) existing.remove();
    
    // Create new script
    const script = document.createElement('script');
    script.id = scriptInfo.id;
    script.src = scriptInfo.src;
    script.async = false;
    document.head.appendChild(script);
  });
}

// Navigate
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
  
  // Validate
  try {
    new URL(url);
  } catch {
    alert('Invalid URL');
    return;
  }
  
  // Use UV if available, otherwise fallback
  if (window.Ultraviolet && window.Ultraviolet.codec) {
    useUV(url);
  } else {
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

// Use Ultraviolet
function useUV(url) {
  console.log('Using UV...');
  
  try {
    // Encode with UV XOR
    const encoded = Ultraviolet.codec.xor.encode(url);
    
    // URL encode for safety
    const safeEncoded = encodeURIComponent(encoded);
    
    // Build UV service URL
    const uvUrl = `/uv/service/${safeEncoded}`;
    console.log('UV URL ready');
    
    // Load in iframe
    iframe.src = uvUrl;
    
  } catch (error) {
    console.error('UV failed:', error);
    useSimpleProxy(url);
  }
}

// Simple proxy fallback
function useSimpleProxy(url) {
  console.log('Using simple proxy...');
  
  // Base64 encode
  const encoded = btoa(url);
  iframe.src = `/go/${encoded}`;
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
        const safeEncoded = encodeURIComponent(encoded);
        iframe.src = `/uv/service/${safeEncoded}`;
      } catch {
        const encoded = btoa(tab.url);
        iframe.src = `/go/${encoded}`;
      }
    } else {
      const encoded = btoa(tab.url);
      iframe.src = `/go/${encoded}`;
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
      displayText = 'Web Page';
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
    border-bottom: 1px solid #e0e0e0;
    flex-wrap: wrap;
  `;
  
  const sites = [
    { name: 'Google', url: 'https://www.google.com' },
    { name: 'Wikipedia', url: 'https://www.wikipedia.org' },
    { name: 'YouTube', url: 'https://www.youtube.com' },
    { name: 'GitHub', url: 'https://github.com' },
    { name: 'DuckDuckGo', url: 'https://duckduckgo.com' }
  ];
  
  quickNav.innerHTML = `
    <span style="color: #666; font-size: 12px; padding: 6px 0; margin-right: 8px;">Quick:</span>
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
