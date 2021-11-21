'use strict';//19章 ES6 の形で全て書き換え
const express = require('express');
const router = express.Router();
const Schedule = require('../models/schedule');

//23章 宿題　日付の表記改善　yarn add dayjs@1.10.4
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
dayjs.extend(utc);
dayjs.extend(timezone);

/* GET home page. */
router.get('/', (req, res, next) => {
  const title = '予定調整くん';
  if (req.user) {
    Schedule.findAll({//条件があうレコードを全て取得
      where: {
        createdBy: req.user.id//自分が作成した予定をしぼりこみ
      },
      order: [['updatedAt', 'DESC']]//作成日時順にソート
    }).then((schedules) => {
      schedules.forEach((schedule) => {//23章 宿題　日付の表記改善
        schedule.formattedUpdatedAt = dayjs(schedule.updatedAt).tz('Asia/Tokyo').format('YYYY/MM/DD HH:mm');
      });
      res.render('index', {
        title: title,
        user: req.user,
        schedules: schedules
      });
    });
  } else {
    res.render('index', { title: title, user: req.user });
    //>users~ 19章トップ画面にログインへのリンクを作成
    //index.pugに userを割り当て
  }
});

module.exports = router;
