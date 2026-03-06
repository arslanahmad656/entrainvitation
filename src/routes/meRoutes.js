"use strict";

const express = require("express");

const { createMeController } = require("../controllers/meController");

function buildMeRoutes(container) {
  const router = express.Router();

  router.get("/", createMeController(container.services.activationService));

  return router;
}

module.exports = {
  buildMeRoutes
};
