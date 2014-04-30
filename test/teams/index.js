var Domain   = require('domain');
var Lab      = require('lab');
var Hapi     = require('hapi');
var Hawk     = require('hawk');
var Mongoose = require('mongoose');
var Auth     = require('../../lib/auth')();

// Test shortcuts

var expect = Lab.expect;
var before = Lab.before;
var after = Lab.after;
var describe = Lab.experiment;
var it = Lab.test;

describe('Team', function () {

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

    server.on('internalError', function (request, err) {

        console.log('Error response (500) sent for request: ' + request.id + ' because: ' + err.message);
    });

    server.pack.require(['hapi-auth-hawk'], function (err) {
        server.auth.strategy('hawk', 'hawk', { getCredentialsFunc: Auth.getCredentials });
    });

    server.pack.require(['../../routes/teams'], function(err) {

    });



    var hawkHeader = function (path, method) {
        return Hawk.client.header(SERVER_URL + path, method, {credentials: credentials});
    };


    it('creates a new team', function(done) {
        var endpoint = '/teams';
        var url = SERVER_URL + endpoint;
        var method = 'POST';

        var payload = {
            name: 'A NEW TEAM',
            members: ['g@g.com', 'barry@white.com'],
            loc: [54.11, -27.3],
            searchable: true,
            image: "test"
        };

        server.inject({url: url, method: method, headers: { authorization: hawkHeader(endpoint, method).field, 'content-type':'multipart/form-data; boundary=-------fdshfasf8dsof8aig3ohqogfa' }, payload: payload}, function(res) {
            expect(res.statusCode).to.equal(201);
            done();
        });
    });

    it('errors on creating a new team', function(done) {
        done();
    });

});