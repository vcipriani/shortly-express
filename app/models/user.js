var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');

var promisfyBcrypt = Promise.promisifyAll(bcrypt);

var User = db.Model.extend({
  tableName: 'users',
  hasTimestamps: true,
  initialize: function() {
    this.on('creating', function(model) {
      return promisfyBcrypt.hashAsync(model.get('password'), null, null)
        .then(function(hash) {
          model.set('password', hash);
        });
    });
  }
});


module.exports = User;