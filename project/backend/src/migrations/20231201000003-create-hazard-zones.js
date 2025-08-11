'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('hazard_zones', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      type: {
        type: Sequelize.ENUM('flood', 'fire', 'earthquake', 'storm', 'other'),
        allowNull: false
      },
      severity: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      coordinates: {
        type: Sequelize.JSON,
        allowNull: false
      },
      centerLatitude: {
        type: Sequelize.DECIMAL(10, 8),
        allowNull: false
      },
      centerLongitude: {
        type: Sequelize.DECIMAL(11, 8),
        allowNull: false
      },
      radius: {
        type: Sequelize.DECIMAL(8, 2),
        allowNull: false
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      alertLevel: {
        type: Sequelize.ENUM('low', 'medium', 'high', 'critical'),
        defaultValue: 'medium'
      },
      externalId: {
        type: Sequelize.STRING,
        allowNull: true
      },
      lastUpdated: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    await queryInterface.addIndex('hazard_zones', ['type']);
    await queryInterface.addIndex('hazard_zones', ['severity']);
    await queryInterface.addIndex('hazard_zones', ['isActive']);
    await queryInterface.addIndex('hazard_zones', ['alertLevel']);
    await queryInterface.addIndex('hazard_zones', ['centerLatitude', 'centerLongitude']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('hazard_zones');
  }
};