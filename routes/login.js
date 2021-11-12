'use strict';
const express = require('express');
const router = express.Router();

router.get('/', (req, res, next) => {
  const from = req.query.from;
  if (from) {
    res.cookie('loginFrom', from, { expires: new Date(Date.now() + 600000)});
  }//24章ログインできなかった際のリダイレクト:ログインページ表示時にどこからログインしようとしたかを、 保存期間を 10 分として Cookie に保存してから、ログインページを描画
  res.render('login');
});

module.exports = router;
