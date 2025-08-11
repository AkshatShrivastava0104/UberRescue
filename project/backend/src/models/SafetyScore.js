module.exports = (sequelize, DataTypes) => {
  const SafetyScore = sequelize.define('SafetyScore', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    driverId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'drivers',
        key: 'id'
      }
    },
    totalTrips: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    emergencyTrips: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    averageSafetyRating: {
      type: DataTypes.DECIMAL(4, 2),
      defaultValue: 0.00
    },
    hazardZonesAvoided: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    safeRoutesChosen: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    responseTimeAverage: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    completionRate: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 100.00
    },
    emergencyEquipmentUsed: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    lastCalculated: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    overallScore: {
      type: DataTypes.DECIMAL(4, 2),
      defaultValue: 0.00
    }
  }, {
    tableName: 'safety_scores',
    indexes: [
      { fields: ['driverId'] },
      { fields: ['overallScore'] },
      { fields: ['lastCalculated'] }
    ]
  });

  SafetyScore.associate = function(models) {
    SafetyScore.belongsTo(models.Driver, { foreignKey: 'driverId', as: 'driver' });
  };

  return SafetyScore;
};