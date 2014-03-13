var Members = require('../../../lib/groups/members');

exports.register = function(server, options, next) {
    var members = new Members(server);
    server.bind(members);

    server.route([
        // { method: 'GET', path: '/groups', config: groups.getGroups },
        // { method: 'POST', path: '/groups', config: groups.createGroup },
        // { method: 'GET', path: '/groups/{id}', config: groups.getGroup },
        // { method: 'DELETE', path: '/groups/{id}', config: groups.deleteGroup },
        // { method: 'PUT', path: '/groups/{id}', config: groups.updateGroup },

        // { method: 'GET', path: '/groups/{id}/rounds', config: groups.getTeaRounds },
        // { method: 'POST', path: '/groups/{id}/rounds', config: groups.createTeaRound },
        // { method: 'GET', path: '/groups/{id}/rounds/{roundId}', config: groups.getTeaRound },
        // { method: 'DELETE', path: '/groups/{id}/rounds/{roundId}', config: groups.deleteTeaRound },

        { method: 'GET', path: '/groups/{id}/members', config: members.getMembers }
        // { method: 'POST', path: '/groups/{id}/members', config: members.addMembers },
        // { method: 'GET', path: '/groups/{id}/members/{memberId}', config: members.getMember },
        // { method: 'DELETE', path: '/groups/{id}/members/{memberId}', config: members.deleteMember }

        // { method: 'GET', path: '/groups/{id}/rounds/{roundId}/orders', config: groups.getOrders },
        // { method: 'POST', path: '/groups/{id}/rounds/{roundId}/orders', config: groups.createOrder },
        // { method: 'GET', path: '/groups/{id}/rounds/{roundId}/orders/{orderId}', config: groups.getOrder },
        // { method: 'DELETE', path: '/groups/{id}/rounds/{roundId}/orders/{orderId}', config: groups.deleteOrder },
        // { method: 'PUT', path: '/groups/{id}/rounds/{roundId}/orders/{orderId}', config: groups.updateOrder }

    ]);

    return next();
};