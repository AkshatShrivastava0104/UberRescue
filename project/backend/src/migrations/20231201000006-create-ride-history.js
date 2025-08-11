'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ride_history', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      rideId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'rides',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      riderId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
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
      completedAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      totalDistance: {
        type: Sequelize.DECIMAL(8, 2),
        allowNull: false
      },
      totalDuration: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      safetyScore: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      hazardZonesEncountered: {
        type: Sequelize.JSON,
        defaultValue: []
      },
      routeEfficiency: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true
      },
      riderRating: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      driverRating: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      evacuationType: {
        type: Sequelize.ENUM('normal', 'emergency'),
        defaultValue: 'normal'
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

    await queryInterface.addIndex('ride_history', ['rideId']);
    await queryInterface.addIndex('ride_history', ['riderId']);
    await queryInterface.addIndex('ride_history', ['driverId']);
    await queryInterface.addIndex('ride_history', ['completedAt']);
    await queryInterface.addIndex('ride_history', ['safetyScore']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('ride_history');
  }
};