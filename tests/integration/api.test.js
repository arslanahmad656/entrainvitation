"use strict";

const request = require("supertest");

const { STATUSES } = require("../../src/constants/statuses");
const { ExternalServiceError } = require("../../src/utils/errors");
const { createTestApp } = require("../helpers/createTestApp");

describe("API integration", () => {
  let testContext;

  afterEach(async () => {
    if (testContext) {
      await testContext.close();
      testContext = null;
    }
  });

  test("POST /admin/invitations invites a new guest and persists the onboarding record", async () => {
    testContext = await createTestApp({
      tokens: {
        "admin-token": {
          oid: "admin-1",
          tid: "tenant-1",
          roles: ["Admin"],
          email: "admin@example.com",
          displayName: "Admin"
        }
      }
    });

    const response = await request(testContext.app)
      .post("/admin/invitations")
      .set("Authorization", "Bearer admin-token")
      .send({
        email: "guest@example.com",
        targetRole: "Reader"
      })
      .expect(200);

    const invitation = await testContext.container.repositories.invitationRepository.findLatestByEmail("guest@example.com");

    expect(response.body.data.action).toBe("invited");
    expect(invitation.status).toBe(STATUSES.INVITED);
    expect(testContext.graphClient.inviteGuest).toHaveBeenCalledWith(
      "guest@example.com",
      "https://app.example.com/post-login"
    );
  });

  test("POST /admin/invitations rejects non-admin callers", async () => {
    testContext = await createTestApp({
      tokens: {
        "reader-token": {
          oid: "reader-1",
          tid: "tenant-1",
          roles: ["Reader"],
          email: "reader@example.com",
          displayName: "Reader"
        }
      }
    });

    await request(testContext.app)
      .post("/admin/invitations")
      .set("Authorization", "Bearer reader-token")
      .send({
        email: "guest@example.com",
        targetRole: "Reader"
      })
      .expect(403);
  });

  test("GET /me activates an invited user and marks them active", async () => {
    testContext = await createTestApp({
      tokens: {
        "guest-token": {
          oid: "guest-1",
          tid: "tenant-1",
          roles: [],
          email: "guest@example.com",
          displayName: "Guest User"
        }
      }
    });

    await testContext.container.repositories.invitationRepository.upsertByIdentity({
      email: "guest@example.com",
      target_role_value: "Reader",
      target_app_role_id: "role-reader-id",
      graph_user_id: "guest-1",
      invited_by_entra_oid: "admin-1",
      status: STATUSES.INVITED
    });

    const response = await request(testContext.app)
      .get("/me")
      .set("Authorization", "Bearer guest-token")
      .expect(200);

    const user = await testContext.container.repositories.userRepository.findByEntraOid("guest-1");
    const invitation = await testContext.container.repositories.invitationRepository.findByGraphUserId("guest-1");

    expect(response.body.data.activation.activated).toBe(true);
    expect(user.status).toBe(STATUSES.ACTIVE);
    expect(invitation.status).toBe(STATUSES.ACTIVE);
    expect(testContext.graphClient.assignAppRole).toHaveBeenCalledWith("guest-1", "sp-1", "role-reader-id");
  });

  test("POST /admin/invitations remains idempotent for a pending invite", async () => {
    testContext = await createTestApp({
      tokens: {
        "admin-token": {
          oid: "admin-1",
          tid: "tenant-1",
          roles: ["Admin"],
          email: "admin@example.com",
          displayName: "Admin"
        }
      }
    });

    await testContext.container.repositories.invitationRepository.upsertByIdentity({
      email: "guest@example.com",
      target_role_value: "Reader",
      target_app_role_id: "role-reader-id",
      graph_user_id: null,
      invited_by_entra_oid: "admin-1",
      status: STATUSES.INVITED
    });

    const response = await request(testContext.app)
      .post("/admin/invitations")
      .set("Authorization", "Bearer admin-token")
      .send({
        email: "guest@example.com",
        targetRole: "Reader"
      })
      .expect(200);

    const invitationCount = await testContext.models.Invitation.count();

    expect(response.body.data.action).toBe("alreadyInvited");
    expect(invitationCount).toBe(1);
    expect(testContext.graphClient.inviteGuest).not.toHaveBeenCalled();
  });

  test("POST /admin/users/:entraObjectId/reset-redemption updates local state", async () => {
    const guestOid = "11111111-1111-1111-1111-111111111111";

    testContext = await createTestApp({
      tokens: {
        "admin-token": {
          oid: "admin-1",
          tid: "tenant-1",
          roles: ["Admin"],
          email: "admin@example.com",
          displayName: "Admin"
        }
      }
    });

    await testContext.container.repositories.userRepository.upsertFromClaims({
      entra_oid: guestOid,
      tenant_id: "tenant-1",
      email: "guest@example.com",
      display_name: "Guest User",
      user_type: "Guest",
      status: STATUSES.INVITED
    });
    await testContext.container.repositories.invitationRepository.upsertByIdentity({
      email: "guest@example.com",
      target_role_value: "Reader",
      target_app_role_id: "role-reader-id",
      graph_user_id: guestOid,
      invited_by_entra_oid: "admin-1",
      status: STATUSES.INVITED
    });
    testContext.graphClient.resetGuestRedemption.mockResolvedValue({
      id: "reset-1",
      email: "guest@example.com",
      userId: guestOid
    });

    const response = await request(testContext.app)
      .post(`/admin/users/${guestOid}/reset-redemption`)
      .set("Authorization", "Bearer admin-token")
      .expect(200);

    const invitation = await testContext.container.repositories.invitationRepository.findByGraphUserId(guestOid);
    const user = await testContext.container.repositories.userRepository.findByEntraOid(guestOid);

    expect(response.body.data.status).toBe(STATUSES.REDEMPTION_RESET_REQUIRED);
    expect(invitation.status).toBe(STATUSES.REDEMPTION_RESET_REQUIRED);
    expect(user.status).toBe(STATUSES.REDEMPTION_RESET_REQUIRED);
  });

  test("maps graph failures to a 502 response", async () => {
    testContext = await createTestApp({
      tokens: {
        "admin-token": {
          oid: "admin-1",
          tid: "tenant-1",
          roles: ["Admin"],
          email: "admin@example.com",
          displayName: "Admin"
        }
      },
      graphOverrides: {
        getAppRoleIdByValue: jest.fn().mockRejectedValue(
          new ExternalServiceError("Microsoft Graph request failed")
        )
      }
    });

    const response = await request(testContext.app)
      .post("/admin/invitations")
      .set("Authorization", "Bearer admin-token")
      .send({
        email: "guest@example.com",
        targetRole: "Reader"
      })
      .expect(502);

    expect(response.body.error.code).toBe("EXTERNAL_SERVICE_ERROR");
  });
});
