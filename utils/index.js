(function Utils() {
    var utils = {};
    /**
     * Checks a value against a condition
     *
     * @param value         The value which we're checking
     * @param condition     An object containing the regex condition to
     *                      look for and the corresponding value to use if found
     * @return              Has the value been found?
     */
    utils.setLimit = function setLimit(req) {
        if(!req.query.limit) {
        	return parseInt(process.env.PAGINATE_LIMIT, 10);
        }

        return parseInt(req.query.limit, 10);
    };

    utils.setSkip = function setSkip(req) {
        if(!req.query.skip) {
        	return 0;
        }

        return parseInt(req.query.skip, 10);
    };

    utils.sortUserProfilesAlphabetically = function sortUserProfilesAlphabetically(a, b) {
        if(!a.name) {
            return -1;
        }

        if(!a.name.first) {
            return -1;
        }

        if(!b.name) {
            return -1;
        }

        if(!b.name.first) {
            return -1;
        }

        if(a.name.first < b.name.first) {
            return -1;
        }

        if(a.name.first > b.name.first) {
            return 1;
        }

        return -1;
    };
    
    module.exports = utils;
})();