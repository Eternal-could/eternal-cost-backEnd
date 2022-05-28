'use strict';

const Service = require('egg').Service;

class BillService extends Service {
  async add(params) {
    const { app } = this;
    try {
      const result = await app.mysql.insert('bill', {
        ...params,
      });
      return result;
    } catch (e) {
      console.log(e);
      return null;
    }
  }
}

module.exports = BillService;
