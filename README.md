# Super HTTP Client

Overview
------

Extends the node http library with digest authorisation (thanks to the
[http-digest-client](https://github.com/simme/node-http-digest-client) package; this code is taken and modified and can be
found in [digest.js](lib/digest.js)), and wraps it all up in a nice Promises based API (rather than the callback API typical of node).

Usage
------

Install:

```
npm install extra-lo
```

Basic usage:

```javascript

var request = require('super-http-client');

  var promise = request({
    auth: {
      type: 'digest',
      username: 'username',
      password: 'password'
    },
    host: 'localhost',
    path: '/myRestAPI',
    port: 8000,
    method: 'PUT',
    headers: {'Content-type': contentType || 'application/json'},
    content: '{"someKey": "someValue"}'
  });
  
  promise.then(function(result){console.log(result);});
```
