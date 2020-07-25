// 监听浏览器分发的push事件
self.addEventListener('push', ({ data }) => {
  console.log('sw push事件触发');
  if (!data) return;
  const { content, image } = data.json();
  const title = '网页消息推送demo';
  // https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/showNotification
  const options = {
    body: content || '服务端推送通知',
    icon: image || `${window.location.href}1.png`,
    actions: [{
      action: 'github',
      title: 'github'
    }]
  }
  self.registration.showNotification(title, options);
});

// 监听通知点击
self.addEventListener('notificationclick', ({ action, notification }) => {
  console.log(action)
  switch(action) {
    case 'github':
      self.clients.openWindow('https://www.github.com');
    default:
      self.clients.openWindow(self.origin);
  }
  notification.close();
});

