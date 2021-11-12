'use strict';// 19章 ログイン時にしか表示されない予定作成フォームを作成
const express = require('express');
const router = express.Router();
const authenticationEnsurer = require('./authentication-ensurer');
// 19章認証を確かめるハンドラ関数 routes/authentication-ensurer.js が ある前提で実装
const uuid = require('uuid');//19章 UUID の 文字列を取得（yarn add uuid@3.3.2でインストール）
const Schedule = require('../models/schedule');
const Candidate = require('../models/candidate');
const User = require('../models/user');//19章 ユーザーのデータモデル読み込み
const Availability = require('../models/availability');//20章 出欠のモデルの読み込み
const Comment = require('../models/comment');
const csrf = require('csurf');//24章 CSRF 脆弱性対策
const csrfProtection = csrf({ cookie: true });//24章 CSRF 脆弱性対策

router.get('/new', authenticationEnsurer, csrfProtection, (req, res, next) => {//[csrfProtection]24章 CSRF 脆弱性対策
  res.render('new', { user: req.user, csrfToken: req.csrfToken() });
});

//19章 予定作成フォームから送られた情報を保存ここから
router.post('/', authenticationEnsurer, csrfProtection, (req, res, next) => {//[csrfProtection]24章 CSRF 脆弱性対策
  const scheduleId = uuid.v4();;//予定ID生成（uuid.v4() でUUID の文字列が取得）
  const updatedAt = new Date();//更新日時生成
  Schedule.create({//予定をデータベース内に保存
    scheduleId: scheduleId,
    scheduleName: req.body.scheduleName.slice(0, 255) || '（名称未設定）',
    //予定名は255字以内　空の場合（名称未設定）として予定名を保存
    memo: req.body.memo,
    createdBy: req.user.id,
    updatedAt: updatedAt
  }).then((schedule) => {//予定を保存し終わったら実行
    createCandidatesAndRedirect(parseCandidateNames(req), scheduleId, res);
  });
});
//19章 予定作成フォームから送られた情報を保存ここまで

//19章 予定と出欠表の表示画面を作成 ここから
router.get('/:scheduleId', authenticationEnsurer, (req, res, next) => {
  let storedSchedule = null;
  let storedCandidates = null;
  Schedule.findOne({
    // sequelizeの書き方 テーブルを結合してユーザーを取得
    // findOne関数・・そのデータモデルに対応するデータを1行だけ取得
    include: [
      {
        model: User,
        attributes: ['userId', 'username']
      }],
    where: {
      scheduleId: req.params.scheduleId
    },
    order: [['updatedAt', 'DESC']]
  }).then((schedule) => {//予定が見つかった場合に、その候補一覧を取得
    if (schedule) {
      storedSchedule = schedule;
      return Candidate.findAll({
        where: { scheduleId: schedule.scheduleId },
        order: [['candidateId', 'ASC']]//候補ＩＤの昇順→作られた順
      });
    } else {
      const err = new Error('指定された予定は見つかりません');
      err.status = 404;
      next(err);
    }//19章 予定と出欠表の表示画面を作成 ここまで
  }).then((candidates) => {
    //20章 出欠のモデルの読み込みここから
    // データベースからその予定の全ての出欠を取得する
    storedCandidates = candidates;
    return Availability.findAll({//予定 ID でしぼりこんだ出欠の取得
      include: [
        {
          model: User,
          attributes: ['userId', 'username']
          //後にユーザー情報を利用するため、ユーザー名もテーブルの結合をして取得
        }
      ],
      where: { scheduleId: storedSchedule.scheduleId },
      order: [[User, 'username', 'ASC'], ['"candidateId"', 'ASC']]
      //ユーザー名の昇順、候補 ID の昇順
    });
  }).then((availabilities) => {
    // 出欠 MapMap(キー:ユーザー ID, 値:出欠Map(キー:候補 ID, 値:出欠)) を作成する
    // 出欠のデータがあったものだけを データとして入れ子の連想配列の中に保存
    const availabilityMapMap = new Map(); // key: userId, value: Map(key: candidateId, availability)
    availabilities.forEach((a) => {
      const map = availabilityMapMap.get(a.user.userId) || new Map();
      map.set(a.candidateId, a.availability);
      availabilityMapMap.set(a.user.userId, map);
    });

    // 閲覧ユーザーと出欠に紐づくユーザーからユーザー Map (キー:ユーザー ID, 値:ユーザー) を作る
    const userMap = new Map(); // key: userId, value: User
    userMap.set(parseInt(req.user.id), {
      //出欠のデータを 1 つでも持っていたユーザーをユーザー Mapに含める
      isSelf: true,//閲覧ユーザーである
      userId: parseInt(req.user.id),
      username: req.user.username
    });
    availabilities.forEach((a) => {
      userMap.set(a.user.userId, {
        isSelf: parseInt(req.user.id) === a.user.userId, // 閲覧ユーザー自身であるかを含める
        userId: a.user.userId,
        username: a.user.username
      });
    });

    // 全ユーザー、全候補で二重ループしてそれぞれの出欠の値がない場合には、「欠席」を設定する
    const users = Array.from(userMap).map((keyValue) => keyValue[1]);
    users.forEach((u) => {
      storedCandidates.forEach((c) => {
        const map = availabilityMapMap.get(u.userId) || new Map();
        const a = map.get(c.candidateId) || 0; 
        // 出欠情報が存在しない場合 デフォルト値0 を利用 0=欠席
        map.set(c.candidateId, a);
        availabilityMapMap.set(u.userId, map);
      });
    });
    //20章 出欠のモデルの読み込みここまで

    // コメント取得
    return Comment.findAll({
      where: { scheduleId: storedSchedule.scheduleId }
    }).then((comments) => {
      const commentMap = new Map();  // key: userId, value: comment
      comments.forEach((comment) => {
        commentMap.set(comment.userId, comment.comment);
      });
      res.render('schedule', {
        user: req.user,
        schedule: storedSchedule,
        candidates: storedCandidates,
        users: users,
        availabilityMapMap: availabilityMapMap,
        commentMap: commentMap
      });
    });
  });
});

