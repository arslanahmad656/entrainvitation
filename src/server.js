"use strict";

const dotenv = require("dotenv");

const { createApp } = require("./app");
const { createContainer } = require("./config/container");
const { loadConfig } = require("./config/env");

async function startServer() {
  dotenv.config();

  const config = loadConfig();
  const container = createContainer({ config });

  await Promise.all([
    container.sequelize.authenticate(),
    container.tokenValidator.initialize()
  ]);

  const app = createApp(container);
  const server = app.listen(config.server.port, () => {
    container.logger.info("Server started", {
      port: config.server.port
    });
  });

  async function shutdown(signal) {
    container.logger.info("Shutting down server", { signal });
    server.close(async () => {
      await container.sequelize.close();
      process.exit(0);
    });
  }

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

startServer().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
