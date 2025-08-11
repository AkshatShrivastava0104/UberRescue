'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('drivers', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      licenseNumber: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      vehicleType: {
        type: Sequelize.STRING,
        allowNull: false
      },
      vehicleMake: {
        type: Sequelize.STRING,
        allowNull: false
      },
      vehicleModel: {
        type: Sequelize.STRING,
        allowNull: false
      },
      vehicleYear: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      licensePlate: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      currentLatitude: {
        type: Sequelize.DECIMAL(10, 8),
        allowNull: true
      },
      currentLongitude: {
        type: Sequelize.DECIMAL(11, 8),
        allowNull: true
      },
      isAvailable: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      isOnline: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      rating: {
        type: Sequelize.DECIMAL(3, 2),
        defaultValue: 5.00
      },
      totalTrips: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      emergencyEquipment: {
        type: Sequelize.JSON,
        defaultValue: []
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

    await queryInterface.addIndex('drivers', ['userId']);
    await queryInterface.addIndex('drivers', ['isAvailable']);
    await queryInterface.addIndex('drivers', ['isOnline']);
    await queryInterface.addIndex('drivers', ['currentLatitude', 'currentLongitude']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('drivers');
  }
};