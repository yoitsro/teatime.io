var mongoose = require('mongoose');
var Hapi     = require('hapi');

require('../../models');
var User = mongoose.model('User');
var UserUtils = require('../users/utils')

module.exports = function(server, config) {
    var routes = {};

    var validate = function (username, password, callback) {
        User.findOne({email: username}, {_id:1, api_keys:1, password: 1, name:1}, function(err, user) {
            if (err) {
                return callback(err);
            }

            if (!user) {
                return callback(Hapi.error.unauthorized('Incorrect email address or password.'), false, null);
            }

            user.comparePassword(password, function(err, isValid) {

                if(isValid) {
                    user.password = "************";

                    return callback(null, isValid, user); 
                }

                return callback(Hapi.error.unauthorized('Incorrect email address or password.'), false, null);
            });
        });
    };


    routes.getCredentials = function (id, callback) {
        User.findById(id, {_id: 1, api_keys: 1, name: 1}, function(err, user) {
            if (err) {
                return callback(err);
            }

            user.key = user.api_keys[0];
            user.id = user._id;
            user.algorithm = 'sha256';
            
            callback(null, user);
        });
    };

    var authorize = function(request, reply) {
        validate(request.payload.email, request.payload.password, function(err, isValid, user) {
            if (err) {
                return reply(err);
            }

            user.key = user.api_keys[0];
            user.id = user._id;
            user.algorithm = 'sha256';
            
            reply(user);
        });
    };

    routes.authorize = {
        handler: authorize,
        validate: {
            payload: {
                email: Hapi.types.string().email().required(),
                password: Hapi.types.string().min(8).max(50).required()
            }
        }
    };



    var register = function(request, reply) {
        // Does this user already exist?
        User.findOne({email: request.payload.email}, function(err, user) {
            if(err) {
                return reply(err);
            }

            if(!user) {
                user = new User();
            }

            if(user.registered === true) {
                var error = Hapi.error.badRequest("User already exists");
                error.output.statusCode = 409;
                error.reformat();

                return reply(error);
            }

            user.email      = request.payload.email;
            user.password   = request.payload.password;

            var nameParts = request.payload.name.split(" ");
            user.name = {};
            user.name.first = nameParts[0];
            user.name.last  = nameParts[1];

            user.registered = true;

            user.save(function(err, user) {
                if(err) {
                    return reply(Hapi.error.internal(err));
                }

                user.password = "************";
                UserUtils.updateUserInformationGlobally(user, function() {
                    reply(user).code(201).header('Location', '/users/me');
                });
            });
        });
        
    };

    routes.register = {
        handler: register,
        validate: {
            payload: {
                email: Hapi.types.string().email().required(),
                password: Hapi.types.string().required().min(8).max(50),
                name: Hapi.types.string().required().min(2).max(100)
            }
        }
    };

    return routes;
};
