const urlInput = document.getElementById("urlInput");
const goBtn = document.getElementById("goBtn");
const iframe = document.getElementById("browser");
const tabsContainer = document.getElementById("tabs");
const newTabBtn = document.getElementById("newTab");

let tabs = [];
let currentTabId = null;

let uvConfig = {
  prefix: "/uv/service/",
  bare: "https://uv.holyubofficial.net/bare/",
  encodeUrl: null,
  decodeUrl: null
};

function init() {
  console.log('🚀 UV Browser starting...');
  loadUV();
  createTab();

  goBtn.addEventListener("click", navigate);
  urlInput.addEventListener("keydown", e => {
    if (e.key === "Enter") navigate();
  });
  newTabBtn.addEventListener("click", () => createTab());

  addQuickNav();

  setTimeout(() => {
    urlInput.focus();
    urlInput.select();
  }, 300);
}

function loadUV() {
  if (window.__uv$loading || window.Ultraviolet) return;
  window.__uv$loading = true;

  const bundleScript = document.createElement('script');
  bundleScript.src = '/uv/uv.bundle.js';
  bundleScript.async = false;

  bundleScript.onload = () => {
    console.log('✅ UV bundle loaded');

    const configScript = document.createElement('script');
    configScript.src = '/uv/uv.config.js';
    configScript.async = false;

    configScript.onload = () => {
      console.log('✅ UV config loaded');
      window.__uv$loading = false;

      if (window.Ultraviolet && window.Ultraviolet.codec) {
        uvConfig.encodeUrl = Ultraviolet.codec.xor.encode;
        uvConfig.decodeUrl = Ultraviolet.codec.xor.decode;

        window.__uv$config = {
          prefix: "/uv/service/",
          bare: "https://uv.holyubofficial.net/bare/",
          encodeUrl: Ultraviolet.codec.xor.encode,
          decodeUrl: Ultraviolet.codec.xor.decode,
          handler: "/uv/uv.handler.js",
          bundle: "/uv/uv.bundle.js",
          config: "/uv/uv.config.js",
          sw: "/uv/uv.sw.js"
        };
      }
    };

    configScript.onerror = () => {
      console.warn('⚠️ UV config failed');
      window.__uv$loading = false;
    };

    document.head.appendChild(configScript);
  };

  bundleScript.onerror = () => {
    console.error('❌ UV bundle failed');
    window.__uv$loading = false;
  };

  document.head.appendChild(bundleScript);
}

function isUVReady() {
  return window.Ultraviolet &&
         window.Ultraviolet.codec &&
         uvConfig.encodeUrl &&
         uvConfig.decodeUrl;
}

function formatUrl(input) {
  input = input.trim();
  if (!input) return '';

  try {
    return new URL(input).toString();
  } catch {
    if (input.includes('.') && !input.includes(' ')) {
      return 'https://' + input;
    }
    return 'https://www.google.com/search?q=' + encodeURIComponent(input);
  }
}

function navigate() {
  const raw = urlInput.value.trim();
  if (!raw) return;

  const url = formatUrl(raw);
  console.log('🌐 Target:', url);

  try {
    new URL(url);
  } catch {
    alert('Invalid URL');
    return;
  }

  if (currentTabId) {
    const tab = tabs.find(t => t.id === currentTabId);
    if (tab) {
      tab.url = url;
      updateTabDisplay(tab);
    }
  }

  navigateUV(url);
}

function navigateUV(url) {
  console.log('🔗 Using UV proxy...');

  if (!isUVReady()) {
    console.warn('UV not ready, trying to load...');
    loadUV();

    setTimeout(() => {
      if (isUVReady()) {
        navigateUV(url);
      } else {
        alert('UV proxy is not ready. Please wait or try again.');
      }
    }, 1500);
    return;
  }

  try {
    const encoded = uvConfig.encodeUrl(url);
    const uvUrl = uvConfig.prefix + encoded;
    iframe.src = uvUrl;
  } catch (error) {
    console.error('❌ UV error:', error);
    alert('UV Error: ' + error.message);
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

  if (tab.url !== 'about:blank') {
    if (isUVReady()) {
      try {
        const encoded = uvConfig.encodeUrl(tab.url);
        iframe.src = uvConfig.prefix + encoded;
      } catch {
        iframe.src = '';
      }
    } else {
      iframe.src = '';
    }
  } else {
    iframe.src = '';
  }

  urlInput.value = tab.url === 'about:blank' ? '' : tab.url;

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
    { name: 'YouTube', url: 'https://www.youtube.com' },
    { name: 'Wikipedia', url: 'https://www.wikipedia.org' },
    { name: 'GitHub', url: 'https://github.com' }
  ];

  quickNav.innerHTML = `
    <span style="color: #666; font-size: 12px; padding: 6px 0;">Quick:</span>
    ${sites.map(site =>
      `<button onclick="quickNav('${site.url}')" style="padding: 6px 12px; background: white; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; font-size: 13px;">${site.name}</button>`
    ).join('')}
  `;

  const omnibox = document.querySelector('.omnibox');
  if (omnibox && omnibox.parentNode) {
    omnibox.parentNode.insertBefore(quickNav, omnibox.nextSibling);
  }
}

function quickNav(url) {
  urlInput.value = url;
  navigate();
}

document.addEventListener('DOMContentLoaded', init);
window.quickNav = quickNav;
window.navigate = navigate;
