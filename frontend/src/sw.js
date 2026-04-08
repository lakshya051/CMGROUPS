import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst, NetworkOnly } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

const navigationHandler = new NetworkFirst({
    cacheName: 'navigations',
    networkTimeoutSeconds: 3,
});

const navigationRoute = new NavigationRoute(
    async (params) => {
        try {
            return await navigationHandler.handle(params);
        } catch (error) {
            const offline = await caches.match('/offline.html');
            if (offline) return offline;
            return new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/html' } });
        }
    },
    {
        denylist: [/^\/api\//, /^\/.well-known\//],
    }
);
registerRoute(navigationRoute);

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open('offline-fallback').then((cache) => cache.add('/offline.html'))
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

registerRoute(
    ({ url }) => /^https:\/\/fonts\.(googleapis|gstatic)\.com/.test(url.href),
    new CacheFirst({
        cacheName: 'google-fonts-cache',
        plugins: [
            new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }),
            new CacheableResponsePlugin({ statuses: [0, 200] }),
        ],
    })
);

registerRoute(
    ({ url }) => /\/api\/(products|categories|banners|courses)/.test(url.pathname),
    new NetworkFirst({
        cacheName: 'api-public-data',
        plugins: [
            new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 300 }),
            new CacheableResponsePlugin({ statuses: [200] }),
        ],
        networkTimeoutSeconds: 5,
    })
);

registerRoute(
    ({ url }) => /\/api\/(orders|wallet|notifications|user|cart|auth)/.test(url.pathname),
    new NetworkOnly()
);

registerRoute(
    ({ request }) => request.destination === 'image',
    new CacheFirst({
        cacheName: 'images-cache',
        plugins: [
            new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 }),
            new CacheableResponsePlugin({ statuses: [200] }),
        ],
    })
);

function normalizeNotificationUrl(raw) {
    if (typeof raw !== 'string') return '/';
    const s = raw.trim();
    if (!s || s.startsWith('//') || /^javascript:/i.test(s)) return '/';
    if (/^https?:\/\//i.test(s)) {
        try {
            const u = new URL(s);
            if (u.origin !== self.location.origin) return '/';
            return `${u.pathname}${u.search}${u.hash}` || '/';
        } catch {
            return '/';
        }
    }
    return s.startsWith('/') ? s : `/${s}`;
}

self.addEventListener('push', (event) => {
    event.waitUntil(
        (async () => {
            let data = {};
            try {
                if (event.data) {
                    const raw = await event.data.text();
                    if (raw) {
                        try {
                            data = JSON.parse(raw);
                        } catch {
                            data = { body: raw };
                        }
                    }
                }
            } catch {
                /* ignore */
            }
            const openPath = normalizeNotificationUrl(data.url);
            await self.registration.showNotification(data.title || 'Shoptify', {
                body: data.body || '',
                icon: data.icon || '/icons/icon-192x192.png',
                badge: '/icons/icon-96x96.png',
                data: { url: openPath },
            });
            const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
            for (const c of clients) {
                c.postMessage({ type: 'cmgroups:push-received' });
            }
        })()
    );
});

self.addEventListener('pushsubscriptionchange', (event) => {
    event.waitUntil(
        (async () => {
            try {
                const newSub = await self.registration.pushManager.subscribe(
                    event.oldSubscription?.options || { userVisibleOnly: true }
                );
                const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
                for (const c of allClients) {
                    c.postMessage({ type: 'cmgroups:subscription-changed', subscription: newSub.toJSON() });
                }
            } catch {
                /* requires user-initiated re-subscribe */
            }
        })()
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const safePath = normalizeNotificationUrl(event.notification.data?.url);
    const targetUrl = new URL(safePath, self.location.origin).href;
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if (client.url === targetUrl && 'focus' in client) return client.focus();
            }
            if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
        })
    );
});
