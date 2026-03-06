"use strict";

const express = require("express");

function buildHealthRoutes() {
  const router = express.Router();

  router.get("/", (req, res) => {
    res.status(200).json({
      status: "ok"
    });
  });

  return router;
}

module.exports = {
  buildHealthRoutes
};
