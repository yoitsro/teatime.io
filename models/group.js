var mongoose         = require('mongoose');
var timestamp        = require('mongoose-time');

var groupSchema = new mongoose.Schema({
	name: String,
    owners: [],
    members: [],
    requests: [],
    image: String,
    loc: [],
    searchable: {type: Boolean, default: false}
});

groupSchema.plugin(timestamp());
module.exports = mongoose.model('Group', groupSchema);
