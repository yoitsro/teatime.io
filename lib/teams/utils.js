var Mongoose = require('mongoose');
var User = Mongoose.model('User');
var Joi = require('joi');
var Async = require('async');
var Util = require('util');
var Notifications = require('../notifications');

exports.lookupUsersByEmailOrId = function(userIds, callback) {
    // Construct the query to look up users by email address or user id
    var queryIds = [];
    var emailAddresses = [];

    // Create a hashmap of the email addresses
    var hashmap = {};

    userIds.forEach(function(userId) {
        // If it's an email address
        if(Joi.validate(userId, Joi.string().email())) {
            emailAddresses.push(userId);
        } else {
            queryIds.push(userId);
            hashmap[userId] = userId;
        }

    });

    // Construct the query
    var query = {
        $or: [
            {_id: { $in: queryIds }},
            {email: { $in: emailAddresses }}
        ]
    };

    // Perform the query
    User.find(query, function(err, users) {
        if(err) {
            return callback(err);
        }

        return callback(null, users, hashmap);
    });
};

exports.inviteRemainingUsers = function(users, team, inviter, callback) {
    // For each user, send them an invite
    Async.each(
        users,
        function(user, cb) {
            var message = Util.format("Hey there hot beverage drinker! You've been invited to join the team '%s' on teatime.io by %s.", team.name, inviter.name.first);
            var subject = Util.format("Drink tea with %s", inviter.name.first);
            Notifications.sendEmailToEmailAddress(message, subject, user.email, function(err) {
                return cb(err);
            });
        },
        function(err) {
            if(callback) {
                return callback(err);
            }
        }
    );
};

exports.createRemainingUsers = function(emailAddresses, callback) {
    var newUsers = [];

    // For each email address, create a new user, save them
    Async.each(
        emailAddresses,
        function(emailAddress, cb) {
            User.findOneAndUpdate({ email: emailAddress }, { email: emailAddress, registered: false }, { upsert: true }, function(err, user) {
                if(err) {
                    console.error(err);
                    return cb();
                }
                newUsers.push(user);
                return cb();
            });
        },
        function(err) {
            if(err) {
                return callback(err);
            }

            return callback(err, newUsers);
        });
};

exports.encodeSpecialCharacters = function(filename) {
  // Note: these characters are valid in URIs, but S3 does not like them for
  // some reason.
  return encodeURI(filename).replace(/[!'()* ]/g, function (char) {
    return '%' + char.charCodeAt(0).toString(16);
  });
};

exports.getPublicS3Url = function (bucket, key, bucketLocation) {
    var hostnamePrefix = bucketLocation ? ("s3-" + bucketLocation) : "s3";
    var parts = {
        protocol: "https:",
        hostname: hostnamePrefix + ".amazonaws.com",
        pathname: "/" + bucket + "/" + exports.encodeSpecialCharacters(key),
    };
    return parts.protocol + "//" + parts.hostname + parts.pathname;
};