"use strict"

var sqlite3 = require('sqlite3').verbose();
var path = require('path');
var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');

const DATA_FOLDER = resolveHome("~") + path.sep + "OpenBazaar-js";

function resolveHome(filepath) {
    if (filepath[0] === '~') {
      return path.join(process.env.HOME, filepath.slice(1));
    }
    return filepath;
}

let slots = ['PATH', 'filemap', 'profile', 'listings', 'keys', 'follow', 'messages',
                 'notifications', 'broadcasts', 'vendors', 'moderators', 'purchases', 'sales',
                 'cases', 'ratings', 'transactions', 'settings', 'audit_shopping'];


module.exports = class Database {
  constructor(testnet, filepath) {
    this.path = this._databasePath(testnet, filepath);
    this.filemap = new HashMap(this.path);
    this.profile = new ProfileStore(this.path);

    console.log(this);
    // object.__setattr__(self, 'listings', ListingsStore(self.PATH))
    // object.__setattr__(self, 'keys', KeyStore(self.PATH))
    // object.__setattr__(self, 'follow', FollowData(self.PATH))
    // object.__setattr__(self, 'messages', MessageStore(self.PATH))
    // object.__setattr__(self, 'notifications', NotificationStore(self.PATH))
    // object.__setattr__(self, 'broadcasts', BroadcastStore(self.PATH))
    // object.__setattr__(self, 'vendors', VendorStore(self.PATH))
    // object.__setattr__(self, 'moderators', ModeratorStore(self.PATH))
    // object.__setattr__(self, 'purchases', Purchases(self.PATH))
    // object.__setattr__(self, 'sales', Sales(self.PATH))
    // object.__setattr__(self, 'cases', Cases(self.PATH))
    // object.__setattr__(self, 'ratings', Ratings(self.PATH))
    // object.__setattr__(self, 'transactions', Transactions(self.PATH))
    // object.__setattr__(self, 'settings', Settings(self.PATH))
    // object.__setattr__(self, 'audit_shopping', ShoppingEvents(self.PATH))

    this._initializeDatafolderTree();
    this._initializeDatabase(this.path);

  }

  _databasePath(testnet, filepath) {
      /**
      Get database pathname.
      Args:
        testnet: Boolean
        filename: If provided, overrides testnet
      **/
      let dbpath = '';

      if(filepath !== undefined) {
        dbpath = filepath;
      } else if(testnet !== undefined && testnet) {
        dbpath = DATA_FOLDER + path.sep + "OB-Testnet.db";
      } else {
        dbpath = DATA_FOLDER + path.sep + "OB-Mainnet.db";
      }

      return dbpath;
  }

  _initializeDatabase(databasePath) {
    /**
    Create database, if not present, and clear cache.
    **/
    if(!fs.existsSync(databasePath)) {
      this._createDatabase(databasePath);
      let cache = DATA_FOLDER + path.sep + 'cache.pickle';
      if(fs.existsSync(cache)) {
        fs.rmdirSync(cache);
      }
    }

    this._runMigrations();
  }

  _createDatabase(databasePath) {

    this.db = new sqlite3.Database(databasePath);

    this.db.serialize(() => {
      this.db.run('PRAGMA user_version = 6')
      this.db.run('CREATE TABLE hashmap(hash TEXT PRIMARY KEY, filepath TEXT)')
      this.db.run('CREATE TABLE profile(id INTEGER PRIMARY KEY, serializedUserInfo BLOB, tempHandle TEXT)')
      this.db.run('CREATE TABLE listings(id INTEGER PRIMARY KEY, serializedListings BLOB)')
      this.db.run('CREATE TABLE keys(type TEXT PRIMARY KEY, privkey BLOB, pubkey BLOB)')
      this.db.run('CREATE TABLE followers(guid TEXT UNIQUE, serializedFollower TEXT)')
      this.db.run('CREATE INDEX index_followers ON followers(serializedFollower);')
      this.db.run('CREATE TABLE following(id INTEGER PRIMARY KEY, serializedFollowing BLOB)')
      this.db.run('CREATE TABLE messages(msgID TEXT PRIMARY KEY, guid TEXT, handle TEXT, pubkey BLOB, subject TEXT, messageType TEXT, message TEXT, timestamp INTEGER, avatarHash BLOB, signature BLOB, outgoing INTEGER, read INTEGER)')
      this.db.run('CREATE INDEX index_guid ON messages(guid);')
      this.db.run('CREATE INDEX index_subject ON messages(subject);')
      this.db.run('CREATE INDEX index_messages_read ON messages(read);')
      this.db.run('CREATE INDEX index_timestamp ON messages(timestamp);')
      this.db.run('CREATE TABLE notifications(notifID TEXT UNIQUE, guid BLOB, handle TEXT, type TEXT, orderId TEXT, title TEXT, timestamp INTEGER, imageHash BLOB, read INTEGER)')
      this.db.run('CREATE INDEX index_notification_read ON notifications(read);')
      this.db.run('CREATE TABLE broadcasts(id TEXT PRIMARY KEY, guid BLOB, handle TEXT, message TEXT, timestamp INTEGER, avatarHash BLOB)')
      this.db.run('CREATE TABLE vendors(guid TEXT PRIMARY KEY, serializedNode BLOB)')
      this.db.run('CREATE TABLE moderators(guid TEXT PRIMARY KEY, pubkey BLOB, bitcoinKey BLOB, bitcoinSignature BLOB, handle TEXT, name TEXT, description TEXT, avatar BLOB, fee FLOAT)')
      this.db.run('CREATE TABLE purchases(id TEXT PRIMARY KEY, title TEXT, description TEXT, timestamp INTEGER, btc FLOAT, address TEXT, status INTEGER, outpoint BLOB, thumbnail BLOB, vendor TEXT, proofSig BLOB, contractType TEXT, unread INTEGER, statusChanged INTEGER)')
      this.db.run('CREATE TABLE sales(id TEXT PRIMARY KEY, title TEXT, description TEXT, timestamp INTEGER, btc REAL, address TEXT, status INTEGER, thumbnail BLOB, outpoint BLOB, buyer TEXT, paymentTX TEXT, contractType TEXT, unread INTEGER, statusChanged INTEGER)')
      this.db.run('CREATE TABLE cases(id TEXT PRIMARY KEY, title TEXT, timestamp INTEGER, orderDate TEXT, btc REAL, thumbnail BLOB, buyer TEXT, vendor TEXT, validation TEXT, claim TEXT, status INTEGER, unread INTEGER, statusChanged INTEGER)')
      this.db.run('CREATE TABLE ratings(listing TEXT, ratingID TEXT,  rating TEXT)')
      this.db.run('CREATE INDEX index_listing ON ratings(listing);')
      this.db.run('CREATE INDEX index_rating_id ON ratings(ratingID);')
      this.db.run('CREATE TABLE transactions(tx BLOB);')
      this.db.run('CREATE TABLE settings(id INTEGER PRIMARY KEY, refundAddress TEXT, currencyCode TEXT, country TEXT, language TEXT, timeZone TEXT, notifications INTEGER, shippingAddresses BLOB, blocked BLOB,termsConditions TEXT, refundPolicy TEXT, moderatorList BLOB, username TEXT, password TEXT,smtpNotifications INTEGER, smtpServer TEXT, smtpSender TEXT, smtpRecipient TEXT, smtpUsername TEXT,smtpPassword TEXT)')
      this.db.run('CREATE TABLE IF NOT EXISTS audit_shopping ( audit_shopping_id integer PRIMARY KEY NOT NULL, shopper_guid text NOT NULL, contract_hash text NOT NULL, "timestamp" integer NOT NULL, action_id integer NOT NULL);')
      this.db.run('CREATE INDEX IF NOT EXISTS shopper_guid_index ON audit_shopping (audit_shopping_id ASC);')
      this.db.run('CREATE INDEX IF NOT EXISTS action_id_index ON audit_shopping (audit_shopping_id ASC);')
    });

    this.db.close();
  }

  _runMigrations() {

  }

  _initializeDatafolderTree() {
    /**
    Creates, if not present, directory tree in DATA_FOLDER.
    **/
    let tree = [
        ['cache'],
        ['store', 'contracts', 'listings'],
        ['store', 'contracts', 'in progress'],
        ['store', 'contracts', 'unfunded'],
        ['store', 'contracts', 'trade receipts'],
        ['store', 'media'],
        ['purchases', 'in progress'],
        ['purchases', 'unfunded'],
        ['purchases', 'trade receipts'],
        ['cases']
    ];

    let folderpath = '';
    for(var i=0; i<tree.length; i++) {
      folderpath = DATA_FOLDER;
      var subTree = tree[i];
      for (var j=0; j<subTree.length; j++) {
        folderpath = folderpath + path.sep + subTree[j];
      }
      if(!fs.existsSync(folderpath)) {
        mkdirp(folderpath, {}, (err) => {
          if(err) {
            console.log(err);
          }
        });
      }
    }

  }


  //
  //
  // createDatabase(filename) {
  //
  //   this.db = new sqlite3.Database(filename);
  //
  //   console.log('opened');
  //   this.db.serialize(() => {
  //     this.db.run('CREATE TABLE hashmap(hash BLOB PRIMARY KEY, filepath TEXT)', (err) => {
  //       if(err) {
  //         console.log(err);
  //       }
  //     });
  //     this.db.run('CREATE TABLE profile(id INTEGER PRIMARY KEY, serializedUserInfo BLOB)')
  //     this.db.run('CREATE TABLE listings(id INTEGER PRIMARY KEY, serializedListings BLOB)')
  //     this.db.run('CREATE TABLE keystore(type TEXT PRIMARY KEY, privkey BLOB, pubkey BLOB)')
  //     this.db.run('CREATE TABLE followers(id INTEGER PRIMARY KEY, serializedFollowers BLOB)')
  //     this.db.run('CREATE TABLE following(id INTEGER PRIMARY KEY, serializedFollowing BLOB)')
  //     this.db.run('CREATE TABLE messages(guid BLOB , handle TEXT, signed_pubkey BLOB, encryption_pubkey BLOB, subject TEXT, message_type TEXT, message TEXT, timestamp, INTEGER, avatar_hash BLOB, signature BLOB, outgoing INTEGER)')
  //     this.db.run('CREATE TABLE notifications(guid BLOB, handle TEXT, message TEXT, timestamp INTEGER, avatar_hash BLOB)')
  //     this.db.run('CREATE TABLE vendors(guid BLOB UNIQUE, ip TEXT, port INTEGER, signedPubkey BLOB)')
  //     this.db.run('CREATE INDEX idx1 ON vendors(guid);')
  //   });
  //
  //
  // }
}


