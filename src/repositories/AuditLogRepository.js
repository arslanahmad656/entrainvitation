"use strict";

class AuditLogRepository {
  constructor(model) {
    this.model = model;
  }

  _toPlain(record) {
    return record ? record.get({ plain: true }) : null;
  }

  async createEntry(payload, options = {}) {
    const record = await this.model.create({
      actor_oid: payload.actor_oid || null,
      action: payload.action,
      target_email: payload.target_email || null,
      target_oid: payload.target_oid || null,
      result: payload.result,
      correlation_id: payload.correlation_id,
      created_at: payload.created_at || new Date()
    }, {
      transaction: options.transaction
    });

    return this._toPlain(record);
  }
}

module.exports = {
  AuditLogRepository
};
