const CACHE_NAME = "jisclock-cache-v3";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest?v=3",
  "./icons/icon-192.svg",
  "./icons/icon-512.svg",
  "./screenshots/clock-wide.svg",
  "./screenshots/clock-narrow.svg",
];

function getClockAngles(now) {
  const min = now.getMinutes();
  const hour = now.getHours();
  const minAngle = (min / 60) * 360;
  const hourAngle = (hour / 24) * 360 + (min / 60) * 15;
  return { hourAngle, minAngle };
}

async function createDynamicClockIcon(size) {
  if (typeof OffscreenCanvas === "undefined") {
    return fetch(size >= 512 ? "./icons/icon-512.svg" : "./icons/icon-192.svg");
  }

  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    return fetch(size >= 512 ? "./icons/icon-512.svg" : "./icons/icon-192.svg");
  }

  const now = new Date();
  const { hourAngle, minAngle } = getClockAngles(now);
  const center = size / 2;
  const outerRadius = size * 0.47;
  const innerRadius = size * 0.36;

  // Background aplikasi
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, size, size);

  // Dial jam
  ctx.beginPath();
  ctx.arc(center, center, outerRadius, 0, 2 * Math.PI);
  ctx.fillStyle = "#1e293b";
  ctx.fill();
  ctx.lineWidth = size * 0.04;
  ctx.strokeStyle = "#334155";
  ctx.stroke();

  // Jarum jam
  ctx.save();
  ctx.translate(center, center);
  ctx.rotate((hourAngle * Math.PI) / 180);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -innerRadius * 0.65);
  ctx.lineWidth = size * 0.055;
  ctx.lineCap = "round";
  ctx.strokeStyle = "#f8fafc";
  ctx.stroke();
  ctx.restore();

  // Jarum menit
  ctx.save();
  ctx.translate(center, center);
  ctx.rotate((minAngle * Math.PI) / 180);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -innerRadius * 0.9);
  ctx.lineWidth = size * 0.04;
  ctx.lineCap = "round";
  ctx.strokeStyle = "#94a3b8";
  ctx.stroke();
  ctx.restore();

  // Titik tengah
  ctx.beginPath();
  ctx.arc(center, center, size * 0.035, 0, 2 * Math.PI);
  ctx.fillStyle = "#fb7185";
  ctx.fill();

  const blob = await canvas.convertToBlob({ type: "image/png" });
  return new Response(blob, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store, max-age=0",
    },
  });
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const url = new URL(event.request.url);
  if (
    url.pathname.endsWith("/icons/dynamic-192.png") ||
    url.pathname.endsWith("/icons/dynamic-512.png")
  ) {
    const size = url.pathname.endsWith("/icons/dynamic-512.png") ? 512 : 192;
    event.respondWith(createDynamicClockIcon(size));
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request)
        .then((networkResponse) => {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return networkResponse;
        })
        .catch(() => caches.match("./index.html"));
    }),
  );
});
