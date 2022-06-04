'use strict';

const crypto = require('crypto');
const { v4 } = require('uuid');
// 默认头像
const defaultAvatar = 'https://p1-bk.byteimg.com/tos-cn-i-mlhdmxsy5m/479e4754b1fe464a9cf49549fa2f802e~tplv-mlhdmxsy5m-q75:0:0.image';
const Controller = require('egg').Controller;

// 创建一个工具函数 加密
function enCryptData(data, key, algorithm) {
  if (!crypto.getHashes()
    .includes(algorithm)) {
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
      key,
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
    const dePassword = enCryptData(password, userInfo.key, 'sha256');
    if (userInfo && userInfo.password !== dePassword) {
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

  // 验证，服务端解析token
  async test() {
    const { ctx, app } = this;
    const token = ctx.request.header.authorization;
    const decode = app.jwt.verify(token, app.config.jwt.secret);
    ctx.body = {
      code: 200,
      msg: '获取token成功',
      data: {
        ...decode,
      },
    };
  }

  // 获取用户信息
  async getUserInfo() {
    const { ctx, app } = this;
    const token = ctx.request.header.authorization;
    // 通过app.jwt.verify 方法， 解析出token内的用户信息
    const decode = app.jwt.verify(token, app.config.jwt.secret);
    // 通过 getUserByName 方法，以用户名 decode.username 为参数，从数据库获取到该用户名下的相关信息
    const userInfo = await ctx.service.user.getUserByName(decode.username);
    // userInfo 中应该有密码信息，所以我们指定下面四项返回给客户端
    ctx.body = {
      code: 200,
      msg: '请求成功',
      data: {
        id: userInfo.id,
        username: userInfo.username,
        signature: userInfo.signature || '',
        avatar: userInfo.avatar || defaultAvatar,
      },
    };
  }

  // 修改用户信息
  async editUserInfo() {
    const { ctx, app } = this;
    // 通过post请求 在请求体中获取签名
    const { signature = '', avatar = '' } = ctx.request.body;

    try {
      let user_id;
      const token = ctx.request.header.authorization;
      const decode = app.jwt.verify(token, app.config.jwt.secret);
      if (!decode) return;
      user_id = decode.id;
      // 通过 username 查找 userInfo 的完整信息
      const userInfo = await ctx.service.user.getUserByName(decode.username);
      // 通过 service 方法 editUserInfo 修改 signature 的信息
      const result = await ctx.service.user.editUserInfo({
        ...userInfo,
        signature,
        avatar,
      });
      ctx.body = {
        code: 200,
        msg: '请求成功',
        data: {
          id: user_id,
          signature,
          username: userInfo.username,
          avatar,
        },
      };
    } catch (e) {
      //
    }
  }

  // 修改密码
  async modifyPass() {
    const { ctx, app } = this;
    const { old_pass = '', new_pass = '', new_pass2 = '' } = ctx.request.body;

    try {
      let user_id;
      const token = ctx.request.header.authorization;
      const decode = app.jwt.verify(token, app.config.jwt.secret);
      if (!decode) return;
      if (decode.username === 'admin') {
        ctx.body = {
          code: 400,
          msg: '管理员账户，不允许修改密码！',
          data: null,
        };
        return;
      }
      user_id = decode.id;
      const userInfo = await ctx.service.user.getUserByName(decode.username);

      if (old_pass !== userInfo.password) {
        ctx.body = {
          code: 400,
          msg: '原密码错误',
          data: null,
        };
        return;
      }

      if (new_pass !== new_pass2) {
        ctx.body = {
          code: 400,
          msg: '新密码不一致',
          data: null,
        };
        return;
      }

      const result = await ctx.service.user.modifyPass({
        ...userInfo,
        password: new_pass,
      });

      ctx.body = {
        code: 200,
        msg: '请求成功',
        data: null,
      };
    } catch (error) {
      ctx.body = {
        code: 500,
        msg: '系统错误',
        data: null,
      };
    }
  }
}

module.exports = UserController;
