var Hapi     = require('hapi');
var Mongoose = require('mongoose');
var Auth     = require('./lib/auth')();

var config = {
    hostname: 'localhost',
    port: +process.env.PORT || 9001
};

// Create a server with a host and port
var server = Hapi.createServer(config.hostname, config.port, {cors: true});

server.pack.require(['hapi-auth-hawk'], function (err) {
    server.auth.strategy('hawk', 'hawk', { getCredentialsFunc: Auth.getCredentials, hawk: {port: process.env.NODE_ENV === 'production' ? 443 : config.port}});
});

server.pack.require(['./routes/users', './routes/auth', './routes/teams', './routes/teams/members', './routes/teams/rounds', './routes/teams/rounds/orders'], function (err) {

});

Mongoose.connect(process.env.MONGO_URL, {db: { native_parser: true }}, function(err) {
    if (err) {
        throw err;
    }

    console.log("Connected to MongoDB");
    server.start(function() {
        var uri = "";

        if(process.env.NODE_ENV === 'production') {
            uri = 'https://' + process.env.HOSTNAME + ':' + process.env.PORT;
        } else {
            uri = 'http://' + config.hostname + ':' + config.port;
        }
        console.log('Server started at ' + uri);
        
    });
});