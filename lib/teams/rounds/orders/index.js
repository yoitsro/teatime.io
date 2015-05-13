var Hapi = require('hapi');
var Joi      = require('joi');
var Mongoose = require('mongoose');

require('../../../../models');

var Util = require('util');
var Utils = require('../../../../utils');
var Notifications = require('../../../notifications');
var Team = Mongoose.model('Team');
var Round = Mongoose.model('Round');
var Order = Mongoose.model('Order');

module.exports = function(server, config) {
    var routes = {};

    var getOrders = function(request, reply) {
        var limit = Utils.setLimit(request);
        var skip = Utils.setSkip(request);

        var user = request.auth.credentials;

        Round.findOne({team: request.params.id, 'members._id': user._id}, {orders: {$slice:[skip, limit +1]}}).exec(function(err, round) {
            if(err) {
                return reply(err);
            }

            if(!round) {
                return reply(Hapi.error.notFound("This tea round does not exist"));
            }

            var data = {};
            data['hasMore'] = round.orders.length === limit + 1;
            data['records'] = round.orders.slice(0, limit);

            return reply(data);
        });
    };

    routes.getOrders = {
        auth: { strategies: ['hawk'] },
        handler: getOrders,
        description: 'Get a round\'s orders.',
        validate: {
            params: {
                id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required().description('The team ID.'),
                roundId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required().description('The round ID.')
            },
            query: {
                limit: Joi.number().integer().min(1).max(+process.env.PAGINATE_LIMIT).description('The number of items wanted.'),
                skip: Joi.number().integer().min(1).description('The number of items to be skipped.')
            }
        }
    };






    var getOrder = function(request, reply) {
        var limit = Utils.setLimit(request);
        var skip = Utils.setSkip(request);

        var user = request.auth.credentials;

        Round.findOne({team: request.params.id, 'members._id': user._id}, {orders: 1}).exec(function(err, round) {
            if(err) {
                return reply(err);
            }

            var order = round.orders.id(request.params.orderId);

            if(!order) {
                return reply(Hapi.error.notFound("This tea round order does not exist"));
            }

            return reply(order);
        });
    };

    routes.getOrder = {
        auth: { strategies: ['hawk'] },
        handler: getOrder,
        description: 'Get a single order from a round',
        validate: {
            params: {
                id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required().description('The team ID.'),
                roundId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required().description('The round ID.'),
                orderId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required().description('The order ID.')
            },
            query: {
                limit: Joi.number().integer().min(1).max(+process.env.PAGINATE_LIMIT).description('The number of items wanted.'),
                skip: Joi.number().integer().min(1).description('The number of items to be skipped.')
            }
        }
    };






    var createOrder = function(request, reply) {

        var user = request.auth.credentials;

        var owner = user.desensitize();

        var order = new Order({
            owner: owner,
            order: request.payload.order,
            details: request.payload.details
        });

        Round.findOne({_id: request.params.roundId, team: request.params.id, 'members._id': user._id}, function(err, round) {
            if(err) {
                return reply(err);
            }

            if(!round) {
                return reply(Hapi.error.notFound("This tea round does not exist"));
            }

            var orderAlreadyPlaced = false;
            round.orders.every(function(o) {
                if(o.owner._id.toString() === user._id.toString()) {
                    orderAlreadyPlaced = true;
                    return false; // Stop looping
                }
                return true; // Keep looping
            });

            if(orderAlreadyPlaced) {
                return reply(Hapi.error.forbidden('You\'ve already place an order for this round'));
            }

            round.orders.push(order);

            round.save(function(err) {
                if(err) {
                    return reply(err);
                }

                return reply(order).code(201).header('Location', '/teams/' + request.params.id + '/rounds/' + request.params.roundId + "/orders/" + order._id);

            });

        });
    };

    routes.createOrder = {
        auth: { strategies: ['hawk'] },
        handler: createOrder,
        validate: {
            params: {
                id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required().description('The team ID.'),
                roundId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required().description('The round ID.')
            },
            payload: {
                order: Joi.string().min(1).max(100).required(),
                details: Joi.string().max(250)
            }
        }
    };




    var updateOrder = function(request, reply) {
        if(!request.payload) {
            return reply(Hapi.error.badRequest('Please specify what you want to update'));
        }

        var user = request.auth.credentials;

        var update = {
            $set: {
                'orders.$.order': request.payload.order ? request.payload.order : null,
                'orders.$.details': request.payload.details ? request.payload.details : null
            }
        };

        Round.findOneAndUpdate({_id: request.params.roundId, team: request.params.id, 'orders.owner._id': user._id }, update).exec(function(err, round) {
            if(err) {
                return reply(err);
            }

            if(!round) {
                return reply(Hapi.error.notFound("This tea round does not exist"));
            }

            var order = round.orders.id(request.params.orderId);

            if(!order) {
                return reply(Hapi.error.notFound("This tea round order does not exist"));
            }
            return reply(order);
        });
    };

    routes.updateOrder = {
        auth: { strategies: ['hawk'] },
        handler: updateOrder,
        validate: {
            params: {
                id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required().description('The team ID.'),
                roundId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required().description('The round ID.'),
                orderId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required().description('The order ID.')
            },
            payload: {
                order: Joi.string().min(1).max(100),
                details: Joi.string().max(250)
            }
        }
    };




    var deleteOrder = function(request, reply) {
        var user = request.auth.credentials;

        Round.findOne({_id: request.params.roundId, team: request.params.id, 'members._id': user._id}, {orders: 1}).exec(function(err, round) {
            if(err) {
                return reply(err);
            }

            var order = round.orders.id(request.params.orderId);

            if(!order) {
                return reply(Hapi.error.notFound("This tea round order does not exist"));
            }

            if(order.owner._id.toString() !== user._id.toString()) {
                return reply(Hapi.error.unauthorized("Uh oh! Please check that you're the owner of this comment."));
            }

            round.orders.pull({_id: order._id});

            round.save(function(err) {
                if(err) {
                    return reply(err);
                }

                return reply().code(204);
            });

        });
    };

    routes.deleteOrder = {
        auth: { strategies: ['hawk'] },
        handler: deleteOrder,
        validate: {
            params: {
                id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required().description('The team ID.'),
                roundId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required().description('The round ID.'),
                orderId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required().description('The order ID.')
            }
        }
    };

    return routes;
};