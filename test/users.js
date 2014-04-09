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

describe('User', function () {

    var dbConnection;
    var SERVER_URL = 'http://example.com:8080';

    var credentials = {
        id: '531df1ee9595c6b610d64476',
        key: 'd76db572-0089-4154-8295-e2999260ade0',
        algorithm: 'sha256'
    };

    var initUser = function(done) {
        var user = {
            "__v" : 0,
            "_id" : new Mongoose.Types.ObjectId("531df1ee9595c6b610d64476"),
            "api_keys" : [ 
                "d76db572-0089-4154-8295-e2999260ade0"
            ],
            "email" : "existing@users.com",
            "name" : {
                "first" : "Barry",
                "last" : "White"
            },
            "password" : "$2a$10$5bNmnl.IexSpoaXNtFE63ef0Smtzk.7JqYLuHY3w.hJBrsfMYaHkm",
            "registered" : true,
        };

        var collection = dbConnection.connection.db.collection("users");
        // Insert a single document
        collection.insert(user, function() {
            return done();
        });
    };

    before(function(done) {
        dbConnection = Mongoose.connect('mongodb://localhost:27017/teatime-test', {db: { native_parser: true }}, function(err) {
            initUser(done);
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

    server.pack.require(['../routes/auth', '../routes/users'], function(err) {

    });

    var hawkHeader = function (path, method) {
        return Hawk.client.header(SERVER_URL + path, method, {credentials: credentials});
    };

    it('views their own profile', function(done) {
        var endpoint = '/users/me';
        var url = SERVER_URL + endpoint;
        var method = 'GET';


        server.inject({url: url, method: 'GET',  headers: { authorization: hawkHeader(endpoint, method).field } }, function(res) {
            expect(res.statusCode).to.equal(200);
            done();
        });
    });

    it('cannot view a non existant profile', function(done) {
        var endpoint = '/users/000000000000000000000000';
        var url = SERVER_URL + endpoint;
        var method = 'GET';

        server.inject({url: url, method: method, headers: { authorization: hawkHeader(endpoint, method).field } }, function(res) {
            expect(res.statusCode).to.equal(404);
            done();
        });
    });

    it('updates their own email', function(done) {
        var endpoint = '/users/me';
        var url = SERVER_URL + endpoint;
        var method = 'PUT';

        var payload = {
            email : "existing@users.com"
        };

        server.inject({url: url, method: method, payload: payload, headers: { authorization: hawkHeader(endpoint, method).field } }, function(res) {
            expect(res.statusCode).to.equal(200);
            done();
        });
    });

    it('updates their own name to just first name', function(done) {
        var endpoint = '/users/me';
        var url = SERVER_URL + endpoint;
        var method = 'PUT';

        var payload = {
            name: "Barry"
        };

        server.inject({url: url, method: method, payload: payload, headers: { authorization: hawkHeader(endpoint, method).field } }, function(res) {
            expect(res.statusCode).to.equal(200);
            done();
        });
    });

    it('updates their own full name', function(done) {
        var endpoint = '/users/me';
        var url = SERVER_URL + endpoint;
        var method = 'PUT';

        var payload = {
            name: "Barry White"
        };

        server.inject({url: url, method: method, payload: payload, headers: { authorization: hawkHeader(endpoint, method).field } }, function(res) {
            expect(res.statusCode).to.equal(200);
            done();
        });
    });

    it('updates their own password', function(done) {
        var endpoint = '/users/me';
        var url = SERVER_URL + endpoint;
        var method = 'PUT';

        var payload = {
            newPassword: "a new password",
            oldPassword: "password"
        };

        server.inject({url: url, method: method, payload: payload, headers: { authorization: hawkHeader(endpoint, method).field } }, function(res) {
            expect(res.statusCode).to.equal(200);
            done();
        });
    });

    it('cannot update their own password because original password was not sent', function(done) {
        var endpoint = '/users/me';
        var url = SERVER_URL + endpoint;
        var method = 'PUT';

        var payload = {
            newPassword: "password"
        };

        server.inject({url: url, method: method, payload: payload, headers: { authorization: hawkHeader(endpoint, method).field } }, function(res) {
            expect(res.statusCode).to.equal(400);
            done();
        });
    });

    it('cannot update their own password because original password is incorrect', function(done) {
        var endpoint = '/users/me';
        var url = SERVER_URL + endpoint;
        var method = 'PUT';

        var payload = {
            newPassword: "password",
            oldPassword: "incorrectpassword"
        };

        server.inject({url: url, method: method, payload: payload, headers: { authorization: hawkHeader(endpoint, method).field } }, function(res) {
            expect(res.statusCode).to.equal(401);
            done();
        });
    });

    it('cannot update their own profile because no data in payload', function(done) {
        var endpoint = '/users/me';
        var url = SERVER_URL + endpoint;
        var method = 'PUT';

        var payload = {};

        server.inject({url: url, method: method, payload: payload, headers: { authorization: hawkHeader(endpoint, method).field } }, function(res) {
            expect(res.statusCode).to.equal(400);
            done();
        });
    });

    it('cannot update someone else\'s profile', function(done) {
        var endpoint = '/users/000000000000000000000000';
        var url = SERVER_URL + endpoint;
        var method = 'PUT';

        var payload = {
            email : "existing@users.com",
            name: "Barry White",
            newPassword: "password",
            oldPassword: "password"
        };

        server.inject({url: url, method: method, payload: payload, headers: { authorization: hawkHeader(endpoint, method).field } }, function(res) {
            expect(res.statusCode).to.equal(400);
            done();
        });
    });

});