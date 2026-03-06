"use strict";

class AuditLogService {
  constructor(auditLogRepository, logger) {
    this.auditLogRepository = auditLogRepository;
    this.logger = logger;
  }

  async record(entry, options = {}) {
    return this.auditLogRepository.createEntry({
      actor_oid: entry.actorOid || null,
      action: entry.action,
      target_email: entry.targetEmail || null,
      target_oid: entry.targetOid || null,
      result: entry.result,
      correlation_id: entry.correlationId,
      created_at: entry.createdAt || new Date()
    }, options);
  }

  async recordSafe(entry, options = {}) {
    try {
      return await this.record(entry, options);
    } catch (error) {
      this.logger.warn("Audit log write failed", {
        correlationId: entry.correlationId,
        action: entry.action,
        errorMessage: error.message
      });
      return null;
    }
  }
}

module.exports = {
  AuditLogService
};
