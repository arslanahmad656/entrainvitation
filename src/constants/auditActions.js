"use strict";

const AUDIT_ACTIONS = Object.freeze({
  INVITATION_CREATED: "InvitationCreated",
  INVITATION_REUSED: "InvitationReused",
  USER_ACTIVATED: "UserActivated",
  REDEMPTION_RESET: "RedemptionReset"
});

module.exports = {
  AUDIT_ACTIONS
};
