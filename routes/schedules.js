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
const Comment = require('../models/comment');//21章 コメントの表示の実装
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
  });//22章 予定編集を反映させる実装でまとめて関数化
});
//19章 予定作成フォームから送られた情報を保存ここまで

//19章 予定と出欠表の表示画面を作成 ここから
//21章 で以下リファクタリング
router.get('/:scheduleId', authenticationEnsurer, (req, res, next) => {
  let storedSchedule = null;//他の Promise オブジェクトへの処理をまたぎたいので
  let storedCandidates = null;//then に渡す関数のスコープの外側に変数宣言
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
      return Candidate.findAll({//結果を then 関数の return で返す
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
    
    //21章 コメントの表示の実装ここから
    // コメント取得
    return Comment.findAll({
      where: { scheduleId: storedSchedule.scheduleId }
      //予定IDで絞り込んだすべてのコメント
    }).then((comments) => {
      const commentMap = new Map();  // key: userId, value: comment
      comments.forEach((comment) => {
        commentMap.set(comment.userId, comment.comment);
      });//連想配列 commentMap に格納
      res.render('schedule', {
        user: req.user,
        schedule: storedSchedule,
        candidates: storedCandidates,
        users: users,
        availabilityMapMap: availabilityMapMap,
        commentMap: commentMap
      });//テンプレートに commentMap というプロパティ名で割り当ててテンプレートを描画
      //21章 コメントの表示の実装ここまで
    });
  });
});

// 22章予定編集フォームの実装ここから
router.get('/:scheduleId/edit', authenticationEnsurer, csrfProtection, (req, res, next) => {//[csrfProtection]24章 CSRF 脆弱性対策
  //URL は、予定表示のページの末尾に /edit を加えたもの
  Schedule.findOne({
    where: {
      scheduleId: req.params.scheduleId
    }//指定された予定 ID の予定を取得
  }).then((schedule) => {
    if (isMine(req, schedule)) { // 作成者のみが編集フォームを開ける
      //isMine という関数を別途用意して、自身の予定であればその後の処理を行う
      Candidate.findAll({//候補を取得
        where: { scheduleId: schedule.scheduleId },
        order: [['"candidateId"', 'ASC']]//作成順に並ぶように candidateId の昇順で
      }).then((candidates) => {
        res.render('edit', {//テンプレート edit を描画
          user: req.user,
          schedule: schedule,
          candidates: candidates,
          csrfToken: req.csrfToken()//24章 CSRF 脆弱性対策
        });
      });
    } else {
      const err = new Error('指定された予定がない、または、予定する権限がありません');
      err.status = 404;//404 Not Found のステータスを返す
      next(err);
    }
  });
});

function isMine(req, schedule) {//isMine という関数の別途用意
  return schedule && parseInt(schedule.createdBy) === parseInt(req.user.id);
  //リクエストと予定のオブジェクトを受け取り、
  //その予定が自分のものであるかの 真偽値を返す関数
}
// 22章予定編集フォームの実装ここまで

//22章 予定編集を反映させる実装ここから
router.post('/:scheduleId', authenticationEnsurer, csrfProtection, (req, res, next) => {//[csrfProtection]24章 CSRF 脆弱性対策
  Schedule.findOne({
    where: {
      scheduleId: req.params.scheduleId
    }//予定 ID で予定を取得
  }).then((schedule) => {
    if (schedule && isMine(req, schedule)) {//リクエストの送信者が作成者であるかをチェック
      if (parseInt(req.query.edit) === 1) {//edit=1 のクエリがあるときのみ更新　?
        const updatedAt = new Date();
        schedule.update({//予定の更新（ SQL における UPDATE 文に対応）
          scheduleId: schedule.scheduleId,
          scheduleName: req.body.scheduleName.slice(0, 255) || '（名称未設定）',
          memo: req.body.memo,
          createdBy: req.user.id,
          updatedAt: updatedAt
        }).then((schedule) => {
          // 追加されているかチェック
          const candidateNames = parseCandidateNames(req);//候補日程の配列をパース(分解/解釈)する関数
          if (candidateNames) {//追加候補がある
            createCandidatesAndRedirect(candidateNames, schedule.scheduleId, res);
            //関数は下部記載
          } else {
            res.redirect('/schedules/' + schedule.scheduleId);
          }
        });
        //22章 削除機能の実装 ここから
      } else if (parseInt(req.query.delete) === 1) {//elete=1 というクエリが渡された時
        deleteScheduleAggregate(req.params.scheduleId, () => {
          res.redirect('/');//予定を消してからリダイレクト
        });//22章 削除機能の実装 ここまで
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

//22章 削除機能の実装 ここから
//deleteScheduleAggregate関数はtest/test.jsと共有
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
//22章 削除機能の実装 ここまで

function createCandidatesAndRedirect(candidateNames, scheduleId, res) {
  //候補日程の配列、予定 ID 、レスポンスオブジェクトを受け取り、 
  //候補の作成とリダイレクトを行う関数
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
  //すでに存在したリクエストから予定名の配列をパースする処理を、
  //parseCandidateNames という関数名で切り出す　？
  return req.body.candidates.trim().split('\n').map((s) => s.trim()).filter((s) => s !== "");
}
//22章 予定編集を反映させる実装ここまで
module.exports = router;
