// 1、授权通知
function askPermission() {
  return new Promise((res, rej) => {
    Notification.requestPermission(permission => {
      if (permission !== 'granted') {
        console.log('通知授权失败');
        rej();
      } else {
        console.log('通知授权成功')
        res();
      }
    });
  });
}

// 2、service worker注册
function registSW() {
  return navigator.serviceWorker.register('./sw.js')
}

// 3、subscription
function subscript(registration, publickKey) {
  const options = {
    userVisibleOnly: true,
    applicationServerKey: window.urlBase64ToUint8Array(publickKey)
  };
  return registration.pushManager.subscribe(options);
}

// 4、push service

async function min() {
  /**
   * install web-push
   * web-push generate-vapid-keys
   * Public Key:
   * BEfibeblQcaa3wzDyGSPddFreazGqDZHDNa2jsfXRn-ni_SO2-jb_1NDJHE8tvRHEzvtujXXijZzGBQNbbMBvZI
   * Private Key:
   * YxDDrS1lnZZ0xAkp5YsCr2yOTIIQeXp9ayJukRCf8Aw
   */
  const publickKey = 'BEfibeblQcaa3wzDyGSPddFreazGqDZHDNa2jsfXRn-ni_SO2-jb_1NDJHE8tvRHEzvtujXXijZzGBQNbbMBvZI';
  const [_, registration] = await Promise.all([
    askPermission(),
    registSW()
  ]);
  const subscription = await subscript(registration, publickKey);
  console.log(subscription)

  const response = await fetch('/subscript', {
    method: 'post',
    body: JSON.stringify(subscription),
    headers: {
      'content-type': 'application/json'
    },
    credentials: 'same-origin'
  }).then(res => res.json());
  if (response.retcode === 0) {
    console.log('订阅信息已存放到服务器');
  } else {
    console.log(response.msg)
  }

  // 本地通知和服务器消息推送
  const noticeDom = document.getElementById('notice');
  const pushDom = document.getElementById('push');
  const contentDom = document.getElementById('inputContent');
  const imageDom = document.getElementById('inputImage');
  // 触发本地通知
  noticeDom.onclick = () => {
    const content = contentDom.value;
    const image = imageDom.value;
    const title = '网页消息推送demo';
    // https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/showNotification
    const options = {
      body: content || '网页本地通知',
      icon: image || `${window.location.href}1.png`,
      actions: [{
        action: 'github',
        title: 'github'
      }]
    }
    registration.showNotification(title, options);
  }

  // 触发推送服务通知
  pushDom.onclick = async () => {
    const content = contentDom.value;
    const image = imageDom.value;
    const response = await fetch('/push', {
      method: 'post',
      body: JSON.stringify({content, image}),
      headers: {
        'content-type': 'application/json'
      },
      credentials: 'same-origin'
    }).then(res => res.json());
    if (response.retcode === 0) {
      console.log('服务器消息推送成功');
    } else {
      console.log(response.msg)
    }
  }
}

window.onload = min();
