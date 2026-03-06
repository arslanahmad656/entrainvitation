"use strict";

const { ValidationError } = require("../utils/errors");

function createValidateRequest(schema) {
  return function validateRequest(req, res, next) {
    const locations = ["params", "query", "body"];

    for (const location of locations) {
      if (!schema[location]) {
        continue;
      }

      const { error, value } = schema[location].validate(req[location], {
        abortEarly: false,
        stripUnknown: true
      });

      if (error) {
        return next(new ValidationError("Request validation failed", error.details));
      }

      req[location] = value;
    }

    return next();
  };
}

module.exports = {
  createValidateRequest
};
