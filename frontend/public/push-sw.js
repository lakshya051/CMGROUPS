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
