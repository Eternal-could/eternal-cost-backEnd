'use strict';

// 中间件默认抛出一个函数， 返回一个异步方法 jwtErr
// 有两个参数 ctx 可以获取到全局对象app
module.exports = secret => {
  return async function jwtErr(ctx, next) {
    // 看看有没有token
    const token = ctx.request.header.authorization;
    let decode;
    if (token !== 'null' && token) {
      try {
        // 解密
        decode = ctx.app.jwt.verify(token, secret);
        // 执行next时， 进而执行router.js的 controller.user.test
        await next();
      } catch (e) {
        ctx.status = 200;
        ctx.body = {
          msg: 'token已过期，请重新登录',
          code: 401,
        };
        return;
      }
    } else {
      ctx.status = 200;
      ctx.body = {
        code: 401,
        msg: 'token不存在',
      };
      return;
    }
  };
};
