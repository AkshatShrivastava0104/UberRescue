const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface, Sequelize) {
    const hazardZones = [
      {
        id: uuidv4(),
        name: 'Downtown Flood Zone',
        type: 'flood',
        severity: 7,
        coordinates: [
          [37.7849, -122.4094],
          [37.7849, -122.4194],
          [37.7749, -122.4194],
          [37.7749, -122.4094]
        ],
        centerLatitude: 37.7799,
        centerLongitude: -122.4144,
        radius: 2.5,
        isActive: true,
        description: 'Major flooding due to storm drainage overflow',
        alertLevel: 'high',
        externalId: 'SF-FLOOD-001',
        lastUpdated: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: uuidv4(),
        name: 'Mission District Fire',
        type: 'fire',
        severity: 9,
        coordinates: [
          [37.7599, -122.4194],
          [37.7599, -122.4094],
          [37.7499, -122.4094],
          [37.7499, -122.4194]
        ],
        centerLatitude: 37.7549,
        centerLongitude: -122.4144,
        radius: 3.0,
        isActive: true,
        description: 'Wildfire spreading rapidly through residential area',
        alertLevel: 'critical',
        externalId: 'SF-FIRE-002',
        lastUpdated: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: uuidv4(),
        name: 'Golden Gate Park Storm',
        type: 'storm',
        severity: 5,
        coordinates: [
          [37.7694, -122.4862],
          [37.7694, -122.4462],
          [37.7594, -122.4462],
          [37.7594, -122.4862]
        ],
        centerLatitude: 37.7644,
        centerLongitude: -122.4662,
        radius: 4.0,
        isActive: true,
        description: 'Severe thunderstorm with high winds',
        alertLevel: 'medium',
        externalId: 'SF-STORM-003',
        lastUpdated: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    await queryInterface.bulkInsert('hazard_zones', hazardZones, {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('hazard_zones', null, {});
  }
};