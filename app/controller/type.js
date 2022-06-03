'use strict';

const Controller = require('egg').Controller;

class TypeController extends Controller {
  async list() {
    const { ctx, app } = this;
    let user_id;
    const token = ctx.request.header.authorization;
    // 获取当前用户信息
    const decode = app.jwt.verify(token, app.config.jwt.secret);
    if (!decode) return;
    user_id = decode.id;
    try {
      const list = await ctx.service.type.list(user_id);
      ctx.body = {
        code: 200,
        msg: '请求成功',
        data: {
          list,
        },
      };
    } catch (e) {
      ctx.body = {
        code: 500,
        msg: '系统错误',
        data: null,
      };
    }
  }
}

module.exports = TypeController;
