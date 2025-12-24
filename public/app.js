// public/app.js - Simple working version
const urlInput = document.getElementById("urlInput");
const goBtn = document.getElementById("goBtn");
const iframe = document.getElementById("browser");
const tabsContainer = document.getElementById("tabs");
const newTabBtn = document.getElementById("newTab");

let tabs = [];
let currentTabId = null;

// Initialize
function init() {
  // Check if UV is loaded
  if (!window.Ultraviolet) {
    console.error('Ultraviolet not found');
    setTimeout(() => {
      if (!window.Ultraviolet) {
        alert('Ultraviolet proxy not loaded. Please check console.');
      }
    }, 1000);
  }
  
  // Create first tab
  createTab();
  
  // Set up event listeners
  goBtn.addEventListener("click", navigate);
  urlInput.addEventListener("keydown", e => {
    if (e.key === "Enter") navigate();
  });
  newTabBtn.addEventListener("click", () => createTab());
  
  // Quick navigation buttons
  setupQuickNav();
}

function navigate() {
  const raw = urlInput.value.trim();
  if (!raw) return;
  
  let url;
  try {
    // Try to parse as URL
    new URL(raw);
    url = raw;
  } catch {
    // If not a valid URL, treat as search
    if (raw.includes('.') && !raw.includes(' ')) {
      url = 'https://' + raw;
    } else {
      url = 'https://www.google.com/search?q=' + encodeURIComponent(raw);
    }
  }
  
  console.log('Navigating to:', url);
  
  // Update iframe using direct /go route
  iframe.src = `/go?url=${encodeURIComponent(url)}`;
  
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
    iframe.src = `/go?url=${encodeURIComponent(tab.url)}`;
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
      // Limit length
      if (displayText.length > 20) {
        displayText = displayText.substring(0, 17) + '...';
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

function setupQuickNav() {
  const quickNav = document.createElement('div');
  quickNav.className = 'quick-nav';
  quickNav.innerHTML = `
    <button onclick="urlInput.value='https://www.google.com'; navigate()">Google</button>
    <button onclick="urlInput.value='https://www.wikipedia.org'; navigate()">Wikipedia</button>
    <button onclick="urlInput.value='https://www.youtube.com'; navigate()">YouTube</button>
    <button onclick="urlInput.value='https://example.com'; navigate()">Example</button>
  `;
  
  // Insert after omnibox
  const omnibox = document.querySelector('.omnibox');
  if (omnibox) {
    omnibox.parentNode.insertBefore(quickNav, omnibox.nextSibling);
  }
}

// Start when page loads
document.addEventListener('DOMContentLoaded', init);

// Make functions available globally for buttons
window.navigate = navigate;
window.createTab = createTab;
window.switchTab = switchTab;
window.closeTab = closeTab;
