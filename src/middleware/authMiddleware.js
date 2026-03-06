"use strict";

const { asyncHandler } = require("../utils/asyncHandler");
const { UnauthorizedError } = require("../utils/errors");

function createAuthMiddleware(tokenValidator) {
  return asyncHandler(async (req, res, next) => {
    const header = req.header("authorization");

    if (!header || !header.startsWith("Bearer ")) {
      throw new UnauthorizedError("Bearer token is required");
    }

    const token = header.slice("Bearer ".length).trim();

    if (!token) {
      throw new UnauthorizedError("Bearer token is required");
    }

    req.auth = await tokenValidator.validate(token);
    next();
  });
}

module.exports = {
  createAuthMiddleware
};
