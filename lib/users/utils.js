var Async = require('async');
var Mongoose = require('mongoose');
var Group = Mongoose.model('Group');
var Round = Mongoose.model('Round');


var updateGroupOwnersWithNewUserInfo = function(user, cb) {
    Group.update({'owners._id': user._id}, { $set: { 'owners.$': user.desensitize() }}, function(err, numAffected) {
        if(err) {
            console.error(err);
        }

        return cb();
    });
};


var updateGroupMembersWithNewUserInfo = function(user, cb) {
    Group.update({'members._id': user._id}, { $set: { 'members.$': user.desensitize() }}, function(err, numAffected) {
        if(err) {
            console.error(err);
        }

        return cb();
    });
};

var updateRoundMembersWithNewUserInfo = function(user, cb) {
    Round.update({'members._id': user._id}, { $set: { 'members.$': user.desensitize() }}, function(err, numAffected) {
        if(err) {
            console.error(err);
        }
        
        return cb();
    });
};

var updateRoundOwnersWithNewUserInfo = function(user, cb) {
    Round.update({'owner._id': user._id}, { $set: { 'owner': user.desensitize() }}, function(err, numAffected) {
        if(err) {
            console.error(err);
        }
        
        return cb();
    });
};

var updateOrdersWithNewUserInfo = function(user, cb) {
    Round.update({'orders.owner._id': user._id}, { $set: { 'orders.$.owner': user.desensitize() }}, function(err, numAffected) {
        if(err) {
            console.error(err);
        }
        
        return cb();
    });
};


exports.updateUserInformationGlobally = function(user, callback) {
    Async.parallel(
        [
            updateGroupMembersWithNewUserInfo.bind(this, user),
            updateGroupOwnersWithNewUserInfo.bind(this, user),
            updateRoundMembersWithNewUserInfo.bind(this, user),
            updateRoundOwnersWithNewUserInfo.bind(this, user),
            updateOrdersWithNewUserInfo.bind(this, user)
        ],
        callback
    );
};