  
const Koa = require('koa');
const Router = require('koa-router');
const serve = require('koa-static');
const session = require('koa-session');
const bodyParser = require('koa-bodyparser');
const webPush = require('web-push');
const { resolveTxt } = require('dns');

const port = '7001';
const app = new Koa();
const sessionConfig = {
  key: 'news_push',
  maxAge: 86400000,
  autoCommit: true,
  overwrite: true,
  httpOnly: true,
  signed: true,
  rolling: false,
  renew: false,
  secure: false,
  encode: (json) => JSON.stringify(json), // 自定义cookie编码函数
  decode: (str) => JSON.parse(str),
};

// secret
app.keys = ['news push demo'];

// session
app.use(session(sessionConfig, app));

// 静态资源
app.use(serve(__dirname + '/public'));

// 请求内容解析
app.use(bodyParser());

// 路由
const router = new Router();
app.use(router.routes());
// 业务服务器存放用户浏览器的订阅信息
router.post('/subscript', async (ctx, next) => {
	ctx.session.subscription = ctx.request.body;
	ctx.body = {
		retcode: 0,
		msg: 'success'
	};
	console.log('信息存入', ctx.request.body);
});

/**
 * @desc 向浏览器推送服务推送通知
 * @desc 工具：web-push
 */
const options = {
	// proxy: '', 
};
// VAPID
const vapidKeys = {
	publicKey: 'BEfibeblQcaa3wzDyGSPddFreazGqDZHDNa2jsfXRn-ni_SO2-jb_1NDJHE8tvRHEzvtujXXijZzGBQNbbMBvZI',
	privateKey: 'YxDDrS1lnZZ0xAkp5YsCr2yOTIIQeXp9ayJukRCf8Aw'
};
webPush.setVapidDetails(
	'mailto:1499685546@qq.com', // 开发者邮箱
	vapidKeys.publicKey,
	vapidKeys.privateKey
);
router.post('/push', async (ctx, next) => {
	const { content, image } = ctx.request.body;
	const { subscription } = ctx.session;

	if (!subscription) return ctx.body = { retcode: 1, msg: '客户端尚未上传浏览器订阅信息'};
	const pushDate = {
		content,
		image
	};
	const result = await webPush.sendNotification(subscription, JSON.stringify(pushDate), options).catch(err => {
		if (err.statusCode === 404 || err.statusCode === 410) {
			ctx.session.subscription = '';
			return {
				retcode: 1,
				msg: '浏览器订阅信息无效'
			};
		} else {
			console.log(err)
			return {
				retcode: 1,
				msg: JSON.stringify(err)
			};
		}
	});
	console.log(result)
	if (result.retcode) return ctx.body = result;
	ctx.body = {
		retcode: 0,
		msg: 'success'
	};
});

// 服务启动
app.listen(port);
console.log(`server listen at http://127.0.0.1:${port}`);