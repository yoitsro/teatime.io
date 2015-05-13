var Domain          = require('domain');
var Code            = require('code'); 
var Lab             = require('lab');
var lab             = exports.lab = Lab.script();
var Hapi            = require('hapi');
var Hawk            = require('hawk');
var Mongoose        = require('mongoose');
var Auth            = require('../../lib/auth')();
var FormData        = require('form-data');
var StreamToPromise = require('stream-to-promise');
var Fs              = require('fs');

// Test shortcuts

var expect = Code.expect;
var before = lab.before;
var after = lab.after;
var describe = lab.experiment;
var it = lab.test;

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

        var collection = Mongoose.connection.db.collection('users');
        // Insert a single document
        collection.insert(user, function(err) {
            return done();
        });
    };

    before(function(done) {
        Mongoose.connect('mongodb://localhost:27017/teatime-test', {db: { native_parser: true }}, function(err) {
            if (err) {
                throw err;
            }
            initUser(done);
        });
    });

    after(function(done) {
        Mongoose.connection.db.dropDatabase( function(err) {
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

    server.register(require('../../routes/teams'), function(err) {

    });



    var hawkHeader = function (path, method) {
        return Hawk.client.header(SERVER_URL + path, method, {credentials: credentials});
    };


    it('creates a new team', function(done) {
        var endpoint = '/teams';
        var url = SERVER_URL + endpoint;
        var method = 'POST';

        var form = new FormData();
        form.append('image', Fs.createReadStream(__dirname + '/lout.png'));
        form.append('json', JSON.stringify({
            name: 'A NEW TEAM',
            members: ['g@g.com', 'barry@white.com'],
            loc: [54.11, -27.3],
            searchable: true,
        }));

        var headers = form.getHeaders();
        headers.authorization = hawkHeader(endpoint, method).field;

        StreamToPromise(form).then(function(payload) {
            server.inject({url: url, method: method, headers: headers, payload: payload}, function(res) {
                expect(res.statusCode).to.equal(201);
                done();
            });
        });
    });

    it('creates a new team without an image', function(done) {
        var endpoint = '/teams';
        var url = SERVER_URL + endpoint;
        var method = 'POST';

        var payload = {
            name: 'A NEWer TEAM',
            members: ['g@g.com', 'barry@white.com'],
            loc: [54.11, -27.3],
            searchable: true,
        };

        server.inject({url: url, method: method, headers: {authorization: hawkHeader(endpoint, method).field}, payload: payload}, function(res) {
            expect(res.statusCode).to.equal(201);
            done();
        });
    });

    it('errors on creating a new team because no members', function(done) {
        var endpoint = '/teams';
        var url = SERVER_URL + endpoint;
        var method = 'POST';

        var form = new FormData();
        form.append('image', Fs.createReadStream(__dirname + '/lout.png'));
        form.append('json', JSON.stringify({
            name: 'A NEW TEAM',
            loc: [54.11, -27.3],
            searchable: true,
        }));

        var headers = form.getHeaders();
        headers.authorization = hawkHeader(endpoint, method).field;

        StreamToPromise(form).then(function(payload) {
            server.inject({url: url, method: method, headers: headers, payload: payload}, function(res) {
                expect(res.statusCode).to.equal(400);
                done();
            });
        });
    });

});