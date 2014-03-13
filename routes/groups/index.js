var Groups = require('../../lib/groups');

exports.register = function(server, options, next) {
    var groups = new Groups(server);
    server.bind(groups);

    server.route([
        { method: 'GET', path: '/groups', config: groups.getGroups },
        { method: 'POST', path: '/groups', config: groups.createGroup },
        { method: 'GET', path: '/groups/{id}', config: groups.getGroup },
        { method: 'DELETE', path: '/groups/{id}', config: groups.deleteGroup },
        { method: 'PUT', path: '/groups/{id}', config: groups.updateGroup },

        // { method: 'GET', path: '/groups/{id}/rounds', config: groups.getTeaRounds },
        // { method: 'POST', path: '/groups/{id}/rounds', config: groups.createTeaRound },
        // { method: 'GET', path: '/groups/{id}/rounds/{roundId}', config: groups.getTeaRound },
        // { method: 'DELETE', path: '/groups/{id}/rounds/{roundId}', config: groups.deleteTeaRound },

        // { method: 'GET', path: '/groups/{id}/members', config: groups.getMembers },
        // { method: 'POST', path: '/groups/{id}/members', config: groups.addMembers },
        // { method: 'GET', path: '/groups/{id}/{memberId}', config: groups.getMember },
        // { method: 'DELETE', path: '/groups/{id}/{memberId}', config: groups.deleteMember },

        // { method: 'GET', path: '/groups/{id}/rounds/{roundId}/orders', config: groups.getOrders },
        // { method: 'POST', path: '/groups/{id}/rounds/{roundId}/orders', config: groups.createOrder },
        // { method: 'GET', path: '/groups/{id}/rounds/{roundId}/orders/{orderId}', config: groups.getOrder },
        // { method: 'DELETE', path: '/groups/{id}/rounds/{roundId}/orders/{orderId}', config: groups.deleteOrder },
        // { method: 'PUT', path: '/groups/{id}/rounds/{roundId}/orders/{orderId}', config: groups.updateOrder }

    ]);

    return next();
};