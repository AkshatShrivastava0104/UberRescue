const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface, Sequelize) {
    // Get driver users
    const users = await queryInterface.sequelize.query(
      'SELECT id, email FROM users WHERE role = \'driver\''
    );
    
    const drivers = users[0].map((user, index) => ({
      id: uuidv4(),
      userId: user.id,
      licenseNumber: `DL${1000000 + index}`,
      vehicleType: ['sedan', 'suv', 'truck'][index % 3],
      vehicleMake: ['Toyota', 'Honda', 'Ford'][index % 3],
      vehicleModel: ['Camry', 'Accord', 'F150'][index % 3],
      vehicleYear: 2020 + (index % 3),
      licensePlate: `ABC${123 + index}`,
      currentLatitude: 37.7749 + (Math.random() - 0.5) * 0.1,
      currentLongitude: -122.4194 + (Math.random() - 0.5) * 0.1,
      isAvailable: true,
      isOnline: index < 2, // First 2 drivers online
      rating: 4.5 + Math.random() * 0.5,
      totalTrips: Math.floor(Math.random() * 100),
      emergencyEquipment: ['first_aid_kit', 'fire_extinguisher', 'emergency_blankets'],
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    await queryInterface.bulkInsert('drivers', drivers, {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('drivers', null, {});
  }
};