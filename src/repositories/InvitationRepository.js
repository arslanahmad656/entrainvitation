"use strict";

const { Op } = require("sequelize");
const { STATUSES } = require("../constants/statuses");

class InvitationRepository {
  constructor(model) {
    this.model = model;
  }

  _toPlain(record) {
    return record ? record.get({ plain: true }) : null;
  }

  _buildIdentityClauses(identity) {
    const clauses = [];

    if (identity.graph_user_id) {
      clauses.push({ graph_user_id: identity.graph_user_id });
    }

    if (identity.email) {
      clauses.push({ email: identity.email });
    }

    return clauses;
  }

  async findLatestByEmail(email, options = {}) {
    const record = await this.model.findOne({
      where: { email },
      order: [["updated_at", "DESC"], ["id", "DESC"]],
      transaction: options.transaction
    });

    return this._toPlain(record);
  }

  async findByGraphUserId(graphUserId, options = {}) {
    const record = await this.model.findOne({
      where: { graph_user_id: graphUserId },
      order: [["updated_at", "DESC"], ["id", "DESC"]],
      transaction: options.transaction
    });

    return this._toPlain(record);
  }

  async findPendingByIdentity(identity, options = {}) {
    const clauses = this._buildIdentityClauses({
      graph_user_id: identity.graphUserId,
      email: identity.email
    });

    if (!clauses.length) {
      return null;
    }

    const record = await this.model.findOne({
      where: {
        [Op.or]: clauses,
        status: {
          [Op.in]: [
            STATUSES.INVITED,
            STATUSES.PENDING_ACTIVATION,
            STATUSES.REDEMPTION_RESET_REQUIRED
          ]
        }
      },
      order: [["updated_at", "DESC"], ["id", "DESC"]],
      transaction: options.transaction
    });

    return this._toPlain(record);
  }

  /**
   * Upserts a single onboarding invitation record by graph user id or email.
   * @param {object} payload
   * @param {object} [options]
   * @returns {Promise<object>}
   */
  async upsertByIdentity(payload, options = {}) {
    const transaction = options.transaction;
    const clauses = this._buildIdentityClauses(payload);
    let existing = null;

    if (clauses.length) {
      existing = await this.model.findOne({
        where: {
          [Op.or]: clauses
        },
        order: [["updated_at", "DESC"], ["id", "DESC"]],
        transaction
      });
    }

    if (existing) {
      await existing.update({
        email: payload.email || existing.email,
        target_role_value: payload.target_role_value || existing.target_role_value,
        target_app_role_id: payload.target_app_role_id || existing.target_app_role_id,
        graph_user_id: payload.graph_user_id || existing.graph_user_id,
        invited_by_entra_oid: payload.invited_by_entra_oid || existing.invited_by_entra_oid,
        status: payload.status || existing.status
      }, { transaction });

      return this._toPlain(existing);
    }

    const created = await this.model.create({
      email: payload.email,
      target_role_value: payload.target_role_value,
      target_app_role_id: payload.target_app_role_id,
      graph_user_id: payload.graph_user_id || null,
      invited_by_entra_oid: payload.invited_by_entra_oid,
      status: payload.status
    }, { transaction });

    return this._toPlain(created);
  }

  async setStatusById(id, status, options = {}) {
    const transaction = options.transaction;
    const record = await this.model.findByPk(id, { transaction });

    if (!record) {
      return null;
    }

    await record.update({ status }, { transaction });
    return this._toPlain(record);
  }

  async setStatusByGraphUserId(graphUserId, status, options = {}) {
    const transaction = options.transaction;
    const record = await this.model.findOne({
      where: { graph_user_id: graphUserId },
      order: [["updated_at", "DESC"], ["id", "DESC"]],
      transaction
    });

    if (!record) {
      return null;
    }

    await record.update({ status }, { transaction });
    return this._toPlain(record);
  }
}

module.exports = {
  InvitationRepository
};
