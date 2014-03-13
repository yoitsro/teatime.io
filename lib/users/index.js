var Hapi = require('hapi');
var Mongoose = require('mongoose');
var Hawk = require('hawk');

require('../../models');

var User = Mongoose.model('User');
var UserUtils = require('./utils');


module.exports = function(server, config) {
    var routes = {};

    var getSingleUser = function(request, reply) {
        var select = {email:1, name:1};


        if(request.params.id == 'me') {
            request.params.id = request.auth.credentials._id;
        }

        User.findById(request.params.id, select, function(err, user) {
            if(err) {
                return reply(err);
            }

            if(!user) {
                return reply(Hapi.error.notFound("This user does not exist"));
            }

            return reply(user);  
        });
    };

    routes.getSingleUser = {
        auth: { strategies: ['hawk'] },
        handler: getSingleUser,
        validate: {
            path: {
                id: [Hapi.types.string().regex(/^[0-9a-fA-F]{24}$/).required(),
                     Hapi.types.string().valid('me')
                ]
            }
        }
    };





    var updateSingleUser = function(request, reply) {
        var keys = Object.keys(request.payload);
        var validData = keys.some(function(key) {
            return request.payload[key] === null || request.payload[key] === undefined ? false : true;
        });

        if(!validData) {
            return reply(Hapi.error.badRequest('Please specify what you want to update'));
        }
        
        request.params.id = request.auth.credentials._id;

        var updateQuery = {}

        if(request.payload.email) {
            updateQuery.email = request.payload.email;
        }

        if(request.payload.password) {
            if(request.payload.password !== request.payload.confirmPassword) {
                return reply(Hapi.error.badRequest('Please ensure you have confirmed your password correctly'));
            }
        }

        if(request.payload.name) {
            var nameParts = request.payload.name.split(" ");
            updateQuery["name.first"] = nameParts[0];
            updateQuery["name.last"] = nameParts[1] ? nameParts[1] : "";
        }
        
        User.findByIdAndUpdate(request.params.id, updateQuery, function(err, user) {
            if(err) {
                return reply(err);
            }

            UserUtils.updateUserInformationGlobally(user, function(err) {
                return reply(user);
            });

        });
    };

    routes.updateSingleUser = {
        auth: { strategies: ['hawk'] },
        handler: updateSingleUser,
        validate: {
            path: {
                id: Hapi.types.string().valid('me').required()
            },
            payload: {
                name: Hapi.types.string().min(2).max(100),
                email: Hapi.types.string().email(),
                password: Hapi.types.string().min(8).max(50).with('confirmPassword'),
                confirmPassword: Hapi.types.string().min(8).max(50).with('password')
            }
        }
    };






    // var getUsers = function(request, reply) {
    //     var limit = Utils.setLimit(request);
    //     var skip = Utils.setSkip(request);

    //     User.find({}, {email:1, name:1}).limit(limit + 1).skip(skip).exec(function(err, results) {
    //         if(err) {
    //             return reply(err);
    //         }

    //         var data = {};
    //         data['hasMore'] = results.length === limit + 1;
    //         data['records'] = results.slice(0, limit);

    //         return reply(data);  
    //     });
    // };

    // routes.getUsers = {
    //     auth: { strategies: ['hawk'] },
    //     handler: getUsers,
    //     validate: {
    //         query: {
    //             limit: Hapi.types.number().integer().min(1).max(process.env.PAGINATE_LIMIT),
    //             skip: Hapi.types.number().integer().min(1)
    //         }
    //     }
    // };

    return routes;
};
