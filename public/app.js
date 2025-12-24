const urlInput = document.getElementById("urlInput");
const goBtn = document.getElementById("goBtn");
const iframe = document.getElementById("browser");
const tabsContainer = document.getElementById("tabs-container");
const newTabBtn = document.getElementById("newTabBtn");

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
  tabBtn.textContent = 'New Tab';
  tabBtn.style.marginRight = '5px';

  // Add click to switch tab
  tabBtn.onclick = () => switchTab(tabId);

  // Add close button
  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'x';
  closeBtn.style.marginLeft = '2px';
  closeBtn.onclick = (e) => {
    e.stopPropagation();
    closeTab(tabId);
  };

  // Wrap in a container
  const tabWrapper = document.createElement('div');
  tabWrapper.style.display = 'inline-block';
  tabWrapper.style.marginRight = '5px';

  tabWrapper.appendChild(tabBtn);
  tabWrapper.appendChild(closeBtn);
  tabsContainer.appendChild(tabWrapper);

  // Save tab info
  tabs.push({ id: tabId, button: tabBtn, url: url, wrapper: tabWrapper });

  // Switch to new tab
  switchTab(tabId);
}

function switchTab(tabId) {
  const tab = tabs.find(t => t.id === tabId);
  if (!tab) return;

  currentTabId = tabId;

  // Update iframe src
  iframe.src = tab.url;

  // Update tab button style
  tabs.forEach(t => {
    t.button.style.background = t.id === tabId ? 'lightblue' : '';
    // Update button text to show URL
    t.button.textContent = tab.url;
  });
}

function closeTab(tabId) {
  const index = tabs.findIndex(t => t.id === tabId);
  if (index === -1) return;

  // Remove tab element
  tabs[index].wrapper.remove();

  // Remove from array
  tabs.splice(index, 1);

  // If closing current tab, switch to another
  if (currentTabId === tabId) {
    if (tabs.length > 0) {
      switchTab(tabs[0].id);
    } else {
      iframe.src = '';
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
    currentTab.button.textContent = target;
  }

  iframe.src = __uv$config.prefix + encoded;
}

// Create initial tab
createTab();

goBtn.addEventListener("click", navigate);
urlInput.addEventListener("keydown", e => {
  if (e.key === "Enter") navigate();
});

newTabBtn.onclick = () => createTab();
