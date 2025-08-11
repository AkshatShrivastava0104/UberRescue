const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface, Sequelize) {
    const hashedPassword = await bcrypt.hash('password123', 12);
    
    const users = [
      {
        id: uuidv4(),
        email: 'rider1@example.com',
        password: hashedPassword,
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1234567890',
        role: 'rider',
        emergencyContact: '+0987654321',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: uuidv4(),
        email: 'rider2@example.com',
        password: hashedPassword,
        firstName: 'Jane',
        lastName: 'Smith',
        phone: '+1234567891',
        role: 'rider',
        emergencyContact: '+0987654322',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: uuidv4(),
        email: 'driver1@example.com',
        password: hashedPassword,
        firstName: 'Mike',
        lastName: 'Johnson',
        phone: '+1234567892',
        role: 'driver',
        emergencyContact: '+0987654323',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: uuidv4(),
        email: 'driver2@example.com',
        password: hashedPassword,
        firstName: 'Sarah',
        lastName: 'Wilson',
        phone: '+1234567893',
        role: 'driver',
        emergencyContact: '+0987654324',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: uuidv4(),
        email: 'driver3@example.com',
        password: hashedPassword,
        firstName: 'David',
        lastName: 'Brown',
        phone: '+1234567894',
        role: 'driver',
        emergencyContact: '+0987654325',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    await queryInterface.bulkInsert('users', users, {});
    return users;
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('users', null, {});
  }
};