"use strict"

var sqlite3 = require('sqlite3').verbose();
var TransactionDatabase = require("sqlite3-transactions").TransactionDatabase;
var path = require('path');
var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');
var sqlite = require('sqlite-sync');
var Config = require('../config.js');

let CONFIG = new Config();
const DATA_FOLDER = CONFIG.DATA_FOLDER;

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

    // Create DB file if not exist
    sqlite.connect(this.path);
    sqlite.close();

    this.filemap = new HashMap(this.path);
    this.profile = new ProfileStore(this.path);
    this.keys = new KeyStore(this.path);
    this.vendors = new VendorStore(this.path);

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

  _initializeDatabase(callback) {
    /**
    Create database, if not present, and clear cache.
    **/
    console.log('Initializing database...');
    if(!fs.existsSync(this.path)) {
        this._createDatabase(this.path, () => {
            let cache = DATA_FOLDER + path.sep + 'cache.pickle';
            if(fs.existsSync(cache)) {
                fs.rmdirSync(cache);
            }

            this._runMigrations();

            callback();
        });
    } else {
        console.log('Database exists...');
        callback();
    }

  }

  _createDatabase(databasePath, callback) {

    sqlite.connect(databasePath);

    sqlite.run('PRAGMA user_version = 6', (res) => {
      if(res.error) {
        console.log(res.error);
      }
    });
    sqlite.run('CREATE TABLE hashmap(hash TEXT PRIMARY KEY, filepath TEXT)')
    sqlite.run('CREATE TABLE profile(id INTEGER PRIMARY KEY, serializedUserInfo BLOB, tempHandle TEXT)')
    sqlite.run('CREATE TABLE listings(id INTEGER PRIMARY KEY, serializedListings BLOB)')
    sqlite.run('CREATE TABLE keys(type TEXT PRIMARY KEY, privkey BLOB, pubkey BLOB)')
    sqlite.run('CREATE TABLE followers(guid TEXT UNIQUE, serializedFollower TEXT)')
    sqlite.run('CREATE INDEX index_followers ON followers(serializedFollower);')
    sqlite.run('CREATE TABLE following(id INTEGER PRIMARY KEY, serializedFollowing BLOB)')
    sqlite.run('CREATE TABLE messages(msgID TEXT PRIMARY KEY, guid TEXT, handle TEXT, pubkey BLOB, subject TEXT, messageType TEXT, message TEXT, timestamp INTEGER, avatarHash BLOB, signature BLOB, outgoing INTEGER, read INTEGER)')
    sqlite.run('CREATE INDEX index_guid ON messages(guid);')
    sqlite.run('CREATE INDEX index_subject ON messages(subject);')
    sqlite.run('CREATE INDEX index_messages_read ON messages(read);')
    sqlite.run('CREATE INDEX index_timestamp ON messages(timestamp);')
    sqlite.run('CREATE TABLE notifications(notifID TEXT UNIQUE, guid BLOB, handle TEXT, type TEXT, orderId TEXT, title TEXT, timestamp INTEGER, imageHash BLOB, read INTEGER)')
    sqlite.run('CREATE INDEX index_notification_read ON notifications(read);')
    sqlite.run('CREATE TABLE broadcasts(id TEXT PRIMARY KEY, guid BLOB, handle TEXT, message TEXT, timestamp INTEGER, avatarHash BLOB)')
    sqlite.run('CREATE TABLE vendors(guid TEXT PRIMARY KEY, serializedNode BLOB)')
    sqlite.run('CREATE TABLE moderators(guid TEXT PRIMARY KEY, pubkey BLOB, bitcoinKey BLOB, bitcoinSignature BLOB, handle TEXT, name TEXT, description TEXT, avatar BLOB, fee FLOAT)')
    sqlite.run('CREATE TABLE purchases(id TEXT PRIMARY KEY, title TEXT, description TEXT, timestamp INTEGER, btc FLOAT, address TEXT, status INTEGER, outpoint BLOB, thumbnail BLOB, vendor TEXT, proofSig BLOB, contractType TEXT, unread INTEGER, statusChanged INTEGER)')
    sqlite.run('CREATE TABLE sales(id TEXT PRIMARY KEY, title TEXT, description TEXT, timestamp INTEGER, btc REAL, address TEXT, status INTEGER, thumbnail BLOB, outpoint BLOB, buyer TEXT, paymentTX TEXT, contractType TEXT, unread INTEGER, statusChanged INTEGER)')
    sqlite.run('CREATE TABLE cases(id TEXT PRIMARY KEY, title TEXT, timestamp INTEGER, orderDate TEXT, btc REAL, thumbnail BLOB, buyer TEXT, vendor TEXT, validation TEXT, claim TEXT, status INTEGER, unread INTEGER, statusChanged INTEGER)')
    sqlite.run('CREATE TABLE ratings(listing TEXT, ratingID TEXT,  rating TEXT)')
    sqlite.run('CREATE INDEX index_listing ON ratings(listing);')
    sqlite.run('CREATE INDEX index_rating_id ON ratings(ratingID);')
    sqlite.run('CREATE TABLE transactions(tx BLOB);')
    sqlite.run('CREATE TABLE settings(id INTEGER PRIMARY KEY, refundAddress TEXT, currencyCode TEXT, country TEXT, language TEXT, timeZone TEXT, notifications INTEGER, shippingAddresses BLOB, blocked BLOB,termsConditions TEXT, refundPolicy TEXT, moderatorList BLOB, username TEXT, password TEXT,smtpNotifications INTEGER, smtpServer TEXT, smtpSender TEXT, smtpRecipient TEXT, smtpUsername TEXT,smtpPassword TEXT)')
    sqlite.run('CREATE TABLE IF NOT EXISTS audit_shopping ( audit_shopping_id integer PRIMARY KEY NOT NULL, shopper_guid text NOT NULL, contract_hash text NOT NULL, "timestamp" integer NOT NULL, action_id integer NOT NULL);')
    sqlite.run('CREATE INDEX IF NOT EXISTS shopper_guid_index ON audit_shopping (audit_shopping_id ASC);')
    sqlite.run('CREATE INDEX IF NOT EXISTS action_id_index ON audit_shopping (audit_shopping_id ASC);')

    sqlite.close();

    callback();

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
  //     sqlite.run('CREATE TABLE hashmap(hash BLOB PRIMARY KEY, filepath TEXT)', (err) => {
  //       if(err) {
  //         console.log(err);
  //       }
  //     });
  //     sqlite.run('CREATE TABLE profile(id INTEGER PRIMARY KEY, serializedUserInfo BLOB)')
  //     sqlite.run('CREATE TABLE listings(id INTEGER PRIMARY KEY, serializedListings BLOB)')
  //     sqlite.run('CREATE TABLE keystore(type TEXT PRIMARY KEY, privkey BLOB, pubkey BLOB)')
  //     sqlite.run('CREATE TABLE followers(id INTEGER PRIMARY KEY, serializedFollowers BLOB)')
  //     sqlite.run('CREATE TABLE following(id INTEGER PRIMARY KEY, serializedFollowing BLOB)')
  //     sqlite.run('CREATE TABLE messages(guid BLOB , handle TEXT, signed_pubkey BLOB, encryption_pubkey BLOB, subject TEXT, message_type TEXT, message TEXT, timestamp, INTEGER, avatar_hash BLOB, signature BLOB, outgoing INTEGER)')
  //     sqlite.run('CREATE TABLE notifications(guid BLOB, handle TEXT, message TEXT, timestamp INTEGER, avatar_hash BLOB)')
  //     sqlite.run('CREATE TABLE vendors(guid BLOB UNIQUE, ip TEXT, port INTEGER, signedPubkey BLOB)')
  //     sqlite.run('CREATE INDEX idx1 ON vendors(guid);')
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
    //   sqlite.run('INSERT OR REPLACE INTO hashmap(hash, filepath)
    //                 VALUES (?,?)', (hash_value, filepath))
    //   conn.commit()
    //   conn.close()
    // }
    //
    // def get_file(self, hash_value):
    //     conn = Database.connect_database(self.PATH)
    //     cursor = conn.cursor()
    //     sqlite.run('SELECT filepath FROM hashmap WHERE hash=?', (hash_value,))
    //     ret = cursor.fetchone()
    //     conn.close()
    //     if ret is None:
    //         return None
    //     return DATA_FOLDER + ret[0]
    //
    // def get_all(self):
    //     conn = Database.connect_database(self.PATH)
    //     cursor = conn.cursor()
    //     sqlite.run('SELECT * FROM hashmap ')
    //     ret = cursor.fetchall()
    //     conn.close()
    //     return ret
    //
    // def delete(self, hash_value):
    //     conn = Database.connect_database(self.PATH)
    //     with conn:
    //         cursor = conn.cursor()
    //         sqlite.run('DELETE FROM hashmap WHERE hash = ?', (hash_value,))
    //         conn.commit()
    //     conn.close()
    //
    // def delete_all(self):
    //     conn = Database.connect_database(self.PATH)
    //     with conn:
    //         cursor = conn.cursor()
    //         sqlite.run('DELETE FROM hashmap')
    //         conn.commit()
    //     conn.close()
}

