var Hapi = require('hapi');
var Joi      = require('joi');
var Mongoose = require('mongoose');
var S3 = require('s3');

require('../../models');

var Utils = require('../../utils');
var Team = Mongoose.model('Team');

var internals = {};

module.exports = internals = function(server, config) {
    var routes = {};

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

    internals.getTeams = function(request, reply) {
        var limit = Utils.setLimit(request);
        var skip = Utils.setSkip(request);

        var user = request.auth.credentials;

        Team.find({'members._id': user._id}).limit(limit + 1).skip(skip).sort({created_at: 1}).exec(function(err, results) {
            if(err) {
                return reply(err);
            }

            if(!results) {
                results = [];
            }

            var data = {};
            data['hasMore'] = results.length === limit + 1;
            data['records'] = results.slice(0, limit);

            return reply(data);
        });
    };

    routes.getTeams = {
        auth: { strategies: ['hawk'] },
        handler: internals.getTeams,
        description: 'Get all teams.',
        validate: {
            query: {
                limit: Joi.number().integer().min(1).max(+process.env.PAGINATE_LIMIT).description('The number of items wanted.'),
                skip: Joi.number().integer().min(1).description('The number of items to be skipped.')
            }
        }
    };

    internals.getTeam = function(request, reply) {
        var user = request.auth.credentials;
        
        Team.findOne({_id: request.params.id, 'members._id': user._id}).exec(function(err, team) {
            if(err) {
                return reply(err);
            }

            if(!team) {
                return reply(Hapi.error.notFound("This team does not exist"));
            }

            team = team.toObject();

            team.members.sort(Utils.sortUserProfilesAlphabetically);

            return reply(team);  
        });
    };

    routes.getTeam = {
        auth: { strategies: ['hawk'] },
        handler: internals.getTeam,
        description: 'Get a single team.',
        validate: {
            params: {
                id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required().description('The team ID.')
            }
        }
    };

    internals.deleteTeam = function(request, reply) {
        var user = request.auth.credentials;

        Team.remove({_id:request.params.id, 'owners._id': user._id}).exec(function(err, team) {
            if(err) {
                return reply(err);
            }

            if(!team) {
                return reply(Hapi.error.notFound("This team does not exist"));
            }

            reply(team).code(204);

            // Delete the image from S3
            internals.client.knox.del(request.params.id).on('response', function(res) {
                if(res.statusCode > 400) {
                    console.error("Couldn't delete image with filename", request.params.id);
                    return;
                }

                console.log(res.statusCode + ": Successfully deleted image with filename " + request.params._id);
            }).end();
        });
    };

    routes.deleteTeam = {
        auth: { strategies: ['hawk'] },
        handler: internals.deleteTeam,
        description: 'Delete a team.',
        validate: {
            params: {
                id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required().description('The team ID.')
            }
        }
    };
    
    require('./create-team')(routes);
    
    return routes;
};