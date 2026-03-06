"use strict";

function createErrorHandler(logger) {
  return function errorHandler(error, req, res, next) {
    const statusCode = error.statusCode || 500;
    const code = error.code || "INTERNAL_ERROR";
    const expose = error.expose !== false && statusCode < 500;
    const log = statusCode >= 500 ? logger.error.bind(logger) : logger.warn.bind(logger);

    log("Request failed", {
      correlationId: req.correlationId,
      method: req.method,
      path: req.originalUrl,
      statusCode,
      code,
      errorMessage: error.message,
      details: error.details || null
    });

    res.status(statusCode).json({
      error: {
        code,
        message: expose ? error.message : "Internal server error",
        details: expose ? error.details || undefined : undefined
      },
      correlationId: req.correlationId
    });
  };
}

module.exports = {
  createErrorHandler
};
