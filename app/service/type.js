'use strict';

const Service = require('egg').Service;

class TypeService extends Service {
  async list(id) {
    const { app } = this;
    const QUERY_STR = 'id, name, type, user_id';
    let sql = `select ${QUERY_STR} from type where user_id = 0 or user_id = ${id}`;
    try {
      const result = await app.mysql.query(sql);
      return result;
    } catch (e) {
      console.log(e);
      return null;
    }
  }
}
module.exports = TypeService;
