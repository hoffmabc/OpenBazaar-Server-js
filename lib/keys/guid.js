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
        let signingKey, verifyKey, h;
        while(!validPow) {
            let keypair = tweetnacl.sign.keyPair();
            signingKey = keypair.secretKey;
            verifyKey = keypair.publicKey;
            h = tweetnacl.hash(verifyKey);
            let hStr = this._toHexString(h);
            let powHash = hStr.substring(40, hStr.length-1);
            validPow = this._testpow(powHash.substring(0, 6));
        }
        console.log('Key generated');
        this.signingKey = signingKey;
        this.verifyKey = verifyKey;
        this.guid = h;
    }

    _toHexString(byteArray) {
        return byteArray.map(function(byte) {
            return ('0' + (byte & 0xFF).toString(16)).slice(-2);
        }).join('')
    }

    _bin2String(array) {
    var result = "";
    for (var i = 0; i < array.length; i++) {
        result += String.fromCharCode(parseInt(array[i], 2));
    }
    return result;
    }

    _testpow(powHash) {
        console.log(parseInt(powHash));
        //console.log(parseInt(powHash, 16));
        return (parseInt(powHash) < 50)
    }
}