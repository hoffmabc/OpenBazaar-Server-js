"use strict"

var GUID = require('./guid.js');
var bitcoin = require('bitcoinjs-lib');
var bip32utils = require('bip32-utils');
var HDKey = require('hdkey');
var ed2curve = require('ed2curve');

module.exports = class KeyChain {
    constructor(database, callback, heartbeatServer) {
        console.log('Initializing Keychain...');

        this.db = database;
        let guidKeys = this.db.keys.getKey('guid');

        if(guidKeys === undefined) {
            // Create KeyChain
            console.log('GUID keys not created');
            this.createKeychain(callback);
        } else {
            console.log('Found GUID keys in database');
            // Get GUID from privkey
            // Get all keys
            let g = new GUID(guidKeys);
            this.guid = g.fromPubKey(guidKeys.pubkey);
            this.signingKey = guidKeys.privkey;
            this.verifyKey = guidKeys.pubkey;

            let bitcoinKeys = this.db.keys.getKey('bitcoin');
            this.bitcoinMasterPrivkey = bitcoinKeys.privkey;
            this.bitcoinMasterPubkey = bitcoinKeys.pubkey;

            this.encryptionKey = ed2curve.convertSecretKey(this.signingKey);
            this.encryptionPubkey = ed2curve.convertPublicKey(this.verifyKey);

            console.log('Keychain set up complete');
            callback(this, false, this.db);
        }



        // if guid_keys is None:

        //     if heartbeat_server:

        //         heartbeat_server.set_status("generating GUID")

        //     threading.Thread(target=self.create_keychain, args=[callback]).start()

        // else:

        //     g = GUID.from_privkey(guid_keys[0])

        //     self.guid = g.guid

        //     self.signing_key = g.signing_key

        //     self.verify_key = g.verify_key

        //     # pylint: disable=W0633

        //     self.bitcoin_master_privkey, self.bitcoin_master_pubkey = self.db.keys.get_key("bitcoin")

        //     self.encryption_key = self.signing_key.to_curve25519_private_key()

        //     self.encryption_pubkey = self.verify_key.to_curve25519_public_key()

        //     if callable(callback):

        //         callback(self)
    }

    createKeychain(callback) {
        /**
        The guid generation can take a while. While it's doing that we will
        open a port to allow a UI to connect and listen for generation to
        complete.
        **/

        console.log("Generating GUID, this may take a few minutes...");
        let g = new GUID();
        this.guid = g.guid;
        this.signingKey = g.signingKey
        this.verifyKey = g.verifyKey
        this.db.keys.setKey("guid", this.signingKey.toString('hex'), this.verifyKey.toString('hex'))

        this.hdNode = bitcoin.HDNode.fromSeedBuffer(bitcoin.crypto.sha256(this.signingKey.toString('hex')));
        //this.bitcoinMasterPrivkey = this.hdNode.toBase58();
        var keypair = HDKey.fromMasterSeed(bitcoin.crypto.sha256(this.signingKey.toString('hex')));
        this.bitcoinMasterPrivkey = keypair.privateExtendedKey;
        this.bitcoinMasterPubkey = keypair.publicExtendedKey;

        this.db.keys.setKey("bitcoin", this.bitcoinMasterPrivkey, this.bitcoinMasterPubkey)
        let k = this.db.keys.getKey("bitcoin");

        this.encryptionKey = ed2curve.convertSecretKey(this.signingKey);
        this.encryptionPubkey = ed2curve.convertPublicKey(this.verifyKey);

        console.log(this);
        callback(this, true, this.db);
    }
}
