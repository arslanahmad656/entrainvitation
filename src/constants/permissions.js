"use strict";

const PERMISSIONS = Object.freeze({
  INVITATION_CREATE: "invitation:create",
  REDEMPTION_RESET: "user:redemption-reset",
  ME_READ: "me:read"
});

const ROLE_PERMISSIONS = Object.freeze({
  Admin: [
    PERMISSIONS.INVITATION_CREATE,
    PERMISSIONS.REDEMPTION_RESET,
    PERMISSIONS.ME_READ
  ],
  Reader: [
    PERMISSIONS.ME_READ
  ]
});

module.exports = {
  PERMISSIONS,
  ROLE_PERMISSIONS
};
