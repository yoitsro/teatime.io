var Domain   = require('domain');
var Lab      = require('lab');
var Hapi     = require('hapi');
var Hawk     = require('hawk');
var Mongoose = require('mongoose');
var Auth     = require('../lib/auth')();

// Test shortcuts

var expect = Lab.expect;
var before = Lab.before;
var after = Lab.after;
var describe = Lab.experiment;
var it = Lab.test;

describe('Authorization', function () {

    var dbConnection;

    before(function(done) {
        dbConnection = Mongoose.connect('mongodb://localhost:27017/teatime-test', {db: { native_parser: true }}, function(err) {
            return done();
        });
    });

    after(function(done) {
        dbConnection.connection.db.dropDatabase( function(err) {
            dbConnection.connection.db.close(false, function(err, result) {
                return done();
            });
        });
    });
    

    process.env.PAGINATE_LIMIT_MAX = 500;
    process.env.PAGINATE_LIMIT     = 100;
    process.env.SELECT_FIELDS_USER = "_id name registered image";

    var server = new Hapi.Server();

    server.pack.require(['hapi-auth-hawk'], function (err) {
        server.auth.strategy('hawk', 'hawk', { getCredentialsFunc: Auth.getCredentials });
    });

    server.pack.require(['../routes/auth'], function(err) {

    });


    var credentials = {
        algorithm: 'sha256'
    };

    var hawkHeader = function (path) {
        return Hawk.client.header('http://example.com:8080' + path, 'GET', {credentials: credentials});
    };


    it('registers a new user', function(done) {
        var user = {
            name: 'Test User',
            password: 'password',
            email: 'test@users.com'
        };

        server.inject({url: '/register', method: 'POST', payload: user}, function(res) {
            expect(res.statusCode).to.equal(201);
            credentials.id = res.result._id;
            credentials.key = res.result.api_keys[0];
            done();
        });
    });

    it('errors on registering an existing user', function(done) {
        var user = {
            name: 'Test User',
            password: 'password',
            email: 'test@users.com'
        };

        server.inject({url: '/register', method: 'POST', payload: user}, function(res) {
            expect(res.statusCode).to.equal(409);
            done();
        });
    });

    it('validates a user', function(done) {
        server.route({
            method: 'GET',
            path: '/',
            config: {
                handler: function (request, reply) { reply(request.auth.credentials.user); },
                auth: {
                    strategy: 'hawk'
                }
            }
        });

        server.inject({url: 'http://example.com:8080/', method: 'GET', headers: { authorization: hawkHeader('/').field } }, function(res) {
            expect(res.statusCode).to.equal(200);
            done();
        });
    });

    it('errors on validating a user', function(done) {
        server.inject({url: 'http://example.com:8080/', method: 'GET', headers: { authorization: hawkHeader('/fish').field } }, function(res) {
            expect(res.statusCode).to.equal(401);
            done();
        });
    });

    it('authorizes a user', function(done) {
        var user = {
            password: 'password',
            email: 'test@users.com'
        };

        server.inject({url: '/authorize', method: 'POST', payload: user}, function(res) {
            expect(res.statusCode).to.equal(200);
            done();
        });
    });

    it('errors on authorizing a user because of wrong password', function(done) {
        var user = {
            password: 'wrong password',
            email: 'test@users.com'
        };

        server.inject({url: '/authorize', method: 'POST', payload: user}, function(res) {
            expect(res.statusCode).to.equal(401);
            done();
        });
    });

    it('errors on authorizing a user because of non-existant user', function(done) {
        var user = {
            password: 'password',
            email: 'idontexist@users.com'
        };

        server.inject({url: '/authorize', method: 'POST', payload: user}, function(res) {
            expect(res.statusCode).to.equal(401);
            done();
        });
    });

});