var Hapi = require('hapi');
var Joi      = require('joi');
var Mongoose = require('mongoose');

require('../../../models');

var Util = require('util');
var Utils = require('../../../utils');
var Notifications = require('../../notifications');
var Team = Mongoose.model('Team');
var Round = Mongoose.model('Round');
var Order = Mongoose.model('Order');


var User = Mongoose.model('User');

module.exports = function(server, config) {

    var routes = {};

    var getRounds = function(request, reply) {
        var limit = Utils.setLimit(request);
        var skip = Utils.setSkip(request);

        var user = request.auth.credentials;
        var query = {team: request.params.id, 'members._id': user._id};
        
        var status = request.query.status;

        if(status) {
            query.status = status;
        }

        Round.find(query).skip(skip).limit(limit + 1).exec(function(err, rounds) {
            if(err) {
                return reply(err);
            }

            if(!rounds) {
                return reply(Hapi.error.notFound("This round does not exist"));
            }

            var data = {};
            data['hasMore'] = rounds.length === limit + 1;
            data['records'] = rounds.slice(0, limit);

            return reply(data);
        });
    };

    routes.getRounds = {
        auth: { strategies: ['hawk'] },
        handler: getRounds,
        description: 'Get a team\'s rounds.',
        validate: {
            params: {
                id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required().description('The team ID.')
            },
            query: {
                limit: Joi.number().integer().min(1).max(+process.env.PAGINATE_LIMIT).description('The number of items wanted.'),
                skip: Joi.number().integer().min(1).description('The number of items to be skipped.'),
                status: Joi.string().valid(['open', 'closed']).description('Filter by status (defaults to all rounds).')
            }
        }
    };

    var getRound = function(request, reply) {
        var user = request.auth.credentials;

        Round.findOne({_id: request.params.roundId, team: request.params.id, 'members._id': user._id}).exec(function(err, round) {
            if(err) {
                return reply(err);
            }

            if(!round) {
                return reply(Hapi.error.notFound("This round does not exist"));
            }

            return reply(round);
        });
    };

    routes.getRound = {
        auth: { strategies: ['hawk'] },
        handler: getRound,
        description: 'Get a single round for a team.',
        validate: {
            params: {
                id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required().description('The team ID.'),
                roundId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required().description('The round ID.')
            }
        }
    };

    var createRound = function(request, reply) {
        var user = request.auth.credentials;

        Team.findOne({_id: request.params.id, 'members._id': user._id}, {_id: 1, members: 1}).exec(function(err, team) {
            if(err) {
                return reply(err);
            }

            if(!team) {
                return reply(Hapi.error.notFound("This team does not exist")); 
            }
            
            var owner = user.desensitize();

            var tr = new Round({status: "open", owner: owner, members: team.members, team: team._id});

            tr.save(function(err, tr) {
                if(err) {
                    return reply(err);
                }
                var message = Util.format("It's teatime! %s is making a round. Place your order now!", user.name.first);
                Notifications.sendNotificationToUsers(message, tr.members);

                reply(tr).code(201).header('Location', '/teams/' + request.params.id + '/tea-rounds/' + tr._id);
            });

        });
    };

    routes.createRound = {
        auth: { strategies: ['hawk'] },
        handler: createRound,
        description: 'Create a new round for a team.',
        validate: {
            params: {
                id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required().description('The team ID.')
            }
        }
    };

    var deleteRound = function(request, reply) {
        var user = request.auth.credentials;

        Round.remove({_id: request.params.roundId, team: request.params.id, 'owner._id': user._id}).exec(function(err, teaRound) {
            if(err) {
                return reply(err);
            }

            if(!teaRound) {
                return reply(Hapi.error.notFound("This tea round does not exist"));
            }

            return reply().code(204);
        });
    };

    routes.deleteRound = {
        auth: { strategies: ['hawk'] },
        handler: deleteRound,
        description: 'Delete a team\'s round.',
        validate: {
            params: {
                id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required().description('The team ID.'),
                roundId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required().description('The round ID.')
            }
        }
    };

    return routes;

};