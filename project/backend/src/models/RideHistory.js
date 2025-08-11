module.exports = (sequelize, DataTypes) => {
  const RideHistory = sequelize.define('RideHistory', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    rideId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'rides',
        key: 'id'
      }
    },
    riderId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    driverId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'drivers',
        key: 'id'
      }
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: false
    },
    totalDistance: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: false
    },
    totalDuration: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    safetyScore: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 10
      }
    },
    hazardZonesEncountered: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    routeEfficiency: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true
    },
    riderRating: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 5
      }
    },
    driverRating: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 5
      }
    },
    evacuationType: {
      type: DataTypes.ENUM('normal', 'emergency'),
      defaultValue: 'normal'
    }
  }, {
    tableName: 'ride_history',
    indexes: [
      { fields: ['rideId'] },
      { fields: ['riderId'] },
      { fields: ['driverId'] },
      { fields: ['completedAt'] },
      { fields: ['safetyScore'] }
    ]
  });

  RideHistory.associate = function(models) {
    RideHistory.belongsTo(models.Ride, { foreignKey: 'rideId', as: 'ride' });
    RideHistory.belongsTo(models.User, { foreignKey: 'riderId', as: 'rider' });
    RideHistory.belongsTo(models.Driver, { foreignKey: 'driverId', as: 'driver' });
  };

  return RideHistory;
};