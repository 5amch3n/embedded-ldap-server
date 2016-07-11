var crypto = require('crypto');
var SALT = JSON.parse(process.env.PASSWORD_SALT);

exports.encrypt = function(src) {
    return crypto.createHash('sha256').update(SALT[0]+src+SALT[1]).digest('hex');
}
