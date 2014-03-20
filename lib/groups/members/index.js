var Hapi = require('hapi');
var Mongoose = require('mongoose');

var Group = Mongoose.model('Group');

var Util = require('util');
var Utils = require('../../../utils');
var GroupsUtils = require('../utils');
var Notifications = require('../../notifications');


module.exports = function(server, config) {

    var routes = {};

    var getMembers = function(request, reply) {
        var limit = Utils.setLimit(request);
        var skip = Utils.setSkip(request);

        var user = request.auth.credentials;

        Group.findOne({_id: request.params.id, 'members._id': user._id}, {members:{$slice: [skip, limit + 1]}}).exec(function(err, group) {
            if(err) {
                return reply(err);
            }

            if(!group) {
                return reply(Hapi.error.notFound("This group does not exist"));
            }

            var data = {};
            data['hasMore'] = group.members.sort(Utils.sortUserProfilesAlphabetically).length === limit + 1;
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

    var getMember = function(request, reply) {
        var user = request.auth.credentials;

        Group.findOne({_id: request.params.id, 'members._id': user._id}, {members: 1}).exec(function(err, group) {
            if(err) {
                return reply(err);
            }

            if(!group) {
                return reply(Hapi.error.notFound("This group does not exist"));
            }

            console.log(group.members);

            var member = group.members.id(request.params.memberId);

            if(!member) {
                return reply(Hapi.error.notFound("This member does not exist"));
            }

            return reply(member);  
        });
    };

    routes.getMember = {
        auth: { strategies: ['hawk'] },
        handler: getMember,
        validate: {
            path: {
                id: Hapi.types.string().regex(/^[0-9a-fA-F]{24}$/).required(),
                memberId: Hapi.types.string().regex(/^[0-9a-fA-F]{24}$/).required()
            }
        }
    };

    var addMembers = function(request, reply) {
        var user = request.auth.credentials;

        // Check if the group exists first and that this user is a part of it
        Group.findOne({_id:request.params.id, 'members._id': user._id}, function(err, group) {
            if(err) {
                return reply(Hapi.error.internal('Something went wrong', err));
            }

            if(!group) {
                return reply(Hapi.error.notFound("This group does not exist"));
            }

            // Find these users
            GroupsUtils.lookupUsersByEmailOrId(request.payload.members, function(err, users, hashmap) {
                if(err) {
                    return reply(Hapi.error.internal('Something went wrong', err));
                }

                // Set 'users' as already registered users
                var registeredUsers = users.map(function(user) {
                    // If a user is found, if they're not registered, they still need an invite email
                    if(!user.registered) {
                        hashmap[user.email] = user.email;
                        return;
                    }

                    delete hashmap[user._id];
                    delete hashmap[user.email];

                    return user.desensitize();
                });

                // Remove null values
                registeredUsers = registeredUsers.filter(function(n){ return n !== undefined && n !== null }); // (JS 1.6 and above)

                // Figure out if the registered users are part of the group already or not
                var registeredUsersWhoAreNotPartOfThisGroup = registeredUsers.filter(function(u) {
                    // If the registered user is not part of this group, return true
                    var match = group.members.some(function(m) {

                        // Return true if the ids match
                        return m._id.toString() === u._id.toString()
                    });
                    return !match;
                });

                // Create users and send an email to them
                GroupsUtils.createRemainingUsers(Object.keys(hashmap), function(err, newUsers) {
                    if(err) {
                        console.error(err);
                    }

                    // Add these new members to the group
                    newUsers.forEach(function(user) {
                        users.push(user);
                    });

                    if(users.length === 0) {
                        return reply(group);
                    }

                    users.forEach(function(u) {
                        group.members.addToSet(u.desensitize());
                    });

                    group.save(function(err, group) {
                        if(err) {
                            return reply(err);
                        }
                        reply(group);

                        // Send invite to remaining users
                        GroupsUtils.inviteRemainingUsers(newUsers, group, request.auth.credentials);

                        // Logic
                        // User can submit email addresses or ObjectIds of people they want to be added to the group
                        // We look those users up
                        // If they exist, we add them to the group, then we just send them a notification
                        // If they don't exist, we create them, add them to the group, and send them an email

                        Notifications.sendNotificationToUsers(Util.format("You've been added to the group %s", group.name), registeredUsersWhoAreNotPartOfThisGroup);

                    });
                });
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







    var deleteMember = function(request, reply) {
        var user = request.auth.credentials;

        Group.findOne({_id: request.params.id, 'members._id': user._id}, {members: 1, owners: 1}).exec(function(err, group) {
            if(err) {
                return reply(err);
            }

            if(!group) {
                return reply(Hapi.error.notFound("This group does not exist"));
            };

            var member = group.members.id(request.params.memberId);

            if(!member) {
                return reply(Hapi.error.notFound("This member does not exist"));
            }

            // If the member trying to be deleted is not the user, then only the owner of the group can delete users
            if(user._id.toString() !== request.params.memberId) {
                // Check for ownership
                if(!group.owners.id(user._id)) {
                    return reply(Hapi.error.unauthorized("You must be the group's owner to delete members"));
                }
            }

            group.members.pull({_id: user._id});

            group.save(function(err) {
                if(err) {
                    return reply(err);
                }

                return reply().code(204);
            });

        });
    };

    routes.deleteMember = {
        auth: { strategies: ['hawk'] },
        handler: deleteMember,
        validate: {
            path: {
                id: Hapi.types.string().regex(/^[0-9a-fA-F]{24}$/).required(),
                memberId: Hapi.types.string().regex(/^[0-9a-fA-F]{24}$/).required()
            },
            query: {
                limit: Hapi.types.number().integer().min(1).max(process.env.PAGINATE_LIMIT),
                skip: Hapi.types.number().integer().min(1)
            }
        }
    };

    return routes;
};