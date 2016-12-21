"use strict"

var tweetnacl = require('tweetnacl');
tweetnacl.util = require('tweetnacl-util');

module.exports = class GUID {
    
    constructor(keys) {
        if(keys === undefined) {
            this.generate();
        } else {
            this.signingKey = keys[0];
            this.verifyKey = keys[1];
            this.guid = keys[2];
        }
    }

    generate() {
        let validPow = false;
        //while(!validPow) {
            let keypair = tweetnacl.sign.keyPair();
            let signingKey = keypair.secretKey;
            let verifyKey = keypair.publicKey;
            let h = tweetnacl.hash(verifyKey);
            console.log(this._bin2String(h));
            validPow = this._testpow(h.substr(40, h.length-1));
        //}
        console.log('Key generated');
        this.signingKey = signingKey;
        this.verifyKey = verifyKey;
        //this.guid = unhexlify(h[:40]);
    }

    _bin2String(array) {
    var result = "";
    for (var i = 0; i < array.length; i++) {
        console.log((array[i]))
        console.log(String.fromCharCode(parseInt(array[i], 2)));
        result += String.fromCharCode(parseInt(array[i], 2));
    }
    return result;
    }

    _testpow(powHash) {
        console.log(powHash);
        console.log(parseInt(powHash, 16));
        return (parseInt(powHash, 16) < 50)
    }
}