class HashMap {
    /**
    Creates a table in the database for mapping file hashes (which are sent
    over the wire in a query) with a more human readable filename in local
    storage. This is useful for users who want to look through their store
    data on disk.
    **/

    constructor(databasePath) {
      this.path = databasePath;
    }

    // insert(hashValue, filepath) {
    //   let conn = Database.connectDatabase(this.path);
    //   cursor = conn.cursor()
    //   this.db.run('INSERT OR REPLACE INTO hashmap(hash, filepath)
    //                 VALUES (?,?)', (hash_value, filepath))
    //   conn.commit()
    //   conn.close()
    // }
    //
    // def get_file(self, hash_value):
    //     conn = Database.connect_database(self.PATH)
    //     cursor = conn.cursor()
    //     this.db.run('SELECT filepath FROM hashmap WHERE hash=?', (hash_value,))
    //     ret = cursor.fetchone()
    //     conn.close()
    //     if ret is None:
    //         return None
    //     return DATA_FOLDER + ret[0]
    //
    // def get_all(self):
    //     conn = Database.connect_database(self.PATH)
    //     cursor = conn.cursor()
    //     this.db.run('SELECT * FROM hashmap ')
    //     ret = cursor.fetchall()
    //     conn.close()
    //     return ret
    //
    // def delete(self, hash_value):
    //     conn = Database.connect_database(self.PATH)
    //     with conn:
    //         cursor = conn.cursor()
    //         this.db.run('DELETE FROM hashmap WHERE hash = ?', (hash_value,))
    //         conn.commit()
    //     conn.close()
    //
    // def delete_all(self):
    //     conn = Database.connect_database(self.PATH)
    //     with conn:
    //         cursor = conn.cursor()
    //         this.db.run('DELETE FROM hashmap')
    //         conn.commit()
    //     conn.close()
}

