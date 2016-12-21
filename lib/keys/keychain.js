"use strict"

var GUID = require('./guid.js');

module.exports = class KeyChain {
    constructor(database, callback, heartbeatServer) {
        this.db = database;
        let guidKeys = this.db.keys.getKey('guid');
        
        if(guidKeys === undefined) {
            // Create KeyChain
            this.createKeychain(callback);
        } else {
            // Get GUID from privkey
            // Get all keys
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
        g = new GUID();
        self.guid = g.guid
        self.signing_key = g.signing_key
        self.verify_key = g.verify_key
        self.db.keys.set_key("guid", self.signing_key.encode(encoder=nacl.encoding.HexEncoder),
                             self.verify_key.encode(encoder=nacl.encoding.HexEncoder))

        self.bitcoin_master_privkey = bitcointools.bip32_master_key(bitcointools.sha256(self.signing_key.encode()))
        self.bitcoin_master_pubkey = bitcointools.bip32_privtopub(self.bitcoin_master_privkey)
        self.db.keys.set_key("bitcoin", self.bitcoin_master_privkey, self.bitcoin_master_pubkey)

        self.encryption_key = self.signing_key.to_curve25519_private_key()
        self.encryption_pubkey = self.verify_key.to_curve25519_public_key()

        //if callable(callback):
        //    callback(self, True)
    }
}