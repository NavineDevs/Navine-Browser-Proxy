const frame = document.getElementById("frame");
const input = document.getElementById("url");

function encode(url) {
  return __uv$config.prefix + __uv$config.encodeUrl(url);
}

document.getElementById("go").onclick = () => {
  let value = input.value.trim();
  if (!value) return;

  if (!value.startsWith("http")) {
    value = "https://www.google.com/search?q=" + encodeURIComponent(value);
  }

  frame.src = encode(value);
};

input.addEventListener("keydown", e => {
  if (e.key === "Enter") document.getElementById("go").click();
});
