'use strict';
const moment = require('moment');

const Controller = require('egg').Controller;

class BillController extends Controller {
  async add() {
    const { ctx, app } = this;
    // 获取请求过来的参数
    const { amount, type_id, type_name, date, pay_type, remark = '' } = ctx.request.body;

    // 判断是否为空， 前端需要做一次判断， 后端也需要做一层判断
    if (!amount || !type_id || !type_name || !date || !pay_type) {
      ctx.body = {
        code: 400,
        msg: '参数错误',
        data: null,
      };
      return;
    }

    try {
      let user_id;
      const token = ctx.request.header.authorization;
      const decode = app.jwt.verify(token, app.config.jwt.secret);
      if (!decode) return;
      user_id = decode.id;
      // user_id 默认添加到每个账单项， 作为后续获取指定用户账单的标志
      // 可以理解为： 我登录A账户， 那么所有操作都要加上A账户的id，后续获取的时候，就过滤出 A 账户 id 的账单信息。
      const result = await ctx.service.bill.add({
        amount,
        type_id,
        type_name,
        date,
        pay_type,
        remark,
        user_id,
      });
      ctx.body = {
        code: 200,
        msg: '请求成功',
        data: null,
      };
    } catch (e) {
      ctx.body = {
        code: 500,
        msg: '系统错误',
        data: null,
      };
    }
  }

