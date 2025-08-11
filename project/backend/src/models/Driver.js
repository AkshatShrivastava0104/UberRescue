module.exports = (sequelize, DataTypes) => {
  const Driver = sequelize.define('Driver', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    licenseNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    vehicleType: {
      type: DataTypes.STRING,
      allowNull: false
    },
    vehicleMake: {
      type: DataTypes.STRING,
      allowNull: false
    },
    vehicleModel: {
      type: DataTypes.STRING,
      allowNull: false
    },
    vehicleYear: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    licensePlate: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    currentLatitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true
    },
    currentLongitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true
    },
    isAvailable: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    isOnline: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    rating: {
      type: DataTypes.DECIMAL(3, 2),
      defaultValue: 5.00
    },
    totalTrips: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    emergencyEquipment: {
      type: DataTypes.JSON,
      defaultValue: []
    }
  }, {
    tableName: 'drivers',
    indexes: [
      { fields: ['userId'] },
      { fields: ['isAvailable'] },
      { fields: ['isOnline'] },
      { fields: ['currentLatitude', 'currentLongitude'] }
    ]
  });

  Driver.associate = function(models) {
    Driver.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    Driver.hasMany(models.Ride, { foreignKey: 'driverId', as: 'rides' });
    Driver.hasMany(models.SafetyScore, { foreignKey: 'driverId', as: 'safetyScores' });
  };

  return Driver;
};