"use strict";

const { asyncHandler } = require("../utils/asyncHandler");

function createMeController(activationService) {
  return asyncHandler(async (req, res) => {
    const result = await activationService.resolveMe(req.auth, {
      correlationId: req.correlationId
    });

    res.status(200).json({
      data: result,
      correlationId: req.correlationId
    });
  });
}

module.exports = {
  createMeController
};
