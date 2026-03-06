"use strict";

const { STATUSES } = require("../../../src/constants/statuses");
const { ActivationService } = require("../../../src/services/ActivationService");

describe("ActivationService", () => {
  test("assigns the role and activates a pending guest on first login", async () => {
    const userRepository = {
      upsertFromClaims: jest.fn()
        .mockResolvedValueOnce({
          entra_oid: "guest-1",
          tenant_id: "tenant-1",
          email: "guest@example.com",
          display_name: "Guest",
          user_type: "Guest",
          status: STATUSES.INVITED
        })
        .mockResolvedValueOnce({
          entra_oid: "guest-1",
          tenant_id: "tenant-1",
          email: "guest@example.com",
          display_name: "Guest",
          user_type: "Guest",
          status: STATUSES.ACTIVE
        }),
      updateStatusByEntraOid: jest.fn()
    };
    const invitationRepository = {
      findPendingByIdentity: jest.fn().mockResolvedValue({
        id: 1,
        email: "guest@example.com",
        target_role_value: "Reader",
        target_app_role_id: "role-reader-id",
        graph_user_id: "guest-1",
        status: STATUSES.INVITED
      }),
      setStatusById: jest.fn().mockResolvedValue({
        id: 1,
        email: "guest@example.com",
        target_role_value: "Reader",
        target_app_role_id: "role-reader-id",
        graph_user_id: "guest-1",
        status: STATUSES.ACTIVE
      }),
      findByGraphUserId: jest.fn()
    };
    const roleAssignmentService = {
      ensureAssignment: jest.fn().mockResolvedValue({
        assigned: true
      })
    };
    const auditLogService = {
      recordSafe: jest.fn().mockResolvedValue(null)
    };
    const sequelize = {
      transaction: async (callback) => callback({})
    };

    const service = new ActivationService({
      userRepository,
      invitationRepository,
      roleAssignmentService,
      auditLogService,
      sequelize,
      logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
      }
    });

    const result = await service.resolveMe({
      oid: "guest-1",
      tid: "tenant-1",
      roles: [],
      email: "guest@example.com",
      displayName: "Guest"
    }, {
      correlationId: "corr-5"
    });

    expect(roleAssignmentService.ensureAssignment).toHaveBeenCalledWith({
      userId: "guest-1",
      targetRoleValue: "Reader",
      targetAppRoleId: "role-reader-id"
    });
    expect(result.profile.status).toBe(STATUSES.ACTIVE);
    expect(result.onboardingStatus).toBe(STATUSES.ACTIVE);
    expect(result.activation.activated).toBe(true);
  });
});