  // 处理账单数据列表
  async list() {
    const { ctx, app } = this;
    // 获取，日期 date，分页数据，类型 type_id，这些都是我们在前端传给后端的数据
    const { date, page = 1, page_size = 5, type_id = 'all' } = ctx.query;

    try {
      let user_id;
      const token = ctx.request.header.authorization;
      const decode = app.jwt.verify(token, app.config.jwt.secret);
      if (!decode) return;
      user_id = decode.id;
      // 拿到当前用户的账单列表
      const list = await ctx.service.bill.list(user_id);
      // 过滤出月份和类型所对应的账单列表
      const _list = list.filter(item => {
        if (type_id !== 'all') {
          return moment(Number(item.date))
            .format('YYYY-MM') === date && type_id === item.type_id;
        }
        return moment(Number(item.date))
          .format('YYYY-MM') === date;
      });
      // 格式化数据， 将其变成我们之前设置好的对象格式
      let listMap = _list.reduce((current, item) => {
        // current 默认初始值是一个空的数组【】
        // 把第一个账单项的时间格式化为： YYYY-MM-DD
        const date = moment(Number(item.date))
          .format('YYYY-MM_DD');
        // 如果能在累加的数组中找到当前项日期 date，那么在数组中的加入当前项到 bills 数组。
        if (current && current.length && current.findIndex(item => item.date === date) > -1) {
          const index = current.findIndex(item => item.date === date);
          console.log('index是：', index);
          current[index].bills.push(item);
        }
        // 如果在累加的数组中找不到当前项日期的，那么再新建一项。
        if (current && current.length && current.findIndex(item => item.date === date) === -1) {
          current.push({
            date,
            bills: [ item ],
          });
        }
        // 如果 current 为空数组，则默认添加第一个账单项 item ，格式化为下列模式
        if (!current.length) {
          current.push({
            date,
            bills: [ item ],
          });
        }
        return current;
      }, [])
        .sort((a, b) => moment(b.date) - moment(a.date)); // 时间顺序为倒叙，时间新的，在越上面

      // 分页处理，listMap 为我们格式化后的全部数据，还未分页。
      const filterListMap = listMap.slice((page - 1) * page_size, page * page_size);
      // 计算当月总收入和支出
      // 首先获取当月所有账单列表
      let __list = list.filter(item => moment(Number(item.date))
        .format('YYYY-MM') === date);
      // 累加计算支出
      let totalExpense = __list.reduce((current, item) => {
        if (item.pay_type === 1) {
          current += Number(item.amount);
          return current;
        }
        return current;
      }, 0);
      // 累加计算收入
      let totalIncome = __list.reduce((current, item) => {
        if (item.pay_type === 2) {
          current += Number(item.amount);
          return current;
        }
        return current;
      }, 0);
      ctx.body = {
        code: 200,
        msg: '请求成功',
        data: {
          totalExpense, // 当月支出
          totalIncome, // 当月收入
          totalPage: Math.ceil(listMap.length / page_size), // 总分页
          list: filterListMap || [], // 格式化后，并且经过分页处理的数据
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

  // 获取账单详情
  async detail() {
    const { ctx, app } = this;
    const { id = '' } = ctx.query;
    let user_id;
    const token = ctx.request.header.authorization;
    // 获取当前用户信息
    const decode = await app.jwt.verify(token, app.config.jwt.secret);
    if (!decode) return;
    user_id = decode.id;
    // 判断是否传入账单 id
    if (!id) {
      ctx.body = {
        code: 500,
        msg: '订单id不能为空',
        data: null,
      };
      return;
    }
    try {
      // 从数据库获取账单详情
      const detail = await ctx.service.bill.detail(id, user_id);
      ctx.body = {
        code: 200,
        msg: '请求成功',
        data: detail,
      };
    } catch (e) {
      ctx.body = {
        code: 500,
        msg: '系统错误',
        data: null,
      };
    }
  }

  // 账单更新
  async update() {
    const { ctx, app } = this;
    // 账单的相关参数，这里注意要把账单的 id 也传进来
    const { id, amount, type_id, type_name, date, pay_type, remark = '' } = ctx.request.body;
    // 判空处理
    if (!amount || !type_id || !type_name || !date || !pay_type) {
      ctx.body = {
        code: 400,
        msg: '参数错误',
        data: null,
      };
    }
    try {
      let user_id;
      const token = ctx.request.header.authorization;
      const decode = await app.jwt.verify(token, app.config.jwt.secret);
      if (!decode) return;
      user_id = decode.id;
      // 根据账单 id 和 user_id，修改账单数据
      const result = await ctx.service.bill.update({
        id, // 账单 id
        amount, // 金额
        type_id, // 消费类型 id
        type_name, // 消费类型名称
        date, // 日期
        pay_type, // 消费类型
        remark, // 备注
        user_id, // 用户 id
      });
      ctx.body = {
        code: 200,
        msg: '请求成功',
        data: null,
      };
    } catch (e) {
      ctx.body = {
        code: 500,
        msg: '系统错误',
        data: null,
      };
    }
  }

  // 删除账单
  async delete() {
    const { ctx, app } = this;
    const { id } = ctx.request.body;
    if (!id) {
      ctx.body = {
        code: 400,
        msg: '参数错误',
        data: null,
      };
    }
    try {
      let user_id;
      const token = ctx.request.header.authorization;
      const decode = app.jwt.verify(token, app.config.jwt.secret);
      if (!decode) return;
      user_id = decode.id;
      const result = await ctx.service.bill.delete(id, user_id);
      ctx.body = {
        code: 200,
        msg: '删除成功',
        data: null,
      };
    } catch (e) {
      ctx.body = {
        code: 500,
        msg: '系统错误',
        data: null,
      };
    }
  }

  // 获取账单表的相关数据
  async getBillData() {
    const { ctx, app } = this;
    const { date = '' } = ctx.query;
    let user_id;
    const token = ctx.request.header.authorization;
    const decode = app.jwt.verify(token, app.config.jwt.secret);
    if (!decode) return;
    user_id = decode.id;
    if (!date) {
      ctx.body = {
        code: 400,
        msg: '参数错误',
        data: null,
      };
      return;
    }
    try {
      // 获取账单表中的账单数据
      const result = await ctx.service.bill.list(user_id);
      // 根据时间参数，筛选出当月所有的账单数据
      const start = moment(date)
        .startOf('month')
        .unix() * 1000; // 选择月份，月初时间
      const end = moment(date)
        .endOf('month')
        .unix() * 1000; // 选择月份，月末时间
      const _data = result.filter(item => (Number(item.date) > start && Number(item.date) < end));
      // 总支出
      const total_expense = _data.reduce((arr, current) => {
        if (current.pay_type === 1) {
          arr += Number(current.amount);
        }
        return arr;
      }, 0);
      // 总收入
      const total_income = _data.reduce((arr, current) => {
        if (current.pay_type === 2) {
          arr += Number(current.amount);
        }
        return arr;
      }, 0);
      // 获取收支构成
      let total_data = _data.reduce((arr, current) => {
        // 通过 findIndex 方法，查找 arr 内，
        // 有无和当前项 cur 相同类型的账单，比如学习、餐饮、交通等等。
        const index = arr.findIndex(item => item.type_id === current.type_id);
        // 没有找到 那么 通过 arr.push 新增一个类型的数据
        if (index === -1) {
          arr.push({
            type_id: current.type_id,
            type_name: current.type_name,
            pay_type: current.pay_type,
            number: Number(current.amount),
          });
        }
        // 找到了相同的消费类型 那么就消费累加
        if (index > -1) {
          arr[index].number += Number(current.amount);
        }
        return arr;
      }, []);

      total_data = total_data.map(item => {
        // 最后，将所有的 number 数据保留两位小数，并且将数据返回。
        item.number = Number(Number(item.number)
          .toFixed(2));
        return item;
      });

      ctx.body = {
        code: 200,
        msg: '请求成功',
        data: {
          total_expense: Number(total_expense)
            .toFixed(2),
          total_income: Number(total_income)
            .toFixed(2),
          total_data: total_data || [],
        },
      };
    } catch (e) {
      //
    }
  }

  async data() {
    const { ctx, app } = this;
    const { date = '' } = ctx.query;
    // 获取用户 user_id
    let user_id;
    const token = ctx.request.header.authorization;
    const decode = await app.jwt.verify(token, app.config.jwt.secret);
    if (!decode) return;
    user_id = decode.id;

    if (!date) {
      ctx.body = {
        code: 400,
        msg: '参数错误',
        data: null,
      };
      return;
    }
    try {
      const result = await ctx.service.bill.list(user_id);
      const start = moment(date)
        .startOf('month')
        .unix() * 1000; // 选择月份，月初时间
      const end = moment(date)
        .endOf('month')
        .unix() * 1000; // 选择月份，月末时间
      const _data = result.filter(item => {
        if (Number(item.date) > start && Number(item.date) < end) {
          return item;
        }
      });

      // 总支出
      const total_expense = _data.reduce((arr, cur) => {
        if (cur.pay_type === 1) {
          arr += Number(cur.amount);
        }
        return arr;
      }, 0);

      // 总收入
      const total_income = _data.reduce((arr, cur) => {
        if (cur.pay_type === 2) {
          arr += Number(cur.amount);
        }
        return arr;
      }, 0);

      // 获取收支构成
      let total_data = _data.reduce((arr, cur) => {
        const index = arr.findIndex(item => item.type_id === cur.type_id);
        if (index === -1) {
          arr.push({
            type_id: cur.type_id,
            type_name: cur.type_name,
            pay_type: cur.pay_type,
            number: Number(cur.amount)
          });
        }
        if (index > -1) {
          arr[index].number += Number(cur.amount);
        }
        return arr;
      }, []);

      total_data = total_data.map(item => {
        item.number = Number(Number(item.number)
          .toFixed(2));
        return item;
      });

      // 柱状图数据
      // let bar_data = _data.reduce((curr, arr) => {
      //   const index = curr.findIndex(item => item.date == moment(Number(arr.date)).format('YYYY-MM-DD'))
      //   if (index == -1) {
      //     curr.push({
      //       pay_type: arr.pay_type,
      //       date: moment(Number(arr.date)).format('YYYY-MM-DD'),
      //       number: Number(arr.amount)
      //     })
      //   }
      //   if (index > -1) {
      //     curr[index].number += Number(arr.amount)
      //   }

      //   return curr
      // }, [])

      // bar_data = bar_data.sort((a, b) => moment(a.date).unix() - moment(b.date).unix()).map((item) => {
      //   item.number = Number(item.number).toFixed(2)
      //   return item
      // })

      ctx.body = {
        code: 200,
        msg: '请求成功',
        data: {
          total_expense: Number(total_expense)
            .toFixed(2),
          total_income: Number(total_income)
            .toFixed(2),
          total_data: total_data || [],
          // bar_data: bar_data || []
        },
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

module.exports = BillController;
