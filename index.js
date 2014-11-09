var Hapi     = require('hapi');
var Mongoose = require('mongoose');
var AuthLib     = require('./lib/auth')();

var config = {
    hostname: 'localhost',
    port: +process.env.PORT || 9001
};



// Create a server with a host and port
var server = Hapi.createServer(config.hostname, config.port, {cors: true});

// server.auth.scheme('hawk', 'hawk', { getCredentialsFunc: AuthLib.getCredentials, hawk: {port: process.env.NODE_ENV === 'production' ? 443 : config.port}});

server.pack.register(require('hapi-auth-hawk'), function (err) {
    server.auth.strategy('hawk', 'hawk', { getCredentialsFunc: AuthLib.getCredentials });
    server.auth.default('hawk');
});

server.pack.register([
    require('./routes/users'),
    require('./routes/auth'),
    require('./routes/teams'),
    require('./routes/teams/members'),
    require('./routes/teams/rounds'),
    require('./routes/rounds'),
    require('lout')
    ], function (err) {
});

server.ai

server.ext('onPostAuth', function (request, next) {

    console.log('Response sent for request: ' + JSON.stringify(request.payload));
    return next();

});

Mongoose.connect(process.env.MONGO_URL, {db: { native_parser: true }}, function(err) {
    if (err) {
        throw err;
    }

    console.log("Connected to MongoDB");
    server.start(function() {
        var uri = "";

        if (process.env.NODE_ENV === 'production') {
            uri = 'https://' + process.env.HOSTNAME + ':' + process.env.PORT;
        } else {
            uri = 'http://' + config.hostname + ':' + config.port;
        }
        console.log('Server started at ' + uri);
        
    });
});