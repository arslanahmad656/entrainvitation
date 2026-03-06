"use strict";

const axios = require("axios");

const { ConflictError, ExternalServiceError, NotFoundError } = require("../utils/errors");
const { normalizeEmail } = require("../utils/normalizeEmail");

function escapeODataString(value) {
  return String(value).replace(/'/g, "''");
}

class GraphClient {
  constructor(options) {
    this.tokenProvider = options.tokenProvider;
    this.logger = options.logger;
    this.appClientId = options.appClientId;
    this.inviteRedirectUrl = options.inviteRedirectUrl;
    this.servicePrincipalCacheTtlMs = options.servicePrincipalCacheTtlMs || 300000;
    this.httpClient = axios.create({
      baseURL: options.baseUrl,
      timeout: 10000
    });
    this.servicePrincipalCache = {
      value: null,
      expiresAt: 0
    };
  }

  async _request(config) {
    const token = await this.tokenProvider.getAccessToken();

    try {
      const response = await this.httpClient.request({
        ...config,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(config.headers || {})
        }
      });

      return response.data;
    } catch (error) {
      if (error.response) {
        const graphError = error.response.data && error.response.data.error ? error.response.data.error : {};
        const details = {
          provider: "graph",
          status: error.response.status,
          graphCode: graphError.code || null,
          graphMessage: graphError.message || error.message
        };

        if (error.response.status === 404) {
          throw new NotFoundError(graphError.message || "Resource not found in Microsoft Graph");
        }

        if (error.response.status === 409) {
          throw new ConflictError(graphError.message || "Microsoft Graph reported a conflict", details);
        }

        throw new ExternalServiceError("Microsoft Graph request failed", details);
      }

      throw new ExternalServiceError("Microsoft Graph request failed", {
        provider: "graph",
        graphMessage: error.message
      });
    }
  }

  _normalizeUser(user, fallbackEmail) {
    const resolvedEmail = normalizeEmail(
      user.mail || (Array.isArray(user.otherMails) ? user.otherMails[0] : null) || fallbackEmail || user.userPrincipalName || ""
    );

    return {
      id: user.id,
      displayName: user.displayName || null,
      mail: user.mail || null,
      email: resolvedEmail || null,
      userPrincipalName: user.userPrincipalName || null,
      userType: user.userType || null,
      otherMails: Array.isArray(user.otherMails) ? user.otherMails : []
    };
  }

  async _queryUsers(filter, normalizedEmail) {
    const params = new URLSearchParams({
      "$select": "id,displayName,mail,userPrincipalName,userType,otherMails",
      "$top": "1",
      "$filter": filter
    });

    const data = await this._request({
      method: "GET",
      url: `/users?${params.toString()}`
    });

    if (!data.value || !data.value.length) {
      return null;
    }

    return this._normalizeUser(data.value[0], normalizedEmail);
  }

  async _getUserById(userId) {
    const params = new URLSearchParams({
      "$select": "id,displayName,mail,userPrincipalName,userType,otherMails"
    });

    const data = await this._request({
      method: "GET",
      url: `/users/${encodeURIComponent(userId)}?${params.toString()}`
    });

    return this._normalizeUser(data);
  }

  /**
   * Finds an Entra user by email using a few guest-safe Graph lookups.
   * @param {string} email
   * @returns {Promise<object|null>}
   */
  async findUserByEmail(email) {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
      return null;
    }

    const escaped = escapeODataString(normalizedEmail);
    const filters = [
      `mail eq '${escaped}'`,
      `userPrincipalName eq '${escaped}'`,
      `otherMails/any(c:c eq '${escaped}')`
    ];

    for (const filter of filters) {
      const user = await this._queryUsers(filter, normalizedEmail);
      if (user) {
        return user;
      }
    }

    return null;
  }

  /**
   * Invites an external guest user via Microsoft Graph.
   * @param {string} email
   * @param {string} redirectUrl
   * @returns {Promise<object>}
   */
  async inviteGuest(email, redirectUrl) {
    const normalizedEmail = normalizeEmail(email);
    const data = await this._request({
      method: "POST",
      url: "/invitations",
      data: {
        invitedUserEmailAddress: normalizedEmail,
        inviteRedirectUrl: redirectUrl,
        sendInvitationMessage: true
      }
    });

    let invitedUserId = data.invitedUser && data.invitedUser.id ? data.invitedUser.id : null;
    if (!invitedUserId) {
      const user = await this.findUserByEmail(normalizedEmail);
      invitedUserId = user ? user.id : null;
    }

    return {
      id: data.id,
      invitedUserEmailAddress: data.invitedUserEmailAddress || normalizedEmail,
      inviteRedeemUrl: data.inviteRedeemUrl || null,
      invitedUser: invitedUserId ? { id: invitedUserId } : null
    };
  }

  /**
   * Assigns an app role to a user for the current API service principal.
   * @param {string} userId
   * @param {string} resourceId
   * @param {string} appRoleId
   * @returns {Promise<object>}
   */
  async assignAppRole(userId, resourceId, appRoleId) {
    return this._request({
      method: "POST",
      url: `/users/${encodeURIComponent(userId)}/appRoleAssignments`,
      data: {
        principalId: userId,
        resourceId,
        appRoleId
      }
    });
  }

  async getUserAppRoleAssignments(userId) {
    const params = new URLSearchParams({
      "$select": "id,appRoleId,resourceId"
    });

    const data = await this._request({
      method: "GET",
      url: `/users/${encodeURIComponent(userId)}/appRoleAssignments?${params.toString()}`
    });

    return Array.isArray(data.value) ? data.value : [];
  }

  async getServicePrincipal() {
    const now = Date.now();
    if (this.servicePrincipalCache.value && this.servicePrincipalCache.expiresAt > now) {
      return this.servicePrincipalCache.value;
    }

    const escapedAppId = escapeODataString(this.appClientId);
    const params = new URLSearchParams({
      "$select": "id,appId,displayName,appRoles",
      "$top": "1",
      "$filter": `appId eq '${escapedAppId}'`
    });

    const data = await this._request({
      method: "GET",
      url: `/servicePrincipals?${params.toString()}`
    });

    const servicePrincipal = data.value && data.value.length ? data.value[0] : null;

    if (!servicePrincipal) {
      throw new NotFoundError("Service principal for the configured API app was not found");
    }

    this.servicePrincipalCache = {
      value: servicePrincipal,
      expiresAt: now + this.servicePrincipalCacheTtlMs
    };

    return servicePrincipal;
  }

  async getAppRoleIdByValue(roleValue) {
    const servicePrincipal = await this.getServicePrincipal();
    const appRole = Array.isArray(servicePrincipal.appRoles)
      ? servicePrincipal.appRoles.find((role) => role.value === roleValue && role.isEnabled)
      : null;

    return appRole ? appRole.id : null;
  }

  /**
   * Resets guest redemption by re-posting a Graph invitation with resetRedemption.
   * TODO: Graph app-only reset has platform limitations; keep alternative admin recovery isolated here if needed later.
   * @param {string|object} userIdentifier
   * @returns {Promise<object>}
   */
  async resetGuestRedemption(userIdentifier) {
    let user;

    if (typeof userIdentifier === "string" && userIdentifier.includes("@")) {
      user = await this.findUserByEmail(userIdentifier);
    } else if (typeof userIdentifier === "string") {
      user = await this._getUserById(userIdentifier);
    } else if (userIdentifier && userIdentifier.userId) {
      user = await this._getUserById(userIdentifier.userId);
    } else if (userIdentifier && userIdentifier.email) {
      user = await this.findUserByEmail(userIdentifier.email);
    }

    if (!user) {
      throw new NotFoundError("Guest user not found in Entra");
    }

    if (user.userType && user.userType !== "Guest") {
      throw new ConflictError("Redemption reset is only supported for Guest users");
    }

    const resolvedEmail = normalizeEmail(user.mail || (user.otherMails && user.otherMails[0]) || user.email);
    if (!resolvedEmail) {
      throw new ConflictError("Unable to resolve guest email for redemption reset");
    }

    const data = await this._request({
      method: "POST",
      url: "/invitations",
      data: {
        invitedUserEmailAddress: resolvedEmail,
        inviteRedirectUrl: this.inviteRedirectUrl,
        sendInvitationMessage: true,
        resetRedemption: true,
        invitedUser: {
          id: user.id
        }
      }
    });

    return {
      id: data.id,
      email: resolvedEmail,
      userId: user.id
    };
  }
}

module.exports = {
  GraphClient
};
