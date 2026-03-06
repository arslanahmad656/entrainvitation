"use strict";

const { STATUSES } = require("../../../src/constants/statuses");
const { AdminUserService } = require("../../../src/services/AdminUserService");

describe("AdminUserService", () => {
  test("resets guest redemption and updates local status", async () => {
    const graphClient = {
      resetGuestRedemption: jest.fn().mockResolvedValue({
        id: "reset-1",
        email: "guest@example.com",
        userId: "guest-1"
      })
    };
    const userRepository = {
      updateStatusByEntraOid: jest.fn().mockResolvedValue({
        id: 10,
        entra_oid: "guest-1",
        status: STATUSES.REDEMPTION_RESET_REQUIRED
      })
    };
    const invitationRepository = {
      setStatusByGraphUserId: jest.fn().mockResolvedValue({
        id: 20,
        graph_user_id: "guest-1",
        status: STATUSES.REDEMPTION_RESET_REQUIRED
      })
    };
    const auditLogService = {
      recordSafe: jest.fn().mockResolvedValue(null)
    };
    const sequelize = {
      transaction: async (callback) => callback({})
    };

    const service = new AdminUserService({
      graphClient,
      userRepository,
      invitationRepository,
      auditLogService,
      sequelize
    });

    const result = await service.resetGuestRedemption({
      entraObjectId: "guest-1",
      actor: { oid: "admin-1" },
      correlationId: "corr-6"
    });

    expect(result.status).toBe(STATUSES.REDEMPTION_RESET_REQUIRED);
    expect(graphClient.resetGuestRedemption).toHaveBeenCalledWith({
      userId: "guest-1"
    });
  });
});