class ProfileStore {
  /**
  Stores the user's profile data in the db. The profile is stored as a serialized
  Profile protobuf object. It's done this way because because protobuf is more
  flexible and allows for storing custom repeated fields (like the SocialAccount
  object). Also we will just serve this over the wire so we don't have to manually
  rebuild it every startup. To interact with the profile you should use the
  `market.profile` module and not this class directly.
  **/

  constructor(databasePath) {
    this.path = databasePath;
  }
  // def set_proto(self, proto):
  //     conn = Database.connect_database(self.PATH)
  //     with conn:
  //         cursor = conn.cursor()
  //         handle = self.get_temp_handle()
  //         this.db.run('INSERT OR REPLACE INTO profile(id, serializedUserInfo, tempHandle)
  //                       VALUES (?,?,?)', (1, proto, handle))
  //         conn.commit()
  //     conn.close()
  //
  // def get_proto(self):
  //     conn = Database.connect_database(self.PATH)
  //     cursor = conn.cursor()
  //     this.db.run('SELECT serializedUserInfo FROM profile WHERE id = 1')
  //     ret = cursor.fetchone()
  //     conn.close()
  //     if ret is None:
  //         return None
  //     return ret[0]
  //
  // def set_temp_handle(self, handle):
  //     conn = Database.connect_database(self.PATH)
  //     with conn:
  //         cursor = conn.cursor()
  //         if self.get_proto() is None:
  //             this.db.run('INSERT OR REPLACE INTO profile(id, tempHandle)
  //                       VALUES (?,?)', (1, handle))
  //         else:
  //             this.db.run('UPDATE profile SET tempHandle=? WHERE id=?;', (handle, 1))
  //         conn.commit()
  //     conn.close()
  //
  // def get_temp_handle(self):
  //     conn = Database.connect_database(self.PATH)
  //     cursor = conn.cursor()
  //     this.db.run('SELECT tempHandle FROM profile WHERE id = 1')
  //     ret = cursor.fetchone()
  //     conn.close()
  //     if ret is None:
  //         return ""
  //     else:
  //         return ret[0]
}
