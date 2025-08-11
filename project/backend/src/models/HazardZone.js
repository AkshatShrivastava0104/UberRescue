module.exports = (sequelize, DataTypes) => {
  const HazardZone = sequelize.define('HazardZone', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    type: {
      type: DataTypes.ENUM('flood', 'fire', 'earthquake', 'storm', 'other'),
      allowNull: false
    },
    severity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 10
      }
    },
    coordinates: {
      type: DataTypes.JSON,
      allowNull: false
    },
    centerLatitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: false
    },
    centerLongitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: false
    },
    radius: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: false
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    alertLevel: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
      defaultValue: 'medium'
    },
    externalId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    lastUpdated: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'hazard_zones',
    indexes: [
      { fields: ['type'] },
      { fields: ['severity'] },
      { fields: ['isActive'] },
      { fields: ['alertLevel'] },
      { fields: ['centerLatitude', 'centerLongitude'] }
    ]
  });

  return HazardZone;
};