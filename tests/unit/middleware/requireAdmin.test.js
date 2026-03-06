"use strict";

const { requireAdmin } = require("../../../src/middleware/requirePermission");

describe("requireAdmin middleware", () => {
  test("allows requests with the Admin app role", () => {
    const req = {
      auth: {
        roles: ["Admin"]
      }
    };
    const next = jest.fn();

    requireAdmin(req, {}, next);

    expect(next).toHaveBeenCalledWith();
  });

  test("rejects requests without the Admin app role", () => {
    const req = {
      auth: {
        roles: ["Reader"]
      }
    };
    const next = jest.fn();

    requireAdmin(req, {}, next);

    const error = next.mock.calls[0][0];
    expect(error.statusCode).toBe(403);
  });
});
