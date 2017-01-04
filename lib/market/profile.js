const protobuf = require('protobufjs');
const root = protobuf.Root.fromJSON(require("../../protos/bundle.json"));

module.exports = class Profile {
    /**
    This is a class which handles creating an updating the user profile.
    Data added to a protobuf object and stored in the database. The database
    will update automatically when changes are made to the profile. When we
    need to send it to our peers, we can just call get().
    **/

    constructor(db) {
      this.Profile = root.get('Profile');
      this.db = db;

      if(this.db.Profile.getProto()) {
        this.profile = Profile.create(this.db.profile.getProto());
      } else {
        this.profile = Profile.create();  // Empty profile object
      }
    }

    get(serialized) {
      if(serialized) {
        return this.profile.decode().finish();
      }
      return this.profile;
    }

    update(userInfo) {
      /**
      To update the profile, create a new protobuf Profile object and add the
      field you want to update.

        Example:
      u = objects.Profile()
      u.about = "hello world"
      update(u)
      **/
      this.Profile.create(userInfo);
      this.db.profile.setProto(this.profile);
    }

    addSocialAccount(accountType, username, proof) {
      let s = this.profile.SocialAccount();
      try {
        this._removeSocialIfFound(accountType);
        s.type = s.SocialType.Value(accountType.toUpperCase());
        s.username = username;
        if(proof) {
          s.proofURL = proof;
        }
        this.profile.social.extend([s]);
      } catch(err) {
        return;
      }
      this.db.profile.setProto(this.profile);
    }
};


    //
    // def remove_social_account(self, account_type):
    //     try:
    //         self._remove_social_if_found(account_type)
    //     except ValueError:
    //         return
    //     self.db.profile.set_proto(self.profile.SerializeToString())
    //
    // def _remove_social_if_found(self, account_type):
    //     s = self.profile.SocialAccount()
    //     st = s.SocialType.Value(account_type.upper())
    //     for social_account in self.profile.social:
    //         if social_account.type == st:
    //             self.profile.social.remove(social_account)
    //     self.db.profile.set_proto(self.profile.SerializeToString())
    //
    // def add_pgp_key(self, public_key, signature, guid):
    //     """
    //     Adds a pgp public key to the profile. The user must have submitted a
    //     valid signature covering the guid otherwise the key will not be added to
    //     the profile.
    //     """
    //     gpg = gnupg.GPG()
    //     gpg.import_keys(public_key)
    //     if gpg.verify(signature) and guid in signature:
    //         p = self.profile.PublicKey()
    //         p.public_key = public_key
    //         p.signature = signature
    //         self.profile.pgp_key.MergeFrom(p)
    //         self.db.profile.set_proto(self.profile.SerializeToString())
    //         return True
    //     else:
    //         return False
    //
    // def remove_field(self, field):
    //     if field is not "name":
    //         self.profile.ClearField(field)
    //         self.db.profile.set_proto(self.profile.SerializeToString())
    //
    // def get_temp_handle(self):
    //     return self.db.profile.get_temp_handle()
