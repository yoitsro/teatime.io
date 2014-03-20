var Async = require('async');
var Util = require('util');
var Mongoose = require('mongoose');
var Hapi = require('hapi');
var Joi = require('joi');

var Notifications = require('../notifications');
var Group = Mongoose.model('Group');
var User = Mongoose.model('User');

var GroupUtils = require('./utils');

module.exports = function(routes) {

    var createGroup = function(request, reply) {
        /*
         *  Flow:
         *  Create the group
         *  Assign this user as the owner
         *  Add this user to the list of members
         *  For each submitted member:
         *    Does the user exist?
         *      Yes - Add them to this group and send them a notification
         *      No - Create the user, add them to this group, and send them an email invite
         *  Save group
         */
        
        var group = new Group();
        group.name = request.payload.name;

        if(request.payload.loc) {
            group.loc = request.payload.loc;
        }

        if(request.payload.searchable) {
            group.searchable = request.payload.searchable;
        }

        var user = request.auth.credentials;

        group.owners = [user.desensitize()];
        group.members = [user.desensitize()];

        group.save(function(err, group) {
            if(err) {
                if(err.code === 11000) {
                    var error = Hapi.error.badRequest("Uh oh! A group with that name already exists!");
                    error.output.statusCode = 409;
                    error.reformat();

                    return reply(error);
                }
                return reply(err);

            }
            // Lookup the users 
            GroupUtils.lookupUsersByEmailOrId(request.payload.members, function(err, users, hashmap) {
                if(err) {
                    return reply(Hapi.error.internal('Something went wrong', err));
                }

                // Add the users to the group and remove them from the hashmap
                users.forEach(function(user) {
                    group.members.addToSet(user.desensitize());

                    // If a user is found, if they're not registered, they still need an invite email
                    if(!user.registered) {
                        hashmap[user.email] = user.email;
                        return;
                    }

                    delete hashmap[user._id];
                    delete hashmap[user.email];
                });

                // Create users and send an email to them
                GroupUtils.createRemainingUsers(Object.keys(hashmap), function(err, newUsers) {
                    if(err) {
                        console.error(err);
                    }

                    newUsers.forEach(function(user) {
                        group.members.addToSet(user.desensitize());
                    });

                    group.save(function(err, group) {
                        if(err) {
                            console.error(err);
                        }

                        reply(group).code(201).header('Location', '/groups/' + group._id);

                        // Make sure you're not sending a notification to yourself!
                        var usersToSendANotificationTo = [];

                        group.members.forEach(function(member) {
                            if(member._id.toString() === request.auth.credentials._id.toString() || member.registered === false) {
                                return;
                            }

                            usersToSendANotificationTo.push(member);
                        });

                        Notifications.sendNotificationToUsers(Util.format("You've been invited to join the group %s", group.name), usersToSendANotificationTo);
                        GroupUtils.inviteRemainingUsers(newUsers, group, request.auth.credentials);

                    });
                });

            });
        });
    };

    routes.createGroup = {
        auth: { strategies: ['hawk'] },
        handler: createGroup,
        validate: {
            payload: {
                name: Hapi.types.string().min(2).max(100).required(),
                members: Hapi.types.array().includes(Hapi.types.string().email(), Hapi.types.string().regex(/^[0-9a-fA-F]{24}$/)).required(),
                loc: Hapi.types.array().length(2).includes(Hapi.types.number().min(-180).max(180)),
                searchable: Hapi.types.boolean()
            }
        }
    };





    var updateGroup = function(request, reply) {
        if(!request.payload) {
            return reply(Hapi.error.badRequest('Please specify what you want to update'));
        }

        var usersToSendAnInviteTo = [];

        var performUpdate = function(update) {
            Group.findOneAndUpdate({_id:request.params.id}, update, function(err, group) {
                if(err) {
                    console.error(err);
                }

                reply(group);
                //inviteRemainingUsers(usersToSendAnInviteTo, group, request.auth.credentials);
            });
        };

        var update = {};
        update.$set = {};
        update.$addToSet = {};

        if(request.payload.name) {
            update.$set.name = request.payload.name;
        }

        if(request.payload.image) {
            update.$set.image = request.payload.image;
        }

        if(request.payload.loc) {
            update.$set.loc = request.payload.loc;
        }

        if(request.payload.searchable) {
            update.$set.searchable = request.payload.searchable;
        }

        if(!request.payload.members && !request.payload.owners) {
            return performUpdate(update);
        }

        if(request.payload.owners) {
            User.find({_id: {$in:request.payload.owners}}, function(err, users) {
                if(err) {
                    return callback(err);
                }

                if(users.length === 0) {
                    return callback();
                }

                users = users.map(function(user) {
                    return user.desensitize();
                });

                update.$addToSet.owners = users;
                return performUpdate(update);
            });
        }
    };



    routes.updateGroup = {
        auth: { strategies: ['hawk'] },
        handler: updateGroup,
        validate: {
            path: {
                id: Hapi.types.string().regex(/^[0-9a-fA-F]{24}$/).required()
            },
            payload: {
                name: Hapi.types.string().min(2).max(100),
                image: Hapi.types.string().min(2).max(300),
                owners: Hapi.types.array().includes(Hapi.types.string().regex(/^[0-9a-fA-F]{24}$/)),
                loc: Hapi.types.array().length(2).includes(Hapi.types.number().min(-180).max(180)),
                searchable: Hapi.types.boolean()
            }
        }
    };
}




