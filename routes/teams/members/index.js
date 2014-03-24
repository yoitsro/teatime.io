var Members = require('../../../lib/teams/members');

exports.register = function(server, options, next) {
    var members = new Members(server);
    server.bind(members);

    server.route([
        // { method: 'GET', path: '/teams', config: teams.getTeams },
        // { method: 'POST', path: '/teams', config: teams.createTeam },
        // { method: 'GET', path: '/teams/{id}', config: teams.getTeam },
        // { method: 'DELETE', path: '/teams/{id}', config: teams.deleteTeam },
        // { method: 'PUT', path: '/teams/{id}', config: teams.updateTeam },

        // { method: 'GET', path: '/teams/{id}/rounds', config: teams.getTeaRounds },
        // { method: 'POST', path: '/teams/{id}/rounds', config: teams.createTeaRound },
        // { method: 'GET', path: '/teams/{id}/rounds/{roundId}', config: teams.getTeaRound },
        // { method: 'DELETE', path: '/teams/{id}/rounds/{roundId}', config: teams.deleteTeaRound },

        { method: 'GET', path: '/teams/{id}/members', config: members.getMembers },
        { method: 'POST', path: '/teams/{id}/members', config: members.addMembers },
        { method: 'GET', path: '/teams/{id}/members/{memberId}', config: members.getMember },
        { method: 'DELETE', path: '/teams/{id}/members/{memberId}', config: members.deleteMember }

        // { method: 'GET', path: '/teams/{id}/rounds/{roundId}/orders', config: teams.getOrders },
        // { method: 'POST', path: '/teams/{id}/rounds/{roundId}/orders', config: teams.createOrder },
        // { method: 'GET', path: '/teams/{id}/rounds/{roundId}/orders/{orderId}', config: teams.getOrder },
        // { method: 'DELETE', path: '/teams/{id}/rounds/{roundId}/orders/{orderId}', config: teams.deleteOrder },
        // { method: 'PUT', path: '/teams/{id}/rounds/{roundId}/orders/{orderId}', config: teams.updateOrder }

    ]);

    return next();
};