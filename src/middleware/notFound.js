"use strict";

const { NotFoundError } = require("../utils/errors");

function notFoundMiddleware(req, res, next) {
  next(new NotFoundError("Route not found"));
}

module.exports = {
  notFoundMiddleware
};
