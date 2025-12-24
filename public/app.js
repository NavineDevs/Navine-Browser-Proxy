const urlInput = document.getElementById("urlInput");
const goBtn = document.getElementById("goBtn");
const iframe = document.getElementById("browser");

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

  if (input.includes(".") && !input.includes(" ")) {
    return "https://" + input;
  }

  return "https://www.google.com/search?q=" + encodeURIComponent(input);
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

  iframe.src = __uv$config.prefix + encoded;
}

goBtn.addEventListener("click", navigate);
urlInput.addEventListener("keydown", e => {
  if (e.key === "Enter") navigate();
});
