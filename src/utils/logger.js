"use strict";

const LEVELS = ["error", "warn", "info", "debug"];

function createLogger(options = {}) {
  const service = options.service || "entra-login-api";
  const level = options.level || "info";
  const threshold = LEVELS.indexOf(level);

  function log(logLevel, message, meta = {}) {
    if (LEVELS.indexOf(logLevel) > threshold) {
      return;
    }

    const payload = {
      timestamp: new Date().toISOString(),
      level: logLevel,
      service,
      message,
      ...meta
    };

    const writer = logLevel === "error" ? console.error : console.log;
    writer(JSON.stringify(payload));
  }

  function child(defaultMeta = {}) {
    return {
      error(message, meta) {
        log("error", message, { ...defaultMeta, ...meta });
      },
      warn(message, meta) {
        log("warn", message, { ...defaultMeta, ...meta });
      },
      info(message, meta) {
        log("info", message, { ...defaultMeta, ...meta });
      },
      debug(message, meta) {
        log("debug", message, { ...defaultMeta, ...meta });
      },
      child(extraMeta) {
        return child({ ...defaultMeta, ...extraMeta });
      }
    };
  }

  return child();
}

module.exports = {
  createLogger
};
