var Async    = require('async');
var Util     = require('util');
var Mongoose = require('mongoose');
var Hapi     = require('hapi');
var Joi      = require('joi');
var Hoek     = require('hoek');
var AWS      = require('aws-sdk');
var Fs       = require('fs');

var Notifications = require('../notifications');
var Team = Mongoose.model('Team');
var User = Mongoose.model('User');

var TeamUtils = require('./utils');

var internals = {};

module.exports = internals = function(routes) {
    internals.s3Config = new AWS.Config({
        accessKeyId: process.env.AWS_ID,
        secretAccessKey: process.env.AWS_KEY,
        bucket: process.env.AWS_BUCKET,
        region: 'eu-west-1'
    });
    internals.s3Client = new AWS.S3(internals.s3Config);


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
        
        // Ensure the json object exists, irrespective if an image was sent
        if (!request.payload.json) {
            var originalPayload = Hoek.clone(request.payload);
            request.payload = {
                json: originalPayload
            }
        }

        team.name = request.payload.json.name;

        if (request.payload.json.loc) {
            team.loc = request.payload.json.loc;
        }

        if (request.payload.searchable) {
            team.searchable = request.payload.json.searchable;
        }

        var user = request.auth.credentials;
        team.owners = [user.desensitize()];
        team.members = [user.desensitize()];

        internals.saveS3Image(request, team, function(err, request, team, url) {
            if (err) {
                return reply(err);
            }
        
            team.image = url;
            team.save(function(err, team) {
                if (err) {
                    if(err.code === 11000) {
                        var error = Hapi.error.badRequest("Uh oh! A team with that name already exists!");
                        error.output.statusCode = 409;
                        error.reformat();

                        return reply(error);
                    }
                    return reply(err);

                }
                // Lookup the users 
                TeamUtils.lookupUsersByEmailOrId(request.payload.json.members, function(err, users, hashmap) {
                    if (err) {
                        return reply(Hapi.error.internal('Something went wrong', err));
                    }

                    // Add the users to the team and remove them from the hashmap
                    users.forEach(function(user) {
                        team.members.addToSet(user.desensitize());

                        // If a user is found, if they're not registered, they still need an invite email
                        if (!user.registered) {
                            hashmap[user.email] = user.email;
                            return;
                        }

                        delete hashmap[user._id];
                        delete hashmap[user.email];
                    });

                    // Create users and send an email to them
                    TeamUtils.createRemainingUsers(Object.keys(hashmap), function(err, newUsers) {
                        if (err) {
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
                                if (member._id.toString() === request.auth.credentials._id.toString() || member.registered === false) {
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

    var createSchema = {
        name: Joi.string().min(2).max(100).description('The team name.'),
        members: Joi.array().includes(Joi.string().email()).min(1).description('The team members as an array of email addresses.'),
        loc: Joi.array().length(2).includes(Joi.number().min(-180).max(180)).description('The team\'s location.'),
        searchable: Joi.boolean().description('Can the team be publicly discovered?')
    };

    routes.createTeam = {
        auth: { strategies: ['hawk'] },
        handler: createTeam,
        description: 'Create a team.',
        validate: {
            payload: Joi.object(createSchema).keys({
                json: Joi.object(createSchema).or('name').with('name', 'members'),                
                image: Joi.alternatives([Joi.binary().encoding('base64'), Joi.binary()]).description('The team image.'),
            }).xor('name', 'json')
        },
        payload: {
            maxBytes: 3145728
        }
        
    };


    internals.saveS3Image = function(request, team, done) {
        if (!request.payload.image) {
            return done(null, request, team);
        }

        // Hack to ensure that if the image is sent as a string, we ignore it.
        // We define a string as anything under 200 bytes long
        if (request.payload.image.length < 200) {
            // Still might be an valid image though. Check it's content
            var bufferAsString = request.payload.image.toString('base64');

            if (bufferAsString.indexOf('http') > -1) {
                return done(null, request, team);                
            }
        }

        // Is the image a string or a buffer?
        var image;

        // If it's a binary, we assume it's just the raw image
        if (Buffer.isBuffer(request.payload.image)) {
            image = request.payload.image;
        } else
        // If it's a string, we assume that it is a base64 string
        if (typeof request.payload.image === 'string') {
            image = new Buffer(request.payload.image, 'base64');
        } else {
            return done(Hapi.error.badRequest('Please use a valid image format.'));
        }

        var params = {
            'ACL': 'public-read',
            'Body': image,
            'Bucket': process.env.AWS_BUCKET,
            'Key': team._id.toString() + '.jpg',
            'ContentType': 'image/jpg'
        };

        // Start the upload
        internals.s3Client.putObject(params, function(err, res) {
            if(err) {
                return done(err);
            }

            // Get the url, assign it to the team object and save
            var url = TeamUtils.getPublicS3Url(params.Bucket, params.Key, internals.s3Config.region);

            return done(null, request, team, url);
        });
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
            params: {
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




