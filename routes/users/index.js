var Users = require('../../lib/users');

exports.register = function(server, options, next) {
	var users = new Users(server);
	server.bind(users);

	server.route([
		{ method: 'GET', path: '/users/{id}', config: users.getSingleUser },
		{ method: 'PUT', path: '/users/{id}', config: users.updateSingleUser }
	]);
	return next();
};

exports.register.attributes = {
    pkg: require('./package.json')
};