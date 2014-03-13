var Hapi = require('hapi');
var Mongoose = require('mongoose');

var Group = Mongoose.model('Group');

var Utils = require('../../../utils');


module.exports = function(server, config) {

    var routes = {};

    var getMembers = function(request, reply) {
        var limit = Utils.setLimit(request);
        var skip = Utils.setSkip(request);
        Group.findById(request.params.id, {members:{$slice: [skip, limit + 1]}}).exec(function(err, group) {
            if(err) {
                return reply(err);
            }

            if(!group) {
                return reply(Hapi.error.notFound("This group does not exist"));
            }

            var data = {};
            data['hasMore'] = group.members.length === limit + 1;
            data['records'] = group.members.slice(0, limit);

            return reply(data);
        });
    };

    routes.getMembers = {
        auth: { strategies: ['hawk'] },
        handler: getMembers,
        validate: {
            path: {
                id: Hapi.types.string().regex(/^[0-9a-fA-F]{24}$/).required()
            }
        }
    };

    var addMembers = function(callback) {

        var performUpdate = function(update) {
            Group.findOneAndUpdate({_id:request.params.id}, update, function(err, group) {
                if(err) {
                    console.error(err);
                }

                reply(group);
                inviteRemainingUsers(usersToSendAnInviteTo, group, request.auth.credentials);
            });
        };

        // Find these users
        lookupUsersByEmailOrId(request.payload.members, function(err, users, hashmap) {
            if(err) {
                return reply(Hapi.error.internal('Something went wrong', err));
            }

            users = users.map(function(user) {
                // If a user is found, if they're not registered, they still need an invite email
                if(!user.registered) {
                    hashmap[user.email] = user.email;
                    return;
                }

                delete hashmap[user._id];
                delete hashmap[user.email];

                return user.desensitize();
            });

            update.$addToSet.members = {$each: users};

            // Create users and send an email to them
            createRemainingUsers(Object.keys(hashmap), function(err, newUsers) {
                if(err) {
                    console.error(err);
                }

                newUsers.forEach(function(user) {
                    update.$addToSet.members.$each.push(user.desensitize());
                });

                usersToSendAnInviteTo = newUsers;

                callback();

                // var usersToSendANotificationTo = [];

                // group.members.forEach(function(member) {
                //     if(member._id.toString() === request.auth.credentials._id.toString() || member.registered === false) {
                //         return;
                //     }

                //     usersToSendANotificationTo.push(member);
                // });

                // Notifications.sendNotificationToUsers(Util.format("You've been invited to join the group %s", group.name), usersToSendANotificationTo);
            });
        });
    };

    routes.addMembers = {
        auth: { strategies: ['hawk'] },
        handler: addMembers,
        validate: {
            path: {
                id: Hapi.types.string().regex(/^[0-9a-fA-F]{24}$/).required()
            },
            payload: {
                members: Hapi.types.array().includes(Hapi.types.string().email(), Hapi.types.string().regex(/^[0-9a-fA-F]{24}$/))
            }
        }
    };

    return routes;
}