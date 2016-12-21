"use strict"

module.exports = class KeyChain() {

  constructor() {
    self.db = KeyStore()
    guid_keys = self.db.get_key("guid")
    if guid_keys is None:
        self.create_keychain()
    else:
        g = GUID.from_privkey(guid_keys[0])
        self.guid = g.guid
        self.guid_privkey = g.privkey
        self.signing_key = nacl.signing.SigningKey(self.guid_privkey)
        self.guid_signed_pubkey = g.signed_pubkey
        # pylint: disable=W0633
        self.bitcoin_master_privkey, self.bitcoin_master_pubkey = self.db.get_key("bitcoin")
        self.encryption_key = PrivateKey(self.guid_privkey)
        self.encryption_pubkey = self.encryption_key.public_key.encode()

  }

};
