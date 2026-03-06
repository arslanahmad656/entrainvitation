"use strict";

const path = require("path");
const dotenv = require("dotenv");

const { createApp } = require("../../src/app");
const { createContainer } = require("../../src/config/container");
const { createSequelize } = require("../../src/config/database");
const { initModels } = require("../../src/database/models");
const { runMigrations } = require("../../src/database/migrator");
const { UnauthorizedError } = require("../../src/utils/errors");

dotenv.config({
  path: process.env.TEST_ENV_FILE || path.resolve(__dirname, "../../.env.test")
});

function readBooleanEnv(value, defaultValue) {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }

  const normalized = String(value).trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["false", "0", "no", "off"].includes(normalized)) {
    return false;
  }

  return defaultValue;
}

function buildTestDbConfig(env = process.env) {
  const dialect = env.TEST_DB_DIALECT || "sqlite";

  if (dialect === "postgres") {
    return {
      dialect: "postgres",
      host: env.TEST_DB_HOST || "localhost",
      port: Number(env.TEST_DB_PORT || 5432),
      name: env.TEST_DB_NAME || "entra_login_test",
      user: env.TEST_DB_USER || "postgres",
      password: env.TEST_DB_PASSWORD || "postgres",
      ssl: readBooleanEnv(env.TEST_DB_SSL, false),
      sslRejectUnauthorized: readBooleanEnv(env.TEST_DB_SSL_REJECT_UNAUTHORIZED, true),
      storage: null
    };
  }

  return {
    dialect: "sqlite",
    host: null,
    port: 0,
    name: null,
    user: null,
    password: null,
    ssl: false,
    sslRejectUnauthorized: true,
    storage: env.TEST_DB_STORAGE || ":memory:"
  };
}

function buildTestConfig() {
  return {
    env: "test",
    server: {
      port: 0
    },
    logging: {
      level: "error",
      sql: false
    },
    db: buildTestDbConfig(),
    auth: {
      tenantId: "tenant-1",
      audience: "api://test-api",
      metadataUrl: "https://login.microsoftonline.com/test/v2.0/.well-known/openid-configuration",
      clockToleranceSeconds: 0
    },
    graph: {
      tenantId: "tenant-1",
      clientId: "graph-client-id",
      clientSecret: "graph-client-secret",
      scope: "https://graph.microsoft.com/.default",
      baseUrl: "https://graph.microsoft.com/v1.0",
      inviteRedirectUrl: "https://app.example.com/post-login",
      appClientId: "test-api-client-id",
      servicePrincipalCacheTtlMs: 300000
    }
  };
}

async function resetDatabaseState(models) {
  const modelList = Object.values(models);

  for (const model of modelList) {
    await model.destroy({
      where: {},
      truncate: true,
      force: true,
      cascade: true,
      restartIdentity: true
    });
  }
}

function buildGraphClientMock(overrides = {}) {
  const servicePrincipal = {
    id: "sp-1",
    appId: "test-api-client-id",
    appRoles: [
      { id: "role-reader-id", value: "Reader", isEnabled: true },
      { id: "role-admin-id", value: "Admin", isEnabled: true }
    ]
  };

  return {
    findUserByEmail: jest.fn().mockResolvedValue(null),
    inviteGuest: jest.fn(async (email) => ({
      id: "invite-1",
      invitedUserEmailAddress: email,
      invitedUser: { id: "graph-user-1" }
    })),
    assignAppRole: jest.fn().mockResolvedValue({ id: "assignment-1" }),
    getUserAppRoleAssignments: jest.fn().mockResolvedValue([]),
    resetGuestRedemption: jest.fn(async (identifier) => ({
      id: "reset-1",
      email: "guest@example.com",
      userId: identifier.userId || "graph-user-1"
    })),
    getServicePrincipal: jest.fn().mockResolvedValue(servicePrincipal),
    getAppRoleIdByValue: jest.fn(async (roleValue) => {
      const match = servicePrincipal.appRoles.find((role) => role.value === roleValue);
      return match ? match.id : null;
    }),
    ...overrides
  };
}

function buildSilentLogger() {
  const logger = {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    child: jest.fn()
  };

  logger.child.mockImplementation(() => logger);
  return logger;
}

function buildTokenValidatorMock(tokens = {}) {
  return {
    initialize: jest.fn().mockResolvedValue(),
    validate: jest.fn(async (token) => {
      if (!Object.prototype.hasOwnProperty.call(tokens, token)) {
        throw new UnauthorizedError("Invalid or expired bearer token");
      }

      const value = tokens[token];
      if (value instanceof Error) {
        throw value;
      }

      return value;
    })
  };
}

async function createTestApp(options = {}) {
  const config = options.config || buildTestConfig();
  const logger = options.logger || buildSilentLogger();
  const sequelize = options.sequelize || createSequelize(config.db, false);
  const models = initModels(sequelize);

  await runMigrations(sequelize);
  await resetDatabaseState(models);

  const graphClient = options.graphClient || buildGraphClientMock(options.graphOverrides);
  const tokenValidator = options.tokenValidator || buildTokenValidatorMock(options.tokens || {});

  const container = createContainer({
    config,
    logger,
    sequelize,
    models,
    graphClient,
    tokenValidator
  });
  const app = createApp(container);

  return {
    app,
    config,
    container,
    sequelize,
    models,
    graphClient,
    tokenValidator,
    async close() {
      await sequelize.close();
    }
  };
}

module.exports = {
  buildGraphClientMock,
  buildSilentLogger,
  buildTestConfig,
  buildTokenValidatorMock,
  createTestApp
};
