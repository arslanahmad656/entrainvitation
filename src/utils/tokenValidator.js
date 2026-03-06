"use strict";

const axios = require("axios");
const jwt = require("jsonwebtoken");
const jwksRsa = require("jwks-rsa");

const { ExternalServiceError, UnauthorizedError } = require("./errors");

class EntraTokenValidator {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
    this.metadata = null;
    this.jwksClient = null;
  }

  async initialize() {
    if (this.metadata && this.jwksClient) {
      return;
    }

    try {
      const response = await axios.get(this.config.metadataUrl);
      this.metadata = response.data;
      this.jwksClient = jwksRsa({
        jwksUri: response.data.jwks_uri,
        cache: true,
        cacheMaxAge: 10 * 60 * 1000,
        cacheMaxEntries: 5,
        rateLimit: true,
        jwksRequestsPerMinute: 10
      });
    } catch (error) {
      this.logger.error("Failed to initialize token validator", {
        metadataUrl: this.config.metadataUrl,
        errorMessage: error.message
      });
      throw new ExternalServiceError("Unable to initialize Entra token validation");
    }
  }

  async _getSigningKey(kid) {
    try {
      const key = await this.jwksClient.getSigningKey(kid);
      return key.getPublicKey();
    } catch (error) {
      throw new UnauthorizedError("Unable to validate token signature");
    }
  }

  /**
   * Validates an incoming Entra access token and returns the claims used by the API.
   * @param {string} token
   * @returns {Promise<object>}
   */
  async validate(token) {
    await this.initialize();

    const decoded = jwt.decode(token, { complete: true });

    if (!decoded || !decoded.header || !decoded.header.kid) {
      throw new UnauthorizedError("Invalid bearer token");
    }

    const publicKey = await this._getSigningKey(decoded.header.kid);

    let payload;
    try {
      payload = await new Promise((resolve, reject) => {
        jwt.verify(token, publicKey, {
          algorithms: ["RS256"],
          audience: this.config.audience,
          issuer: this.metadata.issuer,
          clockTolerance: this.config.clockToleranceSeconds
        }, (error, verifiedToken) => {
          if (error) {
            reject(error);
            return;
          }

          resolve(verifiedToken);
        });
      });
    } catch (error) {
      throw new UnauthorizedError("Invalid or expired bearer token");
    }

    if (!payload.oid || !payload.tid) {
      throw new UnauthorizedError("Token missing required claims");
    }

    const preferredUsername = payload.preferred_username || payload.upn || payload.email || null;

    return {
      oid: payload.oid,
      tid: payload.tid,
      roles: Array.isArray(payload.roles) ? payload.roles : [],
      preferredUsername,
      email: preferredUsername,
      displayName: payload.name || null,
      raw: payload
    };
  }
}

module.exports = {
  EntraTokenValidator
};
