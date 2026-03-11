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
            new CacheableResponsePlugin({ statuses: [0, 200] }),
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
            new CacheableResponsePlugin({ statuses: [0, 200] }),
        ],
    })
);

self.addEventListener('push', (event) => {
    const data = event.data?.json() ?? {};
    event.waitUntil(
        self.registration.showNotification(data.title || 'CMGROUPS', {
            body: data.body || '',
            icon: data.icon || '/icons/icon-192x192.png',
            badge: '/icons/icon-96x96.png',
            data: { url: data.url || '/' },
        })
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(clients.openWindow(event.notification.data.url));
});
