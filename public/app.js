// public/app.js - Fixed navigation
const urlInput = document.getElementById("urlInput");
const goBtn = document.getElementById("goBtn");
const iframe = document.getElementById("browser");
const tabsContainer = document.getElementById("tabs");
const newTabBtn = document.getElementById("newTab");

let tabs = [];
let currentTabId = null;

// Check if UV is loaded
function checkUV() {
  if (!window.__uv$config) {
    console.error('UV not loaded! Check if /uv/ files are accessible.');
    alert('Ultraviolet proxy not loaded. Please refresh the page.');
    return false;
  }
  return true;
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
  if (!checkUV()) return;
  
  const raw = urlInput.value.trim();
  if (!raw) return;
  
  const target = formatInput(raw);
  
  try {
    // Use UV to encode the URL
    const encoded = __uv$config.encodeUrl(target);
    const proxiedUrl = __uv$config.prefix + encoded;
    
    console.log('Navigating to:', target);
    console.log('Proxied URL:', proxiedUrl);
    
    // Load in iframe
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
  } catch (error) {
    console.error('Navigation error:', error);
    alert('Error navigating: ' + error.message);
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
  let displayText = tab.title;
  
  if (tab.url !== 'about:blank') {
    try {
      const urlObj = new URL(tab.url);
      displayText = urlObj.hostname.replace('www.', '');
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

// Event Listeners
goBtn.addEventListener("click", navigate);
urlInput.addEventListener("keydown", e => {
  if (e.key === "Enter") navigate();
});
newTabBtn.onclick = () => createTab();

// Iframe load handler
iframe.addEventListener('load', function() {
  if (currentTabId) {
    const tab = tabs.find(t => t.id === currentTabId);
    if (tab) {
      try {
        // Try to get title from iframe (may be blocked by CORS)
        if (iframe.contentWindow && iframe.contentWindow.document) {
          const title = iframe.contentWindow.document.title;
          if (title && title !== 'Ultraviolet Proxy') {
            tab.title = title;
            updateTabDisplay(tab);
          }
        }
      } catch (e) {
        // CORS error - can't access iframe content
        // Use URL hostname as title
        try {
          const urlObj = new URL(tab.url);
          tab.title = urlObj.hostname.replace('www.', '');
          updateTabDisplay(tab);
        } catch {}
      }
    }
  }
});

// Initialize
createTab();

// Debug: Check UV on load
window.addEventListener('load', () => {
  console.log('Page loaded');
  if (window.__uv$config) {
    console.log('UV config loaded:', window.__uv$config);
  } else {
    console.error('UV config NOT loaded!');
  }
});
