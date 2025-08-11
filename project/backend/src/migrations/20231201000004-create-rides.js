'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('rides', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
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
        allowNull: true,
        references: {
          model: 'drivers',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      pickupLatitude: {
        type: Sequelize.DECIMAL(10, 8),
        allowNull: false
      },
      pickupLongitude: {
        type: Sequelize.DECIMAL(11, 8),
        allowNull: false
      },
      pickupAddress: {
        type: Sequelize.STRING,
        allowNull: false
      },
      destinationLatitude: {
        type: Sequelize.DECIMAL(10, 8),
        allowNull: false
      },
      destinationLongitude: {
        type: Sequelize.DECIMAL(11, 8),
        allowNull: false
      },
      destinationAddress: {
        type: Sequelize.STRING,
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM(
          'pending',
          'accepted',
          'driver_en_route',
          'arrived',
          'in_progress',
          'completed',
          'cancelled'
        ),
        defaultValue: 'pending'
      },
      rideType: {
        type: Sequelize.ENUM('normal', 'sos'),
        defaultValue: 'normal'
      },
      estimatedFare: {
        type: Sequelize.DECIMAL(8, 2),
        allowNull: true
      },
      actualFare: {
        type: Sequelize.DECIMAL(8, 2),
        allowNull: true
      },
      distance: {
        type: Sequelize.DECIMAL(8, 2),
        allowNull: true
      },
      duration: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      safetyRating: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      route: {
        type: Sequelize.JSON,
        allowNull: true
      },
      hazardZonesAvoided: {
        type: Sequelize.JSON,
        defaultValue: []
      },
      emergencyNotes: {
        type: Sequelize.TEXT,
        allowNull: true
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

    await queryInterface.addIndex('rides', ['riderId']);
    await queryInterface.addIndex('rides', ['driverId']);
    await queryInterface.addIndex('rides', ['status']);
    await queryInterface.addIndex('rides', ['rideType']);
    await queryInterface.addIndex('rides', ['createdAt']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('rides');
  }
};