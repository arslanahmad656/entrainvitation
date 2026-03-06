"use strict";

function getDateType(queryInterface, Sequelize) {
  return Sequelize.DATE;
}

function getNowLiteral(queryInterface, Sequelize) {
  return Sequelize.literal("CURRENT_TIMESTAMP");
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const dateType = getDateType(queryInterface, Sequelize);
    const nowLiteral = getNowLiteral(queryInterface, Sequelize);

    await queryInterface.createTable("AuditLogs", {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      actor_oid: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      action: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      target_email: {
        type: Sequelize.STRING(256),
        allowNull: true
      },
      target_oid: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      result: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      correlation_id: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      created_at: {
        type: dateType,
        allowNull: false,
        defaultValue: nowLiteral
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("AuditLogs");
  }
};
