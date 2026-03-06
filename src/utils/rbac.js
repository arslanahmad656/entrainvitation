"use strict";

const { ROLE_PERMISSIONS } = require("../constants/permissions");

function hasRole(userRoles, expectedRole) {
  return Array.isArray(userRoles) && userRoles.includes(expectedRole);
}

function hasPermission(userRoles, permission) {
  if (!Array.isArray(userRoles)) {
    return false;
  }

  return userRoles.some((role) => {
    const permissions = ROLE_PERMISSIONS[role] || [];
    return permissions.includes(permission);
  });
}

module.exports = {
  hasRole,
  hasPermission
};
