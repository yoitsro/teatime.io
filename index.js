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
    port: +process.env.PORT || 9001
};

// Create a server with a host and port
var server = Hapi.createServer(config.hostname, config.port, {cors: true});

server.pack.require(['hapi-auth-hawk'], function (err) {
    server.auth.strategy('hawk', 'hawk', { getCredentialsFunc: Auth.getCredentials });
});

server.pack.require(['./routes/users', './routes/auth', './routes/groups', './routes/groups/members', './routes/groups/rounds', './routes/groups/rounds/orders'], function (err) {

});


//mongoose.connect('mongodb://abcab:AbCab1!@designbyro.com:27017/abcab', {db: { native_parser: true }}, function(err) {
mongoose.connect('mongodb://localhost:27017/teatime', {db: { native_parser: true }}, function(err) {
    if (err) {
        throw err;
    }

    console.log("Connected to MongoDB");
    server.start(function() {

        var uri = process.env.HOST ? 'http://' + process.env.HOST + ':' + process.env.PORT : 'http://' + config.hostname + ':' + config.port;
        console.log('Server started at ' + uri);
        
    });
});
