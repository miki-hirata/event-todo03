'use strict';

function ensure(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login?from=' + req.originalUrl);
  //24章ログインできなかった際のリダイレクト：どこにアクセスしようとしたかを、 /login のクエリに含める
}

module.exports = ensure;