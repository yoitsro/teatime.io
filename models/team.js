var Mongoose         = require('mongoose');
var timestamp        = require('mongoose-time');

var teamSchema = new Mongoose.Schema({
	name: String,
    owners: [ Mongoose.model('User').schema ],
    members: [ Mongoose.model('User').schema ],
    requests: [ Mongoose.model('User').schema ],
    image: String,
    loc: [],
    searchable: {type: Boolean, default: false}
});

teamSchema.plugin(timestamp());
module.exports = Mongoose.model('Team', teamSchema);
