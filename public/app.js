const urlInput = document.getElementById("urlInput");
const goBtn = document.getElementById("goBtn");
const iframe = document.getElementById("browser");
const tabsContainer = document.getElementById("tabs");
const newTabBtn = document.getElementById("newTab");

let tabs = [];
let currentTabId = null;

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

function createTab(url = 'about:blank') {
  const tabId = Date.now().toString();

  // Create tab button
  const tabBtn = document.createElement('button');
  tabBtn.className = 'tab-btn';
  tabBtn.textContent = 'New Tab';

  // Switch to tab on click
  tabBtn.onclick = () => switchTab(tabId);

  // Create close button
  const closeBtn = document.createElement('button');
  closeBtn.className = 'close-btn';
  closeBtn.textContent = '×';
  closeBtn.onclick = (e) => {
    e.stopPropagation();
    closeTab(tabId);
  };

  // Container for tab button and close button
  const tabDiv = document.createElement('div');
  tabDiv.style.display = 'flex';
  tabDiv.style.alignItems = 'center';
  tabDiv.style.marginRight = '4px';

  tabDiv.appendChild(tabBtn);
  tabDiv.appendChild(closeBtn);
  tabsContainer.appendChild(tabDiv);

  // Save tab info
  tabs.push({ 
    id: tabId, 
    button: tabBtn, 
    url: url, 
    wrapper: tabDiv,
    title: 'New Tab'
  });

  // Switch to new tab
  switchTab(tabId);
}

function switchTab(tabId) {
  const tab = tabs.find(t => t.id === tabId);
  if (!tab) return;

  currentTabId = tabId;

  // Update iframe src
  iframe.src = tab.url;

  // Update URL input
  urlInput.value = tab.url === 'about:blank' ? '' : tab.url;

  // Update tab button styles
  tabs.forEach(t => {
    t.button.classList.toggle('active', t.id === tabId);
    // Truncate long URLs for display
    const displayText = t.url === 'about:blank' ? t.title : 
                       t.url.length > 30 ? t.url.substring(0, 27) + '...' : t.url;
    t.button.textContent = displayText;
  });
}

function closeTab(tabId) {
  const index = tabs.findIndex(t => t.id === tabId);
  if (index === -1) return;

  // Remove tab DOM element
  tabs[index].wrapper.remove();

  // Remove from array
  tabs.splice(index, 1);

  // If current tab is closed, switch to another
  if (currentTabId === tabId) {
    if (tabs.length > 0) {
      switchTab(tabs[0].id);
    } else {
      iframe.src = '';
      urlInput.value = '';
      currentTabId = null;
    }
  }
}

function navigate() {
  if (!window.__uv$config) {
    alert("Ultraviolet not loaded");
    return;
  }

  const raw = urlInput.value;
  if (!raw) return;

  const target = formatInput(raw);
  const encoded = __uv$config.encodeUrl(target);

  // Update current tab's URL
  const currentTab = tabs.find(t => t.id === currentTabId);
  if (currentTab) {
    currentTab.url = target;
    // Extract title from URL for display
    try {
      const urlObj = new URL(target);
      currentTab.title = urlObj.hostname;
    } catch {
      currentTab.title = target;
    }
  }

  iframe.src = __uv$config.prefix + encoded;
}

// Handle iframe load events to update tab titles
iframe.addEventListener('load', function() {
  if (currentTabId && iframe.contentWindow) {
    try {
      const tab = tabs.find(t => t.id === currentTabId);
      if (tab && iframe.contentWindow.document.title) {
        tab.title = iframe.contentWindow.document.title || tab.url;
        // Update tab button text
        const displayText = tab.title.length > 30 ? 
                          tab.title.substring(0, 27) + '...' : 
                          tab.title;
        tab.button.textContent = displayText;
      }
    } catch (e) {
      // Cross-origin restrictions, ignore
    }
  }
});

// Initialize with one tab
createTab();

// Event listeners
goBtn.addEventListener("click", navigate);
urlInput.addEventListener("keydown", e => {
  if (e.key === "Enter") navigate();
});
newTabBtn.onclick = () => createTab();

// Allow dragging tabs (optional enhancement)
let draggedTab = null;

tabsContainer.addEventListener('dragstart', (e) => {
  if (e.target.classList.contains('tab-btn')) {
    draggedTab = e.target;
    e.dataTransfer.effectAllowed = 'move';
  }
});

tabsContainer.addEventListener('dragover', (e) => {
  e.preventDefault();
});

tabsContainer.addEventListener('drop', (e) => {
  e.preventDefault();
  if (draggedTab) {
    // Reorder logic here
    draggedTab = null;
  }
});
