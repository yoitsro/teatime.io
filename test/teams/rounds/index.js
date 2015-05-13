var Domain   = require('domain');
var Code     = require('code'); 
var Lab      = require('lab');
var lab      = exports.lab = Lab.script();
var Hapi     = require('hapi');
var Hawk     = require('hawk');
var Mongoose = require('mongoose');
var Auth     = require('../../../lib/auth')();

// Test shortcuts

var expect = Code.expect;
var before = lab.before;
var after = lab.after;
var describe = lab.experiment;
var it = lab.test;

describe('Team rounds', function () {

    var dbConnection;

    before(function(done) {
        dbConnection = Mongoose.connect('mongodb://localhost:27017/teatime-test', {db: { native_parser: true }}, function(err) {
            return done();
        });
    });

    after(function(done) {
        dbConnection.connection.db.dropDatabase( function(err) {
            Mongoose.disconnect(function(err, result) {
                return done();
            });
        });
    });
    

    process.env.PAGINATE_LIMIT_MAX = 500;
    process.env.PAGINATE_LIMIT     = 100;
    process.env.SELECT_FIELDS_USER = "_id name registered image";

    var config = {
        host: 'localhost',
        port: +process.env.PORT || 9001
    };

    var server = new Hapi.Server();
    server.connection(config)

    server.register(require('hapi-auth-hawk'), function (err) {
        server.auth.strategy('hawk', 'hawk', { getCredentialsFunc: Auth.getCredentials });
    });

    server.register(require('../../../routes/auth'), function(err) {

    });


    var credentials = {
        algorithm: 'sha256'
    };

    var hawkHeader = function (path) {
        return Hawk.client.header('http://example.com:8080' + path, 'GET', {credentials: credentials});
    };


    it('creates a new round', function(done) {
        done();
    });

    it('errors on creating a new round because this team doesn\'t exist', function(done) {
        done();
    });

    it('gets a round', function(done) {
        done();
    });

    it('errors on getting a round because this team doesn\'t exist', function(done) {
        done();
    });

    it('gets rounds', function(done) {
        done();
    });

    it('errors on getting rounds because this team doesn\'t exist', function(done) {
        done();
    });

    it('deletes a round', function(done) {
        done();
    });

    it('errors on deleting a round because this team doesn\'t exist', function(done) {
        done();
    });

    it('errors on deleting a round because this user doesn\'t own the round', function(done) {
        done();
    });

});