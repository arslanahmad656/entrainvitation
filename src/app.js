"use strict";

const express = require("express");
const helmet = require("helmet");

const { buildAdminRoutes } = require("./routes/adminRoutes");
const { buildHealthRoutes } = require("./routes/healthRoutes");
const { buildMeRoutes } = require("./routes/meRoutes");
const { createAuthMiddleware } = require("./middleware/authMiddleware");
const { correlationIdMiddleware } = require("./middleware/correlationId");
const { createErrorHandler } = require("./middleware/errorHandler");
const { notFoundMiddleware } = require("./middleware/notFound");

function createApp(container) {
  const app = express();
  const authMiddleware = createAuthMiddleware(container.tokenValidator);

  app.use(correlationIdMiddleware);
  app.use(helmet());
  app.use(express.json());

  app.use("/health", buildHealthRoutes());
  app.use("/admin", authMiddleware, buildAdminRoutes(container));
  app.use("/me", authMiddleware, buildMeRoutes(container));

  app.use(notFoundMiddleware);
  app.use(createErrorHandler(container.logger));

  return app;
}

module.exports = {
  createApp
};