router.get('/:scheduleId/edit', authenticationEnsurer, csrfProtection, (req, res, next) => {//[csrfProtection]24章 CSRF 脆弱性対策
  Schedule.findOne({
    where: {
      scheduleId: req.params.scheduleId
    }
  }).then((schedule) => {
    if (isMine(req, schedule)) { // 作成者のみが編集フォームを開ける
      Candidate.findAll({
        where: { scheduleId: schedule.scheduleId },
        order: [['"candidateId"', 'ASC']]
      }).then((candidates) => {
        res.render('edit', {
          user: req.user,
          schedule: schedule,
          candidates: candidates,
          csrfToken: req.csrfToken()//24章 CSRF 脆弱性対策
        });
      });
    } else {
      const err = new Error('指定された予定がない、または、予定する権限がありません');
      err.status = 404;
      next(err);
    }
  });
});

function isMine(req, schedule) {
  return schedule && parseInt(schedule.createdBy) === parseInt(req.user.id);
}

router.post('/:scheduleId', authenticationEnsurer, csrfProtection, (req, res, next) => {//[csrfProtection]24章 CSRF 脆弱性対策
  Schedule.findOne({
    where: {
      scheduleId: req.params.scheduleId
    }
  }).then((schedule) => {
    if (schedule && isMine(req, schedule)) {
      if (parseInt(req.query.edit) === 1) {
        const updatedAt = new Date();
        schedule.update({
          scheduleId: schedule.scheduleId,
          scheduleName: req.body.scheduleName.slice(0, 255) || '（名称未設定）',
          memo: req.body.memo,
          createdBy: req.user.id,
          updatedAt: updatedAt
        }).then((schedule) => {
          // 追加されているかチェック
          const candidateNames = parseCandidateNames(req);
          if (candidateNames) {
            createCandidatesAndRedirect(candidateNames, schedule.scheduleId, res);
          } else {
            res.redirect('/schedules/' + schedule.scheduleId);
          }
        });
      } else if (parseInt(req.query.delete) === 1) {
        deleteScheduleAggregate(req.params.scheduleId, () => {
          res.redirect('/');
        });
      } else {
        const err = new Error('不正なリクエストです');
        err.status = 400;
        next(err);
      }
    } else {
      const err = new Error('指定された予定がない、または、編集する権限がありません');
      err.status = 404;
      next(err);
    }
  });
});

function deleteScheduleAggregate(scheduleId, done, err) {
  const promiseCommentDestroy = Comment.findAll({
    where: { scheduleId: scheduleId }
  }).then((comments) => {
    return Promise.all(comments.map((c) => { return c.destroy(); }));
  });

  Availability.findAll({
    where: { scheduleId: scheduleId }
  }).then((availabilities) => {
    const promises = availabilities.map((a) => { return a.destroy(); });
    return Promise.all(promises);
  }).then(() => {
    return Candidate.findAll({
      where: { scheduleId: scheduleId }
    });
  }).then((candidates) => {
    const promises = candidates.map((c) => { return c.destroy(); });
    promises.push(promiseCommentDestroy);
    return Promise.all(promises);
  }).then(() => {
    return Schedule.findByPk(scheduleId).then((s) => { return s.destroy(); });
  }).then(() => {
    if (err) return done(err);
    done();
  });
}

router.deleteScheduleAggregate = deleteScheduleAggregate;

function createCandidatesAndRedirect(candidateNames, scheduleId, res) {
  const candidates = candidateNames.map((c) => {
    return {
      candidateName: c,
      scheduleId: scheduleId
    };
  });
  Candidate.bulkCreate(candidates).then(() => {
    res.redirect('/schedules/' + scheduleId);
  });
}

function parseCandidateNames(req) {
  return req.body.candidates.trim().split('\n').map((s) => s.trim()).filter((s) => s !== "");
}

module.exports = router;
