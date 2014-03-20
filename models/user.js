var mongoose         = require('mongoose');
var timestamp        = require('mongoose-time');
var bcrypt           = require('bcrypt');
var uuid             = require('uuid');
var SALT_WORK_FACTOR = 10;


var schemaOptions = {
	toObject: {
		virtuals: true
	},
	toJSON: {
		virtuals: true
	},
	id: false
};

var userSchema = new mongoose.Schema({
	name: {
		first: String,
    	last: String
	},
	email: String,
    password: String,
    api_keys: [ String ],
    image: {
        profile: String,
        mug: String
    },
    registered: Boolean
}, schemaOptions);

userSchema.virtual('name.full').get(function () {
  	return this.name.first ? this.name.first + ' ' + this.name.last : undefined;
});

userSchema.pre('save', function(next) {
    var user = this;

    // only hash the password if it has been modified (or is new)
    if (!user.isModified('password')) {
        return next();
    }

    // generate a salt
    bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt) {
        if (err) {
            return next(err);
        }

        if(!user.isModified('password')){
            return next();
        }

        // hash the password along with our new salt
        bcrypt.hash(user.password, salt, function(err, hash) {
            if (err) {
                return next(err);
            }

            // override the cleartext password with the hashed one
            user.password = hash;
            user.api_keys.push(uuid.v4());
            return next();
        });
    });
});

userSchema.methods.comparePassword = function(candidatePassword, done) {
    bcrypt.compare(candidatePassword, this.password, function(err, isMatch) {
        done(err, isMatch);
    });
};

userSchema.methods.desensitize = function() {
    var user = this.toObject();
    delete user.api_keys;
    delete user.email;
    delete user.password;
    delete user.updated_at;
    delete user.created_at;
    delete user.__v;
    return user;
};

userSchema.plugin(timestamp());
module.exports = mongoose.model('User', userSchema);