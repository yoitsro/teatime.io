var Domain   = require('domain');
var Code     = require('code'); 
var Lab      = require('lab');
var lab      = exports.lab = Lab.script();
var Hapi     = require('hapi');
var Hawk     = require('hawk');
var Mongoose = require('mongoose');
var Auth     = require('../../lib/auth')();

// Test shortcuts

var expect = Code.expect;
var before = lab.before;
var after = lab.after;
var describe = lab.experiment;
var it = lab.test;

describe('Team members', function () {

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

    var server = new Hapi.Server();

    server.pack.register(require('hapi-auth-hawk'), function (err) {
        server.auth.strategy('hawk', 'hawk', { getCredentialsFunc: Auth.getCredentials });
    });

    server.pack.register(require('../../routes/auth'), function(err) {

    });


    var credentials = {
        algorithm: 'sha256'
    };

    var hawkHeader = function (path) {
        return Hawk.client.header('http://example.com:8080' + path, 'GET', {credentials: credentials});
    };


    it('adds a new member', function(done) {
        done();
    });

    it('errors on adding a new member because this user doesn\'t own this team', function(done) {
        done();
    });

    it('gets members', function(done) {
        done();
    });

    it('errors on getting members because this user doesn\'t own this team', function(done) {
        done();
    });

    it('gets a member', function(done) {
        done();
    });

    it('errors on getting a member because this user doesn\'t belong to this team', function(done) {
        done();
    });

    it('deletes a member', function(done) {
        done();
    });

    it('errors on deleting a member because this user doesn\'t own this team', function(done) {
        done();
    });

});