'use strict';//18章 sequalize の記法の定義に沿ってユーザーのデータモデルを実装
const {sequelize, DataTypes} = require('./sequelize-loader');//sequelize-loader.js読み込み

const User = sequelize.define(
  'users',
  {
    userId: {
      type: DataTypes.DECIMAL,//データ型の指定　
      //googleアカウントのIDが長いので、INTEGER（よく使う整数）からDECIMAL（固定小数点型」）に変更
      primaryKey: true,//主キー
      allowNull: false//null 値を許可しない
    },
    username: {
      type: DataTypes.STRING,//データ型の指定　文字列
      //Google認証ではもらえない？　保留
      //allowNull: false
    }
  },
  {
    freezeTableName: true,//テーブル名とモデル名を一致させるための設定
    //Sequelizeのデフォルトではモデル名の複数形をテーブル名として使うが、テーブル名が複数形になってほしくないので設定
    timestamps: false//テーブルにタイムスタンプを表す列（updatedAt や createdAt）を作成しないための設定
  }
);

module.exports = User;