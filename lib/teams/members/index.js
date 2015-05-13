var Hapi          = require('hapi');
var Joi           = require('joi');
var Mongoose      = require('mongoose');

var Team          = Mongoose.model('Team');

var Util          = require('util');
var Utils         = require('../../../utils');
var TeamsUtils    = require('../utils');
var Notifications = require('../../notifications');


module.exports = function(server, config) {

    var routes = {};

    var getMembers = function(request, reply) {
        var limit = Utils.setLimit(request);
        var skip = Utils.setSkip(request);

        var user = request.auth.credentials;

        Team.findOne({_id: request.params.id, 'members._id': user._id}, {members:{$slice: [skip, limit + 1]}}).exec(function(err, team) {
            if(err) {
                return reply(err);
            }

            if(!team) {
                return reply(Hapi.error.notFound("This team does not exist"));
            }

            var data = {};
            data['hasMore'] = team.members.sort(Utils.sortUserProfilesAlphabetically).length === limit + 1;
            data['records'] = team.members.slice(0, limit);

            return reply(data);
        });
    };

    routes.getMembers = {
        auth: { strategies: ['hawk'] },
        handler: getMembers,
        description: 'Get team members.',
        validate: {
            params: {
                id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required().description('The team ID.')
            },
            query: {
                limit: Joi.number().integer().min(1).max(+process.env.PAGINATE_LIMIT).description('The number of items wanted.'),
                skip: Joi.number().integer().min(1).description('The number of items to be skipped.')
            }
        }
    };

    var getMember = function(request, reply) {
        var user = request.auth.credentials;

        Team.findOne({_id: request.params.id, 'members._id': user._id}, {members: 1}).exec(function(err, team) {
            if(err) {
                return reply(err);
            }

            if(!team) {
                return reply(Hapi.error.notFound("This team does not exist"));
            }

            var member = team.members.id(request.params.memberId);

            if(!member) {
                return reply(Hapi.error.notFound("This member does not exist"));
            }

            return reply(member);  
        });
    };

    routes.getMember = {
        auth: { strategies: ['hawk'] },
        cache: { expiresIn: 60000 },
        handler: getMember,
        description: 'Get a single team member',
        validate: {
            params: {
                id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required().description('The team ID.'),
                memberId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required().description('The member ID.')
            }
        }
    };

    var addMembers = function(request, reply) {
        var user = request.auth.credentials;

        // Check if the team exists first and that this user is a part of it
        Team.findOne({_id:request.params.id, 'members._id': user._id}, function(err, team) {
            if(err) {
                return reply(Hapi.error.internal('Something went wrong', err));
            }

            if(!team) {
                return reply(Hapi.error.notFound("This team does not exist"));
            }

            // Find these users
            TeamsUtils.lookupUsersByEmailOrId(request.payload.members, function(err, users, hashmap) {
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

                // Figure out if the registered users are part of the team already or not
                var registeredUsersWhoAreNotPartOfThisTeam = registeredUsers.filter(function(u) {
                    // If the registered user is not part of this team, return true
                    var match = team.members.some(function(m) {

                        // Return true if the ids match
                        return m._id.toString() === u._id.toString()
                    });
                    return !match;
                });

                // Create users and send an email to them
                TeamsUtils.createRemainingUsers(Object.keys(hashmap), function(err, newUsers) {
                    if(err) {
                        console.error(err);
                    }

                    // Add these new members to the team
                    newUsers.forEach(function(user) {
                        users.push(user);
                    });

                    if(users.length === 0) {
                        return reply(team);
                    }

                    users.forEach(function(u) {
                        team.members.addToSet(u.desensitize());
                    });

                    team.save(function(err, team) {
                        if(err) {
                            return reply(err);
                        }
                        reply(team);

                        // Send invite to remaining users
                        TeamsUtils.inviteRemainingUsers(newUsers, team, request.auth.credentials);

                        // Logic
                        // User can submit email addresses or ObjectIds of people they want to be added to the team
                        // We look those users up
                        // If they exist, we add them to the team, then we just send them a notification
                        // If they don't exist, we create them, add them to the team, and send them an email

                        Notifications.sendNotificationToUsers(Util.format("You've been added to the team %s", team.name), registeredUsersWhoAreNotPartOfThisTeam);

                    });
                });
            });
        });
    };

    routes.addMembers = {
        auth: { strategies: ['hawk'] },
        handler: addMembers,
        description: 'Add members to a team.',
        validate: {
            params: {
                id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required().description('The team ID.')
            },
            payload: {
                members: Joi.array().single().items(Joi.string().email(), Joi.string().regex(/^[0-9a-fA-F]{24}$/)).required().description('The new members.')
            }
        }
    };







    var deleteMember = function(request, reply) {
        var user = request.auth.credentials;

        Team.findOne({_id: request.params.id, 'members._id': user._id}, {members: 1, owners: 1}).exec(function(err, team) {
            if(err) {
                return reply(err);
            }

            if(!team) {
                return reply(Hapi.error.notFound("This team does not exist"));
            };

            var member = team.members.id(request.params.memberId);

            if(!member) {
                return reply(Hapi.error.notFound("This member does not exist"));
            }

            // If the user is not trying to leave the team, then only the owner of the team can delete users
            if(user._id.toString() !== request.params.memberId) {
                // Check for ownership
                if(!team.owners.id(user._id)) {
                    return reply(Hapi.error.unauthorized("You must be the team's owner to delete members"));
                }
            }

            // The user cannot delete themselves as a member if they are the only owner
            if(team.owners.length === 1) {
                if(team.owners.id(user._id)) {
                    return reply(Hapi.error.unauthorized("You cannot leave this team as you are the only member.\n\nPlease make someone else the owner before trying to leave."));
                }
            }
            

            team.members.pull({_id: user._id});

            team.save(function(err) {
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
        description: 'Remove a member from a team. Only team owners can remove members and members can remove themselves.',
        validate: {
            params: {
                id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required().description('The team ID.'),
                memberId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required().description('The member ID to be removed.')
            },
            query: {
                limit: Joi.number().integer().min(1).max(+process.env.PAGINATE_LIMIT).description('The number of items wanted.'),
                skip: Joi.number().integer().min(1).description('The number of items to be skipped.')
            }
        }
    };

    return routes;
};