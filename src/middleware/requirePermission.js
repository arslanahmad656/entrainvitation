"use strict";

const { APP_ROLES } = require("../constants/roles");
const { ForbiddenError, UnauthorizedError } = require("../utils/errors");
const { hasPermission, hasRole } = require("../utils/rbac");

function createRequirePermission(permission) {
  return function requirePermission(req, res, next) {
    if (!req.auth) {
      return next(new UnauthorizedError());
    }

    if (!hasPermission(req.auth.roles, permission)) {
      return next(new ForbiddenError("Required permission is missing"));
    }

    return next();
  };
}

function requireAdmin(req, res, next) {
  if (!req.auth) {
    return next(new UnauthorizedError());
  }

  if (!hasRole(req.auth.roles, APP_ROLES.ADMIN)) {
    return next(new ForbiddenError("Admin app role is required"));
  }

  return next();
}

module.exports = {
  createRequirePermission,
  requireAdmin
};
