var Mongoose         = require('mongoose');
var Timestamp        = require('mongoose-time');


var orderSchema = new Mongoose.Schema({
    owner: {},
    order: String,
    details: String
});
orderSchema.plugin(Timestamp());

var roundSchema = new Mongoose.Schema({
    status: String,
    team: { type: Mongoose.Schema.Types.ObjectId, ref: 'Team' },
    owner: {},
    members: [ Mongoose.model('User').schema ],
    orders: [ orderSchema ]
});

roundSchema.plugin(Timestamp());

module.exports = Mongoose.model('Round', roundSchema);
module.exports = Mongoose.model('Order', orderSchema);