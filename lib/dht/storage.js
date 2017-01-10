"use strict"

// import time
// import sqlite3 as lite
// from zope.interface import implements, Interface
// from protos.objects import Value
var sqlite3 = require('sqlite3').verbose();
var TransactionDatabase = require("sqlite3-transactions").TransactionDatabase;
var binascii = require('binascii');

module.exports = class ForgetfulStorage {


    constructor(ttl) {
        this.ttl = ttl || 604800;
        this.db = new TransactionDatabase(
            new sqlite3.Database(':memory:')
        );

        this.db.beginTransaction(function (err, transaction) {
            //this.db.textFactory = str

            transaction.run('CREATE TABLE dht(keyword TEXT, id BLOB, value BLOB, birthday FLOAT)');
            transaction.run('CREATE INDEX idx1 ON dht(keyword);');
            transaction.run('CREATE INDEX idx2 ON dht(birthday);');
            transaction.commit(function (err) {
                if (err) {
                    console.log(err);
                }
            });
        });

    }

    setItem(keyword, values) {
        keyword = binascii.hexlify(keyword);
        let birthday = +new Date - (this.ttl - values[2]);
        let stmt = this.db.prepare('INSERT INTO dht(keyword, id, value, birthday) SELECT ?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM dht WHERE keyword=? AND id=?)');
        stmt.run(keyword, values[0], values[1], birthday, keyword, values[0]);
        stmt.finalize();
    }

    getItem(keyword) {
        this.cull();
        let stmt = this.db.prepare('SELECT id, value, birthday FROM dht WHERE keyword=?');
        stmt.run(binascii.hexlify(keyword));
        stmt.finalize();
        return
    }

    cull() {
        let expiration = +new Date - this.ttl;
        let stmt = this.db.prepare('DELETE FROM dht WHERE birthday < ?');
        stmt.run(expiration);
        stmt.finalize();
    }

    getSpecific(keyword, key) {
        let kw = Buffer(keyword).toString('hex');
        key = Buffer(key).toString('hex');
        this.db.each(`SELECT value FROM dht WHERE keyword='${kw}' AND id='${key}'`, function (err, row) {
            if (!err) {
                return row;
            }
            console.log(err);
        });

    }


    //
    //
    // def get(self, keyword, default=None):
    //     self.cull()
    //     kw = self[keyword]
    //     if len(kw) > 0:
    //         ret = []
    //         for k, v, birthday in kw:
    //             value = Value()
    //             value.valueKey = k
    //             value.serializedData = v
    //             value.ttl = int(round(self.ttl - (time.time() - birthday)))
    //             ret.append(value.SerializeToString())
    //         return ret
    //     return default
    //
    // def getSpecific(self, keyword, key):
    //     try:
    //         cursor = self.db.cursor()
    //         cursor.execute('''SELECT value FROM dht WHERE keyword=? AND id=?''', (keyword.encode("hex"), key))
    //         return cursor.fetchone()[0]
    //     except Exception:
    //         return None
    //
    // def cull(self):
    //     expiration = time.time() - self.ttl
    //     cursor = self.db.cursor()
    //     cursor.execute('''DELETE FROM dht WHERE birthday < ?''', (expiration,))
    //     self.db.commit()
    //
    // def delete(self, keyword, key):
    //     try:
    //         cursor = self.db.cursor()
    //         cursor.execute('''DELETE FROM dht WHERE keyword=? AND id=?''', (keyword.encode("hex"), key))
    //         self.db.commit()
    //     except Exception:
    //         pass
    //     self.cull()
    //
    // def iterkeys(self):
    //     self.cull()
    //     try:
    //         cursor = self.db.cursor()
    //         cursor.execute('''SELECT DISTINCT keyword FROM dht''')
    //         keywords = cursor.fetchall()
    //         return keywords.__iter__()
    //     except Exception:
    //         return None
    //
    // def iteritems(self, keyword):
    //     try:
    //         cursor = self.db.cursor()
    //         cursor.execute('''SELECT id, value FROM dht WHERE keyword=?''', (keyword.encode("hex"),))
    //         return cursor.fetchall().__iter__()
    //     except Exception:
    //         return None
    //
    // def get_ttl(self, keyword, key):
    //     cursor = self.db.cursor()
    //     cursor.execute('''SELECT birthday FROM dht WHERE keyword=? AND id=?''', (keyword.encode("hex"), key,))
    //     return self.ttl - (time.time() - cursor.fetchall()[0][0])
    //
    // def get_db_size(self):
    //     cursor = self.db.cursor()
    //     cursor.execute('''PRAGMA page_count;''')
    //     count = cursor.fetchone()[0]
    //     cursor.execute('''PRAGMA page_size;''')
    //     size = cursor.fetchone()[0]
    //     return count * size

}
