const { Sequelize } = require('sequelize');
const config = require('../config/database')[process.env.NODE_ENV || 'development'];

let sequelize;
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(config.database, config.username, config.password, config);
}

const db = {};

// Import models
db.User = require('./User')(sequelize, Sequelize.DataTypes);
db.Driver = require('./Driver')(sequelize, Sequelize.DataTypes);
db.Ride = require('./Ride')(sequelize, Sequelize.DataTypes);
db.HazardZone = require('./HazardZone')(sequelize, Sequelize.DataTypes);
db.RideHistory = require('./RideHistory')(sequelize, Sequelize.DataTypes);
db.SafetyScore = require('./SafetyScore')(sequelize, Sequelize.DataTypes);

// Set up associations
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;