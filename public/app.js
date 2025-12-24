// public/app.js - Works with UV on Render
const urlInput = document.getElementById("urlInput");
const goBtn = document.getElementById("goBtn");
const iframe = document.getElementById("browser");
const tabsContainer = document.getElementById("tabs");
const newTabBtn = document.getElementById("newTab");

let tabs = [];
let currentTabId = null;

// Initialize
function init() {
  console.log('Initializing Navine Browser...');
  
  // Create first tab
  createTab();
  
  // Event listeners
  goBtn.addEventListener("click", navigate);
  urlInput.addEventListener("keydown", e => {
    if (e.key === "Enter") navigate();
  });
  newTabBtn.addEventListener("click", () => createTab());
  
  // Check if UV is loaded
  checkUV();
  
  // Add quick nav
  addQuickNav();
}

// Check UV status
function checkUV() {
  setTimeout(() => {
    if (!window.Ultraviolet) {
      console.warn('UV not loaded, using fallback');
      document.getElementById('status').innerHTML = 
        '<div style="color: orange; padding: 5px;">Using simple proxy mode</div>';
    } else {
      console.log('UV loaded successfully');
    }
  }, 1000);
}

// Navigate using UV with URL-safe encoding
function navigate() {
  const raw = urlInput.value.trim();
  if (!raw) return;
  
  let url;
  try {
    // Format the URL
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
  } catch (error) {
    alert('Invalid URL: ' + error.message);
    return;
  }
  
  console.log('Target URL:', url);
  
  // Method 1: Try using UV if available
  if (window.Ultraviolet && window.Ultraviolet.codec) {
    try {
      const encoded = Ultraviolet.codec.xor.encode(url);
      // URL encode the encoded string to make it URL-safe
      const urlSafeEncoded = encodeURIComponent(encoded);
      const proxiedUrl = `/service/${urlSafeEncoded}`;
      
      console.log('Proxied URL (UV):', proxiedUrl);
      iframe.src = proxiedUrl;
      
    } catch (error) {
      console.warn('UV encoding failed, using base64:', error);
      useBase64Proxy(url);
    }
  } else {
    // Method 2: Use base64 fallback
    useBase64Proxy(url);
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

// Fallback method using base64
function useBase64Proxy(url) {
  // Convert to URL-safe base64
  const base64 = btoa(encodeURIComponent(url))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  
  const proxiedUrl = `/service-base64/${base64}`;
  console.log('Proxied URL (Base64):', proxiedUrl);
  iframe.src = proxiedUrl;
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
    <button onclick="goTo('https://www.google.com')">Google</button>
    <button onclick="goTo('https://www.wikipedia.org')">Wikipedia</button>
    <button onclick="goTo('https://www.youtube.com')">YouTube</button>
    <button onclick="goTo('https://example.com')">Example</button>
  `;
  
  const omnibox = document.querySelector('.omnibox');
  if (omnibox) {
    omnibox.parentNode.insertBefore(quickNav, omnibox.nextSibling);
  }
}

function goTo(url) {
  urlInput.value = url;
  navigate();
}

// Initialize on load
document.addEventListener('DOMContentLoaded', init);

// Global functions
window.goTo = goTo;
window.navigate = navigate;
