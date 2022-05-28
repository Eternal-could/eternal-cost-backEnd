/* eslint valid-jsdoc: "off" */

'use strict';

/**
 * @param {Egg.EggAppInfo} appInfo app info
 */
module.exports = appInfo => {
  /**
   * built-in config
   * @type {Egg.EggAppConfig}
   **/
  const config = exports = {};

  // use for cookie sign key, should change to your own and keep security
  config.keys = appInfo.name + '_1653555152189_9086';

  config.security = {
    csrf: {
      enable: false,
      ignoreJSON: true,
    },
    domainWhiteList: [ '*' ],
  };

  config.mysql = {
    client: {
      host: 'localhost',
      port: '3306',
      user: 'root',
      password: '2794221278A',
      database: 'eternal-cost',
    },
    app: true,
    agent: false,
  };

  config.jwt = {
    secret: 'JYuChengXan',
  };
  // 采用 file 形式
  config.multipart = {
    mode: 'file',
  };
  // 跨域
  config.cors = {
    origin: '*', // 允许所有跨域访问
    credentials: true, // 允许Cookie跨域
    allowMethods: 'GET,HEAD,PUT,POST,DELETE,PATCH',
  };
  // add your middleware config here
  config.middleware = [];

  // add your user config here
  const userConfig = {
    // myAppName: 'egg',
    uploadDir: 'app/public/upload',
  };
  return {
    ...config,
    ...userConfig,
  };
};
