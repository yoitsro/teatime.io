var Hapi     = require('hapi');
var mongoose = require('mongoose');
var Hawk     = require('hawk');
var Auth     = require('./lib/auth')();

var Fs       = require('fs');

require('./models');
var mongoose = require('mongoose');


process.env.PAGINATE_LIMIT_MAX = 500;
process.env.PAGINATE_LIMIT     = 100;
process.env.SELECT_FIELDS_USER = "_id name registered image";


var config = {
    hostname: 'localhost',
    port: +process.env.npm_package_config_PORT || 9001
};

// Create a server with a host and port
var server = Hapi.createServer(config.hostname, config.port, {cors: true});

server.pack.require(['hapi-auth-hawk'], function (err) {
    server.auth.strategy('hawk', 'hawk', { getCredentialsFunc: Auth.getCredentials });
});

server.pack.require(['./routes/users', './routes/auth', './routes/teams', './routes/teams/members', './routes/teams/rounds', './routes/teams/rounds/orders'], function (err) {

});

mongoose.connect(process.env.npm_package_config_MONGO_URL, {db: { native_parser: true }}, function(err) {
    if (err) {
        throw err;
    }

    console.log("Connected to MongoDB");
    server.start(function() {

        var uri = process.env.HOST ? 'http://' + process.env.HOST + ':' + process.env.PORT : 'http://' + config.hostname + ':' + config.port;
        console.log('Server started at ' + uri);
        
    });
});
