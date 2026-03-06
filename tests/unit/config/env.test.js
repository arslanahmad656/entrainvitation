"use strict";

const { loadConfig } = require("../../../src/config/env");

function buildBaseEnv(overrides = {}) {
  return {
    NODE_ENV: "test",
    DB_DIALECT: "postgres",
    DB_HOST: "localhost",
    DB_PORT: "5432",
    DB_NAME: "entra_login",
    DB_USER: "postgres",
    DB_PASSWORD: "postgres",
    ENTRA_TENANT_ID: "00000000-0000-0000-0000-000000000000",
    API_CLIENT_ID: "00000000-0000-0000-0000-000000000000",
    AUTH_AUDIENCE: "api://00000000-0000-0000-0000-000000000000",
    GRAPH_CLIENT_ID: "00000000-0000-0000-0000-000000000000",
    GRAPH_CLIENT_SECRET: "secret",
    INVITE_REDIRECT_URL: "https://app.example.com/post-login",
    ...overrides
  };
}

describe("loadConfig", () => {
  test("maps DB_SSL settings into the database config", () => {
    const config = loadConfig(buildBaseEnv({
      DB_SSL: "true",
      DB_SSL_REJECT_UNAUTHORIZED: "false"
    }));

    expect(config.db.ssl).toBe(true);
    expect(config.db.sslRejectUnauthorized).toBe(false);
  });

  test("keeps backward compatibility with DB_ENCRYPT when DB_SSL is omitted", () => {
    const config = loadConfig(buildBaseEnv({
      DB_ENCRYPT: "true"
    }));

    expect(config.db.ssl).toBe(true);
    expect(config.db.sslRejectUnauthorized).toBe(true);
  });
});
