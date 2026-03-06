"use strict";

class AppError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = options.statusCode || 500;
    this.code = options.code || "INTERNAL_ERROR";
    this.details = options.details || null;
    this.expose = options.expose !== undefined ? options.expose : this.statusCode < 500;
  }
}

class ValidationError extends AppError {
  constructor(message, details) {
    super(message, {
      statusCode: 400,
      code: "VALIDATION_ERROR",
      details
    });
  }
}

class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super(message, {
      statusCode: 401,
      code: "UNAUTHORIZED"
    });
  }
}

class ForbiddenError extends AppError {
  constructor(message = "Access denied") {
    super(message, {
      statusCode: 403,
      code: "FORBIDDEN"
    });
  }
}

class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(message, {
      statusCode: 404,
      code: "NOT_FOUND"
    });
  }
}

class ConflictError extends AppError {
  constructor(message, details) {
    super(message, {
      statusCode: 409,
      code: "CONFLICT",
      details
    });
  }
}

class ExternalServiceError extends AppError {
  constructor(message, details) {
    super(message, {
      statusCode: 502,
      code: "EXTERNAL_SERVICE_ERROR",
      details,
      expose: false
    });
  }
}

module.exports = {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ExternalServiceError
};
