"use strict";

const { asyncHandler } = require("../utils/asyncHandler");

function createAdminUserController(adminUserService) {
  return asyncHandler(async (req, res) => {
    const result = await adminUserService.resetGuestRedemption({
      entraObjectId: req.params.entraObjectId,
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
  createAdminUserController
};
