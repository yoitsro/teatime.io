var Async = require('async');
var Util = require('util');
var Mongoose = require('mongoose');
var Hapi = require('hapi');
var Joi = require('joi');
var S3 = require('s3');
var Fs = require('fs');

var Notifications = require('../notifications');
var Team = Mongoose.model('Team');
var User = Mongoose.model('User');

var TeamUtils = require('./utils');

var internals = {};

module.exports = internals = function(routes) {

    // createClient allows any options that knox does.
    internals.client = S3.createClient({
        key: process.env.AWS_ID,
        secret: process.env.AWS_KEY,
        bucket: process.env.AWS_BUCKET
    });

    // optional headers
    internals.s3Headers = {
        'Content-Type' : 'image/jpg',
        'x-amz-acl'    : 'public-read'
    };

    var createTeam = function(request, reply) {
        /*
         *  Flow:
         *  Create the team
         *  Assign this user as the owner
         *  Add this user to the list of members
         *  For each submitted member:
         *    Does the user exist?
         *      Yes - Add them to this team and send them a notification
         *      No - Create the user, add them to this team, and send them an email invite
         *  Save team
         */
        
        var team = new Team();

        console.log('the payload: ', request.payload.jsonData.name);
        
        var uploader = internals.client.upload(request.payload.image.path, team._id, internals.headers);
        uploader.on('error', function(err) {
            console.error("unable to upload:", err.stack);
            Fs.unlink(request.payload.image.path, function (err) {
                if (err) {
                    console.error(err);
                }
            });
        });

        uploader.on('progress', function(amountDone, amountTotal) {
            console.log("uploading image", amountDone, amountTotal);
        });

        uploader.on('end', function(url) {
            Fs.unlink(request.payload.image.path, function (err) {
                if (err) {
                    console.error(err);
                }
            });
            team.name = request.payload.jsonData.name;
            team.image = url;

            if(request.payload.jsonData.loc) {
                team.loc = request.payload.jsonData.loc;
            }

            if(request.payload.searchable) {
                team.searchable = request.payload.jsonData.searchable;
            }

            var user = request.auth.credentials;
            team.owners = [user.desensitize()];
            team.members = [user.desensitize()];

            team.save(function(err, team) {
                if(err) {
                    if(err.code === 11000) {
                        var error = Hapi.error.badRequest("Uh oh! A team with that name already exists!");
                        error.output.statusCode = 409;
                        error.reformat();

                        return reply(error);
                    }
                    return reply(err);

                }
                // Lookup the users 
                TeamUtils.lookupUsersByEmailOrId(request.payload.jsonData.members, function(err, users, hashmap) {
                    if(err) {
                        return reply(Hapi.error.internal('Something went wrong', err));
                    }

                    // Add the users to the team and remove them from the hashmap
                    users.forEach(function(user) {
                        team.members.addToSet(user.desensitize());

                        // If a user is found, if they're not registered, they still need an invite email
                        if(!user.registered) {
                            hashmap[user.email] = user.email;
                            return;
                        }

                        delete hashmap[user._id];
                        delete hashmap[user.email];
                    });

                    // Create users and send an email to them
                    TeamUtils.createRemainingUsers(Object.keys(hashmap), function(err, newUsers) {
                        if(err) {
                            console.error(err);
                        }

                        newUsers.forEach(function(user) {
                            team.members.addToSet(user.desensitize());
                        });

                        team.save(function(err, team) {
                            if(err) {
                                console.error(err);
                            }
                            reply(team).code(201).header('Location', '/teams/' + team._id);

                            // Make sure you're not sending a notification to yourself!
                            var usersToSendANotificationTo = [];

                            team.members.forEach(function(member) {
                                if(member._id.toString() === request.auth.credentials._id.toString() || member.registered === false) {
                                    return;
                                }

                                usersToSendANotificationTo.push(member);
                            });

                            Notifications.sendNotificationToUsers(Util.format("You've been invited to join the team %s", team.name), usersToSendANotificationTo);
                            TeamUtils.inviteRemainingUsers(newUsers, team, request.auth.credentials);

                        });
                    });

                });
            });
        });

        
    };

    routes.createTeam = {
        auth: { strategies: ['hawk'] },
        handler: createTeam,
        description: 'Create a team.',
        validate: {
            payload: {
                jsonData: Joi.object({
                    name: Joi.string().min(2).max(100).required().description('The team name.'),
                    members: Joi.array().includes(Joi.string().email(), Joi.string().regex(/^[0-9a-fA-F]{24}$/)).required().description('The team members as an array of email addresses.'),
                    loc: Joi.array().length(2).includes(Joi.number().min(-180).max(180)).description('The team\'s location.'),
                    searchable: Joi.boolean().description('Can the team be publicly discovered?')
                }),
                image: Joi.any().required().description('The team image.')
            }
        },
        payload: {
            parse: true,
            output: 'file',
            uploads: 'uploads',
            maxBytes: 3145728
        }
    };





    var updateTeam = function(request, reply) {
        if(!request.payload) {
            return reply(Hapi.error.badRequest('Please specify what you want to update'));
        }

        var usersToSendAnInviteTo = [];

        var performUpdate = function(update) {
            Team.findOneAndUpdate({_id:request.params.id}, update, function(err, team) {
                if(err) {
                    console.error(err);
                }

                reply(team);
                //inviteRemainingUsers(usersToSendAnInviteTo, team, request.auth.credentials);
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
                    console.error(err);
                }

                if(users.length === 0) {
                    return performUpdate(update);
                }

                users = users.map(function(user) {
                    return user.desensitize();
                });

                update.$addToSet.owners = users;
                return performUpdate(update);
            });
        }
    };



    routes.updateTeam = {
        auth: { strategies: ['hawk'] },
        handler: updateTeam,
        description: 'Update a team.',
        validate: {
            path: {
                id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required().description('The team ID.')
            },
            payload: {
                name: Joi.string().min(2).max(100).description('The team name.'),
                owners: Joi.array().includes(Joi.string().regex(/^[0-9a-fA-F]{24}$/)).description('The team owners as an array of ids.'),
                loc: Joi.array().length(2).includes(Joi.number().min(-180).max(180)).description('The team\'s location.'),
                searchable: Joi.boolean().description('The team\'s discoverability.')
            }
        }
    };
};




