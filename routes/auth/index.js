var Auth = require('../../lib/auth');

exports.register = function(server, options, next) {
	var auth = new Auth();
	server.bind(auth);

	server.route([
		{ method: 'POST', path: '/authorize', config: auth.authorize },
		{ method: 'POST', path: '/register', config: auth.register }
	]);
	return next();
};