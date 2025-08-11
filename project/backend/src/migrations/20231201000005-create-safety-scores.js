'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('safety_scores', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      driverId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'drivers',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      totalTrips: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      emergencyTrips: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      averageSafetyRating: {
        type: Sequelize.DECIMAL(4, 2),
        defaultValue: 0.00
      },
      hazardZonesAvoided: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      safeRoutesChosen: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      responseTimeAverage: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      completionRate: {
        type: Sequelize.DECIMAL(5, 2),
        defaultValue: 100.00
      },
      emergencyEquipmentUsed: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      lastCalculated: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      overallScore: {
        type: Sequelize.DECIMAL(4, 2),
        defaultValue: 0.00
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

    await queryInterface.addIndex('safety_scores', ['driverId']);
    await queryInterface.addIndex('safety_scores', ['overallScore']);
    await queryInterface.addIndex('safety_scores', ['lastCalculated']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('safety_scores');
  }
};