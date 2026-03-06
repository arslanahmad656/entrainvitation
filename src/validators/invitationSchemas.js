"use strict";

const Joi = require("joi");

const invitationBodySchema = Joi.object({
  email: Joi.string().trim().email().max(256).required(),
  targetRole: Joi.string().trim().max(100).required()
});

const resetRedemptionParamsSchema = Joi.object({
  entraObjectId: Joi.string().guid().required()
});

module.exports = {
  invitationBodySchema,
  resetRedemptionParamsSchema
};
