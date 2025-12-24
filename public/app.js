const urlInput = document.getElementById("urlInput");
const goBtn = document.getElementById("goBtn");
const iframe = document.getElementById("browser");

// Helper: detect if input is a URL
function isUrl(val) {
  try {
    new URL(val);
    return true;
  } catch {
    return false;
  }
}

// Convert input into a valid URL or search query
function formatInput(input) {
  input = input.trim();

  if (isUrl(input)) return input;

  // If it looks like a domain, add https
  if (input.includes(".") && !input.includes(" ")) {
    return "https://" + input;
  }

  // Otherwise, treat as search
  return "https://www.google.com/search?q=" + encodeURIComponent(input);
}

// Navigate using Ultraviolet
function navigate() {
  if (!window.__uv$config) {
    alert("Ultraviolet not loaded");
    return;
  }

  const raw = urlInput.value;
  if (!raw) return;

  const target = formatInput(raw);
  const encoded = __uv$config.encodeUrl(target);

  iframe.src = __uv$config.prefix + encoded;
}

// Events
goBtn.addEventListener("click", navigate);

urlInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") navigate();
});
