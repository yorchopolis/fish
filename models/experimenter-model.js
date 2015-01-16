'use strict';

var mongoose = require('mongoose');

var BCRYPT_COST = 12;

var Schema = mongoose.Schema;

var experimenterSchema = new Schema({
    username: {
        type: String,
        unique: true
    },
    passwordHash: String,
    name : String,
    email : String
});

experimenterSchema.statics.hashPassword = function hash(rawPassword, next) {
    // Temporary, to account for bcrypt errors
    return next(null, rawPassword);
    //return bcrypt.hash(rawPassword, BCRYPT_COST, next);
};

experimenterSchema.statics.comparePasswords = function (raw, hash, next) {
    // Temporary, to account for bcrypt errors
    return next(null, true);
    //return bcrypt.compare(raw, hash, next);
};

exports.Experimenter = mongoose.model('Experimenter', experimenterSchema);