class VendorStore {
    /**
    Stores a list of vendors this node has heard about. Useful for
    filling out data in the homepage.
    **/
    constructor(databasePath) {
        this.PATH = databasePath;
    }

    saveVendor(guid, serializedNode) {
        conn = Database.connect_database(self.PATH)
        with conn:
        cursor = conn.cursor()
        try:
        cursor.execute('''INSERT OR REPLACE INTO vendors(guid, serializedNode)
        VALUES (?,?)''', (guid, serialized_node))
        except Exception as e:
        print e.message
        conn.commit()
        conn.close()
    }

    getVendors() {
        conn = Database.connect_database(self.PATH)
        cursor = conn.cursor()
        cursor.execute('''SELECT serializedNode FROM vendors''')
        ret = cursor.fetchall()
        nodes = {}
        for n in ret:
        try:
        proto = objects.Node()
        proto.ParseFromString(n[0])
        node = Node(proto.guid,
            proto.nodeAddress.ip,
            proto.nodeAddress.port,
            proto.publicKey,
            None if not proto.HasField("relayAddress") else
            (proto.relayAddress.ip, proto.relayAddress.port),
                proto.natType,
                proto.vendor)
        nodes[node.id] = node
        except Exception, e:
        print e.message
        conn.close()
        return nodes
    }

