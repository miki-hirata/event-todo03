'use strict';//18章 sequalize の記法の定義に沿ってスケジュールのデータモデルを実装
const { sequelize, DataTypes } = require('./sequelize-loader');//sequelize-loader.js読み込み

const Schedule = sequelize.define(
  'schedules',
  {
    scheduleId: {
      type: DataTypes.UUID,//Universally Unique Identifier
      primaryKey: true,
      allowNull: false
    },
    scheduleName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    memo: {
      type: DataTypes.TEXT,//長さに制限の無い文字列
      allowNull: false
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false
    }
  },
  {
    freezeTableName: true,
    timestamps: false,
    indexes: [
      {//インデックスで検索を早くする
        fields: ['createdBy']
      }
    ]
  }
);

module.exports = Schedule;
