var Hapi = require('hapi');
var Mongoose = require('mongoose');

require('../../models');

var Utils = require('../../utils');
var Team = Mongoose.model('Team');

module.exports = function(server, config) {
    var routes = {};

    var getTeams = function(request, reply) {
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
        handler: getTeams,
        validate: {
            query: {
                limit: Hapi.types.number().integer().min(1).max(process.env.PAGINATE_LIMIT),
                skip: Hapi.types.number().integer().min(1)
            }
        }
    };

    var getTeam = function(request, reply) {
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
        handler: getTeam,
        validate: {
            path: {
                id: Hapi.types.string().regex(/^[0-9a-fA-F]{24}$/).required()
            }
        }
    };

    var deleteTeam = function(request, reply) {
        var user = request.auth.credentials;

        Team.remove({_id:request.params.id, 'owners._id': user._id}).exec(function(err, team) {
            if(err) {
                return reply(err);
            }

            if(!team) {
                return reply(Hapi.error.notFound("This team does not exist"));
            }

            return reply(team).code(204);
        });
    };

    routes.deleteTeam = {
        auth: { strategies: ['hawk'] },
        handler: deleteTeam,
        validate: {
            path: {
                id: Hapi.types.string().regex(/^[0-9a-fA-F]{24}$/).required()
            }
        }
    };
    
    require('./create-team')(routes);
    
    return routes;
};