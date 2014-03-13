var Orders = require('../../../../lib/groups/rounds/orders');

exports.register = function(server, options, next) {
    var orders = new Orders(server);
    server.bind(orders);

	server.route([
		{ method: 'GET', path: '/groups/{id}/rounds/{roundId}/orders', config: orders.getOrders },
		{ method: 'POST', path: '/groups/{id}/rounds/{roundId}/orders', config: orders.createOrder },
		{ method: 'GET', path: '/groups/{id}/rounds/{roundId}/orders/{orderId}', config: orders.getOrder },
		{ method: 'DELETE', path: '/groups/{id}/rounds/{roundId}/orders/{orderId}', config: orders.deleteOrder },
		{ method: 'PUT', path: '/groups/{id}/rounds/{roundId}/orders/{orderId}', config: orders.updateOrder }
	]);
};