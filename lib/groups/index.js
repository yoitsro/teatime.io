var Hapi = require('hapi');
var Mongoose = require('mongoose');

require('../../models');

var Utils = require('../../utils');
var Group = Mongoose.model('Group');

module.exports = function(server, config) {
    var routes = {};

    var getGroups = function(request, reply) {
        var limit = Utils.setLimit(request);
        var skip = Utils.setSkip(request);

        var user = request.auth.credentials;

        Group.find({'members._id': user._id}, {owners: false, members: false}).limit(limit + 1).skip(skip).exec(function(err, results) {
            if(err) {
                return reply(err);
            }

            var data = {};
            data['hasMore'] = results.length === limit + 1;
            data['records'] = results.slice(0, limit);

            return reply(data);
        });
    };

    routes.getGroups = {
        auth: { strategies: ['hawk'] },
        handler: getGroups,
        validate: {
            query: {
                limit: Hapi.types.number().integer().min(1).max(process.env.PAGINATE_LIMIT),
                skip: Hapi.types.number().integer().min(1)
            }
        }
    };

    var getGroup = function(request, reply) {
        var user = request.auth.credentials;
        
        Group.findOne({_id: request.params.id, 'members._id': user._id}).exec(function(err, group) {
            if(err) {
                return reply(err);
            }

            if(!group) {
                return reply(Hapi.error.notFound("This group does not exist"));
            }

            group = group.toObject();

            group.members.sort(Utils.sortUserProfilesAlphabetically);

            return reply(group);  
        });
    };

    routes.getGroup = {
        auth: { strategies: ['hawk'] },
        handler: getGroup,
        validate: {
            path: {
                id: Hapi.types.string().regex(/^[0-9a-fA-F]{24}$/).required()
            }
        }
    };

    var deleteGroup = function(request, reply) {
        var user = request.auth.credentials;

        Group.remove({_id:request.params.id, 'owners._id': user._id}).exec(function(err, group) {
            if(err) {
                return reply(err);
            }

            if(!group) {
                return reply(Hapi.error.notFound("This group does not exist"));
            }

            return reply(group).code(204);
        });
    };

    routes.deleteGroup = {
        auth: { strategies: ['hawk'] },
        handler: deleteGroup,
        validate: {
            path: {
                id: Hapi.types.string().regex(/^[0-9a-fA-F]{24}$/).required()
            }
        }
    };
    
    require('./create-group')(routes);
    
    return routes;
};