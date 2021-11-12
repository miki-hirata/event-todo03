'use strict';//18章 sequalize の記法の定義に沿って出欠のデータモデルを実装
const {sequelize, DataTypes} = require('./sequelize-loader');

const Availability = sequelize.define(
  'availabilities',
  {
    candidateId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false
    },
    userId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false
    },
    availability: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    scheduleId: {
      type: DataTypes.UUID,
      allowNull: false
    }
  },
  {
    freezeTableName: true,
    timestamps: false,
    indexes: [
      {
        fields: ['scheduleId']
      }
    ]
  }
);

module.exports = Availability;
