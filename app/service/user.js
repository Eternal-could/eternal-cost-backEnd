'use strict';

const Service = require('egg').Service;

class UserService extends Service {
  async getUserByName(username) {
    const { app } = this;
    try {
      const result = await app.mysql.get('user', { username });
      return result;
    } catch (e) {
      console.log(e);
      return null;
    }
  }
  // 注册
  async register(params) {
    const { app } = this;
    try {
      const result = await app.mysql.insert('user', { ...params });
      return result;
    } catch (e) {
      console.log(e);
      return null;
    }
  }
  // 修改用户信息
  async editUserInfo(params) {
    const { app } = this;
    try {
      // 更新数据库的表中字段内容
      let result = await app.mysql.update('user', {
        ...params,
      }, {
        id: params.id, // 筛选出 id 等于 params.id 的用户
      });
      return result;
    } catch (e) {
      console.log(e);
      return null;
    }
  }
}

module.exports = UserService;
