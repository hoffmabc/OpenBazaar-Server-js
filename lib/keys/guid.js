"use strict"

var sodium = require('sodium').api;
//var Buffer = require('buffer');

module.exports = class GUID {

    constructor(keys) {
        if(keys === undefined) {
            console.log('Keys not sent, generating new GUID...');
            this.generate();
        } else {
            this.signingKey = keys[0];
            this.verifyKey = keys[1];
            this.guid = keys[2];
        }
        console.log('GUID initialized');
    }

    generate() {
        let validPow = false;
        let signingKey, verifyKey, h;
        while(!validPow) {
            //let keypair = tweetnacl.sign.keyPair();
            let keypair = sodium.crypto_box_keypair();
            signingKey = keypair.secretKey;
            verifyKey = keypair.publicKey;
            //h = tweetnacl.hash(verifyKey);
            h = sodium.crypto_hash_sha512(verifyKey);
            let hStr = h.toString('hex');
            //let hStr = this._toHexString(h);
            let powHash = hStr.substring(40, hStr.length-1);
            //console.log(powHash);
            validPow = this._testpow(powHash.substring(0, 6));
        }
        console.log('Key generated');
        this.signingKey = signingKey;
        this.verifyKey = verifyKey;
        this.guid = h;
    }

    fromPrivKey(privkey) {
      let pk = new Buffer(privkey, 'hex');
      let keypair = sodium.crypto_sign_seed_keypair(pk);
      //let verifyKey = keypair.
    }

    fromPubKey(pubkey) {
      let pubKeyBytes = new Buffer(pubkey, 'hex');
      let pubKeyHash = sodium.crypto_hash_sha512(pubKeyBytes).toString('hex');
      return pubKeyHash.substring(0, 40);
    }

        // verify_key = signing_key.verify_key
        // h = nacl.hash.sha512(verify_key.encode())
        // pow_hash = h[40:]
        // if _testpow(pow_hash[:6]):
        //     return GUID((signing_key, verify_key, unhexlify(h[:40])))

    _toHexString(byteArray) {
        let x = '';
        for(var i=0; i<byteArray.length; i++) {
          x += ('0' + (byteArray[i] & 0xFF).toString(16)).slice(-2);
        }
        return x;
    }

    _testpow(powHash) {
        return (parseInt(powHash, 16) < 50)
    }
}
