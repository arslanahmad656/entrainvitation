"use strict";

const { defineUserModel } = require("./UserModel");
const { defineInvitationModel } = require("./InvitationModel");
const { defineAuditLogModel } = require("./AuditLogModel");

function initModels(sequelize) {
  return {
    User: defineUserModel(sequelize),
    Invitation: defineInvitationModel(sequelize),
    AuditLog: defineAuditLogModel(sequelize)
  };
}

module.exports = {
  initModels
};
