"use strict";

const { ValidationError } = require("../utils/errors");

class RoleAssignmentService {
  constructor(graphClient, logger) {
    this.graphClient = graphClient;
    this.logger = logger;
  }

  /**
   * Ensures that a user has the expected app role assigned in Entra.
   * @param {object} payload
   * @returns {Promise<object>}
   */
  async ensureAssignment(payload) {
    const servicePrincipal = await this.graphClient.getServicePrincipal();
    const targetAppRoleId = payload.targetAppRoleId || await this.graphClient.getAppRoleIdByValue(payload.targetRoleValue);

    if (!targetAppRoleId) {
      throw new ValidationError(`Unknown app role value: ${payload.targetRoleValue}`);
    }

    const assignments = await this.graphClient.getUserAppRoleAssignments(payload.userId);
    const hasAssignment = assignments.some((assignment) =>
      String(assignment.resourceId).toLowerCase() === String(servicePrincipal.id).toLowerCase()
      && String(assignment.appRoleId).toLowerCase() === String(targetAppRoleId).toLowerCase()
    );

    if (hasAssignment) {
      this.logger.info("App role assignment already present", {
        userId: payload.userId,
        appRoleId: targetAppRoleId
      });

      return {
        assigned: false,
        appRoleId: targetAppRoleId,
        resourceId: servicePrincipal.id,
        reason: "already_assigned"
      };
    }

    await this.graphClient.assignAppRole(payload.userId, servicePrincipal.id, targetAppRoleId);

    return {
      assigned: true,
      appRoleId: targetAppRoleId,
      resourceId: servicePrincipal.id
    };
  }
}

module.exports = {
  RoleAssignmentService
};
