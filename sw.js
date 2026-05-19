// FinScan Service Worker v1.0
const CACHE_NAME = "finscan-v1";
const STATIC_ASSETS = ["/", "/index.html"];

// ── Install : mise en cache des assets statiques ──
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ── Activate : nettoyage des vieux caches ──
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch : stratégie Network-first, Cache fallback ──
self.addEventListener("fetch", (e) => {
  // Laisser passer les appels API Anthropic sans cache
  if (e.request.url.includes("api.anthropic.com")) return;
  if (e.request.url.includes("fonts.googleapis.com")) return;

  e.respondWith(
    fetch(e.request)
      .then((res) => {
        // Mettre en cache les nouvelles ressources
        if (res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

// ── Push notifications (prêt pour les alertes fin de mois) ──
self.addEventListener("push", (e) => {
  const data = e.data?.json() ?? {};
  e.waitUntil(
    self.registration.showNotification(data.title || "FinScan", {
      body: data.body || "Nouvelle alerte sur vos dépenses",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: data.url || "/" },
      actions: [
        { action: "view", title: "Voir le détail" },
        { action: "dismiss", title: "Ignorer" },
      ],
    })
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  if (e.action === "view") {
    e.waitUntil(clients.openWindow(e.notification.data.url));
  }
});
