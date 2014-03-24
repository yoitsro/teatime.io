var models = [
  './user',
  './team',
  './round'
];

module.exports = (function () {
  var l = models.length;
  for (var i = 0; i < l; i++) {
    require(models[i])();
  }
})();