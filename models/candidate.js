'use strict';//18章 sequalize の記法の定義に沿って候補日程のデータモデルを実装
const {sequelize, DataTypes} = require('./sequelize-loader');

const Candidate = sequelize.define(
  'candidates',
  {
    candidateId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    candidateName: {
      type: DataTypes.STRING,
      allowNull: false
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
        fields: ['scheduleId']//予定 ID で大量のデータから検索されることが想定されるので、インデックス
      }
    ]
  }
);

module.exports = Candidate;
