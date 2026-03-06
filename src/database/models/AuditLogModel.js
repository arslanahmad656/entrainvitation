"use strict";

const { DataTypes } = require("sequelize");

function defineAuditLogModel(sequelize) {
  return sequelize.define("AuditLog", {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    actor_oid: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    action: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    target_email: {
      type: DataTypes.STRING(256),
      allowNull: true
    },
    target_oid: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    result: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    correlation_id: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false
    }
  }, {
    tableName: "AuditLogs",
    timestamps: false
  });
}

module.exports = {
  defineAuditLogModel
};
