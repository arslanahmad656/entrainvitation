"use strict";

const { Sequelize } = require("sequelize");

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
    dialect: "postgres",
    logging,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    dialectOptions: dbConfig.ssl
      ? {
          ssl: {
            require: true,
            rejectUnauthorized: dbConfig.sslRejectUnauthorized
          }
        }
      : {}
  });
}

module.exports = {
  createSequelize
};
