# 网页消息推送
浏览器允许业务服务向用户客户端推送消息，客户端收到推送消息后以通知的形式展示出来。业务运营人员可以通过这项功能定向给用户推送推荐消息或者重要通知，用于提升用户留存和用户使用时长。

下文demo全部代码可以在[news-push-example](https://github.com/duanyuanping/news-push-example)中看到。

## 简述
消息推送效果如下（当用户没有打开业务网站时，业务网站也能正常通知，在最终效果中有展示）：  
![推送效果]()

网页消息推送流程图如下所示：  
![消息推送流程](https://nowpic.gtimg.com/hy_personal_room/0/now_acticity1595748121726.png/0)

整个过程主要可以分成订阅和推送这两部分，参与的角色主要有浏览器、浏览器推送服务、业务服务，下图可以看到这三者之间的关系（图片出自[Web Push草案](https://tools.ietf.org/html/draft-ietf-webpush-protocol-12)）
```
    +-------+           +--------------+       +-------------+
    |  UA   |           | Push Service |       | Application |
    +-------+           +--------------+       |   Server    |
        |                      |               +-------------+
        |      Subscribe       |                      |
        |--------------------->|                      |
        |       Monitor        |                      |
        |<====================>|                      |
        |                      |                      |
        |          Distribute Push Resource           |
        |-------------------------------------------->|
        |                      |                      |
        :                      :                      :
        |                      |    Push Message(1)   |
        |   Push Message(2)    |<---------------------|
        |<---------------------|                      |
        |                      |                      |
```
> 注：  
> UA：浏览器客户端  
> Push Service：浏览器推送服务。不同浏览器厂商会部署自己的推送服务。  
> Application Server：业务服务。主要用于存放用户客户端订阅信息和向push service推送消息两部分工作。

订阅流程：
- Subscribe：浏览器向push service发起推送订阅，获得订阅信息。
- Monitor：push service存放订阅信息，后面会使用订阅信息向特定浏览器下发通知。
- Distribute Push Resource：浏览器将从push service获取到的订阅信息发给业务服务，业务服务将订阅信息和用户信息绑定存放起来。

推送流程：
- Push Message(1)：业务服务使用[Web推送协议](https://tools.ietf.org/html/draft-ietf-webpush-protocol-12)将通知内容推送给push service。
- Push Message(2)：push servicee将通知内容下发给用户浏览器。

## 订阅

订阅主要任务如下图所示（图片来自[How JavaScript works: the mechanics of Web Push Notifications](https://blog.sessionstack.com/how-javascript-works-the-mechanics-of-web-push-notifications-290176c5c55d)）  
![订阅流程任务](https://user-gold-cdn.xitu.io/2018/5/19/1637899de9b10266?imageView2/0/w/1280/h/960/format/webp/ignore-error/1)

1. 网页获取通知授权
2. 获得在推送服务中的订阅信息
3. 将订阅信息存放到业务服务中

### 网页获取通知授权
通过调用[Notification.requestPermission()](https://developer.mozilla.org/en-US/docs/Web/API/Notification/requestPermission)接口来拉起授权申请，授权申请的效果如下所示（每个浏览器效果都不太一样，这里主要展示chrome的效果）：  
![申请通知效果](https://nowpic.gtimg.com/hy_personal_room/0/now_acticity1595748265931.png/0)

代码展示如下：  
![askPermission](https://nowpic.gtimg.com/hy_personal_room/0/now_acticity1595748194866.png/0)

`Notification.requestPermission()`接口执行会返回授权结果，主要有`granted`（已授权）、`denied`（被拒绝）、`default`（被关闭）这3中状态。只有当授权结果为`granted`时，当前网页才能进行后面订阅推送服务和通知消息这两个步骤。
> 注意：只有在用户没有授权或者拒绝的情况下，浏览器才会拉起授权面板。

### 注册service work、订阅推送服务
通过调用service work（后面都统一叫sw）注册对象上的订阅api来实现订阅推送服务，因此注册sw任务需要在订阅推送服务前执行。

#### 注册service work
通过调用[navigator.serviceWorker.register()](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerContainer/register)接口来注册sw，代码展示如下：  
![registSW](https://nowpic.gtimg.com/hy_personal_room/0/now_acticity1595749980558.png/0)  
`navigator.serviceWorker.register()`调用时，需要传入一个运行在服务工作线程（service work）的js文件。  
调用navigator.serviceWorker.register()会返回一个promise对象，我们可以在then链路中获得sw注册对象（registration）。

#### 订阅推送服务
通过调用[registration.pushManager.subscribe()](https://developer.mozilla.org/en-US/docs/Web/API/PushManager/subscribe)获取订阅信息。

在开始订阅推送服务前，我们需要确认以下两个任务是否完成：
1. 用户已经授权网页通知
2. sw注册成功

1和2两个条件之间没有任何限制，这里使用`Promise.all`来让任务1和2并行，提升一点效率，代码展示如下：  
![subscript](https://nowpic.gtimg.com/hy_personal_room/0/now_acticity1595754025853.png/0)

`registration.pushManager.subscribe()`调用时需要传入了`userVisibleOnly`和`applicationServerKey`这两个参数
- userVisibleOnly：浏览器是否以通知的形式展示push service下发的推送消息，这里必须传true。
- applicationServerKey：包含base64编码的公钥（publickKey）的DOMString或者ArrayBuffer。公钥（publickKey）可以在[web-push-codelab](https://web-push-codelab.glitch.me/)网页中获取，也可以使用[web-push npm](https://www.npmjs.com/package/web-push)工具快速生成，同时需要把私钥也记下来，后面`push message`步骤需要用到。 

registration.pushManager.subscribe()会返回一个promise对象，我们可以在then链路中获得订阅信息，订阅信息中主要有`endpoint`和`keys`这两部分内容：
- endpoint：推送服务链接，需要使用post方式请求该链接。
- keys：用于加密推送的消息内容，防止消息内容被三方窃取。

> 注意：谷歌浏览器推送服务是FCM服务（国内被墙），使用谷歌时，需要先翻墙，然后再调用registration.pushManager.subscribe api，这样才能成功订阅推送服务。

### 订阅信息存放
前端拿到订阅信息以后，将订阅请求传给业务后端，业务后端得到订阅信息以后，将订阅信息和用户关联起来，等到需要向用户推送消息的时候再提取该用户对应的订阅信息。

## 推送
推送的主要流程如下图所示（图片来自[How JavaScript works: the mechanics of Web Push Notifications](https://blog.sessionstack.com/how-javascript-works-the-mechanics-of-web-push-notifications-290176c5c55d)）：  
![](https://user-gold-cdn.xitu.io/2018/5/19/1637899daa2e1950?imageView2/0/w/1280/h/960/format/webp/ignore-error/1)
1. 业务服务向push service推送消息
2. push service向浏览器推送消息
3. 浏览器展示消息

### 推送消息
当业务方需要向用户推送通知时，业务服务需要从数据库中取出用户的订阅信息，然后带着消息内容去请求订阅信息中的推送服务链接。请求推送服务时必须依据[Web推送协议](https://tools.ietf.org/html/draft-ietf-webpush-protocol-12)，node应用中可以使用[web-push](https://github.com/web-push-libs/web-push#readme)工具帮助我们快速实现请求推送服务功能，代码如下：  
![push](https://nowpic.gtimg.com/hy_personal_room/0/now_acticity1595759947448.png/0)
实现流程：
- 给`web-push`工具设置`VAPID keys`。
- 读取服务器中存放的订阅信息。订阅信息中有`endpoint`、`key`。
- 生成推送消息内容`pushData`、生成`web-push`配置`options`信息。
  - 推送消息内容必须是一个没有特殊字符的字符串或者是一个buffer对象，如果想传输json数据，可以将json数据转成buffer对象后再传输
  - options中的`proxy`字段是请求推送服务（谷歌、火狐的消息推送服务是被墙了的）时设置的代理（如果业务服务部署在大陆以外，就可以不用设置代理），其他参数可以在[web-push](https://github.com/web-push-libs/web-push#readme)中看到详解
- 调用`webPush.sendNotification()`向push service推送消息

> 注意：由于谷歌和火狐消息推送服务被墙了，我们可以在使用web-push工具推送消息时设置proxy参数来进行请求代理，也可以将业务服务部署在大陆以外。

### 浏览器通知
push service根据业务服务推送过来的客户端订阅信息，获取到具体的用户浏览器客户端后，将消息下发给浏览器，浏览器将消息解密以后，会去触发相应的service work的push事件，此时只要sw文件中监听push事件，就能够获取到业务服务端推送的消息内容。监听push代码展示如下：  
![push-listener](https://nowpic.gtimg.com/hy_personal_room/0/now_acticity1595763915529.png/0)  
service work中通过调用`self.registration.showNotification()`函数拉起浏览器通知，代码中`showNotification`函数调用传参与通知UI的对应关系如下面两张图所示（更多参数可以在[showNotification mdn](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/showNotification)中看到）：
![](https://nowpic.gtimg.com/hy_personal_room/0/now_acticity1595764251465.png/0)
![](https://nowpic.gtimg.com/hy_personal_room/0/now_acticity1595764245871.png/0)

当用户点击通知时，会触发sw中的`notificationclick`事件，同时，浏览器会将之前设置的action值一并传入回调函数，代码展示如下：
![notificationclick](https://nowpic.gtimg.com/hy_personal_room/0/now_acticity1595764980104.png/0)

## 消息推送效果


## 结语
国内谷歌用户，如果没有翻墙，浏览器客户端将无法订阅FCM服务以及无法收到FCM服务下发的消息推送。业务服务在请求推送服务的时候，也需要设置设置代理，或者将业务服务部署到大陆外的网络。  
国内火狐用户，只要业务服务能够正常请求浏览器推送服务，那么用户浏览器客户端就能正常收到推送服务下发的消息。  
暂时测试国内的浏览器，但是据了解，国内的杀毒软件可能将浏览器通知当病毒来扫描，qq浏览器有开发推送服务但是好像没有开放出来使用。

## 参考
- [How JavaScript works: the mechanics of Web Push Notifications](https://blog.sessionstack.com/how-javascript-works-the-mechanics-of-web-push-notifications-290176c5c55d)
- [向网络应用添加推送通知](https://developers.google.com/web/fundamentals/codelabs/push-notifications?hl=zh-cn)
- [使用 Service Workers](https://developer.mozilla.org/zh-CN/docs/Web/API/Service_Worker_API/Using_Service_Workers)
- [Notification.requestPermission()](https://developer.mozilla.org/en-US/docs/Web/API/Notification/requestPermission)
- [navigator.serviceWorker.register()](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerContainer/register)
- [registration.pushManager.subscribe()](https://developer.mozilla.org/en-US/docs/Web/API/PushManager/subscribe)
- [web-push](https://github.com/web-push-libs/web-push#readme)
- [showNotification mdn](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/showNotification)
