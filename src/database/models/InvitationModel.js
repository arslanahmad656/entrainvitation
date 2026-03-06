"use strict";

const { DataTypes } = require("sequelize");

function defineInvitationModel(sequelize) {
  return sequelize.define("Invitation", {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    email: {
      type: DataTypes.STRING(256),
      allowNull: false
    },
    target_role_value: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    target_app_role_id: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    graph_user_id: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    invited_by_entra_oid: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    status: {
      type: DataTypes.STRING(50),
      allowNull: false
    }
  }, {
    tableName: "Invitations",
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        fields: ["email"]
      },
      {
        fields: ["graph_user_id"]
      }
    ]
  });
}

module.exports = {
  defineInvitationModel
};
