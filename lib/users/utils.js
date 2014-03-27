var Async = require('async');
var Mongoose = require('mongoose');
var Team = Mongoose.model('Team');
var Round = Mongoose.model('Round');


var updateTeamOwnersWithNewUserInfo = function(user, cb) {
    Team.update({'owners._id': user._id}, { $set: { 'owners.$': user.desensitize() }}, {multi:true}, function(err, numAffected) {
        if(err) {
            console.error(err);
        }

        return cb();
    });
};


var updateTeamMembersWithNewUserInfo = function(user, cb) {
    Team.update({'members._id': user._id}, { $set: { 'members.$': user.desensitize() }}, {multi:true}, function(err, numAffected) {
        if(err) {
            console.error(err);
        }

        console.log(numAffected);

        return cb();
    });
};

var updateRoundMembersWithNewUserInfo = function(user, cb) {
    Round.update({'members._id': user._id}, { $set: { 'members.$': user.desensitize() }}, {multi:true}, function(err, numAffected) {
        if(err) {
            console.error(err);
        }
        
        return cb();
    });
};

var updateRoundOwnersWithNewUserInfo = function(user, cb) {
    Round.update({'owner._id': user._id}, { $set: { 'owner': user.desensitize() }}, {multi:true}, function(err, numAffected) {
        if(err) {
            console.error(err);
        }
        
        return cb();
    });
};

var updateOrdersWithNewUserInfo = function(user, cb) {
    Round.update({'orders.owner._id': user._id}, { $set: { 'orders.$.owner': user.desensitize() }}, {multi:true}, function(err, numAffected) {
        if(err) {
            console.error(err);
        }
        
        return cb();
    });
};


exports.updateUserInformationGlobally = function(user, callback) {
    Async.parallel(
        [
            updateTeamMembersWithNewUserInfo.bind(this, user),
            updateTeamOwnersWithNewUserInfo.bind(this, user),
            updateRoundMembersWithNewUserInfo.bind(this, user),
            updateRoundOwnersWithNewUserInfo.bind(this, user),
            updateOrdersWithNewUserInfo.bind(this, user)
        ],
        callback
    );
};