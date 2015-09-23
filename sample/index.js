require('babel/register')({
  optional: ['es7.decorators'],
});

global.Promise = require('bluebird');

require('./demo');
