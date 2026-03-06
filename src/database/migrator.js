"use strict";

const path = require("path");
const { Sequelize } = require("sequelize");
const { Umzug, SequelizeStorage } = require("umzug");

function createMigrator(sequelize) {
  const migrationGlob = path.resolve(__dirname, "../../migrations/*.js").replace(/\\/g, "/");

  return new Umzug({
    migrations: {
      glob: migrationGlob,
      resolve(params) {
        const migration = require(params.path);
        return {
          name: params.name,
          up: async () => migration.up(params.context, Sequelize),
          down: async () => migration.down(params.context, Sequelize)
        };
      }
    },
    context: sequelize.getQueryInterface(),
    storage: new SequelizeStorage({ sequelize }),
    logger: undefined
  });
}

async function runMigrations(sequelize) {
  const migrator = createMigrator(sequelize);
  await migrator.up();
  return migrator;
}

module.exports = {
  createMigrator,
  runMigrations
};
