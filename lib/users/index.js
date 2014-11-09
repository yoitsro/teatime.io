var Hapi      = require('hapi');
var Joi       = require('joi');
var Mongoose  = require('mongoose');
var Hawk      = require('hawk');
var AuthLib   = require('../auth');

require('../../models');

var User      = Mongoose.model('User');
var UserUtils = require('./utils');


module.exports = function(server, config) {
    var routes = {};

    var getSingleUser = function(request, reply) {
        var select = {email:1, name:1};


        if(request.params.id === 'me') {
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
        description: 'Get a single user.',
        validate: {
            params: {
                id: [Joi.string().regex(/^[0-9a-fA-F]{24}$/).required().description('The user\'s id.'),
                     Joi.string().valid('me').description('The current user.')
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

        var user = request.auth.credentials;

        if(!request.payload.newPassword) {
            return commitUpdate(request, reply);
        }

        // If the user attempts to change their password, we need to first check that their password is valid
        // Get the full user object
        return User.findById(user._id, function(err, user) {
            if(err) {
                return reply(err);
            }

            user.comparePassword(request.payload.oldPassword, function(err, isValid) {
                if(err) {
                    return reply(err);
                }

                if(!isValid) {
                    return reply(Hapi.error.unauthorized('Your old password was incorrect. No changes have been made.'));
                }

                return commitUpdate(request, reply);  

            });
        });
    };

    var commitUpdate = function(request, reply) {
        //var updateQuery = {};
        
        var user = request.auth.credentials;

        if(request.payload.email) {
            user.email = request.payload.email;
            user.hash = require('crypto').createHash('md5').update(request.payload.email).digest("hex");
        }

        if(request.payload.name) {
            var nameParts = request.payload.name.split(" ");
            user.name.first = nameParts[0];
            user.name.last = nameParts[1] ? nameParts[1] : "";
        }

        if(request.payload.profileImage) {
            user.image.profile = request.payload.profileImage;
        }

        if(request.payload.mugImage) {
            user.image.mug = request.payload.mugImage;
        }

        if(request.payload.newPassword) {
            user.password = request.payload.newPassword;
        }

        user.save(function(err, user) {
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
            params: {
                id: Joi.string().valid('me').required()
            },
            payload: Joi.object({
                name: Joi.string().min(2).max(100).description('The user\'s name.'),
                email: Joi.string().email().description('The user\'s email address.'),
                newPassword: Joi.string().min(6).max(50).description('The user\'s new password.'),
                oldPassword: Joi.string().min(6).max(50).description('The user\'s existing password.'),
                profileImage: Joi.string().min(10).max(400),
                mugImage: Joi.string().min(10).max(400)
            }).with('oldPassword', 'newPassword').with('newPassword', 'oldPassword')
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
    //             limit: Joi.number().integer().min(1).max(process.env.PAGINATE_LIMIT),
    //             skip: Joi.number().integer().min(1)
    //         }
    //     }
    // };

    return routes;
};
