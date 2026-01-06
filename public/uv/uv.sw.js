/* global UVServiceWorker, __uv$config */

importScripts("/uv/uv.bundle.js");
importScripts("/uv/uv.config.js");

const uv = new UVServiceWorker();

self.addEventListener("fetch", (event) => {
  if (uv.route(event)) {
    event.respondWith(uv.fetch(event));
  } else {
    event.respondWith(fetch(event.request));
  }
});
