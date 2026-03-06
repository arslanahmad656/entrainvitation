"use strict";

const dotenv = require("dotenv");

const { loadConfig } = require("../src/config/env");
const { createSequelize } = require("../src/config/database");
const { initModels } = require("../src/database/models");
const { runMigrations } = require("../src/database/migrator");

async function main() {
  dotenv.config();

  const config = loadConfig();
  const sequelize = createSequelize(config.db, config.logging.sql ? console.log : false);
  initModels(sequelize);

  try {
    await sequelize.authenticate();
    await runMigrations(sequelize);
  } finally {
    await sequelize.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
