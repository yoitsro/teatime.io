var Hapi = require('hapi');
var Mongoose = require('mongoose');

require('../../../models');

var Util = require('util');
var Utils = require('../../../utils');
var Notifications = require('../../notifications');
var Team = Mongoose.model('Team');
var TeaRound = Mongoose.model('TeaRound');
var Order = Mongoose.model('Order');

module.exports = function(server, config) {
    var routes = {};

    var getOrders = function(request, reply) {
        var limit = Utils.setLimit(request);
        var skip = Utils.setSkip(request);

        var user = request.auth.credentials;

        TeaRound.findOne({team: request.params.id, 'members._id': user._id}, {orders: {$slice:[skip, limit +1]}}).exec(function(err, teaRound) {
            if(err) {
                return reply(err);
            }

            if(!teaRound) {
                return reply(Hapi.error.notFound("This tea round does not exist"));
            }

            var data = {};
            data['hasMore'] = teaRound.orders.length === limit + 1;
            data['records'] = teaRound.orders.slice(0, limit);

            return reply(data);
        });
    };

    routes.getOrders = {
        auth: { strategies: ['hawk'] },
        handler: getOrders,
        validate: {
            path: {
                id: Hapi.types.string().regex(/^[0-9a-fA-F]{24}$/).required(),
                roundId: Hapi.types.string().regex(/^[0-9a-fA-F]{24}$/).required()
            },
            query: {
                limit: Hapi.types.number().integer().min(1).max(process.env.PAGINATE_LIMIT),
                skip: Hapi.types.number().integer().min(1)
            }
        }
    };






    var getOrder = function(request, reply) {
        var limit = Utils.setLimit(request);
        var skip = Utils.setSkip(request);

        var user = request.auth.credentials;

        TeaRound.findOne({team: request.params.id, 'members._id': user._id}, {orders: 1}).exec(function(err, teaRound) {
            if(err) {
                return reply(err);
            }

            var order = teaRound.orders.id(request.params.orderId);

            if(!order) {
                return reply(Hapi.error.notFound("This tea round order does not exist"));
            }

            return reply(order);
        });
    };

    routes.getOrder = {
        auth: { strategies: ['hawk'] },
        handler: getOrder,
        validate: {
            path: {
                id: Hapi.types.string().regex(/^[0-9a-fA-F]{24}$/).required(),
                roundId: Hapi.types.string().regex(/^[0-9a-fA-F]{24}$/).required(),
                orderId: Hapi.types.string().regex(/^[0-9a-fA-F]{24}$/).required()
            },
            query: {
                limit: Hapi.types.number().integer().min(1).max(process.env.PAGINATE_LIMIT),
                skip: Hapi.types.number().integer().min(1)
            }
        }
    };






    var createOrder = function(request, reply) {
        var update = {};

        var user = request.auth.credentials;

        var owner = user.desensitize();

        var order = new Order({
            owner: owner,
            order: request.payload.order,
            details: request.payload.details
        });

        update.$push = {orders: order.toObject()};

        TeaRound.findOneAndUpdate({_id: request.params.roundId, team: request.params.id, 'members._id': user._id}, update, function(err, teaRound) {
            if(err) {
                return reply(err);
            }

            if(!teaRound) {
                return reply(Hapi.error.notFound("This tea round does not exist"));
            }

            reply(order).code(201).header('Location', '/teams/' + request.params.id + '/tea-rounds/' + request.params.roundId + "/orders/" + order._id);
        });
    };

    routes.createOrder = {
        auth: { strategies: ['hawk'] },
        handler: createOrder,
        validate: {
            path: {
                id: Hapi.types.string().regex(/^[0-9a-fA-F]{24}$/).required(),
                roundId: Hapi.types.string().regex(/^[0-9a-fA-F]{24}$/).required()
            },
            payload: {
                order: Hapi.types.string().min(1).max(100).required(),
                details: Hapi.types.string().max(250)
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

        TeaRound.findOneAndUpdate({_id: request.params.roundId, team: request.params.id, 'orders.owner._id': user._id }, update).exec(function(err, teaRound) {
            if(err) {
                return reply(err);
            }

            if(!teaRound) {
                return reply(Hapi.error.notFound("This tea round does not exist"));
            }

            var order = teaRound.orders.id(request.params.orderId)

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
            path: {
                id: Hapi.types.string().regex(/^[0-9a-fA-F]{24}$/).required(),
                roundId: Hapi.types.string().regex(/^[0-9a-fA-F]{24}$/).required(),
                orderId: Hapi.types.string().regex(/^[0-9a-fA-F]{24}$/).required()
            },
            payload: {
                order: Hapi.types.string().min(1).max(100),
                details: Hapi.types.string().max(250)
            }
        }
    };




    var deleteOrder = function(request, reply) {
        var user = request.auth.credentials;

        TeaRound.findOne({_id: request.params.roundId, team: request.params.id, 'members._id': user._id}, {orders: 1}).exec(function(err, teaRound) {
            if(err) {
                return reply(err);
            }

            var order = teaRound.orders.id(request.params.orderId)

            if(!order) {
                return reply(Hapi.error.notFound("This tea round order does not exist"));
            }

            if(order.owner._id.toString() !== user._id.toString()) {
                return reply(Hapi.error.unauthorized("Uh oh! Please check that you're the owner of this comment."));
            }

            teaRound.orders.pull({_id: order._id});

            teaRound.save(function(err) {
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
            path: {
                id: Hapi.types.string().regex(/^[0-9a-fA-F]{24}$/).required(),
                roundId: Hapi.types.string().regex(/^[0-9a-fA-F]{24}$/).required(),
                orderId: Hapi.types.string().regex(/^[0-9a-fA-F]{24}$/).required()
            },
            query: {
                limit: Hapi.types.number().integer().min(1).max(process.env.PAGINATE_LIMIT),
                skip: Hapi.types.number().integer().min(1)
            }
        }
    };

    return routes;
};