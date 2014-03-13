var Rounds = require('../../../lib/groups/rounds');

exports.register = function(server, options, next) {
    var rounds = new Rounds(server);
    server.bind(rounds);

	server.route([
		{ method: 'GET', path: '/groups/{id}/rounds', config: rounds.getRounds },
		{ method: 'POST', path: '/groups/{id}/rounds', config: rounds.createRound },
		{ method: 'GET', path: '/groups/{id}/rounds/{roundId}', config: rounds.getRound },
		{ method: 'DELETE', path: '/groups/{id}/rounds/{roundId}', config: rounds.deleteRound }
	]);
};