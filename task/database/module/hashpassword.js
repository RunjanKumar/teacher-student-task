const crypto = require('crypto');
require('dotenv').config();

exports.hashPassword =  function hashPassword(str ){
    return crypto.pbkdf2Sync(str, 'salt', 1000 , 64 , 'sha256' ).toString('hex');
}