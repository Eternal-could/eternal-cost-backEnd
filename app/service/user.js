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
}

module.exports = UserService;
