'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        // Add actualFare column if it doesn't exist
        const tableDescription = await queryInterface.describeTable('rides');
        if (!tableDescription.actualFare) {
            await queryInterface.addColumn('rides', 'actualFare', {
                type: Sequelize.DECIMAL(8, 2),
                allowNull: true
            });
        }
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeColumn('rides', 'actualFare');
    }
};