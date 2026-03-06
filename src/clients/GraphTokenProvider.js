"use strict";

const { ConfidentialClientApplication } = require("@azure/msal-node");

const { ExternalServiceError } = require("../utils/errors");

class GraphTokenProvider {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
    this.client = new ConfidentialClientApplication({
      auth: {
        clientId: config.clientId,
        authority: `https://login.microsoftonline.com/${config.tenantId}`,
        clientSecret: config.clientSecret
      }
    });
  }

  async getAccessToken() {
    try {
      const token = await this.client.acquireTokenByClientCredential({
        scopes: [this.config.scope]
      });

      if (!token || !token.accessToken) {
        throw new Error("MSAL returned an empty access token");
      }

      return token.accessToken;
    } catch (error) {
      this.logger.error("Failed to obtain Graph access token", {
        errorMessage: error.message
      });
      throw new ExternalServiceError("Unable to obtain Microsoft Graph access token");
    }
  }
}

module.exports = {
  GraphTokenProvider
};
