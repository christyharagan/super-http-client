/*
 Copyright (c) 2012, Simon Ljungberg <hi@iamsim.me>

 Permission to use, copy, modify, and/or distribute this software for any
 purpose with or without fee is hereby granted, provided that the above
 copyright notice and this permission notice appear in all copies.

 THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
 REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
 AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
 INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
 LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
 OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
 PERFORMANCE OF THIS SOFTWARE.
 */

/*
 * Please see https://github.com/simme/node-http-digest-client for the original version.
 */

'use strict';

//
// # Digest Client
//
// Use together with HTTP Client to perform requests to servers protected
// by digest authentication.
//

var crypto = require('crypto');
var Promise = require('bluebird/js/browser/bluebird');

var HTTPDigest = function (username, password, request) {
  this.nc = 0;
  this.username = username;
  this.password = password;
  this._request = request;
};

//
// ## Make request
//
// Wraps the http.request function to apply digest authorization.
//
HTTPDigest.prototype.request = function (options) {
  var self = this;
  var req = this._request(options);
  req.end();
  return req.getResponse().then(function (res) {
    return self._handleResponse(options, res);
  }).cancellable().catch(Promise.CancellationError, function(e) {
    req.abort();
    throw e;
  });
};

//
// ## Handle authentication
//
// Parse authentication headers and set response.
//
HTTPDigest.prototype._handleResponse = function (options, res) {
  var challenge = this._parseChallenge(res.headers['www-authenticate']);
  var ha1 = crypto.createHash('md5');
  ha1.update([this.username, challenge.realm, this.password].join(':'));
  var ha2 = crypto.createHash('md5');
  ha2.update([options.method, options.path].join(':'));

  // Generate cnonce
  var cnonce = false;
  var nc = false;
  if (typeof challenge.qop === 'string') {
    var cnonceHash = crypto.createHash('md5');
    cnonceHash.update(Math.random().toString(36));
    cnonce = cnonceHash.digest('hex').substr(0, 8);
    nc = this.updateNC();
  }

  // Generate response hash
  var response = crypto.createHash('md5');
  var responseParams = [
    ha1.digest('hex'),
    challenge.nonce
  ];

  if (cnonce) {
    responseParams.push(nc);
    responseParams.push(cnonce);
  }

  responseParams.push(challenge.qop);
  responseParams.push(ha2.digest('hex'));
  response.update(responseParams.join(':'));

  // Setup response parameters
  var authParams = {
    username: this.username,
    realm: challenge.realm,
    nonce: challenge.nonce,
    uri: options.path,
    qop: challenge.qop,
    response: response.digest('hex'),
    opaque: challenge.opaque
  };
  if (cnonce) {
    authParams.nc = nc;
    authParams.cnonce = cnonce;
  }

  var headers = options.headers || {};
  headers.Authorization = this._compileParams(authParams);
  options.headers = headers;
  delete options.auth;

  return this._request(options);
};

//
// ## Parse challenge digest
//
HTTPDigest.prototype._parseChallenge = function (digest) {
  var prefix = 'Digest ';
  var challenge = digest.substr(digest.indexOf(prefix) + prefix.length);
  var parts = challenge.split(',');
  var length = parts.length;
  var params = {};
  for (var i = 0; i < length; i++) {
    var part = parts[i].match(/^\s*?([a-zA-Z0-9]+)="(.*)"\s*?$/);
    if (part.length > 2) {
      params[part[1]] = part[2];
    }
  }

  return params;
};

//
// ## Compose authorization header
//
HTTPDigest.prototype._compileParams = function (params) {
  var parts = [];
  for (var i in params) {
    parts.push(i + '="' + params[i] + '"');
  }
  return 'Digest ' + parts.join(',');
};

//
// ## Update and zero pad nc
//
HTTPDigest.prototype.updateNC = function updateNC() {
  var max = 99999999;
  this.nc++;
  if (this.nc > max) {
    this.nc = 1;
  }
  var padding = new Array(8).join('0') + '';
  var nc = this.nc + '';
  return padding.substr(0, 8 - nc.length) + nc;
};

module.exports = HTTPDigest;
