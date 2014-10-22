'use strict';

var http = require('http');
var https = require('https');
var Promise = require('bluebird/js/browser/bluebird');

module.exports = function (options) {
  var resolveRes;
  var rejectRes;
  var reqError;

  var h = options.https ? https : http;

  var _res;

  var req = h.request(options, function (res) {
    var resError;

    if (!reqError) {
      res.on('error', function (err) {
        resError = err;
      });
      if (resError) {
        rejectRes(resError);
      } else {
        if (resolveRes) {
          resolveRes(res);
        } else {
          _res = res;
        }
      }
    }
  });

  req.on('error', function (e) {
    reqError = e;
  });
  if (reqError) {
    throw reqError;
  }

  req.getResponse = function () {
    return new Promise(function (resolve, reject) {
      if (_res) {
        resolve(_res);
      } else {
        resolveRes = resolve;
        rejectRes = reject;
      }
    }).cancellable().catch(Promise.CancellationError, function (e) {
        req.abort();
        throw e;
      });
  };

  return req;
};
