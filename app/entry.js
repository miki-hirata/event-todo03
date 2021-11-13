'use strict';//21章 AJAX による出欠の更新で実装
import $ from 'jquery';
globalThis.jQuery = $;//23章 bootstrap Node.js において実行環境のグローバルオブジェクトを参照
import bootstrap from 'bootstrap';//23章 bootstrapの読み込み

$('.availability-toggle-button').each((i, e) => {
  //jQuery: availability-toggle-button という class が 設定されている要素をセレクタで取得
  //各要素に対して引数 i は順番、 引数 e は HTML 要素が渡される関数を実行
  const button = $(e);
  button.click(() => {
    const scheduleId = button.data('schedule-id');
    // jQuery の data 関数を使用して data-* 属性を取得
    const userId = button.data('user-id');
    const candidateId = button.data('candidate-id');
    const availability = parseInt(button.data('availability'));
    //数値の計算をしたいため、 parseInt 関数を利用して文字列から数値に変換
    const nextAvailability = (availability + 1) % 3;
    //次の出欠の数値: 1 を足して 3 の剰余 (0 → 1 → 2 → 0 → 1 → 2 と循環) 
    $.post(`/schedules/${scheduleId}/users/${userId}/candidates/${candidateId}`,
      { availability: nextAvailability },
      //出欠更新の Web API の呼び出し
      (data) => {
        button.data('availability', data.availability);
        const availabilityLabels = ['欠', '？', '出'];
        button.text(availabilityLabels[data.availability]);
      });//実行結果を受け取って button 要素の data-* 属性を更新
  });
});

//- 21章 AJAX によるコメントの更新ここから
const buttonSelfComment = $('#self-comment-button');
buttonSelfComment.click(() => {
  const scheduleId = buttonSelfComment.data('schedule-id');
  const userId = buttonSelfComment.data('user-id');
  const comment = prompt('コメントを255文字以内で入力してください。');
  // prompt 関数を利用 →　コマンドプロンプトでコメントを入力できる
  if (comment) {
    $.post(`/schedules/${scheduleId}/users/${userId}/comments`,
      { comment: comment },
      (data) => {
        $('#self-comment').text(data.comment);
      });
  }
});
//- 21章 AJAX によるコメントの更新ここまで
