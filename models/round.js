var Mongoose         = require('mongoose');
var Timestamp        = require('mongoose-time');


var orderSchema = new Mongoose.Schema({
    owner: {},
    order: String,
    details: String
});

var roundSchema = new Mongoose.Schema({
    status: String,
    group: { type: Mongoose.Schema.Types.ObjectId, ref: 'Group' },
    owner: {},
    members: [],
    orders: [ orderSchema ]
});

roundSchema.plugin(Timestamp());
module.exports = Mongoose.model('Round', roundSchema);
module.exports = Mongoose.model('Order', orderSchema);