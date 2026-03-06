"use strict";

const { asyncHandler } = require("../utils/asyncHandler");

function createAdminInvitationController(invitationService) {
  return asyncHandler(async (req, res) => {
    const result = await invitationService.createInvitation({
      email: req.body.email,
      targetRole: req.body.targetRole,
      actor: req.auth,
      correlationId: req.correlationId
    });

    res.status(200).json({
      data: result,
      correlationId: req.correlationId
    });
  });
}

module.exports = {
  createAdminInvitationController
};
