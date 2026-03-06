"use strict";

const { AUDIT_ACTIONS } = require("../constants/auditActions");
const { STATUSES } = require("../constants/statuses");
const { ValidationError } = require("../utils/errors");
const { normalizeEmail } = require("../utils/normalizeEmail");

class InvitationService {
  constructor(options) {
    this.graphClient = options.graphClient;
    this.userRepository = options.userRepository;
    this.invitationRepository = options.invitationRepository;
    this.auditLogService = options.auditLogService;
    this.sequelize = options.sequelize;
    this.inviteRedirectUrl = options.inviteRedirectUrl;
    this.logger = options.logger;
  }

  _buildResponse(action, invitation) {
    return {
      action,
      email: invitation.email,
      targetRole: invitation.target_role_value,
      targetAppRoleId: invitation.target_app_role_id,
      graphUserId: invitation.graph_user_id || null,
      status: invitation.status
    };
  }

  /**
   * Creates or reuses a guest onboarding invitation without assigning a role yet.
   * @param {object} payload
   * @returns {Promise<object>}
   */
  async createInvitation(payload) {
    const email = normalizeEmail(payload.email);

    if (!email) {
      throw new ValidationError("Email is required");
    }

    try {
      const targetAppRoleId = await this.graphClient.getAppRoleIdByValue(payload.targetRole);
      if (!targetAppRoleId) {
        throw new ValidationError(`Unknown app role value: ${payload.targetRole}`);
      }

      const existingGraphUser = await this.graphClient.findUserByEmail(email);
      if (existingGraphUser) {
        const localUser = await this.userRepository.findByEntraOid(existingGraphUser.id);
        const existingStatus = localUser && localUser.status === STATUSES.ACTIVE
          ? STATUSES.ACTIVE
          : STATUSES.PENDING_ACTIVATION;

        const result = await this.sequelize.transaction(async (transaction) => {
          const invitation = await this.invitationRepository.upsertByIdentity({
            email,
            target_role_value: payload.targetRole,
            target_app_role_id: targetAppRoleId,
            graph_user_id: existingGraphUser.id,
            invited_by_entra_oid: payload.actor.oid,
            status: existingStatus
          }, { transaction });

          await this.auditLogService.recordSafe({
            actorOid: payload.actor.oid,
            action: AUDIT_ACTIONS.INVITATION_REUSED,
            targetEmail: email,
            targetOid: existingGraphUser.id,
            result: "ExistingUser",
            correlationId: payload.correlationId
          }, { transaction });

          return this._buildResponse(localUser && localUser.status === STATUSES.ACTIVE ? "alreadyActive" : "existingUser", invitation);
        });

        return result;
      }

      const existingInvitation = await this.invitationRepository.findLatestByEmail(email);
      if (existingInvitation && [
        STATUSES.INVITED,
        STATUSES.PENDING_ACTIVATION,
        STATUSES.REDEMPTION_RESET_REQUIRED
      ].includes(existingInvitation.status)) {
        const result = await this.sequelize.transaction(async (transaction) => {
          const invitation = await this.invitationRepository.upsertByIdentity({
            email,
            target_role_value: payload.targetRole,
            target_app_role_id: targetAppRoleId,
            graph_user_id: existingInvitation.graph_user_id || null,
            invited_by_entra_oid: payload.actor.oid,
            status: existingInvitation.status
          }, { transaction });

          await this.auditLogService.recordSafe({
            actorOid: payload.actor.oid,
            action: AUDIT_ACTIONS.INVITATION_REUSED,
            targetEmail: email,
            targetOid: existingInvitation.graph_user_id || null,
            result: "AlreadyInvited",
            correlationId: payload.correlationId
          }, { transaction });

          return this._buildResponse("alreadyInvited", invitation);
        });

        return result;
      }

      const invitationResult = await this.graphClient.inviteGuest(email, this.inviteRedirectUrl);

      return this.sequelize.transaction(async (transaction) => {
        const invitation = await this.invitationRepository.upsertByIdentity({
          email,
          target_role_value: payload.targetRole,
          target_app_role_id: targetAppRoleId,
          graph_user_id: invitationResult.invitedUser ? invitationResult.invitedUser.id : null,
          invited_by_entra_oid: payload.actor.oid,
          status: STATUSES.INVITED
        }, { transaction });

        await this.auditLogService.recordSafe({
          actorOid: payload.actor.oid,
          action: AUDIT_ACTIONS.INVITATION_CREATED,
          targetEmail: email,
          targetOid: invitation.graph_user_id || null,
          result: "Invited",
          correlationId: payload.correlationId
        }, { transaction });

        return this._buildResponse("invited", invitation);
      });
    } catch (error) {
      await this.auditLogService.recordSafe({
        actorOid: payload.actor && payload.actor.oid ? payload.actor.oid : null,
        action: AUDIT_ACTIONS.INVITATION_CREATED,
        targetEmail: email,
        result: "Failed",
        correlationId: payload.correlationId
      });
      throw error;
    }
  }
}

module.exports = {
  InvitationService
};
