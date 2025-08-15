const { v4: uuidv4 } = require('uuid');

module.exports = {
    async up(queryInterface, Sequelize) {
        // Get users and drivers
        const users = await queryInterface.sequelize.query(
            'SELECT id, role FROM users WHERE role = \'rider\''
        );
        const drivers = await queryInterface.sequelize.query(
            'SELECT id FROM drivers'
        );

        if (users[0].length === 0 || drivers[0].length === 0) {
            console.log('No users or drivers found, skipping ride seeding');
            return;
        }

        const rides = [];
        const rideHistory = [];

        // Create some sample rides
        for (let i = 0; i < 5; i++) {
            const rider = users[0][Math.floor(Math.random() * users[0].length)];
            const driver = drivers[0][Math.floor(Math.random() * drivers[0].length)];
            const rideType = Math.random() > 0.7 ? 'sos' : 'normal';
            const status = ['completed', 'in_progress', 'cancelled'][Math.floor(Math.random() * 3)];

            const pickupLat = 37.7749 + (Math.random() - 0.5) * 0.1;
            const pickupLng = -122.4194 + (Math.random() - 0.5) * 0.1;
            const destLat = 37.7749 + (Math.random() - 0.5) * 0.1;
            const destLng = -122.4194 + (Math.random() - 0.5) * 0.1;

            const distance = Math.random() * 20 + 5; // 5-25 km
            const duration = Math.ceil(distance / 40 * 60); // minutes
            const estimatedFare = 5.00 + (distance * 1.50);
            const actualFare = status === 'completed' ? estimatedFare + (Math.random() - 0.5) * 2 : null;

            const rideId = uuidv4();
            const createdAt = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000); // Last 30 days

            rides.push({
                id: rideId,
                riderId: rider.id,
                driverId: driver.id,
                pickupLatitude: pickupLat,
                pickupLongitude: pickupLng,
                pickupAddress: `${pickupLat.toFixed(4)}, ${pickupLng.toFixed(4)}`,
                destinationLatitude: destLat,
                destinationLongitude: destLng,
                destinationAddress: `${destLat.toFixed(4)}, ${destLng.toFixed(4)}`,
                status,
                rideType,
                estimatedFare: Math.round(estimatedFare * 100) / 100,
                actualFare: actualFare ? Math.round(actualFare * 100) / 100 : null,
                distance: Math.round(distance * 100) / 100,
                duration,
                safetyRating: Math.floor(Math.random() * 3) + 8, // 8-10
                route: [
                    { lat: pickupLat, lng: pickupLng },
                    { lat: destLat, lng: destLng }
                ],
                hazardZonesAvoided: [],
                emergencyNotes: rideType === 'sos' ? 'Emergency evacuation needed' : null,
                createdAt,
                updatedAt: createdAt
            });

            // Add to ride history if completed
            if (status === 'completed') {
                rideHistory.push({
                    id: uuidv4(),
                    rideId,
                    riderId: rider.id,
                    driverId: driver.id,
                    completedAt: new Date(createdAt.getTime() + duration * 60 * 1000),
                    totalDistance: Math.round(distance * 100) / 100,
                    totalDuration: duration,
                    safetyScore: Math.floor(Math.random() * 3) + 8,
                    hazardZonesEncountered: [],
                    routeEfficiency: Math.random() * 20 + 80, // 80-100%
                    riderRating: Math.floor(Math.random() * 2) + 4, // 4-5
                    driverRating: Math.floor(Math.random() * 2) + 4, // 4-5
                    evacuationType: rideType === 'sos' ? 'emergency' : 'normal',
                    createdAt,
                    updatedAt: createdAt
                });
            }
        }

        await queryInterface.bulkInsert('rides', rides, {});
        if (rideHistory.length > 0) {
            await queryInterface.bulkInsert('ride_history', rideHistory, {});
        }
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.bulkDelete('ride_history', null, {});
        await queryInterface.bulkDelete('rides', null, {});
    }
};