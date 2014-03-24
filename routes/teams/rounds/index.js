var Rounds = require('../../../lib/teams/rounds');

exports.register = function(server, options, next) {
    var rounds = new Rounds(server);
    server.bind(rounds);

	server.route([
		{ method: 'GET', path: '/teams/{id}/rounds', config: rounds.getRounds },
		{ method: 'POST', path: '/teams/{id}/rounds', config: rounds.createRound },
		{ method: 'GET', path: '/teams/{id}/rounds/{roundId}', config: rounds.getRound },
		{ method: 'DELETE', path: '/teams/{id}/rounds/{roundId}', config: rounds.deleteRound }
	]);
};