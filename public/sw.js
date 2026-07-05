// Service worker: receives push messages (new booking requests) and shows
// them as system notifications. Registered from the admin dashboard.

self.addEventListener('push', (event) => {
  if (!event.data) return
  let data = {}
  try {
    data = event.data.json()
  } catch {
    data = { title: 'הודעה חדשה', body: event.data.text() }
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'הרשמה חדשה! 📚', {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      dir: 'rtl',
      lang: 'he',
      data: { url: data.url || '/admin' },
    })
  )
})

// Tapping the notification opens the admin dashboard (or focuses it if open).
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/admin'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      for (const win of windows) {
        if (win.url.includes('/admin') && 'focus' in win) return win.focus()
      }
      return clients.openWindow(url)
    })
  )
})