    deleteVendor(guid) {
        conn = Database.connect_database(self.PATH)
        with conn:
        cursor = conn.cursor()
        cursor.execute('''DELETE FROM vendors WHERE guid=?''', (guid,))
        conn.commit()
        conn.close()
    }
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
  //         sqlite.run('INSERT OR REPLACE INTO profile(id, serializedUserInfo, tempHandle)
  //                       VALUES (?,?,?)', (1, proto, handle))
  //         conn.commit()
  //     conn.close()
  //
  // def get_proto(self):
  //     conn = Database.connect_database(self.PATH)
  //     cursor = conn.cursor()
  //     sqlite.run('SELECT serializedUserInfo FROM profile WHERE id = 1')
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
  //             sqlite.run('INSERT OR REPLACE INTO profile(id, tempHandle)
  //                       VALUES (?,?)', (1, handle))
  //         else:
  //             sqlite.run('UPDATE profile SET tempHandle=? WHERE id=?;', (handle, 1))
  //         conn.commit()
  //     conn.close()
  //
  // def get_temp_handle(self):
  //     conn = Database.connect_database(self.PATH)
  //     cursor = conn.cursor()
  //     sqlite.run('SELECT tempHandle FROM profile WHERE id = 1')
  //     ret = cursor.fetchone()
  //     conn.close()
  //     if ret is None:
  //         return ""
  //     else:
  //         return ret[0]
}

class KeyStore {
  /**
  Stores the keys for this node.
  **/
  constructor(databasePath) {
    this.path = databasePath;
  }

  setKey(keyType, privkey, pubkey) {
    sqlite.connect(this.path);
    sqlite.run(`INSERT OR REPLACE INTO keys(type, privkey, pubkey) VALUES ('${keyType}', '${privkey}', '${pubkey}')`, function(res) {
      if(res.error) {
        console.log('Error inserting key', res.error);
      }
    });
    sqlite.close();
  }

  getKey(keyType) {
    sqlite.connect(this.path);
    var rows = sqlite.run(`SELECT privkey, pubkey FROM keys WHERE type = '${keyType}'`);
    sqlite.close();
    return rows[0];
  }
}




    // def delete_all_keys(self):

    //     conn = Database.connect_database(self.PATH)

    //     with conn:

    //         cursor = conn.cursor()

    //         cursor.execute('''DELETE FROM keys''')

    //         conn.commit()

    //     conn.close()
