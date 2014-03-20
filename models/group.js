var Mongoose         = require('mongoose');
var timestamp        = require('mongoose-time');

var groupSchema = new Mongoose.Schema({
	name: String,
    owners: [ Mongoose.model('User').schema ],
    members: [ Mongoose.model('User').schema ],
    requests: [ Mongoose.model('User').schema ],
    image: String,
    loc: [],
    searchable: {type: Boolean, default: false}
});

groupSchema.plugin(timestamp());
module.exports = Mongoose.model('Group', groupSchema);
