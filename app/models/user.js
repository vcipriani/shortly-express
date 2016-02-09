var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');

bcrypt = Promise.promisifyAll(bcrypt);

var User = db.Model.extend({
  tableName: 'users',
  hasTimestamps: true,
  // initialize: function() {
  //   this.on('creating', function(model) {
  //     return bcrypt.hashAsync(model.get('password'), null, null)
  //       .then(function(hash) {
  //         model.set('password', hash);
  //       });
  //   });
  // },
  // isSamePw: function(unhashedPw) {
  //   return bcrypt.compareAsync(unhashedPw, this.get('password'));
  // }
});


module.exports = User;