// public/app.js - Simple working version
const urlInput = document.getElementById("urlInput");
const goBtn = document.getElementById("goBtn");
const iframe = document.getElementById("browser");
const tabsContainer = document.getElementById("tabs");
const newTabBtn = document.getElementById("newTab");

let tabs = [];
let currentTabId = null;
let uvLoaded = false;

// Initialize
function init() {
  console.log('🚀 Browser starting...');
  
  // Create first tab
  createTab();
  
  // Event listeners
  goBtn.addEventListener("click", navigate);
  urlInput.addEventListener("keydown", e => {
    if (e.key === "Enter") navigate();
  });
  newTabBtn.addEventListener("click", () => createTab());
  
  // Load UV in background
  loadUV();
  
  // Add quick navigation
  addQuickNav();
  
  // Focus URL input
  setTimeout(() => {
    urlInput.focus();
    urlInput.select();
  }, 200);
}

// Load UV properly
function loadUV() {
  // Don't load if already loaded
  if (window.Ultraviolet) {
    uvLoaded = true;
    console.log('UV already loaded');
    return;
  }
  
  console.log('Loading UV...');
  
  // Load UV bundle first (contains Ultraviolet class)
  const bundleScript = document.createElement('script');
  bundleScript.src = '/uv/uv.bundle.js';
  bundleScript.async = false;
  bundleScript.onload = () => {
    console.log('UV bundle loaded');
    
    // Now load config
    const configScript = document.createElement('script');
    configScript.src = '/uv/uv.config.js';
    configScript.async = false;
    configScript.onload = () => {
      uvLoaded = true;
      console.log('UV config loaded');
    };
    configScript.onerror = () => {
      console.warn('UV config failed to load, will use fallback');
    };
    
    document.head.appendChild(configScript);
  };
  
  bundleScript.onerror = () => {
    console.error('Failed to load UV bundle');
  };
  
  document.head.appendChild(bundleScript);
}

// Format input as URL
function formatUrl(input) {
  input = input.trim();
  if (!input) return '';
  
  // Already a valid URL?
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

// Navigate
function navigate() {
  const raw = urlInput.value.trim();
  if (!raw) return;
  
  const url = formatUrl(raw);
  console.log('🌐 Navigating to:', url);
  
  // Validate
  try {
    new URL(url);
  } catch {
    alert('Please enter a valid URL');
    return;
  }
  
  // Update current tab
  if (currentTabId) {
    const tab = tabs.find(t => t.id === currentTabId);
    if (tab) {
      tab.url = url;
      updateTabDisplay(tab);
    }
  }
  
  // Use UV if loaded, otherwise use bare proxy
  if (uvLoaded && window.Ultraviolet && window.Ultraviolet.codec) {
    useUV(url);
  } else {
    useBareProxy(url);
  }
}

// Use Ultraviolet
function useUV(url) {
  console.log('Using UV proxy...');
  
  try {
    // Encode with UV XOR
    const encoded = Ultraviolet.codec.xor.encode(url);
    console.log('XOR encoded:', encoded);
    
    // Build UV service URL
    const uvUrl = `/uv/service/${encoded}`;
    console.log('Loading UV URL:', uvUrl);
    
    // Load in iframe
    iframe.src = uvUrl;
    
  } catch (error) {
    console.error('UV encoding failed:', error);
    useBareProxy(url);
  }
}

// Use bare proxy (fallback)
function useBareProxy(url) {
  console.log('Using bare proxy...');
  
  // Base64 encode for URL safety
  const encoded = btoa(url);
  const proxyUrl = `/bare-proxy/${encoded}`;
  
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
    if (uvLoaded && window.Ultraviolet) {
      try {
        const encoded = Ultraviolet.codec.xor.encode(tab.url);
        iframe.src = `/uv/service/${encoded}`;
      } catch {
        const encoded = btoa(tab.url);
        iframe.src = `/bare-proxy/${encoded}`;
      }
    } else {
      const encoded = btoa(tab.url);
      iframe.src = `/bare-proxy/${encoded}`;
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
      if (displayText.length > 20) {
        displayText = displayText.substring(0, 17) + '...';
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

// Initialize when page loads
document.addEventListener('DOMContentLoaded', init);

// Global functions
window.quickNav = quickNav;
window.navigate = navigate;
