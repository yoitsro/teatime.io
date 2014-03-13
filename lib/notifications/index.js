var Mongoose = require('mongoose');
var User = Mongoose.model('User');
var Util = require('util');

exports.sendEmailToEmailAddress = function(message, subject, email, callback) {
	console.log(Util.format("Sending message '%s' with subject '%s' to email address '%s'", message, subject, email));

	if(callback) {
		return callback(null);
	}
};

exports.sendNotificationToUser = function(message, user, callback) {
	console.log(Util.format("Sending notification '%s' to user '%s'", message, user));

	if(callback) {
		return callback(null);
	}
};

exports.sendNotificationToUsers = function(message, users, callback) {
	if(!users) {
		if(callback) {
			return callback(null);
		}

		return;
	}

	if(users.length === 0) {
		if(callback) {
			return callback(null);
		}
		return;
	}

	console.log(Util.format("Sending notification '%s' to %d users", message, users.length));

	if(callback) {
		return callback(null);
	}
};