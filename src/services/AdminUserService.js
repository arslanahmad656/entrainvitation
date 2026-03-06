"use strict";

const { AUDIT_ACTIONS } = require("../constants/auditActions");
const { STATUSES } = require("../constants/statuses");

class AdminUserService {
  constructor(options) {
    this.graphClient = options.graphClient;
    this.userRepository = options.userRepository;
    this.invitationRepository = options.invitationRepository;
    this.auditLogService = options.auditLogService;
    this.sequelize = options.sequelize;
  }

  /**
   * Triggers Microsoft Graph guest redemption reset and updates local onboarding state.
   * @param {object} payload
   * @returns {Promise<object>}
   */
  async resetGuestRedemption(payload) {
    try {
      const graphResult = await this.graphClient.resetGuestRedemption({
        userId: payload.entraObjectId
      });

      return this.sequelize.transaction(async (transaction) => {
        const invitation = await this.invitationRepository.setStatusByGraphUserId(
          payload.entraObjectId,
          STATUSES.REDEMPTION_RESET_REQUIRED,
          { transaction }
        );

        const user = await this.userRepository.updateStatusByEntraOid(
          payload.entraObjectId,
          STATUSES.REDEMPTION_RESET_REQUIRED,
          { transaction }
        );

        await this.auditLogService.recordSafe({
          actorOid: payload.actor.oid,
          action: AUDIT_ACTIONS.REDEMPTION_RESET,
          targetEmail: graphResult.email,
          targetOid: payload.entraObjectId,
          result: "Reset",
          correlationId: payload.correlationId
        }, { transaction });

        return {
          action: "redemptionReset",
          entraObjectId: payload.entraObjectId,
          email: graphResult.email,
          status: STATUSES.REDEMPTION_RESET_REQUIRED,
          invitationId: invitation ? invitation.id : null,
          localUserId: user ? user.id : null
        };
      });
    } catch (error) {
      await this.auditLogService.recordSafe({
        actorOid: payload.actor && payload.actor.oid ? payload.actor.oid : null,
        action: AUDIT_ACTIONS.REDEMPTION_RESET,
        targetOid: payload.entraObjectId,
        result: "Failed",
        correlationId: payload.correlationId
      });
      throw error;
    }
  }
}

module.exports = {
  AdminUserService
};
