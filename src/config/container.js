"use strict";

const { createSequelize } = require("./database");
const { initModels } = require("../database/models");
const { GraphClient } = require("../clients/GraphClient");
const { GraphTokenProvider } = require("../clients/GraphTokenProvider");
const { AuditLogRepository } = require("../repositories/AuditLogRepository");
const { InvitationRepository } = require("../repositories/InvitationRepository");
const { UserRepository } = require("../repositories/UserRepository");
const { ActivationService } = require("../services/ActivationService");
const { AdminUserService } = require("../services/AdminUserService");
const { AuditLogService } = require("../services/AuditLogService");
const { InvitationService } = require("../services/InvitationService");
const { RoleAssignmentService } = require("../services/RoleAssignmentService");
const { createLogger } = require("../utils/logger");
const { EntraTokenValidator } = require("../utils/tokenValidator");

function createContainer(options = {}) {
  const config = options.config;
  const logger = options.logger || createLogger({
    service: "entra-login-api",
    level: config.logging.level
  });
  const sequelize = options.sequelize || createSequelize(
    config.db,
    config.logging.sql ? console.log : false
  );
  const models = options.models || initModels(sequelize);

  const userRepository = options.userRepository || new UserRepository(models.User);
  const invitationRepository = options.invitationRepository || new InvitationRepository(models.Invitation);
  const auditLogRepository = options.auditLogRepository || new AuditLogRepository(models.AuditLog);

  const graphTokenProvider = options.graphTokenProvider || new GraphTokenProvider(
    config.graph,
    logger.child({ component: "graph-token" })
  );
  const graphClient = options.graphClient || new GraphClient({
    tokenProvider: graphTokenProvider,
    logger: logger.child({ component: "graph-client" }),
    appClientId: config.graph.appClientId,
    inviteRedirectUrl: config.graph.inviteRedirectUrl,
    baseUrl: config.graph.baseUrl,
    servicePrincipalCacheTtlMs: config.graph.servicePrincipalCacheTtlMs
  });
  const tokenValidator = options.tokenValidator || new EntraTokenValidator(
    config.auth,
    logger.child({ component: "auth" })
  );

  const auditLogService = options.auditLogService || new AuditLogService(
    auditLogRepository,
    logger.child({ component: "audit-log-service" })
  );
  const roleAssignmentService = options.roleAssignmentService || new RoleAssignmentService(
    graphClient,
    logger.child({ component: "role-assignment-service" })
  );
  const invitationService = options.invitationService || new InvitationService({
    graphClient,
    userRepository,
    invitationRepository,
    auditLogService,
    sequelize,
    inviteRedirectUrl: config.graph.inviteRedirectUrl,
    logger: logger.child({ component: "invitation-service" })
  });
  const activationService = options.activationService || new ActivationService({
    userRepository,
    invitationRepository,
    roleAssignmentService,
    auditLogService,
    sequelize,
    logger: logger.child({ component: "activation-service" })
  });
  const adminUserService = options.adminUserService || new AdminUserService({
    graphClient,
    userRepository,
    invitationRepository,
    auditLogService,
    sequelize
  });

  return {
    config,
    logger,
    sequelize,
    models,
    repositories: {
      userRepository,
      invitationRepository,
      auditLogRepository
    },
    services: {
      auditLogService,
      roleAssignmentService,
      invitationService,
      activationService,
      adminUserService
    },
    graphClient,
    graphTokenProvider,
    tokenValidator
  };
}

module.exports = {
  createContainer
};
