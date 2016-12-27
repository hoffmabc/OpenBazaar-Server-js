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

  deferredDict(d) {
    /**
    Just like a :class:`defer.DeferredList` but instead accepts and returns a :class:`dict`.
    Args:
        d: A :class:`dict` whose values are all :class:`defer.Deferred` objects.
    Returns:
        :class:`defer.DeferredList` whose callback will be given a dictionary whose
        keys are the same as the parameter :obj:`d` and whose values are the results
        of each individual deferred call.
    **/
    if(d.length == 0) {
      return;
    }
    return;
  }

    // if len(d) == 0:
    //     return defer.succeed({})
    //
    // def handle(results, names):
    //     rvalue = {}
    //     for index in range(len(results)):
    //         rvalue[names[index]] = results[index][1]
    //     return rvalue
    //
    // dl = defer.DeferredList(d.values())
    // return dl.addCallback(handle, d.keys())

}
