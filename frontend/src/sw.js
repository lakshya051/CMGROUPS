import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst, NetworkOnly } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

const navigationRoute = new NavigationRoute(
    new NetworkFirst({
        cacheName: 'navigations',
        networkTimeoutSeconds: 3,
    }),
    {
        denylist: [/^\/api\//, /^\/.well-known\//],
    }
);
registerRoute(navigationRoute);

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
    let data = {};
    try {
        if (event.data) data = event.data.json();
    } catch {
        try {
            const text = event.data?.text?.();
            if (typeof text === 'string') {
                data = { body: text };
            }
        } catch {
            /* ignore */
        }
    }
    const openPath = normalizeNotificationUrl(data.url);
    event.waitUntil(
        self.registration.showNotification(data.title || 'Shoptify', {
            body: data.body || '',
            icon: data.icon || '/icons/icon-192x192.png',
            badge: '/icons/icon-96x96.png',
            data: { url: openPath },
        })
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
