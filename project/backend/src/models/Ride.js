module.exports = (sequelize, DataTypes) => {
  const Ride = sequelize.define('Ride', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
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
      allowNull: true,
      references: {
        model: 'drivers',
        key: 'id'
      }
    },
    pickupLatitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: false
    },
    pickupLongitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: false
    },
    pickupAddress: {
      type: DataTypes.STRING,
      allowNull: false
    },
    destinationLatitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: false
    },
    destinationLongitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: false
    },
    destinationAddress: {
      type: DataTypes.STRING,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM(
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
      type: DataTypes.ENUM('normal', 'sos'),
      defaultValue: 'normal'
    },
    estimatedFare: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: true
    },
    actualFare: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: true
    },
    distance: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: true
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    safetyRating: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 10
      }
    },
    route: {
      type: DataTypes.JSON,
      allowNull: true
    },
    hazardZonesAvoided: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    emergencyNotes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'rides',
    indexes: [
      { fields: ['riderId'] },
      { fields: ['driverId'] },
      { fields: ['status'] },
      { fields: ['rideType'] },
      { fields: ['createdAt'] }
    ]
  });

  Ride.associate = function(models) {
    Ride.belongsTo(models.User, { foreignKey: 'riderId', as: 'rider' });
    Ride.belongsTo(models.Driver, { foreignKey: 'driverId', as: 'driver' });
  };

  return Ride;
};