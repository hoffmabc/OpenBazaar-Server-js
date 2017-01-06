"use strict"

var crypto = require('crypto');
var RIPEMD160 = require('ripemd160');
const os = require('os');
const ifaces = os.networkInterfaces();

Object.keys(ifaces).forEach(function (ifname) {
    var alias = 0;

    ifaces[ifname].forEach(function (iface) {
        if('IPv4' !== iface.family || iface.internal !== false) {
            return;
        }

        if(alias >= 1) {
            console.log(ifname + ':' + alias, iface.address);
        } else {
            console.log(ifname, iface.address);
        }

        ++alias;
    })
});

module.exports = class Utils {

    constructor() {
        this.ripemd160 = new RIPEMD160();
    }

    digest(s) {
        if (typeof(s) != "string") {
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
        if (d.length == 0) {
            return;
        }
        return;
    }

    static isLocalAddress(ip) {
        if(ip !== undefined) {
            for (var key in ifaces) {
                let iface = ifaces[key];
                for(var itemKey in iface) {
                    let item = iface[itemKey];
                    if (item.address == ip) {
                        return true;
                    }
                }
            }
        }

        return false;
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
