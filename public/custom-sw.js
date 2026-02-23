// public/custom-sw.js

self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : {};
    
    const title = data.title || 'DayClose';
    const options = {
      body: data.body || 'Tienes un nuevo mensaje',
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      data: { url: data.url || '/' } // Guardamos la URL para luego
    };
  
    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  });
  
  self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    // Al hacer clic, abre la App o la URL específica
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
        // Si ya hay una ventana abierta, la enfocamos
        if (windowClients.length > 0) {
          const client = windowClients[0];
          if (client.url === event.notification.data.url) {
            return client.focus();
          }
        }
        // Si no, abrimos una nueva
        return clients.openWindow(event.notification.data.url);
      })
    );
  });