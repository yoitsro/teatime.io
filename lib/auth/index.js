var Boom     = require('boom');
var Hapi     = require('hapi');
var Joi      = require('joi');
var mongoose = require('mongoose');

require('../../models');
var User = mongoose.model('User');
var UserUtils = require('../users/utils');

module.exports = function(server, config) {
    var routes = {};

    var validate = function (username, password, callback) {
        User.findOne({email: username}, function(err, user) {
            if (err) {
                return callback(err);
            }

            if (!user) {
                return callback(Boom.unauthorized('Incorrect email address or password.'), false, null);
            }

            user.comparePassword(password, function(err, isValid) {

                if(!isValid) {
                    return callback(Boom.unauthorized('Incorrect email address or password.'), false, null);
                }

                user.password = "************";

                return callback(null, isValid, user);                
            });
        });
    };


    routes.getCredentials = function (id, callback) {
        User.findById(id, {_id: 1, api_keys: 1, name: 1, image: 1, hash: 1}, function(err, user) {
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
        description: 'Gets the user\'s API key and details.',
        auth: false,
        validate: {
            payload: {
                email: Joi.string().email().required().description('The user\'s email address.'),
                password: Joi.string().max(50).required().description('The user\'s password.')
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
                var error = Boom.badRequest("User already exists");
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
                    return reply(Boom.internalError(err));
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
        description: 'Register a brand new user.',
        validate: {
            payload: {
                email: Joi.string().email().required().description('The new user\'s email address.'),
                password: Joi.string().required().min(6).max(50).description('The new user\'s password.'),
                name: Joi.string().required().min(2).max(100).description('The new user\'s full name (first name and last name).')
            }
        }
    };

    return routes;
};
