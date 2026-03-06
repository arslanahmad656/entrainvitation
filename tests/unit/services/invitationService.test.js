"use strict";

const { STATUSES } = require("../../../src/constants/statuses");
const { ExternalServiceError } = require("../../../src/utils/errors");
const { InvitationService } = require("../../../src/services/InvitationService");

function buildService(overrides = {}) {
  const dependencies = {
    graphClient: {
      getAppRoleIdByValue: jest.fn(),
      findUserByEmail: jest.fn(),
      inviteGuest: jest.fn()
    },
    userRepository: {
      findByEntraOid: jest.fn()
    },
    invitationRepository: {
      findLatestByEmail: jest.fn(),
      upsertByIdentity: jest.fn()
    },
    auditLogService: {
      recordSafe: jest.fn().mockResolvedValue(null)
    },
    sequelize: {
      transaction: async (callback) => callback({})
    },
    inviteRedirectUrl: "https://app.example.com/post-login",
    logger: {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    }
  };

  return {
    service: new InvitationService({ ...dependencies, ...overrides }),
    dependencies: { ...dependencies, ...overrides }
  };
}

describe("InvitationService", () => {
  test("invites a new guest user", async () => {
    const { service, dependencies } = buildService();
    dependencies.graphClient.getAppRoleIdByValue.mockResolvedValue("role-reader-id");
    dependencies.graphClient.findUserByEmail.mockResolvedValue(null);
    dependencies.invitationRepository.findLatestByEmail.mockResolvedValue(null);
    dependencies.graphClient.inviteGuest.mockResolvedValue({
      id: "invite-1",
      invitedUser: { id: "graph-user-1" }
    });
    dependencies.invitationRepository.upsertByIdentity.mockResolvedValue({
      email: "guest@example.com",
      target_role_value: "Reader",
      target_app_role_id: "role-reader-id",
      graph_user_id: "graph-user-1",
      status: STATUSES.INVITED
    });

    const result = await service.createInvitation({
      email: "guest@example.com",
      targetRole: "Reader",
      actor: { oid: "admin-1" },
      correlationId: "corr-1"
    });

    expect(result).toMatchObject({
      action: "invited",
      email: "guest@example.com",
      graphUserId: "graph-user-1",
      status: STATUSES.INVITED
    });
    expect(dependencies.graphClient.inviteGuest).toHaveBeenCalledTimes(1);
  });

  test("uses the existing user branch without sending a duplicate invite", async () => {
    const { service, dependencies } = buildService();
    dependencies.graphClient.getAppRoleIdByValue.mockResolvedValue("role-reader-id");
    dependencies.graphClient.findUserByEmail.mockResolvedValue({ id: "graph-user-2" });
    dependencies.userRepository.findByEntraOid.mockResolvedValue(null);
    dependencies.invitationRepository.upsertByIdentity.mockResolvedValue({
      email: "existing@example.com",
      target_role_value: "Reader",
      target_app_role_id: "role-reader-id",
      graph_user_id: "graph-user-2",
      status: STATUSES.PENDING_ACTIVATION
    });

    const result = await service.createInvitation({
      email: "existing@example.com",
      targetRole: "Reader",
      actor: { oid: "admin-1" },
      correlationId: "corr-2"
    });

    expect(result.action).toBe("existingUser");
    expect(dependencies.graphClient.inviteGuest).not.toHaveBeenCalled();
  });

  test("keeps duplicate invite requests idempotent", async () => {
    const { service, dependencies } = buildService();
    dependencies.graphClient.getAppRoleIdByValue.mockResolvedValue("role-reader-id");
    dependencies.graphClient.findUserByEmail.mockResolvedValue(null);
    dependencies.invitationRepository.findLatestByEmail.mockResolvedValue({
      id: 1,
      email: "guest@example.com",
      target_role_value: "Reader",
      target_app_role_id: "role-reader-id",
      graph_user_id: null,
      status: STATUSES.INVITED
    });
    dependencies.invitationRepository.upsertByIdentity.mockResolvedValue({
      id: 1,
      email: "guest@example.com",
      target_role_value: "Reader",
      target_app_role_id: "role-reader-id",
      graph_user_id: null,
      status: STATUSES.INVITED
    });

    const result = await service.createInvitation({
      email: "guest@example.com",
      targetRole: "Reader",
      actor: { oid: "admin-1" },
      correlationId: "corr-3"
    });

    expect(result.action).toBe("alreadyInvited");
    expect(dependencies.graphClient.inviteGuest).not.toHaveBeenCalled();
  });

  test("propagates graph failures as external service errors", async () => {
    const { service, dependencies } = buildService();
    dependencies.graphClient.getAppRoleIdByValue.mockRejectedValue(
      new ExternalServiceError("Microsoft Graph request failed")
    );

    await expect(service.createInvitation({
      email: "guest@example.com",
      targetRole: "Reader",
      actor: { oid: "admin-1" },
      correlationId: "corr-4"
    })).rejects.toMatchObject({
      statusCode: 502,
      code: "EXTERNAL_SERVICE_ERROR"
    });

    expect(dependencies.auditLogService.recordSafe).toHaveBeenCalled();
  });
});
