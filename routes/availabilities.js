'use strict';//20章 出欠更新の Web API の実装
const express = require('express');
const router = express.Router();
const authenticationEnsurer = require('./authentication-ensurer');
const Availability = require('../models/availability');

router.post('/:scheduleId/users/:userId/candidates/:candidateId', authenticationEnsurer, (req, res, next) => {
  const scheduleId = req.params.scheduleId;
  const userId = req.params.userId;
  const candidateId = req.params.candidateId;
  let availability = req.body.availability;
  availability = availability ? parseInt(availability) : 0;
  //パスから予定 ID, ユーザー ID, 候補 ID を受け取り、 
  //POST のリクエストに含まれる availability というプロパティで

  Availability.upsert({
    scheduleId: scheduleId,
    userId: userId,
    candidateId: candidateId,
    availability: availability
    //データベースを更新する
  }).then(() => {
    res.json({ status: 'OK', availability: availability });
    //更新後は、 JSONで上記値が戻る
  });
});

module.exports = router;
