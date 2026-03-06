"use strict";

const { Sequelize } = require("sequelize");
const tedious = require("tedious");

function createSequelize(dbConfig, logging = false) {
  if (dbConfig.dialect === "sqlite") {
    return new Sequelize({
      dialect: "sqlite",
      storage: dbConfig.storage || ":memory:",
      logging
    });
  }

  return new Sequelize(dbConfig.name, dbConfig.user, dbConfig.password, {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: "mssql",
    dialectModule: tedious,
    logging,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    dialectOptions: {
      options: {
        encrypt: dbConfig.encrypt,
        trustServerCertificate: !dbConfig.encrypt,
        enableArithAbort: true
      }
    }
  });
}

module.exports = {
  createSequelize
};
