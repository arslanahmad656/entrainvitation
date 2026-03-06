"use strict";

const { DataTypes } = require("sequelize");

function defineUserModel(sequelize) {
  return sequelize.define("User", {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    entra_oid: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    tenant_id: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(256),
      allowNull: true
    },
    display_name: {
      type: DataTypes.STRING(256),
      allowNull: true
    },
    user_type: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    status: {
      type: DataTypes.STRING(50),
      allowNull: false
    }
  }, {
    tableName: "Users",
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        unique: true,
        fields: ["entra_oid"]
      },
      {
        fields: ["email"]
      }
    ]
  });
}

module.exports = {
  defineUserModel
};
