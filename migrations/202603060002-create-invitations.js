"use strict";

function getDateType(queryInterface, Sequelize) {
  return queryInterface.sequelize.getDialect() === "mssql" ? "DATETIME2" : Sequelize.DATE;
}

function getNowLiteral(queryInterface, Sequelize) {
  return queryInterface.sequelize.getDialect() === "mssql"
    ? Sequelize.literal("SYSUTCDATETIME()")
    : Sequelize.literal("CURRENT_TIMESTAMP");
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const dateType = getDateType(queryInterface, Sequelize);
    const nowLiteral = getNowLiteral(queryInterface, Sequelize);

    await queryInterface.createTable("Invitations", {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      email: {
        type: Sequelize.STRING(256),
        allowNull: false
      },
      target_role_value: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      target_app_role_id: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      graph_user_id: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      invited_by_entra_oid: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      status: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      created_at: {
        type: dateType,
        allowNull: false,
        defaultValue: nowLiteral
      },
      updated_at: {
        type: dateType,
        allowNull: false,
        defaultValue: nowLiteral
      }
    });

    await queryInterface.addIndex("Invitations", ["email"], {
      name: "IX_Invitations_email"
    });
    await queryInterface.addIndex("Invitations", ["graph_user_id"], {
      name: "IX_Invitations_graph_user_id"
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("Invitations");
  }
};
