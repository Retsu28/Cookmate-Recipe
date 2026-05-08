self.addEventListener('notificationclick', (event) => {
  const data = event.notification?.data || {};
  const route = data.route || (data.recipeId ? `/recipe/${data.recipeId}` : '/planner');
  event.notification.close();

  event.waitUntil((async () => {
    const windows = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    const origin = self.location.origin;
    const targetUrl = new URL(route, origin).href;

    for (const client of windows) {
      if ('focus' in client && client.url.startsWith(origin)) {
        await client.focus();
        if ('navigate' in client) {
          await client.navigate(targetUrl);
        }
        return;
      }
    }

    if (clients.openWindow) {
      await clients.openWindow(targetUrl);
    }
  })());
});
