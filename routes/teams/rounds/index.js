var Rounds = require('../../../lib/teams/rounds');
var Orders = require('../../../lib/teams/rounds/orders');

exports.register = function (server, options, next) {

    var rounds = new Rounds(server);
    server.bind(rounds);
    
    var orders = new Orders(server);
    server.bind(orders);

	server.route([
		{ method: 'GET', path: '/teams/{id}/rounds', config: rounds.getRounds },
		{ method: 'POST', path: '/teams/{id}/rounds', config: rounds.createRound },
		{ method: 'GET', path: '/teams/{id}/rounds/{roundId}', config: rounds.getRound },
		{ method: 'DELETE', path: '/teams/{id}/rounds/{roundId}', config: rounds.deleteRound },

		{ method: 'GET', path: '/teams/{id}/rounds/{roundId}/orders', config: orders.getOrders },
		{ method: 'POST', path: '/teams/{id}/rounds/{roundId}/orders', config: orders.createOrder },
		{ method: 'GET', path: '/teams/{id}/rounds/{roundId}/orders/{orderId}', config: orders.getOrder },
		{ method: 'DELETE', path: '/teams/{id}/rounds/{roundId}/orders/{orderId}', config: orders.deleteOrder },
		{ method: 'PUT', path: '/teams/{id}/rounds/{roundId}/orders/{orderId}', config: orders.updateOrder }
	]);

	return next();
};

exports.register.attributes = {
    pkg: require('./package.json')
};