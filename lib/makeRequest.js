'use strict';

var HTTPDigest = require('./digest');

module.exports = function(request) {
  return function (options) {
    var auth = options.auth;

    var isBasic = true;
    if (auth) {
      if (auth.username) {
        if (auth.type === 'basic') {
          options.auth = auth.username + ':' + auth.password;
        } else if (auth.type === 'digest') {
          isBasic = false;
        } else {
          throw new Error('Unknown authorization type ' + auth.type);
        }
      }
    }

    if (isBasic) {
      return request(options);
    } else {
      delete options.auth;
      return new HTTPDigest(auth.username, auth.password, request).request(options);
    }
  };
};
