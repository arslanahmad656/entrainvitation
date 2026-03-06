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

    await queryInterface.createTable("Users", {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      entra_oid: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true
      },
      tenant_id: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      email: {
        type: Sequelize.STRING(256),
        allowNull: true
      },
      display_name: {
        type: Sequelize.STRING(256),
        allowNull: true
      },
      user_type: {
        type: Sequelize.STRING(50),
        allowNull: true
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

    await queryInterface.addIndex("Users", ["entra_oid"], {
      unique: true,
      name: "IX_Users_entra_oid"
    });
    await queryInterface.addIndex("Users", ["email"], {
      name: "IX_Users_email"
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("Users");
  }
};
