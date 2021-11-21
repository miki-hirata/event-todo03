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
      type: DataTypes.DECIMAL,//データ型の指定　
      //googleアカウントのIDが長いので、INTEGER（よく使う整数）からDECIMAL（固定小数点型」）に変更
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
