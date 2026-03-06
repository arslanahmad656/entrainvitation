"use strict";

const { AUDIT_ACTIONS } = require("../constants/auditActions");
const { STATUSES } = require("../constants/statuses");
const { normalizeEmail } = require("../utils/normalizeEmail");

class ActivationService {
  constructor(options) {
    this.userRepository = options.userRepository;
    this.invitationRepository = options.invitationRepository;
    this.roleAssignmentService = options.roleAssignmentService;
    this.auditLogService = options.auditLogService;
    this.sequelize = options.sequelize;
    this.logger = options.logger;
  }

  _buildProfile(user, auth, invitation, activation) {
    return {
      profile: {
        oid: user.entra_oid,
        tenantId: user.tenant_id,
        email: user.email,
        displayName: user.display_name,
        userType: user.user_type,
        status: user.status
      },
      roles: auth.roles,
      onboardingStatus: invitation ? invitation.status : user.status,
      invitation: invitation ? {
        id: invitation.id,
        targetRole: invitation.target_role_value,
        targetAppRoleId: invitation.target_app_role_id,
        status: invitation.status
      } : null,
      activation
    };
  }

  /**
   * Activates an invited user on first successful login and returns the /me payload.
   * @param {object} auth
   * @param {object} options
   * @returns {Promise<object>}
   */
  async resolveMe(auth, options = {}) {
    const email = normalizeEmail(auth.email);
    const pendingInvitation = await this.invitationRepository.findPendingByIdentity({
      graphUserId: auth.oid,
      email
    });

    const baseStatus = pendingInvitation
      ? pendingInvitation.status
      : (Array.isArray(auth.roles) && auth.roles.length ? STATUSES.ACTIVE : STATUSES.PENDING_ACTIVATION);

    let user = await this.userRepository.upsertFromClaims({
      entra_oid: auth.oid,
      tenant_id: auth.tid,
      email: email || null,
      display_name: auth.displayName || null,
      user_type: pendingInvitation ? "Guest" : "Member",
      status: baseStatus
    });

    try {
      if (pendingInvitation && pendingInvitation.status !== STATUSES.ACTIVE) {
        const assignment = await this.roleAssignmentService.ensureAssignment({
          userId: auth.oid,
          targetRoleValue: pendingInvitation.target_role_value,
          targetAppRoleId: pendingInvitation.target_app_role_id
        });

        return this.sequelize.transaction(async (transaction) => {
          const updatedInvitation = await this.invitationRepository.setStatusById(
            pendingInvitation.id,
            STATUSES.ACTIVE,
            { transaction }
          );

          const updatedUser = await this.userRepository.upsertFromClaims({
            entra_oid: auth.oid,
            tenant_id: auth.tid,
            email: email || null,
            display_name: auth.displayName || null,
            user_type: "Guest",
            status: STATUSES.ACTIVE
          }, { transaction });

          await this.auditLogService.recordSafe({
            actorOid: auth.oid,
            action: AUDIT_ACTIONS.USER_ACTIVATED,
            targetEmail: email,
            targetOid: auth.oid,
            result: assignment.assigned ? "Assigned" : "AlreadyAssigned",
            correlationId: options.correlationId
          }, { transaction });

          return this._buildProfile(updatedUser, auth, updatedInvitation, {
            activated: true,
            assignedRole: assignment.assigned,
            reason: assignment.reason || null
          });
        });
      }

      if (user.status !== STATUSES.ACTIVE && Array.isArray(auth.roles) && auth.roles.length) {
        user = await this.userRepository.updateStatusByEntraOid(auth.oid, STATUSES.ACTIVE) || user;
      }

      const invitation = pendingInvitation || await this.invitationRepository.findByGraphUserId(auth.oid);

      return this._buildProfile(user, auth, invitation, {
        activated: false,
        assignedRole: false,
        reason: pendingInvitation ? "no_activation_required" : "no_onboarding_record"
      });
    } catch (error) {
      await this.auditLogService.recordSafe({
        actorOid: auth.oid,
        action: AUDIT_ACTIONS.USER_ACTIVATED,
        targetEmail: email,
        targetOid: auth.oid,
        result: "Failed",
        correlationId: options.correlationId
      });
      throw error;
    }
  }
}

module.exports = {
  ActivationService
};
