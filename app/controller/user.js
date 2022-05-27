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
    console.log('userInfo', userInfo);
    if (userInfo && userInfo.id) {
      ctx.body = {
        code: 500,
        msg: '账户名已被注册， 请重新输入',
        data: null,
      };
      return;
    }
    // 注册，将数据存入数据库
    const key = v4();
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
}

module.exports = UserController;
