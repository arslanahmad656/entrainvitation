"use strict";

const { v4: uuidv4, validate: isUuid } = require("uuid");

function correlationIdMiddleware(req, res, next) {
  const incoming = req.header("x-correlation-id");
  const correlationId = incoming && isUuid(incoming) ? incoming : uuidv4();

  req.correlationId = correlationId;
  res.setHeader("x-correlation-id", correlationId);
  next();
}

module.exports = {
  correlationIdMiddleware
};
