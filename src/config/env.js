"use strict";

const Joi = require("joi");

const BOOLEAN_SCHEMA = Joi.boolean()
  .truthy("true")
  .truthy("1")
  .falsy("false")
  .falsy("0");

function loadConfig(env = process.env) {
  const schema = Joi.object({
    NODE_ENV: Joi.string().valid("development", "test", "production").default("development"),
    PORT: Joi.number().port().default(3000),
    LOG_LEVEL: Joi.string().valid("error", "warn", "info", "debug").default("info"),
    LOG_SQL: BOOLEAN_SCHEMA.default(false),
    DB_DIALECT: Joi.string().valid("mssql", "sqlite").default("mssql"),
    DB_HOST: Joi.when("DB_DIALECT", {
      is: "mssql",
      then: Joi.string().required(),
      otherwise: Joi.string().allow("", null).optional()
    }),
    DB_PORT: Joi.when("DB_DIALECT", {
      is: "mssql",
      then: Joi.number().port().required(),
      otherwise: Joi.number().port().default(0)
    }),
    DB_NAME: Joi.when("DB_DIALECT", {
      is: "mssql",
      then: Joi.string().required(),
      otherwise: Joi.string().allow("", null).optional()
    }),
    DB_USER: Joi.when("DB_DIALECT", {
      is: "mssql",
      then: Joi.string().required(),
      otherwise: Joi.string().allow("", null).optional()
    }),
    DB_PASSWORD: Joi.when("DB_DIALECT", {
      is: "mssql",
      then: Joi.string().required(),
      otherwise: Joi.string().allow("", null).optional()
    }),
    DB_ENCRYPT: BOOLEAN_SCHEMA.default(true),
    DB_STORAGE: Joi.string().allow("", null).default(null),
    ENTRA_TENANT_ID: Joi.string().required(),
    API_CLIENT_ID: Joi.string().required(),
    AUTH_AUDIENCE: Joi.string().required(),
    AUTH_CLOCK_TOLERANCE_SECONDS: Joi.number().integer().min(0).default(5),
    GRAPH_CLIENT_ID: Joi.string().required(),
    GRAPH_CLIENT_SECRET: Joi.string().required(),
    GRAPH_SCOPE: Joi.string().default("https://graph.microsoft.com/.default"),
    GRAPH_BASE_URL: Joi.string().uri().default("https://graph.microsoft.com/v1.0"),
    INVITE_REDIRECT_URL: Joi.string().uri().required(),
    SERVICE_PRINCIPAL_CACHE_TTL_MS: Joi.number().integer().min(1000).default(300000)
  }).unknown(true);

  const { error, value } = schema.validate(env, {
    abortEarly: false,
    convert: true,
    stripUnknown: false
  });

  if (error) {
    const details = error.details.map((item) => item.message).join("; ");
    throw new Error(`Invalid environment configuration: ${details}`);
  }

  return {
    env: value.NODE_ENV,
    server: {
      port: value.PORT
    },
    logging: {
      level: value.LOG_LEVEL,
      sql: value.LOG_SQL
    },
    db: {
      dialect: value.DB_DIALECT,
      host: value.DB_HOST || null,
      port: value.DB_PORT,
      name: value.DB_NAME || null,
      user: value.DB_USER || null,
      password: value.DB_PASSWORD || null,
      encrypt: value.DB_ENCRYPT,
      storage: value.DB_STORAGE || null
    },
    auth: {
      tenantId: value.ENTRA_TENANT_ID,
      audience: value.AUTH_AUDIENCE,
      metadataUrl: `https://login.microsoftonline.com/${value.ENTRA_TENANT_ID}/v2.0/.well-known/openid-configuration`,
      clockToleranceSeconds: value.AUTH_CLOCK_TOLERANCE_SECONDS
    },
    graph: {
      tenantId: value.ENTRA_TENANT_ID,
      clientId: value.GRAPH_CLIENT_ID,
      clientSecret: value.GRAPH_CLIENT_SECRET,
      scope: value.GRAPH_SCOPE,
      baseUrl: value.GRAPH_BASE_URL,
      inviteRedirectUrl: value.INVITE_REDIRECT_URL,
      appClientId: value.API_CLIENT_ID,
      servicePrincipalCacheTtlMs: value.SERVICE_PRINCIPAL_CACHE_TTL_MS
    }
  };
}

module.exports = {
  loadConfig
};
