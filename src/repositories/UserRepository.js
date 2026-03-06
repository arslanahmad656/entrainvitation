"use strict";

class UserRepository {
  constructor(model) {
    this.model = model;
  }

  _toPlain(record) {
    return record ? record.get({ plain: true }) : null;
  }

  async findByEntraOid(entraOid, options = {}) {
    const record = await this.model.findOne({
      where: { entra_oid: entraOid },
      transaction: options.transaction
    });

    return this._toPlain(record);
  }

  /**
   * Creates or updates a local user record from Entra token claims.
   * @param {object} payload
   * @param {object} [options]
   * @returns {Promise<object>}
   */
  async upsertFromClaims(payload, options = {}) {
    const transaction = options.transaction;
    const existing = await this.model.findOne({
      where: { entra_oid: payload.entra_oid },
      transaction
    });

    if (existing) {
      await existing.update({
        tenant_id: payload.tenant_id || existing.tenant_id,
        email: payload.email || existing.email,
        display_name: payload.display_name || existing.display_name,
        user_type: payload.user_type || existing.user_type,
        status: payload.status || existing.status
      }, { transaction });

      return this._toPlain(existing);
    }

    const created = await this.model.create({
      entra_oid: payload.entra_oid,
      tenant_id: payload.tenant_id,
      email: payload.email || null,
      display_name: payload.display_name || null,
      user_type: payload.user_type || null,
      status: payload.status
    }, { transaction });

    return this._toPlain(created);
  }

  async updateStatusByEntraOid(entraOid, status, options = {}) {
    const transaction = options.transaction;
    const existing = await this.model.findOne({
      where: { entra_oid: entraOid },
      transaction
    });

    if (!existing) {
      return null;
    }

    await existing.update({ status }, { transaction });
    return this._toPlain(existing);
  }
}

module.exports = {
  UserRepository
};
