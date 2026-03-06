"use strict";

const express = require("express");

const { createAdminInvitationController } = require("../controllers/adminInvitationController");
const { createAdminUserController } = require("../controllers/adminUserController");
const { requireAdmin } = require("../middleware/requirePermission");
const { createValidateRequest } = require("../middleware/validateRequest");
const { invitationBodySchema, resetRedemptionParamsSchema } = require("../validators/invitationSchemas");

function buildAdminRoutes(container) {
  const router = express.Router();

  router.post(
    "/invitations",
    requireAdmin,
    createValidateRequest({ body: invitationBodySchema }),
    createAdminInvitationController(container.services.invitationService)
  );

  router.post(
    "/users/:entraObjectId/reset-redemption",
    requireAdmin,
    createValidateRequest({ params: resetRedemptionParamsSchema }),
    createAdminUserController(container.services.adminUserService)
  );

  return router;
}

module.exports = {
  buildAdminRoutes
};
