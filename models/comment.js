'use strict';//18章 sequalize の記法の定義に沿ってコメントのデータモデルを実装
const {sequelize, DataTypes} = require('./sequelize-loader');

const Comment = sequelize.define(
  'comments',
  {
    scheduleId: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false
    },
    userId: {
      type: DataTypes.DECIMAL,//データ型の指定　
      //googleアカウントのIDが長いので、INTEGER（よく使う整数）からDECIMAL（固定小数点型」）に変更
      primaryKey: true,
      allowNull: false
    },
    comment: {
      type: DataTypes.STRING,
      allowNull: false
    }
  },
  {
    freezeTableName: true,
    timestamps: false
  }
);
//scheduleId と userId で複合主キーを作成し、
//その主キーの作成順番が、scheduleId > userId という順番となってるので
//scheduleId のインデックス設定が不要　→　 主キーのインデックスを使う
module.exports = Comment;
