'use strict';

const crypto = require('crypto');
const { v4 } = require('uuid');
// 默认头像
const defaultAvatar = 'https://p1-bk.byteimg.com/tos-cn-i-mlhdmxsy5m/479e4754b1fe464a9cf49549fa2f802e~tplv-mlhdmxsy5m-q75:0:0.image';
const Controller = require('egg').Controller;

// 创建一个工具函数 加密
function enCryptData(data, key, algorithm) {
  if (!crypto.getHashes().includes(algorithm)) {
    throw new Error('不支持此哈希函数');
  }
  const hmac = crypto.createHmac(algorithm, key);
  hmac.update(data);
  return hmac.digest('hex');
}
const key = v4();

class UserController extends Controller {
  async register() {
    const { ctx } = this;
    const { username, password } = ctx.request.body; // 获取注册时候的所需要的参数
    if (!username || !password) {
      ctx.body = {
        code: 500,
        msg: '账号密码不能为空',
        data: null,
      };
      return;
    }
    // 验证数据库内是否存在同名用户
    const userInfo = await ctx.service.user.getUserByName(username); // 获取用户信息
    if (userInfo && userInfo.id) {
      ctx.body = {
        code: 500,
        msg: '账户名已被注册， 请重新输入',
        data: null,
      };
      return;
    }
    // 注册，将数据存入数据库
    const enPassword = enCryptData(ctx.request.body.password, key, 'sha256');
    const result = await ctx.service.user.register({
      username,
      password: enPassword,
      signature: 'eternal~',
      avatar: defaultAvatar,
      ctime: Math.ceil(new Date().getTime() / 1000),
    });
    if (result) {
      ctx.body = {
        code: 200,
        msg: '注册成功',
        data: null,
      };
    } else {
      ctx.body = {
        code: 500,
        msg: '注册失败',
        data: null,
      };
    }
  }
  async login() {
    const { ctx, app } = this;
    const { username, password } = ctx.request.body;
    const userInfo = await ctx.service.user.getUserByName(username); // 获取用户信息
    if (!userInfo && !userInfo.id) {
      ctx.body = {
        code: 500,
        msg: '账号不存在',
        data: null,
      };
      return;
    }
    const enPassword = enCryptData(password, key, 'sha256');
    if (userInfo && enPassword !== userInfo.password) {
      ctx.body = {
        code: 500,
        msg: '账号或密码错误',
        data: null,
      };
      return;
    }
    // 可以通过app.xxx的方式获取config/plugin.js内的插件
    // 通过app.config.xxx获取到config/default.config.js的属性
    // 生成token加盐
    // app.jwt.sign 方法接受两个参数， 第一个为对象， 对象内是需要加密的内容； 第二个是加密字符串
    const token = app.jwt.sign({
      id: userInfo.id,
      username: userInfo.username,
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // token有效期为24小时
    }, app.config.jwt.secret);
    ctx.body = {
      code: 200,
      msg: '登录成功',
      data: {
        token,
      },
    };
  }
}

module.exports = UserController;
