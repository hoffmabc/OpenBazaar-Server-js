"use strict"

var crypto = require('crypto');
var RIPEMD160 = require('ripemd160');

module.exports = class Utils {

  constructor() {
    this.ripemd160 = new RIPEMD160();
  }

  digest(s) {
    if(typeof(s) != "string"){
      s = s.toString();
    }
    var hash = crypto.createHash('sha256');
    var intermed = hash.update(s).digest();
    var d = this.ripemd160.update(intermed).digest();
    return d;
  }

}
